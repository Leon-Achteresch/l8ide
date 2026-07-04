import { getCurrentWebview } from "@tauri-apps/api/webview";
import { copyFile, readDir, rename } from "@tauri-apps/plugin-fs";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { fileIcon } from "@/lib/file-icons";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/lib/workspace-store";

type Entry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

const DRAG_TYPE = "text/x-l8ide-path";

function parentDir(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

function basename(path: string) {
  return path.split("/").pop() ?? path;
}

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

function canMove(src: string, targetDir: string) {
  return (
    src !== targetDir &&
    parentDir(src) !== targetDir &&
    !`${targetDir}/`.startsWith(`${src}/`)
  );
}

function TreeNode({
  entry,
  depth,
  hidden,
  version,
  dropTarget,
  onMove,
}: {
  entry: Entry;
  depth: number;
  hidden: Set<string>;
  version: number;
  dropTarget: string | null;
  onMove: (src: string, targetDir: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Entry[] | null>(null);
  const isActive = useWorkspaceStore((s) => s.activeFile === entry.path);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const openFile = useWorkspaceStore((s) => s.openFile);
  const fileIcons = useWorkspaceStore((s) => s.fileIcons);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const targetDir = entry.isDirectory ? entry.path : parentDir(entry.path);

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
    if (version > 0 && children !== null) listDir(entry.path).then(setChildren);
  }, [version]);

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
            ref={buttonRef}
            type="button"
            onClick={toggle}
            draggable
            data-path={entry.path}
            data-dir={entry.isDirectory}
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, entry.path);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              const src = e.dataTransfer.getData(DRAG_TYPE);
              if (!src) return;
              e.preventDefault();
              e.stopPropagation();
              if (canMove(src, targetDir)) onMove(src, targetDir);
            }}
            className={cn(
              "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-accent",
              isActive && "bg-accent",
              dropTarget === entry.path && "bg-accent/50 ring-1 ring-ring",
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
            {entry.isDirectory ? (
              open ? (
                <FolderOpen className="size-3.5 shrink-0" />
              ) : (
                <Folder className="size-3.5 shrink-0" />
              )
            ) : (
              (() => {
                const Icon = fileIcons ? fileIcon(entry.name) : null;
                return Icon ? (
                  <Icon className="size-3.5 shrink-0" />
                ) : (
                  <File className="size-3.5 shrink-0" />
                );
              })()
            )}
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
            .filter((c) => !hidden.has(c.name))
            .map((child) => (
              <TreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                hidden={hidden}
                version={version}
                dropTarget={dropTarget}
                onMove={onMove}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [children, setChildren] = useState<Entry[] | null>(null);
  const [version, setVersion] = useState(0);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const globalHidden = useWorkspaceStore((s) => s.hiddenNames);
  const wsHidden = useWorkspaceStore((s) => s.workspaceHidden[rootPath]);
  const hidden = useMemo(
    () => new Set([...globalHidden, ...(wsHidden ?? [])]),
    [globalHidden, wsHidden],
  );

  useEffect(() => {
    setChildren(null);
    listDir(rootPath).then(setChildren);
  }, [rootPath]);

  async function refresh() {
    setChildren(await listDir(rootPath));
    setVersion((v) => v + 1);
  }

  async function moveEntry(src: string, targetDir: string) {
    setDropTarget(null);
    await rename(src, `${targetDir}/${basename(src)}`).catch(() => {});
    await refresh();
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
      if (event.payload.type === "over") {
        setDropTarget(resolveTargetDir(event.payload.position));
      } else if (event.payload.type === "drop") {
        setDropTarget(null);
        const target = resolveTargetDir(event.payload.position);
        if (!target) return;
        await Promise.all(
          event.payload.paths.map((p) =>
            copyFile(p, `${target}/${basename(p)}`).catch(() => {}),
          ),
        );
        await refresh();
      } else {
        setDropTarget(null);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [rootPath]);

  if (children === null) {
    return <div className="p-2 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div
      ref={containerRef}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        const src = e.dataTransfer.getData(DRAG_TYPE);
        if (!src) return;
        e.preventDefault();
        if (canMove(src, rootPath)) moveEntry(src, rootPath);
      }}
      className={cn(
        "min-h-0 flex-1 overflow-auto p-1",
        dropTarget === rootPath && "bg-accent/50 ring-1 ring-ring ring-inset",
      )}
    >
      {children
        .filter((c) => !hidden.has(c.name))
        .map((child) => (
          <TreeNode
            key={child.path}
            entry={child}
            depth={0}
            hidden={hidden}
            version={version}
            dropTarget={dropTarget}
            onMove={moveEntry}
          />
        ))}
    </div>
  );
}
