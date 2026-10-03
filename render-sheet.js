// Planche de contrôle : rend les illustrations d'un fichier art/<unit>.json dans de vraies cartes de tarot
// puis en fait une capture PNG (Edge sans fenêtre) dans shots/sheet-<unit>.png.
// Usage: node render-sheet.js <unit> [cle1,cle2,...] [--big]
//   <unit>  = nom du fichier dans art/ (sans .json), ex: quijote, cole_a, exemplars
//   cle1,…  = ne rendre que ces personnages (pour regarder de près)
//   --big   = cartes plus grandes (320 px) pour inspecter les détails
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const kit = require("./tarot-kit.js");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const unit = process.argv[2];
if (!unit) { console.log("usage: node render-sheet.js <unit> [keys] [--big]"); process.exit(1); }
const big = process.argv.includes("--big");
const only = (process.argv.slice(3).find(a => !a.startsWith("--")) || "").split(",").filter(Boolean);

const artFile = path.join(__dirname, "art", unit + ".json");
let art;
try { art = JSON.parse(fs.readFileSync(artFile, "utf8")); } catch (e) { console.log("JSON INVALIDE dans " + artFile + ": " + e.message); process.exit(1); }
const world = art.world || unit.replace(/_.*$/, "");
const deck = JSON.parse(fs.readFileSync(path.join(__dirname, "decks", world + ".json"), "utf8"));
const charKeys = Object.keys(deck.chars);

// ---- validation du balisage ----
const ALLOWED_TAGS = new Set(["g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const ALLOWED_ATTRS = new Set(["d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "fill-opacity", "stroke-opacity", "opacity", "transform", "fill-rule"]);
const PALETTE = new Set(Object.values(kit.PAL).concat(["none", "currentColor"]));
const problems = [];
function validate(label, markup, maxLen, mono) {
  if (typeof markup !== "string" || !markup.trim()) { problems.push(label + ": vide"); return; }
  if (markup.length > maxLen) problems.push(`${label}: ${markup.length} caractères (max ${maxLen})`);
  for (const m of markup.matchAll(/<\/?([a-zA-Z][\w:-]*)/g)) if (!ALLOWED_TAGS.has(m[1])) problems.push(`${label}: balise interdite <${m[1]}>`);
  for (const m of markup.matchAll(/\s([a-zA-Z][\w:-]*)\s*=\s*"([^"]*)"/g)) {
    if (!ALLOWED_ATTRS.has(m[1])) problems.push(`${label}: attribut interdit ${m[1]}`);
    if ((m[1] === "fill" || m[1] === "stroke") && !PALETTE.has(m[2])) problems.push(`${label}: couleur hors palette ${m[1]}="${m[2]}"`);
    if (mono && (m[1] === "fill" || m[1] === "stroke") && !["none", "currentColor"].includes(m[2])) problems.push(`${label}: les glyphes de jauge n'utilisent que currentColor/none`);
  }
  const open = (markup.match(/<g(\s[^>]*)?>/g) || []).filter(t => !t.endsWith("/>")).length, close = (markup.match(/<\/g>/g) || []).length;
  if (open !== close) problems.push(`${label}: <g> ouverts ${open} / fermés ${close}`);
}
for (const k in art.chars || {}) { if (!deck.chars[k]) problems.push(`chars.${k}: personnage inconnu du deck ${world}`); validate("chars." + k, art.chars[k], 6000, false); }
for (const k in art.gauges || {}) { if (!deck.gauges.find(g => g.key === k)) problems.push(`gauges.${k}: jauge inconnue`); validate("gauges." + k, art.gauges[k], 900, true); }
if (art.cover) validate("cover", art.cover, 8000, false);

// ---- page ----
const w = big ? 320 : 200;
const keys = Object.keys(art.chars || {}).filter(k => !only.length || only.includes(k));
const cards = keys.map(k => kit.cardHTML({ num: charKeys.indexOf(k) + 1, name: (deck.chars[k] || { name: k }).name, art: art.chars[k], w: w + "px" })).join("");
const cover = art.cover && !only.length ? kit.cardHTML({ num: "✶", name: deck.name, sub: "portada del mundo", art: art.cover, w: w + "px" }) : "";
const gauges = !only.length ? Object.keys(art.gauges || {}).map(k => {
  const g = deck.gauges.find(x => x.key === k) || { label: k };
  return `<div class="gz"><div class="med"><svg viewBox="0 0 24 24">${art.gauges[k]}</svg></div><div class="med sm"><svg viewBox="0 0 24 24">${art.gauges[k]}</svg></div><span>${g.label}</span></div>`;
}).join("") : "";
const n = keys.length + (cover ? 1 : 0);
const cols = big ? 3 : 5;
const rows = Math.ceil(n / cols);
const W = cols * (w + 18) + 30;
const H = 70 + rows * (w * 1.62 + 18) + (gauges ? 130 : 0) + 20;
const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Alegreya:ital,wght@0,400;0,500;0,700;1,400&display=swap">
<style>body{margin:0;background:#14213a;color:#f1e6cc;font-family:Alegreya,Georgia,serif;padding:15px}
h1{font:400 22px "IM Fell English SC",Georgia,serif;margin:0 0 12px;letter-spacing:.08em}
.grid{display:flex;flex-wrap:wrap;gap:18px}
.gz{display:inline-flex;flex-direction:column;align-items:center;gap:6px;margin:18px 18px 0 0;font:400 14px "IM Fell English SC",serif}
.gz{flex-direction:row}
.med{width:64px;height:64px;border-radius:50%;background:#f1e6cc;color:#1f1a17;border:3px solid #dfa92c;display:flex;align-items:center;justify-content:center}
.med svg{width:62%;height:62%}
.med.sm{width:34px;height:34px;border-width:2px}
${kit.CSS}</style>
<h1>${deck.name} · ${unit} · ${keys.length} personajes</h1>
<div class="grid">${cover}${cards}</div>
<div>${gauges}</div>`;
fs.mkdirSync(path.join(__dirname, "shots"), { recursive: true });
const htmlFile = path.join(__dirname, "shots", "sheet-" + unit + ".html");
const pngFile = path.join(__dirname, "shots", "sheet-" + unit + (only.length ? "-zoom" : "") + ".png");
fs.writeFileSync(htmlFile, html, "utf8");
try {
  execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${Math.round(W)},${Math.round(H)}`, "--virtual-time-budget=4000",
    "--user-data-dir=" + path.join(__dirname, "edgeprof-" + unit), "--screenshot=" + pngFile, "file:///" + htmlFile.replace(/\\/g, "/")], { stdio: "pipe", timeout: 60000 });
} catch (e) { console.log("capture: " + (e.message || e).toString().slice(0, 200)); }
console.log(fs.existsSync(pngFile) ? "PNG: " + pngFile : "ÉCHEC de la capture");
console.log(`${keys.length} personnages${cover ? " + portada" : ""}${gauges ? " + " + Object.keys(art.gauges).length + " glyphes" : ""}`);
const missing = charKeys.filter(k => !(art.chars || {})[k]);
if (!only.length && !/_/.test(unit) && missing.length) console.log("personnages sans illustration: " + missing.join(", "));
console.log(problems.length ? "PROBLÈMES:\n - " + problems.join("\n - ") : "validation du balisage: OK");
