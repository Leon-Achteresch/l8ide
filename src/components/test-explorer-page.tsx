import { readTextFile } from "@tauri-apps/plugin-fs";
import {
  ChevronRight,
  CircleDashed,
  FlaskConical,
  Loader2,
  Play,
  RotateCw,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { openFileAt } from "@/lib/monaco-navigation";
import { useFileIndexStore } from "@/lib/file-index";
import { findTestCases, isTestFile, type TestCase } from "@/lib/test-lens-core";
import { runFileWithResults, useTestResults } from "@/lib/test-results";
import { runTestInTerminal } from "@/lib/test-lens";
import type { TestResult } from "@/lib/test-results-core";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { cn } from "@/lib/utils";

type FileNode = { path: string; rel: string; cases: TestCase[] };

const MAX_FILES = 300;

const STATUS_COLOR: Record<string, string> = {
  passed: "text-emerald-500",
  failed: "text-rose-500",
  skipped: "text-muted-foreground",
  pending: "text-muted-foreground",
};

function statusFor(
  results: TestResult[] | undefined,
  title: string,
): string | null {
  return results?.find((r) => r.title === title)?.status ?? null;
}

function CaseRow({ node, c }: { node: FileNode; c: TestCase }) {
  const results = useTestResults((s) => s.byPath[node.path]);
  const status = statusFor(results, c.title);
  return (
    <div
      className="group flex items-center gap-2 rounded-md py-0.5 pl-8 pr-2 hover:bg-foreground/[0.04]"
      style={{ paddingLeft: (c.kind === "describe" ? 20 : 32) + 8 }}
    >
      <span
        className={cn(
          "shrink-0 font-mono text-[11px]",
          status ? STATUS_COLOR[status] : "text-transparent",
        )}
      >
        {status === "passed"
          ? "✓"
          : status === "failed"
            ? "✗"
            : status
              ? "○"
              : "•"}
      </span>
      <button
        type="button"
        onClick={() => openFileAt(node.path, { line: c.line, column: 1 })}
        className={cn(
          "min-w-0 flex-1 truncate text-left text-xs",
          c.kind === "describe"
            ? "font-medium text-foreground"
            : "text-foreground/85",
        )}
      >
        {c.title}
      </button>
      <button
        type="button"
        title="Diesen Test ausführen"
        onClick={() => void runTestInTerminal(node.rel, c.title)}
        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
      >
        <Play className="size-3" />
      </button>
    </div>
  );
}

function FileGroup({ node }: { node: FileNode }) {
  const [open, setOpen] = useState(true);
  const running = useTestResults((s) => s.running[node.path]);
  return (
    <div>
      <div className="group flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-foreground/[0.04]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <motion.span
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            className="shrink-0"
          >
            <ChevronRight className="size-3.5 text-muted-foreground" />
          </motion.span>
          <FlaskConical className="size-3.5 shrink-0 text-violet-500" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            {node.rel}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {node.cases.filter((c) => c.kind !== "describe").length}
          </span>
        </button>
        <button
          type="button"
          title="Datei mit Ergebnissen ausführen"
          onClick={() => void runFileWithResults(node.path)}
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
        >
          {running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
        </button>
      </div>
      {open &&
        node.cases.map((c, i) => (
          <CaseRow key={`${c.title}:${c.line}:${i}`} node={node} c={c} />
        ))}
    </div>
  );
}

export function TestExplorerPage() {
  const rootPath = useWorkspaceStore((s) => s.rootPath);
  const files = useFileIndexStore((s) => s.files);
  const [nodes, setNodes] = useState<FileNode[] | null>(null);

  const scan = useCallback(() => {
    const root = rootPath?.replace(/\/+$/, "");
    if (!root) return;
    const testFiles = files.filter(isTestFile).slice(0, MAX_FILES);
    setNodes(null);
    void Promise.all(
      testFiles.map(async (path) => {
        const text = await readTextFile(path).catch(() => "");
        const cases = findTestCases(text);
        const rel = path.startsWith(`${root}/`)
          ? path.slice(root.length + 1)
          : path;
        return { path, rel, cases };
      }),
    ).then((all) =>
      setNodes(
        all
          .filter((n) => n.cases.length > 0)
          .sort((a, b) => a.rel.localeCompare(b.rel)),
      ),
    );
  }, [rootPath, files]);

  useEffect(scan, [scan]);

  const total =
    nodes?.reduce(
      (n, f) => n + f.cases.filter((c) => c.kind !== "describe").length,
      0,
    ) ?? 0;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <FlaskConical className="size-4 text-muted-foreground" />
          <h1 className="text-sm font-semibold text-foreground">Tests</h1>
          {nodes && (
            <span className="text-xs text-muted-foreground">
              {total} in {nodes.length} Dateien
            </span>
          )}
          <button
            type="button"
            onClick={scan}
            title="Neu scannen"
            className="ml-auto flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>
        {!nodes ? (
          <div className="flex items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Scanne Testdateien…
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-foreground/[0.04] px-3 py-4 text-xs text-muted-foreground">
            <CircleDashed className="size-4" />
            Keine Tests gefunden (`*.test.*` / `*.spec.*`).
          </div>
        ) : (
          <div className="space-y-0.5">
            {nodes.map((n) => (
              <FileGroup key={n.path} node={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
