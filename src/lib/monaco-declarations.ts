import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import * as monaco from "monaco-editor";
import { typescript as ts } from "monaco-editor";
import { monacoDeclarationUriForPath } from "@/lib/monaco-uri";
import { importedPackages, packageNameFromSpecifier, typePackageName } from "@/lib/monaco-declarations-core";

export { importedPackages } from "@/lib/monaco-declarations-core";

const MAX_PACKAGES = 100;
const MAX_FILES = 1500;
const MAX_PACKAGE_FILES = 120;
const MAX_TOTAL_CHARS = 25_000_000;
const MAX_FILE_CHARS = 2_000_000;

type PackageManifest = {
  types?: string;
  typings?: string;
  exports?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function exportedTypes(value: unknown, output: string[]) {
  if (typeof value === "string") {
    if (/\.d\.(ts|mts|cts)$/i.test(value)) output.push(value);
  } else if (value && typeof value === "object") {
    for (const nested of Object.values(value)) exportedTypes(nested, output);
  }
}

async function packageFiles(directory: string, preferred: string[]): Promise<string[]> {
  const files: string[] = [];
  async function visit(path: string, depth: number) {
    if (depth > 7 || files.length >= MAX_PACKAGE_FILES) return;
    const entries = await readDir(path).catch(() => []);
    for (const entry of entries) {
      if (files.length >= MAX_PACKAGE_FILES) break;
      if (["node_modules", "test", "tests", "__tests__", "examples", "docs", "ts5.0"].includes(entry.name)) continue;
      const child = `${path}/${entry.name}`;
      if (entry.isDirectory) await visit(child, depth + 1);
      else if (entry.isFile && /\.d\.(ts|mts|cts)$/i.test(entry.name)) files.push(child);
    }
  }
  await visit(directory, 0);
  const priority = preferred.map((name) => `${directory}/${name.replace(/^\.\//, "")}`);
  return [...new Set([...priority, ...files])].slice(0, MAX_PACKAGE_FILES);
}

export class MonacoDeclarations {
  private readonly root: string;
  private readonly loadedPackages = new Set<string>();
  private readonly loadedFiles = new Map<string, monaco.IDisposable[]>();
  private totalChars = 0;
  private disposed = false;
  private pending: Promise<void> = Promise.resolve();

  constructor(root: string) {
    this.root = root.replace(/\/$/, "");
  }

  add(packages: Iterable<string>): Promise<void> {
    const names = [...packages];
    this.pending = this.pending.then(() => this.scan(names));
    return this.pending;
  }

  dispose() {
    this.disposed = true;
    for (const libs of this.loadedFiles.values()) for (const lib of libs) lib.dispose();
    this.loadedFiles.clear();
  }

  private register(path: string, content: string) {
    if (this.disposed || this.loadedFiles.has(path) || this.loadedFiles.size >= MAX_FILES || this.totalChars + content.length > MAX_TOTAL_CHARS) return;
    const uri = monacoDeclarationUriForPath(path);
    this.loadedFiles.set(path, [
      ts.typescriptDefaults.addExtraLib(content, uri),
      ts.javascriptDefaults.addExtraLib(content, uri),
    ]);
    this.totalChars += content.length;
  }

  private async scan(initial: string[]) {
    const queue = [...initial];
    while (!this.disposed && queue.length && this.loadedPackages.size < MAX_PACKAGES && this.loadedFiles.size < MAX_FILES) {
      const name = queue.shift()!;
      if (!packageNameFromSpecifier(name) || this.loadedPackages.has(name)) continue;
      this.loadedPackages.add(name);
      const directory = `${this.root}/node_modules/${name}`;
      let manifest: PackageManifest = {};
      try {
        const raw = await readTextFile(`${directory}/package.json`);
        manifest = JSON.parse(raw) as PackageManifest;
        this.register(`${directory}/package.json`, raw);
      } catch {
        if (!name.startsWith("@types/")) queue.push(typePackageName(name));
        continue;
      }
      const entries: string[] = [];
      if (manifest.types) entries.push(manifest.types);
      if (manifest.typings) entries.push(manifest.typings);
      exportedTypes(manifest.exports, entries);
      const files = await packageFiles(directory, entries);
      let declarationCount = 0;
      for (const path of files) {
        if (this.disposed || this.loadedFiles.size >= MAX_FILES || this.totalChars >= MAX_TOTAL_CHARS) break;
        try {
          const content = await readTextFile(path);
          if (content.length > MAX_FILE_CHARS) continue;
          this.register(path, content);
          declarationCount++;
          for (const dependency of importedPackages(content)) {
            if (!this.loadedPackages.has(dependency) && !queue.includes(dependency)) queue.push(dependency);
          }
        } catch { /* optional export target */ }
      }
      if (declarationCount === 0 && !name.startsWith("@types/")) queue.push(typePackageName(name));
    }
  }
}

export async function initialTypePackages(root: string, types?: readonly string[]): Promise<string[]> {
  const packages = new Set<string>(["react", "react-dom"]);
  try {
    const manifest = JSON.parse(await readTextFile(`${root}/package.json`)) as PackageManifest;
    for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
      if (name.startsWith("@types/")) packages.add(name);
    }
  } catch { /* projects without package.json */ }
  if (types?.length) {
    for (const name of types) {
      const packageName = packageNameFromSpecifier(name);
      if (!packageName) continue;
      packages.add(name.startsWith("@types/") ? name : typePackageName(packageName));
      packages.add(packageName);
    }
  } else {
    const entries = await readDir(`${root}/node_modules/@types`).catch(() => []);
    for (const entry of entries.slice(0, 60)) if (entry.isDirectory) packages.add(`@types/${entry.name}`);
  }
  return [...packages];
}
