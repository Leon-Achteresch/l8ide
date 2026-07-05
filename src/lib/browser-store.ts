import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BROWSER_HOME } from "@/lib/url-normalize";

type BrowserStore = {
  open: boolean;
  width: number;
  url: string;
  title: string;
  loading: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setWidth: (width: number) => void;
  setUrl: (url: string) => void;
  setTitle: (title: string) => void;
  setLoading: (loading: boolean) => void;
};

export const useBrowserStore = create<BrowserStore>()(
  persist(
    (set) => ({
      open: false,
      width: 480,
      url: BROWSER_HOME,
      title: "",
      loading: false,
      toggle: () => set((s) => ({ open: !s.open })),
      setOpen: (open) => set({ open }),
      setWidth: (width) =>
        set({ width: Math.max(320, Math.min(window.innerWidth - 280, width)) }),
      setUrl: (url) => set({ url }),
      setTitle: (title) => set({ title }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      name: "browser-store",
      partialize: (s) => ({ open: s.open, width: s.width, url: s.url }),
    },
  ),
);
