# Editor für React und Frontend

L8IDE nutzt Monaco mit TypeScript/JavaScript-Sprachdiensten, Emmet, React-TSX-Unterstützung, Projektmodellen, Navigation, Refactorings, Vorschau von Definitionen, Problems-Ansicht und integriertem Terminal. Die TypeScript-Einstellungen werden aus `tsconfig.json` gelesen, einschließlich lokaler und paketbasierter `extends`-Konfigurationen. Bei Projektverweisen wird eine App-/Web-/Client-Konfiguration bevorzugt. Für importierte Pakete lädt L8IDE deren `package.json` und Typdeklarationen aus dem lokalen `node_modules`, einschließlich `@types`-Paketen und transitiver Typimporte. Nicht auflösbare Module bleiben als TypeScript-Fehler sichtbar.

## Projekt starten

Der grüne Startknopf rechts oben führt das zuletzt gewählte `package.json`-Skript aus. Der Pfeil daneben zeigt alle Skripte und lässt `bun`, `pnpm`, `yarn` oder `npm` auswählen. Ohne vorherige Auswahl wird `dev`, danach `start`, `serve` oder `preview` bevorzugt. Jeder Start öffnet eine eigene Terminalgruppe im Projektordner. Startet ein Entwicklungsserver auf einem neuen lokalen Port, öffnet L8IDE dessen integrierte Browser-Vorschau automatisch. Die Auswahl wird pro Projekt gespeichert. Wie bei anderen ausführbaren Projektfunktionen muss der Ordner als vertrauenswürdig markiert sein.

## Formatter und Linter

Unter **Einstellungen → Formatter und Linter** lässt sich der Formatter pro Sprache auswählen: eingebautes Prettier, projektlokales Prettier oder projektlokales Biome. Für Projektwerkzeuge müssen die entsprechenden Pakete im Projekt installiert sein, zum Beispiel `npm install -D prettier @biomejs/biome eslint`. Biome und ESLint verwenden die Konfiguration des geöffneten Projekts.

ESLint prüft Änderungen im Editor nach kurzer Pause. Biome prüft beim Öffnen und nach dem Speichern die gespeicherte Datei. Beide liefern Treffer an Monaco und die Problems-Ansicht sowie verfügbare Schnellkorrekturen an die Glühbirne; für ESLint gibt es auch „alle korrigieren“. Biome- und Projekt-Prettier-Formatierung verarbeiten ganze Dokumente; die Auswahlformatierung verwendet nur das eingebaute Prettier.

Testdateien erhalten Run-CodeLenses und erscheinen im Test-Explorer. Vitest, Jest und Bun liefern dort Einzelergebnisse; einzelne Tests lassen sich in einer eigenen Terminalgruppe starten. JavaScript- und TypeScript-Dateien lassen sich über den Node-Inspector debuggen. Für TSX und TypeScript mit projektabhängiger Transformation verwendet L8IDE das lokal installierte `tsx`; einfaches TypeScript kann Node direkt ausführen.

Mit `Ctrl`/`Cmd` über einem Symbol erscheint die Definitionsvorschau. Ein Klick öffnet die Definition im Peek-Fenster. `F12` springt zur Definition, `Alt+F12` öffnet Peek, `F2` benennt um und `Shift+F12` zeigt Referenzen, sofern der Sprachdienst sie liefert.

VS-Code-`VSIX`-Pakete werden nicht geladen. Monaco unterstützt diese Pakete nicht direkt; die IDE-Funktionen werden hier einzeln integriert. Die TypeScript-Integration hält höchstens 2.000 Projekt-Quelldateien sowie 1.500 Paketdateien aus höchstens 100 Paketen vor, damit große Projekte bedienbar bleiben. Diese Grenzen und die eingebauten Test-/Debug-Protokolle bedeuten, dass nicht jede Funktion oder Erweiterung aus VS Code/WebStorm bereits verfügbar ist.

## Technische Quellen

- [Monaco FAQ zur VS-Code-Erweiterungskompatibilität](https://github.com/microsoft/monaco-editor#faq)
- [VS Code: Code Navigation und Peek](https://code.visualstudio.com/docs/editing/editingevolved)
- [Biome CLI und Reporter](https://biomejs.dev/reference/cli/)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)
- [Prettier CLI](https://prettier.io/docs/cli)
- [Bun-Test-CLI](https://bun.sh/docs/test)
- [Node-TypeScript-Ausführung](https://nodejs.org/api/typescript.html)
