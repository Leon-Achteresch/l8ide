import { useGitStore } from "@/lib/git-store";
import { useMarkersStore, useProblemsPanel } from "@/lib/markers-store";
import { getMonacoInstance } from "@/lib/monaco-instance";
import { useEditorStatus } from "@/lib/status-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";
import { CircleX, GitBranch, TriangleAlert } from "lucide-react";

function Item({
  onClick,
  title,
  children,
  className,
}: {
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-full items-center gap-1 rounded-md px-1.5 text-muted-foreground transition-colors",
        onClick && "hover:bg-foreground/8 hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function StatusBar() {
  const branch = useGitStore((s) => s.branch);
  const total = useMarkersStore((s) => s.total);
  const toggleProblems = useProblemsPanel((s) => s.toggle);
  const activeFile = useWorkspaceStore((s) => s.activeFile);
  const status = useEditorStatus();
  const showEditor = Boolean(status.editor && activeFile);

  const openScm = () => {
    const ws = useWorkspaceStore.getState();
    ws.setSidebarMode("Scm");
    if (!ws.sidebarOpen) ws.toggleSidebar();
  };

  const gotoLine = () => {
    status.editor?.focus();
    status.editor?.trigger("statusbar", "editor.action.gotoLine", null);
  };

  const toggleIndent = () => {
    status.editor
      ?.getModel()
      ?.updateOptions({ insertSpaces: !status.insertSpaces });
  };

  const toggleEol = () => {
    const m = getMonacoInstance();
    const model = status.editor?.getModel();
    if (!m || !model) return;
    model.setEOL(
      status.eol === "LF"
        ? m.editor.EndOfLineSequence.CRLF
        : m.editor.EndOfLineSequence.LF,
    );
  };

  return (
    <div className="flex h-6 w-full shrink-0 select-none items-stretch justify-between gap-1 px-2 py-0.5 text-[11px]">
      <div className="flex min-w-0 items-stretch gap-1">
        {branch && (
          <Item onClick={openScm} title="Source Control öffnen">
            <GitBranch className="size-3" strokeWidth={2} />
            <span className="truncate">{branch}</span>
          </Item>
        )}
        <Item onClick={toggleProblems} title="Probleme anzeigen">
          <CircleX
            className={cn("size-3", total.errors > 0 && "text-red-500")}
            strokeWidth={2}
          />
          {total.errors}
          <TriangleAlert
            className={cn("size-3", total.warnings > 0 && "text-amber-500")}
            strokeWidth={2}
          />
          {total.warnings}
        </Item>
      </div>
      {showEditor && (
        <div className="flex items-stretch gap-1">
          <Item onClick={gotoLine} title="Gehe zu Zeile/Spalte">
            Z {status.line}, S {status.column}
            {status.selectedChars > 0 && ` (${status.selectedChars} markiert)`}
            {status.selections > 1 && ` · ${status.selections} Cursor`}
          </Item>
          <Item onClick={toggleIndent} title="Einrückung umschalten">
            {status.insertSpaces
              ? `Leerzeichen: ${status.tabSize}`
              : `Tabs: ${status.tabSize}`}
          </Item>
          <Item onClick={toggleEol} title="Zeilenende umschalten">
            {status.eol}
          </Item>
          {status.language && <Item>{status.language}</Item>}
        </div>
      )}
    </div>
  );
}
