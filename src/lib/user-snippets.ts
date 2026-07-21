import * as monaco from "monaco-editor";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserSnippet = {
  id: string;
  name: string;
  prefix: string;
  body: string;
  language: string;
};

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `snip-${Date.now()}-${Math.random()}`;

type UserSnippetsStore = {
  snippets: UserSnippet[];
  add: (s: Omit<UserSnippet, "id">) => void;
  update: (id: string, patch: Partial<Omit<UserSnippet, "id">>) => void;
  remove: (id: string) => void;
};

export const useUserSnippets = create<UserSnippetsStore>()(
  persist(
    (set) => ({
      snippets: [],
      add: (s) =>
        set((st) => ({ snippets: [...st.snippets, { ...s, id: uid() }] })),
      update: (id, patch) =>
        set((st) => ({
          snippets: st.snippets.map((s) =>
            s.id === id ? { ...s, ...patch } : s,
          ),
        })),
      remove: (id) =>
        set((st) => ({ snippets: st.snippets.filter((s) => s.id !== id) })),
    }),
    { name: "user-snippets" },
  ),
);

let projectSnippets: UserSnippet[] = [];

export async function loadProjectSnippets(root: string) {
  const { exists, readTextFile } = await import("@tauri-apps/plugin-fs");
  const path = `${root.replace(/\/+$/, "")}/.l8ide/snippets.json`;
  if (!(await exists(path).catch(() => false))) {
    projectSnippets = [];
    return;
  }
  try {
    const raw = JSON.parse(await readTextFile(path)) as Partial<UserSnippet>[];
    projectSnippets = raw
      .filter((s) => s.prefix && s.body)
      .map((s, i) => ({
        id: `project-${i}`,
        name: s.name ?? s.prefix!,
        prefix: s.prefix!,
        body: s.body!,
        language: s.language ?? "*",
      }));
  } catch {
    projectSnippets = [];
  }
}

export function registerUserSnippets() {
  monaco.languages.registerCompletionItemProvider("*", {
    provideCompletionItems(model, position) {
      const snippets = [
        ...useUserSnippets.getState().snippets,
        ...projectSnippets,
      ];
      if (snippets.length === 0) return { suggestions: [] };
      const languageId = model.getLanguageId();
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(
        position.lineNumber,
        word.startColumn,
        position.lineNumber,
        word.endColumn,
      );
      return {
        suggestions: snippets
          .filter(
            (s) =>
              s.prefix &&
              (s.language === "*" || s.language === languageId),
          )
          .map((s) => ({
            label: { label: s.prefix, description: s.name },
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: s.name,
            documentation: s.body,
            insertText: s.body,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
      };
    },
  });
}
