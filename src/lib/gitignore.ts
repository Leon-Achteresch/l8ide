import { dragRoots } from "@/lib/fs-move";
import { exists, readTextFile, stat, writeTextFile } from "@tauri-apps/plugin-fs";
import { toast } from "sonner";

function relativeToRoot(rootPath: string, entryPath: string) {
	const prefix = rootPath.endsWith("/") ? rootPath : `${rootPath}/`;
	if (entryPath === rootPath) return null;
	if (!entryPath.startsWith(prefix)) return null;
	return entryPath.slice(prefix.length);
}

function existingPatterns(content: string) {
	const patterns = new Set<string>();
	for (const raw of content.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		patterns.add(line);
		patterns.add(line.replace(/\/$/, ""));
	}
	return patterns;
}

async function patternFor(rootPath: string, entryPath: string) {
	const rel = relativeToRoot(rootPath, entryPath);
	if (!rel) return null;
	const info = await stat(entryPath);
	return info.isDirectory && !rel.endsWith("/") ? `${rel}/` : rel;
}

export async function addPathsToGitignore(rootPath: string, paths: string[]) {
	const targets = dragRoots(paths);
	if (targets.length === 0) return;

	const gitignorePath = `${rootPath}/.gitignore`;
	const hadFile = await exists(gitignorePath);
	const content = hadFile ? await readTextFile(gitignorePath) : "";
	const existing = existingPatterns(content);
	const toAdd: string[] = [];

	for (const path of targets) {
		const pattern = await patternFor(rootPath, path);
		if (!pattern) continue;
		if (existing.has(pattern) || existing.has(pattern.replace(/\/$/, ""))) continue;
		toAdd.push(pattern);
		existing.add(pattern);
		existing.add(pattern.replace(/\/$/, ""));
	}

	if (toAdd.length === 0) {
		toast.message("Bereits in .gitignore");
		return;
	}

	const needsNewline = content.length > 0 && !content.endsWith("\n");
	await writeTextFile(gitignorePath, `${content}${needsNewline ? "\n" : ""}${toAdd.join("\n")}\n`);

	const label =
		toAdd.length === 1 ? `„${toAdd[0]}“` : `${toAdd.length} Einträge`;
	toast.success(`${label} zu .gitignore hinzugefügt`);
}
