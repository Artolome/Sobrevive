// Valide les decks JSON contre le noyau du jeu et simule des parties.
// Usage: node check.js [id ...]   (sans argument : tous les decks présents)
const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const m = html.match(/<script id="core">\s*([\s\S]*?)<\/script>/);
if (!m) { console.log("ERREUR: bloc <script id=\"core\"> introuvable"); process.exit(1); }
eval(m[1] + "\n;globalThis.__Core=Core;");
const Core = globalThis.__Core;

const ids = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync(path.join(__dirname, "decks")).filter(f => f.endsWith(".json")).map(f => f.replace(".json", ""));

let totalErrs = 0;
for (const id of ids) {
  const file = path.join(__dirname, "decks", id + ".json");
  let U;
  try { U = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { console.log(`\n=== ${id}: JSON INVALIDE: ${e.message}`); totalErrs++; continue; }
  const errs = [], warns = [];
  const gk = new Set((U.gauges || []).map(g => g.key));
  if (!U.gauges || U.gauges.length !== 4) errs.push("gauges: il en faut exactement 4");
  for (const g of U.gauges || []) if (!g.key || !g.icon || !g.label) errs.push("gauge incomplète " + JSON.stringify(g));
  for (const k of gk) for (const d of ["lo", "hi"]) { const x = U.deaths && U.deaths[k] && U.deaths[k][d]; if (!x || !x.es || !x.fr) errs.push(`deaths.${k}.${d} manquant`); }
  if (!U.win || !U.win.es || !U.win.fr) errs.push("win manquant");
  if (!U.time || !["date", "year", "chapter"].includes(U.time.mode)) errs.push("time.mode invalide");
  const tierIds = new Set([0, ...(U.tiers || []).map(t => t.id)]);
  const ids2 = new Set();
  const setFlags = {};
  for (const c of U.cards || []) for (const s of ["l", "r"]) if (c[s] && c[s].set) for (const k in c[s].set) (setFlags[k] = setFlags[k] || new Set()).add(c[s].set[k] + "@" + (c.tier || 0));
  const startCard = (U.cards || []).find(c => c.id === U.start);
  if (!startCard) errs.push("start introuvable: " + U.start);
  else { if ((startCard.tier || 0) !== 0) errs.push("start doit être tier 0"); if (!startCard.once) errs.push("start doit être once"); }
  for (const c of U.cards || []) {
    if (ids2.has(c.id)) errs.push(c.id + ": id en double"); ids2.add(c.id);
    const ch = U.chars && U.chars[c.ch];
    if (!ch) errs.push(c.id + ": personnage inconnu " + c.ch);
    else if ((ch.tier || 0) > (c.tier || 0)) errs.push(c.id + `: personnage ${c.ch} tier ${ch.tier} > carte tier ${c.tier || 0}`);
    if (!tierIds.has(c.tier || 0)) errs.push(c.id + ": tier inconnu " + c.tier);
    if (!c.t || !c.f) errs.push(c.id + ": t/f manquant");
    if (c.t && c.t.length > 130) warns.push(c.id + `: texte long (${c.t.length})`);
    if ((c.set || c.cond || c.after != null || c.before != null || c.month) && !c.once) errs.push(c.id + ": once manquant");
    if (c.after != null && c.before != null && c.before - c.after < 0.3) warns.push(c.id + ": fenêtre étroite");
    if (c.month && U.time.mode !== "date") errs.push(c.id + ": month hors mode date");
    if (c.cond) for (const k in c.cond) {
      const ok = [...(setFlags[k] || [])].some(v => { const [val, tier] = v.split("@"); return val === String(c.cond[k]) && +tier <= (c.tier || 0); });
      if (!ok) errs.push(c.id + `: cond ${k}=${c.cond[k]} jamais posée (ou posée par un tier supérieur)`);
    }
    for (const s of ["l", "r"]) {
      const o = c[s];
      if (!o || !o.es || !o.fr || !o.fx) { errs.push(c.id + "/" + s + ": choix incomplet"); continue; }
      if (o.es.length > 40) warns.push(c.id + "/" + s + `: label long (${o.es.length})`);
      const keys = Object.keys(o.fx);
      if (!keys.length || keys.length > 3) errs.push(c.id + "/" + s + ": fx doit avoir 1 à 3 jauges");
      for (const k of keys) {
        if (!gk.has(k)) errs.push(c.id + "/" + s + ": jauge inconnue " + k);
        const v = o.fx[k];
        if (!Number.isInteger(v) || v === 0 || Math.abs(v) > 12) errs.push(c.id + "/" + s + `: fx ${k}=${v} hors [-12,12] ou nul`);
      }
    }
  }
  // balance
  const sums = {}, pos = {}, neg = {};
  for (const k of gk) { sums[k] = 0; pos[k] = 0; neg[k] = 0; }
  for (const c of U.cards || []) for (const s of ["l", "r"]) if (c[s] && c[s].fx) for (const k in c[s].fx) if (gk.has(k)) { sums[k] += c[s].fx[k]; if (c[s].fx[k] > 0) pos[k]++; else neg[k]++; }
  const tierCount = {};
  for (const c of U.cards || []) tierCount[c.tier || 0] = (tierCount[c.tier || 0] || 0) + 1;
  const charTier = {};
  for (const k in U.chars || {}) charTier[U.chars[k].tier || 0] = (charTier[U.chars[k].tier || 0] || 0) + 1;

  console.log(`\n=== ${id} — ${U.name} ${U.emoji} · ${(U.cards || []).length} cartes (tiers ${JSON.stringify(tierCount)}) · ${Object.keys(U.chars || {}).length} personnages (tiers ${JSON.stringify(charTier)}) · time ${JSON.stringify(U.time)}`);
  console.log("balance par jauge (somme / +n / -n):", [...gk].map(k => `${k} ${sums[k] >= 0 ? "+" : ""}${sums[k]} (+${pos[k]}/-${neg[k]})`).join(" | "));
  if (errs.length) { console.log("ERREURS:\n - " + errs.join("\n - ")); totalErrs += errs.length; }
  if (warns.length) console.log("avertissements:\n - " + warns.join("\n - "));
  if (errs.length) continue;

  // simulation
  function sim(n, unlAll) {
    let deaths = 0, wins = 0, undef = 0, tot = 0, t1 = 0, t2 = 0;
    const deathBy = {}, seen = new Set();
    for (let i = 0; i < n; i++) {
      const unl = unlAll ? new Set(tierIds) : new Set([0]);
      const S = Core.newState(U); let steps = 0, wins0 = 0;
      let cur = Core.pick(U, S, unl);
      while (steps < 120) {
        if (!cur) { undef++; break; }
        seen.add(cur.id);
        const side = Math.random() < 0.5 ? "l" : "r";
        const res = Core.apply(U, S, cur, side); steps++;
        if (!unlAll) { for (const t of Core.newUnlocks(U, S, unl, wins0)) { unl.add(t.id); if (t.id === 1) t1++; } }
        if (res.dead) { deaths++; deathBy[res.dead.g + "-" + res.dead.dir] = (deathBy[res.dead.g + "-" + res.dead.dir] || 0) + 1; break; }
        if (res.win) { wins++; wins0++; if (!unlAll) { for (const t of Core.newUnlocks(U, S, unl, wins0)) { unl.add(t.id); if (t.id === 2) t2++; } } break; }
        cur = Core.pick(U, S, unl);
      }
      tot += steps;
    }
    return { deaths, wins, undef, avg: (tot / n).toFixed(1), deathBy, seen, t1, t2 };
  }
  const a = sim(1500, true), b = sim(1500, false);
  console.log(`sim tout débloqué (1500, choix aléatoires): victoires ${Math.round(100 * a.wins / 1500)}% · cartes/partie ${a.avg} · tirages vides ${a.undef} · fins: ${JSON.stringify(a.deathBy)}`);
  console.log(`sim tier 0 seul (1500): victoires ${Math.round(100 * b.wins / 1500)}% · cartes/partie ${b.avg} · tirages vides ${b.undef} · palier 1 atteint ${Math.round(100 * b.t1 / 1500)}% · palier 2 ${Math.round(100 * b.t2 / 1500)}%`);
  const never = (U.cards || []).filter(c => !a.seen.has(c.id)).map(c => c.id);
  console.log("cartes jamais tirées (tout débloqué):", never.length ? never.join(", ") : "aucune");
}
console.log(`\nTOTAL erreurs: ${totalErrs}`);
process.exit(totalErrs ? 1 : 0);
