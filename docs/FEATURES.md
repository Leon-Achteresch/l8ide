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

* [x] **Linked Editing**: JSX/HTML-Tag-Paare synchron umbenennen (Monaco `linkedEditing`, in den Einstellungen abschaltbar)

* [x] **Auto-Surround**: Auswahl automatisch mit Klammern/Quotes umschließen

* [x] **Auto-Indentation**: Automatische Einrückung basierend auf Sprache

* [x] **Kommentar-Toggle**: Zeilen- (Cmd+/) und Blockkommentare (Shift+Alt+A)

* [x] **Groß-/Kleinschreibung transformieren**: Upper, Lower, Title, Snake, Kebab — Monaco-Aktionen über die Befehlspalette (Cmd+Shift+P)

* [x] **Sortieren von Zeilen**: Aufsteigend/absteigend über die Befehlspalette

* [x] **Whitespace-Handling**: Render Whitespace; nachgestellte Leerzeichen per Befehlspalette oder automatisch beim Speichern (Einstellung); zusätzlich abschließenden Zeilenumbruch beim Speichern einfügen (`on-save-transforms.ts`, Test `test:onsave`)

* [x] **Emmet**: Integrierte Abkürzungs-Expansion für HTML/CSS (z.B. `ul>li*5`)

* [x] **Selektion umwandeln**: ⌘⌥; öffnet eine Palette von Transformationen auf die Auswahl — Zeilen sortieren (A↔Z, numerisch-bewusst)/umkehren/deduplizieren, Case-Konvertierung (camelCase/PascalCase/snake_case/kebab-case/CONSTANT_CASE, stilübergreifend), Base64 en/decode, URL en/decode, JWT dekodieren (Header+Payload), JSON formatieren/minifizieren/escapen, **JSON → TypeScript-Interface** (verschachtelte Objekte als eigene Interfaces, Arrays als `T[]`, null→optional, nicht-Identifier-Keys quotiert — `json-to-ts-core.ts`, Test `test:json2ts`) (`text-transforms.ts` mit Test `test:transforms`, undo-fähig)

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

* [x] **Call Hierarchy**: Eingehende **und ausgehende** Aufrufe als lazy expandierender Baum (Rechtsklick → „Eingehende/Ausgehende Aufrufe anzeigen", Klick springt zur Stelle; Worker `getIncomingCalls`/`getOutgoingCalls` mit Zeilenauflösung — `call-hierarchy.ts`)

* [ ] **Type Hierarchy**: Vererbungshierarchie

* [x] **Sticky Scroll**: Aktuelle Scope-Header bleiben oben kleben (Monaco `stickyScroll`, abschaltbar in den Einstellungen)

* [x] **Minimap**: Verkleinerte Code-Übersicht, in den Einstellungen einschaltbar (Standard aus)

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

* [x] **Diagnostics-Anzeige (Workbench)**: Problems-Panel, Explorer-Badges (Fehler/Warnungen pro Datei + Ordner), Dock-Button mit Zähler; Marker erscheinen in der Overview-Ruler und (falls Minimap aktiviert) in dieser

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

* [x] **Readonly-Modus pro Datei/Glob**: `.l8ide/settings.json` → `readonlyGlobs` (z.B. `["dist/**", "**/*.gen.ts", "*.min.js"]`) macht passende Dateien im Editor schreibgeschützt (Monaco `readOnly` + Hover-Meldung beim Tippversuch); ⌘⌥2 schaltet den Schutz für die aktive Datei sitzungsweise um. Eigener Glob-Kern (`*`, `**`, `?`, `{a,b}`, gitignore-artiges Basename-Matching ohne `/`) in `glob-match.ts`, Test `test:glob` mit 18 Fällen; Store `readonly-globs.ts` (Globs persistiert, Sitzungs-Overrides flüchtig)

* [x] **Zu .gitignore hinzufügen**: Kontextmenü schreibt Einträge in `.gitignore`

* [x] **Dateien/Ordner ausblenden**: Manuell per Name (global/workspace)

* [x] **`.git`** **standardmäßig ausblenden**

### 2.4 Suche

* [x] **Volltextsuche im Workspace** (ripgrep-basiert): Regex, Case, Whole Word

* [x] **Include/Exclude-Globs**

* [x] **Respektierung von** **`.gitignore`** in Workspace-Suche und Datei-Index

* [x] **`.gitignore`-Respektierung abschaltbar**: Schalter „.gitignore ignorieren" im Dateifilter-Bereich der Suche (`no_ignore` bis in den ripgrep-Walker durchgereicht)

* [x] **`.gitignore`-Filter im Explorer**: von Git ignorierte Dateien/Ordner werden im Baum gedimmt (opacity, Hover-Hinweis „von Git ignoriert"); Header-Toggle (EyeOff) blendet sie ganz aus statt zu dimmen (persistiert). Pro Ordner ein `git check-ignore`-Aufruf mit Repo-Cache (Nicht-Repo → Exit 128 gecacht, keine weiteren Aufrufe), shell-sichere Quotierung (`shell-quote.ts`, Test `test:ignorequote` mit Injection-Round-Trip), gegen echtes git verifiziert. Zusätzlich zum bestehenden manuellen Ausblenden

* [x] **Search & Replace projektweit**: Replace All, pro Datei, einzeln

* [x] **Search & Replace mit Vorschau**: Diff-Button neben „Alle ersetzen" öffnet den Mehrdatei-Diff (pro Datei an-/abwählbar, Refactor-Preview-Infra) vor dem Anwenden; Regex-Capture-Groups ($1…) funktionieren, `$` in Nicht-Regex-Ersetzung ist escaped; Case-Preserving Replace fehlt

* [x] **Search Editor**: „Als Tab"-Button friert die Suchergebnisse als Editor-Tab ein (Query-Header, nach Datei gruppiert, Treffer-Highlighting, Klick springt zur Stelle; überlebt neue Suchen — `search-editor-store.ts`, `search-editor-page.tsx`); nicht editierbar

* [x] **Suche in geöffneten Editoren**: Toggle in der Such-Optionsleiste beschränkt die Suche auf die offenen Tabs aller Editor-Gruppen (als Include-Globs ans Backend gereicht, kombinierbar mit eigenen Filtern)

* [x] **Suchergebnis-Kontextzeilen**

* [x] **In-File-Suche** (Cmd+F) via Monaco

* [x] **Regex-Tester**: ⌘⌥4 öffnet einen Tester — Muster + Flags (g/i/m/s/u) live gegen Testtext, Treffer im Text hervorgehoben, Capture-Groups pro Treffer aufgelistet, ungültige Muster als Fehler (`regex-tester-core.ts`, Test `test:regex`)

### 2.5 Personalisierung

* [x] **Color Themes**: Hell/Dunkel mit OS-Sync via next-themes

* [ ] **Color Themes (Marketplace)**: Installierbar, eigene definierbar

* [x] **File Icon Themes (Basis)**: Datei-/Ordner-Icons ein-/ausschaltbar

* [ ] **Product Icon Themes**

* [x] **Settings (GUI)**: Dark Mode, Icons, Hidden Files, Trust, Prettier

* [~] **Settings (JSON & Ebenen)**: Workspace-Ebene via `.l8ide/settings.json` (⌘⌥, — autoSave/-Delay, formatOnSave, organizeImportsOnSave, semanticValidation, hidden[]; wird beim Projekt-Öffnen und bei jedem Speichern der Datei angewandt, versionierbar — `workspace-settings.ts`); User-JSON-Ebene und sprach-spezifische Settings fehlen

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

* [~] **Markdown (erweitert)**: Live gescrollt-synchronisierte Vorschau ✓ (Milkdown-Split); **Inhaltsverzeichnis-Generator** (⌘⌥3, idempotent zwischen `<!-- toc -->`-Markern — `markdown-toc.ts`, Test `test:mdtoc`); **Linkvalidierung** (relative Links/Bilder, die ins Leere zeigen, als Warnung im Problems-Panel, 700ms-debounced, Code-Fences/Inline-Code ausgenommen — `markdown-links-core.ts`, Test `test:mdlinks`); **Pfad-Completions** (in `](…)` schlägt die Completion Workspace-Dateien als relative Pfade vor — `markdown-path-completions.ts`, Test `test:mdpath`); Mermaid fehlt

* [x] **JSON Schema-Validierung**: Schema Store mit Completions

* [x] **HTML/CSS (Basis)**: Tag-Completion und CSS-Worker via Monaco

* [x] **HTML/CSS (erweitert)**: **Color Picker** über Monacos CSS-Worker (Swatch + Picker für Farbliterale in `.css`) und den Tailwind-Color-Provider (css/scss/less/html/js/ts); **Specificity-Hover** — Hover über eine Selektor-Zeile zeigt die Spezifität `(ID, Klasse, Typ)` je Selektor der Liste und markiert den spezifischsten, inkl. `:is/:not/:has` (Maximum des Arguments) und `:where` (0), funktionale Pseudoklassen wie `:nth-child()` (`css-specificity-core.ts`, Test `test:cssspec` mit 13 Fällen)

* [ ] **Notebooks**: Jupyter-Notebook-UI nativ (Zellen, Kernels, Outputs, Variablen-Explorer via Extension)

## 4. Versionskontrolle (Git & SCM)

* [x] **Git-Integration nativ**: Stage, Unstage, Commit, Amend (Toggle im SCM-Panel), Push, Pull, Fetch, Discard mit Toast-Bestätigung (`scm-panel.tsx`, `git-store.ts`, `src-tauri/git.rs`)

* [x] **Branch-Management**: Erstellen, Wechseln (auch von Remote), Branch-Anzeige in Statusbar; Merge/Cherry-Pick/Revert im Backend vorhanden, UI fehlt

* [x] **Diff-Ansichten**: Working/Staged-Diff als Tab (`git-diff-page.tsx`), Datei-Vergleich Side-by-Side/Inline

* [x] **Gutter-Indikatoren**: Add/Change/Delete-Marker am Rand; Klick öffnet Peek-Widget mit altem Inhalt + „Zurücksetzen" pro Hunk (`git-gutter.ts`, `git-diff-parse.ts`, Test `test:diffparse`)

* [x] **Merge-Konflikt-Editor**: Konflikt-Sektion im SCM-Panel, Editor-Tab mit Current/Incoming-Diff + editierbarem Ergebnis, „Als gelöst speichern", Merge abschließen/abbrechen (`merge-conflict-page.tsx`, `merge-conflict-store.ts`); kein 3-Spalten-Layout mit Base

* [x] **Commit-Eingabe**: Textarea mit ⌘⏎; Message-Vervollständigung und Hooks-Feedback fehlen

* [x] **Git Blame**: ⌘⌥U blendet Autor, Alter und Commit-Summary der Cursorzeile dezent inline ein (GitLens-Stil, folgt dem Cursor, debounced, refresht bei Änderungen/Git-Events — `blame-layer.ts`, Backend `repo_blame`); **File History** in Timeline ✓

* [x] **Stashes** ✓ (⌘⌥S), **Worktrees** ✓ (⌘⌥O), **Tags** ✓ (⌘⌥Q), **Submodule** ✓ (⌘⌥. : Liste mit Branch/Behind/lokalen Änderungen, einzeln oder alle aktualisieren — `submodule-store.ts`)

* [ ] **Multi-Repo-Support**: Mehrere Repositories im Workspace

* [ ] **GitHub-Integration** (Extension von MS): PRs erstellen/reviewen/mergen, Issues, Codespaces

* [x] **Remote-Verwaltung**: ⌘⌥E listet Git-Remotes mit editierbarer URL (Inline-Speichern) und Anlegen neuer Remotes (`remotes-store.ts`); Entfernen offen (Backend fehlt)

* [ ] **SCM-Provider-API**: Andere VCS via Extensions (SVN, Mercurial, Perforce)

* [x] **Incoming/Outgoing Changes-Ansicht**: ⌘⌥A öffnet eine Seite mit zwei Abschnitten — **Eingehend** (`HEAD..@{upstream}`, Commits die vom Upstream noch reinkommen) und **Ausgehend** (`@{upstream}..HEAD`, lokale Commits voraus), je mit Zähler-Badge, Hash/Subject/Autor/Datum und Empty-States; freundlicher Hinweis wenn kein Upstream konfiguriert (`git-sync-page.tsx`). Neues Range-Log-Backend `repo_range_log` (teilt den Parser mit `repo_log_page` via `parse_commit_log`, `-`-Guard gegen Arg-Injection, No-Upstream → leere Liste — gegen echtes git verifiziert)

* [x] **Git-Verlauf / Source Control**: ⌘⌥L öffnet die Commit-Liste (100 neueste, mit Tags-Badges) als Tab; Rechtsklick pro Commit: Hash kopieren, Cherry-Pick, Revert, Tag anlegen (`git-history-page.tsx`, Backends `repo_log_page`/`git_cherry_pick`/`git_revert_commit`); **grafische Graph-Linien** als SVG-Overlay (Railroad-Lane-Zuweisung mit Merge-Fan-out und Konvergenz-Diagonalen, 8-Farben-Palette pro Branch — reiner Kern `git-graph-core.ts`, Test `test:gitgraph`, gegen echte Repo-Historie verifiziert)

* [x] **Zu .gitignore hinzufügen**: Dateien/Ordner per Kontextmenü ignorieren

## 5. Debugging

* [ ] **Debug Adapter Protocol (DAP)**: Standardisierte Anbindung beliebiger Debugger

* [~] **Node.js/JavaScript-Debugger eingebaut**: Attach an `node --inspect` via V8-Inspector-WebSocket (⌘⌥D, Port 9229); Debug-Island mit Pause/Continue, Step Over/Into/Out, aufklappbarem Call Stack (Klick springt zur Datei), Auto-Sprung zum Top-Frame bei Pause (`debugger.ts`, `debug-island.tsx`); Breakpoints, Variablen, Launch-Configs fehlen (nächste Phasen)

* [~] **Breakpoints**: Standard per Gutter-Klick (rot, persistiert, live-sync); **Conditional per Alt+Klick** (amber, hält nur bei truthy — verifiziert); **Logpoints** (violett, gleicher Dialog — loggt `{ausdruck}`-interpoliert ohne anzuhalten, verifiziert: 3 Logs, 0 Pausen); **Hit-Count** (sky-blau, dritter Dialog-Modus — hält ab dem N-ten Treffer via persistentem Global-Counter im V8-`condition`, `hitCountCondition`, Test `test:hitcount`, gegen echten Prozess verifiziert: erste Pause beim 3. Treffer); Function/Data/Inline fehlen

* [ ] **Ausführungssteuerung**: Continue, Step Over/Into/Out, Restart, Stop, Restart Frame

* [x] **Variablen-Ansicht**: Variablen des Top-Frames bei Pause in der Debug-Island — lokaler, Block- und Closure-Scope gemergt (module/global ausgeblendet), Objekte lazy expandierbar bis Tiefe 4, **Wert-Klick kopiert, Doppelklick ändert den Wert zur Laufzeit** (`Debugger.setVariableValue` — gegen echten Prozess verifiziert: x 5→99)

* [x] **Watch-Ausdrücke**: Auge-Button in der Debug-Island — Ausdrücke hinzufügen/entfernen (persistiert), Werte bei jedem Halt automatisch neu ausgewertet (side-effect-frei)

* [ ] **Call Stack** mit Multi-Thread-/Multi-Session-Support

* [x] **Debug Console / REPL (Browser)**: Eingabezeile in der Browser-Konsole führt JS im Seitenkontext aus (Ergebnis/Fehler als Log-Eintrag, ↑/↓-History, Eingaben violett mit ❯-Prompt); Node-Debug-Kontext fehlt

* [x] **Inline Values**: Bei Pause werden die Top-Frame-Locals als dezente Inline-Annotation (`name = wert`, sky-blau) am Zeilenende gerendert, wo der Bezeichner vorkommt — nur im Frame der aktiven Datei, String-Literale werden maskiert (kein Fehl-Match), Werte auf 40 Zeichen gekürzt, bei Scroll/Resume aktualisiert (`inline-values.ts` + reiner Kern `inline-values-core.ts`, Test `test:inlinevalues`, End-to-End gegen echten Node verifiziert: `count = 42` an der Return-Zeile)

* [x] **Hover-Evaluation** während Debug-Session: Bei Pause zeigt der Editor-Hover den Live-Wert des Ausdrucks unterm Cursor (Member-Ketten wie `a.b.c`, side-effect-frei via `throwOnSideEffect`, 500ms-Timeout — `debug-hover.ts`, verifiziert)

* [~] **launch.json**: liest `.vscode/launch.json` bzw. `.l8ide/launch.json` (JSONC mit Kommentaren), ⌘⌥6 öffnet eine cmdk-Palette der Konfigurationen (0 → aktive Datei debuggen, 1 → direkt starten, mehrere → Auswahl); startet `node --inspect-brk` mit `program`/`args`/`cwd`/`env` und attacht automatisch. **Variablensubstitution** `${workspaceFolder}`, `${file}`, `${relativeFile}`, `${fileBasename(NoExtension)}`, `${fileDirname}`, `${env:NAME}` (`launch-config-core.ts` + `launch-config.ts`, Test `test:launchconfig`, Kommandobau gegen echten Node-Inspector verifiziert); Compounds/Attach-Configs fehlen

* [~] **Auto-Attach & Debug-Launcher**: ⌘⌥B startet die aktive .js/.mjs/.cjs-Datei mit `node --inspect-brk` im Terminal und attacht automatisch (Inspector-Polling, Port-Belegt-Schutz — `debug-launcher.ts`); generelles Auto-Attach an beliebige Node-Prozesse fehlt

* [ ] **Debug-Toolbar & Statusbar-Färbung**

* [x] **Exception Breakpoints**: Zap-Button in der Island wechselt aus → nur unbehandelte (amber) → alle (rot); persistiert, beim Attach gesetzt, live umschaltbar (`setPauseOnExceptions` verifiziert, Pause-Reason „exception")

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

* [~] **Test Explorer nativ**: ⌘⌥V öffnet eine Baumansicht aller Testdateien im Projekt (scannt den Datei-Index nach `*.test.*`/`*.spec.*`, parst jede via `findTestCases`), aufklappbar pro Datei mit `describe`/`it`/`test`-Knoten, Test-Zähler und Status-Icons (✓/✗/○ aus dem geteilten Ergebnis-Store); Klick auf einen Test springt zur Zeile, Play-Button führt einzelnen Test (Terminal) bzw. ganze Datei mit Ergebnissen aus (`test-explorer-page.tsx`, Baumbau gegen echte Testdatei verifiziert, 300-Dateien-Cap); Debug einzelner Tests fehlt noch

* [x] **Test-Dekorationen im Editor**: CodeLens „▶ Test"/„▶ Suite" über jedem `it`/`test`/`describe` (auch `.only`/`.skip`/`.each`) und „▶ Alle Tests der Datei" oben — nur in `*.test.*`/`*.spec.*`-Dateien; Klick führt den erkannten Runner (vitest/jest aus package.json, sonst `npm test`) mit `-t <name>`-Filter im Terminal aus (`test-lens.ts` + reiner Kern `test-lens-core.ts`, Test `test:testlens`; String-Literale werden nicht fälschlich als Test erkannt). **Status-Icons**: „✓ Mit Ergebnissen" läuft die Datei mit JSON-Reporter (`vitest --reporter=json` / `jest --json`) headless via `run_shell`, parst pass/fail/skip und rendert ✓/✗/○ inline am Testende (Fehlermeldung im Hover), plus Summary-Toast (`test-results.ts` + Kern `test-results-core.ts`, Test `test:testresults`, **gegen echte vitest-JSON-Ausgabe verifiziert**)

* [ ] **Test-Ergebnisse-Panel**, Fehler-Peek direkt an der Assertion

* [~] **Coverage-Ansicht nativ**: ⇧⌘C lädt `coverage/coverage-final.json` (bzw. `.nyc_output/…`, Istanbul-Format von vitest/jest/nyc/c8) und färbt im Editor jede ausführbare Zeile — grüner Balken = getroffen, roter Balken + rote Zeilentönung + Minimap-Marker = ungedeckt; Toggle blendet um, Toast zeigt Gesamt-% und Dateizahl (`coverage.ts` + reiner Parser `coverage-core.ts`, Test `test:coverage`, **gegen echte vitest-v8-`coverage-final.json` verifiziert**); zusammenhängende Übersichts-Seite/Coverage-Run-Button fehlen noch

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

* [x] **AI-Chat**: Chat-Panel mit Agent-Loop und Workspace-Tools (list/read/search/edit/create/run_command/get_diagnostics — Letzteres liefert dem Agenten die aktuellen Fehler/Warnungen zur Selbstkorrektur ohne tsc-Lauf), OpenRouter-Streaming, tokeneffiziente History (`pruneForLlm`, Test `test:aiprune`), Datei-Anhänge; **Slash-Commands** `/explain /fix /test /review /refactor` mit Autocomplete, hängen die aktive Datei automatisch an (`chat-slash.ts`); geschätzter Token-Verbrauch der Sitzung im Chat-Header (`token-estimate.ts`, Test `test:tokest`)

* [x] **Inline Chat**: ⌘I öffnet Eingabe-Widget an der Cursorposition; ersetzt Selektion bzw. fügt an Cursor ein, ±30 Zeilen Kontext, undo-fähig via executeEdits (`inline-chat.ts`); auch im Editor-Kontextmenü

* [x] **Edits/Agent Mode (Basis)**: Multi-File-Änderungen autonom; jede Agent-Änderung als Karte im Chat mit Diff-Ansicht (Vorher↔Agent) und Ein-Klick-Rückgängig, neu erstellte Dateien werden beim Rückgängig gelöscht (`agent-edits.ts`); `run_command`-Tool führt Shell-Kommandos im Root aus (Trust-Gate, 60s-Timeout, Output-Cap — `exec.rs`) für Test-/Build-Selbstkorrektur

* [x] **Commit-Message-Generierung**: Sparkles-Button an der Commit-Eingabe erzeugt Conventional-Commit-Message aus dem gestagten Diff (Diff auf 24k gekappt, `generateCommitMessage` in `git-store.ts`)

* [x] **Chat-Kontext (Dateien)**: Dateien an die Nachricht anhängen — Chips über dem Input, „Aktive Datei" mit einem Klick, nativer Datei-Picker; Inhalt (≤16k/Datei) geht nur mit dieser einen Nachricht mit (tokeneffizient), Chips bleiben im Verlauf sichtbar; Symbole/Ordner/Bilder fehlen

* [x] **Custom Instructions & Prompt-Files**: der AI-Chat lädt beim Projekt-Öffnen automatisch projektspezifische Anweisungen (Priorität: `.l8ide/instructions.md` → `.github/copilot-instructions.md` → `AGENTS.md` → `CLAUDE.md`, erste vorhandene gewinnt) und hängt sie mit Vorrang-Hinweis an den System-Prompt (auf 6000 Zeichen gekappt = tokeneffizient, einmal gecacht — `ai/custom-instructions.ts`, Injektion in `buildSystemPrompt`, Tests `test:sysprompt`). **Wiederverwendbare Prompt-Files**: Markdown-Dateien in `.l8ide/prompts/` bzw. `.github/prompts/*.prompt.md` werden zu Slash-Commands im Chat (Name = Dateiname, `description`/`attach` aus optionalem Frontmatter, `${input}`/`{{input}}`/`$ARGUMENTS`-Platzhalter oder Anhängen des Rests), erscheinen im Slash-Menü und hängen optional die aktive Datei an (`prompt-files.ts`, Test `test:promptfiles`, Scan/Dedup/Namensableitung gegen echte Dateien verifiziert)

* [ ] **MCP-Support (Model Context Protocol)**: Externe Tools/Server im Agent Mode

* [ ] **Terminal-Command-Vorschläge und -Erklärungen**

* [x] **KI-Quick-Fix**: Auf einer Zeile mit Fehler/Warnung bietet die Code-Action-Palette (⌘.) „✨ KI: Fehler beheben" — schickt Diagnose + ±8 Zeilen Kontext ans Modell und ersetzt die Zeile durch die korrigierte Fassung (undo-fähig; `ai-quickfix.ts`)

* [x] **AI-gestützte Rename-Vorschläge**: Sparkles-Button im Umbenennen-Dialog (F2/⇧F2) schlägt aus Symbol + ±12 Zeilen Kontext einen sprechenden Namen vor und füllt das Feld (validiert als Identifier; `ai/ai-rename.ts`)

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

* [x] **Statusbar**: Branch (öffnet SCM), Fehler-/Warnungszähler (öffnet Problems), Zeile/Spalte + Selektion (Go to Line), Selektions-Statistik (Zeichen · Wörter · Zeilen bei Auswahl, `selection-stats.ts` mit Test `test:selstats`), Einrückung (Tabs/Spaces-Toggle), EOL (LF/CRLF-Toggle), Sprache (`status-bar.tsx`, `status-store.ts`); Dev-Server-Ports (lsof-Polling 5s, node/bun/vite/…, Klick öffnet im eingebauten Browser — `ports.rs`, `ports-store.ts`); Encoding fehlt noch

* [x] **Erfolgs-Moment**: Wenn die Fehlerzahl von >0 auf 0 fällt, pulst das Diagnostics-Item in der Statusbar kurz grün mit Häkchen (scale-Pop, `prefers-reduced-motion`-safe) — „alles behoben" als dezente Belohnung (Design-Leitfaden)

* [x] **Notifications**: Toast-Benachrichtigungen via Sonner

* [x] **Notifications-Center**: Glocke in der Statusbar sammelt alle Toasts (zentraler Capture, max. 100), Ungelesen-Punkt, Popover mit Verlauf/Zeit, „Alle löschen"; Do-not-disturb unterdrückt Toasts außer Fehlern, Center sammelt weiter (`notifications.ts`)

* [x] **Walkthroughs / Getting Started**: Willkommensseite (⌘⌥0, beim ersten Start automatisch) mit nach Bereich gruppierten Feature-Karten (KI/Debuggen/Web/Git/Navigieren), Klick startet den jeweiligen Befehl inkl. Shortcut-Hinweis (`welcome-page.tsx`)

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

* [x] **Snippets-Verwaltung**: Global und pro Sprache (Einstellungen → Snippets) sowie **pro Projekt** via versionierbare `.l8ide/snippets.json` (Array aus {name, prefix, body, language}, beim Projekt-Öffnen geladen und in die Completion gemischt — `loadProjectSnippets` in `user-snippets.ts`)

***

# Teil 2: Zusätzliche Features über VS Code hinaus

Ideen, die VS Code nicht oder nur schwach abdeckt — Kandidaten für l8ide.

## A. Editor & Code-Intelligenz

* [ ] **Strukturelles Editieren (AST-basiert)**: Ausdrücke/Statements als Einheiten verschieben, tauschen, umschließen (Paredit-artig für alle Sprachen via Tree-sitter)

* [x] **Strukturelle Suche & Replace**: ⌘⇧S — Code-Muster mit `$name` (ein Token) und `$$$` (beliebig), whitespace-tolerant; ripgrep-Vorfilter + struktureller Nachfilter, Klick springt zur Stelle. Ersetzungsfeld mit Metavariablen-Rückreferenzen (`foo($A, $B)` → `foo($B, $A)`) öffnet die Mehrdatei-Diff-Vorschau (`struct-search-core.ts`, Test `test:structsearch`)

* [ ] **Multi-File-Rename mit Datei-/Ordnernamen-Kopplung**: Symbol umbenennen benennt Datei, Tests, Storybook-Dateien mit um

* [x] **Postfix-Completions**: `.log`, `.error`, `.if`, `.not`, `.return`, `.const`, `.let`, `.await`, `.for` expandieren den Ausdruck davor (klammer-balancierter Zeilen-Scanner, Snippet-Tabstops; `postfix.ts`, `postfix-core.ts`, Test `test:postfix`)

* [ ] **Chain-Completion / Smart Completion Tiefe 2**: Vorschläge über Aufrufketten hinweg, die den Zieltyp erfüllen

* [ ] **Inline-Typ-Fehler-Erklärungen**: Komplexe Compiler-Fehler (TS-Generics, Rust-Borrow) automatisch in Klartext übersetzt

* [ ] **Code-Lens erweitert**: Laufzeitkosten, Anzahl Aufrufer, letzte Bearbeiter, Test-Coverage pro Funktion inline

* [~] **Zeilen-Lesezeichen**: ⌘⌥8 setzt/entfernt ein Lesezeichen an der Zeile (amber Marker in Gutter + Overview-Ruler, persistiert pro Datei), ⌘⌥9 springt zum nächsten (`bookmarks.ts`); symbolbasierte Datenfluss-Marker als Ausbau offen

* [x] **Clipboard-Historie mit Kontext**: Copy/Cut aus dem Editor wird mit Quellpfad erfasst (max. 50, dedupe, ≤20k Zeichen), ⌘⇧V öffnet filterbaren Verlauf, Klick fügt an Cursor ein und setzt die System-Zwischenablage (`clipboard-history.ts`); Syntax-Highlighting im Preview fehlt

* [ ] **Typing-Perfektion**: Automatische Tippfehler-Korrektur für Keywords/bekannte Symbole beim Tippen

* [ ] **Editable Peek überall**: Jede Referenz-/Definitionsansicht inline editierbar

* [ ] **Code-Reading-Modus**: Ligaturen, ausgeblendete Imports/Boilerplate, Fokus auf Logik, Annotationen für Leser

## B. Navigation & Verständnis

* [x] **Codebase-Karte / Graph-View**: ⌘⌥I zeigt pro Datei Imports/Importer/Pakete (Parsing inkl. dynamic import/require, Alias-/Index-Auflösung, ripgrep+Gegenprobe — Test `test:filedeps`); „Als Graph" öffnet den interaktiven Ego-Graph als Tab (Importer links, Imports rechts, Bezier-Kanten; Klick re-zentriert mit Spring-Animation, ⌘Klick öffnet die Datei — `dep-graph-page.tsx`); ⌘⌥G öffnet den Projekt-Graph: Top-20-Module im Kreis, Kantendicke = Import-Anzahl, Klick hebt die Kanten eines Moduls hervor (max. 400 Dateien, `project-graph-core.ts` mit Test `test:projectgraph`)

* [ ] **Datenfluss-Analyse visuell**: "Woher kann dieser Wert kommen?" / "Wohin fließt er?" als navigierbare Ansicht

* [ ] **Trail-/Tour-System**: Navigationspfade aufzeichnen und als geführte Code-Touren teilen (Onboarding)

* [x] **Arbeits-Kontexte / Task-Scopes**: ⌘⌥X — Tabs, Splits, Pins und Sidebar-Modus als benannte Kontexte pro Projekt speichern/wechseln/überschreiben (`workspace-contexts.ts`); Breakpoints/Terminalzustände folgen, sobald es sie gibt

* [x] **Repo-Insights**: ⌘⌥7 öffnet eine visuelle Übersicht — Sprachverteilung (Balken mit Sprach-Farben), Commit-Aktivität der letzten 12 Wochen (Balkendiagramm), Top-Beitragende mit Commits/Insertions/Deletions (`repo-insights-page.tsx`, Backends `repo_language_stats`/`repo_contributor_stats`/`repo_activity_buckets`)

* [ ] **Automatische Architektur-Doku**: Live generierte Modul-Übersichten aus dem Code

* [ ] **Frage-basierte Navigation**: "Wo wird der User authentifiziert?" → semantische Suche über Embeddings der Codebase

* [x] **Heatmap im Dateibaum (Änderungsfrequenz)**: ⌘⌥M toggelt amber Punkte im Explorer, Intensität = Commit-Häufigkeit der Datei (git log der letzten 500 Commits, lazy geladen, opt-in; `file-heatmap.ts`); Bug-Dichte/Ownership fehlen

* [ ] **Verlaufs-Graph des eigenen Arbeitstags**: Welche Dateien wann besucht/geändert, als Timeline zum Zurückspringen

## C. Ausführen, Debuggen, Laufzeit

* [ ] **Time-Travel-Debugging nativ**: Rückwärts steppen, Zustand zu jedem Zeitpunkt inspizieren (rr/WinDbg-artig integriert)

* [ ] **Inline-Laufzeitwerte ohne Debugger**: Live-Programming — Werte jeder Zeile beim Speichern/Tippen anzeigen (Quokka-artig, für mehr Sprachen)

* [ ] **Always-On-Profiler**: Flamegraphs pro Testlauf/Run direkt im Editor, Hot-Path-Markierung im Code

* [ ] **Log-Punkte mit UI-Stream**: Strukturierte Logpoint-Ausgaben als filterbare Tabelle statt Konsolen-Text

* [~] **HTTP-Client nativ**: `.http`/`.rest`-Dateien, ⌘⌥Enter führt die Anfrage am Cursor aus (mehrere per `###` getrennt, `@name`, Header, Body); Response im schwebenden Panel mit Status-Ampel, Zeit, Headern und JSON-Pretty-Print. **Environments**: `{{variablen}}` aus `.l8ide/http-env.json`, Umgebung im Panel-Header wählbar (persistiert), Warnung bei nicht gesetzten Variablen (`http-parse.ts` mit Test `test:httpparse`). **cURL-Import**: ⌘⌥5 wandelt einen `curl`-Befehl aus der Zwischenablage in eine `.http`-Anfrage am Cursor um (Header, -d/-X, -u→Basic-Auth, Zeilenumbrüche — `curl-to-http.ts`, Test `test:curl`). **Als cURL kopieren**: Copy-Button im Response-Panel erzeugt aus der ausgeführten Anfrage einen curl-Befehl (`httpToCurl`); Auth-Flows/Codegen fehlen

* [ ] **Datenbank-Client nativ**: Verbindungen, Schema-Browser, Query-Editor mit Completion gegen echtes Schema, ER-Diagramme

* [~] **Prozess-/Service-Dashboard**: ⌘⌥J listet alle lauschenden Dev-Server (Port, Prozessname, PID, Auto-Refresh), Browser-Öffnen und Beenden (SIGTERM mit Bestätigung) pro Eintrag (`ports.rs`, `process-dashboard-page.tsx`); Log-Streams und Container fehlen

* [ ] **Snapshot-Debugging**: Programmzustand einfrieren, teilen, im Editor eines Kollegen wiederherstellen

* [ ] **Deterministische Replay-Aufnahmen von Bugs**: Fehlgeschlagene Läufe aufzeichnen und exakt wieder abspielen

## D. KI (über Copilot-Niveau hinaus)

* [ ] **Lokale Modelle first-class**: Ollama/llama.cpp-Backends nativ, Offline-Completions

* [ ] **Codebase-Wissensgraph für KI**: Persistenter, inkrementell aktualisierter Index (Symbole, Architektur, Konventionen) als Kontextquelle

* [x] **KI-Review vor Commit**: „Review"-Button im SCM-Panel prüft den gestagten Diff auf Bugs/Logikfehler/Sicherheit/Debug-Reste (one-shot, Diff auf 24k gekappt); Ergebnis als grüne/amber Box über der Commit-Eingabe (`reviewStaged` in `git-store.ts`); projekt-spezifische Regeln fehlen

* [ ] **Intent-basierte Snippets**: Beschreibung tippen, Snippet mit projektüblichen Patterns generiert

* [x] **Erklär-Layer**: ⌘⌥E (oder Rechtsklick → „Code erklären") erklärt die Selektion bzw. die umgebende Funktion (via Outline) in einem schwebenden Widget; Erklärungen sind gehasht gecacht (max. 200, persistiert) — zweiter Abruf ist instant und kostet keine Tokens (`explain-layer.ts`)

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

* [~] **Umgebungs-Manager (Node)**: Geforderte Node-Version (`.nvmrc` bzw. `engines.node`) vs. laufende `node -v` im Health-Panel, Major-Mismatch amber (`checkNodeEnv` in `project-health.ts`); Installieren/Umschalten und weitere Runtimes fehlen

* [~] **Secrets-Management**: `.env`-Dateien öffnen in einer maskierten Tabelle (Werte als Punkte, pro Zeile enthüllen/bearbeiten, schreibt zurück; Text-Ansicht umschaltbar — `env-editor.tsx`, `env-parse.ts` mit Test `test:envparse`); Warnung bei fehlendem `.gitignore`-Eintrag (`git check-ignore`, `secrets-guard.ts`); Schema-Validierung/Vault-Sync fehlen

* [~] **Dependency-Dashboard**: ⌘⌥Y — alle deps/devDeps mit deklarierter und tatsächlich installierter Version (aus node_modules, „fehlt" rot), „Auf Updates prüfen" (npm outdated) markiert veraltete mit Ziel-Version (`dep-dashboard.ts`); Vulnerabilities/Lizenzen/Update-PRs fehlen

* [ ] **Monorepo-Bewusstsein**: Paket-Grenzen, betroffene Pakete bei Änderung, gefilterte Task-Ausführung (turbo/nx-Integration nativ)

* [x] **Projekt-Gesundheits-Panel**: Activity-Popover in der Statusbar — Fehler/Warnungen (öffnet Problems), TODO·FIXME·HACK-Zähler (Klick startet Suche, Scan lazy beim Öffnen), geänderte Dateien (öffnet SCM), Ahead/Behind, laufende Dev-Server (`project-health.ts`); Build-/Test-Status und Bundle-Size fehlen

* [ ] **Onboarding-Automat**: Neues Teammitglied klont Repo → IDE erkennt und installiert alles, prüft Systemvoraussetzungen, führt Setup-Tour

* [ ] **Ticket-Integration nativ**: Jira/Linear/GitHub-Issues als View, Branch-aus-Ticket, Commit-Verknüpfung, Status-Updates

## G. Git & Historie (erweitert)

* [x] **First-Class Worktree-UI**: ⌘⌥O listet alle Git-Worktrees (Branch, Pfad, main/locked-Markierung, aktiver hervorgehoben), Klick wechselt den Workspace-Root dorthin, Anlegen (Pfad + Branch) und Entfernen inline (`list_worktrees`/`git_worktree_add/remove`, `worktree-store.ts`)

* [ ] **Interaktives Rebase als GUI**: Commits per Drag\&Drop ordnen, squashen, editieren

* [ ] **Commit-Komposition**: Hunks/Zeilen per Checkbox auf mehrere Commits verteilen (GitButler-artig, virtuelle Branches)

* [x] **Blame-Layer**: ⌘⌥U zykliert aus → aktuelle Zeile → **alle Zeilen** (Autor/Alter inline; „alle" rendert performant nur den sichtbaren Bereich, aktualisiert beim Scrollen; persistiert — `blame-layer.ts`); Commit-Peek als Ausbau offen

* [ ] **Code-Archäologie**: "Zeig mir jede Version dieser Funktion über die Zeit" als Slider

* [x] **Undo-Everything**: ⌘⌥R öffnet das Git-Reflog als Liste (Kurz-Hash, Aktionstyp, Betreff), Klick setzt per `reset --hard` auf den Stand zurück (Bestätigung, selbst wieder übers Reflog auffindbar; `git_reflog`/`git_reset`, `reflog-store.ts`)

* [ ] **Automatische WIP-Snapshots**: Commit-loser Sicherungsstand bei jedem Testlauf/Branch-Wechsel

## H. Terminal & Tasks (erweitert)

* [ ] **Notebook-Terminal**: Kommandos als Zellen mit strukturiertem Output, wiederholbar, teilbar (Warp-artig)

* [ ] **Output-Parser universell**: JSON/Tabellen/Logs im Terminal automatisch als interaktive Tabellen renderbar

* [~] **Kommando-Palette fürs Terminal**: ⌘⇧R öffnet eine filterbare Palette aller package.json-Scripts (mit Kommando-Vorschau, erkannter Paketmanager), Enter führt im Terminal aus; Trust-Gate (`script-palette.tsx`); Parameter-Formulare fehlen

* [ ] **Task-Pipelines visuell**: Build-Abhängigkeiten als Graph, Live-Status pro Knoten

## I. Qualität & Sicherheit

* [~] **Security-Scanning**: „Sicherheit prüfen" im Dependency-Dashboard führt `npm audit` aus und zeigt Schwachstellen nach Schweregrad (kritisch/hoch/mittel/niedrig, grün bei keinen — verifiziert gegen echte npm-audit-JSON); Secret-Detection via `.env`-Gitignore-Warnung (`secrets-guard.ts`); SAST fehlt

* [ ] **Mutation-Testing-Integration**: Schwache Tests direkt im Editor markiert

* [ ] **Performance-Budgets**: Bundle-Size/Startup-Metriken pro PR mit Editor-Warnungen

* [ ] **Flaky-Test-Erkennung**: Historie der Testläufe, Flakiness-Score im Test-Explorer

* [x] **Accessibility-Linting für UI-Code**: Live-a11y-Prüfung in JSX/TSX/HTML (img ohne alt, leerer `<a href>`, onClick ohne role, positiver tabindex, `<html>` ohne lang), 500ms-debounced als Warnungen im Problems-Panel; abschaltbar in Einstellungen (`a11y-lint-core.ts`, Test `test:a11y`)

## J. UI/UX-Innovationen

* [ ] **Canvas-Modus**: Editoren frei auf unendlicher Fläche anordnen (Code + Diagramme + Notizen gemischt)

* [ ] **Eingebettete Diagramme**: Mermaid/Excalidraw-Blöcke in Code-Kommentaren gerendert und editierbar

* [ ] **Präsentationsmodus**: Code-Schritte als Folien mit Highlights (für Talks/Reviews)

* [ ] **Adaptive UI**: Layout wechselt automatisch nach Kontext (Debugging-Layout, Review-Layout, Schreib-Layout)

* [~] **Befehls-Vorhersage**: Nutzungshäufigkeit aller Befehle wird lokal getrackt; bei leerer Suche zeigt die Command-Palette oben eine „Häufig genutzt"-Gruppe (Top 5, Stern-Icon) — deine meistgenutzten Aktionen sind sofort da (`command-registry.ts`); Aktionsfolgen-Makros fehlen

* [x] **Notizen/Scratchpads pro Projekt**: ⌘⌥N öffnet die Projekt-Notizen als Markdown-Tab (Rich-Editor via Milkdown); liegen im App-Data außerhalb des Repos, überleben Branch-Wechsel (`project-notes.ts`)

* [x] **Fokus-Timer & Flow-Schutz**: Pomodoro in der Statusbar (⌘⌥F) — 25 Min Fokus / 5 Min Pause mit Countdown, aktiviert automatisch Do-not-disturb während der Fokusphase und stellt den vorherigen DND-Zustand danach wieder her, Toast mit Anschluss-Aktion (`focus-timer.ts`)

* [ ] **Spatial Audio Cues / haptisches Feedback** für Build-/Testereignisse im Hintergrund

## K. Web-/Frontend-Spezifisch (relevant für l8ide)

* [x] **Eingebauter Browser (Basis)**: Webview-Panel mit Navigation im Dock

* [x] **Browser-Konsole in der IDE**: console.log/warn/error + Fehler/unhandled rejections aus dem Browser-Webview live im Panel (injizierter Hook → lokaler Log-Sink → Tauri-Event; `console_sink.rs`, `browser-console-store.ts`, `browser-console.tsx`); Fehler-Badge am Konsole-Button

* [x] **Native DevTools für den Browser**: Web-Inspector per Button (`browser_devtools`, Tauri-Feature `devtools`)

* [~] **Browser-Preview mit DevTools-Brücke**: Element-Picker in der Browser-Toolbar — Hover highlightet (violette Outline), Klick loggt Selector, Maße, display/position, Schriftgröße und Farbe in die Konsole, Esc bricht ab; Sprung zur JSX-Quelle fehlt (React 19 ohne _debugSource)

* [ ] **Komponenten-Explorer**: Alle UI-Komponenten des Projekts als Galerie mit Props-Playground (Storybook-nativ)

* [~] **Design-Token-Übersicht**: ⌘⌥T sammelt alle CSS-Custom-Properties des Projekts, zeigt Farben als Swatch-Galerie (mit `var()`-Auflösung) und übrige Tokens als Tabelle (`design-tokens-core.ts`, Test `test:tokens`); Figma-Sync und Abweichungs-Warnung fehlen

* [ ] **Visuelles CSS-Editing**: Box-Model/Flex/Grid-Manipulation mit Live-Rückschreibung in die Quelle

* [ ] **State-Inspektion für Frameworks**: React/Vue/Svelte-Komponentenbaum + State im Editor-Panel

* [~] **Responsive-Preview**: Geräte-Presets (iPhone SE/15, Pixel 8, iPad Mini/Pro, Desktop) setzen die Browser-Panel-Breite per Dropdown; Matrix mit mehreren Viewports gleichzeitig fehlt

