// Usage : node classroom/check-raster.cjs — aucune dépendance ni modification des assets du jeu.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadRasterImages } = require('../build.js');
const kit = require('../tarot-kit.js');
const tempParent = fs.realpathSync(os.tmpdir());
const dir = fs.mkdtempSync(path.join(tempParent, 'sobrevive-raster-'));
const decks = { cole: { chars: { pons: {} } } };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJZ0AAAAASUVORK5CYII=', 'base64');
const manifest = value => fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(value));
const load = () => loadRasterImages(dir, decks);
let checks = 0;
function check(name, run) {
  try { run(); checks++; }
  catch (error) { error.message = name + ' : ' + error.message; throw error; }
}
try {
  check('SVG seul sans manifest', () => assert.deepEqual(load(), {}));
  fs.writeFileSync(path.join(dir, 'sample.png'), png);
  check('couverture et personnage embarqués', () => {
    manifest({ cole: { cover: 'sample.png', chars: { pons: 'sample.png' } } });
    const images = load().cole;
    assert.equal(images.coverImage, 'data:image/png;base64,' + png.toString('base64'));
    assert.equal(images.charImages.pons, images.coverImage);
  });
  check('dos embarqué sans exposer une URL externe', () => {
    manifest({ cole: { back: 'sample.png' } });
    const image=load().cole.backImage;
    assert.match(kit.backHTML({image}), /class="t-back-image" src="data:image\/png;base64,/);
    assert.doesNotMatch(kit.backHTML({image:'https://example.org/back.png'}), /<img|https:/);
  });
  check('JSON mal formé rejeté', () => {
    fs.writeFileSync(path.join(dir, 'manifest.json'), '{');
    assert.throws(load, /manifest.json illisible/);
  });
  for (const bad of [null, [], 'image']) check('structure racine invalide', () => {
    manifest(bad); assert.throws(load, /doit être un objet/);
  });
  for (const bad of [{ ailleurs: {} }, { constructor: {} }]) check('univers inconnu rejeté', () => {
    manifest(bad); assert.throws(load, /univers inconnu/);
  });
  for (const bad of [null, [], { covers: 'sample.png' }]) check('structure univers invalide', () => {
    manifest({ cole: bad }); assert.throws(load, /seules les clés/);
  });
  check('liste de personnages invalide', () => {
    manifest({ cole: { chars: [] } }); assert.throws(load, /chars doit être un objet/);
  });
  for (const key of ['absent', 'constructor', '__proto__']) check('personnage inconnu rejeté', () => {
    manifest({ cole: { chars: { [key]: 'sample.png' } } }); assert.throws(load, /personnage inconnu/);
  });
  for (const name of ['../sample.png', '..\\sample.png', '/sample.png', 'C:\\sample.png',
    'nested/sample.png', 'https://example.org/sample.png', 'data:image/png;base64,AA==',
    'sample.svg', 'sample.png:stream', 'sample.png" onerror="x', null, {}]) {
    check('chemin non local ou extension rejeté', () => {
      manifest({ cole: { cover: name } }); assert.throws(load, /nom de fichier local invalide/);
    });
  }
  check('fichier absent signalé', () => {
    manifest({ cole: { cover: 'missing.png' } }); assert.throws(load, /missing.png/);
  });
  check('répertoire refusé', () => {
    fs.mkdirSync(path.join(dir, 'folder.png'));
    manifest({ cole: { cover: 'folder.png' } }); assert.throws(load, /fichier ordinaire/);
  });
  check('fichier trop lourd refusé avant incorporation', () => {
    fs.writeFileSync(path.join(dir, 'large.png'), Buffer.alloc(4 * 1024 * 1024 + 1));
    manifest({ cole: { cover: 'large.png' } }); assert.throws(load, /dépasse 4 Mio/);
  });
  for (const [filename, bytes] of [['wrong.jpg', png], ['false.png', Buffer.from('<svg/>')],
    ['empty.png', Buffer.alloc(0)], ['wrong.webp', Buffer.from('RIFF0000WEBPXXXX')]]) {
    check('signature incompatible refusée', () => {
      fs.writeFileSync(path.join(dir, filename), bytes);
      manifest({ cole: { cover: filename } }); assert.throws(load, /signature d’image incompatible/);
    });
  }
  // Contrôle des signatures supplémentaires autorisées ; leur décodage relève du navigateur.
  for (const [filename, bytes, mime] of [
    ['sample.jpg', Buffer.from([255, 216, 255, 224]), 'jpeg'],
    ['sample.jpeg', Buffer.from([255, 216, 255, 224]), 'jpeg'],
    ['sample.webp', Buffer.from('RIFF0000WEBPVP8 '), 'webp']
  ]) check('signature ' + mime + ' autorisée', () => {
    fs.writeFileSync(path.join(dir, filename), bytes);
    manifest({ cole: { cover: filename } });
    assert.equal(load().cole.coverImage, 'data:image/' + mime + ';base64,' + bytes.toString('base64'));
  });
  const options = { num: 1, name: 'Señora Pons', art: '<circle r="8"/>', image: 'data:image/png;base64,' + png.toString('base64') };
  check('image décorative sans glissement natif', () => {
    const html = kit.cardHTML(options);
    assert.match(html, /<img src="data:image\/png;base64,[^"]+" alt="" draggable="false">/);
    assert.match(html, /<b>Señora Pons<\/b>/);
    assert.doesNotMatch(html, /<svg/);
  });
  for (const cls of ['unknown', 'locked', 'large unknown']) check('illustration non révélée', () => {
    const html = kit.cardHTML({ ...options, cls, name: '¿…?' });
    assert.doesNotMatch(html, /<img|data:image/);
    assert.match(html, /<svg/);
    assert.match(html, /<b>¿…\?<\/b>/);
  });
  for (const image of [undefined, 'https://example.org/image.png', 'data:image/svg+xml;base64,AAAA',
    'data:image/png;base64,AAAA" onerror="alert(1)']) check('repli SVG sans source externe', () => {
    const html = kit.cardHTML({ ...options, image });
    assert.match(html, /<svg/); assert.doesNotMatch(html, /<img/);
  });
  console.log(checks + ' contrôles raster réussis : manifest, fichiers, formats, limites et cartes.');
} finally {
  const resolved = path.resolve(dir);
  if (path.dirname(resolved) !== tempParent || !path.basename(resolved).startsWith('sobrevive-raster-')) {
    throw new Error('Nettoyage refusé hors du dossier temporaire de test.');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}
