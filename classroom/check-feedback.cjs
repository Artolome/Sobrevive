// Retours complets : vraie intégration au moteur, journal, export et mise en page.
// Les 450 choix utilisent des états de test ; les clics/glissements sont couverts par check-browser.cjs.
// Usage : node classroom/check-feedback.cjs [rapport.json] [dossier-captures]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.SV_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'));
const report={sourceSha256:crypto.createHash('sha256').update(html).digest('hex'),runtime:process.version,errors:[],tests:[]};
const shots=process.argv[3]&&path.resolve(process.argv[3]);
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({channel:process.env.SV_BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(()=>localStorage.setItem('sobrevive-v2-tutorial','1'));
  const coverage=await page.evaluate(()=>{
   const failures=[],counts={};
   for(const world of Object.values(WORLDS)){
    startGame(world.id);let count=0;
    for(const card of world.cards)for(const side of ['l','r']){
     S=Core.newState(U);cur=card;Core.apply(U,S,card,side);
     const item=JSON.parse(localStorage.getItem('sobrevive-v2-learning')).history.at(-1),expected=SV_LEARNING.feedback[world.id][card.id][side];
     if(item.worldId!==world.id||item.cardId!==card.id||item.side!==side||item.narrative?.es!==expected.es||item.narrative?.fr!==expected.fr||document.querySelector('#sv-feedback .sv-feedback-story')?.textContent!==expected.fr)failures.push(world.id+'/'+card.id+'/'+side);
     for(const g of world.gauges){
      const delta=Math.max(0,Math.min(100,50+(card[side].fx[g.key]||0)))-50,e=item.effects.find(e=>e.label===g.label);
      if(delta?(e?.delta!==delta||e.before!==50||e.after!==50+delta):!!e)failures.push(world.id+'/'+card.id+'/'+side+'/'+g.key);
     }
     count++;
    }
    counts[world.id]=count;
   }
   return {counts,failures};
  });
  assert.deepEqual(coverage.failures,[]);assert.equal(Object.values(coverage.counts).reduce((a,b)=>a+b,0),450);
  report.tests.push({name:'450 choix : texte exact, identifiants, affichage immédiat et variations réelles',...coverage});

  // Anciennes entrées : restaurer un commentaire absent, conserver celui déjà enregistré.
  const old=await page.evaluate(()=>{
   const w=WORLDS.cole,c=w.cards.find(c=>c.id==='intro');
   const item={world:w.name,text:c.t,choice:c.r.es,translation:c.r.fr,narrative:null,effects:[{label:'Amigos',before:50,after:60,delta:10}]};
   localStorage.setItem('sobrevive-v2-learning',JSON.stringify({notes:'Note conservée',history:[item,{...item,narrative:{es:'Texto guardado.',fr:'Texte conservé.'}},{...item,text:'Une ancienne carte modifiée'}]}));
   return SV_LEARNING.feedback.cole.intro.r;
  });
  await page.reload();
  const recovered=await page.evaluate(()=>JSON.parse(localStorage.getItem('sobrevive-v2-learning')));
  assert.deepEqual(recovered.history[0].narrative,old);assert.equal(recovered.history[1].narrative.fr,'Texte conservé.');assert.equal(recovered.history[2].narrative,null);assert.equal(recovered.notes,'Note conservée');assert.equal(recovered.history[0].effects[0].delta,10);
  report.tests.push({name:'Ancien journal : restauration exacte, notes/effets/commentaires existants préservés'});

  // Vrai clic d'une carte auparavant sans retour, consultation bilingue et export.
  await page.evaluate(()=>{startGame('cole');cur=U.cards.find(c=>c.id!=='intro'&&c.id!=='mama1'&&c.id!=='bus');renderCard();});
  const expected=await page.evaluate(()=>({entry:SV_LEARNING.feedback[U.id][cur.id].r,choice:cur.r.fr}));
  await page.locator('#btnR').click();await page.waitForTimeout(700);
  assert.equal(await page.locator('#sv-feedback .sv-feedback-story').textContent(),expected.entry.fr);
  assert.ok((await page.locator('#sv-feedback').textContent()).includes(expected.choice));
  await page.locator('#sv-feedback button').click();
  assert.ok((await page.locator('#sv-dialog').innerText()).includes(expected.entry.es));assert.ok((await page.locator('#sv-dialog').innerText()).includes(expected.entry.fr));
  if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,'commentaires-detail.png')});}
  await page.locator('#sv-continue').click();
  await page.getByRole('button',{name:'Mon bilan',exact:true}).filter({visible:true}).click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#sv-export').click();const download=await downloadPromise;
  const exported=fs.readFileSync(await download.path(),'utf8');assert.ok(exported.includes(expected.entry.es)&&exported.includes(expected.entry.fr));await download.delete();
  await page.locator('#sv-close').click();
  report.tests.push({name:'Carte auparavant sans retour : clic, détail bilingue et export effectif du bilan'});

  // Dernier choix à la défaite : delta plafonné et commentaire encore lisible sur la fin.
  const last=await page.evaluate(()=>{
   startGame('cole');const card=U.cards.find(c=>c.r.fx.energia>0);cur=card;S.g.energia=99;renderAll();
   return SV_LEARNING.feedback.cole[card.id].r;
  });
  await page.locator('#btnR').click();await page.locator('#end').waitFor({state:'visible'});
  assert.equal(await page.locator('#sv-end-feedback .sv-feedback-story').textContent(),last.fr);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('sobrevive-v2-learning')).history.at(-1).effects.find(e=>e.label==='Energía').delta),1);
  await page.locator('#sv-end-feedback button').click();assert.ok((await page.locator('#sv-dialog').innerText()).includes(last.es));await page.locator('#sv-continue').click();
  report.tests.push({name:'Dernier choix visible sur la fin, détail consultable et delta réel plafonné à +1'});

  // Cas longs : commentaire/choix précédents les plus longs et carte suivante longue, traduction ouverte.
  const layouts=[];
  for(const [name,width,height] of [['bureau',1440,1000],['mobile',390,844],['paysage',844,390]]){
   await page.setViewportSize({width,height});
   for(const world of ['cole','quijote','goya','botero','frida']){
    await page.evaluate(id=>{
     startGame(id);
     const all=U.cards.flatMap(c=>['l','r'].map(s=>({c,s,n:SV_LEARNING.feedback[id][c.id][s].fr.length+c[s].fr.length}))),pick=all.reduce((a,b)=>b.n>a.n?b:a);
     Core.apply(U,S,pick.c,pick.s);cur=U.cards.reduce((a,b)=>(b.t+b.f+b.l.es+b.l.fr+b.r.es+b.r.fr).length>(a.t+a.f+a.l.es+a.l.fr+a.r.es+a.r.fr).length?b:a);renderAll();
    },world);
    await page.locator('#helpBtn').click();await page.waitForTimeout(650);
    const metrics=await page.evaluate(()=>{
     const boxes=['#app header','#gauges','#speechBox','#choices','#sv-feedback','#sv-tools'].map(s=>({s,r:document.querySelector(s).getBoundingClientRect()})),overlap=[];
     for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i].r,b=boxes[j].r;if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlap.push([boxes[i].s,boxes[j].s]);}
     return {overlap,overflow:document.querySelector('#app').scrollWidth>innerWidth};
    });
    assert.deepEqual(metrics.overlap,[],name+'/'+world);assert.equal(metrics.overflow,false,name+'/'+world);
    await page.locator('#sv-feedback button').scrollIntoViewIfNeeded();assert.ok(await page.locator('#sv-feedback button').isVisible());
    if(shots&&world==='cole')await page.screenshot({path:path.join(shots,'commentaires-'+name+'.png')});
    layouts.push(name+'/'+world);
   }
  }
  report.tests.push({name:'15 mises en page longues bilingues sans chevauchement, retour accessible',layouts});
  assert.deepEqual(report.errors,[]);
  report.passed=true;console.log('450 choix contrôlés ; migration, export, fin de partie et 15 vues longues validés.');
 }finally{
  try{await browser?.close();}finally{server.close();}
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
