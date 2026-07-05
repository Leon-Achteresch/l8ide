# Was aus Open-Source für die l8ide-KI-Integration übernehmbar ist

Recherche über Aider, Cline, Roo-Code, Continue.dev, Void, OpenHands, Zed, opencode, gptme.
Bezug: die drei Bench-Achsen aus `docs/AI_INTEGRATION_BENCH.md` (Prompt / Tools / Edit-Format).

## Fazit vorweg

**Ja — und viel.** Zwei Kernaussagen:

1. **Die Bench-Befunde sind Industriekonsens.** Die ganze Branche ist weg von verbose-XML-Prompts hin zu **kurzen native-Regeln** gewandert (Cline & Roo bauten beide um), nutzt **kleine native-function-calling-Toolsets** (Cline v4 = 9 Tools) und behandelt das **Edit-Format als DEN Reibungspunkt**. Meine Messung stimmt mit dem überein, wozu die Projekte durch Praxis konvergiert sind.
2. **Mein größter Schmerzpunkt (5% Edit-Mismatch) ist mehrfach fertig gelöst** und liegt Apache-2.0/MIT-lizenziert zum Kopieren bereit.

## Edit-Format — die wichtigste Übernahme (löst die 5%-Mismatch-Rate)

Vier komplementäre, erprobte Ansätze. Reihenfolge = Empfehlung für l8ide:

1. **Cline-Diff-Engine — direkt liften (Apache-2.0).**
   `constructNewFileContentV1` aus [`cline/cline@v3.50.0/src/core/assistant-message/diff.ts`](https://github.com/cline/cline/blob/v3.50.0/src/core/assistant-message/diff.ts). ~470 Zeilen, **dependency-frei**, TypeScript, streaming-fähig. Deterministische Matching-Kaskade: `exact indexOf` → **`lineTrimmedFallbackMatch`** (Zeilenvergleich nach `.trim()`, fängt Einrückungs-/Whitespace-Drift) → **`blockAnchorFallbackMatch`** (erste+letzte Zeile als Anker, Mitte ignoriert; nur ≥3 Zeilen). Regex-tolerante Marker (akzeptiert alte und neue Marker-Varianten). Lokale Kopie zum Draufschauen: `scratchpad/cline-diff.ts`.
2. **Aiders Whitespace-Trick + Retry-Loop ergänzen (Apache-2.0).**
   [`aider/coders/editblock_coder.py`](https://github.com/Aider-AI/aider/blob/main/aider/coders/editblock_coder.py): `match_but_for_leading_whitespace` (uniformer Indent-Offset wird erkannt und beim Einsetzen wieder aufaddiert) und vor allem der **LLM-Retry-Loop** — bei Fehlmatch strukturierte „did you mean?"-Meldung via `find_similar_lines` zurück ans Modell statt stillem Scheitern. Das fängt die Rest-Fehler nach der Kaskade. Aider hat automatisches Levenshtein-Fuzzy **bewusst deaktiviert** (zu riskant) — gute Leitplanke.
3. **Roos `:start_line:`-Hint davorschalten (Apache-2.0).**
   [`Roo-Code/src/core/diff/strategies/multi-search-replace.ts`](https://github.com/RooCodeInc/Roo-Code/blob/main/src/core/diff/strategies/multi-search-replace.ts) verlangt im SEARCH-Block eine Zeilennummer als Anker. Monaco liefert Zeilennummern ohnehin → billiger Extra-Anker, reduziert Fehlmatches weiter.
4. **opencodes 9-stufige Replacer-Kaskade (MIT) — nur bei Restfehlern.**
   [`sst/opencode`](https://github.com/sst/opencode): Simple → LineTrimmed → BlockAnchor → Levenshtein → WhitespaceNorm → … → ContextAware. Stärkste deterministische Mitigation, aber Overkill für v1.

**Alternativ statt Search-Replace — Streaming-Diff (löst das Problem durch Vermeidung):**
- **Void — der Monaco-native Fund (Apache-2.0).** [`voideditor/void`](https://github.com/voideditor/void): ein einziger `editCodeService` schreibt LLM-Tokens live per `model.applyEdits` ins **echte Monaco-`ITextModel`**, Rot/Grün per Inline-Decorations, `findDiffs()` pro Tick. Cmd+K, Chat-Apply und Edit-Tool laufen alle durch dieselbe DiffZone. Dateien: `browser/editCodeService.ts`, `browser/helpers/findDiffs.ts`, `common/helpers/extractCodeFromResult.ts`. **Weil l8ide selbst Monaco nutzt, ist das die konkret am direktesten übernehmbare Codebasis des ganzen Vergleichs** für die Apply-UI.
- **Continue `streamDiffLines.ts` (Apache-2.0).** [`continuedev/continue/core/edit/streamDiffLines.ts`](https://github.com/continuedev/continue/blob/main/core/edit/streamDiffLines.ts): editor-agnostischer async-Generator von `DiffLine{line, type:'old'|'new'|'same'}`. Host rendert — passt auf Monaco-Decorations.
- **Fast-Apply-Modell als Fallback** (gptme `morph`, Cursor-Muster, Continue apply-role): separates schnelles Modell erzeugt den finalen Diff, wenn die Kaskade scheitert. Dritte Stufe hinter Kaskade + Retry.

## Tools — kleines native Set (bestätigt „klein schlägt groß")

- **Vorlage: Cline v4, 9 Tools, native function-calling** ([`sdk/packages/core/src/extensions/tools/definitions.ts`](https://github.com/cline/cline/blob/main/sdk/packages/core/src/extensions/tools/definitions.ts)): `read_files`, `search_codebase`, `run_commands`, `fetch_web_content`, `apply_patch`, `editor`, `skills`, `ask_question`, `submit_and_exit`. Deckt sich mit meiner „~5 aufgabenscharfe Tools"-Empfehlung.
- **Muster: Continues `definitions/` ↔ `implementations/` ↔ `policies/`-Split** ([`core/tools/`](https://github.com/continuedev/continue/tree/main/core/tools)) — Schema, Logik, Permissions getrennt; Implementierungen sind dünne Wrapper ums Host-Interface.
- **Nicht kopieren:** Roos ~22 Tools (widerspricht der These; sie filtern per Modus, damit das Modell nie alles sieht). Tool-*Texte* von Roo sind gute Formulierungsvorlagen, die *Menge* nicht.
- **`search`-Split:** die Prompt-Leaks zeigen bewusst zwei Such-Tools (semantisch + literal/grep). Da mein Bench `search` als die wertvollste Ergänzung fand: literal-grep zuerst, semantisch optional später.

## Prompt — kurze Regeln, modular zusammengesetzt (bestätigt den Bench)

- **Roos modularer Section-Aufbau** ([`src/core/prompts/sections/`](https://github.com/RooCodeInc/Roo-Code/tree/main/src/core/prompts/sections)): `tool-use`, `rules`, `capabilities`, `objective`, `system-info` — per Modus zusammengesetzt. Roos `tool-use.ts` sagt explizit „nutze native tool-calling, kein XML".
- **Zeds conditional Prompt-Assembly** (Handlebars, GPL → nur als Muster lesen): Regeln erscheinen **nur wenn das zugehörige Tool aktiv ist**. Exakt mein „kurzer aufgabenscharfer Prompt gewinnt".
- **Aiders Format-Regelliste wörtlich, Prosa weglassen:** die nummerierte SEARCH/REPLACE-Regelliste + „EXACTLY MATCH / only code in blocks"-Constraints aus [`editblock_prompts.py`](https://github.com/Aider-AI/aider/blob/main/aider/coders/editblock_prompts.py) sind die wertvollen 10 Zeilen; Aiders Wiederholungen/Beispieldialoge (Kompatibilitätssteuer für schwache Modelle) sind für ein starkes Zielmodell unnötig.

## Weitere übernehmbare Bausteine

- **Host-Vertrag: Continues `IDE`-Interface** ([`core/index.d.ts`](https://raw.githubusercontent.com/continuedev/continue/main/core/index.d.ts)) — ~50 Methoden (File-Ops, Editor-State, Terminal, Suche, LSP, Git, `showDiff`). Eine fertige, durchdachte Abstraktion genau der Monaco/xterm/Tauri-Primitive von l8ide. Als eigenen Host-Vertrag übernehmen; die volle `Core`-Klasse + 3-Protokoll-Messenger NICHT (auf VS-Code-Webview-Split zugeschnitten).
- **LLM-Abstraktion: Continues `core/llm/`** (ILLM + Provider-Adapter) — sauber gekapselt, kopierbar. (l8ide nutzt OpenRouter → ein Provider reicht evtl.)
- **Context: Roos `environment_details`-Muster** ([`getEnvironmentDetails.ts`](https://github.com/RooCodeInc/Roo-Code/blob/main/src/core/environment/getEnvironmentDetails.ts)) — pro Request injiziert: offene Tabs, Terminals+letzter Befehl, geänderte Dateien, Git-Status. 1:1 auf l8ides vorhandene Tabs/xterm/Git übertragbar. Plus `@file`/`@problems`/`@terminal`-Mentions-Auflösung.
- **History-Kompression: Roos LLM-Condense** (`src/core/condense/`) und **OpenHands' `Condenser`-Event** — nicht-destruktive Zusammenfassung statt Sliding-Window. Für v1 optional (Kosten/Komplexität); simples Truncation reicht zunächst.
- **Zed Zeta (Apache-2.0 Modell + Dataset)** — Edit-Prediction als „Edit-History-`events` → Region-Rewrite" statt FIM. Modell und Dataset offen nutzbar, falls autocomplete/edit-prediction später ein Thema wird.

## Lizenz-Übersicht

| Projekt | Lizenz | Übernahme | Auflage |
|---|---|---|---|
| Aider | Apache-2.0 | Code + Algo-Port | LICENSE-Kopie + Attribution |
| Cline | Apache-2.0 | Code (diff.ts direkt) | LICENSE-Kopie + Copyright-Header behalten |
| Roo-Code | Apache-2.0 | Code | wie Cline |
| Continue.dev | Apache-2.0 | Code (`core/*`) | Header + NOTICE prüfen |
| Void | Apache-2.0 | Code (editCodeService) | LICENSE-Kopie + Attribution |
| OpenHands | MIT | Code/Muster | Copyright-Vermerk |
| opencode | MIT | Code (Replacer) | Copyright-Vermerk |
| gptme | MIT | Muster | Copyright-Vermerk |
| Zed (Repo/Prompts) | **GPL-3.0** | **nur lesen/Muster** | nicht verbatim kopieren |
| Zed Zeta (Modell/Dataset) | Apache-2.0 | direkt nutzbar | Attribution |
| Prompt-Leaks (x1xhlol etc.) | GPL/CC0/none | **nur Muster lernen** | Vendor-IP, nie verbatim (DMCA-Grauzone) |

Praktisch: übernommene Datei-Header behalten, eine `THIRD_PARTY_LICENSES`/`NOTICE`-Datei mit den Apache/MIT-Vermerken anlegen, LICENSE-Kopien beilegen. Kein Copyleft bei Apache/MIT → l8ide bleibt proprietär möglich. **Zed-Repo und Prompt-Leaks nur als Ideengeber, nie Code/Text 1:1.**

## Konkrete Shortlist (in Reihenfolge)

1. **Cline `constructNewFileContentV1` nach TS liften** → löst die 5%-Mismatch-Rate. Dependency-frei, ein Tag Arbeit.
2. **Aider-Retry-Loop** (`find_similar_lines` → Fehlermeldung ans Modell) dahinter.
3. **Void `editCodeService`-Muster** für die Streaming-Apply-UI in Monaco.
4. **Continues `IDE`-Interface** als Host-Vertrag adaptieren.
5. **Cline-v4-9-Tool-Set** + native function-calling als Tool-Vorlage.
6. **Roo `environment_details`** fürs Kontext-Muster.
7. Prompt: kurze modulare Regel-Sections (Roo-Stil), Aiders Format-Regelliste wörtlich.
