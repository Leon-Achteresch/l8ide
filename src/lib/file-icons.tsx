import Bun from "@thesvg/react/bun";
import Css from "@thesvg/react/css";
import Docker from "@thesvg/react/docker";
import Git from "@thesvg/react/git";
import Go from "@thesvg/react/go";
import Html5 from "@thesvg/react/html5";
import Javascript from "@thesvg/react/javascript";
import Json from "@thesvg/react/json";
import Markdown from "@thesvg/react/markdown";
import Npm from "@thesvg/react/npm";
import Python from "@thesvg/react/python";
import ReactIcon from "@thesvg/react/react";
import Rust from "@thesvg/react/rust";
import Sass from "@thesvg/react/sass";
import Svg from "@thesvg/react/svg";
import Swift from "@thesvg/react/swift";
import Toml from "@thesvg/react/toml";
import Typescript from "@thesvg/react/typescript";
import Vite from "@thesvg/react/vite";
import Yaml from "@thesvg/react/yaml";
import AzureImage from "@thesvg/react/azure-image";
import type { ComponentType, SVGProps } from "react";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const byName: Record<string, Icon> = {
  "package.json": Npm,
  "package-lock.json": Npm,
  "bun.lock": Bun,
  "bun.lockb": Bun,
  ".gitignore": Git,
  ".gitattributes": Git,
  dockerfile: Docker,
  "vite.config.ts": Vite,
  "vite.config.js": Vite,
};

const byExt: Record<string, Icon> = {
  ts: Typescript,
  mts: Typescript,
  cts: Typescript,
  tsx: ReactIcon,
  jsx: ReactIcon,
  js: Javascript,
  mjs: Javascript,
  cjs: Javascript,
  json: Json,
  html: Html5,
  css: Css,
  scss: Sass,
  sass: Sass,
  md: Markdown,
  mdx: Markdown,
  rs: Rust,
  py: Python,
  go: Go,
  swift: Swift,
  svg: Svg,
  yml: Yaml,
  yaml: Yaml,
  toml: Toml,
  img: AzureImage,
  png: AzureImage,
  jpg: AzureImage,
  jpeg: AzureImage,
  gif: AzureImage,
  webp: AzureImage,
  avif: AzureImage,
};

export function fileIcon(name: string): Icon | null {
  const lower = name.toLowerCase();
  const named = byName[lower];
  if (named) return named;
  const ext = lower.includes(".") ? lower.split(".").pop() : undefined;
  return (ext && byExt[ext]) || null;
}
