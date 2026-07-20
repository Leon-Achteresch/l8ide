let registry: Record<string, () => void> = {};

const USAGE_KEY = "l8-command-usage";

function loadUsage(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function setCommandRegistry(handlers: Record<string, () => void>) {
  registry = handlers;
}

export function recordCommandUsage(id: string) {
  const usage = loadUsage();
  usage[id] = (usage[id] ?? 0) + 1;
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
    // storage full or unavailable — usage tracking is best-effort
  }
}

export function topCommands(limit: number): string[] {
  return Object.entries(loadUsage())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
}

export function runCommand(id: string) {
  recordCommandUsage(id);
  registry[id]?.();
}
