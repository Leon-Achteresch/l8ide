# VS-Code-Editor: Quellcode-Abgleich für L8IDE

Stand: 24. September 2026. Verglichen wurden VS Code
[`a61ce555`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c),
das hier installierte `monaco-editor@0.55.1` und die Implementierung in `src/`.
Diese Datei ist ein Quellcode-Inventar und eine Arbeitsgrundlage, keine Behauptung
vollständiger Funktionsgleichheit. Der bestehende [Feature-Katalog](FEATURES.md)
beschreibt bereits zahlreiche umgesetzte Funktionen, aber seine Häkchen sind
keine automatisierte Paritätsprüfung.

## Was bereits aus demselben Editor-Code stammt

VS Code trennt den eigentlichen Editor (`src/vs/editor`) von den Beiträgen der
Workbench (`src/vs/workbench`). Laut [Quellcode-Organisation](https://github.com/microsoft/vscode/wiki/Source-Code-Organization)
werden `vs/editor/contrib`-Beiträge sowohl im VS-Code-Editor als auch im
Standalone-Editor verwendet. Ein Verzeichnisvergleich ergab: Alle 59
Top-Level-Beiträge aus
[`src/vs/editor/contrib`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/editor/contrib)
sind unter `node_modules/monaco-editor/esm/vs/editor/contrib` vorhanden.
Das sagt etwas über vorhandenen Code, nicht darüber, ob jede Aktion in L8IDE
gleich konfiguriert ist oder ihre benötigten Dienste erhält.

| Editor-Familie | Beiträge im VS-Code-Repository | Stand in L8IDE |
| --- | --- | --- |
| Bearbeiten und Cursor | `multicursor`, `linesOperations`, `wordOperations`, `wordPartOperations`, `caretOperations`, `cursorUndo`, `smartSelect`, `linkedEditing`, `comment`, `indentation`, `snippet` | Monaco-Kern eingebunden; Optionen und eigene Befehle ergänzen ihn. |
| Suchen und Navigation | `find`, `gotoSymbol`, `gotoError`, `links`, `peekView`, `documentSymbols`, `quickAccess`, `wordHighlighter` | Monaco-Aktionen sowie eigene Projekt-Navigation, Breadcrumbs und Outline. |
| IntelliSense | `suggest`, `parameterHints`, `hover`, `inlayHints`, `inlineCompletions`, `codeAction`, `codelens`, `semanticTokens`, `rename` | Monaco-Oberfläche mit eigenen TS-Worker- und Projekt-Providern; Abdeckung hängt von der Sprache und verfügbaren Projektdateien ab. |
| Anzeige | `bracketMatching`, `folding`, `stickyScroll`, `colorPicker`, `unicodeHighlighter`, `sectionHeaders`, `fontZoom` | Monaco-Optionen in `src/lib/editor-settings.ts`; weitere UI in `src/components/file-editor.tsx`. |
| Diff und Eingabe | `diffEditorBreadcrumbs`, `dropOrPasteInto`, `clipboard`, `toggleTabFocusMode`, `readOnlyMessage` | Monaco-Bausteine vorhanden; VS-Code-Workbench-Dienste für spezielle Datei- und Clipboard-Aktionen sind gesondert zu prüfen. |

Die [Monaco-FAQ](https://github.com/microsoft/monaco-editor/blob/main/README.md#faq)
bestätigt: Monaco wird aus VS-Code-Quellen gebaut, lädt aber VS-Code-Erweiterungen
nicht direkt. Genau gleiche Editor-Semantik für jede Sprache setzt deshalb
zusätzliche Sprachdienste, Konfiguration und gegebenenfalls eine
Erweiterungs-Laufzeit voraus.

## Editor-Funktionen, die VS Code zusätzlich in der Workbench liefert

In
[`vs/workbench/contrib/codeEditor/browser`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/codeEditor/browser)
liegen unter anderem `saveParticipants.ts`, `largeFileOptimizations.ts`,
`inspectEditorTokens.ts`, `editorLineNumberMenu.ts`, `toggleColumnSelection.ts`,
`toggleOvertype.ts` und Schalter für Minimap, Word Wrap, Whitespace und
Multi-Cursor-Modifier. Das sind zusätzliche Integrationen um den Editor herum.
L8IDE hat für mehrere davon eigene Lösungen, aber kein systematischer
Verhaltenstest gegen VS Code liegt vor.

Weitere relevante Workbench-Quellen:

| VS-Code-Quelle | Funktion | Beobachtete Lücke in L8IDE |
| --- | --- | --- |
| [`typeHierarchy`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/typeHierarchy) | Ober-/Untertypen als Peek und Baum | Im Katalog offen; kein Type-Hierarchy-Provider gefunden. |
| [`codeEditor`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/codeEditor) | Workbench-Aktionen und Editor-Dienste | Nur einzelne Funktionen in L8IDE nachgebaut; Befehle und Einstellungen brauchen einen Einzelabgleich. |
| [`format`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/format) und [`codeActions`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/codeActions) | Formatter-Auswahl, Save-Aktionen, Quick Fixes | Prettier/Biome/ESLint/TS sind integriert; fremde Extension-Provider fehlen. |
| [`snippets`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/snippets) und [`languageDetection`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/languageDetection) | Snippet-Verwaltung und Sprachwahl | Eigene Snippets vorhanden; Sprach-Erkennung/-Umschaltung gesondert prüfen. |
| [`accessibility`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/accessibility) und [`accessibilitySignals`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/accessibilitySignals) | Accessible Views, Hilfe und Signale | Im Katalog überwiegend offen. |
| [`mergeEditor`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/mergeEditor) und [`multiDiffEditor`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib/multiDiffEditor) | Drei-Wege-Merge und Mehrdatei-Diff | Im Katalog offen; vorhandene Vergleiche nutzen Monaco DiffEditor. |

Daneben enthält
[`vs/workbench/contrib`](https://github.com/microsoft/vscode/tree/a61ce5554c7c573af1a80bedfd5a1c379680258c/src/vs/workbench/contrib)
eigene Module für Debugging, Testing, Tasks, Terminal, SCM, Suche, Notebooks,
Remote-Entwicklung, Chat und Erweiterungen. Diese gehören zur IDE als Ganzes,
nicht zu Monaco allein. Der Katalog in `FEATURES.md` hält die Lücken in diesen
Bereichen fest.

## Nächste überprüfbare Schritte zur Editor-Parität

1. Für jede unterstützte Sprache eine Vergleichsdatei in VS Code und L8IDE
   öffnen und Completion, Hover, Definition, Referenzen, Rename, Code Actions,
   Formatierung, Diagnostics und semantische Tokens prüfen. TS/JS, HTML, CSS,
   JSON und Markdown zuerst; weitere Sprachen danach.
2. Fehlende Workbench-Editor-Funktionen einzeln implementieren, beginnend mit
   Type Hierarchy und den prüfbaren Editor-Aktionen aus `codeEditor/browser`.
3. Sprachserver- und Erweiterungsstrategie festlegen. Ohne diese Architektur
   kann L8IDE die von Extensions gelieferten Sprachfunktionen nicht 1:1 bieten.
4. Eine versionierte Verhaltensmatrix mit konkreten Testfällen pflegen; ein
   Verzeichnisvergleich allein genügt nicht als Abnahmekriterium.

Die Quelle für die Bestandsaufnahme ist der oben fixierte VS-Code-Commit.
Bei einem VS-Code-Update sollten die Verzeichnisse und Verhaltensfälle erneut
verglichen werden.
