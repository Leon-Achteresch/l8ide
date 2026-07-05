import type * as Monaco from "monaco-editor";

let instance: typeof Monaco | null = null;

export function setMonacoInstance(m: typeof Monaco) {
  instance = m;
}

export function getMonacoInstance() {
  return instance;
}
