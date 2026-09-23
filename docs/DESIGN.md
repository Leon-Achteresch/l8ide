# l8ide Design-Leitfaden

Destilliert aus Dribbble-IDE-Shots (AI-Editor/Dark-IDE-Trends), Raycast, Zed, Linear und SaaS-UI-Trends 2026. Jede UI-Arbeit im Feature-Loop hält sich an diese Regeln.

## Leitbild

„Das dunkle Innere eines Präzisionsinstruments" (Raycast) trifft „Spartan & snappy" (Zed) trifft „Clarity over decoration" (Linear). Confidence > Complexity: Jedes Element dient der aktuellen Aufgabe, alles andere fliegt raus oder wird progressiv eingeblendet.

## Flächen statt Borders

- Hierarchie über Elevation/Tonwert, nicht über Linien: `bg-foreground/4`–`/8` für Hover, `--muted` für Panels, `--card` für schwebende Flächen.
- Borders nur, wo zwei scrollende Flächen kollidieren würden — dann Hairline `--border`, nie dunkler.
- Schwebende Elemente (Paletten, Popovers, Toasts): `backdrop-blur` + `shadow` statt Rahmen. Command-Palette: `border-radius: 12px`, Overlay mit `backdrop-filter: blur(4px)`.

## Radius-Skala

- Interaktive Kleinteile (Buttons, Items, Badges): `rounded-md` (6px)
- Cards, Panels, Inputs: `rounded-lg` (8px)
- Schwebende Container (Paletten, Modals, Dynamic Island): `rounded-xl` (12px) bis `rounded-2xl`
- Nichts Eckiges außer dem Fenster selbst.

## Farbe

- Basis bleibt das oklch-System in `App.css` (Hue 265, dezenter Blau-Tint = Raycast-Feeling). Kein reines Schwarz/Weiß.
- Neutrale Grautöne + genau ein Akzent. Status-Farben nur semantisch: rot-500 Fehler, amber-500 Warnung, sky-500 Info, emerald-500 Erfolg.
- Gradient-Akzente sparsam für KI-Funktionen, nie für Chrome.

## Typografie

- Hierarchie über `font-weight: 500` und Tonwert (`text-muted-foreground` → `text-foreground`), nicht über Größensprünge.
- Chrome-Text: 11–12px. Mono-Type für alles Datenhafte (Pfade, Zeilen/Spalten, Shortcuts, Diffs).

## Motion (motion v12 ist installiert)

- Micro-Transitions: 150–250ms, `ease-out`; Farb-/Opacity-Hover via `transition-colors duration-200`.
- Morphende Komponenten: `layout`/`layoutId` von motion für Zustandswechsel (Panel ⇄ Island, Tab ⇄ Preview) — vorhandene Bausteine in `src/components/motion/` (dynamic-island, morphing-modal, bloom-menu, action-swap) bevorzugen statt neu bauen.
- Erfolgs-Momente feiern: kurzer `scale(1.05)`-Pop (400ms) bei Build-Erfolg, Test-Grün, gespeichertem Refactoring.
- Springende Layouts verboten: Ein-/Ausblenden von Panels immer mit Höhe/Breite-Animation oder Fade, nie hart.
- `prefers-reduced-motion` respektieren.

## Verhalten

- Cmd+K-Denke: Jede Aktion über die Command-Palette erreichbar; Paletten zeigen zuletzt Genutztes zuerst.
- AI als Infrastruktur, nicht als Feature: Inline-Ghost-Text in `--muted-foreground`, Einblenden mit `opacity 200ms`, keine Modals, keine Badges.
- Progressive Disclosure: Defaults minimal, „Erweitert"-Sektionen einklappbar, Empty-States zeigen genau eine primäre Aktion.
- Statusmeldungen in menschlicher Sprache statt Fehlercodes.
- Adaptive Layouts (Ziel): Debug-Layout, Review-Layout, Schreib-Layout als umschaltbare UI-Zustände.

## Anti-Patterns

- Border um alles („VS-Code-Gitterlook")
- Mehr als ein Akzent pro View
- Icons ohne Funktion, Toolbars „auf Vorrat"
- Modals, wo ein Inline-/Island-Zustand reicht
- Instant-Layout-Sprünge ohne Übergang
