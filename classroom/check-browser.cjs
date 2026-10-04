// Tests navigateur du prototype local ; ne contacte aucun service externe.
// Usage : node classroom/check-browser.cjs [rapport.json]
// Playwright doit être disponible ; SV_PLAYWRIGHT peut désigner son module.
// SV_BROWSER_CHANNEL choisit le navigateur installé (msedge par défaut).
// Fixtures : localStorage de test, états proches des limites, PointerEvent cancel.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.SV_PLAYWRIGHT || 'playwright');
const repo = path.resolve(__dirname, '..');
const channel = process.env.SV_BROWSER_CHANNEL || 'msedge';
const html = fs.readFileSync(path.join(repo, 'index.html'));
const report = {runtime:process.version, browser:channel+' headless', sourceSha256:crypto.createHash('sha256').update(html).digest('hex'), fixtures:'localStorage contrôlé, états moteur aux limites avant vrai clic, pointercancel synthétique', tests:[], errors:[]};
let page, context;
async function test(name, fn) {
  try { const details = await fn(); report.tests.push({name, pass:true, details}); console.error('PASS', name); }
  catch (e) { report.tests.push({name, pass:false, error:e.message}); console.error('FAIL', name, e.message); }
}
const state = () => page.evaluate(() => ({plays:S?.plays, g:S?.g, id:cur?.id, choiceL:cur?.l.es, choiceR:cur?.r.es, focused:document.activeElement?.id, dialog:document.querySelector('#sv-dialog').open, end:!document.querySelector('#end').hidden, busy}));
async function start(world='cole') {
  await page.goto(url);
  await page.locator(`#worlds button[data-u="${world}"]`).click();
  await page.locator('#startBtn').click();
  if (await page.locator('#sv-ready').isVisible()) await page.locator('#sv-ready').click();
  await page.waitForFunction(() => S && !busy);
}
async function idle() { await page.waitForTimeout(700); }
async function recordedChoice() { return page.evaluate(() => JSON.parse(localStorage.getItem('sobrevive-v2-learning')).history.at(-1)); }
let url;
(async()=>{
 const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 url=`http://127.0.0.1:${server.address().port}/`;
 const browser=await chromium.launch({channel,headless:true});
 context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 page.setDefaultTimeout(10000);
 try {
  await test('Cinq univers : navigation réelle, tutoriel, départ à 50', async()=>{
   const observations=[];
   for(const world of ['cole','quijote','goya','botero','frida']){
    await start(world);const s=await state();assert.equal(s.plays,0);assert.ok(Object.values(s.g).every(n=>n===50));assert.equal(s.focused,'btnL');
    observations.push({world,focus:s.focused});
   }
   return observations;
  });
  for (const [name,trigger,side] of [
   ['clic gauche',()=>page.locator('#btnL').click(),'l'],
   ['clic droite',()=>page.locator('#btnR').click(),'r'],
   ['flèche gauche',()=>page.keyboard.press('ArrowLeft'),'l'],
   ['flèche droite',()=>page.keyboard.press('ArrowRight'),'r'],
  ]) await test(`Choix par ${name}`,async()=>{
    await start();const before=await state();await trigger();await idle();
    const after=await state(),item=await recordedChoice();assert.equal(after.plays,1);assert.equal(item.choice,side==='l'?before.choiceL:before.choiceR);
  });
  for(const [label,dx,side] of [['gauche',-130,'l'],['droite',130,'r']]) await test(`Glisser réel vers ${label}`,async()=>{
   await start();await idle();const before=await state();const b=await page.locator('#cardWrap').boundingBox();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+dx,b.y+b.height/2,{steps:12});await page.mouse.up();await idle();
   const after=await state(),item=await recordedChoice();assert.equal(after.plays,1);assert.equal(item.choice,side==='l'?before.choiceL:before.choiceR);
  });
  await test('Geste annulé : aucun choix malgré 130 px [pointercancel fixture]',async()=>{
   await start();await idle();const b=await page.locator('#cardWrap').boundingBox();
   await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+130,b.y+b.height/2,{steps:12});
   await page.locator('#cardWrap').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse',bubbles:true});await page.mouse.up();await idle();
   const s=await state();assert.equal(s.plays,0);assert.equal(await page.locator('#cardWrap').evaluate(e=>e.style.transform),'');
  });
  await test('Traduction couvre situation et deux choix, puis réinitialise',async()=>{
   await start();await page.locator('#helpBtn').click();
   assert.equal(await page.locator('#helpBtn').getAttribute('aria-pressed'),'true');
   for(const sel of ['#speechFr','#btnL .fr','#btnR .fr']){assert.ok(await page.locator(sel).isVisible());assert.ok((await page.locator(sel).innerText()).length);}
   await page.locator('#btnL').click();await idle();assert.equal(await page.locator('#helpBtn').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#speechFr').isVisible(),false);
  });
  await test('Dialogues : piégeage Tab, flèches inoffensives et focus restauré',async()=>{
   await start();await page.getByRole('button',{name:'Mon bilan',exact:true}).filter({visible:true}).click();
   await page.locator('#sv-notes').fill('Elijo esta respuesta porque quiero aprender.');await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');
   assert.equal((await state()).plays,0);await page.locator('#sv-close').focus();await page.keyboard.press('Shift+Tab');
   const summaries=page.locator('#sv-dialog details summary');
   if(await summaries.count())assert.ok(await summaries.last().evaluate(e=>e===document.activeElement));
   else assert.equal(await page.evaluate(()=>document.activeElement.id),'sv-export');
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'sv-close');
   await page.keyboard.press('Escape');assert.equal((await state()).dialog,false);assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Mon bilan');
  });
  await test('Pause lecture : option persistée, retour du choix exact, Continuer',async()=>{
   await start();await page.getByRole('button',{name:'Règles et options',exact:true}).click();await page.locator('#sv-read-after').check();await page.locator('#sv-ready').click();
   const before=await state();await page.locator('#btnR').click();await page.locator('#sv-continue').waitFor();assert.equal((await state()).dialog,true);
   assert.ok((await page.locator('#sv-modal-body').innerText()).includes(before.choiceR));
   await page.keyboard.press('ArrowLeft');await idle();assert.equal((await state()).plays,1);
   await page.locator('#sv-continue').click();assert.equal((await state()).focused,'btnR');assert.equal((await state()).dialog,false);
   await page.reload();await page.getByRole('button',{name:'Comment jouer',exact:true}).click();assert.equal(await page.locator('#sv-read-after').isChecked(),true);await page.locator('#sv-read-after').uncheck();await page.locator('#sv-ready').click();
  });
  await test('Sortie : annuler/restaurer le focus, confirmer vers fiche',async()=>{
   await start();await page.locator('#btnR').click();await idle();await page.locator('#quitBtn').click();
   assert.equal(await page.locator('#sv-title').innerText(),'Quitter cette partie ?');await page.keyboard.press('ArrowRight');assert.equal((await state()).plays,1);
   await page.locator('#sv-stay').click();assert.equal((await state()).focused,'quitBtn');
   await page.keyboard.press('Escape');await page.locator('#sv-quit-confirm').click();assert.ok(await page.locator('#ficha').isVisible());assert.equal(await page.evaluate(()=>document.activeElement.id),'startBtn');
  });
  await test('Limites des 5 mondes et de leurs 4 jauges, basse/haute [états fixtures]',async()=>{
   let outcomes=0;
   for(const world of ['cole','quijote','goya','botero','frida']) {
    await start(world);const keys=Object.keys((await state()).g);
    for(const key of keys) for(const high of [false,true]){
     await start(world);
     const expected=await page.evaluate(({key,high})=>{
      // Fixture limitée au navigateur : carte réelle, jauge proche de sa limite.
      const side=['l','r'].find(s=>U.cards.some(c=>high?c[s].fx[key]>0:c[s].fx[key]<0));
      cur=U.cards.find(c=>high?c[side].fx[key]>0:c[side].fx[key]<0);
      S.g[key]=high?99:1;renderAll();return {side,text:U.deaths[key][high?'hi':'lo'].es};
     },{key,high});
     await page.locator(expected.side==='l'?'#btnL':'#btnR').click();await page.locator('#end').waitFor({state:'visible'});
     assert.equal(await page.locator('#endTxtEs').innerText(),expected.text);assert.equal(await page.evaluate(()=>document.activeElement.id),'againBtn');outcomes++;
    }
   }
   return {outcomes};
  });
  await test('Victoires des 5 mondes : aucune note scolaire [états fixtures]',async()=>{
   for(const world of ['cole','quijote','goya','botero','frida']){
    await start(world);
    await page.evaluate(()=>{S.t=U.time.mode==='date'?+new Date(2027,5,25):U.time.mode==='year'?U.time.end:U.time.total;});
    await page.locator('#btnL').click();await page.locator('#end').waitFor({state:'visible'});
    assert.equal(await page.locator('#endTitle').innerText(),'¡Victoria!');const text=await page.locator('#end').innerText();assert.ok(!/nota final|note finale|\d[,.]\d\s*\/10/i.test(text));assert.ok(text.includes('La réussite du jeu n’est pas une note d’espagnol.'));
   }
  });
  await test('Pause lecture lors de la dernière décision : fin puis focus Rejouer [fixture]',async()=>{
   await start();await page.getByRole('button',{name:'Règles et options',exact:true}).click();await page.locator('#sv-read-after').check();await page.locator('#sv-ready').click();
   await page.evaluate(()=>{S.t=+new Date(2027,5,25);});await page.locator('#btnR').click();await page.locator('#sv-continue').waitFor();await idle();assert.equal((await state()).end,true);assert.equal((await state()).dialog,true);
   await page.locator('#sv-continue').click();assert.equal((await state()).focused,'againBtn');
  });
  await test('Animations réduites',async()=>{
   await page.emulateMedia({reducedMotion:'reduce'});await start();
   const styles=await page.locator('#cardWrap').evaluate(e=>({animation:getComputedStyle(e).animationName,transition:getComputedStyle(e).transitionDuration}));
   assert.equal(styles.animation,'none');assert.equal(styles.transition,'0s');return styles;
  });
  await test('HTML autonome file://, réseau coupé : 5 mondes et jeu',async()=>{
   const offline=await browser.newContext({offline:true,viewport:{width:1440,height:1000}});const p=await offline.newPage();const requests=[];
   p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});p.on('pageerror',e=>report.errors.push('offline: '+e.message));
   const temp=fs.mkdtempSync(path.join(os.tmpdir(),'sobrevive-browser-'));
   const copy=path.join(temp,'offline-fixture.html');fs.writeFileSync(copy,html);
   try {
    await p.goto(pathToFileURL(copy).href);assert.equal(await p.locator('#worlds .world').count(),5);await p.locator('#worlds [data-u="botero"]').click();await p.locator('#startBtn').click();if(await p.locator('#sv-ready').isVisible())await p.locator('#sv-ready').click();await p.locator('#btnL').click();await p.waitForTimeout(700);assert.equal(await p.evaluate(()=>S.plays),1);assert.deepEqual(requests,[]);return {externalRequests:requests.length};
   } finally {await offline.close();fs.unlinkSync(copy);fs.rmdirSync(temp);}
  });
 } finally {
  await browser.close();await new Promise(resolve=>server.close(resolve));report.passed=report.tests.filter(x=>x.pass).length;report.failed=report.tests.filter(x=>!x.pass).length;
  const output=JSON.stringify(report,null,2);
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),output);
  else console.log(output);
  console.error(JSON.stringify({passed:report.passed,failed:report.failed,pageErrors:report.errors}));process.exitCode=report.failed||report.errors.length?1:0;
 }
})().catch(e=>{console.error(e);process.exit(1);});
