// Assemble le jeu en UN seul fichier : game.src.html + tarot-kit.js + decks/*.json + art/*.json → index.html
const fs = require("fs");
const path = require("path");
const kit = require("./tarot-kit.js");
const IDS = ["cole", "quijote", "goya", "botero", "frida"];
const ALLOWED_TAGS = new Set(["g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const ALLOWED_ATTRS = new Set(["d", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "width", "height", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "fill-opacity", "stroke-opacity", "opacity", "transform", "fill-rule"]);
function safe(markup) {
  if (typeof markup !== "string" || !markup.trim()) return false;
  for (const m of markup.matchAll(/<\/?([a-zA-Z][\w:-]*)/g)) if (!ALLOWED_TAGS.has(m[1])) return false;
  for (const m of markup.matchAll(/\s([a-zA-Z][\w:-]*)\s*=\s*"/g)) if (!ALLOWED_ATTRS.has(m[1])) return false;
  return true;
}
function readJSON(f) { try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch (e) { return null; } }
const decks = {}, art = {};
const report = [];
for (const id of IDS) {
  const d = readJSON(path.join(__dirname, "decks", id + ".json"));
  if (!d) { report.push(id + ": deck manquant"); continue; }
  decks[id] = d;
  const a = { chars: {}, gauges: {}, cover: null };
  const files = fs.existsSync(path.join(__dirname, "art")) ? fs.readdirSync(path.join(__dirname, "art")).filter(f => f === id + ".json" || f.startsWith(id + "_")) : [];
  if (id === "quijote") files.unshift("exemplars.json");
  let rejected = 0;
  for (const f of files) {
    const j = readJSON(path.join(__dirname, "art", f));
    if (!j) { report.push(`${f}: JSON illisible`); continue; }
    for (const k in j.chars || {}) { if (d.chars[k] && safe(j.chars[k])) a.chars[k] = j.chars[k]; else rejected++; }
    for (const k in j.gauges || {}) { if (d.gauges.find(g => g.key === k) && safe(j.gauges[k])) a.gauges[k] = j.gauges[k]; else rejected++; }
    if (j.cover) { if (safe(j.cover)) a.cover = j.cover; else rejected++; }
  }
  art[id] = a;
  const missing = Object.keys(d.chars).filter(k => !a.chars[k]);
  report.push(`${id}: ${Object.keys(a.chars).length}/${Object.keys(d.chars).length} personnages illustrés, ${Object.keys(a.gauges).length}/4 glyphes, couverture ${a.cover ? "oui" : "non"}${rejected ? `, ${rejected} rejeté(s)` : ""}${missing.length ? " — sans illustration: " + missing.join(", ") : ""}`);
}
let src = fs.readFileSync(path.join(__dirname, "game.src.html"), "utf8");
const kitSrc = fs.readFileSync(path.join(__dirname, "tarot-kit.js"), "utf8");
const LS = new RegExp("[" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]", "g");
const data = JSON.stringify({ decks, art }).split("</").join("<" + String.fromCharCode(92) + "/").replace(LS, "");
src = src.replace("<!--KIT-->", () => "<script>\n" + kitSrc + "\n</script>").replace("<!--DATA-->", () => "<script>window.__SV=" + data + ";</script>");
src = require("./classroom/build-extra.js")(src);
const out = path.join(__dirname, "index.html");
fs.writeFileSync(out, src, "utf8");
console.log(report.join("\n"));
console.log(`→ ${out} (${Math.round(fs.statSync(out).size / 1024)} Ko)`);
