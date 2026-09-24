import { URI } from "monaco-editor/esm/vs/base/common/uri.js";
import type * as monaco from "monaco-editor";

export function monacoUriForPath(path: string): monaco.Uri {
  return URI.parse(path);
}

export function monacoDeclarationUriForPath(path: string): string {
  // TypeScript appends literal package names while resolving node_modules.
  // Monaco URI serialization escapes scoped names such as @types to %40types.
  return monacoUriForPath(path).toString().replace(/(\/node_modules\/)%40/gi, "$1@");
}

export function pathFromMonacoUri(uri: monaco.Uri): string {
  if (uri.scheme === "file") {
    return uri.fsPath;
  }
  if (uri.path.startsWith("/")) {
    return uri.path;
  }
  const parsed = URI.parse(uri.toString());
  if (parsed.scheme === "file") {
    return parsed.fsPath;
  }
  return parsed.path;
}

export function normalizePath(path: string): string {
  if (path.startsWith("file://")) {
    return URI.parse(path).fsPath;
  }
  return pathFromMonacoUri(URI.parse(path));
}

export function pathsEqual(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}
