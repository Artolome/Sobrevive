// Parcours ordonnés : contrats purs, effets inchangés et témoins joués sans réinitialiser les jauges.
// Usage : node classroom/check-story.cjs [rapport.json]
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),Engine=require('./story-engine.js'),Endings=require('./endings.js'),{loadConfig,buildStory}=require('./build-story.cjs');
const ids=['cole','quijote','goya','botero','frida'],worlds=Object.fromEntries(ids.map(id=>[id,JSON.parse(fs.readFileSync(path.join(root,'decks',id+'.json'),'utf8'))]));
const config=loadConfig(),endings=JSON.parse(fs.readFileSync(path.join(__dirname,'endings.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'game.src.html'),'utf8').match(/<script id="core">\s*([\s\S]*?)<\/script>/)[1];
const clone=value=>JSON.parse(JSON.stringify(value));
const report={runtime:process.version,coreSha256:crypto.createHash('sha256').update(source).digest('hex'),configSha256:crypto.createHash('sha256').update(JSON.stringify(config)).digest('hex'),tests:[],worlds:{},passed:false};
function makeCore(story=false){const math=Object.create(Math);math.random=story?()=>{throw new Error('Un parcours ordonné ne doit pas tirer au hasard');}:()=>0;const context={Math:math,Date};vm.runInNewContext(source+'\nthis.Core=Core;',context);const Core=context.Core;return {Core,api:story?Engine.install(Core,config):null};}
const allTiers=w=>new Set([0,...w.tiers.map(t=>t.id)]);
function rng(seed){let value=seed>>>0;return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};}
function throwsChanged(change,label){const changed=clone(config);change(changed);assert.throws(()=>Engine.validate(changed,worlds),undefined,label);}
function structure(){
 assert.deepEqual(Object.keys(config.worlds).sort(),[...ids].sort());assert.equal(Engine.validate(config,worlds),true);
 throwsChanged(c=>{delete c.worlds.cole;},'Un des cinq parcours ne peut pas manquer');
 throwsChanged(c=>{c.worlds.cole.stages[0].slots[0].card='missing';},'Référence de carte');
 throwsChanged(c=>{delete c.worlds.cole.stages[0].place;},'Lieu de la scène');
 throwsChanged(c=>{c.worlds.cole.stages[0].slots[0].override={l:{fx:{notas:99}}};},'Une adaptation narrative ne change pas les effets');
 throwsChanged(c=>{c.worlds.cole.stages[0].slots[0].context.fr='';},'Contexte bilingue');
 throwsChanged(c=>{c.worlds.cole.stages[0].slots[0].override={t:{bad:true}};},'Texte adapté invalide');
 for(const world of Object.values(worlds)){
  const plan=Engine.flatten(config.worlds[world.id]);assert.ok(plan.length>1&&plan.length<=100);
  const preceding=new Set();for(const {slot} of plan){for(const variant of slot.variants||[])for(const condition of variant.when)assert.ok(preceding.has(condition.cardId),'Condition portant sur une scène antérieure : '+world.id+'/'+slot.id+'/'+condition.cardId);for(const option of [slot,...slot.variants||[]])preceding.add(option.card);}
  const beforeCards=JSON.stringify(world.cards),beforeDefinition=JSON.stringify(config.worlds[world.id]);
  const {Core,api}=makeCore(true),base=makeCore().Core,seen=new Set(),variants=new Set();
  for(let run=0;run<64;run++){
   const random=rng(9100+run),state=Core.newState(world),nodeIds=new Set();let result;
   for(let i=0;i<plan.length;i++){
    // Ces parcours de structure neutralisent les pertes pour inspecter tous les rangs.
    for(const g of world.gauges)state.g[g.key]=50;
    const before=clone({g:state.g,flags:state.flags,plays:state.plays,index:state.story.index,choices:state.story.choices});
    const card=Core.pick(world,state,allTiers(world)),metadata=clone(state.story.current);
    assert.ok(card);assert.equal(state.story.index,i);assert.equal(state.story.choices.length,i);
    assert.deepEqual(clone({g:state.g,flags:state.flags,plays:state.plays,index:state.story.index,choices:state.story.choices}),before,'Afficher une scène ne joue pas un choix');
    const repeat=Core.pick(world,state,allTiers(world));assert.equal(repeat.id,card.id);assert.deepEqual(clone(state.story.current),metadata,'Pioche ordonnée idempotente');
    assert.equal(metadata.stageId,plan[i].stage.id);assert.equal(metadata.step,i+1);assert.equal(metadata.total,plan.length);assert.deepEqual(metadata.period,plan[i].stage.period);assert.deepEqual(metadata.label,plan[i].slot.label);
    for(const condition of metadata.via)assert.ok(state.story.choices.some(c=>c.cardId===condition.cardId&&c.side===condition.side),'La cause de la variante a réellement été jouée');
    assert.ok(!nodeIds.has(metadata.nodeId),'Chaque occurrence de scène a son propre identifiant');nodeIds.add(metadata.nodeId);seen.add(metadata.nodeId);variants.add(metadata.nodeId+':'+card.id);
    assert.equal(Core.timeLabel(world,state),plan[i].stage.period.es+' · '+plan[i].slot.label.es);assert.equal(Core.place(world,state),plan[i].stage.place);assert.equal(Core.progress(world,state),i/plan.length);
    if(card.cond)assert.ok(Object.entries(card.cond).every(([key,value])=>state.flags[key]===value),'Précondition originale réelle');
    const side=run===0?'l':run===1?'r':random()<.5?'l':'r',vanilla=clone(state);
    base.apply(world,vanilla,card,side);result=Core.apply(world,state,card,side);
    for(const field of ['g','flags','used','recent','plays'])assert.deepEqual(clone(state[field]),clone(vanilla[field]),'Mêmes effets que le moteur classique : '+world.id+'/'+card.id+'/'+field);
    assert.equal(state.story.index,i+1);assert.equal(state.story.choices.length,i+1);assert.equal(state.story.choices.at(-1).cardId,card.id);assert.equal(state.story.choices.at(-1).side,side);
    assert.deepEqual(api.snapshot(world,state),metadata,'Le rapport reçoit la scène quittée, avant l’incrément');
    const snapshot=api.snapshot(world,state);snapshot.context.fr='changed';assert.notEqual(api.snapshot(world,state).context.fr,'changed','Snapshot indépendant');
    assert.equal(result.win,i===plan.length-1);assert.equal(result.dead,null);assert.deepEqual(clone(Core.newUnlocks(world,state,new Set([0]),0)),[]);
    const completed=config.worlds[world.id].stages.filter((stage,index)=>config.worlds[world.id].stages.slice(0,index+1).reduce((n,s)=>n+s.slots.length,0)<=i+1).length;
    assert.equal(Core.survived(world,state)[0],completed,'Les scènes de jours différents ne se confondent pas');
   }
   assert.equal(Core.pick(world,state,allTiers(world)),null);assert.equal(Core.isWin(world,state),true);
  }
  assert.equal(seen.size,plan.length);assert.equal(JSON.stringify(world.cards),beforeCards);assert.equal(JSON.stringify(config.worlds[world.id]),beforeDefinition);
  report.worlds[world.id]={slots:plan.length,stages:config.worlds[world.id].stages.length,structuralPaths:64,nodeVariantsSeen:variants.size};
 }
 report.tests.push('Références/5 mondes/labels, 320 parcours de structure, pioche sans hasard/idempotente, mêmes fx/set/clamp et snapshot avant transition.');
}
function terminal(){
 for(const world of Object.values(worlds)){
  const {Core}=makeCore(true),state=Core.newState(world),plan=Engine.flatten(config.worlds[world.id]);
  state.story.index=plan.length-1;let card;
  // La dernière variante peut dépendre d’un choix absent : le repli doit rester jouable.
  card=Core.pick(world,state,allTiers(world));
  const side=['l','r'].find(side=>Object.values(card[side].fx).some(value=>value!==0));assert.ok(side);
  const [key,delta]=Object.entries(card[side].fx).find(([,value])=>value!==0);state.g[key]=delta>0?99:1;
  const result=Core.apply(world,state,card,side);assert.ok(result.dead);assert.equal(result.win,false);assert.equal(state.story.index,plan.length);assert.equal(state.story.choices.length,1);
 }
 report.tests.push('Une jauge fatale sur le dernier rang garde priorité sur la réussite narrative.');
}
function signature(state,important){
 const choices=state.story.choices.filter(c=>important.has(c.cardId)).map(c=>c.cardId+':'+c.side);return JSON.stringify([state.g,state.flags,[...new Set(choices)].sort()]);
}
function findWitness(world,target,beamWidth=100){
 const {Core}=makeCore(true),profiles=endings.worlds[world.id],profile=profiles[target],comparison=profiles[2].rule,requirements=profiles[0].rule.all;
 const important=new Set(requirements.map(c=>c.cardId));for(const {slot} of Engine.flatten(config.worlds[world.id]))for(const variant of slot.variants||[])for(const condition of variant.when)important.add(condition.cardId);
 const desired=Object.fromEntries(world.gauges.map(g=>[g.key,50]));if(target>1){desired[comparison.left]=target===2?72:28;desired[comparison.right]=target===2?28:72;}
 const cost=state=>{
  let value=world.gauges.reduce((n,g)=>n+(state.g[g.key]-desired[g.key])**2+8*Math.max(0,14-state.g[g.key])**2+8*Math.max(0,state.g[g.key]-86)**2,0);
  for(const requirement of requirements){const played=state.story.choices.filter(c=>c.cardId===requirement.cardId);if(target===0&&played.length&&requirement.side&&!played.some(c=>c.side===requirement.side))value+=100000;if(target!==0&&played.length&&requirement.side&&played.some(c=>c.side!==requirement.side))value-=250;}
  return value;
 };
 let beam=[Core.newState(world)],transitions=0;
 const total=Engine.flatten(config.worlds[world.id]).length;
 for(let step=0;step<total;step++){
  const next=new Map();
  for(const candidate of beam){
   const card=Core.pick(world,candidate,allTiers(world));assert.ok(card);
   for(const side of ['l','r']){
    const state=clone(candidate),result=Core.apply(world,state,card,side);Endings.record(state,card,side);transitions++;
    if(result.dead)continue;
    if(result.win){const selected=Endings.select(world,state,endings);if(selected.id===profile.id)return {id:selected.id,choices:clone(state.story.choices),finalGauges:clone(state.g),transitions};continue;}
    const key=signature(state,important);if(!next.has(key))next.set(key,state);
   }
  }
  beam=[...next.values()].sort((a,b)=>cost(a)-cost(b)).slice(0,beamWidth);if(!beam.length)break;
 }
 return null;
}
function witnesses(){
 for(const world of Object.values(worlds)){
  const found=[];
  for(let target=0;target<4;target++){
   const witness=findWitness(world,target)||findWitness(world,target,400);
   assert.ok(witness,'Aucun témoin réel trouvé dans la recherche bornée pour '+endings.worlds[world.id][target].id);
   const {Core}=makeCore(true),state=Core.newState(world);let result;
   for(const choice of witness.choices){const card=Core.pick(world,state,allTiers(world));assert.equal(card.id,choice.cardId);result=Core.apply(world,state,card,choice.side);Endings.record(state,card,choice.side);assert.equal(result.dead,null);}
   assert.equal(result.win,true);assert.equal(Endings.select(world,state,endings).id,witness.id);assert.deepEqual(clone(state.g),witness.finalGauges);found.push(witness);
  }
  report.worlds[world.id].witnesses=found;console.log(world.id+' : quatre réussites atteintes puis rejouées sans modifier les jauges.');
 }
 report.tests.push('20 témoins de réussite obtenus par recherche bornée puis rejoués depuis 50, avec leurs vrais choix et toutes les conséquences.');
}
function isolatedBuild(){
 const stable=fs.readFileSync(path.join(root,'index.html')),directory=fs.mkdtempSync(path.join(os.tmpdir(),'sobrevive-story-check-')),target=path.join(directory,'prototype.html');
 try{
  buildStory(target);const prototype=fs.readFileSync(target,'utf8');assert.ok(prototype.includes('window.SV_STORY='));
  for(const part of ['progress','learning','reports','endings','tutorial'])assert.ok(prototype.includes('sobrevive-story-'+part+'-v1'));
  assert.deepEqual(fs.readFileSync(path.join(root,'index.html')),stable,'Construire le prototype ne remplace pas index.html');
  assert.equal(prototype.match(/<script id="core">\s*([\s\S]*?)<\/script>/)[1],source,'Le Core source est partagé sans réécriture');
 }finally{assert.equal(path.dirname(path.resolve(target)),path.resolve(directory));if(fs.existsSync(target))fs.unlinkSync(target);fs.rmdirSync(directory);}
 report.tests.push('Construction vers une cible temporaire : index stable et bloc Core inchangés, cinq clés de sauvegarde séparées.');
}
if(require.main===module){try{structure();terminal();witnesses();isolatedBuild();report.passed=true;console.log('Parcours narratifs : contrats et vingt témoins validés.');}
finally{if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');}}
module.exports={findWitness};
