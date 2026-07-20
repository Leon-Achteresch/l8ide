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
