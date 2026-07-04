import * as monaco from "monaco-editor";

export function monacoUriForPath(path: string): monaco.Uri {
  return monaco.Uri.parse(path);
}

export function pathFromMonacoUri(uri: monaco.Uri): string {
  if (uri.scheme === "file") {
    return uri.fsPath;
  }
  if (uri.path.startsWith("/")) {
    return uri.path;
  }
  const parsed = monaco.Uri.parse(uri.toString());
  if (parsed.scheme === "file") {
    return parsed.fsPath;
  }
  return parsed.path;
}

export function normalizePath(path: string): string {
  if (path.startsWith("file://")) {
    return monaco.Uri.parse(path).fsPath;
  }
  return pathFromMonacoUri(monaco.Uri.parse(path));
}

export function pathsEqual(a: string, b: string): boolean {
  return normalizePath(a) === normalizePath(b);
}
