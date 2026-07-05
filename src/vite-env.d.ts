/// <reference types="vite/client" />

declare module "monaco-editor/esm/vs/base/common/uri.js" {
  export { Uri as URI } from "monaco-editor";
}

declare module "monaco-editor/esm/vs/language/typescript/tsWorker.js" {
  export class TypeScriptWorker {
    _languageService: import("typescript").LanguageService;
    _ctx: unknown;
    _compilerOptions: unknown;
    constructor(ctx: unknown, createData: unknown);
  }
}

declare module "monaco-editor/esm/vs/common/initialize.js" {
  export function initialize(
    callback: (ctx: unknown, createData: unknown) => unknown,
  ): void;
}
