import { invoke } from "@tauri-apps/api/core";
import { exists, readTextFile } from "@tauri-apps/plugin-fs";
import { create } from "zustand";
import { useWorkspaceStore } from "@/lib/workspace-store";

type ShellResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  timed_out: boolean;
};

export type Dependency = {
  name: string;
  declared: string;
  installed: string | null;
  dev: boolean;
  latest?: string;
  outdated?: boolean;
};

async function installedVersion(
  root: string,
  name: string,
): Promise<string | null> {
  const pkg = `${root}/node_modules/${name}/package.json`;
  if (!(await exists(pkg).catch(() => false))) return null;
  try {
    return (JSON.parse(await readTextFile(pkg)) as { version?: string })
      .version ?? null;
  } catch {
    return null;
  }
}

export async function loadDependencies(root: string): Promise<Dependency[]> {
  const path = `${root}/package.json`;
  if (!(await exists(path).catch(() => false))) return [];
  let json: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    json = JSON.parse(await readTextFile(path));
  } catch {
    return [];
  }
  const entries: Dependency[] = [];
  for (const [name, declared] of Object.entries(json.dependencies ?? {})) {
    entries.push({ name, declared, dev: false, installed: null });
  }
  for (const [name, declared] of Object.entries(json.devDependencies ?? {})) {
    entries.push({ name, declared, dev: true, installed: null });
  }
  await Promise.all(
    entries.map(async (e) => {
      e.installed = await installedVersion(root, e.name);
    }),
  );
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

export async function checkOutdated(
  root: string,
): Promise<Record<string, { latest: string }>> {
  const res = await invoke<ShellResult>("run_shell", {
    cwd: root,
    command: "npm outdated --json || true",
    timeoutMs: 60000,
  }).catch(() => null);
  if (!res?.stdout.trim()) return {};
  try {
    const json = JSON.parse(res.stdout) as Record<string, { latest?: string }>;
    const out: Record<string, { latest: string }> = {};
    for (const [name, info] of Object.entries(json)) {
      if (info.latest) out[name] = { latest: info.latest };
    }
    return out;
  } catch {
    return {};
  }
}

export type AuditSummary = {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  total: number;
};

export async function runAudit(root: string): Promise<AuditSummary | null> {
  const res = await invoke<ShellResult>("run_shell", {
    cwd: root,
    command: "npm audit --json || true",
    timeoutMs: 60000,
  }).catch(() => null);
  if (!res?.stdout.trim()) return null;
  try {
    const json = JSON.parse(res.stdout) as {
      metadata?: { vulnerabilities?: Record<string, number> };
    };
    const v = json.metadata?.vulnerabilities ?? {};
    return {
      critical: v.critical ?? 0,
      high: v.high ?? 0,
      moderate: v.moderate ?? 0,
      low: v.low ?? 0,
      total: v.total ?? 0,
    };
  } catch {
    return null;
  }
}

type DepDashboardStore = {
  deps: Dependency[];
  loading: boolean;
  checking: boolean;
  auditing: boolean;
  audit: AuditSummary | null;
  load: () => Promise<void>;
  runOutdated: () => Promise<void>;
  runSecurityAudit: () => Promise<void>;
};

export const useDepDashboard = create<DepDashboardStore>()((set) => ({
  deps: [],
  loading: false,
  checking: false,
  auditing: false,
  audit: null,
  runSecurityAudit: async () => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    set({ auditing: true });
    set({ audit: await runAudit(root), auditing: false });
  },
  load: async () => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    set({ loading: true });
    set({ deps: await loadDependencies(root), loading: false });
  },
  runOutdated: async () => {
    const root = useWorkspaceStore.getState().rootPath?.replace(/\/+$/, "");
    if (!root) return;
    set({ checking: true });
    const latest = await checkOutdated(root);
    set((s) => ({
      checking: false,
      deps: s.deps.map((d) =>
        latest[d.name]
          ? { ...d, latest: latest[d.name].latest, outdated: true }
          : { ...d, outdated: false },
      ),
    }));
  },
}));
