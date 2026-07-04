import { readDir } from "@tauri-apps/plugin-fs";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";

type Entry = {
  name: string;
  path: string;
  isDirectory: boolean;
};

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

function TreeNode({ entry, depth }: { entry: Entry; depth: number }) {
  const [open, setOpen] = useState(false);
  const [children, setChildren] = useState<Entry[] | null>(null);

  async function toggle() {
    if (!entry.isDirectory) return;
    if (!open && children === null) {
      setChildren(await listDir(entry.path));
    }
    setOpen((o) => !o);
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-sm hover:bg-accent"
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
          <File className="size-3.5 shrink-0" />
        )}
        <span className="truncate">{entry.name}</span>
      </button>
      {open && children !== null && (
        <div>
          {children.map((child) => (
            <TreeNode key={child.path} entry={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ rootPath }: { rootPath: string }) {
  const [children, setChildren] = useState<Entry[] | null>(null);

  useEffect(() => {
    setChildren(null);
    listDir(rootPath).then(setChildren);
  }, [rootPath]);

  if (children === null) {
    return <div className="p-2 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="overflow-auto p-1">
      {children.map((child) => (
        <TreeNode key={child.path} entry={child} depth={0} />
      ))}
    </div>
  );
}
