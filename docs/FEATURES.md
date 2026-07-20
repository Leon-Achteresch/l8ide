# IDE Feature-Katalog

Referenz für l8ide: Teil 1 listet alle Features von Visual Studio Code detailliert auf, Teil 2 sammelt zusätzliche Features, die über VS Code hinausgehen und in eine moderne IDE eingebaut werden können.

***

# Teil 1: VS Code Features (vollständig)

## 1. Editor-Kern

### 1.1 Textbearbeitung

* [x] **Multi-Cursor-Editing**: Mehrere Cursor gleichzeitig (Alt+Klick, Cmd+D für nächstes Vorkommen, Cmd+Shift+L für alle Vorkommen)

* [x] **Spaltenauswahl / Box-Selection**: Rechteckige Textauswahl (Shift+Alt+Drag)

* [x] **Zeilenoperationen**: Zeile verschieben (Alt+↑/↓), duplizieren (Shift+Alt+↑/↓), löschen (Cmd+Shift+K), Zeilen joinen

* [x] **Smart Selection**: Auswahl semantisch erweitern/verkleinern (Shift+Alt+→/←)

* [x] **Auto-Closing**: Automatisches Schließen von Klammern, Anführungszeichen, Tags

* [x] **Auto-Surround**: Auswahl automatisch mit Klammern/Quotes umschließen

* [x] **Auto-Indentation**: Automatische Einrückung basierend auf Sprache

* [x] **Kommentar-Toggle**: Zeilen- (Cmd+/) und Blockkommentare (Shift+Alt+A)

* [x] **Groß-/Kleinschreibung transformieren**: Upper, Lower, Title, Snake, Kebab — Monaco-Aktionen über die Befehlspalette (Cmd+Shift+P)

* [x] **Sortieren von Zeilen**: Aufsteigend/absteigend über die Befehlspalette

* [x] **Whitespace-Handling**: Render Whitespace vorhanden; nachgestellte Leerzeichen entfernen über die Befehlspalette (`trimTrailingWhitespace`)

* [x] **Emmet**: Integrierte Abkürzungs-Expansion für HTML/CSS (z.B. `ul>li*5`)

* [x] **Column Edit Mode**: entspricht der Box-Selection (Shift+Alt+Drag) mit Multi-Cursor-Bearbeitung

* [x] **Undo/Redo mit Cursor-Historie**

### 1.2 Code-Intelligenz (IntelliSense)

* [x] **Completions**: Kontextabhängige Vorschläge (Wörter, Symbole, Snippets)

* [x] **Parameter Hints / Signature Help**: Anzeige von Funktionssignaturen beim Tippen

* [x] **Quick Info / Hover**: Typinformationen, Dokumentation, JSDoc beim Hovern

* [x] **Semantic Highlighting**: Einfärbung basierend auf Symbol-Semantik (nicht nur Syntax) — Custom-Worker (`getEncodedSemanticClassifications`) + eigener DocumentSemanticTokensProvider

* [x] **Inlay Hints**: Inline-Anzeige von Parameternamen und inferierten Typen

* [x] **Auto-Imports**: Unimportierte Projekt-Symbole erscheinen in der Completion (Quelle als Beschriftung, hinter lokalen Vorschlägen einsortiert); Auswahl fügt das Import-Statement automatisch ein — Custom-Worker `getImportCompletions`/`getImportCompletionDetails` + eigener CompletionItemProvider mit resolve (`auto-imports.ts`); node_modules-Symbole fehlen (nicht im Worker)

* [x] **Snippet-Support (eingebaut)**: Monaco-Snippets mit Tabstops und Platzhaltern

* [x] **Snippet-Support (benutzerdefiniert)**: Eigene Snippets (Prefix, Name, Sprache oder global, Body mit Tabstops/Platzhaltern) in Einstellungen → Snippets verwalten; erscheinen als Completion-Vorschläge (`user-snippets.ts`)

* [x] **Word-Based Suggestions**: Fallback-Vorschläge aus Dokumentinhalt

* [x] **Suggestion-Ranking**: Sortierung nach Relevanz, zuletzt genutzt, Lokalität

### 1.3 Navigation

* [x] **Go to Definition** (F12) und **Peek Definition** (Alt+F12, Inline-Vorschau)

* [x] **Go to Type Definition**

* [x] **Go to Implementation**: Monaco `goToImplementation` (Cmd+F12, Rechtsklick, Befehlspalette) über den TS-Language-Service

* [x] **Go to References / Find All References**: Monaco Referenz-Peek (Shift+F12, Rechtsklick, Befehlspalette)

* [x] **Go to Symbol in File** (Cmd+Shift+O): Monaco `quickOutline`, auch über die Befehlspalette

* [x] **Go to Symbol in Workspace** (Cmd+T): Quick-Open `#`-Modus, Symbole projektweit via TS-Worker `getNavigateToItems` (`workspace-symbols.ts`)

* [x] **Go to Line/Column**: Monaco `gotoLine` über die Befehlspalette

* [x] **Breadcrumbs**: Pfad-Segmente + Symbolkette an der Cursorposition über dem Editor, Symbol-Klick springt zur Stelle; abschaltbar in den Einstellungen (`breadcrumbs.tsx`, `symbolChainAt`)

* [x] **Outline-View**: Symbolbaum der aktuellen Datei in der Sidebar (eigener „Outline"-Tab), kollabierbar, Klick springt zur Stelle; Symbole via TS-Worker `getNavigationTree` (`outline.ts`, `outline-panel.tsx`)

* [x] **Bracket Matching + Jump to Bracket**

* [x] **Navigationshistorie**: Zurück/Vorwärts durch Cursor-Positionen (Ctrl+-/Ctrl+Shift+-, auch Befehlspalette); koalesziert nahe Positionen, dateiübergreifend (`nav-history.ts`, `nav-history-core.ts`)

* [ ] **Call Hierarchy**: Eingehende/ausgehende Aufrufe eines Symbols

* [ ] **Type Hierarchy**: Vererbungshierarchie

* [x] **Sticky Scroll**: Aktuelle Scope-Header bleiben oben kleben (Monaco `stickyScroll`, abschaltbar in den Einstellungen)

* [ ] **Minimap**: Verkleinerte Code-Übersicht mit Highlight-Markern (aktuell deaktiviert)

### 1.4 Refactoring

* [x] **Rename Symbol** (F2): Projektweites Umbenennen — Monaco-Inline-Rename (F2) plus „Umbenennen (Vorschau)" (Shift+F2) mit Diff-Prüfung

* [x] **Quick Fixes / Code Actions** (Cmd+.): TS/JS-Refactors + Organize Imports über eigenen CodeActionProvider

* [x] **Extract Method / Extract Function** — TS-Refactor, danach Inline-Rename des neuen Symbols

* [x] **Extract Variable / Constant** — TS-Refactor mit Scope-Auswahl

* [x] **Inline Variable/Function** (sprachabhängig) — TS-Refactor

* [x] **Move to New File** — legt Zieldatei an, korrigiert Importe, öffnet sie; auch per Rechtsklick → „In neue Datei verschieben" (Funktionen/Komponenten)

* [x] **Organize Imports**: Sortieren + ungenutzte entfernen (Shift+Alt+O)

* [x] **Auto Fix on Save**: Imports beim Speichern organisieren (in Einstellungen)

* [x] **Refactor-Preview**: Mehrdatei-Änderungen vorab in Side-by-Side-Diff prüfen, pro Datei an-/abwählbar

Umgesetzt via eigenem TypeScript-Worker (`ts.worker.ts`), der die TS-Language-Service-Refactorings (`getApplicableRefactors`, `getEditsForRefactor`, `organizeImports`) freilegt, die Monacos Stock-Worker nicht durchreicht.

### 1.5 Formatierung & Linting

* [x] **Format Document / Format Selection** (Prettier, Shift+Alt+F)

* [x] **Format on Save**

* [x] **Format on Paste / on Type** — Monaco-Editor-Optionen `formatOnPaste`/`formatOnType`, in den Einstellungen umschaltbar

* [x] **Formatter-Auswahl pro Sprache** (Default-Formatter-Setting) — pro Sprache Prettier oder „Kein" wählbar

* [x] **EditorConfig-Support** — `.editorconfig` (bis `root = true` aufgelöst) setzt die Einrückung im Editor und überschreibt Prettier (`tabWidth`, `useTabs`, `endOfLine`, `printWidth`)

* [x] **Diagnostics-Anzeige (Editor)**: Syntax-Fehler/Warnungen als Squiggles im Editor

* [x] **Diagnostics-Anzeige (Workbench)**: Problems-Panel, Explorer-Badges (Fehler/Warnungen pro Datei + Ordner), Dock-Button mit Zähler; Marker erscheinen in der Overview-Ruler (Minimap ist deaktiviert)

* [x] **Problems-Panel**: Filterbar (Text + Schweregrad), nach Datei gruppiert/einklappbar, Klick springt zur Stelle, Quick-Fix-Zugriff (Cmd+.)

Diagnostics-Quelle: Monaco-Marker (`onDidChangeMarkers`), gespiegelt in `markers-store.ts`: Syntax-, JSON-Schema-, tsc-Terminal- und semantische TS-Marker. Semantische Validierung ist aktiv (abschaltbar in den Einstellungen); Modul-Auflösungs-Codes (2307 u.a.) werden ignoriert, da node_modules-Typen nicht im Worker liegen.

### 1.6 Darstellung

* [x] **Syntax Highlighting** via Monaco-Grammatiken

* [x] **Semantic Token Highlighting**: Tree-Sitter-ähnliche semantische Token

* [x] **Bracket Pair Colorization**: Farbliche Klammernpaare + Guides

* [x] **Indent Guides** (aktive Einrückungsebene hervorgehoben)

* [x] **Code Folding**: Nach Einrückung oder Sprach-Regionen, Folding-Ranges, `#region`-Marker

* [x] **Word Wrap**: Konfigurierbar (Spaltenbreite, eingerückt)

* [x] **Zoom (Editor)**: Schriftgröße per Mod+/−/0

* [x] **Zoom (UI)**: Gesamte Workbench-Skalierung

* [x] **Font-Ligaturen-Support**

* [x] **Rulers**: Vertikale Hilfslinien bei definierten Spalten

* [x] **Render Line Highlight**: Aktuelle Zeile hervorheben

* [x] **Cursor-Stile & Animationen**: Block, Line, Underline, Blinken, Smooth Caret Animation

* [x] **Smooth Scrolling**

* [x] **Color Decorators**: Inline-Farbvorschau + Color Picker in CSS/etc.

* [x] **Unicode Highlighting**: Warnung vor verwechselbaren/unsichtbaren Zeichen

* [x] **Whitespace/Control-Character-Rendering**

## 2. Workbench / UI

### 2.1 Layout

* [ ] **Activity Bar**: Umschaltbare Haupt-Views (Explorer, Search, SCM, Debug, Extensions)

* [x] **Primary Sidebar**: Explorer und Suche, ein-/ausblendbar, resizable

* [ ] **Secondary Sidebar**: Zwei unabhängige Seitenleisten

* [x] **Panel (Terminal)**: Integriertes Terminal im unteren Bereich

* [ ] **Panel (Problems/Output/Debug)**: Weitere Panel-Views

* [x] **Editor-Gruppen**: Beliebige Splits (horizontal/vertikal), Grid-Layout

* [x] **Tabs**: Öffnen, Schließen, Pinning, Drag\&Drop, Umsortieren, Mod+1–9

* [x] **Preview-Tabs**: Kursiv dargestellt, Einzelklick verwendet den Preview-Tab wieder, Doppelklick/Bearbeiten fixiert ihn (`preview` pro Gruppe, `openPreview`/`promoteTab`)

* [ ] **Tab-Größenmodi & Wheel-Navigation**

* [x] **Zen Mode**: Ablenkungsfreier Vollbildmodus (Mod+Alt+Z, `view-store`)

* [x] **Centered Layout** (Mod+Alt+C, `view-store`)

* [x] **Fullscreen-Modus** (F11, Tauri `setFullscreen`)

* [x] **Neues App-Fenster**: Zweites Fenster via Tauri WebviewWindow

* [ ] **Floating/Detached Editor Windows**: Editoren in eigene OS-Fenster ziehen

* [x] **Panel-/Sidebar-Toggle** per Shortcut (Mod+B, Mod+J)

* [ ] **Custom Layout-Presets** (Customize-Layout-Kontrolle)

### 2.2 Kommando-Zugriff

* [x] **Command Palette** (Cmd+Shift+P / F1): Alle App-Befehle + Editor-Aktionen (Transform Case, Sortieren, Trim, Go to Line) durchsuchbar mit Shortcut-Anzeige (`command-palette.tsx`)

* [x] **Quick Open (Dateien)** (Cmd+P): Fuzzy-Dateisuche

* [x] **Quick Open (Modifikatoren)**: `@` Symbole (aktuelle Datei via Outline), `#` Workspace-Symbole, `:` Zeile, `?` Hilfe — im Cmd+P-Palette (`file-search.tsx`)

* [x] **Keyboard Shortcuts Editor**: GUI mit Overrides und Konflikterkennung

* [ ] **Keyboard Shortcuts (JSON, Chords, when-Klauseln)**

* [ ] **Keymap-Extensions**: Vim, Emacs, Sublime, IntelliJ-Emulation

### 2.3 Dateiverwaltung (Explorer)

* [x] **Dateibaum**: Erstellen, Umbenennen, Löschen, Drag\&Drop, Multi-Select

* [x] **Compact Folders**: Einzelne verschachtelte Ordner werden als `a/b/c` zusammengefasst (max. 12 Ebenen, respektiert ausgeblendete Namen; Aktionen wirken auf den tiefsten Ordner der Kette)

* [x] **File Nesting**: `.js`/`.d.ts`/`.js.map` unter `.ts`, `.jsx` unter `.tsx`, `.css.map` unter `.css`, Lockfiles unter `package.json`; Chevron erscheint beim Hover, Klick öffnet die Datei (`file-nesting.ts`, Test `test:nesting`)

* [x] **Datei-Dekorationen (Icons)**: Datei- und Ordner-Icons nach Typ

* [x] **Datei-Dekorationen (Git/Fehler)**: Git-Status färbt Datei-/Ordnernamen + Buchstaben-Badge (M/A/D/R/U/!), Fehler-Badges bestehen; Quelle `git-store` (`git-decorations.ts`, `git-status-letter.ts`)

* [x] **Open Editors-Sektion**: Einklappbare Liste aller offenen Tabs über alle Editor-Gruppen im Explorer (Gruppen-Labels bei Splits, aktiver Tab hervorgehoben, Hover-X schließt, Zustand persistiert; `open-editors.tsx`)

* [x] **Timeline-View**: ⌘⌥H zeigt Local-History-Snapshots + Git-Commits (`git log --follow`, max. 100) der Datei chronologisch gemischt, je mit Diff und Wiederherstellen (Restore sichert vorher; `git_file_log`, `local-history-dialog.tsx`)

* [x] **Local History**: Snapshot des alten Stands bei jedem Speichern (max. 20/Datei, ≤1MB, Dedupe), Dialog via ⌘⌥H mit Diff + Wiederherstellen — Restore sichert vorher den aktuellen Stand (`local-history.ts`, `local-history-dialog.tsx`)

* [x] **Layout-Persistenz**: Tabs, Gruppen und Sidebar-Zustand überleben Neustart

* [x] **Hot Exit (Inhalt)**: Ungespeicherte Inhalte werden 1s-debounced nach App-Data gesichert (≤1MB), beim Öffnen wiederhergestellt (mit Toast) und bei Speichern/Gleichstand aufgeräumt (`hot-exit.ts`)

* [x] **Auto Save**: afterDelay, ein-/ausschaltbar im Logo-Menü

* [x] **Große-Dateien-Handling**: TS/JS-Workspace-Sync begrenzt auf große Dateien

* [x] **Vergleich**: Explorer-Kontextmenü „Zum Vergleich auswählen“ + „Mit Ausgewähltem vergleichen“ und „Mit Zwischenablage vergleichen“; öffnet Monaco-DiffEditor (Inline/Nebeneinander) als `/compare/`-Tab (`file-compare.ts`, `file-compare-page.tsx`)

* [ ] **Readonly-Modus pro Datei/Glob**

* [x] **Zu .gitignore hinzufügen**: Kontextmenü schreibt Einträge in `.gitignore`

* [x] **Dateien/Ordner ausblenden**: Manuell per Name (global/workspace)

* [x] **`.git`** **standardmäßig ausblenden**

### 2.4 Suche

* [x] **Volltextsuche im Workspace** (ripgrep-basiert): Regex, Case, Whole Word

* [x] **Include/Exclude-Globs**

* [x] **Respektierung von** **`.gitignore`** in Workspace-Suche und Datei-Index

* [x] **`.gitignore`-Respektierung abschaltbar**: Schalter „.gitignore ignorieren" im Dateifilter-Bereich der Suche (`no_ignore` bis in den ripgrep-Walker durchgereicht)

* [ ] **`.gitignore`-Filter im Explorer** (aktuell nur manuelles Ausblenden)

* [x] **Search & Replace projektweit**: Replace All, pro Datei, einzeln

* [x] **Search & Replace mit Vorschau**: Diff-Button neben „Alle ersetzen" öffnet den Mehrdatei-Diff (pro Datei an-/abwählbar, Refactor-Preview-Infra) vor dem Anwenden; Regex-Capture-Groups ($1…) funktionieren, `$` in Nicht-Regex-Ersetzung ist escaped; Case-Preserving Replace fehlt

* [x] **Search Editor**: „Als Tab"-Button friert die Suchergebnisse als Editor-Tab ein (Query-Header, nach Datei gruppiert, Treffer-Highlighting, Klick springt zur Stelle; überlebt neue Suchen — `search-editor-store.ts`, `search-editor-page.tsx`); nicht editierbar

* [x] **Suche in geöffneten Editoren**: Toggle in der Such-Optionsleiste beschränkt die Suche auf die offenen Tabs aller Editor-Gruppen (als Include-Globs ans Backend gereicht, kombinierbar mit eigenen Filtern)

* [x] **Suchergebnis-Kontextzeilen**

* [x] **In-File-Suche** (Cmd+F) via Monaco

### 2.5 Personalisierung

* [x] **Color Themes**: Hell/Dunkel mit OS-Sync via next-themes

* [ ] **Color Themes (Marketplace)**: Installierbar, eigene definierbar

* [x] **File Icon Themes (Basis)**: Datei-/Ordner-Icons ein-/ausschaltbar

* [ ] **Product Icon Themes**

* [x] **Settings (GUI)**: Dark Mode, Icons, Hidden Files, Trust, Prettier

* [ ] **Settings (JSON & Ebenen)**: `settings.json`, User-/Workspace-/Folder-Ebenen, sprach-spezifische Settings

* [ ] **Settings Sync**: Einstellungen, Keybindings, Extensions, Snippets, UI-State über Geräte synchronisieren

* [ ] **Profiles**: Komplette Konfigurationsprofile (Settings + Extensions + Layout) pro Anwendungsfall, Import/Export, Templates

* [x] **Workspace Trust**: Restricted Mode für nicht vertrauenswürdige Ordner

* [x] **Custom Title Bar**: Tauri Overlay Title Bar

* [ ] **Lokalisierung**: UI in vielen Sprachen

## 3. Sprachen-Support

* [x] **Eingebaut (Basis)**: JavaScript, TypeScript, JSON, HTML, CSS via Monaco-Workers

* [ ] **Eingebaut (vollständig)**: Syntax für \~40 Sprachen

* [ ] **Language Server Protocol (LSP)**: Standardisierte Anbindung beliebiger Sprachserver

* [x] **TypeScript/JavaScript IntelliSense (Basis)**: Completions, Hover, Navigation, tsconfig-Sync

* [x] **TypeScript/JavaScript (vollständig)**: Refactorings ✓, semantische Validation ✓ (ohne node_modules-Typen, Modul-Codes ignoriert), Auto-Imports ✓ (Projekt-Symbole)

* [x] **Markdown-Vorschau**: Split-View mit Editor

* [ ] **Markdown (erweitert)**: Live gescrollt-synchronisiert, Linkvalidierung, Pfad-Completions, Mermaid

* [x] **JSON Schema-Validierung**: Schema Store mit Completions

* [x] **HTML/CSS (Basis)**: Tag-Completion und CSS-Worker via Monaco

* [ ] **HTML/CSS (erweitert)**: Color Picker, Specificity-Hover

* [ ] **Notebooks**: Jupyter-Notebook-UI nativ (Zellen, Kernels, Outputs, Variablen-Explorer via Extension)

## 4. Versionskontrolle (Git & SCM)

* [x] **Git-Integration nativ**: Stage, Unstage, Commit, Amend (Toggle im SCM-Panel), Push, Pull, Fetch, Discard mit Toast-Bestätigung (`scm-panel.tsx`, `git-store.ts`, `src-tauri/git.rs`)

* [x] **Branch-Management**: Erstellen, Wechseln (auch von Remote), Branch-Anzeige in Statusbar; Merge/Cherry-Pick/Revert im Backend vorhanden, UI fehlt

* [x] **Diff-Ansichten**: Working/Staged-Diff als Tab (`git-diff-page.tsx`), Datei-Vergleich Side-by-Side/Inline

* [x] **Gutter-Indikatoren**: Add/Change/Delete-Marker am Rand; Klick öffnet Peek-Widget mit altem Inhalt + „Zurücksetzen" pro Hunk (`git-gutter.ts`, `git-diff-parse.ts`, Test `test:diffparse`)

* [x] **Merge-Konflikt-Editor**: Konflikt-Sektion im SCM-Panel, Editor-Tab mit Current/Incoming-Diff + editierbarem Ergebnis, „Als gelöst speichern", Merge abschließen/abbrechen (`merge-conflict-page.tsx`, `merge-conflict-store.ts`); kein 3-Spalten-Layout mit Base

* [x] **Commit-Eingabe**: Textarea mit ⌘⏎; Message-Vervollständigung und Hooks-Feedback fehlen

* [ ] **Git Blame** (via Extension/Timeline), **File History** in Timeline

* [ ] **Stashes, Tags, Submodule, Worktrees** (Basis-Support)

* [ ] **Multi-Repo-Support**: Mehrere Repositories im Workspace

* [ ] **GitHub-Integration** (Extension von MS): PRs erstellen/reviewen/mergen, Issues, Codespaces

* [ ] **SCM-Provider-API**: Andere VCS via Extensions (SVN, Mercurial, Perforce)

* [ ] **Incoming/Outgoing Changes-Ansicht**

* [ ] **Git Graph / Source Control Graph**: Commit-Graph-Visualisierung

* [x] **Zu .gitignore hinzufügen**: Dateien/Ordner per Kontextmenü ignorieren

## 5. Debugging

* [ ] **Debug Adapter Protocol (DAP)**: Standardisierte Anbindung beliebiger Debugger

* [ ] **Node.js/JavaScript-Debugger eingebaut** (inkl. Browser-Debugging via Chrome/Edge)

* [ ] **Breakpoints**: Standard, Conditional (Expression), Hit Count, Logpoints (Logging ohne Stop), Function Breakpoints, Data Breakpoints, Triggered Breakpoints (abhängig von anderem Breakpoint), Inline Breakpoints

* [ ] **Ausführungssteuerung**: Continue, Step Over/Into/Out, Restart, Stop, Restart Frame

* [ ] **Variablen-Ansicht**: Scopes, Lazy Evaluation, Wertänderung zur Laufzeit, Kopieren

* [ ] **Watch-Ausdrücke**

* [ ] **Call Stack** mit Multi-Thread-/Multi-Session-Support

* [ ] **Debug Console / REPL**: Ausdrücke im aktuellen Kontext auswerten

* [ ] **Inline Values**: Variablenwerte direkt im Code während Debugging

* [ ] **Hover-Evaluation** während Debug-Session

* [ ] **launch.json**: Konfigurationen, Compounds (mehrere Debugger parallel), Variablensubstitution

* [ ] **Auto-Attach & JavaScript Debug Terminal**: Node-Prozesse automatisch debuggen

* [ ] **Debug-Toolbar & Statusbar-Färbung**

* [ ] **Exception Breakpoints**: Bei (un)caught Exceptions stoppen

* [ ] **Disassembly View** (bei unterstützten Debuggern)

* [ ] **DAP-Memory-Inspection** (Hex-Editor via Extension)

## 6. Terminal

* [x] **Integriertes Terminal**: xterm.js-Terminal im Panel

* [x] **Multiple Terminals**: Terminal-Tabs mit Plus-Button

* [x] **Split-Terminals**

* [x] **Terminal-Profile**: bash, zsh, fish, PowerShell, cmd, WSL, benutzerdefiniert (Auto-Detection + Standard-Profil + eigene)

* [x] **Shell Integration**: Command-Tracking (Erfolg/Fehler-Marker via OSC 633), Navigation zwischen Kommandos, Command-History (Rerun), Working-Directory-Erkennung (OSC 7/633 + `lsof`/`/proc`-Fallback)

* [x] **Quick Fixes im Terminal**: Port-belegt-, Git-Upstream-, `git init`-Vorschläge

* [x] **Links im Terminal**: Datei-/URL-/Zeilen-Links klickbar

* [x] **Find im Terminal** (Ctrl+F, Case/Word/Regex, Treffer-Zähler)

* [x] **GPU-beschleunigtes Rendering**: WebGL-Addon mit Canvas-Fallback

* [x] **Terminal-Persistenz**: Sessions überleben Reload/Fensterwechsel (Backend-Ringpuffer + Reconnect-Replay)

* [x] **Sticky Scroll im Terminal** (aktuelles Kommando bleibt sichtbar)

* [x] **Image-Support im Terminal** (Sixel/iTerm-Protokoll via addon-image)

* [~] **Environment-Variable-Injection**: pro Profil (`env`) möglich; keine Extension-API vorhanden

* [ ] **Automation-Terminal für Tasks**: benötigt Task-System (Abschnitt 7, noch offen)

## 7. Tasks & Build

* [ ] **Task-System** (`tasks.json`): Shell-/Prozess-Tasks, Compound Tasks (dependsOn, Reihenfolge)

* [x] **Task-Auto-Detection (npm)**: package.json-Scripts mit Paketmanager-Erkennung (bun/pnpm/yarn/npm, `run-scripts.ts`); TypeScript/Gulp/Grunt fehlen

* [x] **Problem Matchers (tsc)**: tsc-Fehler/-Warnungen aus jedem Terminal landen im Problems-Panel (beide tsc-Formate, ANSI-Strip, cwd-Pfadauflösung, Watch-Mode-Reset bei Recompile/„Found 0 errors", 300ms-Debounce — `problem-matcher.ts`, `task-problems.ts`, Test `test:problems`); eigene Regex-Matcher fehlen

* [ ] **Background/Watch-Tasks** mit Begin/End-Patterns

* [x] **Default Build/Test Task**: ⌘⇧R baut (`npm run build`), ⌘⇧T testet (`npm test`), auch über die Befehlspalette; Trust-Gate, Ausführung im integrierten Terminal (`tasks.ts`)

* [ ] **Task-Presentation-Optionen**: Panel-Verhalten, Fokus, Clear

* [x] **NPM-Scripts-View**: Play-Menü in der Titelleiste listet alle Scripts mit Kommando, Klick führt im Terminal aus (`app-header-run.tsx`)

## 8. Testing

* [ ] **Test Explorer nativ**: Baumansicht aller Tests, Run/Debug einzeln oder gebündelt

* [ ] **Test-Dekorationen im Editor**: Run-Buttons an Testfunktionen, Status-Icons

* [ ] **Test-Ergebnisse-Panel**, Fehler-Peek direkt an der Assertion

* [ ] **Coverage-Ansicht nativ**: Zeilen-Coverage im Editor + Coverage-Übersicht

* [ ] **Continuous Run**: Tests bei Änderung automatisch

* [ ] **Test-Profile**: Run/Debug/Coverage pro Framework via Extension-API

## 9. Remote-Entwicklung

* [ ] **Remote-SSH**: Voller Workspace auf entferntem Server, Extensions laufen remote

* [ ] **Dev Containers**: Entwicklung in Docker-Containern, `devcontainer.json`-Standard

* [ ] **WSL-Integration**: Nahtlos in Windows Subsystem for Linux arbeiten

* [ ] **GitHub Codespaces**: Cloud-Dev-Umgebungen

* [ ] **Remote Tunnels**: Eigene Maschine via `code tunnel` von überall erreichbar

* [ ] **vscode.dev / github.dev**: Voller Editor im Browser, ohne Installation

* [ ] **Port-Forwarding**: Automatische Erkennung + manuelles Forwarding, öffentliche/private Ports

## 10. Extensions & API

* [ ] **Extension Marketplace**: Suche, Installation, Updates, Ratings, Kategorien

* [ ] **Extension-Verwaltung**: Aktivieren/Deaktivieren (global/pro Workspace), Auto-Update-Steuerung, Version-Pinning, VSIX-Installation

* [ ] **Extension-Empfehlungen**: Pro Workspace (`extensions.json`), pro Dateityp

* [ ] **Extension Profiles / Extension Packs**

* [ ] **Web Extensions**: Extensions, die im Browser laufen

* [ ] **Extension-API-Flächen**: Commands, Views/TreeViews, Webviews, Custom Editors, Notebook-API, Language-APIs, Debug-API, SCM-API, Terminal-API, Tasks-API, Authentication-API, FileSystem-Provider (virtuelle Dateisysteme), TextDocumentContentProvider, StatusBar/QuickPick/InputBox-UI, CodeLens, Decorations, Comments-API, Testing-API, Chat-/Language-Model-API

* [ ] **Extension Host-Isolation**: Extensions crashen nicht die UI

* [ ] **Extension Bisect**: Automatisches Halbieren zum Finden problematischer Extensions

* [ ] **Untrusted-Workspace- und Virtual-Workspace-Capabilities**

## 11. KI-Features (GitHub Copilot-Integration)

* [x] **Inline Completions**: Ghost-Text via OpenRouter (opt-in in Einstellungen → KI), 350ms-Debounce, Abbruch bei Weitertippen, 60/15-Zeilen-Kontext, max. 128 Tokens, Ein-Antwort-Cache (`ai/inline-completions.ts`)

* [ ] **Next Edit Suggestions**: Vorhersage der nächsten Änderung an anderer Stelle

* [x] **AI-Chat (Basis)**: Chat-Panel mit Agent-Loop und Workspace-Tools (list/read/search/edit/create), OpenRouter-Streaming, tokeneffiziente History (alte Tool-Ausgaben werden gestubbt, Outputs gekappt — `pruneForLlm`, Test `test:aiprune`); Slash-Commands/Teilnehmer fehlen

* [x] **Inline Chat**: ⌘I öffnet Eingabe-Widget an der Cursorposition; ersetzt Selektion bzw. fügt an Cursor ein, ±30 Zeilen Kontext, undo-fähig via executeEdits (`inline-chat.ts`); auch im Editor-Kontextmenü

* [x] **Edits/Agent Mode (Basis)**: Multi-File-Änderungen autonom; jede Agent-Änderung als Karte im Chat mit Diff-Ansicht (Vorher↔Agent) und Ein-Klick-Rückgängig, neu erstellte Dateien werden beim Rückgängig gelöscht (`agent-edits.ts`); `run_command`-Tool führt Shell-Kommandos im Root aus (Trust-Gate, 60s-Timeout, Output-Cap — `exec.rs`) für Test-/Build-Selbstkorrektur

* [x] **Commit-Message-Generierung**: Sparkles-Button an der Commit-Eingabe erzeugt Conventional-Commit-Message aus dem gestagten Diff (Diff auf 24k gekappt, `generateCommitMessage` in `git-store.ts`)

* [x] **Chat-Kontext (Dateien)**: Dateien an die Nachricht anhängen — Chips über dem Input, „Aktive Datei" mit einem Klick, nativer Datei-Picker; Inhalt (≤16k/Datei) geht nur mit dieser einen Nachricht mit (tokeneffizient), Chips bleiben im Verlauf sichtbar; Symbole/Ordner/Bilder fehlen

* [ ] **Custom Instructions** (`.github/copilot-instructions.md`) und Prompt-Files

* [ ] **MCP-Support (Model Context Protocol)**: Externe Tools/Server im Agent Mode

* [ ] **Terminal-Command-Vorschläge und -Erklärungen**

* [ ] **AI-gestützte Rename-Vorschläge**

* [x] **Sprachmodell-Auswahl**: OpenRouter-Modelle wählbar (`ai-settings.ts`), Modell-Benchmarks unter `scripts/ai-bench*`

* [ ] **Language Model API** für Extensions

## 12. Diff, Merge & Review

* [ ] **Diff-Editor**: Side-by-Side/Inline, Moved-Code-Detection, Wortebene-Highlighting, Collapse Unchanged Regions

* [ ] **Multi-File-Diff-Editor**: Alle Änderungen in einer scrollbaren Ansicht

* [ ] **3-Wege-Merge-Editor**

* [ ] **Comments-API**: Review-Kommentare in Dateien (für PR-Extensions)

## 13. Accessibility

* [ ] **Screen-Reader-Support** (NVDA, JAWS, VoiceOver optimiert)

* [ ] **Accessible View**: Beliebige UI-Inhalte als navigierbarer Text (Alt+F2)

* [ ] **Audio Cues / Sound-Signale**: Töne für Fehler, Breakpoints, Zeilenänderungen

* [ ] **Accessibility Help Dialog** pro Kontext

* [ ] **High-Contrast-Themes**

* [ ] **Tastatur-Vollbedienbarkeit**, Tab-Trapping-Steuerung

* [ ] **Voice-Eingabe** (Dictation via Extension)

* [ ] **Zoom & Schriftskalierung überall**

## 14. Sonstiges

* [x] **Statusbar**: Branch (öffnet SCM), Fehler-/Warnungszähler (öffnet Problems), Zeile/Spalte + Selektion (Go to Line), Einrückung (Tabs/Spaces-Toggle), EOL (LF/CRLF-Toggle), Sprache (`status-bar.tsx`, `status-store.ts`); Dev-Server-Ports (lsof-Polling 5s, node/bun/vite/…, Klick öffnet im eingebauten Browser — `ports.rs`, `ports-store.ts`); Encoding fehlt noch

* [x] **Notifications**: Toast-Benachrichtigungen via Sonner

* [x] **Notifications-Center**: Glocke in der Statusbar sammelt alle Toasts (zentraler Capture, max. 100), Ungelesen-Punkt, Popover mit Verlauf/Zeit, „Alle löschen"; Do-not-disturb unterdrückt Toasts außer Fehlern, Center sammelt weiter (`notifications.ts`)

* [ ] **Walkthroughs / Getting Started**: Interaktive Onboarding-Guides (auch von Extensions)

* [x] **Screencast Mode**: ⌘⌥K toggelt Tastenanzeige — Chips unten mittig mit Modifier-Symbolen, Wiederholungszähler (×n), Spring-Ein-/Ausblendung, max. 5 gleichzeitig (`screencast-overlay.tsx`)

* [ ] **Process Explorer** und **Runtime Status** für Performance-Analyse

* [x] **Developer Tools (Dev)**: TanStack Router Devtools im Entwicklungsmodus

* [ ] **CLI**: `code` mit Diff (`-d`), Goto (`-g file:line`), Merge, Install-Extension, Tunnel, Serve-Web

* [ ] **URL-Handling**: `vscode://`-Protokoll für Deep Links

* [ ] **Encoding-Support**: Auto-Detection, Re-Open/Save with Encoding

* [x] **EOL-Handling**: LF/CRLF-Konvertierung per Klick in der Statusbar (Auto-Detection via Monaco)

* [ ] **Simple File Dialog / native Dialoge konfigurierbar**

* [ ] **Telemetrie-Steuerung** (aus/Fehler/alles)

* [ ] **Update-Kanäle**: Stable + Insiders, Hintergrund-Updates

* [ ] **Multi-Root-Workspaces**: Mehrere Ordner in einem Fenster mit Ordner-Settings

* [ ] **Workspace-Datei** (`.code-workspace`)

* [x] **Bild-Vorschau**: PNG, JPEG, GIF, WebP, SVG etc. im Editor

* [ ] **Hex-Editor, Audio/Video-Player** (eingebaute Viewer für Binärformate)

* [ ] **Interactive Window / REPL** (Python u.a.)

* [~] **Snippets-Verwaltung**: Global und pro Sprache ✓ (Einstellungen → Snippets); pro Projekt fehlt

***

# Teil 2: Zusätzliche Features über VS Code hinaus

Ideen, die VS Code nicht oder nur schwach abdeckt — Kandidaten für l8ide.

## A. Editor & Code-Intelligenz

* [ ] **Strukturelles Editieren (AST-basiert)**: Ausdrücke/Statements als Einheiten verschieben, tauschen, umschließen (Paredit-artig für alle Sprachen via Tree-sitter)

* [ ] **Strukturelle Suche & Replace**: Suchen nach Code-Mustern statt Text (wie IntelliJ SSR / ast-grep integriert)

* [ ] **Multi-File-Rename mit Datei-/Ordnernamen-Kopplung**: Symbol umbenennen benennt Datei, Tests, Storybook-Dateien mit um

* [x] **Postfix-Completions**: `.log`, `.error`, `.if`, `.not`, `.return`, `.const`, `.let`, `.await`, `.for` expandieren den Ausdruck davor (klammer-balancierter Zeilen-Scanner, Snippet-Tabstops; `postfix.ts`, `postfix-core.ts`, Test `test:postfix`)

* [ ] **Chain-Completion / Smart Completion Tiefe 2**: Vorschläge über Aufrufketten hinweg, die den Zieltyp erfüllen

* [ ] **Inline-Typ-Fehler-Erklärungen**: Komplexe Compiler-Fehler (TS-Generics, Rust-Borrow) automatisch in Klartext übersetzt

* [ ] **Code-Lens erweitert**: Laufzeitkosten, Anzahl Aufrufer, letzte Bearbeiter, Test-Coverage pro Funktion inline

* [ ] **Permanente Highlight-Marker**: Symbole dauerhaft farblich markieren, um Datenfluss zu verfolgen

* [x] **Clipboard-Historie mit Kontext**: Copy/Cut aus dem Editor wird mit Quellpfad erfasst (max. 50, dedupe, ≤20k Zeichen), ⌘⇧V öffnet filterbaren Verlauf, Klick fügt an Cursor ein und setzt die System-Zwischenablage (`clipboard-history.ts`); Syntax-Highlighting im Preview fehlt

* [ ] **Typing-Perfektion**: Automatische Tippfehler-Korrektur für Keywords/bekannte Symbole beim Tippen

* [ ] **Editable Peek überall**: Jede Referenz-/Definitionsansicht inline editierbar

* [ ] **Code-Reading-Modus**: Ligaturen, ausgeblendete Imports/Boilerplate, Fokus auf Logik, Annotationen für Leser

## B. Navigation & Verständnis

* [ ] **Codebase-Karte / Graph-View**: Interaktiver Abhängigkeitsgraph (Module, Symbole, Importe) mit Zoom-Ebenen

* [ ] **Datenfluss-Analyse visuell**: "Woher kann dieser Wert kommen?" / "Wohin fließt er?" als navigierbare Ansicht

* [ ] **Trail-/Tour-System**: Navigationspfade aufzeichnen und als geführte Code-Touren teilen (Onboarding)

* [x] **Arbeits-Kontexte / Task-Scopes**: ⌘⌥X — Tabs, Splits, Pins und Sidebar-Modus als benannte Kontexte pro Projekt speichern/wechseln/überschreiben (`workspace-contexts.ts`); Breakpoints/Terminalzustände folgen, sobald es sie gibt

* [ ] **Automatische Architektur-Doku**: Live generierte Modul-Übersichten aus dem Code

* [ ] **Frage-basierte Navigation**: "Wo wird der User authentifiziert?" → semantische Suche über Embeddings der Codebase

* [x] **Heatmap im Dateibaum (Änderungsfrequenz)**: ⌘⌥M toggelt amber Punkte im Explorer, Intensität = Commit-Häufigkeit der Datei (git log der letzten 500 Commits, lazy geladen, opt-in; `file-heatmap.ts`); Bug-Dichte/Ownership fehlen

* [ ] **Verlaufs-Graph des eigenen Arbeitstags**: Welche Dateien wann besucht/geändert, als Timeline zum Zurückspringen

## C. Ausführen, Debuggen, Laufzeit

* [ ] **Time-Travel-Debugging nativ**: Rückwärts steppen, Zustand zu jedem Zeitpunkt inspizieren (rr/WinDbg-artig integriert)

* [ ] **Inline-Laufzeitwerte ohne Debugger**: Live-Programming — Werte jeder Zeile beim Speichern/Tippen anzeigen (Quokka-artig, für mehr Sprachen)

* [ ] **Always-On-Profiler**: Flamegraphs pro Testlauf/Run direkt im Editor, Hot-Path-Markierung im Code

* [ ] **Log-Punkte mit UI-Stream**: Strukturierte Logpoint-Ausgaben als filterbare Tabelle statt Konsolen-Text

* [ ] **HTTP-Client nativ**: `.http`-Dateien + Response-Viewer, Environments, Auth-Flows, Codegen (IntelliJ-Feature)

* [ ] **Datenbank-Client nativ**: Verbindungen, Schema-Browser, Query-Editor mit Completion gegen echtes Schema, ER-Diagramme

* [ ] **Prozess-/Service-Dashboard**: Alle dev-Prozesse (Server, Watcher, Container) mit Status, Logs, Ports, Restart-Buttons

* [ ] **Snapshot-Debugging**: Programmzustand einfrieren, teilen, im Editor eines Kollegen wiederherstellen

* [ ] **Deterministische Replay-Aufnahmen von Bugs**: Fehlgeschlagene Läufe aufzeichnen und exakt wieder abspielen

## D. KI (über Copilot-Niveau hinaus)

* [ ] **Lokale Modelle first-class**: Ollama/llama.cpp-Backends nativ, Offline-Completions

* [ ] **Codebase-Wissensgraph für KI**: Persistenter, inkrementell aktualisierter Index (Symbole, Architektur, Konventionen) als Kontextquelle

* [x] **KI-Review vor Commit**: „Review"-Button im SCM-Panel prüft den gestagten Diff auf Bugs/Logikfehler/Sicherheit/Debug-Reste (one-shot, Diff auf 24k gekappt); Ergebnis als grüne/amber Box über der Commit-Eingabe (`reviewStaged` in `git-store.ts`); projekt-spezifische Regeln fehlen

* [ ] **Intent-basierte Snippets**: Beschreibung tippen, Snippet mit projektüblichen Patterns generiert

* [ ] **Erklär-Layer**: Jede Funktion auf Wunsch mit generierter, gecachter Zusammenfassung im Hover

* [ ] **KI-gestützte Merge-Konfliktlösung** mit Begründung pro Hunk

* [ ] **Automatische Doku-/Changelog-Pflege**: Bei Merge Änderungsvorschläge für README/Docs

* [ ] **Multi-Agent-Orchestrierung sichtbar**: Parallele Agenten mit eigenem Worktree, Live-Diff-Ansicht, Approve/Reject pro Agent

## E. Zusammenarbeit

* [ ] **Echtzeit-Kollaboration nativ**: Multiplayer-Editing mit Cursorn, Follow-Modus, geteilten Terminals/Servern (Live-Share-Niveau, aber eingebaut)

* [ ] **Asynchrone Code-Kommentare im Editor**: Threads an Code-Zeilen, versioniert im Repo, ohne PR-Kontext

* [ ] **Pair-Programming-Modus**: Rollen (Driver/Navigator), Timer, Übergabe-Handshake

* [ ] **Team-Awareness**: Wer arbeitet gerade in welcher Datei/Branch (opt-in), Konflikt-Frühwarnung vor dem Push

* [ ] **Review-Modus im Editor**: PR-Review komplett lokal mit Checkout, Kommentaren, Suggestions, ohne Browser

* [ ] **Geteilte Debug-Sessions**: Breakpoints und Stepping gemeinsam

## F. Projekt- & Umgebungsmanagement

* [ ] **Umgebungs-Manager nativ**: Node/Python/Ruby/Java-Versionen pro Projekt erkennen, installieren, umschalten (mise/asdf integriert)

* [ ] **Secrets-Management**: `.env`-Editor mit Maskierung, Schema-Validierung, Sync mit Vaults, Warnung bei Commit von Secrets

* [ ] **Dependency-Dashboard**: Alle Abhängigkeiten mit Versionen, Vulnerabilities, Lizenzchecks, Update-PRs per Klick

* [ ] **Monorepo-Bewusstsein**: Paket-Grenzen, betroffene Pakete bei Änderung, gefilterte Task-Ausführung (turbo/nx-Integration nativ)

* [x] **Projekt-Gesundheits-Panel**: Activity-Popover in der Statusbar — Fehler/Warnungen (öffnet Problems), TODO·FIXME·HACK-Zähler (Klick startet Suche, Scan lazy beim Öffnen), geänderte Dateien (öffnet SCM), Ahead/Behind, laufende Dev-Server (`project-health.ts`); Build-/Test-Status und Bundle-Size fehlen

* [ ] **Onboarding-Automat**: Neues Teammitglied klont Repo → IDE erkennt und installiert alles, prüft Systemvoraussetzungen, führt Setup-Tour

* [ ] **Ticket-Integration nativ**: Jira/Linear/GitHub-Issues als View, Branch-aus-Ticket, Commit-Verknüpfung, Status-Updates

## G. Git & Historie (erweitert)

* [ ] **First-Class Worktree-UI**: Worktrees als Tabs/Fenster mit eigenem Zustand, schnelles Umschalten

* [ ] **Interaktives Rebase als GUI**: Commits per Drag\&Drop ordnen, squashen, editieren

* [ ] **Commit-Komposition**: Hunks/Zeilen per Checkbox auf mehrere Commits verteilen (GitButler-artig, virtuelle Branches)

* [ ] **Blame-Layer permanent**: Dezente Autor/Alter-Anzeige pro Zeile, mit Commit-Peek (GitLens nativ)

* [ ] **Code-Archäologie**: "Zeig mir jede Version dieser Funktion über die Zeit" als Slider

* [ ] **Undo-Everything**: Journal aller Git-Operationen mit Ein-Klick-Rückgängig (reflog als UI)

* [ ] **Automatische WIP-Snapshots**: Commit-loser Sicherungsstand bei jedem Testlauf/Branch-Wechsel

## H. Terminal & Tasks (erweitert)

* [ ] **Notebook-Terminal**: Kommandos als Zellen mit strukturiertem Output, wiederholbar, teilbar (Warp-artig)

* [ ] **Output-Parser universell**: JSON/Tabellen/Logs im Terminal automatisch als interaktive Tabellen renderbar

* [ ] **Kommando-Palette fürs Terminal**: Projektspezifische Befehle mit Beschreibung, Parametern als Formular

* [ ] **Task-Pipelines visuell**: Build-Abhängigkeiten als Graph, Live-Status pro Knoten

## I. Qualität & Sicherheit

* [ ] **Security-Scanning nativ**: SAST + Dependency-Audit + Secret-Detection im Problems-Panel

* [ ] **Mutation-Testing-Integration**: Schwache Tests direkt im Editor markiert

* [ ] **Performance-Budgets**: Bundle-Size/Startup-Metriken pro PR mit Editor-Warnungen

* [ ] **Flaky-Test-Erkennung**: Historie der Testläufe, Flakiness-Score im Test-Explorer

* [ ] **Accessibility-Linting für UI-Code**: Live-a11y-Prüfung in JSX/Templates mit Vorschau

## J. UI/UX-Innovationen

* [ ] **Canvas-Modus**: Editoren frei auf unendlicher Fläche anordnen (Code + Diagramme + Notizen gemischt)

* [ ] **Eingebettete Diagramme**: Mermaid/Excalidraw-Blöcke in Code-Kommentaren gerendert und editierbar

* [ ] **Präsentationsmodus**: Code-Schritte als Folien mit Highlights (für Talks/Reviews)

* [ ] **Adaptive UI**: Layout wechselt automatisch nach Kontext (Debugging-Layout, Review-Layout, Schreib-Layout)

* [ ] **Befehls-Vorhersage**: Häufige Aktionsfolgen lernen und als Ein-Klick-Makro anbieten

* [x] **Notizen/Scratchpads pro Projekt**: ⌘⌥N öffnet die Projekt-Notizen als Markdown-Tab (Rich-Editor via Milkdown); liegen im App-Data außerhalb des Repos, überleben Branch-Wechsel (`project-notes.ts`)

* [ ] **Fokus-Timer & Flow-Schutz**: Benachrichtigungen bündeln, Pomodoro, "nicht stören" bei aktiver Tipp-Phase

* [ ] **Spatial Audio Cues / haptisches Feedback** für Build-/Testereignisse im Hintergrund

## K. Web-/Frontend-Spezifisch (relevant für l8ide)

* [x] **Eingebauter Browser (Basis)**: Webview-Panel mit Navigation im Dock

* [x] **Browser-Konsole in der IDE**: console.log/warn/error + Fehler/unhandled rejections aus dem Browser-Webview live im Panel (injizierter Hook → lokaler Log-Sink → Tauri-Event; `console_sink.rs`, `browser-console-store.ts`, `browser-console.tsx`); Fehler-Badge am Konsole-Button

* [x] **Native DevTools für den Browser**: Web-Inspector per Button (`browser_devtools`, Tauri-Feature `devtools`)

* [ ] **Browser-Preview mit DevTools-Brücke**: Element-Klick im Browser springt zur JSX/Component-Quelle

* [ ] **Komponenten-Explorer**: Alle UI-Komponenten des Projekts als Galerie mit Props-Playground (Storybook-nativ)

* [ ] **Design-Token-Sync**: Farben/Spacing aus Figma/Tokens-Datei mit Inline-Vorschau und Abweichungs-Warnung

* [ ] **Visuelles CSS-Editing**: Box-Model/Flex/Grid-Manipulation mit Live-Rückschreibung in die Quelle

* [ ] **State-Inspektion für Frameworks**: React/Vue/Svelte-Komponentenbaum + State im Editor-Panel

* [ ] **Responsive-Preview-Matrix**: Mehrere Viewports gleichzeitig live

