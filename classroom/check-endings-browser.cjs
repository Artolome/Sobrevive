// Fins : fixtures explicites de parcours, puis vrai clic terminal dans le jeu construit.
// Les 40 fins de jauge sont déjà couvertes par check-browser.cjs.
// Usage : node classroom/check-endings-browser.cjs [rapport.json] [dossier-captures]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.SV_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'));
const definitions=JSON.parse(fs.readFileSync(path.join(__dirname,'endings.json'),'utf8'));
const shots=process.argv[3]&&path.resolve(process.argv[3]);
const report={sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),runtime:process.version,fixtures:'Traces et jauges finales explicites, échéance avancée, vrai clic sur une carte du deck ; aucune simulation complète de parcours.',tests:[],errors:[]};
const scenarios={
 cole:{ids:['cole-rencontre','cole-equilibre','cole-defi','cole-amitie'],trail:[['alex1','r'],['alex2','r'],['alex3','l']],balance:{notas:35,amigos:65,energia:35,dinero:65},compare:{notas:70,amigos:70,energia:50,dinero:50},fallback:{notas:40,amigos:70,energia:50,dinero:50}},
 quijote:{ids:['quijote-barataria','quijote-equilibre','quijote-chevalier','quijote-compagnons'],trail:[['duques','l'],['barataria','l']],balance:{valor:35,locura:65,fuerzas:35,sancho:65},compare:{valor:70,locura:50,fuerzas:50,sancho:70},fallback:{valor:40,locura:50,fuerzas:50,sancho:70}},
 goya:{ids:['goya-dialogue','goya-equilibre','goya-atelier','goya-cour'],trail:[['enfermedad','r'],['manos','l']],balance:{corte:35,genio:65,dinero:35,salud:65},compare:{corte:70,genio:70,dinero:50,salud:50},fallback:{corte:70,genio:40,dinero:50,salud:50}},
 botero:{ids:['botero-place','botero-equilibre','botero-style','botero-public'],trail:[['medellin_pide','l'],['promesa_plaza','r']],balance:{estilo:35,fama:65,dinero:35,raices:65},compare:{estilo:70,fama:70,dinero:50,raices:50},fallback:{estilo:40,fama:70,dinero:50,raices:50}},
 frida:{ids:['frida-autoportrait','frida-equilibre','frida-peinture','frida-quotidien'],trail:[['mono_roba','r'],['mono_hombro','l']],balance:{arte:35,salud:65,alegria:35,mexico:65},compare:{arte:70,salud:50,alegria:70,mexico:50},fallback:{arte:40,salud:50,alegria:70,mexico:50}}
};
const definition=id=>Object.values(definitions.worlds).flat().find(e=>e.id===id);
let page,url;
async function test(name,fn){try{const details=await fn();report.tests.push({name,pass:true,details});console.error('PASS',name);}catch(error){report.tests.push({name,pass:false,error:error.message});console.error('FAIL',name,error.message);if(page&&!page.isClosed()){await page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('sobrevive-v2-learning')||'{}');value.readAfterChoice=false;localStorage.setItem('sobrevive-v2-learning',JSON.stringify(value));});await page.reload();}}}
const discoveries=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sobrevive-v2-endings')||'{"version":1,"worlds":{}}'));
const sessions=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sobrevive-v2-reports')).sessions);
const total=data=>Object.values(data.worlds).reduce((n,world)=>n+Object.keys(world).length,0);
async function fixture(world,type='balance',extra={}){
 const scenario=scenarios[world];
 return page.evaluate(({world,type,scenario,extra})=>{
  const dialog=document.querySelector('#sv-dialog');if(dialog.open)dialog.close();
  startGame(world);
  const completeTrail=type==='story'?scenario.trail.map(([cardId,side])=>({cardId,side})):[];
  const terminal=completeTrail.at(-1)||{cardId:U.start,side:'l'};
  cur=U.cards.find(c=>c.id===terminal.cardId);
  S.endingTrail=completeTrail.slice(0,-1);S.plays=S.endingTrail.length;
  const final=type==='story'?Object.fromEntries(U.gauges.map(g=>[g.key,50])):{...scenario[type]};
  if(extra.final)Object.assign(final,extra.final);
  for(const g of U.gauges){S.g[g.key]=final[g.key]-(cur[terminal.side].fx[g.key]||0);if(S.g[g.key]<=0||S.g[g.key]>=100)throw new Error('Fixture hors zone avant clic : '+g.key);}
  S.t=U.time.mode==='date'?+new Date(2027,5,20):U.time.mode==='year'?U.time.end:U.time.total;
  renderAll();
  return {side:terminal.side,final,terminal,trail:completeTrail};
 },{world,type,scenario,extra});
}
async function win(world,type='balance',extra={}){
 const prepared=await fixture(world,type,extra);
 await page.locator(prepared.side==='l'?'#btnL':'#btnR').click();
 await page.locator('#end').waitFor({state:'visible'});
 return prepared;
}
async function download(selector){const pending=page.waitForEvent('download');await page.locator(selector).click();const file=await pending;const content=fs.readFileSync(await file.path(),'utf8');await file.delete();return content;}
async function checkExact(world,id,prepared){
 const expected=definition(id);
 assert.equal(await page.locator('#end').getAttribute('data-ending-kind'),'success');
 assert.equal(await page.locator('#end').getAttribute('data-ending-id'),id);
 assert.equal(await page.locator('#endTitle').textContent(),expected.title.es);
 assert.equal(await page.locator('#sv-ending-title-fr').textContent(),expected.title.fr);
 assert.equal(await page.locator('#endTxtEs').textContent(),expected.epilogue.es);
 assert.equal(await page.locator('#endTxtFr').textContent(),expected.epilogue.fr);
 assert.equal(await page.locator('#sv-ending-note').textContent(),'La réussite du jeu n’est pas une note d’espagnol.');
 const ending=(await sessions()).at(-1).ending;
 assert.equal(ending.id,id);assert.equal(ending.worldId,world);assert.deepEqual(ending.title,expected.title);assert.equal(ending.es,expected.epilogue.es);assert.equal(ending.fr,expected.epilogue.fr);assert.equal(ending.artCharacter,expected.artCharacter);
 for(const lang of ['es','fr']){assert.ok(ending.evidence[lang]);assert.equal(await page.locator('#sv-ending-evidence p[lang="'+lang+'"]').textContent(),ending.evidence[lang]);}
 const evidence=await page.evaluate(({trail,world})=>trail.map(item=>WORLDS[world].cards.find(c=>c.id===item.cardId)[item.side]),{trail:prepared.trail,world});
 if(evidence.length)for(const choice of evidence)for(const lang of ['es','fr'])assert.ok(ending.evidence[lang].includes(choice[lang]),'Preuve du choix effectivement joué en '+lang);
 else if(expected.rule.type==='balance')for(const value of [35,65])assert.ok(ending.evidence.fr.includes(String(value)));
 else assert.ok(ending.evidence.fr.includes(expected.rule.type==='compare'?'≥':'>'));
 await page.locator('#endCard img').evaluate(image=>image.decode());
 const image=await page.locator('#endCard img').evaluate((image,{world,character})=>({ok:image.complete&&image.naturalWidth>0,actual:image.getAttribute('src'),expected:character?artOf(world).charImages[character]:artOf(world).coverImage,alt:image.alt}),{world,character:expected.artCharacter});
 assert.ok(image.ok);assert.equal(image.actual,image.expected);assert.equal(image.alt,'Carte de fin : '+expected.title.fr);
 const saved=(await discoveries()).worlds[world][id];assert.deepEqual(saved.title,expected.title);assert.deepEqual(saved.epilogue,expected.epilogue);assert.deepEqual(saved.evidence,ending.evidence);assert.ok(saved.discoveredAt);
 assert.equal(await page.evaluate(()=>document.activeElement.id),'againBtn');
 assert.equal(await page.locator('#end').evaluate(e=>e.scrollTop),0,'La fin doit s’ouvrir en haut, sans saut vers Rejouer');
 if(shots&&id===scenarios[world].ids[0]){fs.mkdirSync(shots,{recursive:true});await page.locator('#end').screenshot({path:path.join(shots,'fin-'+world+'-bureau.png')});}
 return {id,final:prepared.final,title:expected.title.fr};
}
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.SV_BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,timezoneId:'America/Cayenne'});page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>window.SVEndings&&window.SV_ENDINGS&&document.querySelector('#sv-endings-menu'));
  await page.evaluate(()=>localStorage.setItem('sobrevive-v2-tutorial','1'));
  await test('Anciennes victoires et rapports conservés sans découverte déduite',async()=>{
   const original=await page.evaluate(()=>{
    const progress=Object.fromEntries(ORDER.map(id=>[id,{best:22,wins:7,tiers:[1,2],seen:[WORLDS[id].start],chars:[],customMarker:'KEEP_'+id}]));
    localStorage.setItem('sobrevive-preview-progress-v2',JSON.stringify(progress));localStorage.removeItem('sobrevive-v2-endings');
    const ending={...WORLDS.cole.win},time='2026-10-01T12:00:00.000Z';
    localStorage.setItem('sobrevive-v2-reports',JSON.stringify({version:1,sessions:[{id:'old-win',worldId:'cole',world:WORLDS.cole.name,status:'won',choices:[],startedAt:time,endedAt:time,lastActivityAt:time,initialGauges:[],finalGauges:[],totalChoices:22,notes:'NOTE_ANTERIEURE',ending}],legacy:{entries:[],notes:''},removedSessions:0}));
    return {progress,ending};
   });
   await page.reload();assert.equal(total(await discoveries()),0);
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('sobrevive-preview-progress-v2'))),original.progress);
   const old=(await sessions())[0];assert.deepEqual(old.ending,original.ending);assert.equal(old.notes,'NOTE_ANTERIEURE');assert.equal(old.ending.id,undefined);
   await page.locator('#sv-endings-menu').click();assert.equal(await page.locator('.sv-ending-slot').count(),20);assert.equal(await page.locator('.sv-ending-read').count(),0);assert.equal(await page.locator('.sv-ending-slot[data-discovered="true"]').count(),0);await page.locator('#sv-close').click();
  });
  for(const [world,scenario] of Object.entries(scenarios))for(const [i,type] of ['story','balance','compare','fallback'].entries())await test('Réussite exacte : '+scenario.ids[i],async()=>{
   const checked=await checkExact(world,scenario.ids[i],await win(world,type));
   if(shots&&world==='cole'&&type==='fallback'){await page.locator('#sv-ending-open').click();await page.locator('#sv-endings-world').selectOption('');assert.equal(await page.locator('.sv-ending-slot').count(),20);await page.screenshot({path:path.join(shots,'fins-collection-premieres-decouvertes.png')});await page.locator('#sv-close').click();}
   return checked;
  });
  await test('20 découvertes persistantes ; relecture seule ; répétition sans doublon ni remplacement de la première preuve',async()=>{
   const before=await discoveries();assert.equal(total(before),20);const first=before.worlds.cole['cole-equilibre'];
   await win('cole','balance',{final:{notas:50,amigos:50,energia:50,dinero:50}});
   assert.equal(total(await discoveries()),20);assert.deepEqual((await discoveries()).worlds.cole['cole-equilibre'],first);
   assert.ok((await page.locator('#sv-ending-badge').textContent()).includes('Fin retrouvée'));
   const once=await page.evaluate(()=>({wins:prog(U.id).wins,reports:localStorage.getItem('sobrevive-v2-reports'),collection:localStorage.getItem('sobrevive-v2-endings')}));await page.evaluate(()=>showEnd(null));
   assert.deepEqual(await page.evaluate(()=>({wins:prog(U.id).wins,reports:localStorage.getItem('sobrevive-v2-reports'),collection:localStorage.getItem('sobrevive-v2-endings')})),once,'Un deuxième rendu ne doit compter aucune autre victoire');
   await page.reload();assert.equal(total(await discoveries()),20);await page.locator('#sv-endings-menu').click();assert.equal(await page.locator('.sv-ending-read').count(),20);
   await page.locator('#sv-endings-world').selectOption('cole');assert.equal(await page.locator('.sv-ending-slot').count(),4);
   const beforeRead=await page.evaluate(()=>({collection:localStorage.getItem('sobrevive-v2-endings'),progress:localStorage.getItem('sobrevive-preview-progress-v2'),reports:localStorage.getItem('sobrevive-v2-reports')}));
   await page.locator('.sv-ending-read[data-id="cole-equilibre"]').click();assert.ok((await page.locator('#sv-dialog').textContent()).includes(first.epilogue.fr));assert.ok((await page.locator('#sv-dialog').textContent()).includes(first.evidence.fr));
   await page.locator('#sv-ending-back').click();assert.equal(await page.locator('#sv-endings-world').inputValue(),'cole');await page.locator('#sv-close').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'sv-endings-menu');
   assert.deepEqual(await page.evaluate(()=>({collection:localStorage.getItem('sobrevive-v2-endings'),progress:localStorage.getItem('sobrevive-preview-progress-v2'),reports:localStorage.getItem('sobrevive-v2-reports')})),beforeRead);
  });
  await test('Fin de jauge prioritaire malgré échéance et arc accompli, dans les cinq mondes',async()=>{
   const before=await discoveries(),observations=[];
   for(const world of Object.keys(scenarios)){
    const prepared=await fixture(world,'story');
    const fatal=await page.evaluate(trail=>{
     S.endingTrail=trail;
     const key=U.gauges[0].key,card=U.cards.find(c=>c.l.fx[key]>0||c.r.fx[key]>0),side=card.l.fx[key]>0?'l':'r';
     cur=card;S.g[key]=99;renderAll();return {key,side,text:U.deaths[key].hi};
    },prepared.trail);
    await page.locator(fatal.side==='l'?'#btnL':'#btnR').click();await page.locator('#end').waitFor({state:'visible'});
    assert.equal(await page.locator('#end').getAttribute('data-ending-kind'),'death');assert.equal(await page.locator('#end').getAttribute('data-ending-id'),null);assert.equal((await page.locator('#endTxtEs').textContent()).trim(),fatal.text.es);assert.equal((await page.locator('#endTxtFr').textContent()).trim(),fatal.text.fr);assert.equal(await page.locator('#sv-ending-evidence').isVisible(),false);
    const session=(await sessions()).at(-1);assert.equal(session.status,'lost');assert.equal(session.ending.id,undefined);assert.equal(session.ending.es,fatal.text.es);observations.push({world,gauge:fatal.key});
   }
   assert.deepEqual(await discoveries(),before);return observations;
  });
  await test('Pause terminale, focus et téléchargements HTML/TXT : identité et preuves de la même fin',async()=>{
   await fixture('frida','story');await page.getByRole('button',{name:'Règles et options',exact:true}).click();await page.locator('#sv-read-after').check();await page.locator('#sv-ready').click();
   await page.locator('#btnL').click();await page.locator('#sv-continue').waitFor();await page.locator('#end').waitFor({state:'visible'});assert.equal(await page.locator('#sv-dialog').evaluate(e=>e.open),true);
   const final=(await sessions()).at(-1);assert.equal(final.status,'won');assert.equal(final.ending.id,'frida-autoportrait');assert.equal(final.choices.at(-1).cardId,'mono_hombro');
   await page.keyboard.press('ArrowRight');assert.equal((await sessions()).at(-1).choices.length,1);await page.locator('#sv-continue').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'againBtn');assert.equal(await page.locator('#end').evaluate(e=>e.scrollTop),0,'Fermer la pause terminale doit laisser la fin en haut');
   await page.getByRole('button',{name:'Mon bilan · Exporter',exact:true}).click();
   const exportedText=await download('#sv-export'),exportedHTML=await download('#sv-export-html');
   for(const text of [final.ending.title.es,final.ending.title.fr,final.ending.es,final.ending.fr,final.ending.evidence.es,final.ending.evidence.fr])assert.ok(exportedText.includes(text),'TXT : '+text);
   const offline=await browser.newContext({offline:true}),reader=await offline.newPage();const requests=[];reader.on('request',request=>requests.push(request.url()));await reader.setContent(exportedHTML);
   const body=await reader.locator('body').textContent();for(const text of [final.ending.title.es,final.ending.title.fr,final.ending.es,final.ending.fr,final.ending.evidence.es,final.ending.evidence.fr])assert.ok(body.includes(text),'HTML : '+text);assert.deepEqual(requests,[]);await offline.close();
   if(shots){fs.mkdirSync(shots,{recursive:true});fs.writeFileSync(path.join(shots,'rapport-fin-exemple.html'),exportedHTML);}
   await page.locator('#sv-close').click();await page.evaluate(()=>{const value=JSON.parse(localStorage.getItem('sobrevive-v2-learning'));value.readAfterChoice=false;localStorage.setItem('sobrevive-v2-learning',JSON.stringify(value));});await page.reload();
  });
  await test('Téléphone 320/390 px : fin longue, preuves, collection et relecture sans débordement',async()=>{
   const views=[];
   for(const [width,height] of [[320,640],[390,844]]){
    await page.setViewportSize({width,height});await win('cole','story');assert.equal(await page.locator('#end').evaluate(e=>e.scrollTop),0,'La fin mobile doit commencer par sa carte et son titre');
    const check=async selector=>{const sizes=await page.locator(selector).evaluate(e=>({scroll:e.scrollWidth,width:e.clientWidth}));assert.ok(sizes.scroll<=sizes.width+1,selector+' '+JSON.stringify(sizes));};
    await check('#end');if(shots){fs.mkdirSync(shots,{recursive:true});await page.locator('#end').screenshot({path:path.join(shots,'fin-cole-mobile-'+width+'.png')});}await page.locator('#sv-ending-evidence summary').click();await check('#end');await page.locator('#sv-ending-open').click();await check('#sv-dialog');await page.locator('#sv-endings-world').selectOption('');await check('#sv-dialog');
    await page.locator('.sv-ending-read[data-id="cole-rencontre"]').click();await page.locator('#sv-dialog .sv-ending-reason summary').click();await check('#sv-dialog');await page.locator('#sv-ending-back').scrollIntoViewIfNeeded();assert.ok(await page.locator('#sv-ending-back').isVisible());
    if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,'fins-mobile-'+width+'.png')});}
    await page.locator('#sv-close').click();views.push({width,height,overflow:false});
   }
   return views;
  });
 }finally{
  await browser?.close();await new Promise(resolve=>server.close(resolve));report.passed=report.tests.filter(t=>t.pass).length;report.failed=report.tests.filter(t=>!t.pass).length;
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2));else console.log(JSON.stringify(report,null,2));
  console.error(JSON.stringify({passed:report.passed,failed:report.failed,pageErrors:report.errors}));process.exitCode=report.failed||report.errors.length?1:0;
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
