import { create } from "zustand";
import { pageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { languageOf } from "@/lib/language-of";

export type CompareSide = { label: string; path?: string; text?: string };
export type CompareDescriptor = {
  left: CompareSide;
  right: CompareSide;
  language: string;
  title: string;
};

let counter = 0;

type FileCompareStore = {
  selected: string | null;
  compares: Record<string, CompareDescriptor>;
  setSelected: (path: string | null) => void;
  openCompare: (left: CompareSide, right: CompareSide, language: string) => void;
};

function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

export const useFileCompare = create<FileCompareStore>()((set) => ({
  selected: null,
  compares: {},
  setSelected: (selected) => set({ selected }),
  openCompare: (left, right, language) => {
    counter += 1;
    const route = `/compare/${counter}`;
    const title = `${left.label} ↔ ${right.label}`;
    set((s) => ({
      compares: { ...s.compares, [route]: { left, right, language, title } },
    }));
    useWorkspaceStore.getState().openFile(pageTab(route));
  },
}));

export function compareFiles(leftPath: string, rightPath: string) {
  useFileCompare.getState().openCompare(
    { label: baseName(leftPath), path: leftPath },
    { label: baseName(rightPath), path: rightPath },
    languageOf(rightPath),
  );
}

export async function compareWithClipboard(path: string) {
  const text = await navigator.clipboard.readText().catch(() => "");
  useFileCompare.getState().openCompare(
    { label: baseName(path), path },
    { label: "Zwischenablage", text: text ?? "" },
    languageOf(path),
  );
}
