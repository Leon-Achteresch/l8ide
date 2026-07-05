"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useDeferredValue,
} from "react";
import { File } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { fileIcon } from "@/lib/file-icons";
import { filterFiles, useFileIndexStore } from "@/lib/file-index";
import { create } from "zustand";
import { cn } from "@/lib/utils";

const useFileSearchStore = create<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));

export { useFileSearchStore };

export function FileSearch() {
  const open = useFileSearchStore((s) => s.open);
  const setOpen = useFileSearchStore((s) => s.setOpen);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const hiddenNames = useWorkspaceStore((s) => s.hiddenNames);
  const workspaceHidden = useWorkspaceStore((s) => s.workspaceHidden);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const files = useFileIndexStore((s) => s.files);
  const loading = useFileIndexStore((s) => s.loading);
  const ensureIndex = useFileIndexStore((s) => s.ensureIndex);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!rootPath) return;
    const wsHidden = workspaceHidden[rootPath] ?? [];
    ensureIndex(rootPath, hiddenNames, wsHidden);
  }, [rootPath, hiddenNames, workspaceHidden, ensureIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const results = useMemo(
    () => filterFiles(files, deferredQuery, tabs),
    [files, deferredQuery, tabs],
  );

  const handleSelect = useCallback(
    (path: string) => {
      useWorkspaceStore.getState().openFile(path);
      setOpen(false);
    },
    [setOpen],
  );

  if (!open) return null;

  return (
    <>
      <div
        data-overlay
        className="fixed inset-0 z-40"
        onMouseDown={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 top-10 z-50 flex justify-center px-4",
          "animate-in fade-in-0 slide-in-from-top-1 duration-100",
        )}
      >
        <div
          className="w-full max-w-2xl overflow-hidden rounded-b-lg border-b bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Command shouldFilter={false} loop>
            <CommandInput
              placeholder="Datei suchen…"
              autoFocus
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                <span className="text-muted-foreground">
                  {loading && files.length === 0
                    ? "Indexiere Dateien…"
                    : "Keine Ergebnisse"}
                </span>
              </CommandEmpty>
              <CommandGroup>
                {results.map((file) => {
                  const name = file.split("/").pop() ?? file;
                  const dir = file.slice(0, file.lastIndexOf("/"));
                  const Icon = fileIcon(name);
                  return (
                    <CommandItem
                      key={file}
                      value={file}
                      onSelect={() => handleSelect(file)}
                    >
                      {Icon ? (
                        <Icon className="size-4 shrink-0" />
                      ) : (
                        <File className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="truncate">{name}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {dir}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
    </>
  );
}
