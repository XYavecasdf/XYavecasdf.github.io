/* Immediate word previews, shared audio lifecycle and responsive positioning. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const data=require('../lexicon.json');
const args=process.argv.slice(2),base=args.includes('--url')?args[args.indexOf('--url')+1]:'http://127.0.0.1:9878/word-power/';
const hit=(page,word)=>page.locator('.global-node[data-node-id="word:'+word+'"] .global-hit');
async function search(page,word){await page.locator('#explore-search').fill(word);await page.locator('#explore-results button').first().click();}
async function ready(page){await page.locator('.global-network[data-layout-ready=true]').waitFor();}
async function play(page){await page.locator('#preview-play-american').click();await page.waitForFunction(()=>window.__media.at(-1)?.currentTime>.02,null,{timeout:18000});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:args.includes('--ignore-https-errors')}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{const Native=Audio;window.__media=[];window.Audio=function(...args){const a=new Native(...args);window.__media.push(a);return a;};});
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'?view=network');await ready(page);
  assert.equal(await page.locator('#word-preview').isVisible(),false);
  await search(page,'proscribe');await page.locator('#word-preview').waitFor();
  assert.equal(await page.locator('#word-preview-title').textContent(),'proscribe');
  assert.match(await page.locator('.word-preview-definition').textContent(),/禁止/);
  assert.equal(await page.locator('#word-preview .pos-tags').innerText(),'v.');
  assert.match(await page.locator('.word-preview-ipa').textContent(),/skɹaɪb/);
  assert.equal(await page.locator('#overlay').getAttribute('aria-hidden'),'true','Preview does not open the full modal');
  assert.equal(new URL(page.url()).searchParams.has('word'),false);
  assert.equal(await page.evaluate(()=>window.__media.length),0,'Opening a preview must not autoplay');
  assert.equal(await page.locator('.global-node').count(),784);
  await page.locator('#word-preview-close').click();
  await page.locator('.global-node[data-node-id="word:proscribe"] .global-label').click();assert.equal(await page.locator('#word-preview').isVisible(),true,'Clicking the word label itself shows a preview');
  await page.screenshot({path:'/tmp/wp-word-preview-desktop.png',fullPage:true});
  await play(page);
  assert.equal(await page.evaluate(()=>window.__media.at(-1).src.includes('/audio/en-US/')),true);
  await page.locator('#word-preview-close').click();assert.equal(await page.evaluate(()=>window.__media.at(-1).paused),true);
  assert.equal(await page.locator('#word-preview').isVisible(),false);
  // Keyboard selection enters a nonmodal preview; Escape restores node focus.
  await page.locator('.global-node[data-node-id="word:proscribe"]').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('#word-preview').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'word-preview');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#word-preview').isVisible(),false);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.nodeId),'word:proscribe');

  await search(page,'philanthropy');await play(page);
  assert.equal(await page.evaluate(()=>window.__media.at(-1).src.includes('upload.wikimedia.org')),true);
  await page.locator('#word-preview .audio-more > summary').click();
  assert.ok(await page.locator('#word-preview .audio-credits a[href*="commons.wikimedia.org"]').count());
  await search(page,'intimate');assert.equal(await page.evaluate(()=>window.__media.at(-1).paused),true,'Selecting another word stops the previous preview');
  assert.equal(await page.locator('#word-preview .pos-tags').innerText(),'adj. / n. / v.');
  await page.locator('#word-preview-open').click();
  assert.equal(await page.locator('#word-preview').isVisible(),false);
  assert.equal(await page.locator('#detail-title').textContent(),'intimate');assert.equal(await page.locator('#play-american').isVisible(),true);
  assert.equal(await page.locator('[id]').evaluateAll(ns=>{const ids=ns.map(n=>n.id);return ids.length===new Set(ids).size;}),true,'Preview and modal IDs stay unique');
  await page.locator('#close-modal').click();
  await page.locator('.global-node[data-node-id="word:intimate"] .global-label').dblclick();assert.equal(await page.locator('#detail-title').textContent(),'intimate');
  assert.equal(await page.locator('#word-preview').isVisible(),false);await page.locator('#close-modal').click();

  // Every existing word must expose its own correct preview fields and US control.
  const coverage=await page.evaluate(entries=>{
   const nodes=new Map([...document.querySelectorAll('.global-node.word')].map(n=>[n.dataset.nodeId,n]));
   const missing=[];
   for(const [word,entry] of entries){
    nodes.get('word:'+word).dispatchEvent(new MouseEvent('click',{bubbles:true}));
    const preview=document.getElementById('word-preview');
    if(preview.hidden||preview.querySelector('h2')?.textContent!==word||!preview.querySelector('.word-preview-definition')?.textContent.includes(entry.zh)||
      !preview.querySelector('.word-preview-ipa')?.textContent.includes(entry.ipa)||!preview.querySelector('.pos-tags')||!preview.querySelector('#preview-play-american'))missing.push(word);
   }
   return {checked:entries.length,missing};
  },Object.entries(data.lexicon));
  assert.deepEqual(coverage.missing,[]);
  await page.locator('#word-preview-close').click();
  await search(page,'proscribe');await page.locator('#network-wide').click();await ready(page);
  await search(page,'proscribe');await page.keyboard.press('Escape');
  assert.equal(await page.locator('#word-preview').isVisible(),false);assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'true','First Escape closes the preview');
  await page.keyboard.press('Escape');assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'false');
  await search(page,'proscribe');await page.locator('#explore-canvas svg').dispatchEvent('pointerdown',{clientX:80,clientY:330});
  assert.equal(await page.locator('#word-preview').isVisible(),false,'Outside pointer down dismisses the preview');
  await search(page,'proscribe');await page.locator('#explore-canvas').dispatchEvent('wheel',{deltaY:50});
  assert.equal(await page.locator('#word-preview').isVisible(),false,'Zoom gesture dismisses the preview');
  await search(page,'proscribe');await page.locator('#network-local').click();
  await page.locator('.graph-node[data-node-id="word:proscribe"]').click();
  assert.equal(await page.locator('#word-preview-title').textContent(),'proscribe');
  await page.locator('#tab-game').click();await page.locator('.pathfinder-network').waitFor();assert.equal(await page.locator('#word-preview').isVisible(),false);
  await page.locator('#tab-network').click();await page.locator('#network-all').click();await ready(page);

  await search(page,'intimate');await page.setViewportSize({width:390,height:844});
  await page.locator('#word-preview').waitFor();
  let rect=await page.locator('#word-preview').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=390&&rect.y>=0&&rect.y+rect.height<=844);
  assert.equal(await page.locator('#word-preview-title').textContent(),'intimate','Resize retains the selected preview');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'/tmp/wp-word-preview-mobile.png'});
  await page.setViewportSize({width:320,height:740});await page.locator('#word-preview').waitFor();
  rect=await page.locator('#word-preview').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=320&&rect.y>=0&&rect.y+rect.height<=740);
  await page.locator('#word-preview-open').click();assert.equal(await page.locator('#detail-title').textContent(),'intimate');await page.locator('#close-modal').click();
  // A blocked clip leaves a readable preview and an explicit full-entry fallback.
  await page.route('**/audio/en-US/**',route=>route.abort());
  await search(page,'proscribe');await page.locator('#preview-play-american').click();
  await page.locator('#preview-audio-status').filter({hasText:/完整词条/}).waitFor();
  assert.equal(await page.locator('#preview-play-american').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#word-preview-open').isVisible(),true);
  await page.locator('#explore-back').click();assert.equal(await page.locator('#word-preview').isVisible(),false);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,coverage,recordedUS:true,syntheticUS:true,keyboard:true,mobile:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
