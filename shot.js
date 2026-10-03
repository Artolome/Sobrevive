// Capture d'écran du jeu assemblé, dans un cadre de la taille d'un téléphone (Edge sans fenêtre refuse < 500 px de large).
// Usage: node shot.js <ancre|-> <nom> [largeur] [hauteur]
// ex: node shot.js - lobby 390 844   ·   node shot.js carta-quijote-molinos carta 390 844
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const [hash, name, w0, h0] = process.argv.slice(2);
const w = +w0 || 390, h = +h0 || 844;
const nm = name || "shot";
fs.mkdirSync(path.join(__dirname, "shots"), { recursive: true });
const harness = path.join(__dirname, "shots", "_frame-" + nm + ".html");
fs.writeFileSync(harness, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#000"><iframe src="../index.html${hash && hash !== "-" ? "#" + hash : ""}" style="width:${w}px;height:${h}px;border:0;display:block"></iframe>`, "utf8");
const png = path.join(__dirname, "shots", nm + ".png");
try {
  execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${Math.max(520, w)},${h}`, "--force-device-scale-factor=1.5", "--virtual-time-budget=6000", "--allow-file-access-from-files",
    "--user-data-dir=" + path.join(__dirname, "edgeprof-shot-" + nm), "--screenshot=" + png, "file:///" + harness.replace(/\\/g, "/")], { stdio: "pipe", timeout: 60000 });
} catch (e) { console.log("capture: " + String(e.message || e).slice(0, 200)); }
console.log(fs.existsSync(png) ? "PNG: " + png : "ÉCHEC");
