const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.SV_PLAYWRIGHT || 'playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync(path.join(root,'index.html')));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let browser;
 try{
  browser=await chromium.launch({channel:process.env.SV_BROWSER_CHANNEL||'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('[data-u="cole"]').first().click();await page.locator('#startBtn').click();await page.locator('#sv-ready').click();
  await page.waitForTimeout(650);
  const first=await page.locator('#front img').evaluate(e=>({transform:getComputedStyle(e).transform,name:getComputedStyle(e).animationName}));
  await page.waitForTimeout(1200);const second=await page.locator('#front img').evaluate(e=>getComputedStyle(e).transform);
  assert.equal(first.name,'sv-illustration-life');assert.notEqual(first.transform,second);
  await page.getByRole('button',{name:'Mots utiles',exact:true}).click();
  assert.equal(await page.locator('#front img').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.keyboard.press('Escape');
  const bounds=await page.locator('#cardWrap').boundingBox();const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+120,y,{steps:12});
  const during=await page.locator('#cardWrap').evaluate(e=>({transform:e.style.transform,drag:e.classList.contains('drag')}));
  assert.ok(during.drag&&during.transform.includes('rotate('));
  assert.equal(await page.locator('#front img').evaluate(e=>getComputedStyle(e).animationName),'none');
  await page.mouse.up();assert.ok(await page.locator('#cardWrap').evaluate(e=>e.classList.contains('outR')));
  await page.waitForTimeout(330);assert.ok(await page.locator('#cardWrap').evaluate(e=>e.classList.contains('deal')));
  await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>S.plays),1);
  await page.evaluate(()=>{cur=U.cards.find(c=>c.id===U.start);renderCard();});
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await page.locator('#front img').evaluate(e=>({animation:getComputedStyle(e).animationName,transform:getComputedStyle(e).transform}));
  assert.equal(reduced.animation,'none');assert.equal(reduced.transform,'none');
  if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify({idle:first.name,transformChanges:true,pausedInHelp:true,swipe: during.transform,exitAndDeal:true,reducedMotion:reduced},null,2));
  console.log('Animation discrète active, suspendue dans aides et glissement ; inclinaison/sortie/arrivée conservées ; réduction des animations respectée.');
  await context.close();
 }finally{try{await browser?.close();}finally{server.close();}}
})().catch(e=>{console.error(e);process.exitCode=1;});
