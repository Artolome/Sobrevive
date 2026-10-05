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
// Les images matricielles sont facultatives et embarquées : aucune requête réseau en jeu.
function loadRasterImages(rasterDir, decks) {
  const manifestFile = path.join(rasterDir, "manifest.json");
  if (!fs.existsSync(manifestFile)) return {};
  const fail = message => { throw new Error("Illustrations raster : " + message); };
  const object = value => value !== null && typeof value === "object" && !Array.isArray(value);
  let manifest;
  try { manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8")); }
  catch (error) { fail("manifest.json illisible : " + error.message); }
  if (!object(manifest)) fail("manifest.json doit être un objet indexé par univers.");
  const loaded = {}, cache = new Map();
  const readImage = filename => {
    if (typeof filename !== "string" || !/^[a-z0-9][a-z0-9_-]*\.(png|jpe?g|webp)$/.test(filename)) {
      fail("nom de fichier local invalide : " + String(filename));
    }
    if (cache.has(filename)) return cache.get(filename);
    const file = path.join(rasterDir, filename);
    let info, bytes;
    try {
      info = fs.lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink()) fail(filename + " doit être un fichier ordinaire.");
      if (info.size > 4 * 1024 * 1024) fail(filename + " dépasse 4 Mio.");
      bytes = fs.readFileSync(file);
    } catch (error) { fail(filename + " : " + error.message); }
    const ext = path.extname(filename);
    let mime;
    if (ext === ".png" && bytes.length >= 24 &&
        bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        bytes.toString("ascii", 12, 16) === "IHDR") mime = "image/png";
    if ((ext === ".jpg" || ext === ".jpeg") && bytes.length >= 4 &&
        bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = "image/jpeg";
    if (ext === ".webp" && bytes.length >= 16 && bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP" &&
        ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16))) mime = "image/webp";
    if (!mime) fail(filename + " : signature d’image incompatible avec l’extension.");
    const data = "data:" + mime + ";base64," + bytes.toString("base64");
    cache.set(filename, data);
    return data;
  };
  for (const [id, entry] of Object.entries(manifest)) {
    if (!Object.hasOwn(decks, id)) fail("univers inconnu : " + id);
    if (!object(entry) || Object.keys(entry).some(key => !["cover", "chars", "back"].includes(key))) {
      fail(id + " : seules les clés cover, chars et back sont admises.");
    }
    const images = { charImages: {} };
    if (Object.hasOwn(entry, "cover")) images.coverImage = readImage(entry.cover);
    if (Object.hasOwn(entry, "back")) images.backImage = readImage(entry.back);
    if (Object.hasOwn(entry, "chars")) {
      if (!object(entry.chars)) fail(id + " : chars doit être un objet.");
      for (const [key, filename] of Object.entries(entry.chars)) {
        if (!Object.hasOwn(decks[id].chars, key)) fail(id + " : personnage inconnu : " + key);
        images.charImages[key] = readImage(filename);
      }
    }
    loaded[id] = images;
  }
  return loaded;
}
function build(options = {}) {
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
const raster = loadRasterImages(path.join(__dirname, "art", "raster"), decks);
for (const [id, images] of Object.entries(raster)) {
  Object.assign(art[id], images);
  report.push(`${id}: ${Object.keys(images.charImages).length} personnage(s) raster, couverture raster ${images.coverImage ? "oui" : "non"}`);
}
let src = fs.readFileSync(path.join(__dirname, "game.src.html"), "utf8");
const kitSrc = fs.readFileSync(path.join(__dirname, "tarot-kit.js"), "utf8");
const LS = new RegExp("[" + String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + "]", "g");
const data = JSON.stringify({ decks, art }).split("</").join("<" + String.fromCharCode(92) + "/").replace(LS, "");
src = src.replace("<!--KIT-->", () => "<script>\n" + kitSrc + "\n</script>").replace("<!--DATA-->", () => "<script>window.__SV=" + data + ";</script>");
src = require("./classroom/build-extra.js")(src);
if (options.transform) src = options.transform(src);
const out = options.out || path.join(__dirname, "index.html");
fs.writeFileSync(out, src, "utf8");
console.log(report.join("\n"));
console.log(`→ ${out} (${Math.round(fs.statSync(out).size / 1024)} Ko)`);
}
if (require.main === module) build();
module.exports = { loadRasterImages, build };
