import { execSync } from "child_process";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const iconsDir = join(root, "src-tauri", "icons");
const whiteLogo = join(root, "public", "logo_white.png");
const blackLogo = join(root, "public", "logo_black.png");
const iconsetDir = join(root, "src-tauri", "AppIcon.iconset");

// 1. Generate default icons from black logo (works on dark docks/taskbars)
execSync(`npx tauri icon "${blackLogo}" --output "${iconsDir}"`, {
  cwd: root,
  stdio: "inherit",
});

// 2. Create adaptive macOS .icns with both light and dark variants
mkdirSync(iconsetDir, { recursive: true });

const pyScript = `
from PIL import Image
src_white = Image.open("${whiteLogo}")
src_black = Image.open("${blackLogo}")
sizes = [
    [16, "16x16"],
    [32, "16x16@2x"],
    [32, "32x32"],
    [64, "32x32@2x"],
    [128, "128x128"],
    [256, "128x128@2x"],
    [256, "256x256"],
    [512, "256x256@2x"],
    [512, "512x512"],
    [1024, "512x512@2x"],
]
out = "${iconsetDir}"
for px, name in sizes:
    src_white.resize((px, px), Image.LANCZOS).save(f"{out}/icon_{name}.png")
    src_black.resize((px, px), Image.LANCZOS).save(f"{out}/icon_{name}~dark.png")
`;

const tmpFile = join(root, "scripts", "__gen_icons.py");
writeFileSync(tmpFile, pyScript);
execSync(`python3 "${tmpFile}"`, { stdio: "inherit" });
rmSync(tmpFile);

execSync(`iconutil -c icns "${iconsetDir}" -o "${join(iconsDir, "icon.icns")}"`, {
  stdio: "inherit",
});

rmSync(iconsetDir, { recursive: true, force: true });

console.log("Icons generated successfully.");
