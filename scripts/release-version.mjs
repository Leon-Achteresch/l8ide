import { readFileSync, writeFileSync } from "node:fs";

const runNumber = Number(process.argv[2]);
if (!Number.isSafeInteger(runNumber) || runNumber < 1) {
  throw new Error("Usage: node scripts/release-version.mjs <GitHub run number>");
}

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const writeJson = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

const pkg = readJson("package.json");
const tauri = readJson("src-tauri/tauri.conf.json");
const npmLock = readJson("package-lock.json");
const cargoPath = "src-tauri/Cargo.toml";
const cargoLockPath = "src-tauri/Cargo.lock";
const cargo = readFileSync(cargoPath, "utf8");
const cargoLock = readFileSync(cargoLockPath, "utf8");
const cargoVersion = cargo.match(/^\[package\]\n(?:[^\[]|\[(?!package\]))*?^version = "([^"]+)"/m)?.[1];
const lockVersion = cargoLock.match(/^\[\[package\]\]\nname = "l8ide"\nversion = "([^"]+)"/m)?.[1];
const sourceVersion = pkg.version;

if (
  !cargoVersion ||
  !lockVersion ||
  [tauri.version, npmLock.version, npmLock.packages[""].version, cargoVersion, lockVersion].some(
    (version) => version !== sourceVersion,
  )
) {
  throw new Error("Source versions in package.json, lockfiles, Cargo.toml and tauri.conf.json differ");
}

const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(sourceVersion);
if (!match) throw new Error(`Source version must be stable SemVer: ${sourceVersion}`);

const version = `${match[1]}.${match[2]}.${Number(match[3]) + runNumber}`;
pkg.version = version;
tauri.version = version;
npmLock.version = version;
npmLock.packages[""].version = version;

writeJson("package.json", pkg);
writeJson("src-tauri/tauri.conf.json", tauri);
writeJson("package-lock.json", npmLock);
writeFileSync(
  cargoPath,
  cargo.replace(/^(\[package\]\n(?:[^\[]|\[(?!package\]))*?^version = ")[^"]+("?)/m, (_match, before, after) => `${before}${version}${after}`),
);
writeFileSync(
  cargoLockPath,
  cargoLock.replace(/^(\[\[package\]\]\nname = "l8ide"\nversion = ")[^"]+("?)/m, (_match, before, after) => `${before}${version}${after}`),
);

process.stdout.write(`version=${version}\ntag=v${version}\n`);
