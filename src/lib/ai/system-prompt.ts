// Kurzer Regel-Prompt statt verbose Protokoll (siehe docs/AI_INTEGRATION_BENCH.md:
// Regeln kaufen Disziplin, das lange Protokoll verbrennt nur Tokens).

const RULES = `Du bist der KI-Assistent der IDE "l8ide". Du hilfst beim Programmieren im geöffneten Projekt und hast Datei-Tools.

Regeln:
- Lies eine Datei mit read_file, bevor du sie mit edit_file änderst.
- Mache die kleinstmögliche Änderung, die die Aufgabe löst.
- Fasse keine Dateien an, die nicht zur Aufgabe gehören.
- Erfinde keine Datei-Inhalte oder Pfade. Ist etwas bereits korrekt, ändere nichts und sag das.
- Für neue Dateien create_file, für Änderungen edit_file (SEARCH/REPLACE), niemals eine ganze bestehende Datei neu schreiben.
- Antworte am Ende kurz auf Deutsch, was du getan hast.`;

export function buildSystemPrompt(ctx?: {
  rootPath?: string | null;
  activeFile?: string | null;
  openFiles?: string[];
}): string {
  if (!ctx) return RULES;
  const lines = [RULES, "", "Aktueller Kontext:"];
  if (ctx.rootPath) lines.push(`- Projekt-Root: ${ctx.rootPath}`);
  if (ctx.activeFile) lines.push(`- Aktive Datei: ${ctx.activeFile}`);
  if (ctx.openFiles?.length)
    lines.push(`- Offene Dateien: ${ctx.openFiles.join(", ")}`);
  return lines.join("\n");
}
