import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Box,
  Boxes,
  Code2,
  Cog,
  Database,
  FileCode2,
  FlaskConical,
  FolderGit2,
  GitBranch,
  Globe,
  Hammer,
  Image,
  Languages,
  Layers,
  Library,
  Map,
  Package,
  Palette,
  Server,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Terminal,
  Type,
  Wrench,
} from "lucide-react";

export type FolderCorner = "tl" | "tr" | "bl" | "br";

export type FolderBadge = {
  icon: LucideIcon;
  corner: FolderCorner;
  color: string;
};

export const CORNER_XY: Record<FolderCorner, { x: number; y: number }> = {
  tl: { x: 1, y: 1 },
  tr: { x: 16, y: 1 },
  bl: { x: 1, y: 15 },
  br: { x: 16, y: 15 },
};

export const BADGE_SIZE = 12;

const byName: Record<string, FolderBadge[]> = {
  src: [{ icon: Code2, corner: "br", color: "#3b82f6" }],
  source: [{ icon: Code2, corner: "br", color: "#3b82f6" }],
  components: [{ icon: Boxes, corner: "tr", color: "#06b6d4" }],
  component: [{ icon: Boxes, corner: "tr", color: "#06b6d4" }],
  lib: [{ icon: Library, corner: "bl", color: "#a855f7" }],
  libs: [{ icon: Library, corner: "bl", color: "#a855f7" }],
  utils: [{ icon: Wrench, corner: "bl", color: "#8b5cf6" }],
  util: [{ icon: Wrench, corner: "bl", color: "#8b5cf6" }],
  hooks: [{ icon: Share2, corner: "tl", color: "#ec4899" }],
  hook: [{ icon: Share2, corner: "tl", color: "#ec4899" }],
  pages: [{ icon: Map, corner: "tr", color: "#f97316" }],
  page: [{ icon: Map, corner: "tr", color: "#f97316" }],
  routes: [{ icon: Map, corner: "tr", color: "#f97316" }],
  route: [{ icon: Map, corner: "tr", color: "#f97316" }],
  api: [{ icon: Server, corner: "br", color: "#22c55e" }],
  apis: [{ icon: Server, corner: "br", color: "#22c55e" }],
  public: [{ icon: Globe, corner: "bl", color: "#eab308" }],
  static: [{ icon: Globe, corner: "bl", color: "#eab308" }],
  styles: [{ icon: Palette, corner: "tr", color: "#f472b6" }],
  style: [{ icon: Palette, corner: "tr", color: "#f472b6" }],
  css: [{ icon: Palette, corner: "tr", color: "#f472b6" }],
  test: [{ icon: FlaskConical, corner: "br", color: "#ef4444" }],
  tests: [{ icon: FlaskConical, corner: "br", color: "#ef4444" }],
  __tests__: [{ icon: FlaskConical, corner: "br", color: "#ef4444" }],
  docs: [{ icon: BookOpen, corner: "tl", color: "#f59e0b" }],
  doc: [{ icon: BookOpen, corner: "tl", color: "#f59e0b" }],
  documentation: [{ icon: BookOpen, corner: "tl", color: "#f59e0b" }],
  "node_modules": [{ icon: Package, corner: "br", color: "#f87171" }],
  config: [{ icon: Settings, corner: "tl", color: "#94a3b8" }],
  configs: [{ icon: Settings, corner: "tl", color: "#94a3b8" }],
  scripts: [{ icon: Terminal, corner: "bl", color: "#4ade80" }],
  script: [{ icon: Terminal, corner: "bl", color: "#4ade80" }],
  types: [{ icon: Type, corner: "tr", color: "#60a5fa" }],
  type: [{ icon: Type, corner: "tr", color: "#60a5fa" }],
  typings: [{ icon: Type, corner: "tr", color: "#60a5fa" }],
  store: [{ icon: Database, corner: "br", color: "#fb923c" }],
  stores: [{ icon: Database, corner: "br", color: "#fb923c" }],
  state: [{ icon: Database, corner: "br", color: "#fb923c" }],
  i18n: [{ icon: Languages, corner: "tl", color: "#818cf8" }],
  locales: [{ icon: Languages, corner: "tl", color: "#818cf8" }],
  locale: [{ icon: Languages, corner: "tl", color: "#818cf8" }],
  images: [{ icon: Image, corner: "bl", color: "#38bdf8" }],
  image: [{ icon: Image, corner: "bl", color: "#38bdf8" }],
  img: [{ icon: Image, corner: "bl", color: "#38bdf8" }],
  assets: [{ icon: Image, corner: "bl", color: "#38bdf8" }],
  icons: [{ icon: Sparkles, corner: "tr", color: "#facc15" }],
  icon: [{ icon: Sparkles, corner: "tr", color: "#facc15" }],
  middleware: [{ icon: Shield, corner: "tl", color: "#64748b" }],
  services: [{ icon: Cog, corner: "br", color: "#a1a1aa" }],
  service: [{ icon: Cog, corner: "br", color: "#a1a1aa" }],
  models: [{ icon: Box, corner: "bl", color: "#fb7185" }],
  model: [{ icon: Box, corner: "bl", color: "#fb7185" }],
  contexts: [{ icon: Share2, corner: "tr", color: "#c084fc" }],
  context: [{ icon: Share2, corner: "tr", color: "#c084fc" }],
  features: [{ icon: Layers, corner: "br", color: "#34d399" }],
  feature: [{ icon: Layers, corner: "br", color: "#34d399" }],
  dist: [{ icon: Hammer, corner: "br", color: "#78716c" }],
  build: [{ icon: Hammer, corner: "br", color: "#78716c" }],
  out: [{ icon: Hammer, corner: "br", color: "#78716c" }],
  ".git": [{ icon: FolderGit2, corner: "tl", color: "#f97316" }],
  ".github": [{ icon: GitBranch, corner: "tl", color: "#a3a3a3" }],
  ".vscode": [{ icon: FileCode2, corner: "tl", color: "#3b82f6" }],
  ".cursor": [{ icon: FileCode2, corner: "tl", color: "#a78bfa" }],
};

export function folderBadges(name: string): FolderBadge[] {
  return byName[name.toLowerCase()] ?? [];
}
