import { readFileSync } from "node:fs";

const [path, tag, assetsPath] = process.argv.slice(2);
if (!path || !assetsPath || !/^v\d+\.\d+\.\d+$/.test(tag ?? "")) {
  throw new Error("Usage: node scripts/verify-release.mjs <latest.json> <tag> <assets.json>");
}

const latest = JSON.parse(readFileSync(path, "utf8"));
const assets = JSON.parse(readFileSync(assetsPath, "utf8")).assets;
if (!Array.isArray(assets)) throw new Error("Release asset list is missing");
const expected = ["darwin-aarch64", "darwin-x86_64", "linux-x86_64", "windows-x86_64"];
if (latest.version !== tag.slice(1)) {
  throw new Error(`Updater version ${latest.version} does not match ${tag}`);
}

for (const platform of expected) {
  const entry = latest.platforms?.[platform];
  if (!entry?.signature || !entry.url?.startsWith("https://")) {
    throw new Error(`Missing or invalid signed update for ${platform}`);
  }
  if (!assets.some((asset) => asset.apiUrl === entry.url || asset.url === entry.url)) {
    throw new Error(`Signed update asset for ${platform} is missing from the release`);
  }
}

for (const extension of [".dmg", ".AppImage", ".deb", ".exe", ".msi"]) {
  if (!assets.some((asset) => asset.name.endsWith(extension))) {
    throw new Error(`Missing installer with extension ${extension}`);
  }
}

console.log(`Verified signed updates for ${expected.join(", ")}`);
