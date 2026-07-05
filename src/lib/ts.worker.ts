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
