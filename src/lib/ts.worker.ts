import { initialize } from "monaco-editor/esm/vs/common/initialize.js";
import { TypeScriptWorker } from "monaco-editor/esm/vs/language/typescript/tsWorker.js";
import type ts from "typescript";

const NO_PREFERENCES: ts.UserPreferences = {};

class RefactorTsWorker extends TypeScriptWorker {
  async getApplicableRefactors(
    fileName: string,
    positionOrRange: number | ts.TextRange,
    preferences?: ts.UserPreferences,
  ): Promise<ts.ApplicableRefactorInfo[]> {
    try {
      return this._languageService.getApplicableRefactors(
        fileName,
        positionOrRange,
        preferences ?? NO_PREFERENCES,
      );
    } catch {
      return [];
    }
  }

  async getEditsForRefactor(
    fileName: string,
    formatOptions: ts.FormatCodeSettings,
    positionOrRange: number | ts.TextRange,
    refactorName: string,
    actionName: string,
    preferences?: ts.UserPreferences,
  ): Promise<ts.RefactorEditInfo | undefined> {
    try {
      return this._languageService.getEditsForRefactor(
        fileName,
        formatOptions,
        positionOrRange,
        refactorName,
        actionName,
        preferences ?? NO_PREFERENCES,
      );
    } catch {
      return undefined;
    }
  }

  async organizeImports(
    fileName: string,
    formatOptions: ts.FormatCodeSettings,
  ): Promise<readonly ts.FileTextChanges[]> {
    try {
      return this._languageService.organizeImports(
        { type: "file", fileName },
        formatOptions,
        NO_PREFERENCES,
      );
    } catch {
      return [];
    }
  }

  async getImportCompletions(
    fileName: string,
    offset: number,
  ): Promise<
    { name: string; source: string; kind: string; data?: ts.CompletionEntryData }[]
  > {
    try {
      const res = this._languageService.getCompletionsAtPosition(
        fileName,
        offset,
        {
          includeCompletionsForModuleExports: true,
          includeCompletionsWithInsertText: true,
        },
      );
      if (!res) return [];
      return res.entries
        .filter((e) => e.hasAction && e.source)
        .slice(0, 50)
        .map((e) => ({
          name: e.name,
          source: e.source as string,
          kind: e.kind as string,
          data: e.data,
        }));
    } catch {
      return [];
    }
  }

  async getImportCompletionDetails(
    fileName: string,
    offset: number,
    name: string,
    source: string,
    data?: ts.CompletionEntryData,
  ): Promise<ts.CompletionEntryDetails | undefined> {
    try {
      return this._languageService.getCompletionEntryDetails(
        fileName,
        offset,
        name,
        {},
        source,
        { includeCompletionsForModuleExports: true },
        data,
      );
    } catch {
      return undefined;
    }
  }

  async getIncomingCalls(
    fileName: string,
    offset: number,
  ): Promise<{
    root: { name: string; file: string; line: number; column: number } | null;
    calls: {
      name: string;
      file: string;
      line: number;
      column: number;
      offset: number;
    }[];
  }> {
    const empty = { root: null, calls: [] };
    try {
      const program = this._languageService.getProgram();
      if (!program) return empty;
      const locate = (file: string, pos: number) => {
        const sf = program.getSourceFile(file);
        if (!sf) return { line: 1, column: 1 };
        const lc = sf.getLineAndCharacterOfPosition(pos);
        return { line: lc.line + 1, column: lc.character + 1 };
      };
      const prepared = this._languageService.prepareCallHierarchy(
        fileName,
        offset,
      );
      if (!prepared) return empty;
      const item = Array.isArray(prepared) ? prepared[0] : prepared;
      if (!item) return empty;
      const incoming = this._languageService.provideCallHierarchyIncomingCalls(
        item.file,
        item.selectionSpan.start,
      );
      return {
        root: { name: item.name, file: item.file, ...locate(item.file, item.selectionSpan.start) },
        calls: incoming.map((c) => ({
          name: c.from.name,
          file: c.from.file,
          offset: c.from.selectionSpan.start,
          ...locate(c.from.file, c.from.selectionSpan.start),
        })),
      };
    } catch {
      return empty;
    }
  }

  async getOutgoingCalls(
    fileName: string,
    offset: number,
  ): Promise<{
    root: { name: string; file: string; line: number; column: number } | null;
    calls: {
      name: string;
      file: string;
      line: number;
      column: number;
      offset: number;
    }[];
  }> {
    const empty = { root: null, calls: [] };
    try {
      const program = this._languageService.getProgram();
      if (!program) return empty;
      const locate = (file: string, pos: number) => {
        const sf = program.getSourceFile(file);
        if (!sf) return { line: 1, column: 1 };
        const lc = sf.getLineAndCharacterOfPosition(pos);
        return { line: lc.line + 1, column: lc.character + 1 };
      };
      const prepared = this._languageService.prepareCallHierarchy(
        fileName,
        offset,
      );
      if (!prepared) return empty;
      const item = Array.isArray(prepared) ? prepared[0] : prepared;
      if (!item) return empty;
      const outgoing = this._languageService.provideCallHierarchyOutgoingCalls(
        item.file,
        item.selectionSpan.start,
      );
      return {
        root: { name: item.name, file: item.file, ...locate(item.file, item.selectionSpan.start) },
        calls: outgoing.map((c) => ({
          name: c.to.name,
          file: c.to.file,
          offset: c.to.selectionSpan.start,
          ...locate(c.to.file, c.to.selectionSpan.start),
        })),
      };
    } catch {
      return empty;
    }
  }

  async getEncodedSemanticClassifications(
    fileName: string,
    span: ts.TextSpan,
    format?: ts.SemanticClassificationFormat,
  ): Promise<ts.Classifications | undefined> {
    try {
      return this._languageService.getEncodedSemanticClassifications(
        fileName,
        span,
        format ?? ("2020" as ts.SemanticClassificationFormat),
      );
    } catch {
      return undefined;
    }
  }

  async getNavigateToItems(
    searchValue: string,
    maxResultCount?: number,
  ): Promise<ts.NavigateToItem[]> {
    try {
      return this._languageService.getNavigateToItems(
        searchValue,
        maxResultCount ?? 256,
        undefined,
        true,
      );
    } catch {
      return [];
    }
  }

  async getEditsForFileRename(
    oldFilePath: string,
    newFilePath: string,
    formatOptions: ts.FormatCodeSettings,
  ): Promise<readonly ts.FileTextChanges[]> {
    try {
      return this._languageService.getEditsForFileRename(
        oldFilePath,
        newFilePath,
        formatOptions,
        NO_PREFERENCES,
      );
    } catch {
      return [];
    }
  }
}

self.onmessage = () => {
  initialize(
    (ctx: unknown, createData: unknown) => new RefactorTsWorker(ctx, createData),
  );
};
