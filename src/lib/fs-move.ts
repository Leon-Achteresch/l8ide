export function parentDir(path: string) {
  return path.slice(0, path.lastIndexOf("/"));
}

export function basename(path: string) {
  return path.split("/").pop() ?? path;
}

export function canMove(src: string, targetDir: string) {
  return (
    src !== targetDir &&
    parentDir(src) !== targetDir &&
    !`${targetDir}/`.startsWith(`${src}/`)
  );
}

export function dragRoots(paths: string[]) {
  return paths.filter(
    (p) => !paths.some((q) => q !== p && p.startsWith(`${q}/`)),
  );
}

export function remap(src: string, dest: string) {
  return (path: string) =>
    path === src
      ? dest
      : path.startsWith(`${src}/`)
        ? dest + path.slice(src.length)
        : path;
}
