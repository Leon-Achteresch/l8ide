# Editor für React und Frontend

L8IDE nutzt Monaco mit TypeScript/JavaScript-Sprachdiensten, Emmet, React-TSX-Unterstützung, Projektmodellen, Navigation, Refactorings, Vorschau von Definitionen, Problems-Ansicht und integriertem Terminal. Die TypeScript-Einstellungen werden aus `tsconfig.json` gelesen. Bei Projektverweisen wird eine App-/Web-/Client-Konfiguration bevorzugt. Die Deklarationen von React, React DOM und ihren direkten Typabhängigkeiten werden aus `node_modules` geladen, wenn sie vorhanden sind.

## Projekt starten

Der grüne Startknopf rechts oben führt das zuletzt gewählte `package.json`-Skript aus. Der Pfeil daneben zeigt alle Skripte und lässt `bun`, `pnpm`, `yarn` oder `npm` auswählen. Ohne vorherige Auswahl wird `dev`, danach `start`, `serve` oder `preview` bevorzugt. Jeder Start öffnet eine eigene Terminalgruppe im Projektordner. Die Auswahl wird pro Projekt gespeichert. Wie bei anderen ausführbaren Projektfunktionen muss der Ordner als vertrauenswürdig markiert sein.

## Formatter und Linter

Unter **Einstellungen → Formatter und Linter** lässt sich der Formatter pro Sprache auswählen: eingebautes Prettier, projektlokales Prettier oder projektlokales Biome. Für Projektwerkzeuge müssen die entsprechenden Pakete im Projekt installiert sein, zum Beispiel `npm install -D prettier @biomejs/biome eslint`. Biome und ESLint verwenden die Konfiguration des geöffneten Projekts.

ESLint prüft Änderungen im Editor nach kurzer Pause. Biome prüft beim Öffnen und nach dem Speichern die gespeicherte Datei. Beide liefern Treffer an Monaco und die Problems-Ansicht. Biome- und Projekt-Prettier-Formatierung verarbeiten ganze Dokumente; die Auswahlformatierung verwendet nur das eingebaute Prettier.

Mit `Ctrl`/`Cmd` über einem Symbol erscheint die Definitionsvorschau. Ein Klick öffnet die Definition im Peek-Fenster. `F12` springt zur Definition, `Alt+F12` öffnet Peek, `F2` benennt um und `Shift+F12` zeigt Referenzen, sofern der Sprachdienst sie liefert.

VS-Code-`VSIX`-Pakete werden nicht geladen. Monaco unterstützt diese Pakete nicht direkt; die IDE-Funktionen werden hier einzeln integriert. Die TypeScript-Integration hält höchstens 2.000 Projekt-Quelldateien und 350 React-Typdateien vor, damit große Projekte bedienbar bleiben.

## Technische Quellen

- [Monaco FAQ zur VS-Code-Erweiterungskompatibilität](https://github.com/microsoft/monaco-editor#faq)
- [VS Code: Code Navigation und Peek](https://code.visualstudio.com/docs/editing/editingevolved)
- [Biome CLI und Reporter](https://biomejs.dev/reference/cli/)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)
- [Prettier CLI](https://prettier.io/docs/cli)
