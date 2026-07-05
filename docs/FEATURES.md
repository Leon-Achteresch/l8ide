# IDE Feature-Katalog

Referenz für l8ide: Teil 1 listet alle Features von Visual Studio Code detailliert auf, Teil 2 sammelt zusätzliche Features, die über VS Code hinausgehen und in eine moderne IDE eingebaut werden können.

---

# Teil 1: VS Code Features (vollständig)

## 1. Editor-Kern

### 1.1 Textbearbeitung
- [x] **Multi-Cursor-Editing**: Mehrere Cursor gleichzeitig (Alt+Klick, Cmd+D für nächstes Vorkommen, Cmd+Shift+L für alle Vorkommen)
- [x] **Spaltenauswahl / Box-Selection**: Rechteckige Textauswahl (Shift+Alt+Drag)
- [x] **Zeilenoperationen**: Zeile verschieben (Alt+↑/↓), duplizieren (Shift+Alt+↑/↓), löschen (Cmd+Shift+K), Zeilen joinen
- [x] **Smart Selection**: Auswahl semantisch erweitern/verkleinern (Shift+Alt+→/←)
- [x] **Auto-Closing**: Automatisches Schließen von Klammern, Anführungszeichen, Tags
- [x] **Auto-Surround**: Auswahl automatisch mit Klammern/Quotes umschließen
- [x] **Auto-Indentation**: Automatische Einrückung basierend auf Sprache
- [x] **Kommentar-Toggle**: Zeilen- (Cmd+/) und Blockkommentare (Shift+Alt+A)
- [ ] **Groß-/Kleinschreibung transformieren**: Uppercase, Lowercase, Title Case, Snake Case, Camel Case
- [ ] **Sortieren von Zeilen**: Aufsteigend/absteigend
- [ ] **Whitespace-Handling**: Trailing Whitespace anzeigen/entfernen, Render Whitespace
- [x] **Emmet**: Integrierte Abkürzungs-Expansion für HTML/CSS (z.B. `ul>li*5`)
- [ ] **Column Edit Mode**
- [x] **Undo/Redo mit Cursor-Historie**

### 1.2 Code-Intelligenz (IntelliSense)
- [x] **Completions**: Kontextabhängige Vorschläge (Wörter, Symbole, Snippets)
- [x] **Parameter Hints / Signature Help**: Anzeige von Funktionssignaturen beim Tippen
- [x] **Quick Info / Hover**: Typinformationen, Dokumentation, JSDoc beim Hovern
- [ ] **Semantic Highlighting**: Einfärbung basierend auf Symbol-Semantik (nicht nur Syntax) — Monaco TS-Worker liefert keine Semantic Tokens; braucht eigenen Provider
- [x] **Inlay Hints**: Inline-Anzeige von Parameternamen und inferierten Typen
- [ ] **Auto-Imports**: Automatisches Hinzufügen von Import-Statements bei Completion — Monaco-Stock-Worker reicht keine Modul-Export-Preferences durch; braucht Custom-Worker
- [x] **Snippet-Support (eingebaut)**: Monaco-Snippets mit Tabstops und Platzhaltern
- [ ] **Snippet-Support (benutzerdefiniert)**: Eigene Snippets verwalten und konfigurieren
- [x] **Word-Based Suggestions**: Fallback-Vorschläge aus Dokumentinhalt
- [x] **Suggestion-Ranking**: Sortierung nach Relevanz, zuletzt genutzt, Lokalität

### 1.3 Navigation
- [x] **Go to Definition** (F12) und **Peek Definition** (Alt+F12, Inline-Vorschau)
- [x] **Go to Type Definition**
- [ ] **Go to Implementation**
- [ ] **Go to References / Find All References** mit References-View
- [ ] **Go to Symbol in File** (Cmd+Shift+O) mit Gruppierung nach Kategorie
- [ ] **Go to Symbol in Workspace** (Cmd+T)
- [ ] **Go to Line/Column** (Ctrl+G)
- [ ] **Breadcrumbs**: Pfad + Symbolhierarchie über dem Editor, navigierbar
- [ ] **Outline-View**: Symbolbaum der aktuellen Datei in der Sidebar
- [x] **Bracket Matching + Jump to Bracket**
- [ ] **Navigationshistorie**: Zurück/Vorwärts durch Cursor-Positionen (Ctrl+-/Ctrl+Shift+-)
- [ ] **Call Hierarchy**: Eingehende/ausgehende Aufrufe eines Symbols
- [ ] **Type Hierarchy**: Vererbungshierarchie
- [ ] **Sticky Scroll**: Aktuelle Scope-Header (Funktion/Klasse) bleiben oben kleben
- [ ] **Minimap**: Verkleinerte Code-Übersicht mit Highlight-Markern (aktuell deaktiviert)

### 1.4 Refactoring
- [ ] **Rename Symbol** (F2): Projektweites Umbenennen mit Vorschau
- [ ] **Quick Fixes / Code Actions** (Cmd+.): Kontextabhängige Korrekturen
- [ ] **Extract Method / Extract Function**
- [ ] **Extract Variable / Constant**
- [ ] **Inline Variable/Function** (sprachabhängig)
- [ ] **Move to New File**
- [ ] **Organize Imports**: Sortieren + ungenutzte entfernen
- [ ] **Auto Fix on Save**: Code Actions beim Speichern ausführen
- [ ] **Refactor-Preview**: Änderungen vor Anwendung in Diff-Ansicht prüfen

### 1.5 Formatierung & Linting
- [x] **Format Document / Format Selection** (Prettier, Shift+Alt+F)
- [x] **Format on Save**
- [ ] **Format on Paste / on Type**
- [ ] **Formatter-Auswahl pro Sprache** (Default-Formatter-Setting)
- [ ] **EditorConfig-Support**
- [x] **Diagnostics-Anzeige (Editor)**: Syntax-Fehler/Warnungen als Squiggles im Editor
- [ ] **Diagnostics-Anzeige (Workbench)**: Problems-Panel, Minimap-Marker, Explorer-Badges
- [ ] **Problems-Panel**: Filterbar, gruppierbar, mit Quick-Fix-Zugriff

### 1.6 Darstellung
- [x] **Syntax Highlighting** via Monaco-Grammatiken
- [ ] **Semantic Token Highlighting**: Tree-Sitter-ähnliche semantische Token
- [x] **Bracket Pair Colorization**: Farbliche Klammernpaare + Guides
- [x] **Indent Guides** (aktive Einrückungsebene hervorgehoben)
- [x] **Code Folding**: Nach Einrückung oder Sprach-Regionen, Folding-Ranges, `#region`-Marker
- [ ] **Word Wrap**: Konfigurierbar (Spaltenbreite, eingerückt)
- [x] **Zoom (Editor)**: Schriftgröße per Mod+/−/0
- [ ] **Zoom (UI)**: Gesamte Workbench-Skalierung
- [ ] **Font-Ligaturen-Support**
- [ ] **Rulers**: Vertikale Hilfslinien bei definierten Spalten
- [x] **Render Line Highlight**: Aktuelle Zeile hervorheben
- [x] **Cursor-Stile & Animationen**: Block, Line, Underline, Blinken, Smooth Caret Animation
- [x] **Smooth Scrolling**
- [ ] **Color Decorators**: Inline-Farbvorschau + Color Picker in CSS/etc.
- [ ] **Unicode Highlighting**: Warnung vor verwechselbaren/unsichtbaren Zeichen
- [ ] **Whitespace/Control-Character-Rendering**

## 2. Workbench / UI

### 2.1 Layout
- [ ] **Activity Bar**: Umschaltbare Haupt-Views (Explorer, Search, SCM, Debug, Extensions)
- [x] **Primary Sidebar**: Explorer und Suche, ein-/ausblendbar, resizable
- [ ] **Secondary Sidebar**: Zwei unabhängige Seitenleisten
- [x] **Panel (Terminal)**: Integriertes Terminal im unteren Bereich
- [ ] **Panel (Problems/Output/Debug)**: Weitere Panel-Views
- [x] **Editor-Gruppen**: Beliebige Splits (horizontal/vertikal), Grid-Layout
- [x] **Tabs**: Öffnen, Schließen, Pinning, Drag&Drop, Umsortieren, Mod+1–9
- [ ] **Preview-Tabs**: Kursiv, wiederverwendet beim Einzelklick
- [ ] **Tab-Größenmodi & Wheel-Navigation**
- [ ] **Zen Mode**: Ablenkungsfreier Vollbildmodus
- [ ] **Centered Layout**
- [ ] **Fullscreen-Modus**
- [x] **Neues App-Fenster**: Zweites Fenster via Tauri WebviewWindow
- [ ] **Floating/Detached Editor Windows**: Editoren in eigene OS-Fenster ziehen
- [x] **Panel-/Sidebar-Toggle** per Shortcut (Mod+B, Mod+J)
- [ ] **Custom Layout-Presets** (Customize-Layout-Kontrolle)

### 2.2 Kommando-Zugriff
- [ ] **Command Palette** (Cmd+Shift+P): Alle Befehle durchsuchbar
- [x] **Quick Open (Dateien)** (Cmd+P): Fuzzy-Dateisuche
- [ ] **Quick Open (Modifikatoren)**: `@` Symbole, `#` Workspace-Symbole, `:` Zeile, `?` Hilfe
- [x] **Keyboard Shortcuts Editor**: GUI mit Overrides und Konflikterkennung
- [ ] **Keyboard Shortcuts (JSON, Chords, when-Klauseln)**
- [ ] **Keymap-Extensions**: Vim, Emacs, Sublime, IntelliJ-Emulation

### 2.3 Dateiverwaltung (Explorer)
- [x] **Dateibaum**: Erstellen, Umbenennen, Löschen, Drag&Drop, Multi-Select
- [ ] **Compact Folders**: Zusammenfassen einzelner verschachtelter Ordner
- [ ] **File Nesting**: Zugehörige Dateien unterordnen (z.B. `.js` unter `.ts`)
- [x] **Datei-Dekorationen (Icons)**: Datei- und Ordner-Icons nach Typ
- [ ] **Datei-Dekorationen (Git/Fehler)**: Git-Status, Fehler-Badges, Farben
- [ ] **Open Editors-Sektion**
- [ ] **Timeline-View**: Lokale Historie + Git-Historie pro Datei
- [ ] **Local History**: Automatische lokale Snapshots mit Wiederherstellung/Diff
- [x] **Layout-Persistenz**: Tabs, Gruppen und Sidebar-Zustand überleben Neustart
- [ ] **Hot Exit (Inhalt)**: Ungespeicherte Editor-Inhalte überleben Neustart
- [x] **Auto Save**: afterDelay, ein-/ausschaltbar im Logo-Menü
- [x] **Große-Dateien-Handling**: TS/JS-Workspace-Sync begrenzt auf große Dateien
- [ ] **Vergleich**: Zwei Dateien auswählen und diffen, Diff mit Zwischenablage
- [ ] **Readonly-Modus pro Datei/Glob**
- [x] **Zu .gitignore hinzufügen**: Kontextmenü schreibt Einträge in `.gitignore`
- [x] **Dateien/Ordner ausblenden**: Manuell per Name (global/workspace)
- [x] **`.git` standardmäßig ausblenden**

### 2.4 Suche
- [x] **Volltextsuche im Workspace** (ripgrep-basiert): Regex, Case, Whole Word
- [x] **Include/Exclude-Globs**
- [x] **Respektierung von `.gitignore`** in Workspace-Suche und Datei-Index
- [ ] **`.gitignore`-Respektierung abschaltbar**
- [ ] **`.gitignore`-Filter im Explorer** (aktuell nur manuelles Ausblenden)
- [x] **Search & Replace projektweit**: Replace All, pro Datei, einzeln
- [ ] **Search & Replace mit Vorschau**: Diff-Vorschau, Regex-Capture-Groups, Case-Preserving Replace
- [ ] **Search Editor**: Suchergebnisse als editierbares Dokument
- [ ] **Suche in geöffneten Editoren**
- [x] **Suchergebnis-Kontextzeilen**
- [x] **In-File-Suche** (Cmd+F) via Monaco

### 2.5 Personalisierung
- [x] **Color Themes**: Hell/Dunkel mit OS-Sync via next-themes
- [ ] **Color Themes (Marketplace)**: Installierbar, eigene definierbar
- [x] **File Icon Themes (Basis)**: Datei-/Ordner-Icons ein-/ausschaltbar
- [ ] **Product Icon Themes**
- [x] **Settings (GUI)**: Dark Mode, Icons, Hidden Files, Trust, Prettier
- [ ] **Settings (JSON & Ebenen)**: `settings.json`, User-/Workspace-/Folder-Ebenen, sprach-spezifische Settings
- [ ] **Settings Sync**: Einstellungen, Keybindings, Extensions, Snippets, UI-State über Geräte synchronisieren
- [ ] **Profiles**: Komplette Konfigurationsprofile (Settings + Extensions + Layout) pro Anwendungsfall, Import/Export, Templates
- [x] **Workspace Trust**: Restricted Mode für nicht vertrauenswürdige Ordner
- [x] **Custom Title Bar**: Tauri Overlay Title Bar
- [ ] **Lokalisierung**: UI in vielen Sprachen

## 3. Sprachen-Support

- [x] **Eingebaut (Basis)**: JavaScript, TypeScript, JSON, HTML, CSS via Monaco-Workers
- [ ] **Eingebaut (vollständig)**: Syntax für ~40 Sprachen
- [ ] **Language Server Protocol (LSP)**: Standardisierte Anbindung beliebiger Sprachserver
- [x] **TypeScript/JavaScript IntelliSense (Basis)**: Completions, Hover, Navigation, tsconfig-Sync
- [ ] **TypeScript/JavaScript (vollständig)**: Refactorings, Auto-Imports, semantische Validation
- [x] **Markdown-Vorschau**: Split-View mit Editor
- [ ] **Markdown (erweitert)**: Live gescrollt-synchronisiert, Linkvalidierung, Pfad-Completions, Mermaid
- [x] **JSON Schema-Validierung**: Schema Store mit Completions
- [x] **HTML/CSS (Basis)**: Tag-Completion und CSS-Worker via Monaco
- [ ] **HTML/CSS (erweitert)**: Color Picker, Specificity-Hover
- [ ] **Notebooks**: Jupyter-Notebook-UI nativ (Zellen, Kernels, Outputs, Variablen-Explorer via Extension)

## 4. Versionskontrolle (Git & SCM)

- [ ] **Git-Integration nativ**: Stage, Unstage, Commit, Amend, Push, Pull, Fetch, Sync
- [ ] **Branch-Management**: Erstellen, Wechseln, Mergen, Publish, Branch-Anzeige in Statusbar
- [ ] **Diff-Ansichten**: Side-by-Side und Inline, gestagte vs. Working-Tree-Änderungen
- [ ] **Gutter-Indikatoren**: Hinzugefügte/geänderte/gelöschte Zeilen am Rand, Inline-Peek mit Revert
- [ ] **Merge-Konflikt-Editor**: 3-Wege-Merge-Editor mit Incoming/Current/Result
- [ ] **Commit-Eingabe** mit Message-Vervollständigung, Commit-Hooks-Unterstützung
- [ ] **Git Blame** (via Extension/Timeline), **File History** in Timeline
- [ ] **Stashes, Tags, Submodule, Worktrees** (Basis-Support)
- [ ] **Multi-Repo-Support**: Mehrere Repositories im Workspace
- [ ] **GitHub-Integration** (Extension von MS): PRs erstellen/reviewen/mergen, Issues, Codespaces
- [ ] **SCM-Provider-API**: Andere VCS via Extensions (SVN, Mercurial, Perforce)
- [ ] **Incoming/Outgoing Changes-Ansicht**
- [ ] **Git Graph / Source Control Graph**: Commit-Graph-Visualisierung
- [x] **Zu .gitignore hinzufügen**: Dateien/Ordner per Kontextmenü ignorieren

## 5. Debugging

- [ ] **Debug Adapter Protocol (DAP)**: Standardisierte Anbindung beliebiger Debugger
- [ ] **Node.js/JavaScript-Debugger eingebaut** (inkl. Browser-Debugging via Chrome/Edge)
- [ ] **Breakpoints**: Standard, Conditional (Expression), Hit Count, Logpoints (Logging ohne Stop), Function Breakpoints, Data Breakpoints, Triggered Breakpoints (abhängig von anderem Breakpoint), Inline Breakpoints
- [ ] **Ausführungssteuerung**: Continue, Step Over/Into/Out, Restart, Stop, Restart Frame
- [ ] **Variablen-Ansicht**: Scopes, Lazy Evaluation, Wertänderung zur Laufzeit, Kopieren
- [ ] **Watch-Ausdrücke**
- [ ] **Call Stack** mit Multi-Thread-/Multi-Session-Support
- [ ] **Debug Console / REPL**: Ausdrücke im aktuellen Kontext auswerten
- [ ] **Inline Values**: Variablenwerte direkt im Code während Debugging
- [ ] **Hover-Evaluation** während Debug-Session
- [ ] **launch.json**: Konfigurationen, Compounds (mehrere Debugger parallel), Variablensubstitution
- [ ] **Auto-Attach & JavaScript Debug Terminal**: Node-Prozesse automatisch debuggen
- [ ] **Debug-Toolbar & Statusbar-Färbung**
- [ ] **Exception Breakpoints**: Bei (un)caught Exceptions stoppen
- [ ] **Disassembly View** (bei unterstützten Debuggern)
- [ ] **DAP-Memory-Inspection** (Hex-Editor via Extension)

## 6. Terminal

- [x] **Integriertes Terminal**: xterm.js-Terminal im Panel
- [x] **Multiple Terminals**: Terminal-Tabs mit Plus-Button
- [ ] **Split-Terminals**
- [ ] **Terminal-Profile**: bash, zsh, fish, PowerShell, cmd, WSL, benutzerdefiniert
- [ ] **Shell Integration**: Command-Tracking (Erfolg/Fehler-Marker), Navigation zwischen Kommandos, Command-History (Rerun), Working-Directory-Erkennung
- [ ] **Quick Fixes im Terminal**: z.B. Port-belegt-Vorschläge, Git-Push-Vorschläge
- [ ] **Links im Terminal**: Datei-/URL-/Zeilen-Links klickbar
- [ ] **Find im Terminal**
- [x] **GPU-beschleunigtes Rendering**: WebGL-Addon mit Canvas-Fallback
- [ ] **Terminal-Persistenz**: Sessions überleben Reload/Fensterwechsel
- [ ] **Sticky Scroll im Terminal** (aktuelles Kommando bleibt sichtbar)
- [ ] **Image-Support im Terminal** (Sixel/iTerm-Protokoll)
- [ ] **Environment-Variable-Injection durch Extensions**
- [ ] **Automation-Terminal für Tasks**

## 7. Tasks & Build

- [ ] **Task-System** (`tasks.json`): Shell-/Prozess-Tasks, Compound Tasks (dependsOn, Reihenfolge)
- [ ] **Task-Auto-Detection**: npm-Scripts, TypeScript, Gulp, Grunt, Jake
- [ ] **Problem Matchers**: Compiler-Output in Problems-Panel parsen (eingebaut + eigene Regex)
- [ ] **Background/Watch-Tasks** mit Begin/End-Patterns
- [ ] **Default Build/Test Task** (Cmd+Shift+B)
- [ ] **Task-Presentation-Optionen**: Panel-Verhalten, Fokus, Clear
- [ ] **NPM-Scripts-View** im Explorer

## 8. Testing

- [ ] **Test Explorer nativ**: Baumansicht aller Tests, Run/Debug einzeln oder gebündelt
- [ ] **Test-Dekorationen im Editor**: Run-Buttons an Testfunktionen, Status-Icons
- [ ] **Test-Ergebnisse-Panel**, Fehler-Peek direkt an der Assertion
- [ ] **Coverage-Ansicht nativ**: Zeilen-Coverage im Editor + Coverage-Übersicht
- [ ] **Continuous Run**: Tests bei Änderung automatisch
- [ ] **Test-Profile**: Run/Debug/Coverage pro Framework via Extension-API

## 9. Remote-Entwicklung

- [ ] **Remote-SSH**: Voller Workspace auf entferntem Server, Extensions laufen remote
- [ ] **Dev Containers**: Entwicklung in Docker-Containern, `devcontainer.json`-Standard
- [ ] **WSL-Integration**: Nahtlos in Windows Subsystem for Linux arbeiten
- [ ] **GitHub Codespaces**: Cloud-Dev-Umgebungen
- [ ] **Remote Tunnels**: Eigene Maschine via `code tunnel` von überall erreichbar
- [ ] **vscode.dev / github.dev**: Voller Editor im Browser, ohne Installation
- [ ] **Port-Forwarding**: Automatische Erkennung + manuelles Forwarding, öffentliche/private Ports

## 10. Extensions & API

- [ ] **Extension Marketplace**: Suche, Installation, Updates, Ratings, Kategorien
- [ ] **Extension-Verwaltung**: Aktivieren/Deaktivieren (global/pro Workspace), Auto-Update-Steuerung, Version-Pinning, VSIX-Installation
- [ ] **Extension-Empfehlungen**: Pro Workspace (`extensions.json`), pro Dateityp
- [ ] **Extension Profiles / Extension Packs**
- [ ] **Web Extensions**: Extensions, die im Browser laufen
- [ ] **Extension-API-Flächen**: Commands, Views/TreeViews, Webviews, Custom Editors, Notebook-API, Language-APIs, Debug-API, SCM-API, Terminal-API, Tasks-API, Authentication-API, FileSystem-Provider (virtuelle Dateisysteme), TextDocumentContentProvider, StatusBar/QuickPick/InputBox-UI, CodeLens, Decorations, Comments-API, Testing-API, Chat-/Language-Model-API
- [ ] **Extension Host-Isolation**: Extensions crashen nicht die UI
- [ ] **Extension Bisect**: Automatisches Halbieren zum Finden problematischer Extensions
- [ ] **Untrusted-Workspace- und Virtual-Workspace-Capabilities**

## 11. KI-Features (GitHub Copilot-Integration)

- [ ] **Inline Completions**: Ghost-Text-Vervollständigung ganzer Zeilen/Blöcke
- [ ] **Next Edit Suggestions**: Vorhersage der nächsten Änderung an anderer Stelle
- [ ] **Copilot Chat**: Chat-Panel mit Codebase-Kontext, Slash-Commands, Teilnehmer (@workspace, @terminal, @vscode)
- [ ] **Inline Chat**: Chat direkt im Editor an der Cursor-Position (Cmd+I)
- [ ] **Edits/Agent Mode**: Multi-File-Änderungen autonom mit Diff-Review, Terminal-Ausführung, Selbstkorrektur
- [ ] **Commit-Message-Generierung**
- [ ] **Chat-Kontext**: Dateien, Symbole, Ordner, Bilder anhängen
- [ ] **Custom Instructions** (`.github/copilot-instructions.md`) und Prompt-Files
- [ ] **MCP-Support (Model Context Protocol)**: Externe Tools/Server im Agent Mode
- [ ] **Terminal-Command-Vorschläge und -Erklärungen**
- [ ] **AI-gestützte Rename-Vorschläge**
- [ ] **Sprachmodell-Auswahl** (verschiedene Modelle)
- [ ] **Language Model API** für Extensions

## 12. Diff, Merge & Review

- [ ] **Diff-Editor**: Side-by-Side/Inline, Moved-Code-Detection, Wortebene-Highlighting, Collapse Unchanged Regions
- [ ] **Multi-File-Diff-Editor**: Alle Änderungen in einer scrollbaren Ansicht
- [ ] **3-Wege-Merge-Editor**
- [ ] **Comments-API**: Review-Kommentare in Dateien (für PR-Extensions)

## 13. Accessibility

- [ ] **Screen-Reader-Support** (NVDA, JAWS, VoiceOver optimiert)
- [ ] **Accessible View**: Beliebige UI-Inhalte als navigierbarer Text (Alt+F2)
- [ ] **Audio Cues / Sound-Signale**: Töne für Fehler, Breakpoints, Zeilenänderungen
- [ ] **Accessibility Help Dialog** pro Kontext
- [ ] **High-Contrast-Themes**
- [ ] **Tastatur-Vollbedienbarkeit**, Tab-Trapping-Steuerung
- [ ] **Voice-Eingabe** (Dictation via Extension)
- [ ] **Zoom & Schriftskalierung überall**

## 14. Sonstiges

- [ ] **Statusbar**: Sprache, Encoding, EOL, Einrückung, Zeile/Spalte, Branch, Fehlerzähler, Ports, alles klickbar
- [x] **Notifications**: Toast-Benachrichtigungen via Sonner
- [ ] **Notifications-Center** mit Do-not-disturb
- [ ] **Walkthroughs / Getting Started**: Interaktive Onboarding-Guides (auch von Extensions)
- [ ] **Screencast Mode**: Tastenanzeige für Demos/Videos
- [ ] **Process Explorer** und **Runtime Status** für Performance-Analyse
- [x] **Developer Tools (Dev)**: TanStack Router Devtools im Entwicklungsmodus
- [ ] **CLI**: `code` mit Diff (`-d`), Goto (`-g file:line`), Merge, Install-Extension, Tunnel, Serve-Web
- [ ] **URL-Handling**: `vscode://`-Protokoll für Deep Links
- [ ] **Encoding-Support**: Auto-Detection, Re-Open/Save with Encoding
- [ ] **EOL-Handling**: LF/CRLF-Konvertierung
- [ ] **Simple File Dialog / native Dialoge konfigurierbar**
- [ ] **Telemetrie-Steuerung** (aus/Fehler/alles)
- [ ] **Update-Kanäle**: Stable + Insiders, Hintergrund-Updates
- [ ] **Multi-Root-Workspaces**: Mehrere Ordner in einem Fenster mit Ordner-Settings
- [ ] **Workspace-Datei** (`.code-workspace`)
- [x] **Bild-Vorschau**: PNG, JPEG, GIF, WebP, SVG etc. im Editor
- [ ] **Hex-Editor, Audio/Video-Player** (eingebaute Viewer für Binärformate)
- [ ] **Interactive Window / REPL** (Python u.a.)
- [ ] **Snippets-Verwaltung**: Global, pro Sprache, pro Projekt

---

# Teil 2: Zusätzliche Features über VS Code hinaus

Ideen, die VS Code nicht oder nur schwach abdeckt — Kandidaten für l8ide.

## A. Editor & Code-Intelligenz

- [ ] **Strukturelles Editieren (AST-basiert)**: Ausdrücke/Statements als Einheiten verschieben, tauschen, umschließen (Paredit-artig für alle Sprachen via Tree-sitter)
- [ ] **Strukturelle Suche & Replace**: Suchen nach Code-Mustern statt Text (wie IntelliJ SSR / ast-grep integriert)
- [ ] **Multi-File-Rename mit Datei-/Ordnernamen-Kopplung**: Symbol umbenennen benennt Datei, Tests, Storybook-Dateien mit um
- [ ] **Postfix-Completions**: `expr.if`, `expr.log`, `expr.return` expandieren zu Konstrukten (IntelliJ-Feature)
- [ ] **Chain-Completion / Smart Completion Tiefe 2**: Vorschläge über Aufrufketten hinweg, die den Zieltyp erfüllen
- [ ] **Inline-Typ-Fehler-Erklärungen**: Komplexe Compiler-Fehler (TS-Generics, Rust-Borrow) automatisch in Klartext übersetzt
- [ ] **Code-Lens erweitert**: Laufzeitkosten, Anzahl Aufrufer, letzte Bearbeiter, Test-Coverage pro Funktion inline
- [ ] **Permanente Highlight-Marker**: Symbole dauerhaft farblich markieren, um Datenfluss zu verfolgen
- [ ] **Clipboard-Historie mit Kontext**: Woher kopiert, mit Syntax-Highlighting, durchsuchbar
- [ ] **Typing-Perfektion**: Automatische Tippfehler-Korrektur für Keywords/bekannte Symbole beim Tippen
- [ ] **Editable Peek überall**: Jede Referenz-/Definitionsansicht inline editierbar
- [ ] **Code-Reading-Modus**: Ligaturen, ausgeblendete Imports/Boilerplate, Fokus auf Logik, Annotationen für Leser

## B. Navigation & Verständnis

- [ ] **Codebase-Karte / Graph-View**: Interaktiver Abhängigkeitsgraph (Module, Symbole, Importe) mit Zoom-Ebenen
- [ ] **Datenfluss-Analyse visuell**: "Woher kann dieser Wert kommen?" / "Wohin fließt er?" als navigierbare Ansicht
- [ ] **Trail-/Tour-System**: Navigationspfade aufzeichnen und als geführte Code-Touren teilen (Onboarding)
- [ ] **Arbeits-Kontexte / Task-Scopes**: Benannte Sets aus offenen Dateien, Breakpoints, Terminalzuständen — pro Ticket/Feature umschaltbar
- [ ] **Automatische Architektur-Doku**: Live generierte Modul-Übersichten aus dem Code
- [ ] **Frage-basierte Navigation**: "Wo wird der User authentifiziert?" → semantische Suche über Embeddings der Codebase
- [ ] **Heatmap im Dateibaum**: Änderungsfrequenz, Bug-Dichte, Ownership farblich im Explorer
- [ ] **Verlaufs-Graph des eigenen Arbeitstags**: Welche Dateien wann besucht/geändert, als Timeline zum Zurückspringen

## C. Ausführen, Debuggen, Laufzeit

- [ ] **Time-Travel-Debugging nativ**: Rückwärts steppen, Zustand zu jedem Zeitpunkt inspizieren (rr/WinDbg-artig integriert)
- [ ] **Inline-Laufzeitwerte ohne Debugger**: Live-Programming — Werte jeder Zeile beim Speichern/Tippen anzeigen (Quokka-artig, für mehr Sprachen)
- [ ] **Always-On-Profiler**: Flamegraphs pro Testlauf/Run direkt im Editor, Hot-Path-Markierung im Code
- [ ] **Log-Punkte mit UI-Stream**: Strukturierte Logpoint-Ausgaben als filterbare Tabelle statt Konsolen-Text
- [ ] **HTTP-Client nativ**: `.http`-Dateien + Response-Viewer, Environments, Auth-Flows, Codegen (IntelliJ-Feature)
- [ ] **Datenbank-Client nativ**: Verbindungen, Schema-Browser, Query-Editor mit Completion gegen echtes Schema, ER-Diagramme
- [ ] **Prozess-/Service-Dashboard**: Alle dev-Prozesse (Server, Watcher, Container) mit Status, Logs, Ports, Restart-Buttons
- [ ] **Snapshot-Debugging**: Programmzustand einfrieren, teilen, im Editor eines Kollegen wiederherstellen
- [ ] **Deterministische Replay-Aufnahmen von Bugs**: Fehlgeschlagene Läufe aufzeichnen und exakt wieder abspielen

## D. KI (über Copilot-Niveau hinaus)

- [ ] **Lokale Modelle first-class**: Ollama/llama.cpp-Backends nativ, Offline-Completions
- [ ] **Codebase-Wissensgraph für KI**: Persistenter, inkrementell aktualisierter Index (Symbole, Architektur, Konventionen) als Kontextquelle
- [ ] **KI-Review vor Commit**: Automatischer Diff-Review mit projekt-spezifischen Regeln als Pre-Commit-Stufe
- [ ] **Intent-basierte Snippets**: Beschreibung tippen, Snippet mit projektüblichen Patterns generiert
- [ ] **Erklär-Layer**: Jede Funktion auf Wunsch mit generierter, gecachter Zusammenfassung im Hover
- [ ] **KI-gestützte Merge-Konfliktlösung** mit Begründung pro Hunk
- [ ] **Automatische Doku-/Changelog-Pflege**: Bei Merge Änderungsvorschläge für README/Docs
- [ ] **Multi-Agent-Orchestrierung sichtbar**: Parallele Agenten mit eigenem Worktree, Live-Diff-Ansicht, Approve/Reject pro Agent

## E. Zusammenarbeit

- [ ] **Echtzeit-Kollaboration nativ**: Multiplayer-Editing mit Cursorn, Follow-Modus, geteilten Terminals/Servern (Live-Share-Niveau, aber eingebaut)
- [ ] **Asynchrone Code-Kommentare im Editor**: Threads an Code-Zeilen, versioniert im Repo, ohne PR-Kontext
- [ ] **Pair-Programming-Modus**: Rollen (Driver/Navigator), Timer, Übergabe-Handshake
- [ ] **Team-Awareness**: Wer arbeitet gerade in welcher Datei/Branch (opt-in), Konflikt-Frühwarnung vor dem Push
- [ ] **Review-Modus im Editor**: PR-Review komplett lokal mit Checkout, Kommentaren, Suggestions, ohne Browser
- [ ] **Geteilte Debug-Sessions**: Breakpoints und Stepping gemeinsam

## F. Projekt- & Umgebungsmanagement

- [ ] **Umgebungs-Manager nativ**: Node/Python/Ruby/Java-Versionen pro Projekt erkennen, installieren, umschalten (mise/asdf integriert)
- [ ] **Secrets-Management**: `.env`-Editor mit Maskierung, Schema-Validierung, Sync mit Vaults, Warnung bei Commit von Secrets
- [ ] **Dependency-Dashboard**: Alle Abhängigkeiten mit Versionen, Vulnerabilities, Lizenzchecks, Update-PRs per Klick
- [ ] **Monorepo-Bewusstsein**: Paket-Grenzen, betroffene Pakete bei Änderung, gefilterte Task-Ausführung (turbo/nx-Integration nativ)
- [ ] **Projekt-Gesundheits-Panel**: Build-Status, Test-Status, Lint-Schulden, TODO-Zähler, Bundle-Size auf einen Blick
- [ ] **Onboarding-Automat**: Neues Teammitglied klont Repo → IDE erkennt und installiert alles, prüft Systemvoraussetzungen, führt Setup-Tour
- [ ] **Ticket-Integration nativ**: Jira/Linear/GitHub-Issues als View, Branch-aus-Ticket, Commit-Verknüpfung, Status-Updates

## G. Git & Historie (erweitert)

- [ ] **First-Class Worktree-UI**: Worktrees als Tabs/Fenster mit eigenem Zustand, schnelles Umschalten
- [ ] **Interaktives Rebase als GUI**: Commits per Drag&Drop ordnen, squashen, editieren
- [ ] **Commit-Komposition**: Hunks/Zeilen per Checkbox auf mehrere Commits verteilen (GitButler-artig, virtuelle Branches)
- [ ] **Blame-Layer permanent**: Dezente Autor/Alter-Anzeige pro Zeile, mit Commit-Peek (GitLens nativ)
- [ ] **Code-Archäologie**: "Zeig mir jede Version dieser Funktion über die Zeit" als Slider
- [ ] **Undo-Everything**: Journal aller Git-Operationen mit Ein-Klick-Rückgängig (reflog als UI)
- [ ] **Automatische WIP-Snapshots**: Commit-loser Sicherungsstand bei jedem Testlauf/Branch-Wechsel

## H. Terminal & Tasks (erweitert)

- [ ] **Notebook-Terminal**: Kommandos als Zellen mit strukturiertem Output, wiederholbar, teilbar (Warp-artig)
- [ ] **Output-Parser universell**: JSON/Tabellen/Logs im Terminal automatisch als interaktive Tabellen renderbar
- [ ] **Kommando-Palette fürs Terminal**: Projektspezifische Befehle mit Beschreibung, Parametern als Formular
- [ ] **Task-Pipelines visuell**: Build-Abhängigkeiten als Graph, Live-Status pro Knoten

## I. Qualität & Sicherheit

- [ ] **Security-Scanning nativ**: SAST + Dependency-Audit + Secret-Detection im Problems-Panel
- [ ] **Mutation-Testing-Integration**: Schwache Tests direkt im Editor markiert
- [ ] **Performance-Budgets**: Bundle-Size/Startup-Metriken pro PR mit Editor-Warnungen
- [ ] **Flaky-Test-Erkennung**: Historie der Testläufe, Flakiness-Score im Test-Explorer
- [ ] **Accessibility-Linting für UI-Code**: Live-a11y-Prüfung in JSX/Templates mit Vorschau

## J. UI/UX-Innovationen

- [ ] **Canvas-Modus**: Editoren frei auf unendlicher Fläche anordnen (Code + Diagramme + Notizen gemischt)
- [ ] **Eingebettete Diagramme**: Mermaid/Excalidraw-Blöcke in Code-Kommentaren gerendert und editierbar
- [ ] **Präsentationsmodus**: Code-Schritte als Folien mit Highlights (für Talks/Reviews)
- [ ] **Adaptive UI**: Layout wechselt automatisch nach Kontext (Debugging-Layout, Review-Layout, Schreib-Layout)
- [ ] **Befehls-Vorhersage**: Häufige Aktionsfolgen lernen und als Ein-Klick-Makro anbieten
- [ ] **Notizen/Scratchpads pro Projekt**: Markdown-Notizen mit Code-Links, die Refactorings überleben
- [ ] **Fokus-Timer & Flow-Schutz**: Benachrichtigungen bündeln, Pomodoro, "nicht stören" bei aktiver Tipp-Phase
- [ ] **Spatial Audio Cues / haptisches Feedback** für Build-/Testereignisse im Hintergrund

## K. Web-/Frontend-Spezifisch (relevant für l8ide)

- [x] **Eingebauter Browser (Basis)**: Webview-Panel mit Navigation im Dock
- [ ] **Browser-Preview mit DevTools-Brücke**: Element-Klick im Browser springt zur JSX/Component-Quelle
- [ ] **Komponenten-Explorer**: Alle UI-Komponenten des Projekts als Galerie mit Props-Playground (Storybook-nativ)
- [ ] **Design-Token-Sync**: Farben/Spacing aus Figma/Tokens-Datei mit Inline-Vorschau und Abweichungs-Warnung
- [ ] **Visuelles CSS-Editing**: Box-Model/Flex/Grid-Manipulation mit Live-Rückschreibung in die Quelle
- [ ] **State-Inspektion für Frameworks**: React/Vue/Svelte-Komponentenbaum + State im Editor-Panel
- [ ] **Responsive-Preview-Matrix**: Mehrere Viewports gleichzeitig live
