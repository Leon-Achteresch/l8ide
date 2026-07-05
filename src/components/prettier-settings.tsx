import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  FORMATTABLE_LANGUAGES,
  type LanguageFormatter,
  type PrettierOptions,
  usePrettierSettings,
} from "@/lib/prettier-format";

type NumberField = { key: keyof PrettierOptions; label: string; min: number; max: number };
type BoolField = { key: keyof PrettierOptions; label: string };
type EnumField = { key: keyof PrettierOptions; label: string; options: string[] };

const NUMBER_FIELDS: NumberField[] = [
  { key: "printWidth", label: "Zeilenlänge (printWidth)", min: 20, max: 200 },
  { key: "tabWidth", label: "Tab-Breite (tabWidth)", min: 1, max: 12 },
];

const BOOL_FIELDS: BoolField[] = [
  { key: "useTabs", label: "Tabs statt Leerzeichen (useTabs)" },
  { key: "semi", label: "Semikolons am Zeilenende (semi)" },
  { key: "singleQuote", label: "Einfache Anführungszeichen (singleQuote)" },
  { key: "jsxSingleQuote", label: "JSX: einfache Anführungszeichen (jsxSingleQuote)" },
  { key: "bracketSpacing", label: "Leerzeichen in Objekt-Klammern (bracketSpacing)" },
  { key: "bracketSameLine", label: "Schließende Klammer in gleicher Zeile (bracketSameLine)" },
  { key: "singleAttributePerLine", label: "Ein Attribut pro Zeile (singleAttributePerLine)" },
  { key: "vueIndentScriptAndStyle", label: "Vue: <script>/<style> einrücken" },
];

const ENUM_FIELDS: EnumField[] = [
  { key: "trailingComma", label: "Nachgestellte Kommas (trailingComma)", options: ["all", "es5", "none"] },
  { key: "quoteProps", label: "Objekt-Schlüssel zitieren (quoteProps)", options: ["as-needed", "consistent", "preserve"] },
  { key: "arrowParens", label: "Klammern bei Pfeilfunktionen (arrowParens)", options: ["always", "avoid"] },
  { key: "proseWrap", label: "Fließtext umbrechen (proseWrap)", options: ["preserve", "always", "never"] },
  { key: "htmlWhitespaceSensitivity", label: "HTML-Whitespace (htmlWhitespaceSensitivity)", options: ["css", "strict", "ignore"] },
  { key: "embeddedLanguageFormatting", label: "Eingebettete Sprachen (embeddedLanguageFormatting)", options: ["auto", "off"] },
  { key: "endOfLine", label: "Zeilenende (endOfLine)", options: ["lf", "crlf", "cr", "auto"] },
];

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <p className="text-sm">{label}</p>
      {children}
    </div>
  );
}

export function PrettierSettings() {
  const enabled = usePrettierSettings((s) => s.enabled);
  const formatOnSave = usePrettierSettings((s) => s.formatOnSave);
  const formatOnPaste = usePrettierSettings((s) => s.formatOnPaste);
  const formatOnType = usePrettierSettings((s) => s.formatOnType);
  const editorConfig = usePrettierSettings((s) => s.editorConfig);
  const formatterByLanguage = usePrettierSettings((s) => s.formatterByLanguage);
  const options = usePrettierSettings((s) => s.options);
  const setEnabled = usePrettierSettings((s) => s.setEnabled);
  const setFormatOnSave = usePrettierSettings((s) => s.setFormatOnSave);
  const setFormatOnPaste = usePrettierSettings((s) => s.setFormatOnPaste);
  const setFormatOnType = usePrettierSettings((s) => s.setFormatOnType);
  const setEditorConfig = usePrettierSettings((s) => s.setEditorConfig);
  const setLanguageFormatter = usePrettierSettings((s) => s.setLanguageFormatter);
  const setOption = usePrettierSettings((s) => s.setOption);
  const reset = usePrettierSettings((s) => s.reset);

  return (
    <div className="mt-8 max-w-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Prettier</p>
          <p className="text-xs text-muted-foreground">
            Nativer Code-Formatter (Shift+Alt+F)
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div
        className={enabled ? "mt-4 space-y-1" : "mt-4 space-y-1 pointer-events-none opacity-50"}
      >
        <Row label="Beim Speichern formatieren (formatOnSave)">
          <Switch checked={formatOnSave} onCheckedChange={setFormatOnSave} />
        </Row>

        <Row label="Beim Einfügen formatieren (formatOnPaste)">
          <Switch checked={formatOnPaste} onCheckedChange={setFormatOnPaste} />
        </Row>

        <Row label="Beim Tippen formatieren (formatOnType)">
          <Switch checked={formatOnType} onCheckedChange={setFormatOnType} />
        </Row>

        <Row label=".editorconfig berücksichtigen">
          <Switch checked={editorConfig} onCheckedChange={setEditorConfig} />
        </Row>

        {NUMBER_FIELDS.map((f) => (
          <Row key={f.key} label={f.label}>
            <Input
              type="number"
              min={f.min}
              max={f.max}
              value={options[f.key] as number}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (Number.isFinite(n)) {
                  setOption(f.key, Math.max(f.min, Math.min(f.max, n)) as never);
                }
              }}
              className="h-8 w-20"
            />
          </Row>
        ))}

        {ENUM_FIELDS.map((f) => (
          <Row key={f.key} label={f.label}>
            <NativeSelect
              size="sm"
              value={options[f.key] as string}
              onChange={(e) => setOption(f.key, e.target.value as never)}
            >
              {f.options.map((o) => (
                <NativeSelectOption key={o} value={o}>
                  {o}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Row>
        ))}

        {BOOL_FIELDS.map((f) => (
          <Row key={f.key} label={f.label}>
            <Switch
              checked={options[f.key] as boolean}
              onCheckedChange={(v) => setOption(f.key, v as never)}
            />
          </Row>
        ))}

        <div className="pt-3">
          <p className="text-sm font-medium">Formatter pro Sprache</p>
          <p className="text-xs text-muted-foreground">
            Standard-Formatter je Sprache
          </p>
          <div className="mt-1 space-y-1">
            {FORMATTABLE_LANGUAGES.map((lang) => (
              <Row key={lang} label={lang}>
                <NativeSelect
                  size="sm"
                  value={formatterByLanguage[lang] ?? "prettier"}
                  onChange={(e) =>
                    setLanguageFormatter(
                      lang,
                      e.target.value as LanguageFormatter,
                    )
                  }
                >
                  <NativeSelectOption value="prettier">Prettier</NativeSelectOption>
                  <NativeSelectOption value="none">Kein</NativeSelectOption>
                </NativeSelect>
              </Row>
            ))}
          </div>
        </div>

        <div className="pt-2">
          <Button type="button" size="sm" variant="secondary" onClick={reset}>
            Auf Standard zurücksetzen
          </Button>
        </div>
      </div>
    </div>
  );
}
