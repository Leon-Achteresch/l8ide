import { getMonacoInstance } from "@/lib/monaco-instance";

const CATALOG_URL = "https://www.schemastore.org/api/json/catalog.json";

type CatalogEntry = { url: string; fileMatch?: string[] };
type Catalog = { schemas: CatalogEntry[] };

let configured = false;

export async function configureJsonSchemas() {
  if (configured) return;
  const monaco = getMonacoInstance();
  if (!monaco) return;
  configured = true;
  try {
    const res = await fetch(CATALOG_URL);
    const catalog = (await res.json()) as Catalog;
    const schemas = catalog.schemas
      .filter((s) => s.fileMatch?.length)
      .map((s) => ({ uri: s.url, fileMatch: s.fileMatch }));
    monaco.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      allowComments: true,
      enableSchemaRequest: true,
      schemas,
    });
  } catch {
    configured = false;
  }
}
