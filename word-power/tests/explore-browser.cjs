/* Browser-level exploration, history, failure isolation and shared-card checks. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const args=process.argv.slice(2);
const base=args.includes('--url')?args[args.indexOf('--url')+1]:'http://127.0.0.1:8765/word-power/';
const geo=JSON.parse(fs.readFileSync(path.join(__dirname,'../places.json')));
const pos=JSON.parse(fs.readFileSync(path.join(__dirname,'../lexicon.json'))).metadata.pos_version;
const node=(page,id)=>page.locator('.graph-node').filter({has:page.locator('text').filter({hasText:new RegExp('^'+id+'$')})});
async function ready(page){await page.locator('#explore-card h2').waitFor();}
async function close(page){await page.locator('#close-modal').click();}
async function chooseSearch(page,text,result){
 await page.locator('#explore-search').fill(text);
 await page.locator('#explore-results button').filter({hasText:result}).first().click();
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:args.includes('--ignore-https-errors')});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));
  const resources=[];page.on('request',r=>resources.push(r.url()));
  await page.addInitScript(()=>{const NativeAudio=Audio;window.__audio=[];window.Audio=function(...args){const a=new NativeAudio(...args);window.__audio.push(a);return a;};});
  await page.setViewportSize({width:1440,height:1000});await page.goto(base,{waitUntil:'networkidle'});
  assert.equal(await page.locator('.word-chip').count()>527,true);
  assert.equal(await page.locator('#exploration').isVisible(),false);
  assert.equal(resources.some(u=>/explore\.(js|css)|countries-110m|d3\.v7/.test(u)),false,'Explorer is lazy');
  await page.locator('#search').fill('o');await page.locator('#expand-all').click();
  await page.evaluate(()=>scrollTo({top:650,behavior:'instant'}));
  const scroll=await page.evaluate(()=>scrollY);
  await page.locator('#explore-entry').click();await ready(page);
  assert.equal(await page.locator('.place-marker').count(),7);
  assert.equal(await page.locator('.world-country.egypt').count(),1);
  assert.equal(await page.locator('.world-country.egypt').getAttribute('role'),'button');
  assert.equal(await page.locator('#library-view').isVisible(),false);
  assert.equal(await page.locator('#explore-card h2').textContent(),'Zaitun · Quanzhou');
  assert.equal(new URL(page.url()).searchParams.get('view'),'map');
  assert.ok(resources.filter(u=>/explore\.(js|css)|countries-110m|places.json|d3\.v7/.test(u)).every(u=>new URL(u).origin===new URL(base).origin),'Same-origin assets');
  await page.locator('#explore-zoom-in').click();
  assert.ok(await page.locator('#explore-canvas svg').evaluate(el=>el.__zoom.k)>1);
  await page.locator('#explore-reset').click();
  await page.locator('.place-marker[data-place-id="bayonne"] .marker-dot').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'Bayonne');
  await page.locator('#explore-reset').click();
  await page.locator('.world-country.egypt').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#explore-card h2').textContent(),'Egypt');
  await page.locator('#explore-reset').click();
  assert.equal(await page.locator('#explore-canvas svg').evaluate(el=>el.__zoom.k),1);
  await page.locator('#explore-canvas svg').focus();await page.keyboard.press('ArrowRight');
  assert.notEqual(await page.locator('#explore-canvas svg').evaluate(el=>el.__zoom.x),0);
  await page.locator('#explore-reset').click();

  // Every curated place opens the existing POS, story and US pronunciation card.
  for(const place of geo.places){
   await page.locator('.place-choice[data-place="'+place.id+'"]').click();
   assert.equal(new URL(page.url()).searchParams.get('place'),place.id);
   await page.locator('#explore-card .primary').click();
   assert.equal(await page.locator('#detail-title').textContent(),place.word);
   assert.equal(await page.locator('#detail .pos-tags').count(),1);
   assert.equal(await page.locator('#play-american').isVisible(),true);
   assert.ok(await page.locator('.book-story').count()>0);
   assert.equal(new URL(page.url()).searchParams.get('view'),'map');
   if(place.id==='egypt')assert.match(await page.locator('#detail-body').textContent(),/误认/);
   await close(page);
  }
  await chooseSearch(page,'泉州','satin');
  assert.equal(new URL(page.url()).searchParams.get('place'),'quanzhou');
  await page.locator('#explore-card .primary').click();await page.locator('#play-american').click();
  await page.waitForFunction(()=>window.__audio.at(-1)?.currentTime>.02,null,{timeout:18000});
  await close(page);assert.equal(await page.evaluate(()=>window.__audio.at(-1).paused),true);
  await chooseSearch(page,'philanthropy','关系网');
  assert.equal(await page.locator('#explore-card h2').textContent(),'philanthropy');
  assert.equal(await page.locator('.graph-node').count(),11);
  await node(page,'anthropos').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#explore-card h2').textContent(),'anthropos');
  assert.equal(await page.locator('.graph-node').count(),7);
  assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/anthropos/);
  await node(page,'misanthropy').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'misanthropy');
  assert.ok(await node(page,'misein').count()>0);
  const graphURL=page.url();
  // Dragging and zooming keep selection; reset returns the current neighborhood.
  const box=await node(page,'misein').boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2+15,{steps:5});await page.mouse.up();
  await page.locator('#explore-zoom-in').click();await page.locator('#explore-reset').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'misanthropy');
  await page.locator('#tab-map').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'Zaitun · Quanzhou');
  await page.locator('#tab-network').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'misanthropy');
  await page.locator('#explore-back').click();
  assert.equal(await page.locator('#search').inputValue(),'o');
  assert.ok(Math.abs(await page.evaluate(()=>scrollY)-scroll)<3,'Library scroll restored');
  await page.goBack();await ready(page);
  assert.equal(await page.locator('#explore-card h2').textContent(),'misanthropy');
  await page.goto(graphURL);await ready(page);
  assert.equal(await page.locator('#explore-card h2').textContent(),'misanthropy');
  await chooseSearch(page,'boycott','boycott');
  assert.equal(await page.locator('.graph-node.person').count(),1);
  await node(page,'Boycott').click();assert.match(await page.locator('#explore-card .explore-note').innerText(),/专名词源/);
  await chooseSearch(page,'satin','satin');assert.equal(await page.locator('.graph-node.place').count(),1);
  await page.locator('#explore-card [data-place]').click();
  await page.locator('#explore-card [data-graph-node]').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'satin');
  await page.locator('#explore-card [data-place]').click();
  await page.locator('#tab-map').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#tab-network').getAttribute('aria-selected'),'true');

  await page.goto(base+'?view=map&place=egypt&word=Gypsy');await ready(page);
  assert.equal(await page.locator('#detail-title').textContent(),'Gypsy');await close(page);
  assert.equal(await page.locator('.world-country.egypt').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('#explore-card .explore-note').textContent(),/不是罗姆人的真实族源地/);
  await page.setViewportSize({width:390,height:844});
  await page.locator('#tab-network').click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/wp-explore-network-mobile.png',fullPage:true});
  await page.locator('#tab-map').click();
  await page.screenshot({path:'/tmp/wp-explore-map-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.setViewportSize({width:320,height:740});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#tab-network').click();
  assert.equal(await page.locator('#explore-canvas svg').count(),1);

  // A failed lazy module can be retried, or left while the library stays usable.
  const broken=await context.newPage();broken.on('pageerror',e=>errors.push(String(e)));
  await broken.route('**/explore.js*',route=>route.abort());
  await broken.goto(base);await broken.locator('#explore-entry').click();await broken.locator('#explore-retry').waitFor();
  await broken.unroute('**/explore.js*');await broken.locator('#explore-retry').click();await ready(broken);
  await broken.locator('#explore-back').click();
  await broken.locator('#search').fill('egoist');await broken.locator('.word-chip').first().click();
  assert.equal(await broken.locator('#detail-title').textContent(),'egoist');
  const offline=await context.newPage();await offline.route('**/lexicon.json*',r=>r.abort());await offline.route('**/explore.js*',r=>r.abort());
  await offline.goto(base+'?word=intimate');
  await offline.locator('#detail .pos-tags').waitFor();
  assert.equal(await offline.locator('#detail .pos-tags').innerText(),'adj. / n. / v.');await close(offline);
  await offline.locator('#explore-entry').click();await offline.locator('#explore-fallback').click();
  assert.equal(await offline.locator('#library-view').isVisible(),true);

  const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'../lexicon.json')));
  const fixtureWords=Object.keys(fixture.lexicon).slice(0,51);
  fixture.groups.push({name:'Browser fixture',roots:[{term:'expansion fixture',lang:'test',zh:'fixture',words:fixtureWords}]});
  const many=await context.newPage();many.on('pageerror',e=>errors.push(String(e)));
  await many.route('**/lexicon.json',r=>r.fulfill({json:fixture}));
  await many.goto(base+'?view=network&focus='+encodeURIComponent('origin:test:expansion fixture'));await ready(many);
  assert.equal(await many.locator('.graph-node').count(),21);
  assert.match(await many.locator('#explore-more').textContent(),/余 31/);
  await many.locator('#explore-more').click();assert.equal(await many.locator('.graph-node').count(),41);
  assert.match(await many.locator('#explore-more').textContent(),/余 11/);
  await many.locator('#explore-more').click();assert.equal(await many.locator('.graph-node').count(),52);
  assert.equal(await many.locator('#explore-more').count(),0);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,places:8,wordNodes:527,originNodes:257,posVersion:pos,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
