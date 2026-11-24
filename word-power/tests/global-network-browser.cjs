/* All words stay in the graph through search, selection, zoom and fullscreen. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const data=require('../lexicon.json');
const M=require('../explore-model.js');
const model=M.build(data);
const args=process.argv.slice(2);
const base=args.includes('--url')?args[args.indexOf('--url')+1]:'http://127.0.0.1:9876/word-power/';
async function ready(page){await page.locator('.global-network[data-layout-ready=true]').waitFor();await page.evaluate(()=>new Promise(requestAnimationFrame));}
async function search(page,text){await page.locator('#explore-search').fill(text);await page.locator('#explore-results button').first().click();}
const hit=(page,id)=>page.locator('.global-node[data-node-id="'+id+'"] .global-hit');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:args.includes('--ignore-https-errors')});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  const started=Date.now();await page.setViewportSize({width:1600,height:1100});
  let releaseLexicon;const gate=new Promise(resolve=>{releaseLexicon=resolve;});
  await page.route('**/lexicon.json',async route=>{await gate;await route.continue();});
  await page.goto(base);
  assert.equal(await page.locator('#explore-entry').isDisabled(),true,'Entry must wait for its handler during slow hydration');
  const opening=page.locator('#explore-entry').click();releaseLexicon();await opening;await ready(page);
  await page.unroute('**/lexicon.json');
  const loadMs=Date.now()-started;
  assert.equal(await page.locator('#network-all').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.global-node.word').count(),Object.keys(data.lexicon).length);
  assert.equal(await page.locator('.global-node').count(),model.nodes.size);
  assert.equal(await page.locator('.global-edge').count(),model.edges.length);
  const ids=await page.locator('.global-node').evaluateAll(ns=>ns.map(n=>n.dataset.nodeId));
  assert.deepEqual(new Set(ids),new Set(model.nodes.keys()));
  const actualEdges=await page.locator('.global-edge').evaluateAll(es=>es.map(e=>e.dataset.source+'\0'+e.dataset.target));
  assert.deepEqual(new Set(actualEdges),new Set(model.edges.map(e=>e.source+'\0'+e.target)));
  assert.equal(await page.locator('.global-node').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).display!=='none')),true);
  // The overview fits every node, including the small disconnected root families.
  const outside=await page.locator('.global-network').evaluate(svg=>{
   const area=svg.getBoundingClientRect();return [...svg.querySelectorAll('.global-dot')].filter(n=>{
    const r=n.getBoundingClientRect();return r.left<area.left||r.right>area.right||r.top<area.top||r.bottom>area.bottom;
   }).length;
  });assert.equal(outside,0);
  const overviewWords=await page.locator('.global-node.word text').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').length);
  await page.screenshot({path:'/tmp/wp-all-words-desktop.png',fullPage:true});

  await search(page,'philanthropy');
  assert.equal(await page.locator('#explore-card h2').textContent(),'philanthropy');
  assert.equal(await page.locator('.global-node').count(),model.nodes.size,'Search must preserve the whole graph');
  assert.equal(await page.locator('.global-node.highlight').count(),3);
  assert.equal(await page.locator('.global-edge.highlight').count(),2);
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const zoomedWords=await page.locator('.global-node.word text').evaluateAll(ns=>ns.filter(n=>getComputedStyle(n).display!=='none').length);
  assert.ok(zoomedWords>overviewWords,'More word labels appear when zoomed in');
  const focusedURL=page.url();
  await hit(page,'origin:古希腊语:philein').hover();
  assert.equal(await page.locator('.global-node.highlight').count(),model.neighbors('origin:古希腊语:philein').length+1);
  assert.equal(await page.locator('#explore-card h2').textContent(),'philanthropy','Hover must not replace the selected word');
  await hit(page,'origin:古希腊语:philein').click();
  assert.equal(await page.locator('#explore-card h2').textContent(),'philein');
  assert.equal(await page.locator('.global-node').count(),model.nodes.size);
  await page.locator('#network-locate').click();
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const before=await hit(page,'origin:古希腊语:philein').boundingBox();
  await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
  await page.mouse.move(before.x+before.width/2+45,before.y+before.height/2+20,{steps:5});await page.mouse.up();
  const after=await hit(page,'origin:古希腊语:philein').boundingBox();assert.ok(after.x>before.x+25,'Dragging moves the node in the camera coordinate system');
  await page.locator('#explore-reset').click();await page.evaluate(()=>new Promise(requestAnimationFrame));
  assert.equal(await page.locator('.global-node.selected').count(),0);
  assert.equal(await page.locator('.global-node').count(),model.nodes.size);
  assert.equal(new URL(page.url()).searchParams.has('focus'),false);

  await page.locator('#network-wide').click();await ready(page);
  assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'true');
  const fullscreen=await page.locator('#exploration').boundingBox();assert.equal(fullscreen.width,1600);assert.equal(fullscreen.height,1100);
  await search(page,'proscribe');
  await hit(page,'word:proscribe').dblclick();
  assert.equal(await page.locator('#detail-title').textContent(),'proscribe');
  assert.equal(await page.locator('#detail .pos-tags').innerText(),'v.');
  assert.ok(await page.locator('.book-story').count()>0);
  await page.locator('#play-american').click();
  await page.locator('#audio-status').filter({hasText:/正在播放|播放完毕/}).waitFor({timeout:18000});
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#overlay').getAttribute('aria-hidden'),'true');
  assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'true','First Escape closes only the word card');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'false');

  await page.goto(focusedURL);await ready(page);
  assert.equal(await page.locator('#explore-card h2').textContent(),'philanthropy');
  assert.equal(await page.locator('.global-node.selected').getAttribute('data-node-id'),'word:philanthropy');
  assert.equal(await page.locator('.global-node.word').count(),527);
  await page.locator('#network-local').click();
  assert.equal(await page.locator('.graph-node').count(),11);assert.equal(new URL(page.url()).searchParams.get('scope'),'local');
  await page.locator('#network-all').click();await ready(page);assert.equal(await page.locator('.global-node').count(),784);
  assert.equal(new URL(page.url()).searchParams.has('scope'),false);
  await page.locator('#tab-map').click();assert.equal(await page.locator('.place-marker').count(),7);
  assert.equal(await page.locator('#network-locate').isVisible(),false);
  await page.locator('#tab-network').click();await ready(page);assert.equal(await page.locator('.global-node').count(),784);
  await page.locator('#explore-back').click();await page.locator('#explore-entry').click();await ready(page);
  assert.equal(await page.locator('.global-node').count(),784);

  await page.locator('#explore-reset').click();await page.setViewportSize({width:390,height:844});await ready(page);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.global-node.word').count(),527);
  await page.screenshot({path:'/tmp/wp-all-words-mobile.png',fullPage:true});
  await search(page,'egoist');await page.locator('#explore-card .primary').click();
  assert.equal(await page.locator('#detail-title').textContent(),'egoist');await page.locator('#close-modal').click();
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#network-wide').click();await ready(page);
  assert.equal(await page.locator('.global-node').count(),784);
  await page.keyboard.press('Escape');await page.setViewportSize({width:320,height:740});await ready(page);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('#explore-reset').click();await page.locator('.global-network').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.global-node.selected').count(),1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,words:527,origins:257,edges:model.edges.length,loadMs,overviewWords,zoomedWords,mobile:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
