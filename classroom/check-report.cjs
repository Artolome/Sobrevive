// Rapports par partie : conservation, parcours, téléchargement autonome et interruption.
// Usage : node classroom/check-report.cjs [rapport.json] [dossier-captures]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.SV_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'));
const report={sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),runtime:process.version,errors:[],tests:[]};
const shots=process.argv[3]&&path.resolve(process.argv[3]);
const KEY='sobrevive-v2-learning';
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({channel:process.env.SV_BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true,timezoneId:'America/Cayenne'});
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  assert.equal(await page.evaluate(()=>typeof SVReport?.create),'function','Construire le jeu avec report.js avant ce test.');
  await page.evaluate(()=>localStorage.setItem('sobrevive-v2-tutorial','1'));
  const openJournal=async()=>page.getByRole('button',{name:'Mon bilan',exact:true}).filter({visible:true}).click();
  const stored=()=>page.evaluate(key=>({...JSON.parse(localStorage.getItem(key)),reports:JSON.parse(localStorage.getItem('sobrevive-v2-reports'))}),KEY);
  const closeJournal=()=>page.locator('#sv-close').click();
  const downloaded=async id=>{const pending=page.waitForEvent('download');await page.locator(id).click();const download=await pending;const content=fs.readFileSync(await download.path(),'utf8');await download.delete();return content;};
  await openJournal();assert.ok((await page.locator('#sv-report-session').textContent()).includes('Aucune partie enregistrée'));await closeJournal();

  // Migration sans date inventée, conservation de l'ancien texte et des notes.
  await page.evaluate(key=>{
   const w=WORLDS.cole,c=w.cards.find(c=>c.id==='intro');
   const legacy={world:w.name,text:c.t,choice:c.r.es,translation:c.r.fr,narrative:{es:'Comentario antiguo.',fr:'Commentaire ancien conservé.'},effects:[{label:'Amigos',before:50,after:60,delta:10}]};
   localStorage.removeItem('sobrevive-v2-reports');localStorage.setItem(key,JSON.stringify({notes:'NOTE_ANTERIEURE',history:[legacy,{...legacy,text:'Ancienne situation sans correspondance',choice:'LEGACY_ONLY_CHOICE'}],readAfterChoice:false}));
  },KEY);
  await page.reload();let data=await stored();
  assert.equal(data.reports.sessions.length,0);assert.equal(data.reports.legacy.entries.length,2);assert.equal(data.reports.legacy.notes,'NOTE_ANTERIEURE');assert.equal(data.reports.legacy.entries[0].effects[0].delta,10);assert.equal(data.reports.legacy.entries[0].narrative.fr,'Commentaire ancien conservé.');
  await openJournal();assert.ok((await page.locator('.sv-report-summary').innerText()).includes('ne sont pas connus'));
  const oldText=await downloaded('#sv-export');assert.ok(oldText.includes('LEGACY_ONLY_CHOICE')&&oldText.includes('NOTE_ANTERIEURE'));await closeJournal();
  report.tests.push({name:'État vierge et ancien journal séparé : pas de sessions/dates inventées, notes/commentaires/effets conservés'});

  // Deux vrais choix : ordre, bilingue, état initial/final et notes par partie.
  await page.evaluate(()=>startGame('cole'));
  await page.locator('#btnR').click();await page.waitForFunction(()=>!busy);
  await page.locator('#btnL').click();await page.waitForFunction(()=>!busy);
  data=await stored();const first=data.reports.sessions.at(-1),firstId=first.id;
  assert.equal(first.status,'active');assert.equal(first.choices.length,2);assert.deepEqual(first.choices.map(x=>x.turn),[1,2]);assert.ok(first.startedAt&&first.lastActivityAt);assert.ok(first.initialGauges.every(g=>g.value===50));
  const actualGauges=await page.evaluate(()=>({...S.g}));
  assert.ok(first.finalGauges.every(g=>g.value===actualGauges[g.key]));
  for(const item of first.choices){assert.ok(item.text&&item.textFr&&item.choice&&item.translation&&item.narrative.es&&item.narrative.fr);for(const effect of item.effects)assert.equal(effect.delta,effect.after-effect.before);}
  await openJournal();assert.equal(await page.locator('#sv-report-session').inputValue(),firstId);
  const unsafeNote='Mi camino <img src=x onerror="window.__reportXss=1"> & ma réflexion';
  await page.locator('#sv-notes').fill(unsafeNote);
  const selectedText=await downloaded('#sv-export'),selectedHTML=await downloaded('#sv-export-html');
  assert.ok(selectedText.includes(unsafeNote)&&selectedText.includes(first.choices[0].narrative.es)&&selectedText.includes(first.choices[0].narrative.fr));assert.ok(!selectedText.includes('LEGACY_ONLY_CHOICE')&&!selectedText.includes('NOTE_ANTERIEURE'));
  assert.ok(selectedHTML.startsWith('\uFEFF<!doctype html>'));assert.ok(selectedHTML.includes('&lt;img src=x onerror=')&&!selectedHTML.includes('<img src=x'));assert.ok(!/<(?:link|script|img)[^>]+(?:src|href)\s*=\s*["']https?:/i.test(selectedHTML));
  const offline=await browser.newContext({offline:true,timezoneId:'America/Cayenne'}),reader=await offline.newPage();
  const requests=[];reader.on('request',request=>requests.push(request.url()));await reader.setContent(selectedHTML);
  assert.equal(await reader.evaluate(()=>window.__reportXss),undefined);assert.equal(await reader.locator('.step').count(),2);assert.ok((await reader.locator('body').innerText()).includes(unsafeNote));assert.deepEqual(requests,[]);
  await reader.evaluate(()=>window.print=()=>window.__printed=true);await reader.getByRole('button',{name:'Imprimer / Enregistrer en PDF'}).click();assert.equal(await reader.evaluate(()=>window.__printed),true);
  await reader.emulateMedia({media:'print'});assert.equal(await reader.locator('.print-tools').isVisible(),false);
  await page.locator('#sv-notes').fill('Elijo esta respuesta porque quiero ayudar. J’ai découvert un mot et observé les conséquences de mes deux choix.');
  if(shots){fs.mkdirSync(shots,{recursive:true});const example=await downloaded('#sv-export-html');fs.writeFileSync(path.join(shots,'rapport-exemple.html'),example);await page.screenshot({path:path.join(shots,'bilan-partie.png')});await reader.emulateMedia({media:'screen'});await reader.setContent(example);await reader.screenshot({path:path.join(shots,'rapport-autonome.png'),fullPage:true});}
  await offline.close();await closeJournal();
  report.tests.push({name:'Deux choix réels : chronologie, situations/choix/retours bilingues, jauges, notes et exports TXT/HTML propres à la partie'});
  report.tests.push({name:'HTML autonome hors ligne : texte échappé, aucun chargement réseau, bouton d’impression et mise en page imprimable'});

  // Une autre aventure ne mélange ni les décisions ni les notes ; quitter exige la confirmation.
  await page.evaluate(()=>startGame('quijote'));await page.locator('#btnR').click();await page.waitForFunction(()=>!busy);
  await openJournal();await page.locator('#sv-notes').fill('NOTES_QUIJOTE');await page.locator('#sv-report-session').selectOption(firstId);assert.ok((await page.locator('#sv-notes').inputValue()).startsWith('Elijo esta respuesta'));assert.equal(await page.locator('#sv-dialog details').count(),2);
  await page.locator('#sv-report-session').selectOption('legacy');assert.equal(await page.locator('#sv-notes').inputValue(),'NOTE_ANTERIEURE');await closeJournal();
  await page.locator('#quitBtn').click();assert.equal((await stored()).reports.sessions.at(-1).status,'active');await page.locator('#sv-stay').click();assert.equal((await stored()).reports.sessions.at(-1).status,'active');
  await page.locator('#quitBtn').click();await page.locator('#sv-quit-confirm').click();data=await stored();
  assert.equal(data.reports.sessions[0].status,'interrupted');assert.ok(data.reports.sessions[0].endedAt);assert.equal(data.reports.sessions.at(-1).status,'quit');assert.equal(data.reports.sessions.at(-1).notes,'NOTES_QUIJOTE');assert.equal(data.reports.sessions.at(-1).choices.length,1);
  await page.locator('#backBtn').click();assert.equal((await stored()).reports.sessions.at(-1).status,'quit');
  report.tests.push({name:'Parties et notes séparées ; sélection ancien journal ; sortie annulée/confirmée et retour menu sans changement d’issue'});

  // La fin est enregistrée avant le délai de l'animation ; les deltas restent réels aux bornes.
  const terminal=await page.evaluate(()=>{
   startGame('cole');cur=U.cards.find(c=>c.r.fx.energia>0);S.g.energia=99;renderAll();applyChoice('r');
   const session=JSON.parse(localStorage.getItem('sobrevive-v2-reports')).sessions.at(-1);
   return {status:session.status,item:session.choices.at(-1),gauge:session.finalGauges.find(g=>g.key==='energia')};
  });
  assert.equal(terminal.status,'lost');assert.equal(terminal.item.effects.find(e=>e.key==='energia').delta,1);assert.equal(terminal.gauge.value,100);
  await page.locator('#end').waitFor({state:'visible'});assert.equal((await stored()).reports.sessions.at(-1).status,'lost');
  await page.getByRole('button',{name:'Mon bilan · Exporter',exact:true}).click();assert.ok((await page.locator('.sv-report-summary').innerText()).includes('Fin de l’aventure'));await closeJournal();
  await page.evaluate(()=>{startGame('cole');showEnd(null);});assert.equal(await page.locator('#sv-end-feedback').isVisible(),false);assert.equal((await stored()).reports.sessions.at(-1).status,'won');
  report.tests.push({name:'Issue enregistrée avant animation ; jauge plafonnée et dernier choix propres à cette partie ; victoire sans ancien feedback'});

  // Une recharge interrompt uniquement la partie encore active, sans prétendre connaître l’heure de fermeture.
  await page.evaluate(()=>startGame('goya'));await page.locator('#btnR').click();await page.waitForFunction(()=>!busy);
  const beforeReload=(await stored()).reports.sessions.at(-1);
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({history:[],notes:'Note modifiée depuis un ancien onglet',readAfterChoice:false})),KEY);
  await page.reload();data=await stored();const interrupted=data.reports.sessions.at(-1);
  assert.equal(interrupted.id,beforeReload.id);assert.equal(interrupted.status,'interrupted');assert.equal(interrupted.endedAt,null);assert.equal(interrupted.lastActivityAt,beforeReload.lastActivityAt);assert.ok(interrupted.interruptionDetectedAt);assert.deepEqual(interrupted.choices,beforeReload.choices);
  await openJournal();assert.ok((await page.locator('.sv-report-summary').innerText()).includes('ne peut pas être reprise'));assert.equal(await page.getByRole('button',{name:/Reprendre/}).count(),0);await closeJournal();
  assert.equal(data.notes,'Note modifiée depuis un ancien onglet');assert.equal(await page.evaluate(key=>'reports' in JSON.parse(localStorage.getItem(key)),KEY),false);
  report.tests.push({name:'Rechargement : partie active interrompue/non reprenable ; rapports protégés des écritures d’anciens onglets par leur clé dédiée'});

  // Bornes réelles avec le même helper ; aucun changement du moteur ni du stockage de l’élève.
  const bounds=await page.evaluate(()=>{
   let saved;const helper=SVReport.create({saved:null,legacyEntries:[{text:'KEEP_LEGACY'}],legacyNotes:'KEEP_NOTES',persist:data=>{saved=JSON.parse(JSON.stringify(data));return true;}});
   const w=WORLDS.cole,state=Core.newState(w),item={text:'t',choice:'c',translation:'f',effects:[],recordedAt:new Date().toISOString()};
   for(let i=0;i<25;i++){state.plays=0;helper.start(w,state);for(let j=0;j<80;j++){state.plays++;helper.record(w,state,{...item,turn:state.plays});}helper.finish('quit',w,state);}
   const total=saved.sessions.reduce((n,s)=>n+s.choices.length,0);
   helper.start(w,state);for(let j=0;j<310;j++){state.plays++;helper.record(w,state,{...item,turn:state.plays});}
   return {sessionCount:saved.sessions.length,totalBefore:total,lastCount:saved.sessions.at(-1).choices.length,omitted:saved.sessions.at(-1).omittedChoices,removed:saved.removedSessions,legacy:saved.legacy};
  });
  assert.ok(bounds.sessionCount<=20&&bounds.totalBefore<=1500);assert.equal(bounds.lastCount,300);assert.equal(bounds.omitted,10);assert.ok(bounds.removed>0);assert.equal(bounds.legacy.entries[0].text,'KEEP_LEGACY');assert.equal(bounds.legacy.notes,'KEEP_NOTES');
  // Simuler une sauvegarde refusée : le téléchargement reste possible et l’avertissement est visible.
  await page.evaluate(()=>{
   const helper=SVReport.create({saved:null,legacyEntries:[],legacyNotes:'Note à exporter',persist:()=>false});helper.save();
   helper.show((title,body)=>{const dialog=document.querySelector('#sv-dialog');dialog.innerHTML='<h2>'+title+'</h2>'+body;dialog.showModal();});
  });
  assert.ok((await page.locator('#sv-report-storage').innerText()).includes('n’a pas pu sauvegarder'));assert.ok((await downloaded('#sv-export')).includes('Note à exporter'));
  report.tests.push({name:'Conservation bornée sans effacer le journal hérité ; échec de sauvegarde signalé avec téléchargement toujours disponible'});
  assert.deepEqual(report.errors,[]);report.passed=true;console.log('Rapports par partie : migration, choix, fins, interruption, exports hors ligne et limites validés.');
 }finally{
  try{await browser?.close();}finally{server.close();}
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
