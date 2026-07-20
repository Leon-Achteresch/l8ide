import { isPageTab, useWorkspaceStore } from "@/lib/workspace-store";

export type SlashCommand = {
  name: string;
  description: string;
  build: (rest: string) => string;
  attachActiveFile: boolean;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "explain",
    description: "Aktive Datei erklären",
    build: (r) =>
      `Erkläre ${r ? r : "die angehängte Datei"} kompakt: Zweck, Aufbau, nicht offensichtliche Details.`,
    attachActiveFile: true,
  },
  {
    name: "fix",
    description: "Problem in der aktiven Datei beheben",
    build: (r) =>
      `Behebe folgendes Problem in der angehängten Datei und wende die Änderung an: ${r || "(beschreibe das Problem)"}`,
    attachActiveFile: true,
  },
  {
    name: "test",
    description: "Tests für die aktive Datei schreiben",
    build: () =>
      "Schreibe Tests für die angehängte Datei im hier üblichen Stil und lege sie als neue Datei an.",
    attachActiveFile: true,
  },
  {
    name: "review",
    description: "Aktive Datei reviewen",
    build: () =>
      "Reviewe die angehängte Datei auf Bugs, Logikfehler und Sicherheitsprobleme. Keine Stil-Nörgelei.",
    attachActiveFile: true,
  },
  {
    name: "refactor",
    description: "Aktive Datei umbauen",
    build: (r) =>
      `Refaktoriere die angehängte Datei: ${r || "verbessere Lesbarkeit und Struktur ohne Verhalten zu ändern"}. Wende die Änderung an.`,
    attachActiveFile: true,
  },
];

export type ParsedSlash = {
  text: string;
  attachActivePath: string | null;
};

export function parseSlash(input: string): ParsedSlash | null {
  const m = /^\/([a-z]+)\s*([\s\S]*)$/.exec(input.trim());
  if (!m) return null;
  const cmd = SLASH_COMMANDS.find((c) => c.name === m[1]);
  if (!cmd) return null;
  const activeFile = useWorkspaceStore.getState().activeFile;
  const attach =
    cmd.attachActiveFile && activeFile && !isPageTab(activeFile)
      ? activeFile
      : null;
  return { text: cmd.build(m[2].trim()), attachActivePath: attach };
}
