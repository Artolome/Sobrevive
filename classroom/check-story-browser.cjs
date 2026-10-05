// Vrais parcours/clics du prototype isolé. Aucun accès au site déployé.
// Usage : node classroom/check-story-browser.cjs [prototype.html] [rapport.json] [captures]
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.SV_PLAYWRIGHT||'playwright');
const {loadConfig}=require('./build-story.cjs'),{findWitness}=require('./check-story.cjs');
const root=path.resolve(__dirname,'..'),file=path.resolve(process.argv[2]||path.join(root,'story-preview.html')),html=fs.readFileSync(file),config=loadConfig();
const shots=process.argv[4]&&path.resolve(process.argv[4]);
const report={runtime:process.version,sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),tests:[],errors:[],passed:false};
const oldKeys=['sobrevive-preview-progress-v2','sobrevive-v2-learning','sobrevive-v2-reports','sobrevive-v2-endings','sobrevive-v2-tutorial'];
let page,url;
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('sobrevive-story-reports-v1')));
async function start(world){await page.goto(url);await page.locator('#worlds button[data-u="'+world+'"]').click();await page.locator('#startBtn').click();if(await page.locator('#sv-ready').isVisible())await page.locator('#sv-ready').click();await page.waitForFunction(()=>S?.story&&!busy);}
async function advance(side){await page.locator(side==='l'?'#btnL':'#btnR').click();await page.waitForFunction(()=>!busy);}
async function safeSide(){return page.evaluate(()=>{
 const score=side=>U.gauges.reduce((n,g)=>{const value=S.g[g.key]+(cur[side].fx[g.key]||0);return n+(value<=0||value>=100?1e7:0)+(value-50)**2;},0);
 return score('l')<=score('r')?'l':'r';
});}
async function reach(nodeId,forced={}){
 for(let n=0;n<100;n++){
  const state=await page.evaluate(()=>({node:S.story.current?.nodeId,card:cur.id,dead:!document.querySelector('#end').hidden}));
  assert.equal(state.dead,false,'Le chemin de contrôle reste vivant');if(state.node===nodeId)return;
  await advance(forced[state.card]||await safeSide());
 }
 throw new Error('Scène non atteinte : '+nodeId);
}
async function download(selector){const pending=page.waitForEvent('download');await page.locator(selector).click();const download=await pending;const value=fs.readFileSync(await download.path(),'utf8');await download.delete();return value;}
async function capture(selector,name){if(shots){fs.mkdirSync(shots,{recursive:true});await page.locator(selector).screenshot({path:path.join(shots,name)});}}
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.SV_BROWSER_CHANNEL||'msedge',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,timezoneId:'America/Cayenne'});page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>window.SVStory&&document.querySelector('#sv-story-map'));
  await page.evaluate(keys=>{for(const key of keys)localStorage.setItem(key,'STABLE_SENTINEL_'+key);localStorage.setItem('sobrevive-story-tutorial-v1','1');},oldKeys);
  await page.reload();assert.equal(await page.locator('#worlds .world').count(),5);
  for(const world of Object.keys(config.worlds)){
   await start(world);
   const expected=config.worlds[world].stages[0],first=expected.slots[0];
   assert.equal(await page.locator('#sv-story-context').getAttribute('data-node-id'),expected.id+'/'+first.id);assert.equal(await page.locator('#fecha').textContent(),expected.period.es+' · '+first.label.es);assert.equal(await page.locator('#lugar').textContent(),expected.place);
   assert.equal(await page.locator('#sv-story-context [lang="es"]').textContent(),first.context.es);assert.equal(await page.locator('#sv-story-context [lang="fr"]').isVisible(),false);
   await page.locator('#helpBtn').click();assert.equal(await page.locator('#sv-story-context [lang="fr"]').isVisible(),true);assert.equal(await page.locator('#speechFr').isVisible(),true);
   await page.locator('#sv-story-map').click();assert.equal(await page.locator('#sv-dialog [aria-current="step"]').count(),1);assert.equal(await page.locator('#sv-dialog .sv-story-stages li').count(),config.worlds[world].stages.length);
   await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>S.plays),0);await page.locator('#sv-close').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'sv-story-map');
   await advance(await safeSide());assert.equal(await page.locator('#sv-story-context [lang="fr"]').isVisible(),false);assert.equal(await page.evaluate(()=>S.story.index),1);
   const item=(await stored()).sessions.at(-1).choices[0];assert.equal(item.cardId,first.card);assert.equal(item.journey.nodeId,expected.id+'/'+first.id);assert.deepEqual(item.journey.context,first.context);assert.equal(item.journey.step,1);
  }
  report.tests.push({name:'Cinq mondes : départ ordonné, chronologie/lieu, contexte ES/FR, plan modal et snapshot de la scène jouée'});
  const branches=[];
  for(const side of ['l','r']){
   await start('cole');await reach('martes/recreo',{alex1:side});
   const observed=await page.evaluate(()=>({card:cur.id,label:Core.timeLabel(U,S),flags:{...S.flags},index:S.story.index,context:{...SVStory.current(U,S).context}}));
   assert.equal(observed.card,side==='r'?'alex2':'fiesta0');assert.ok(observed.label.startsWith('Martes'));assert.equal(await page.locator('#sv-story-context').getAttribute('data-branched'),String(side==='r'));
   if(side==='r')assert.equal(observed.flags.alex,'si');
   const prior=(await stored()).sessions.at(-1).choices.find(item=>item.cardId==='alex1');assert.equal(prior.side,side);assert.equal(prior.journey.period.es,'Lunes');
   if(side==='r')await capture('#app','histoire-cole-lendemain.png');branches.push({side,...observed});
  }
  report.tests.push({name:'Choix réel du lundi : deux réponses à Alex conduisent à deux scènes différentes le mardi',branches});
  // Un témoin issu du moteur est rejoué entièrement dans le navigateur, sans retoucher ses jauges.
  const cole=JSON.parse(fs.readFileSync(path.join(root,'decks/cole.json'),'utf8')),witness=findWitness(cole,0)||findWitness(cole,0,400);assert.ok(witness,'Témoin Cole disponible');
  await start('cole');
  for(let i=0;i<witness.choices.length;i++){
   const choice=witness.choices[i];assert.equal(await page.evaluate(()=>cur.id),choice.cardId);
   if(i===witness.choices.length-1){await page.getByRole('button',{name:'Règles et options',exact:true}).click();await page.locator('#sv-read-after').check();await page.locator('#sv-ready').click();}
   await advance(choice.side);
  }
  await page.locator('#end').waitFor({state:'visible'});assert.equal(await page.locator('#end').getAttribute('data-ending-id'),witness.id);assert.deepEqual(await page.evaluate(()=>({...S.g})),witness.finalGauges);
  const completed=(await stored()).sessions.at(-1);assert.equal(completed.status,'won');assert.equal(completed.choices.length,witness.choices.length);assert.equal(completed.ending.id,witness.id);
  assert.equal(completed.choices.at(-1).journey.period.es,'Viernes');assert.equal(completed.choices.at(-1).journey.step,witness.choices.length);
  await page.locator('#sv-continue').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'againBtn');assert.equal(await page.locator('#end').evaluate(e=>e.scrollTop),0);
  await page.getByRole('button',{name:'Mon bilan · Exporter',exact:true}).click();const txt=await download('#sv-export'),documentHTML=await download('#sv-export-html');
  for(const item of [completed.choices[0],completed.choices.at(-1)])for(const value of [item.journey.period.fr,item.journey.context.es,item.journey.context.fr,item.text,item.textFr])assert.ok(txt.includes(value),'Contexte réel dans le TXT : '+value);
  const reader=await context.newPage();await reader.setContent(documentHTML);const text=await reader.locator('body').textContent();assert.ok(text.includes(completed.ending.title.fr));assert.ok(text.includes(completed.choices.at(-1).journey.context.fr));await reader.close();await page.locator('#sv-close').click();
  if(shots){fs.mkdirSync(shots,{recursive:true});fs.writeFileSync(path.join(shots,'histoire-bilan-exemple.html'),documentHTML);}
  report.tests.push({name:'Semaine entière jouée depuis 50 : réussite, trace de chaque scène, pause terminale/focus et exports du contexte exact',choices:witness.choices.length,ending:witness.id});
  await page.evaluate(()=>{const data=JSON.parse(localStorage.getItem('sobrevive-story-learning-v1'));data.readAfterChoice=false;localStorage.setItem('sobrevive-story-learning-v1',JSON.stringify(data));});await page.reload();
  // Les liens de démonstration classiques ne doivent pas fabriquer une victoire de cette variante.
  const count=await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('sobrevive-story-progress-v1'))).reduce((n,w)=>n+w.wins,0));
  await page.goto(url+'/?entry=disabled-demo#gana-cole');assert.equal(await page.locator('#lobby').isVisible(),true);assert.equal(await page.evaluate(()=>Object.values(JSON.parse(localStorage.getItem('sobrevive-story-progress-v1'))).reduce((n,w)=>n+w.wins,0)),count);
  await page.goto(url+'/?entry=narrative-link#juego-quijote-fr');assert.equal(await page.locator('#app').isVisible(),true);assert.equal(await page.evaluate(()=>S.story.index),0);assert.equal(await page.locator('#sv-story-context').getAttribute('data-node-id'),config.worlds.quijote.stages[0].id+'/'+config.worlds.quijote.stages[0].slots[0].id);assert.equal(await page.locator('#speechFr').isVisible(),true);
  await page.evaluate(()=>showEnd(null));assert.equal(await page.locator('#end').isVisible(),false,'Une scène non terminée ne peut fabriquer une victoire');
  report.tests.push({name:'Chargement direct déjà narratif, nouvelle partie remise à zéro et routes de victoire de démonstration neutralisées'});
  const cardBox=await page.locator('#cardWrap').boundingBox(),beforeSwipe=await page.evaluate(()=>({node:S.story.current.nodeId,index:S.story.index,card:cur.id}));
  await page.mouse.move(cardBox.x+cardBox.width/2,cardBox.y+cardBox.height/2);await page.mouse.down();await page.mouse.move(cardBox.x+cardBox.width/2+130,cardBox.y+cardBox.height/2,{steps:12});
  assert.ok(await page.locator('#cardWrap').evaluate(e=>e.classList.contains('drag')&&e.style.transform.includes('rotate(')));
  await page.mouse.up();assert.ok(await page.locator('#cardWrap').evaluate(e=>e.classList.contains('outR')));await page.waitForFunction(()=>!busy);
  assert.equal(await page.evaluate(()=>S.story.index),beforeSwipe.index+1);const swipe=(await stored()).sessions.at(-1).choices.at(-1);assert.equal(swipe.cardId,beforeSwipe.card);assert.equal(swipe.side,'r');assert.equal(swipe.journey.nodeId,beforeSwipe.node);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#front img').evaluate(e=>getComputedStyle(e).animationName),'none');await page.emulateMedia({reducedMotion:'no-preference'});
  report.tests.push({name:'Glissement réel : inclinaison/sortie, une seule transition, trace correcte et respect des animations réduites'});
  for(const [width,height] of [[320,640],[390,844],[844,390]]){
   await page.setViewportSize({width,height});await start('cole');await page.locator('#helpBtn').click();
   assert.ok(await page.locator('#app').evaluate(e=>e.scrollWidth<=innerWidth+1),'Sans débordement horizontal '+width);
   await page.locator('#sv-story-map').click();assert.ok(await page.locator('#sv-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth+1));await page.locator('#sv-close').click();
   await capture('#app','histoire-mobile-'+width+'.png');
  }
  const stable=await page.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),oldKeys);for(const key of oldKeys)assert.equal(stable[key],'STABLE_SENTINEL_'+key,'La sauvegarde du mode stable doit rester intacte');
  report.tests.push({name:'Trois vues mobiles/paysage sans débordement ; aucune des cinq sauvegardes stables réécrite'});
  assert.deepEqual(report.errors,[]);report.passed=true;console.log('Navigateur histoire : cinq débuts, lendemain divergent, semaine complète et rapports isolés validés.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));if(process.argv[3])fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(report,null,2)+'\n');}
})().catch(error=>{console.error(error);process.exitCode=1;});
