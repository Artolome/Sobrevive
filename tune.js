// Réglage de la difficulté : cherche par monde un facteur d'amplification des effets
// visant ~40 % de victoires en jeu aléatoire, puis l'applique (cap ±12, min 2).
// Rend aussi les cartes-quiz uniques par partie. Usage: node tune.js [--apply]
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
eval(html.match(/<script id="core">\s*([\s\S]*?)<\/script>/)[1] + "\n;globalThis.__Core=Core;");
const Core = globalThis.__Core;
const APPLY = process.argv.includes("--apply");
const TARGET = 0.40, N = 2000;
const FACTORS = [1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.3, 2.6, 3.0];

function scaled(U, f) {
  const V = JSON.parse(JSON.stringify(U));
  for (const c of V.cards) for (const s of ["l", "r"]) for (const k in c[s].fx) {
    const v = c[s].fx[k];
    c[s].fx[k] = Math.sign(v) * Math.min(12, Math.max(2, Math.round(Math.abs(v) * f)));
  }
  return V;
}
function winRate(U) {
  const tierIds = new Set([0, ...(U.tiers || []).map(t => t.id)]);
  let wins = 0, tot = 0;
  for (let i = 0; i < N; i++) {
    const S = Core.newState(U); let cur = Core.pick(U, S, tierIds), steps = 0;
    while (cur && steps < 120) {
      const r = Core.apply(U, S, cur, Math.random() < 0.5 ? "l" : "r"); steps++;
      if (r.dead) break; if (r.win) { wins++; break; }
      cur = Core.pick(U, S, tierIds);
    }
    tot += steps;
  }
  return { win: wins / N, avg: tot / N };
}
const ids = fs.readdirSync(path.join(__dirname, "decks")).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));
for (const id of ids) {
  const file = path.join(__dirname, "decks", id + ".json");
  const U = JSON.parse(fs.readFileSync(file, "utf8"));
  let best = null;
  const line = [];
  for (const f of FACTORS) {
    const r = winRate(scaled(U, f));
    line.push(`×${f}: ${Math.round(r.win * 100)}% (${r.avg.toFixed(0)} c.)`);
    if (!best || Math.abs(r.win - TARGET) < Math.abs(best.win - TARGET)) best = { f, ...r };
    if (r.win < TARGET - 0.12) break;
  }
  console.log(`${id}: ${line.join(" · ")}  → facteur retenu ×${best.f} (${Math.round(best.win * 100)}%, ${best.avg.toFixed(0)} cartes)`);
  if (APPLY) {
    const V = scaled(U, best.f);
    let quiz = 0;
    for (const c of V.cards) if (/quiz/.test(c.id) && !c.once) { c.once = true; quiz++; }
    fs.writeFileSync(file, JSON.stringify(V, null, 1), "utf8");
    console.log(`   appliqué · ${quiz} carte(s) quiz rendue(s) uniques`);
  }
}
