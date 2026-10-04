// Usage: node classroom/check-content.js [--base <git-ref>]
// Valide les retours de toutes les cartes ; --base vérifie aussi les règles et effets.
// Ce contrôle ne certifie ni le niveau linguistique ni la causalité narrative.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const cfg = read('classroom/content.json');
const worlds = Object.fromEntries(fs.readdirSync(path.join(root, 'decks'))
  .filter(file => file.endsWith('.json')).map(file => {const world = read('decks/' + file); return [world.id, world];}));
const errors = [];
const assert = (ok, message) => { if (!ok) errors.push(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = value => typeof value === 'string' && value.trim().length > 0;
const exactKeys = (value, keys) => object(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
const normalize = value => value.normalize('NFC').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const corpus = world => normalize(world.cards.flatMap(card => [card.t, card.l.es, card.r.es]).join(' '));
const corpora = Object.fromEntries(Object.entries(worlds).map(([id, world]) => [id, corpus(world)]));
const contains = (source, term) => new RegExp('(?<![\\p{L}\\p{N}])' + escapeRegex(normalize(term)) + '(?![\\p{L}\\p{N}])', 'u').test(source);

assert(text(cfg.version), 'Version de contenu absente.');
assert(text(cfg.notice), 'Notice de préversion absente.');
assert(object(cfg.feedback), 'feedback doit être un objet indexé par univers.');
let cardCount = 0, choiceCount = 0;
for (const id of Object.keys(cfg.feedback || {})) assert(worlds[id], 'Univers de feedback inconnu : ' + id);
for (const [id, world] of Object.entries(worlds)) {
  const entries = cfg.feedback?.[id];
  assert(object(entries), id + ' : retours manquants.');
  if (!object(entries)) continue;
  for (const card of world.cards) assert(Object.hasOwn(entries, card.id), id + '/' + card.id + ' : retours manquants.');
  assert(entries[world.start], id + ' : première carte non couverte.');
  for (const [cardId, choices] of Object.entries(entries)) {
    cardCount++;
    assert(world.cards.some(card => card.id === cardId), id + '/' + cardId + ' : carte inconnue.');
    assert(exactKeys(choices, ['l', 'r']), id + '/' + cardId + ' : les deux choix l/r sont obligatoires, sans autre clé.');
    for (const side of ['l', 'r']) {
      const entry = choices?.[side];
      const label = id + '/' + cardId + '/' + side;
      assert(exactKeys(entry, ['es', 'fr']), label + ' : seul le texte es/fr est permis (aucun effet de jeu).');
      for (const lang of ['es', 'fr']) {
        assert(text(entry?.[lang]), label + ' : texte ' + lang + ' absent.');
        assert(typeof entry?.[lang] !== 'string' || entry[lang].length <= 200, label + ' : retour ' + lang + ' trop long (> 200 caractères).');
      }
      if (text(entry?.es) && text(entry?.fr)) choiceCount++;
    }
  }
}

const expectedCards = Object.values(worlds).reduce((total, world) => total + world.cards.length, 0);
assert(cardCount === expectedCards, 'Toutes les cartes doivent avoir leurs retours (' + expectedCards + ').');
assert(choiceCount === expectedCards * 2, 'Tous les choix doivent avoir les deux langues (' + expectedCards * 2 + ').');

assert(Array.isArray(cfg.glossary), 'glossary doit être une liste de paires.');
const terms = new Set();
const lexicalCoverage = Object.fromEntries(Object.keys(worlds).map(id => [id, 0]));
for (const pair of cfg.glossary || []) {
  if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(text)) {
    errors.push('Entrée lexicale invalide : ' + JSON.stringify(pair));
    continue;
  }
  const [es] = pair, key = normalize(es);
  assert(!terms.has(key), 'Entrée lexicale en double : ' + es);
  terms.add(key);
  let found = false;
  for (const [id, source] of Object.entries(corpora)) if (contains(source, es)) { found = true; lexicalCoverage[id]++; }
  assert(found, 'Expression absente des situations et réponses : ' + es);
}
for (const [id, count] of Object.entries(lexicalCoverage)) assert(count >= 10, id + ' : moins de dix entrées lexicales attestées.');

// Les textes peuvent évoluer ; ces champs définissent l'équilibrage et les tirages.
function mechanics(world) {
  const keep = (value, keys) => Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
  return {
    ...keep(world, ['id', 'time', 'places', 'gauges', 'tiers', 'start']),
    chars: Object.fromEntries(Object.entries(world.chars).map(([id, char]) => [id, char.tier || 0])),
    cards: world.cards.map(card => ({
      ...keep(card, ['id', 'ch', 'tier', 'once', 'cond', 'after', 'before', 'month']),
      l: keep(card.l, ['fx', 'set']), r: keep(card.r, ['fx', 'set'])
    }))
  };
}
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--base' && !args[1].startsWith('-')), 'Usage : node classroom/check-content.js [--base <git-ref>]');
if (args.length === 2 && args[0] === '--base' && !args[1].startsWith('-')) {
  try {
    const ref = execFileSync('git', ['rev-parse', '--verify', args[1] + '^{commit}'], {cwd: root, encoding: 'utf8'}).trim();
    for (const [id, world] of Object.entries(worlds)) {
      const baseline = JSON.parse(execFileSync('git', ['show', ref + ':decks/' + id + '.json'], {cwd: root, encoding: 'utf8'}));
      assert(JSON.stringify(mechanics(world)) === JSON.stringify(mechanics(baseline)), id + ' : règles, tirages ou effets modifiés depuis ' + args[1]);
    }
    console.log('Règles et effets comparés à ' + ref + '.');
  } catch (error) { errors.push('Comparaison Git impossible : ' + error.message); }
} else {
  console.log('Comparaison des effets non demandée (utiliser --base <git-ref>).');
}
console.log(cardCount + ' cartes / ' + choiceCount + ' retours bilingues ; ' + terms.size + ' entrées lexicales.');
console.log('Entrées attestées par univers : ' + Object.entries(lexicalCoverage).map(([id, count]) => id + ' ' + count).join(' · '));
if (errors.length) console.error(errors.map(error => 'ERREUR : ' + error).join('\n'));
console.log('TOTAL erreurs : ' + errors.length);
process.exitCode = errors.length ? 1 : 0;
