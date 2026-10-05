// Données, sélection pure et témoins atteignables par la vraie pioche du moteur.
// Usage : node classroom/check-endings.cjs [rapport.json]
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),Endings=require('./endings.js');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'endings.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'art/raster/manifest.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'game.src.html'),'utf8');
const coreSource=source.match(/<script id="core">\s*([\s\S]*?)<\/script>/)[1];
const report={coreSha256:crypto.createHash('sha256').update(coreSource).digest('hex'),dataSha256:crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'),runtime:process.version,tests:[],simulations:{},passed:false};
const clone=value=>JSON.parse(JSON.stringify(value));
const worlds=Object.fromEntries(Object.keys(data.worlds).map(id=>[id,JSON.parse(fs.readFileSync(path.join(root,'decks',id+'.json'),'utf8'))]));
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};}
function core(seed){const math=Object.create(Math);math.random=rng(seed);const context={Math:math,Date};vm.runInNewContext(coreSource+'\nthis.Core=Core;',context);return context.Core;}
function validate(){
 assert.equal(data.version,1);assert.equal(Object.keys(data.worlds).length,5);const ids=new Set();
 for(const [worldId,w] of Object.entries(worlds)){
  const profiles=data.worlds[worldId];assert.equal(profiles.length,4);assert.deepEqual(profiles.map(p=>p.rule.type),['choices','balance','compare','fallback']);
  const gauges=new Set(w.gauges.map(g=>g.key));
  for(const p of profiles){
   assert.ok(p.id.startsWith(worldId+'-')&&!ids.has(p.id));ids.add(p.id);
   for(const field of ['title','epilogue'])for(const lang of ['es','fr'])assert.ok(typeof p[field][lang]==='string'&&p[field][lang].trim().length>0,p.id+'/'+field+'/'+lang);
   if(p.artCharacter!==null)assert.ok(w.chars[p.artCharacter],p.id+' : personnage connu');
   const art=p.artCharacter===null?manifest[worldId].cover:manifest[worldId].chars[p.artCharacter];assert.ok(art&&fs.existsSync(path.join(root,'art/raster',art)),p.id+' : image déjà présente');
   if(p.rule.type==='choices'){
    assert.ok(p.rule.all.length>0);for(const condition of p.rule.all){const card=w.cards.find(c=>c.id===condition.cardId);assert.ok(card,p.id+' : carte réelle');assert.ok(!condition.side||['l','r'].includes(condition.side));if(condition.side)assert.ok(card[condition.side]);}
   }else if(p.rule.type==='balance'){assert.equal(p.rule.min,35);assert.equal(p.rule.max,65);}
   else if(p.rule.type==='compare'){assert.ok(gauges.has(p.rule.left)&&gauges.has(p.rule.right));assert.notEqual(p.rule.left,p.rule.right);assert.equal(p.rule.op,'>=');}
  }
 }
 assert.equal(ids.size,20);report.tests.push('20 textes bilingues, références cartes/jauges et illustrations existantes ; ordre des quatre critères validé.');
}
function fixtures(){
 const expected={cole:['cole-rencontre','cole-equilibre','cole-defi','cole-amitie'],quijote:['quijote-barataria','quijote-equilibre','quijote-chevalier','quijote-compagnons'],goya:['goya-dialogue','goya-equilibre','goya-atelier','goya-cour'],botero:['botero-place','botero-equilibre','botero-style','botero-public'],frida:['frida-autoportrait','frida-equilibre','frida-peinture','frida-quotidien']};
 const trails={cole:[['alex1','r'],['alex2','r'],['alex3','r']],quijote:[['duques','l'],['barataria','l']],goya:[['enfermedad','r'],['manos','l']],botero:[['medellin_pide','l'],['promesa_plaza','r']],frida:[['mono_roba','r'],['mono_hombro','l']]};
 const pairs={cole:['notas','amigos'],quijote:['valor','sancho'],goya:['genio','corte'],botero:['estilo','fama'],frida:['arte','alegria']};
 for(const [id,w] of Object.entries(worlds)){
  const S=core(1).newState(w),baseline=clone(S);
  for(const [cardId,side] of trails[id])Endings.record(S,w.cards.find(c=>c.id===cardId),side);
  assert.deepEqual(clone(Object.fromEntries(Object.entries(S).filter(([k])=>k!=='endingTrail'))),baseline);
  const prior=JSON.stringify({S,data});const outcome=Endings.select(w,S,data);assert.equal(outcome.id,expected[id][0]);assert.equal(JSON.stringify({S,data}),prior,'sélection sans mutation');assert.ok(outcome.evidence.es&&outcome.evidence.fr);
  // Un flag annonciateur ou une scène seulement commencée ne suffit pas.
  S.flags={alex:'si',alex2:'si',insula:'si',sordo:'si',promesa:'si',mono:'amigo'};S.endingTrail.pop();assert.equal(Endings.select(w,S,data).id,expected[id][1]);
  S.endingTrail=[];for(const g of w.gauges)S.g[g.key]=35;assert.equal(Endings.select(w,S,data).id,expected[id][1]);for(const g of w.gauges)S.g[g.key]=65;assert.equal(Endings.select(w,S,data).id,expected[id][1]);
  const [left,right]=pairs[id];for(const g of w.gauges)S.g[g.key]=50;S.g[left]=2;S.g[right]=1;assert.equal(Endings.select(w,S,data).id,expected[id][2]);assert.ok(Endings.select(w,S,data).evidence.fr.includes('(2) ≥')&&Endings.select(w,S,data).evidence.fr.includes('(1)'));
  S.g[left]=1;S.g[right]=2;assert.equal(Endings.select(w,S,data).id,expected[id][3]);assert.ok(Endings.select(w,S,data).evidence.fr.includes('(2) >')&&Endings.select(w,S,data).evidence.fr.includes('(1)'));
  S.g[left]=20;S.g[right]=20;assert.equal(Endings.select(w,S,data).id,expected[id][2],'égalité hors équilibre : comparaison >=');
  const copied=Endings.list(id,data);copied[0].title.fr='changed';assert.notEqual(data.worlds[id][0].title.fr,'changed','liste indépendante');
  const card=w.cards[0];for(let i=0;i<305;i++)Endings.record(S,card,'l');assert.equal(S.endingTrail.length,300);const snapshot=JSON.stringify(S);Endings.record(S,card,'wrong');assert.equal(JSON.stringify(S),snapshot);
 }
 report.tests.push('Fixtures indépendantes des règles : 20 issues, priorité scènes/équilibre, bornes35/65, égalité, faibles valeurs2/1, flags insuffisants, pureté et journal borné.');
}
function choose(w,S,card,target,random){
 const profiles=data.worlds[w.id],arc=profiles[0].rule.all,comparison=profiles[2].rule;
 const needed=arc.find(c=>c.cardId===card.id);
 if(target===0&&needed?.side)return needed.side;
 if(target!==0&&needed?.side)return needed.side==='l'?'r':'l';
 const desired=Object.fromEntries(w.gauges.map(g=>[g.key,50]));
 if(target>=2){desired[comparison.left]=target===2?72:28;desired[comparison.right]=target===2?28:72;}
 function score(side){
  const fx=card[side].fx;let sum=0;
  for(const g of w.gauges){const v=S.g[g.key]+(fx[g.key]||0);if(v<=0||v>=100)sum+=1e7;sum+=(v-desired[g.key])**2;sum+=Math.max(0,20-v)**2*8+Math.max(0,v-80)**2*8;}
  return sum+random()*220;
 }
 return score('l')<=score('r')?'l':'r';
}
function unlock(Core,w,S,unlocked,wins){for(const tier of Core.newUnlocks(w,S,unlocked,wins))unlocked.add(tier.id);}
function replay(w,witness){
 const Core=core(witness.seed),S=Core.newState(w),unlocked=new Set(witness.unlockedAtStart);let result;
 for(const item of witness.choices){const card=Core.pick(w,S,unlocked);assert.ok(card&&card.id===item.cardId,'relecture : vraie pioche identique');assert.ok(card.id===w.start&&S.plays===0||Core.eligible(w,S,card,unlocked));result=Core.apply(w,S,card,item.side);Endings.record(S,card,item.side);assert.equal(result.dead,null,'témoin vivant');if(!result.win)unlock(Core,w,S,unlocked,witness.winsBefore);}
 assert.equal(result.win,true);assert.equal(Endings.select(w,S,data).id,witness.id);assert.deepEqual(clone(S.g),witness.finalGauges);
}
function simulate(){
 for(const [worldIndex,[id,w]] of Object.entries(Object.entries(worlds))){
  const witnesses={},unlocked=new Set([0]);let wins=0,deaths=0,empty=0,attempts=0;const maximum=3000;
  while(Object.keys(witnesses).length<4&&attempts<maximum){
   const target=attempts%4,seed=100000+Number(worldIndex)*10000+attempts,Core=core(seed),random=rng(seed^0x5a5a5a5a),S=Core.newState(w);
   const unlockedAtStart=[...unlocked],winsBefore=wins,choices=[];attempts++;
   for(let step=0;step<120;step++){
    const card=Core.pick(w,S,unlocked);if(!card){empty++;break;}
    assert.ok(card.id===w.start&&S.plays===0||Core.eligible(w,S,card,unlocked));
    const side=choose(w,S,card,target,random),result=Core.apply(w,S,card,side);Endings.record(S,card,side);choices.push({cardId:card.id,side});
    if(result.dead){deaths++;break;}
    if(result.win){
     const ending=Endings.select(w,S,data);assert.ok(ending);wins++;unlock(Core,w,S,unlocked,wins);
     if(!witnesses[ending.id])witnesses[ending.id]={id:ending.id,seed,unlockedAtStart,winsBefore,choices,finalGauges:clone(S.g),evidence:ending.evidence};
     break;
    }
    unlock(Core,w,S,unlocked,wins);
   }
  }
  report.simulations[id]={attempts,wins,deaths,empty,witnesses};
  assert.equal(empty,0,id+' : aucune pioche vide');assert.deepEqual(Object.keys(witnesses).sort(),data.worlds[id].map(p=>p.id).sort(),id+' : quatre réussites réellement atteintes');
  for(const witness of Object.values(witnesses))replay(w,witness);
  console.log(id+' : 4 réussites atteintes et rejouées · '+attempts+' parties · '+wins+' victoires.');
 }
 report.tests.push('20 témoins gagnants obtenus par pioche et effets vanilla, paliers débloqués normalement depuis zéro, puis rejoués avec leur seed et leurs vrais choix.');
}
try{validate();fixtures();simulate();report.passed=true;console.log('Fins narratives : 20/20 validées et atteignables, moteur et 40 fins de jauges inchangés.');}
finally{if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');}
