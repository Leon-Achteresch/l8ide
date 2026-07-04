import { CollisionPriority } from "@dnd-kit/abstract";
import { pointerIntersection } from "@dnd-kit/collision";
import {
  Accessibility,
  AutoScroller,
  Cursor,
  Feedback,
  PreventSelection,
} from "@dnd-kit/dom";
import {
  DragDropProvider,
  type DragEndEvent,
  DragOverlay,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
} from "@dnd-kit/react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  copyFile,
  exists,
  mkdir,
  readDir,
  remove,
  rename,
  stat,
} from "@tauri-apps/plugin-fs";
import { ChevronRight, CopyPlus, File, Folder, FolderOpen } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { create } from "zustand";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { dlog, installDndDiagnostics } from "@/lib/dnd-log";
import { fileIcon } from "@/lib/file-icons";
import { basename, canMove, dragRoots, parentDir } from "@/lib/fs-move";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Entry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

const ROOT_ID = "__root__";
const EXPAND_DELAY = 500;

type TreeState = {
  dropTarget: string | null;
  selected: string[];
  anchor: string | null;
  dragging: string[];
  refreshTicks: Record<string, number>;
  setDropTarget: (path: string | null) => void;
  select: (paths: string[], anchor?: string | null) => void;
  setDragging: (paths: string[]) => void;
  bumpDirs: (dirs: Iterable<string>) => void;
  reset: () => void;
};

const useTreeStore = create<TreeState>()((set) => ({
  dropTarget: null,
  selected: [],
  anchor: null,
  dragging: [],
  refreshTicks: {},
  setDropTarget: (dropTarget) =>
    set((s) => (s.dropTarget === dropTarget ? s : { dropTarget })),
  select: (selected, anchor) =>
    set(anchor === undefined ? { selected } : { selected, anchor }),
  setDragging: (dragging) => set({ dragging }),
  bumpDirs: (dirs) =>
    set((s) => {
      const refreshTicks = { ...s.refreshTicks };
      for (const d of dirs) refreshTicks[d] = (refreshTicks[d] ?? 0) + 1;
      return { refreshTicks };
    }),
  reset: () =>
    set({
      dropTarget: null,
      selected: [],
      anchor: null,
      dragging: [],
      refreshTicks: {},
    }),
}));

async function listDir(path: string): Promise<Entry[]> {
  const entries = await readDir(path);
  return entries
    .map((e) => ({
      name: e.name ?? "",
      path: `${path}/${e.name}`,
      isDirectory: e.isDirectory,
    }))
    .sort((a, b) =>
      a.isDirectory === b.isDirectory
        ? a.name.localeCompare(b.name)
        : a.isDirectory
          ? -1
          : 1,
    );
}

async function copyEntry(src: string, dest: string) {
  const info = await stat(src);
  if (info.isDirectory) {
    await mkdir(dest, { recursive: true });
    for (const e of await readDir(src)) {
      await copyEntry(`${src}/${e.name}`, `${dest}/${e.name}`);
    }
  } else {
    await copyFile(src, dest);
  }
}

function EntryIcon({ entry, open }: { entry: Entry; open?: boolean }) {
  const fileIcons = useWorkspaceStore((s) => s.fileIcons);
  if (entry.isDirectory) {
    return open ? (
      <FolderOpen className="size-3.5 shrink-0" />
    ) : (
      <Folder className="size-3.5 shrink-0" />
    );
  }
  const Icon = fileIcons ? fileIcon(entry.name) : null;
  return Icon ? (
    <Icon className="size-3.5 shrink-0" />
  ) : (
    <File className="size-3.5 shrink-0" />
  );
}

type TreeCtxType = {
  hidden: Set<string>;
  onRowClick: (entry: Entry, e: React.MouseEvent) => void;
};

const TreeCtx = createContext<TreeCtxType>(null!);

function TreeNode({ entry, depth }: { entry: Entry; depth: number }) {
  const ctx = useContext(TreeCtx);
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Entry[] | null>(null);
  const isActive = useWorkspaceStore((s) => s.activeFile === entry.path);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const isSelected = useTreeStore((s) => s.selected.includes(entry.path));
  const isDropTarget = useTreeStore((s) => s.dropTarget === entry.path);
  const isDragSource = useTreeStore((s) => s.dragging.includes(entry.path));
  const tick = useTreeStore((s) => s.refreshTicks[entry.path] ?? 0);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const expandTimer = useRef<number | null>(null);

  const targetDir = entry.isDirectory ? entry.path : parentDir(entry.path);
  const { ref: dragRef } = useDraggable({
    id: entry.path,
    data: { entry },
  });
  const { ref: dropRef } = useDroppable({
    id: entry.path,
    data: { dir: targetDir },
    collisionDetector: pointerIntersection,
    collisionPriority: CollisionPriority.High,
  });

  useEffect(() => {
    if (entry.isDirectory && activeFile?.startsWith(`${entry.path}/`)) {
      setOpen(true);
      setChildren((c) => {
        if (c === null) listDir(entry.path).then(setChildren);
        return c;
      });
    }
  }, [activeFile, entry.path, entry.isDirectory]);

  useEffect(() => {
    if (isActive) buttonRef.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);

  useEffect(() => {
    if (tick === 0) return;
    setChildren((c) => {
      if (c !== null) listDir(entry.path).then(setChildren);
      return c;
    });
  }, [tick, entry.path]);

  useEffect(() => {
    if (isDropTarget && entry.isDirectory && !open) {
      expandTimer.current = window.setTimeout(() => {
        expandTimer.current = null;
        dlog("auto-expand", entry.path);
        setChildren((c) => {
          if (c === null) listDir(entry.path).then(setChildren);
          return c;
        });
        setOpen(true);
      }, EXPAND_DELAY);
    }
    return () => {
      if (expandTimer.current !== null) {
        clearTimeout(expandTimer.current);
        expandTimer.current = null;
      }
    };
  }, [isDropTarget, entry.path, entry.isDirectory, open]);

  async function toggle() {
    if (!entry.isDirectory) {
      openFile(entry.path);
      return;
    }
    if (!open && children === null) {
      setChildren(await listDir(entry.path));
    }
    setOpen((o) => !o);
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <button
            ref={(el) => {
              buttonRef.current = el;
              dragRef(el);
              dropRef(el);
            }}
            type="button"
            data-path={entry.path}
            data-dir={entry.isDirectory}
            onClick={(e) => {
              ctx.onRowClick(entry, e);
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) toggle();
            }}
            className={cn(
              "flex w-full select-none items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-accent",
              (isActive || isSelected) && "bg-accent",
              isDragSource && "opacity-50",
              isDropTarget && "bg-accent/50 ring-1 ring-ring",
            )}
            style={{ paddingLeft: depth * 12 + 4 }}
          >
            {entry.isDirectory ? (
              <ChevronRight
                className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
              />
            ) : (
              <span className="w-3.5 shrink-0" />
            )}
            <EntryIcon entry={entry} open={open} />
            <span className="truncate">{entry.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="min-w-48">
          <ContextMenuItem
            onClick={() =>
              useWorkspaceStore.getState().hideName(entry.name, "workspace")
            }
          >
            Ausblenden (Workspace)
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() =>
              useWorkspaceStore.getState().hideName(entry.name, "global")
            }
          >
            Ausblenden (Überall)
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {open && children !== null && (
        <div>
          {children
            .filter((c) => !ctx.hidden.has(c.name))
            .map((child) => (
              <TreeNode key={child.path} entry={child} depth={depth + 1} />
            ))}
        </div>
      )}
    </div>
  );
}

function TreeContainer({
  rootPath,
  entries,
  hidden,
  containerRef,
}: {
  rootPath: string;
  entries: Entry[];
  hidden: Set<string>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { ref: dropRef } = useDroppable({
    id: ROOT_ID,
    data: { dir: rootPath },
    collisionDetector: pointerIntersection,
    collisionPriority: CollisionPriority.Low,
  });
  const isRootDropTarget = useTreeStore((s) => s.dropTarget === rootPath);

  return (
    <div
      ref={(el) => {
        containerRef.current = el;
        dropRef(el);
      }}
      onClick={(e) => {
        if (e.target === containerRef.current) {
          useTreeStore.getState().select([], null);
        }
      }}
      className={cn(
        "min-h-0 flex-1 overflow-auto p-1",
        isRootDropTarget && "bg-accent/50 ring-1 ring-ring ring-inset",
      )}
    >
      {entries
        .filter((c) => !hidden.has(c.name))
        .map((child) => (
          <TreeNode key={child.path} entry={child} depth={0} />
        ))}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [children, setChildren] = useState<Entry[] | null>(null);
  const [altKey, setAltKey] = useState(false);
  const [overValid, setOverValid] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const altRef = useRef(false);
  const dropBusyRef = useRef(false);
  const globalHidden = useWorkspaceStore((s) => s.hiddenNames);
  const wsHidden = useWorkspaceStore((s) => s.workspaceHidden[rootPath]);
  const draggingCount = useTreeStore((s) => s.dragging.length);
  const hidden = useMemo(
    () => new Set([...globalHidden, ...(wsHidden ?? [])]),
    [globalHidden, wsHidden],
  );

  useEffect(() => {
    installDndDiagnostics();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      altRef.current = e.altKey;
      setAltKey(e.altKey);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  useEffect(() => {
    setChildren(null);
    useTreeStore.getState().reset();
    listDir(rootPath).then(setChildren);
  }, [rootPath]);

  const rootTick = useTreeStore((s) => s.refreshTicks[rootPath] ?? 0);
  useEffect(() => {
    if (rootTick === 0) return;
    listDir(rootPath).then(setChildren);
  }, [rootTick, rootPath]);

  const handleRowClick = useCallback((entry: Entry, e: React.MouseEvent) => {
    const st = useTreeStore.getState();
    if (e.metaKey || e.ctrlKey) {
      st.select(
        st.selected.includes(entry.path)
          ? st.selected.filter((p) => p !== entry.path)
          : [...st.selected, entry.path],
        entry.path,
      );
      return;
    }
    if (e.shiftKey) {
      const order = Array.from(
        containerRef.current?.querySelectorAll<HTMLElement>("[data-path]") ??
          [],
      ).map((el) => el.dataset.path!);
      const a = order.indexOf(st.anchor ?? entry.path);
      const b = order.indexOf(entry.path);
      if (a !== -1 && b !== -1) {
        st.select(order.slice(Math.min(a, b), Math.max(a, b) + 1));
      }
      return;
    }
    st.select([entry.path], entry.path);
  }, []);

  async function performDrop(dir: string, srcs: string[], copy: boolean) {
    if (dropBusyRef.current) {
      dlog("performDrop ignored — already running");
      return;
    }
    dropBusyRef.current = true;
    const st = useTreeStore.getState();
    st.setDragging([]);
    st.setDropTarget(null);
    dlog("performDrop", { dir, srcs, copy });
    const done: string[] = [];
    const affected = new Set<string>();
    try {
      for (const src of srcs) {
        if (!canMove(src, dir)) {
          dlog("skip — canMove=false", { src, dir });
          continue;
        }
        const dest = `${dir}/${basename(src)}`;
        try {
          if (await exists(dest)) {
            dlog("conflict — asking to replace", dest);
            const ok = await confirm(
              `„${basename(src)}“ existiert bereits in diesem Ordner. Ersetzen?`,
              { title: "Ersetzen", kind: "warning" },
            );
            if (!ok) {
              dlog("replace declined", dest);
              continue;
            }
            await remove(dest, { recursive: true });
          }
          if (copy) {
            await copyEntry(src, dest);
            dlog("copied", src, "→", dest);
          } else {
            await rename(src, dest);
            useWorkspaceStore.getState().remapPath(src, dest);
            affected.add(parentDir(src));
            dlog("moved", src, "→", dest);
          }
          affected.add(dir);
          done.push(dest);
        } catch (err) {
          dlog("ERROR", { src, dest, err });
        }
      }
      if (done.length > 0) {
        st.select(done, done[0]);
        st.bumpDirs(affected);
      }
      dlog("performDrop finished", { done, affected: [...affected] });
    } finally {
      dropBusyRef.current = false;
    }
  }

  function handleDragStart(e: DragStartEvent) {
    const entry = e.operation.source?.data?.entry as Entry | undefined;
    if (!entry) return;
    const st = useTreeStore.getState();
    const picked = st.selected.includes(entry.path)
      ? st.selected
      : [entry.path];
    const paths = dragRoots(picked);
    if (!st.selected.includes(entry.path)) {
      st.select([entry.path], entry.path);
    }
    st.setDragging(paths);
    setOverValid(null);
    dlog("dragstart", { paths });
  }

  function handleDragOver(e: DragOverEvent) {
    const st = useTreeStore.getState();
    const dir = e.operation.target?.data?.dir as string | undefined;
    if (!dir) {
      st.setDropTarget(null);
      setOverValid(null);
      return;
    }
    const ok =
      st.dragging.length > 0 && st.dragging.every((s) => canMove(s, dir));
    st.setDropTarget(ok ? dir : null);
    setOverValid(ok);
    dlog("dragover", { dir, ok });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const st = useTreeStore.getState();
    const paths = st.dragging;
    const dir = e.operation.target?.data?.dir as string | undefined;
    setOverValid(null);
    dlog("dragend", { dir, paths, canceled: e.canceled, alt: altRef.current });
    if (!e.canceled && dir && paths.length > 0) {
      await performDrop(dir, paths, altRef.current);
    } else {
      st.setDragging([]);
      st.setDropTarget(null);
    }
  }

  useEffect(() => {
    const resolveTargetDir = (position: { x: number; y: number }) => {
      const scale = window.devicePixelRatio;
      const x = position.x / scale;
      const y = position.y / scale;
      const rect = containerRef.current?.getBoundingClientRect();
      if (
        !rect ||
        x < rect.left ||
        x > rect.right ||
        y < rect.top ||
        y > rect.bottom
      ) {
        return null;
      }
      const row = document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-path]");
      if (!row?.dataset.path) return rootPath;
      return row.dataset.dir === "true"
        ? row.dataset.path
        : parentDir(row.dataset.path);
    };
    const unlisten = getCurrentWebview().onDragDropEvent(async (event) => {
      const type = event.payload.type;
      const st = useTreeStore.getState();
      if (type === "over") {
        st.setDropTarget(resolveTargetDir(event.payload.position));
      } else if (type === "drop") {
        const dir = resolveTargetDir(event.payload.position);
        dlog("tauri external drop", { dir, paths: event.payload.paths });
        st.setDropTarget(null);
        if (!dir || event.payload.paths.length === 0) return;
        await Promise.all(
          event.payload.paths.map((p) =>
            copyFile(p, `${dir}/${basename(p)}`).catch((err) =>
              dlog("ERROR external copy", { p, err }),
            ),
          ),
        );
        st.bumpDirs([dir]);
      } else {
        st.setDropTarget(null);
      }
    });
    dlog("tauri onDragDropEvent listener registered", { rootPath });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [rootPath]);

  const ctx = useMemo<TreeCtxType>(
    () => ({ hidden, onRowClick: handleRowClick }),
    [hidden, handleRowClick],
  );

  if (children === null) {
    return <div className="p-2 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <TreeCtx.Provider value={ctx}>
      <DragDropProvider
        sensors={[PointerSensor]}
        plugins={[
          Accessibility,
          AutoScroller.configure({ acceleration: 25 }),
          Cursor.configure({ cursor: "grabbing" }),
          Feedback,
          PreventSelection,
        ]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <TreeContainer
          rootPath={rootPath}
          entries={children}
          hidden={hidden}
          containerRef={containerRef}
        />
        <DragOverlay dropAnimation={null} className="pointer-events-none">
          {(source) => {
            const entry = source?.data?.entry as Entry | undefined;
            if (!entry) return null;
            return (
              <div
                className={cn(
                  "flex w-fit items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-sm text-foreground shadow-lg",
                  overValid === false && "opacity-50",
                )}
              >
                <EntryIcon entry={entry} />
                <span className="whitespace-nowrap">
                  {draggingCount > 1
                    ? `${draggingCount} Elemente`
                    : entry.name}
                </span>
                {draggingCount > 1 && (
                  <span className="rounded-full bg-primary px-1.5 text-[10px] font-medium leading-4 text-primary-foreground">
                    {draggingCount}
                  </span>
                )}
                {altKey && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <CopyPlus className="size-3" />
                    Kopie
                  </span>
                )}
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>
    </TreeCtx.Provider>
  );
}
