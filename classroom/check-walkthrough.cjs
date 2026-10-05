// Contrôles du guide et de sa correspondance aux sources. Aucun navigateur requis.
'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm');
const {loadModel,validateModel,render,chronology,cardPaths,successCriteria}=require('./build-walkthrough.cjs');
const model=loadModel(),report=validateModel(model),html=render(model);
const count=(re)=>(html.match(re)||[]).length;
assert.equal(count(/class="story-card"/g),225);
assert.equal(count(/<section class="choice">/g),450);
assert.equal(count(/<div class="feedback">/g),450);
assert.equal(count(/<article class="ending">/g),20);
assert.equal(count(/class="gauge-ending"/g),40);
assert.equal(count(/<article class="victory"/g),20);
assert.equal(count(/class="success-rule"/g),20);
assert.equal(report.victories,20);assert.equal(report.totalEndings,60);
assert.ok(html.includes('60 fins : 40 fins de jauge et 20 réussites'));
assert.ok(!html.includes('40 fins de jauge et 5 victoires'));
assert.ok(html.includes('ne remplissent pas rétroactivement la collection'));
for(const w of model.worlds){
 for(const [index,ending] of w.successEndings.entries()){
  const criteria=successCriteria(w.deck,ending,index,w.successEndings),rule=ending.rule;
  assert.ok(html.includes('id="reussite-'+ending.id+'"'));
  if(rule.type==='choices')for(const item of rule.all)assert.ok(criteria.includes('href="#carte-'+w.deck.id+'-'+item.cardId+'"'),'Critère sans lien vers sa carte');
  if(rule.type==='balance')assert.ok(criteria.includes(rule.min+' et '+rule.max+', bornes incluses'));
  if(rule.type==='compare')assert.ok(criteria.includes('supérieure ou égale')&&criteria.includes('L’égalité'));
  if(rule.type==='fallback')assert.ok(criteria.includes('strictement supérieure'));
 }
 // Vérifie les priorités décrites contre le véritable sélecteur, pas une copie de sa logique.
 const [arc,balance,compare,fallback]=w.successEndings,d=w.deck;
 const state=model.Core.newState(d);state.endingTrail=arc.rule.all.map(item=>({cardId:item.cardId,side:item.side||'l'}));
 assert.equal(model.Endings.select(d,state,model.endings).id,arc.id,'Un arc vécu prime sur les jauges équilibrées');
 state.endingTrail=[];
 for(const bound of [35,65]){for(const g of d.gauges)state.g[g.key]=bound;assert.equal(model.Endings.select(d,state,model.endings).id,balance.id,'35 et 65 sont inclus dans l’équilibre');}
 for(const g of d.gauges)state.g[g.key]=50;
 const independent=d.gauges.find(g=>![compare.rule.left,compare.rule.right].includes(g.key));state.g[independent.key]=20;
 assert.equal(model.Endings.select(d,state,model.endings).id,compare.id,'Égalité hors équilibre : priorité à la comparaison ≥');
 state.g[compare.rule.right]=51;
 assert.equal(model.Endings.select(d,state,model.endings).id,fallback.id,'Le repli est l’autre orientation');
}
assert.equal(report.flags,12);assert.equal(report.arcs,11);assert.equal(report.conditionalCards,17);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(new Set(ids).size,ids.length,'Identifiants HTML dupliqués');
for(const [,target] of html.matchAll(/href="#([^"]+)"/g))assert.ok(ids.includes(target),'Lien interne cassé : '+target);
assert.equal(count(/src="https?:/g),0);assert.equal(count(/url\(https?:/g),0);
assert.ok(html.includes('data:font/woff2;base64,'),'Polices non embarquées');
assert.ok(html.includes('OFL')&&html.includes('Nunito Sans')&&html.includes('Fraunces'));
assert.ok(html.includes('@media print'));assert.ok(html.includes('beforeprint'));
assert.ok(html.includes('20 dernières parties')&&html.includes('1 500 au total')&&html.includes('300 choix par partie'));
assert.ok(!html.includes('en affiche 30'),'Ancien bilan encore décrit');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];assert.ok(script);new vm.Script(script);
const d=id=>model.worlds.find(w=>w.deck.id===id).deck;
assert.ok(chronology(d('frida')).step.includes('sans aléa'));
assert.ok(chronology(d('quijote')).step.includes('sans aléa'));
for(const id of ['cole','goya','botero'])assert.ok(chronology(d(id)).step.includes('aléatoire'));
const q=d('quijote'),duel=q.cards.find(c=>c.id==='blancaluna'),reveal=q.cards.find(c=>c.id==='revelacion');
assert.ok(cardPaths(duel,q).includes('trigger'));assert.ok(cardPaths(reveal,q).includes('conditional'));
const s=model.Core.newState(q);s.plays=17;s.flags={duelo:'perdido'};s.t=19;
assert.equal(model.Core.eligible(q,s,reveal,new Set([0,1,2])),false,'La suite du duel attend 70 %');
s.t=20;assert.equal(model.Core.eligible(q,s,reveal,new Set([0,1,2])),true);
const c=d('cole');assert.ok(!c.cards.find(x=>x.id==='viaje1').l.set&&!c.cards.find(x=>x.id==='viajebus').cond,'Le voyage ne doit pas devenir une fausse chaîne');
console.log(JSON.stringify({...report,structuralChecks:'225 cartes, 450 choix/retours, 60 fins, critères de réussite, liens internes, polices locales, impression, JavaScript valide, fenêtres et faux enchaînements',bytes:Buffer.byteLength(html)},null,2));
