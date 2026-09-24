import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { FolderIcon } from "@/components/folder-icon";
import { dlog, installDndDiagnostics } from "@/lib/dnd-log";
import { fileIcon } from "@/lib/file-icons";
import { heatOf, useFileHeatmap } from "@/lib/file-heatmap";
import { nestEntries } from "@/lib/file-nesting";
import { ignoredNames } from "@/lib/git-ignore-tree";
import { useCommandHotkeys } from "@/lib/hotkeys";
import { basename, canMove, dragRoots, parentDir, remap } from "@/lib/fs-move";
import { cn } from "@/lib/utils";
import { addPathsToGitignore } from "@/lib/gitignore";
import { useGitDeco } from "@/lib/git-decorations";
import {
  compareFiles,
  compareWithClipboard,
  useFileCompare,
} from "@/lib/file-compare";
import { refreshFileIndex } from "@/lib/file-index";
import { useMarkersStore } from "@/lib/markers-store";
import { useProjectLogoStore } from "@/lib/project-logo-store";
import { useWorkspaceStore } from "@/lib/workspace-store";
import { CollisionPriority } from "@dnd-kit/abstract";
import { pointerIntersection } from "@dnd-kit/collision";
import {
	Accessibility,
	AutoScroller,
	Cursor,
	Feedback,
	PreventSelection,
} from "@dnd-kit/dom";
import {
	DragDropProvider,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useDraggable,
	useDroppable,
} from "@dnd-kit/react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { confirmAlert } from "@/lib/confirm-alert";
import {
	copyFile,
	exists,
	mkdir,
	readDir,
	remove,
	rename,
	stat,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import {
	ChevronRight,
	CopyPlus,
	Earth,
	EyeClosed,
	File,
	FilePlus,
	FolderPlus,
	GitBranch,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Entry = {
	name: string;
	path: string;
	isDirectory: boolean;
	ignored?: boolean;
	nested?: Entry[];
	preloadedChildren?: Entry[];
};

const ROOT_ID = "__root__";
const EXPAND_DELAY = 500;

type TreeViewState = {
	expandedByRoot: Record<string, string[]>;
	selectedByRoot: Record<string, string[]>;
	setExpanded: (root: string, path: string, open: boolean) => void;
	setExpandedPaths: (root: string, paths: string[]) => void;
	setSelected: (root: string, selected: string[]) => void;
	collapseAll: (root: string) => void;
	remapPaths: (root: string, src: string, dest: string) => void;
	removePaths: (root: string, paths: string[]) => void;
};

const useTreeViewStore = create<TreeViewState>()(persist((set) => ({
	expandedByRoot: {},
	selectedByRoot: {},
	setExpanded: (root, path, open) => set((s) => {
		const expanded = s.expandedByRoot[root] ?? [];
		if (expanded.includes(path) === open) return s;
		return { expandedByRoot: {
			...s.expandedByRoot,
			[root]: open ? [...expanded, path] : expanded.filter((p) => p !== path),
		} };
	}),
	setExpandedPaths: (root, paths) => set((s) => ({
		expandedByRoot: {
			...s.expandedByRoot,
			[root]: [...new Set([...(s.expandedByRoot[root] ?? []), ...paths])],
		},
	})),
	setSelected: (root, selected) => set((s) => ({
		selectedByRoot: { ...s.selectedByRoot, [root]: selected },
	})),
	collapseAll: (root) => set((s) => ({
		expandedByRoot: { ...s.expandedByRoot, [root]: [] },
	})),
	remapPaths: (root, src, dest) => set((s) => {
		const map = remap(src, dest);
		return {
			expandedByRoot: { ...s.expandedByRoot, [root]: (s.expandedByRoot[root] ?? []).map(map) },
			selectedByRoot: { ...s.selectedByRoot, [root]: (s.selectedByRoot[root] ?? []).map(map) },
		};
	}),
	removePaths: (root, paths) => set((s) => {
		const keep = (path: string) => !paths.some((deleted) => path === deleted || path.startsWith(`${deleted}/`));
		return {
			expandedByRoot: { ...s.expandedByRoot, [root]: (s.expandedByRoot[root] ?? []).filter(keep) },
			selectedByRoot: { ...s.selectedByRoot, [root]: (s.selectedByRoot[root] ?? []).filter(keep) },
		};
	}),
}), { name: "file-tree-view" }));

type TreeState = {
	dropTarget: string | null;
	selected: string[];
	anchor: string | null;
	dragging: string[];
	renamingPath: string | null;
	refreshTicks: Record<string, number>;
	refreshEpoch: number;
	reveal: string | null;
	setDropTarget: (path: string | null) => void;
	select: (paths: string[], anchor?: string | null) => void;
	setDragging: (paths: string[]) => void;
	setRenaming: (path: string | null) => void;
	bumpDirs: (dirs: Iterable<string>) => void;
	refresh: () => void;
	revealPath: (path: string | null) => void;
	reset: (root: string) => void;
};

const useTreeStore = create<TreeState>()((set) => ({
	dropTarget: null,
	selected: [],
	anchor: null,
	dragging: [],
	renamingPath: null,
	refreshTicks: {},
	refreshEpoch: 0,
	reveal: null,
	setDropTarget: (dropTarget) =>
		set((s) => (s.dropTarget === dropTarget ? s : { dropTarget })),
	select: (selected, anchor) => {
		const root = useWorkspaceStore.getState().rootPath;
		if (root) useTreeViewStore.getState().setSelected(root, selected);
		set({
			selected,
			...(anchor === undefined ? {} : { anchor }),
		});
	},
	setDragging: (dragging) => set({ dragging }),
	setRenaming: (renamingPath) => set({ renamingPath }),
	bumpDirs: (dirs) =>
		set((s) => {
			const refreshTicks = { ...s.refreshTicks };
			for (const d of dirs) refreshTicks[d] = (refreshTicks[d] ?? 0) + 1;
			return { refreshTicks };
		}),
	refresh: () => set((s) => ({ refreshEpoch: s.refreshEpoch + 1 })),
	revealPath: (reveal) => set({ reveal }),
	reset: (root) => set({
			dropTarget: null,
			selected: useTreeViewStore.getState().selectedByRoot[root] ?? [],
			anchor: null,
			dragging: [],
			renamingPath: null,
			refreshTicks: {},
			refreshEpoch: 0,
			reveal: null,
		}),
}));

async function deletePaths(paths: string[]) {
	const targets = dragRoots(paths);
	if (targets.length === 0) return;
	const label =
		targets.length === 1
			? `„${basename(targets[0])}“`
			: `${targets.length} Elemente`;
	const ok = await confirmAlert(`${label} wirklich löschen?`, "Löschen", "Löschen");
	if (!ok) return;
	const affected = new Set<string>();
	const deleted: string[] = [];
	for (const path of targets) {
		try {
			await remove(path, { recursive: true });
			deleted.push(path);
			const ws = useWorkspaceStore.getState();
			for (const t of ws.tabs) {
				if (t === path || t.startsWith(`${path}/`)) ws.closeTab(t);
			}
			affected.add(parentDir(path));
		} catch (err) {
			dlog("ERROR delete", { path, err });
		}
	}
	const st = useTreeStore.getState();
	const root = useWorkspaceStore.getState().rootPath;
	if (root && deleted.length > 0) useTreeViewStore.getState().removePaths(root, deleted);
	st.select([], null);
	st.bumpDirs(affected);
	refreshFileIndex();
}

function hiddenNamesNow(): Set<string> {
	const s = useWorkspaceStore.getState();
	const ws = s.rootPath ? (s.workspaceHidden[s.rootPath] ?? []) : [];
	return new Set([...s.hiddenNames, ...ws]);
}

async function compactChain(entry: Entry): Promise<Entry> {
	if (!entry.isDirectory) return entry;
	const hidden = hiddenNamesNow();
	if (hidden.has(entry.name)) return entry;
	let name = entry.name;
	let path = entry.path;
	for (let i = 0; i < 12; i++) {
		let kids;
		try {
			kids = await readDir(path);
		} catch {
			break;
		}
		const only = kids.length === 1 ? kids[0] : null;
		if (!only?.isDirectory || !only.name || hidden.has(only.name)) break;
		name = `${name}/${only.name}`;
		path = `${path}/${only.name}`;
	}
	return name === entry.name ? entry : { ...entry, name, path };
}

async function listDir(path: string): Promise<Entry[]> {
	const entries = await readDir(path);
	const ignored = await ignoredNames(
		path,
		entries.map((e) => e.name ?? ""),
	);
	const hideIgnored = useWorkspaceStore.getState().hideIgnored;
	let mapped = entries.map((e) => ({
		name: e.name ?? "",
		path: `${path}/${e.name}`,
		isDirectory: e.isDirectory,
		ignored: ignored.has(e.name ?? ""),
	}));
	if (hideIgnored) mapped = mapped.filter((e) => !e.ignored);
	mapped.sort((a, b) =>
		a.isDirectory === b.isDirectory
			? a.name.localeCompare(b.name)
			: a.isDirectory
				? -1
				: 1,
	);
	return nestEntries(await Promise.all(mapped.map(compactChain)));
}

async function loadRestoredTree(root: string): Promise<Entry[]> {
	const expanded = new Set(useTreeViewStore.getState().expandedByRoot[root] ?? []);
	const activeFile = useWorkspaceStore.getState().activeFile;
	const activeDirs: string[] = [];
	async function load(path: string): Promise<Entry[]> {
		const entries = await listDir(path);
		await Promise.all(entries.map(async (entry) => {
			if (!entry.isDirectory) return;
			const containsActive = Boolean(activeFile?.startsWith(`${entry.path}/`));
			if (!expanded.has(entry.path) && !containsActive) return;
			if (containsActive) activeDirs.push(entry.path);
			try {
				entry.preloadedChildren = await load(entry.path);
			} catch {
				entry.preloadedChildren = [];
			}
		}));
		return entries;
	}
	const entries = await load(root);
	if (activeDirs.length > 0) {
		useTreeViewStore.getState().setExpandedPaths(root, activeDirs);
	}
	return entries;
}

async function copyEntry(src: string, dest: string) {
	const info = await stat(src);
	if (info.isDirectory) {
		await mkdir(dest, { recursive: true });
		for (const e of await readDir(src)) {
			await copyEntry(`${src}/${e.name}`, `${dest}/${e.name}`);
		}
	} else {
		await copyFile(src, dest);
	}
}

async function resolveTargetDir(): Promise<string | null> {
	const { selected } = useTreeStore.getState();
	const rootPath = useWorkspaceStore.getState().rootPath;
	if (!rootPath) return null;
	const sel = selected[selected.length - 1];
	if (!sel) return rootPath;
	try {
		return (await stat(sel)).isDirectory ? sel : parentDir(sel);
	} catch {
		return rootPath;
	}
}

async function uniqueDest(dir: string, base: string): Promise<string> {
	let name = base;
	let i = 2;
	while (await exists(`${dir}/${name}`)) name = `${base} ${i++}`;
	return `${dir}/${name}`;
}

export async function createEntry(kind: "file" | "folder", inDir?: string) {
	const dir = inDir ?? (await resolveTargetDir());
	if (!dir) return;
	const dest = await uniqueDest(
		dir,
		kind === "file" ? "neue-datei" : "neuer-ordner",
	);
	try {
		if (kind === "file") await writeTextFile(dest, "");
		else await mkdir(dest);
	} catch (err) {
		dlog("ERROR create", { dest, err });
		return;
	}
	const st = useTreeStore.getState();
	st.revealPath(dir);
	st.bumpDirs([dir]);
	refreshFileIndex();
	st.select([dest], dest);
	st.setRenaming(dest);
}

export function collapseAll() {
	const root = useWorkspaceStore.getState().rootPath;
	if (root) useTreeViewStore.getState().collapseAll(root);
}

export function revealInTree(path: string) {
	const st = useTreeStore.getState();
	st.revealPath(path);
	st.select([path], path);
	useWorkspaceStore.getState().setSidebarMode("FileTree");
}

export function refreshTree() {
	useTreeStore.getState().refresh();
	refreshFileIndex();
	useProjectLogoStore.getState().invalidate();
}

function EntryIcon({ entry, open }: { entry: Entry; open?: boolean }) {
	const fileIcons = useWorkspaceStore((s) => s.fileIcons);
	if (entry.isDirectory) {
		return <FolderIcon name={entry.name} open={open} />;
	}
	const Icon = fileIcons ? fileIcon(entry.name) : null;
	return Icon ? (
		<Icon className="size-3.5 shrink-0" />
	) : (
		<File className="size-3.5 shrink-0" />
	);
}

type TreeCtxType = {
	rootPath: string;
	restoring: boolean;
	hidden: Set<string>;
	onRowClick: (entry: Entry, e: React.MouseEvent) => void;
};

const TreeCtx = createContext<TreeCtxType>(null!);

const TreeNode = memo(function TreeNode({
	entry,
	depth,
}: {
	entry: Entry;
	depth: number;
}) {
	const ctx = useContext(TreeCtx);
	const open = useTreeViewStore((s) =>
		(s.expandedByRoot[ctx.rootPath] ?? []).includes(entry.path),
	);
	const setOpen = useCallback((next: boolean) => {
		useTreeViewStore.getState().setExpanded(ctx.rootPath, entry.path, next);
	}, [ctx.rootPath, entry.path]);
	const renaming = useTreeStore((s) => s.renamingPath === entry.path);
	const cancelRename = useRef(false);
	const [children, setChildren] = useState<Entry[] | null>(entry.preloadedChildren ?? null);
	const isActive = useWorkspaceStore((s) => s.activeFile === entry.path);
	const activeDescendant = useWorkspaceStore((s) =>
		entry.isDirectory && s.activeFile?.startsWith(`${entry.path}/`)
			? s.activeFile
			: null,
	);
	const restoredOpen = useRef(open || Boolean(activeDescendant));
	useEffect(() => {
		if (restoredOpen.current && (
			(!open && !activeDescendant) || !entry.isDirectory || children !== null
		)) {
			restoredOpen.current = false;
		}
	}, [open, activeDescendant, entry.isDirectory, children]);
	const openFile = useWorkspaceStore((s) => s.openFile);
	const openPreview = useWorkspaceStore((s) => s.openPreview);
	const counts = useMarkersStore((s) =>
		(entry.isDirectory ? s.dirCounts : s.fileCounts)[entry.path],
	);
	const gitDeco = useGitDeco(entry.path, entry.isDirectory);
	const heat = useFileHeatmap((s) =>
		s.enabled && !entry.isDirectory && s.max > 0
			? heatOf(s.counts, s.max, entry.path)
			: 0,
	);
	const isSelected = useTreeStore((s) => s.selected.includes(entry.path));
	const isDropTarget = useTreeStore((s) => s.dropTarget === entry.path);
	const isDragSource = useTreeStore((s) => s.dragging.includes(entry.path));
	const tick = useTreeStore((s) => s.refreshTicks[entry.path] ?? 0);
	const refreshEpoch = useTreeStore((s) => s.refreshEpoch);
	const reveal = useTreeStore((s) =>
		s.reveal &&
		entry.isDirectory &&
		(s.reveal === entry.path || s.reveal.startsWith(`${entry.path}/`))
			? s.reveal
			: null,
	);
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const expandTimer = useRef<number | null>(null);

	const targetDir = entry.isDirectory ? entry.path : parentDir(entry.path);
	const { ref: dragRef } = useDraggable({
		id: entry.path,
		data: { entry },
	});
	const { ref: dropRef } = useDroppable({
		id: entry.path,
		data: { dir: targetDir },
		collisionDetector: pointerIntersection,
		collisionPriority: CollisionPriority.High,
	});

	useEffect(() => {
		if (open && entry.isDirectory && children === null) {
			listDir(entry.path).then(setChildren).catch(() => setChildren([]));
		}
	}, [open, entry.isDirectory, entry.path, children]);

	useEffect(() => {
		if (activeDescendant) {
			setOpen(true);
		}
	}, [activeDescendant, setOpen]);

	useEffect(() => {
		if (isActive) buttonRef.current?.scrollIntoView({ block: "nearest" });
	}, [isActive]);

	useEffect(() => {
		if (tick === 0) return;
		setChildren((c) => {
			if (c !== null) listDir(entry.path).then(setChildren);
			return c;
		});
	}, [tick, entry.path]);

	useEffect(() => {
		if (refreshEpoch === 0) return;
		setChildren((c) => {
			if (c !== null) listDir(entry.path).then(setChildren);
			return c;
		});
	}, [refreshEpoch, entry.path]);

	useEffect(() => {
		if (reveal) {
			setOpen(true);
		}
	}, [reveal, setOpen]);

	useEffect(() => {
		if (isDropTarget && entry.isDirectory && !open) {
			expandTimer.current = window.setTimeout(() => {
				expandTimer.current = null;
				dlog("auto-expand", entry.path);
				setOpen(true);
			}, EXPAND_DELAY);
		}
		return () => {
			if (expandTimer.current !== null) {
				clearTimeout(expandTimer.current);
				expandTimer.current = null;
			}
		};
	}, [isDropTarget, entry.path, entry.isDirectory, open, setOpen]);

	async function toggle() {
		if (!entry.isDirectory) {
			openPreview(entry.path);
			return;
		}
		if (!open && children === null) {
			setChildren(await listDir(entry.path));
		}
		setOpen(!open);
	}

	function handleDelete() {
		const st = useTreeStore.getState();
		deletePaths(st.selected.includes(entry.path) ? st.selected : [entry.path]);
	}

	function handleAddToGitignore() {
		const rootPath = useWorkspaceStore.getState().rootPath;
		if (!rootPath) return;
		const st = useTreeStore.getState();
		const paths = st.selected.includes(entry.path) ? st.selected : [entry.path];
		void addPathsToGitignore(rootPath, paths);
	}

	async function commitRename(newName: string) {
		useTreeStore.getState().setRenaming(null);
		const name = newName.trim();
		if (!name || name === entry.name || name.includes("/")) return;
		const dest = `${parentDir(entry.path)}/${name}`;
		try {
			if (await exists(dest)) {
				const ok = await confirmAlert(
					`„${name}“ existiert bereits in diesem Ordner. Ersetzen?`,
					"Ersetzen", "Ersetzen",
				);
				if (!ok) return;
				await remove(dest, { recursive: true });
			}
			await rename(entry.path, dest);
			useWorkspaceStore.getState().remapPath(entry.path, dest);
			useTreeViewStore.getState().remapPaths(ctx.rootPath, entry.path, dest);
			useTreeStore.getState().bumpDirs([parentDir(entry.path)]);
			refreshFileIndex();
		} catch (err) {
			dlog("ERROR rename", { path: entry.path, dest, err });
		}
	}

	const highlighted = isActive || isSelected;

	return (
		<div>
			<ContextMenu>
				<ContextMenuTrigger>
					<div className="group/row relative px-1.5">
						<button
							ref={(el) => {
								buttonRef.current = el;
								dragRef(el);
								dropRef(el);
							}}
							type="button"
							data-path={entry.path}
							data-dir={entry.isDirectory}
							onClick={(e) => {
								ctx.onRowClick(entry, e);
								if (!e.metaKey && !e.ctrlKey && !e.shiftKey) toggle();
							}}
							onDoubleClick={() => {
								if (!entry.isDirectory) openFile(entry.path);
							}}
							className={cn(
								"relative flex w-full select-none items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[13px] transition-colors duration-100",
								highlighted
									? "text-foreground"
									: "text-foreground/85 hover:bg-foreground/[0.04]",
								entry.ignored && "opacity-45",
								isDragSource && "opacity-40",
								isDropTarget && "bg-primary/8 ring-1 ring-primary/25",
							)}
							title={entry.ignored ? `${entry.name} · von Git ignoriert` : undefined}
							style={{ paddingLeft: depth * 14 + 8 }}
						>
							{(isActive || isSelected) && (
								<span
									className={cn(
										"absolute inset-0 rounded-lg ring-1",
										isActive
											? "bg-foreground/[0.06] ring-foreground/[0.05]"
											: "bg-foreground/[0.04] ring-foreground/[0.03]",
									)}
									aria-hidden
								/>
							)}
							{isActive && (
								<motion.span
									layoutId="tree-active-bar"
									className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-primary"
									transition={{ type: "spring", stiffness: 520, damping: 38, mass: 0.55 }}
									aria-hidden
								/>
							)}
							{entry.isDirectory || entry.nested ? (
								<motion.span
									animate={{ rotate: open ? 90 : 0 }}
									transition={{ type: "spring", stiffness: 500, damping: 32 }}
									className={cn(
										"relative z-10 shrink-0",
										entry.nested &&
											"opacity-0 transition-opacity group-hover/row:opacity-100",
										entry.nested && open && "opacity-100",
									)}
									onClick={
										entry.nested
											? (e) => {
													e.stopPropagation();
													setOpen(!open);
												}
											: undefined
									}
								>
									<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
								</motion.span>
							) : (
								<span className="relative z-10 w-3.5 shrink-0" />
							)}
							<span className="relative z-10 shrink-0">
								<EntryIcon entry={entry} open={open} />
							</span>
							{renaming ? (
								<input
									autoFocus
									defaultValue={entry.name}
									onFocus={(e) => {
										const dot = entry.isDirectory
											? -1
											: entry.name.lastIndexOf(".");
										e.currentTarget.setSelectionRange(
											0,
											dot > 0 ? dot : entry.name.length,
										);
									}}
									onClick={(e) => e.stopPropagation()}
									onPointerDown={(e) => e.stopPropagation()}
									onKeyDown={(e) => {
										e.stopPropagation();
										if (e.key === "Enter") e.currentTarget.blur();
										if (e.key === "Escape") {
											cancelRename.current = true;
											e.currentTarget.blur();
										}
									}}
									onBlur={(e) => {
										if (cancelRename.current) {
											cancelRename.current = false;
											useTreeStore.getState().setRenaming(null);
											return;
										}
										commitRename(e.currentTarget.value);
									}}
									className="relative z-10 min-w-0 flex-1 rounded-md border-0 bg-background/80 px-1.5 py-0.5 text-[13px] outline-none ring-1 ring-primary/30"
								/>
							) : (
								<>
									<span
										className={cn(
											"relative z-10 min-w-0 truncate",
											gitDeco?.className,
										)}
									>
										{entry.name}
									</span>
									{heat > 0 && (
										<span
											title="Häufig geändert (Git-Heatmap)"
											className="relative z-10 ml-1 size-1.5 shrink-0 rounded-full bg-amber-500"
											style={{ opacity: 0.25 + heat * 0.75 }}
										/>
									)}
									{counts && (counts.errors > 0 || counts.warnings > 0) ? (
										<span
											className={cn(
												"relative z-10 ml-auto shrink-0 rounded-full px-1.5 text-[10px] font-medium tabular-nums",
												counts.errors > 0 ? "text-red-500" : "text-amber-500",
											)}
										>
											{counts.errors + counts.warnings}
										</span>
									) : gitDeco?.letter ? (
										<span
											className={cn(
												"relative z-10 ml-auto shrink-0 px-1.5 text-[11px] font-semibold tabular-nums",
												gitDeco.className,
											)}
										>
											{gitDeco.letter}
										</span>
									) : null}
								</>
							)}
						</button>
						{entry.isDirectory && !renaming && (
							<div className="pointer-events-none absolute inset-y-0 right-2.5 z-20 flex items-center gap-0.5 opacity-0 transition-opacity duration-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
								<button
									type="button"
									title="Neue Datei"
									onPointerDown={(e) => e.stopPropagation()}
									onClick={(e) => {
										e.stopPropagation();
										createEntry("file", entry.path);
									}}
									className="flex size-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm ring-1 ring-foreground/8 hover:text-foreground"
								>
									<FilePlus className="size-3.5" />
								</button>
								<button
									type="button"
									title="Neuer Ordner"
									onPointerDown={(e) => e.stopPropagation()}
									onClick={(e) => {
										e.stopPropagation();
										createEntry("folder", entry.path);
									}}
									className="flex size-6 items-center justify-center rounded-md bg-background/90 text-muted-foreground shadow-sm ring-1 ring-foreground/8 hover:text-foreground"
								>
									<FolderPlus className="size-3.5" />
								</button>
							</div>
						)}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className="min-w-48">
					<ContextMenuItem onClick={() => createEntry("file", targetDir)}>
						Neue Datei
					</ContextMenuItem>
					<ContextMenuItem onClick={() => createEntry("folder", targetDir)}>
						Neuer Ordner
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => useTreeStore.getState().setRenaming(entry.path)}
					>
						Umbenennen
					</ContextMenuItem>
					<ContextMenuItem variant="destructive" onClick={handleDelete}>
						Löschen
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem onClick={handleAddToGitignore}>
						<GitBranch className="size-4" />
						Zu .gitignore hinzufügen
					</ContextMenuItem>
					{!entry.isDirectory && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem
								onClick={() =>
									useFileCompare.getState().setSelected(entry.path)
								}
							>
								Zum Vergleich auswählen
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => {
									const sel = useFileCompare.getState().selected;
									if (sel && sel !== entry.path) compareFiles(sel, entry.path);
								}}
							>
								Mit Ausgewähltem vergleichen
							</ContextMenuItem>
							<ContextMenuItem
								onClick={() => void compareWithClipboard(entry.path)}
							>
								Mit Zwischenablage vergleichen
							</ContextMenuItem>
						</>
					)}
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() =>
							useWorkspaceStore.getState().hideName(entry.name, "workspace")
						}
					>
						<EyeClosed className="size-4" />
						Ausblenden (Workspace)
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() =>
							useWorkspaceStore.getState().hideName(entry.name, "global")
						}
					>
						<span className="relative">
							<EyeClosed className="size-4" />
							<Earth className="absolute -bottom-0.5 -right-0.5 size-2.5" />
						</span>
						Ausblenden (Überall)
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			<AnimatePresence initial={false}>
				{open && (entry.isDirectory ? children !== null : Boolean(entry.nested)) && (
					<motion.div
						initial={restoredOpen.current ? false : { height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.6 }}
						className="overflow-hidden"
					>
						{(entry.isDirectory ? (children ?? []) : (entry.nested ?? []))
							.filter((c) => !ctx.hidden.has(c.name))
							.map((child) => (
								<TreeNode key={child.path} entry={child} depth={depth + 1} />
							))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

function TreeContainer({
	rootPath,
	entries,
	hidden,
	containerRef,
}: {
	rootPath: string;
	entries: Entry[];
	hidden: Set<string>;
	containerRef: React.RefObject<HTMLDivElement | null>;
}) {
	const { ref: dropRef } = useDroppable({
		id: ROOT_ID,
		data: { dir: rootPath },
		collisionDetector: pointerIntersection,
		collisionPriority: CollisionPriority.Low,
	});
	const isRootDropTarget = useTreeStore((s) => s.dropTarget === rootPath);

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<div
						ref={(el) => {
							containerRef.current = el;
							dropRef(el);
						}}
						onClick={(e) => {
							if (e.target === containerRef.current) {
								useTreeStore.getState().select([], null);
							}
						}}
						className={cn(
							"min-h-0 flex-1 overflow-auto px-1 pb-3 pt-0.5",
							isRootDropTarget && "bg-primary/6 ring-1 ring-primary/20 ring-inset",
						)}
					/>
				}
			>
				{entries
					.filter((c) => !hidden.has(c.name))
					.map((child) => (
						<TreeNode key={child.path} entry={child} depth={0} />
					))}
			</ContextMenuTrigger>
			<ContextMenuContent className="min-w-48">
				<ContextMenuItem onClick={() => createEntry("file", rootPath)}>
					Neue Datei
				</ContextMenuItem>
				<ContextMenuItem onClick={() => createEntry("folder", rootPath)}>
					Neuer Ordner
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={collapseAll}>Alle einklappen</ContextMenuItem>
				<ContextMenuItem onClick={refreshTree}>Aktualisieren</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

export function FileTree({ rootPath }: { rootPath: string }) {
	const [children, setChildren] = useState<Entry[] | null>(null);
	const [restoring, setRestoring] = useState(true);
	const [altKey, setAltKey] = useState(false);
	const [overValid, setOverValid] = useState<boolean | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const altRef = useRef(false);
	const dropBusyRef = useRef(false);
	const globalHidden = useWorkspaceStore((s) => s.hiddenNames);
	const wsHidden = useWorkspaceStore((s) => s.workspaceHidden[rootPath]);
	const draggingCount = useTreeStore((s) => s.dragging.length);
	const hidden = useMemo(
		() => new Set([...globalHidden, ...(wsHidden ?? [])]),
		[globalHidden, wsHidden],
	);

	useEffect(() => {
		installDndDiagnostics();
	}, []);

	useEffect(() => {
		if (useFileHeatmap.getState().enabled)
			void useFileHeatmap.getState().ensureLoaded();
	}, [rootPath]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			altRef.current = e.altKey;
			setAltKey(e.altKey);
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("keyup", onKey);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("keyup", onKey);
		};
	}, []);

	useEffect(() => {
		setChildren(null);
		setRestoring(true);
		useTreeStore.getState().reset(rootPath);
		let cancelled = false;
		loadRestoredTree(rootPath)
			.then((entries) => { if (!cancelled) setChildren(entries); })
			.catch(() => { if (!cancelled) setChildren([]); });
		return () => { cancelled = true; };
	}, [rootPath]);

	useEffect(() => {
		if (children !== null && restoring) setRestoring(false);
	}, [children, restoring]);

	const rootTick = useTreeStore((s) => s.refreshTicks[rootPath] ?? 0);
	useEffect(() => {
		if (rootTick === 0) return;
		loadRestoredTree(rootPath).then(setChildren).catch(() => setChildren([]));
	}, [rootTick, rootPath]);

	const refreshEpoch = useTreeStore((s) => s.refreshEpoch);
	useEffect(() => {
		if (refreshEpoch === 0) return;
		loadRestoredTree(rootPath).then(setChildren).catch(() => setChildren([]));
	}, [refreshEpoch, rootPath]);

	useCommandHotkeys(
		{
			"file.rename": () => {
				const st = useTreeStore.getState();
				if (st.selected.length === 1) st.setRenaming(st.selected[0]);
			},
			"file.delete": () => deletePaths(useTreeStore.getState().selected),
		},
		{ target: containerRef },
	);

	const handleRowClick = useCallback((entry: Entry, e: React.MouseEvent) => {
		const st = useTreeStore.getState();
		if (e.metaKey || e.ctrlKey) {
			st.select(
				st.selected.includes(entry.path)
					? st.selected.filter((p) => p !== entry.path)
					: [...st.selected, entry.path],
				entry.path,
			);
			return;
		}
		if (e.shiftKey) {
			const order = Array.from(
				containerRef.current?.querySelectorAll<HTMLElement>("[data-path]") ??
					[],
			).map((el) => el.dataset.path!);
			const a = order.indexOf(st.anchor ?? entry.path);
			const b = order.indexOf(entry.path);
			if (a !== -1 && b !== -1) {
				st.select(order.slice(Math.min(a, b), Math.max(a, b) + 1));
			}
			return;
		}
		st.select([entry.path], entry.path);
	}, []);

	async function performDrop(dir: string, srcs: string[], copy: boolean) {
		if (dropBusyRef.current) {
			dlog("performDrop ignored — already running");
			return;
		}
		dropBusyRef.current = true;
		const st = useTreeStore.getState();
		st.setDragging([]);
		st.setDropTarget(null);
		dlog("performDrop", { dir, srcs, copy });
		const done: string[] = [];
		const affected = new Set<string>();
		try {
			for (const src of srcs) {
				if (!canMove(src, dir)) {
					dlog("skip — canMove=false", { src, dir });
					continue;
				}
				const dest = `${dir}/${basename(src)}`;
				try {
					if (await exists(dest)) {
						dlog("conflict — asking to replace", dest);
						const ok = await confirmAlert(
							`„${basename(src)}“ existiert bereits in diesem Ordner. Ersetzen?`,
							"Ersetzen", "Ersetzen",
						);
						if (!ok) {
							dlog("replace declined", dest);
							continue;
						}
						await remove(dest, { recursive: true });
					}
					if (copy) {
						await copyEntry(src, dest);
						dlog("copied", src, "→", dest);
					} else {
					await rename(src, dest);
					useWorkspaceStore.getState().remapPath(src, dest);
					useTreeViewStore.getState().remapPaths(rootPath, src, dest);
						affected.add(parentDir(src));
						dlog("moved", src, "→", dest);
					}
					affected.add(dir);
					done.push(dest);
				} catch (err) {
					dlog("ERROR", { src, dest, err });
				}
			}
			if (done.length > 0) {
				st.select(done, done[0]);
				st.bumpDirs(affected);
				refreshFileIndex();
			}
			dlog("performDrop finished", { done, affected: [...affected] });
		} finally {
			dropBusyRef.current = false;
		}
	}

	function handleDragStart(e: DragStartEvent) {
		const entry = e.operation.source?.data?.entry as Entry | undefined;
		if (!entry) return;
		const st = useTreeStore.getState();
		const picked = st.selected.includes(entry.path)
			? st.selected
			: [entry.path];
		const paths = dragRoots(picked);
		if (!st.selected.includes(entry.path)) {
			st.select([entry.path], entry.path);
		}
		st.setDragging(paths);
		setOverValid(null);
		dlog("dragstart", { paths });
	}

	function handleDragOver(e: DragOverEvent) {
		const st = useTreeStore.getState();
		const dir = e.operation.target?.data?.dir as string | undefined;
		if (!dir) {
			st.setDropTarget(null);
			setOverValid(null);
			return;
		}
		const ok =
			st.dragging.length > 0 && st.dragging.every((s) => canMove(s, dir));
		st.setDropTarget(ok ? dir : null);
		setOverValid(ok);
		dlog("dragover", { dir, ok });
	}

	async function handleDragEnd(e: DragEndEvent) {
		const st = useTreeStore.getState();
		const paths = st.dragging;
		const dir = e.operation.target?.data?.dir as string | undefined;
		setOverValid(null);
		dlog("dragend", { dir, paths, canceled: e.canceled, alt: altRef.current });
		if (!e.canceled && dir && paths.length > 0) {
			await performDrop(dir, paths, altRef.current);
		} else {
			st.setDragging([]);
			st.setDropTarget(null);
		}
	}

	useEffect(() => {
		const resolveTargetDir = (position: { x: number; y: number }) => {
			const scale = window.devicePixelRatio;
			const x = position.x / scale;
			const y = position.y / scale;
			const rect = containerRef.current?.getBoundingClientRect();
			if (
				!rect ||
				x < rect.left ||
				x > rect.right ||
				y < rect.top ||
				y > rect.bottom
			) {
				return null;
			}
			const row = document
				.elementFromPoint(x, y)
				?.closest<HTMLElement>("[data-path]");
			if (!row?.dataset.path) return rootPath;
			return row.dataset.dir === "true"
				? row.dataset.path
				: parentDir(row.dataset.path);
		};
		const unlisten = getCurrentWebview().onDragDropEvent(async (event) => {
			const type = event.payload.type;
			const st = useTreeStore.getState();
			if (type === "over") {
				st.setDropTarget(resolveTargetDir(event.payload.position));
			} else if (type === "drop") {
				const dir = resolveTargetDir(event.payload.position);
				dlog("tauri external drop", { dir, paths: event.payload.paths });
				st.setDropTarget(null);
				if (!dir || event.payload.paths.length === 0) return;
				await Promise.all(
					event.payload.paths.map((p) =>
						copyFile(p, `${dir}/${basename(p)}`).catch((err) =>
							dlog("ERROR external copy", { p, err }),
						),
					),
				);
				st.bumpDirs([dir]);
				refreshFileIndex();
			} else {
				st.setDropTarget(null);
			}
		});
		dlog("tauri onDragDropEvent listener registered", { rootPath });
		return () => {
			unlisten.then((fn) => fn());
		};
	}, [rootPath]);

	const ctx = useMemo<TreeCtxType>(
		() => ({ rootPath, restoring, hidden, onRowClick: handleRowClick }),
		[rootPath, restoring, hidden, handleRowClick],
	);

	if (children === null) {
		return <div className="p-2 text-sm text-muted-foreground">Loading…</div>;
	}

	return (
		<TreeCtx.Provider value={ctx}>
			<DragDropProvider
				sensors={[PointerSensor]}
				plugins={[
					Accessibility,
					AutoScroller.configure({ acceleration: 25 }),
					Cursor.configure({ cursor: "grabbing" }),
					Feedback,
					PreventSelection,
				]}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<TreeContainer
					rootPath={rootPath}
					entries={children}
					hidden={hidden}
					containerRef={containerRef}
				/>
				<DragOverlay dropAnimation={null} className="pointer-events-none">
					{(source) => {
						const entry = source?.data?.entry as Entry | undefined;
						if (!entry) return null;
						return (
							<div
								className={cn(
									"flex w-fit items-center gap-1.5 rounded-xl border border-foreground/10 bg-background/95 px-2.5 py-1.5 text-sm text-foreground shadow-xl backdrop-blur-sm",
									overValid === false && "opacity-50",
								)}
							>
								<EntryIcon entry={entry} />
								<span className="whitespace-nowrap">
									{draggingCount > 1 ? `${draggingCount} Elemente` : entry.name}
								</span>
								{draggingCount > 1 && (
									<span className="rounded-full bg-primary px-1.5 text-[10px] font-medium leading-4 text-primary-foreground">
										{draggingCount}
									</span>
								)}
								{altKey && (
									<span className="flex items-center gap-0.5 text-xs text-muted-foreground">
										<CopyPlus className="size-3" />
										Kopie
									</span>
								)}
							</div>
						);
					}}
				</DragOverlay>
			</DragDropProvider>
		</TreeCtx.Provider>
	);
}
