import { loader } from "@monaco-editor/react";
import { registerAiInlineCompletions } from "@/lib/ai/inline-completions";
import { initIdeMonacoThemes } from "@/lib/ide-theme";
import { configureJsonSchemas } from "@/lib/json-schemas";
import { setMonacoInstance } from "@/lib/monaco-instance";
import { registerMonacoNavigation } from "@/lib/monaco-navigation";
import { initMarkers } from "@/lib/markers-store";
import { initPrettier } from "@/lib/prettier-format";
import { emmetCSS, emmetHTML, emmetJSX } from "emmet-monaco-es";
import * as monaco from "monaco-editor";
import { typescript as ts } from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "@/lib/ts.worker?worker";
import { registerRefactorProviders } from "@/lib/ts-refactor";
import { registerSemanticTokens } from "@/lib/semantic-tokens";
import { registerTailwind } from "@/lib/tailwind";

self.MonacoEnvironment = {
  getWorker(_workerId, label) {
    switch (label) {
      case "json":
        return new jsonWorker();
      case "css":
      case "scss":
      case "less":
        return new cssWorker();
      case "html":
      case "handlebars":
      case "razor":
        return new htmlWorker();
      case "typescript":
      case "javascript":
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

setMonacoInstance(monaco);

for (const d of [ts.typescriptDefaults, ts.javascriptDefaults]) {
  d.setInlayHintsOptions({
    includeInlayParameterNameHints: "all",
    includeInlayParameterNameHintsWhenArgumentMatchesName: false,
    includeInlayFunctionParameterTypeHints: true,
    includeInlayVariableTypeHints: true,
    includeInlayPropertyDeclarationTypeHints: true,
    includeInlayFunctionLikeReturnTypeHints: true,
    includeInlayEnumMemberValueHints: true,
  });
}

emmetHTML(monaco);
emmetCSS(monaco);
emmetJSX(monaco, ["javascript", "typescript"]);
initPrettier(monaco);
initMarkers(monaco);
registerMonacoNavigation();
registerRefactorProviders();
registerSemanticTokens();
registerTailwind(monaco);
registerAiInlineCompletions(monaco);
initIdeMonacoThemes();
void configureJsonSchemas();

loader.config({ monaco });
