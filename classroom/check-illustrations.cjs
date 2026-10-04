// La collection complète doit couvrir les 225 situations, sans repli de personnage.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const {loadRasterImages}=require('../build.js');
const ids=['cole','quijote','goya','botero','frida'];
const decks=Object.fromEntries(ids.map(id=>[id,JSON.parse(fs.readFileSync(path.join(root,'decks',id+'.json'),'utf8'))]));
const art=loadRasterImages(path.join(root,'art/raster'),decks);
const files=JSON.parse(fs.readFileSync(path.join(root,'art/raster/manifest.json'),'utf8'));
let characters=0,cards=0;const names=new Set();
for(const [id,d] of Object.entries(decks)){
 assert.ok(art[id]?.coverImage,id+': couverture absente');
 assert.ok(art[id]?.backImage,id+': dos absent');
 names.add(files[id].cover);names.add(files[id].back);
 for(const key of Object.keys(d.chars)){
  assert.ok(art[id].charImages[key],id+'/'+key+': illustration absente');
  names.add(files[id].chars[key]);characters++;
 }
 for(const card of d.cards){assert.ok(art[id].charImages[card.ch],id+'/'+card.id+': situation non illustrée');cards++;}
 console.log(`${id}: ${Object.keys(d.chars).length} personnages, ${d.cards.length} situations, couverture et dos OK`);
}
assert.equal(characters,76);assert.equal(cards,225);assert.equal(names.size,82);
console.log(`${names.size} visuels distincts couvrent ${cards} situations ; ${characters} personnages, 5 couvertures, 1 dos commun.`);
