import { getMonacoInstance } from "@/lib/monaco-instance";
import { openFileAt } from "@/lib/monaco-navigation";
import { pathFromMonacoUri } from "@/lib/monaco-uri";
import {
  type FileEdit,
  type RenameTarget,
  useRefactorPreview,
  useRenamePrompt,
} from "@/lib/refactor-preview";
import { applyTextChangesToString, type TextChange } from "@/lib/text-edits";
import { refreshFileIndex } from "@/lib/file-index";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type * as monaco from "monaco-editor";
import { typescript as tsLanguages } from "monaco-editor";
import type ts from "typescript";
import type { TypeHierarchyDirection, TypeHierarchyNode } from "@/lib/type-hierarchy-core";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const APPLY_REFACTOR = "l8ide.applyRefactor";
const ORGANIZE_IMPORTS = "l8ide.organizeImports";
const REFACTOR_LANGS = ["typescript", "javascript"];

const REFACTOR_PREFERENCES: ts.UserPreferences = {
  allowTextChangesInNewFiles: true,
};

const FORMAT: ts.FormatCodeSettings = {
  baseIndentSize: 0,
  indentSize: 2,
  tabSize: 2,
  newLineCharacter: "\n",
  convertTabsToSpaces: true,
  indentStyle: 2 as ts.IndentStyle,
  insertSpaceAfterCommaDelimiter: true,
  insertSpaceAfterSemicolonInForStatements: true,
  insertSpaceBeforeAndAfterBinaryOperators: true,
  insertSpaceAfterKeywordsInControlFlowStatements: true,
  insertSpaceAfterFunctionKeywordForAnonymousFunctions: true,
  insertSpaceBeforeFunctionParenthesis: false,
  placeOpenBraceOnNewLineForFunctions: false,
  placeOpenBraceOnNewLineForControlBlocks: false,
  semicolons: "insert" as ts.SemicolonPreference,
};

export type CallHierarchyNode = {
  name: string;
  file: string;
  line: number;
  column: number;
  offset: number;
};

export type RefactorWorker = {
  getTypeHierarchy(
    fileName: string,
    offset: number,
    direction: TypeHierarchyDirection,
  ): Promise<{ root: TypeHierarchyNode | null; types: TypeHierarchyNode[] }>;
  getIncomingCalls(
    fileName: string,
    offset: number,
  ): Promise<{
    root: Omit<CallHierarchyNode, "offset"> | null;
    calls: CallHierarchyNode[];
  }>;
  getOutgoingCalls(
    fileName: string,
    offset: number,
  ): Promise<{
    root: Omit<CallHierarchyNode, "offset"> | null;
    calls: CallHierarchyNode[];
  }>;
  getImportCompletions(
    fileName: string,
    offset: number,
  ): Promise<
    { name: string; source: string; kind: string; data?: ts.CompletionEntryData }[]
  >;
  getImportCompletionDetails(
    fileName: string,
    offset: number,
    name: string,
    source: string,
    data?: ts.CompletionEntryData,
  ): Promise<ts.CompletionEntryDetails | undefined>;
  getApplicableRefactors(
    fileName: string,
    positionOrRange: number | ts.TextRange,
    preferences?: ts.UserPreferences,
  ): Promise<ts.ApplicableRefactorInfo[]>;
  getEditsForRefactor(
    fileName: string,
    formatOptions: ts.FormatCodeSettings,
    positionOrRange: number | ts.TextRange,
    refactorName: string,
    actionName: string,
    preferences?: ts.UserPreferences,
  ): Promise<ts.RefactorEditInfo | undefined>;
  organizeImports(
    fileName: string,
    formatOptions: ts.FormatCodeSettings,
  ): Promise<readonly ts.FileTextChanges[]>;
  findRenameLocations(
    fileName: string,
    position: number,
    findInStrings: boolean,
    findInComments: boolean,
    providePrefixAndSuffixTextForRename: boolean,
  ): Promise<readonly ts.RenameLocation[] | undefined>;
};

export const useRefactorSettings = create<{
  organizeImportsOnSave: boolean;
  setOrganizeImportsOnSave: (value: boolean) => void;
}>()(
  persist(
    (set) => ({
      organizeImportsOnSave: false,
      setOrganizeImportsOnSave: (organizeImportsOnSave) =>
        set({ organizeImportsOnSave }),
    }),
    { name: "refactor-settings" },
  ),
);

export function isRefactorLanguage(languageId: string) {
  return REFACTOR_LANGS.includes(languageId);
}

export async function getRefactorWorker(
  model: monaco.editor.ITextModel,
): Promise<RefactorWorker | null> {
  const m = getMonacoInstance();
  if (!m || !isRefactorLanguage(model.getLanguageId())) return null;
  const getWorker =
    model.getLanguageId() === "javascript"
      ? tsLanguages.getJavaScriptWorker
      : tsLanguages.getTypeScriptWorker;
  try {
    const accessor = await getWorker();
    const worker = await accessor(model.uri);
    return worker as unknown as RefactorWorker;
  } catch {
    return null;
  }
}

function tsRange(
  model: monaco.editor.ITextModel,
  range: monaco.IRange,
): number | ts.TextRange {
  const start = model.getOffsetAt({
    lineNumber: range.startLineNumber,
    column: range.startColumn,
  });
  const end = model.getOffsetAt({
    lineNumber: range.endLineNumber,
    column: range.endColumn,
  });
  return start === end ? start : { pos: start, end };
}

function languageForUri(uri: string): string | undefined {
  if (/\.tsx?$/i.test(uri)) return "typescript";
  if (/\.(jsx?|mjs|cjs)$/i.test(uri)) return "javascript";
  return undefined;
}

function monacoEditsFromChanges(
  model: monaco.editor.ITextModel,
  changes: TextChange[],
): monaco.editor.IIdentifiedSingleEditOperation[] {
  return changes.map((c) => {
    const start = model.getPositionAt(c.span.start);
    const end = model.getPositionAt(c.span.start + c.span.length);
    return {
      range: {
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
      },
      text: c.newText,
    };
  });
}

function applyRanged(model: monaco.editor.ITextModel, changes: TextChange[]) {
  if (changes.length === 0) return;
  model.pushStackElement();
  model.pushEditOperations([], monacoEditsFromChanges(model, changes), () => null);
  model.pushStackElement();
}

async function readTextFileSafe(path: string): Promise<string> {
  try {
    return await readTextFile(path);
  } catch {
    return "";
  }
}

async function buildFileEdits(
  m: typeof monaco,
  changes: readonly ts.FileTextChanges[],
): Promise<FileEdit[]> {
  const out: FileEdit[] = [];
  for (const fc of changes) {
    const uri = m.Uri.parse(fc.fileName);
    const model = m.editor.getModel(uri);
    const path = pathFromMonacoUri(uri);
    const changeList: TextChange[] = fc.textChanges.map((c) => ({
      span: { start: c.span.start, length: c.span.length },
      newText: c.newText,
    }));
    const oldText = fc.isNewFile
      ? ""
      : model
        ? model.getValue()
        : await readTextFileSafe(path);
    out.push({
      uri: fc.fileName,
      path,
      isNew: Boolean(fc.isNewFile),
      oldText,
      newText: applyTextChangesToString(oldText, changeList),
      changes: changeList,
    });
  }
  return out;
}

async function commitFileEdits(m: typeof monaco, edits: FileEdit[]) {
  const createdPaths: string[] = [];
  for (const e of edits) {
    const uri = m.Uri.parse(e.uri);
    const model = m.editor.getModel(uri);
    if (e.isNew && !model) {
      m.editor.createModel(e.newText, languageForUri(e.uri), uri);
      await writeTextFile(e.path, e.newText);
      createdPaths.push(e.path);
    } else if (model) {
      applyRanged(model, e.changes);
      await writeTextFile(e.path, model.getValue());
      if (e.isNew) createdPaths.push(e.path);
    } else {
      await writeTextFile(e.path, e.newText);
      if (e.isNew) createdPaths.push(e.path);
    }
  }
  if (createdPaths.length > 0) {
    refreshFileIndex();
    void import("@/components/file-tree").then((m2) => m2.refreshTree());
    openFileAt(createdPaths[0]!, { line: 1, column: 1 });
  }
}

function triggerRename(m: typeof monaco, target: RenameTarget) {
  const uri = m.Uri.parse(target.uri);
  const model = m.editor.getModel(uri);
  if (!model) return;
  const pos = model.getPositionAt(target.offset);
  openFileAt(pathFromMonacoUri(uri), { line: pos.lineNumber, column: pos.column });
  const run = (tries: number) => {
    const editor = m.editor
      .getEditors()
      .find((e) => e.getModel()?.uri.toString() === uri.toString());
    if (editor) {
      editor.setPosition(pos);
      editor.focus();
      void editor.getAction("editor.action.rename")?.run();
      return;
    }
    if (tries > 0) setTimeout(() => run(tries - 1), 60);
  };
  run(25);
}

export async function commitRefactor(edits: FileEdit[], rename?: RenameTarget) {
  const m = getMonacoInstance();
  if (!m || edits.length === 0) return;
  await commitFileEdits(m, edits);
  if (rename) triggerRename(m, rename);
}

type RefactorPayload = {
  uri: string;
  positionOrRange: number | ts.TextRange;
  refactorName: string;
  actionName: string;
};

async function applyRefactorAction(payload: RefactorPayload) {
  const m = getMonacoInstance();
  if (!m) return;
  const model = m.editor.getModel(m.Uri.parse(payload.uri));
  if (!model) return;
  const worker = await getRefactorWorker(model);
  if (!worker) return;
  const info = await worker.getEditsForRefactor(
    payload.uri,
    FORMAT,
    payload.positionOrRange,
    payload.refactorName,
    payload.actionName,
    REFACTOR_PREFERENCES,
  );
  if (!info || info.edits.length === 0) {
    toast.error("Refactoring nicht möglich");
    return;
  }
  const edits = await buildFileEdits(m, info.edits);
  const rename: RenameTarget | undefined =
    info.renameLocation != null && info.renameFilename
      ? { uri: info.renameFilename, offset: info.renameLocation }
      : undefined;
  const multiFile = edits.length > 1 || edits.some((e) => e.isNew);
  if (multiFile) {
    useRefactorPreview.getState().show({
      title: payload.actionName || payload.refactorName,
      edits,
      rename,
    });
  } else {
    await commitFileEdits(m, edits);
    if (rename) triggerRename(m, rename);
  }
}

export async function moveToNewFile(
  model: monaco.editor.ITextModel,
  range: monaco.IRange,
) {
  const worker = await getRefactorWorker(model);
  if (!worker) return;
  const uri = model.uri.toString();
  const positionOrRange = tsRange(model, range);
  const refactors = await worker.getApplicableRefactors(
    uri,
    positionOrRange,
    REFACTOR_PREFERENCES,
  );
  for (const refactor of refactors) {
    for (const action of refactor.actions) {
      if (action.notApplicableReason) continue;
      if (
        action.kind === "refactor.move.newFile" ||
        action.name === "Move to a new file"
      ) {
        await applyRefactorAction({
          uri,
          positionOrRange,
          refactorName: refactor.name,
          actionName: action.name,
        });
        return;
      }
    }
  }
  toast.error("Hier lässt sich nichts in eine neue Datei verschieben");
}

export async function organizeImportsModel(model: monaco.editor.ITextModel) {
  const worker = await getRefactorWorker(model);
  if (!worker) return;
  const uri = model.uri.toString();
  const changes = await worker.organizeImports(uri, FORMAT);
  const fc = changes.find((c) => c.fileName === uri);
  if (!fc || fc.textChanges.length === 0) return;
  applyRanged(
    model,
    fc.textChanges.map((c) => ({
      span: { start: c.span.start, length: c.span.length },
      newText: c.newText,
    })),
  );
}

export async function renameWithPreview(
  model: monaco.editor.ITextModel,
  position: monaco.IPosition,
) {
  const m = getMonacoInstance();
  if (!m) return;
  const worker = await getRefactorWorker(model);
  if (!worker) return;
  const word = model.getWordAtPosition(position);
  if (!word) return;
  const oldName = word.word;
  const newName = await useRenamePrompt
    .getState()
    .ask(`„${oldName}“ umbenennen in:`, oldName);
  if (!newName || newName === oldName) return;
  const offset = model.getOffsetAt(position);
  const locations = await worker.findRenameLocations(
    model.uri.toString(),
    offset,
    false,
    false,
    false,
  );
  if (!locations || locations.length === 0) {
    toast.error("Keine Vorkommen gefunden");
    return;
  }
  const byFile = new Map<string, TextChange[]>();
  for (const loc of locations) {
    const newText = (loc.prefixText ?? "") + newName + (loc.suffixText ?? "");
    const list = byFile.get(loc.fileName) ?? [];
    list.push({
      span: { start: loc.textSpan.start, length: loc.textSpan.length },
      newText,
    });
    byFile.set(loc.fileName, list);
  }
  const changes: ts.FileTextChanges[] = [...byFile].map(
    ([fileName, textChanges]) => ({ fileName, textChanges, isNewFile: false }),
  );
  const edits = await buildFileEdits(m, changes);
  useRefactorPreview
    .getState()
    .show({ title: `Umbenennen in „${newName}“ (${locations.length})`, edits });
}

let registered = false;

export function registerRefactorProviders() {
  const m = getMonacoInstance();
  if (!m || registered) return;
  registered = true;

  m.editor.registerCommand(APPLY_REFACTOR, (_accessor, payload: RefactorPayload) =>
    void applyRefactorAction(payload),
  );
  m.editor.registerCommand(ORGANIZE_IMPORTS, (_accessor, uri: string) => {
    const model = m.editor.getModel(m.Uri.parse(uri));
    if (model) void organizeImportsModel(model);
  });

  m.languages.registerCodeActionProvider(
    REFACTOR_LANGS,
    {
      provideCodeActions: async (model, range) => {
        const worker = await getRefactorWorker(model);
        if (!worker) return { actions: [], dispose() {} };
        const uri = model.uri.toString();
        const positionOrRange = tsRange(model, range);
        const actions: monaco.languages.CodeAction[] = [];
        const refactors = await worker.getApplicableRefactors(
          uri,
          positionOrRange,
          REFACTOR_PREFERENCES,
        );
        for (const refactor of refactors) {
          for (const action of refactor.actions) {
            if (action.notApplicableReason) continue;
            actions.push({
              title: action.description,
              kind: action.kind ?? "refactor",
              command: {
                id: APPLY_REFACTOR,
                title: action.description,
                arguments: [
                  {
                    uri,
                    positionOrRange,
                    refactorName: refactor.name,
                    actionName: action.name,
                  } satisfies RefactorPayload,
                ],
              },
            });
          }
        }
        actions.push({
          title: "Imports organisieren",
          kind: "source.organizeImports",
          command: {
            id: ORGANIZE_IMPORTS,
            title: "Imports organisieren",
            arguments: [uri],
          },
        });
        return { actions, dispose() {} };
      },
    },
    { providedCodeActionKinds: ["refactor", "source.organizeImports"] },
  );
}

export function registerEditorRefactors(
  editor: monaco.editor.IStandaloneCodeEditor,
  m: typeof monaco,
) {
  const precondition =
    "editorLangId == 'typescript' || editorLangId == 'javascript'";
  editor.addAction({
    id: "l8ide.renameWithPreview",
    label: "Symbol umbenennen (Vorschau)…",
    keybindings: [m.KeyMod.Shift | m.KeyCode.F2],
    precondition,
    contextMenuGroupId: "1_modification",
    contextMenuOrder: 1.4,
    run: (ed) => {
      const model = ed.getModel();
      const pos = ed.getPosition();
      if (model && pos) void renameWithPreview(model, pos);
    },
  });
  editor.addAction({
    id: "l8ide.organizeImports",
    label: "Imports organisieren",
    keybindings: [m.KeyMod.Shift | m.KeyMod.Alt | m.KeyCode.KeyO],
    precondition,
    contextMenuGroupId: "1_modification",
    contextMenuOrder: 1.5,
    run: (ed) => {
      const model = ed.getModel();
      if (model) void organizeImportsModel(model);
    },
  });
  editor.addAction({
    id: "l8ide.moveToNewFile",
    label: "In neue Datei verschieben",
    precondition,
    contextMenuGroupId: "1_modification",
    contextMenuOrder: 1.6,
    run: (ed) => {
      const model = ed.getModel();
      const selection = ed.getSelection();
      if (model && selection) void moveToNewFile(model, selection);
    },
  });
}
