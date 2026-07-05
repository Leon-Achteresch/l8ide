import type { TextChange } from "@/lib/text-edits";
import { create } from "zustand";

export type { TextChange };

export type FileEdit = {
  uri: string;
  path: string;
  isNew: boolean;
  oldText: string;
  newText: string;
  changes: TextChange[];
};

export type RenameTarget = { uri: string; offset: number };

type PreviewInput = {
  title: string;
  edits: FileEdit[];
  rename?: RenameTarget;
};

type PreviewState = {
  open: boolean;
  title: string;
  edits: FileEdit[];
  rename?: RenameTarget;
  included: Record<string, boolean>;
  activeUri: string | null;
  show: (input: PreviewInput) => void;
  setActive: (uri: string) => void;
  toggle: (uri: string) => void;
  close: () => void;
};

export const useRefactorPreview = create<PreviewState>((set) => ({
  open: false,
  title: "",
  edits: [],
  rename: undefined,
  included: {},
  activeUri: null,
  show: ({ title, edits, rename }) =>
    set({
      open: true,
      title,
      edits,
      rename,
      included: Object.fromEntries(edits.map((e) => [e.uri, true])),
      activeUri: edits[0]?.uri ?? null,
    }),
  setActive: (activeUri) => set({ activeUri }),
  toggle: (uri) =>
    set((s) => ({ included: { ...s.included, [uri]: !s.included[uri] } })),
  close: () => set({ open: false, edits: [], rename: undefined }),
}));

type PromptState = {
  open: boolean;
  label: string;
  initial: string;
  resolve: ((value: string | null) => void) | null;
  ask: (label: string, initial: string) => Promise<string | null>;
  submit: (value: string) => void;
  cancel: () => void;
};

export const useRenamePrompt = create<PromptState>((set, get) => ({
  open: false,
  label: "",
  initial: "",
  resolve: null,
  ask: (label, initial) =>
    new Promise<string | null>((resolve) => {
      get().resolve?.(null);
      set({ open: true, label, initial, resolve });
    }),
  submit: (value) => {
    get().resolve?.(value);
    set({ open: false, resolve: null });
  },
  cancel: () => {
    get().resolve?.(null);
    set({ open: false, resolve: null });
  },
}));
