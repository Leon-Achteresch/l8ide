import { appDataDir } from "@tauri-apps/api/path";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";
import { hashPath } from "@/lib/local-history";
import { useWorkspaceStore } from "@/lib/workspace-store";

export async function openProjectNotes() {
  const ws = useWorkspaceStore.getState();
  const root = ws.rootPath;
  if (!root) {
    toast.error("Kein Projekt geöffnet.");
    return;
  }
  const base = (await appDataDir()).replace(/\/+$/, "");
  const dir = `${base}/notes`;
  const file = `${dir}/${hashPath(root)}.md`;
  if (!(await exists(file))) {
    await mkdir(dir, { recursive: true });
    const name = root.split("/").pop() ?? root;
    await writeTextFile(
      file,
      `# Notizen · ${name}\n\nProjekt-Scratchpad — liegt außerhalb des Repos und überlebt Branch-Wechsel.\n\n- [ ] \n`,
    );
  }
  ws.openFile(file);
}
