# AI-Integration Bench für l8ide

Zwei Benchmarks über OpenRouter (free + günstige Modelle) zur Frage: **Welches Modell und welche
Tool-/Prompt-Architektur baut die beste KI-Integration in diese IDE?**

Gesamtkosten beider Läufe: **$0.46** von $5 Budget.
Reproduzierbar: `node scripts/ai-bench.mjs` (Phase 1) und `node scripts/ai-agent-bench.mjs` (Phase 2).

## Phase 1 — Screening (142 Modelle)

Schneller Filter: 3× Tool-Usage (Call absetzen, richtiges Tool + Args wählen, Tool-Ergebnis verwerten),
3× Qualität (JSON-Extraktion, Code-Tracing, Formattreue). Alles regex-verifiziert, kein LLM-Judge.

- 142 Modelle mit Tool-Support getestet, **59 schaffen ≥5.5/6**, davon 7 free.
- Report: `scripts/ai-bench-report.md`, Rohdaten: `scripts/ai-bench-results.json`.

## Phase 2 — Agentischer IDE-Bench (200 Runs)

Echte Tool-Loop gegen ein Mock-Repo (8 Dateien). Der Agent bekommt eine Aufgabe und `list_files` /
`read_file` / `edit_file` etc., wir führen die Tool-Calls real aus und verifizieren das Endergebnis
programmatisch. 5 Szenarien: **bugfix, feature, refactor, explore, constraint** (letzteres testet, ob
das Modell *nur* die erlaubten Dateien anfasst).

Ablauf: 16 Kandidaten aus Phase 1 → Screening auf allen 5 Szenarien → Top-6 durch die Config-Matrix.

### Wichtigste Erkenntnis: Phase-1-Score ≠ agentische Tauglichkeit

Modelle mit **6/6** im Quick-Test streuen agentisch von **0/5 bis 5/5**:
- `openai/gpt-oss-safeguard-20b`: 6/6 in Phase 1 → **0/5** agentisch (verweigert Datei-Edits).
- `qwen/qwen3-vl-30b-a3b-instruct`: 6/6 → 3.5/5.
- `arcee-ai/trinity-large-thinking`: 6/6 → 2/5 (gibt zu früh auf, 2.4 Calls Ø).

→ **Isolierte Tool-Call-Tests sagen nichts über Multi-Turn-Agentik. Immer agentisch benchen.**

### Config-Matrix (Top-6 Modelle, je 30 Runs)

| Config | Was variiert | Score | Ø Runden | Invalid Calls | Ø Input-Tok | Fazit |
|---|---|---|---|---|---|---|
| **S0/small/sr** | Minimal-Prompt (1 Satz) | 100% | 5.2 | 0 | **3869** | schlankster Sieger |
| **S1/small/sr** | Regeln-Prompt (7 Zeilen) | 100% | 5.5 | 0 | 4896 | Referenz |
| S2/small/sr | Verbose Protokoll + Beispiel | 100% | 6.1 | 1 | **6937** | +79% Tokens, 0 Nutzen |
| S1/rich/sr | 10 Tools statt 3 | 97% | 4.9 | **4** | 5781 | Score-Einbruch + Fehlcalls |
| S1/small/full | `write_file` statt Search-Replace | 97% | 5.4 | 0 | 4492 | minimal schlechter |

Auf den starken Top-6 sättigt der *Erfolg* bei ~100% — das Signal steckt in Tokens / invaliden Calls /
Runden. Alle Abweichungen zeigen in **eine** Richtung:

1. **Minimaler System-Prompt gewinnt.** S0 (ein Satz) ist so erfolgreich wie das ausführliche S2-Protokoll,
   verbraucht aber **44% weniger Input-Tokens**. Das verbose Protokoll kaufte nur Tokens + 1 Fehlcall.
2. **Kleines Toolset schlägt großes.** Das rich-Set (10 Tools) verursachte die einzigen Score-Einbrüche
   und alle 4 Fehlcalls — die Modelle versuchten das (deaktivierte) `run_command` und `search_file`.
   Nur Tools anbieten, die zur Aufgabe gehören.
3. **Search-Replace ≈ Full-File-Write** auf kleinen Dateien; sr ist bei Output-Tokens leicht sparsamer.
   Auf großen Dateien gewinnt sr deutlicher (hier nicht getestet — ehrlicher Vorbehalt).

### Versteckte Qualitätsachse: invalide Tool-Calls

Erfolg ≠ Sauberkeit. Zwei Modelle lösen zwar alles, verschwenden aber massiv Calls:
- `inclusionai/ring-2.6-1t`: 5/5, aber **12 invalide Calls** (old_string-Mismatches).
- `openai/gpt-oss-120b`: 5/5, aber **6 invalide Calls**.

In einer echten IDE = mehr Latenz, mehr Kosten, mehr Fehler-Roundtrips. `edit_file` hat projektweit eine
Fehlerrate von ~5% (11/207 Calls, fast alle old_string-Mismatch) — das ist der Haupt-Reibungspunkt jeder
Search-Replace-Integration.

## Empfehlung für l8ide

**Architektur (modell-unabhängig):**
- System-Prompt **kurz** halten (Regeln, kein Roman, kein Few-Shot-Protokoll).
- Toolset **klein und aufgabenscharf** — `list_files`, `read_file`, `edit_file` (Search-Replace) als Kern.
  Extra-Tools nur dort einblenden, wo die Aufgabe sie braucht.
- `edit_file` robust bauen: klarer `old_string nicht gefunden`-Fehler + der Agent muss vorher `read_file`
  aufrufen. Die 5% Mismatch-Rate ist der Ort, an dem Integrationen brechen.

**Modellwahl (jeweils 5/5 agentisch, 0 invalide Calls):**

| Zweck | Modell | Warum |
|---|---|---|
| **Bestes P/L** | `xiaomi/mimo-v2.5` | 5/5, 0 invalid, wenigste Output-Tokens (497), ~$0.002/Run |
| **Zuverlässigster** | `openai/gpt-5.1-codex-mini` | 5/5, 0 invalid, wenigste Input-Tokens (2973), sehr stabil |
| **Schnell/günstig** | `minimax/minimax-m3` | 5/5, 0 invalid, nur 4.4 Runden Ø |
| **Free** | `poolside/laguna-xs-2.1:free` | 5/5, $0 — aber free-Tier ist rate-limitiert/flaky, nur für Dev |

Für Produktion `mimo-v2.5` oder `gpt-5.1-codex-mini`. Free-Modelle (`nemotron-3-super-120b:free` etc.)
funktionieren, waren aber unter Last mit HTTP 429 / leeren Responses unzuverlässig — nur zum Entwickeln.
