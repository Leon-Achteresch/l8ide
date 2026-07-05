import { useWorkspaceStore } from "@/lib/workspace-store";
import { open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";

export function AppHeaderFolderButton() {
  const setRootPath = useWorkspaceStore((s) => s.setRootPath);

  async function pickFolder() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") setRootPath(selected);
  }

  return (
    <button
      type="button"
      aria-label="Open folder"
      title="Open folder"
      onClick={pickFolder}
      className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-foreground/8 hover:text-foreground"
    >
      <FolderOpen className="size-4" strokeWidth={2} />
    </button>
  );
}
