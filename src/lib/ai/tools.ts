import { applyDiff, DiffError } from "./edit-engine.ts";

export interface WorkspaceFs {
  list(): Promise<string[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  search(query: string): Promise<string>;
}

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const str = (description: string) => ({ type: "string", description });

// Kleines, aufgabenscharfes Set (siehe docs/AI_INTEGRATION_BENCH.md): mehr Tools
// kosten nur Tokens. `search` ist die einzige Ergänzung mit Qualitätsnutzen.
export const TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Listet alle Dateipfade im Workspace (relativ zum Projekt-Root).",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Liest den vollständigen Inhalt einer Datei.",
      parameters: {
        type: "object",
        properties: { path: str("Pfad relativ zum Projekt-Root") },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description:
        "Sucht einen Text in allen Dateien und liefert Treffer als 'pfad:zeile: inhalt'.",
      parameters: {
        type: "object",
        properties: { query: str("Zu suchender Text") },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Ändert eine bestehende Datei über einen oder mehrere SEARCH/REPLACE-Blöcke. " +
        "Lies die Datei vorher mit read_file. Der SEARCH-Text muss exakt (inkl. Einrückung) " +
        "existieren. Format je Block:\n" +
        "------- SEARCH\n[exakter bestehender Text]\n=======\n[neuer Text]\n+++++++ REPLACE",
      parameters: {
        type: "object",
        properties: {
          path: str("Pfad relativ zum Projekt-Root"),
          diff: str("Ein oder mehrere SEARCH/REPLACE-Blöcke"),
        },
        required: ["path", "diff"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Legt eine neue Datei mit dem angegebenen Inhalt an.",
      parameters: {
        type: "object",
        properties: {
          path: str("Pfad relativ zum Projekt-Root"),
          content: str("Vollständiger Dateiinhalt"),
        },
        required: ["path", "content"],
      },
    },
  },
];

export type ToolArgs = Record<string, unknown>;

/**
 * Führt einen Tool-Call gegen das injizierte Workspace-FS aus und liefert das
 * Ergebnis als String zurück (auch Fehler werden als Text zurückgegeben, damit
 * das Modell sie im nächsten Schritt korrigieren kann — Aider-Retry-Muster).
 */
export async function executeTool(
  name: string,
  args: ToolArgs,
  fs: WorkspaceFs,
): Promise<string> {
  try {
    switch (name) {
      case "list_files": {
        const files = await fs.list();
        return files.length ? files.join("\n") : "(leerer Workspace)";
      }
      case "read_file": {
        const path = String(args.path ?? "");
        if (!path) return "FEHLER: 'path' fehlt.";
        if (!(await fs.exists(path))) return `FEHLER: Datei nicht gefunden: ${path}`;
        return await fs.read(path);
      }
      case "search": {
        const query = String(args.query ?? "");
        if (!query) return "FEHLER: 'query' fehlt.";
        return await fs.search(query);
      }
      case "edit_file": {
        const path = String(args.path ?? "");
        const diff = String(args.diff ?? "");
        if (!path || !diff) return "FEHLER: 'path' und 'diff' sind erforderlich.";
        if (!(await fs.exists(path)))
          return `FEHLER: Datei nicht gefunden: ${path}. Für neue Dateien create_file benutzen.`;
        const original = await fs.read(path);
        try {
          const updated = applyDiff(original, diff);
          await fs.write(path, updated);
          return `OK: ${path} geändert.`;
        } catch (e) {
          if (e instanceof DiffError) return `FEHLER beim Anwenden: ${e.message}`;
          throw e;
        }
      }
      case "create_file": {
        const path = String(args.path ?? "");
        const content = String(args.content ?? "");
        if (!path) return "FEHLER: 'path' fehlt.";
        await fs.write(path, content);
        return `OK: ${path} erstellt.`;
      }
      default:
        return `FEHLER: unbekanntes Tool '${name}'.`;
    }
  } catch (e) {
    return `FEHLER: ${e instanceof Error ? e.message : String(e)}`;
  }
}
