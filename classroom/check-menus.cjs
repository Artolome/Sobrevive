const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.SV_PLAYWRIGHT||'playwright');
const repo=path.resolve(__dirname,'..'),out=process.argv[2]?path.resolve(process.argv[2]):null;
const capture=async(page,selector,name)=>{if(out){fs.mkdirSync(out,{recursive:true});await page.locator(selector).screenshot({path:path.join(out,name)})}};
(async()=>{
 const browser=await chromium.launch({channel:process.env.SV_BROWSER_CHANNEL||'msedge',headless:true});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
 const page=await ctx.newPage(),errors=[],requests=[],results=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url())});
 try{
 for(const [size,width,height] of [['bureau',1440,1000],['mobile',390,844],['paysage',844,390],['petit',320,640]]){
  await page.setViewportSize({width,height});await page.goto(pathToFileURL(path.join(repo,'index.html')).href);await page.evaluate(()=>document.fonts.ready);
  assert.ok(await page.evaluate(()=>document.fonts.check('600 32px Fraunces')&&document.fonts.check('600 16px "Nunito Sans"')));
  await capture(page,'#lobby','menus-accueil-'+size+'.png');
  const check=async(selector)=>{const v=await page.locator(selector).evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth}));assert.ok(v.scroll<=v.width+1,selector+' horizontal '+JSON.stringify(v));};
  await check('#lobby');assert.equal(await page.locator('.sv-world-enter').count(),5);
  for(const world of ['cole','quijote','goya','botero','frida']){
   await page.locator('#worlds button[data-u="'+world+'"]').click();await check('#ficha');
   assert.equal(await page.locator('#startBtn').isVisible(),true);
   assert.equal(await page.locator('.sv-collection').getAttribute('open'),null);
   await page.locator('.sv-collection summary').click();await check('#ficha');
   assert.ok(await page.locator('#fChars .chr').count()>0);
   await page.locator('.sv-collection summary').click();
   if(world==='frida')await capture(page,'#ficha','menus-univers-'+size+'.png');
   await page.locator('#backBtn').click();
  }
  await page.getByRole('button',{name:'Comment jouer',exact:true}).click();await check('#sv-dialog');
  await capture(page,'#sv-dialog','menus-aide-'+size+'.png');
  await page.locator('#sv-ready').click();
  await page.getByRole('button',{name:'Mon bilan',exact:true}).first().click();await check('#sv-dialog');await page.locator('#sv-close').click();
  results.push({size,width,height,worlds:5,fonts:true,overflow:false});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 if(out)fs.writeFileSync(path.join(out,'menus-visuels-tests.json'),JSON.stringify({results,errors,externalRequests:requests},null,2));
 console.log(JSON.stringify({results,errors,externalRequests:requests},null,2));
 }finally{await ctx.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
