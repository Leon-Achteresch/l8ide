"use client";

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useDeferredValue,
} from "react";
import { AtSign, CornerDownRight, File, Hash, HelpCircle } from "lucide-react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";
import { fileIcon } from "@/lib/file-icons";
import { filterFiles, useFileIndexStore } from "@/lib/file-index";
import { openFileAt } from "@/lib/monaco-navigation";
import {
  flattenOutline,
  getOutline,
  kindIcon,
  type OutlineNode,
} from "@/lib/outline";
import { getWorkspaceSymbols, type WorkspaceSymbol } from "@/lib/workspace-symbols";
import { create } from "zustand";
import { cn } from "@/lib/utils";

const useFileSearchStore = create<{
  open: boolean;
  prefill: string;
  setOpen: (open: boolean) => void;
  openWith: (prefill: string) => void;
}>()((set) => ({
  open: false,
  prefill: "",
  setOpen: (open) => set({ open, prefill: "" }),
  openWith: (prefill) => set({ open: true, prefill }),
}));

export { useFileSearchStore };

type Mode = "file" | ":" | "@" | "#" | "?";

const MODE_PLACEHOLDER: Record<Mode, string> = {
  file: "Datei suchen…",
  ":": "Zu Zeile springen…",
  "@": "Symbol in Datei…",
  "#": "Symbol im Workspace…",
  "?": "Hilfe",
};

const HELP_ITEMS: { prefix: string; label: string; icon: typeof File }[] = [
  { prefix: "", label: "Dateien nach Namen suchen", icon: File },
  { prefix: "@", label: "Symbole in aktueller Datei", icon: AtSign },
  { prefix: "#", label: "Symbole im gesamten Workspace", icon: Hash },
  { prefix: ":", label: "Zu einer Zeilennummer springen", icon: CornerDownRight },
];

function modeOf(query: string): Mode {
  const c = query[0];
  if (c === ":" || c === "@" || c === "#" || c === "?") return c;
  return "file";
}

export function FileSearch() {
  const open = useFileSearchStore((s) => s.open);
  const prefill = useFileSearchStore((s) => s.prefill);
  const setOpen = useFileSearchStore((s) => s.setOpen);
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const hiddenNames = useWorkspaceStore((s) => s.hiddenNames);
  const workspaceHidden = useWorkspaceStore((s) => s.workspaceHidden);
  const tabs = useWorkspaceStore((s) => s.tabs);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const files = useFileIndexStore((s) => s.files);
  const loading = useFileIndexStore((s) => s.loading);
  const ensureIndex = useFileIndexStore((s) => s.ensureIndex);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [fileSymbols, setFileSymbols] = useState<OutlineNode[]>([]);
  const [wsSymbols, setWsSymbols] = useState<WorkspaceSymbol[]>([]);

  const mode = modeOf(deferredQuery);
  const term = mode === "file" ? deferredQuery : deferredQuery.slice(1);

  useEffect(() => {
    setQuery(open ? prefill : "");
  }, [open, prefill]);

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

  useEffect(() => {
    if (!open || mode !== "@" || !activeFile || isPageTab(activeFile)) {
      setFileSymbols([]);
      return;
    }
    let cancelled = false;
    void getOutline(activeFile).then((nodes) => {
      if (!cancelled) setFileSymbols(flattenOutline(nodes));
    });
    return () => {
      cancelled = true;
    };
  }, [open, mode, activeFile]);

  useEffect(() => {
    if (!open || mode !== "#" || !term.trim()) {
      setWsSymbols([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void getWorkspaceSymbols(term).then((res) => {
        if (!cancelled) setWsSymbols(res);
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, mode, term]);

  const fileResults = useMemo(
    () => (mode === "file" ? filterFiles(files, deferredQuery, tabs) : []),
    [mode, files, deferredQuery, tabs],
  );

  const symbolResults = useMemo(() => {
    if (mode !== "@") return [];
    const q = term.trim().toLowerCase();
    if (!q) return fileSymbols;
    return fileSymbols.filter((s) => s.name.toLowerCase().includes(q));
  }, [mode, term, fileSymbols]);

  const lineTarget = useMemo(() => {
    if (mode !== ":") return null;
    const n = parseInt(term, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [mode, term]);

  const close = useCallback(() => setOpen(false), [setOpen]);

  const openFile = useCallback(
    (path: string) => {
      useWorkspaceStore.getState().openFile(path);
      close();
    },
    [close],
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
              placeholder={MODE_PLACEHOLDER[mode]}
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

              {mode === "file" && (
                <CommandGroup>
                  {fileResults.map((file) => {
                    const name = file.split("/").pop() ?? file;
                    const dir = file.slice(0, file.lastIndexOf("/"));
                    const Icon = fileIcon(name);
                    return (
                      <CommandItem
                        key={file}
                        value={file}
                        onSelect={() => openFile(file)}
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
              )}

              {mode === "@" && (
                <CommandGroup>
                  {symbolResults.map((sym, i) => {
                    const Icon = kindIcon(sym.kind);
                    return (
                      <CommandItem
                        key={`${sym.name}:${sym.line}:${i}`}
                        value={`${sym.name}:${sym.line}:${i}`}
                        onSelect={() => {
                          if (activeFile)
                            openFileAt(activeFile, {
                              line: sym.line,
                              column: sym.column,
                            });
                          close();
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{sym.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {sym.kind}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {mode === "#" && (
                <CommandGroup>
                  {wsSymbols.map((sym, i) => {
                    const Icon = kindIcon(sym.kind);
                    const name = sym.path.split("/").pop() ?? sym.path;
                    return (
                      <CommandItem
                        key={`${sym.path}:${sym.line}:${i}`}
                        value={`${sym.path}:${sym.line}:${i}`}
                        onSelect={() => {
                          openFileAt(sym.path, {
                            line: sym.line,
                            column: sym.column,
                          });
                          close();
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{sym.name}</span>
                        {sym.container && (
                          <span className="truncate text-xs text-muted-foreground">
                            {sym.container}
                          </span>
                        )}
                        <span className="ml-auto truncate text-xs text-muted-foreground">
                          {name}
                        </span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}

              {mode === ":" && lineTarget != null && (
                <CommandGroup>
                  <CommandItem
                    value={`line-${lineTarget}`}
                    onSelect={() => {
                      if (activeFile && !isPageTab(activeFile))
                        openFileAt(activeFile, { line: lineTarget, column: 1 });
                      close();
                    }}
                  >
                    <CornerDownRight className="size-4 shrink-0 text-muted-foreground" />
                    <span>Gehe zu Zeile {lineTarget}</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {mode === "?" && (
                <CommandGroup>
                  {HELP_ITEMS.map((item) => (
                    <CommandItem
                      key={item.prefix || "file"}
                      value={item.prefix || "file"}
                      onSelect={() => setQuery(item.prefix)}
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{item.label}</span>
                      <span className="ml-auto font-mono text-xs text-muted-foreground">
                        {item.prefix || "…"}
                      </span>
                    </CommandItem>
                  ))}
                  <CommandItem value="help" disabled>
                    <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Tippe eines der Zeichen, um den Modus zu wechseln
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      </div>
    </>
  );
}
