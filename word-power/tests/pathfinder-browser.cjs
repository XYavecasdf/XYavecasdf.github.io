/* Real game interactions plus reachability, route isolation and mobile checks. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const M=require('../explore-model.js'),P=require('../pathfinder-model.js'),data=require('../lexicon.json');
const model=M.build(data),deck=P.challenges(model);
const args=process.argv.slice(2),base=args.includes('--url')?args[args.indexOf('--url')+1]:'http://127.0.0.1:9877/word-power/';
const card=page=>page.locator('#explore-card');
const move=(page,id)=>page.locator('#explore-card [data-game-move="'+id+'"]');
async function ready(page){await page.locator('.pathfinder-network').waitFor();await page.locator('#explore-card[data-challenge]').waitFor();}
async function more(page,action){await page.locator('.pathfinder-more > summary').click();await page.locator('.pathfinder-more [data-game-action="'+action+'"]').click();}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({ignoreHTTPSErrors:args.includes('--ignore-https-errors')}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>requests.push(r.url()));
  await page.setViewportSize({width:1440,height:1050});await page.goto(base+'?view=network');
  await page.locator('.global-network[data-layout-ready=true]').waitFor();
  assert.equal(requests.some(url=>/pathfinder(?:-model)?\.js/.test(url)),false,'Game code is lazy');
  await page.locator('#tab-game').click();await ready(page);
  assert.equal(new URL(page.url()).searchParams.get('view'),'game');
  assert.equal(new URL(page.url()).searchParams.get('challenge'),deck[0].id);
  assert.equal(await page.locator('#explore-search').isVisible(),false);
  assert.equal(await card(page).getAttribute('data-phase'),'playing');
  assert.equal(await card(page).getAttribute('data-steps'),'0');
  assert.equal(await page.locator('[data-game-node="word:misanthropy"]').count(),0,'The target is not revealed as an unexplored neighbor');
  assert.equal(await page.locator('.pathfinder-trail').count(),1); // Collapsed actual route only.
  assert.equal(await page.locator('.pathfinder-trail li').count(),1);
  assert.equal(await card(page).locator('[data-game-action=undo]').isDisabled(),true);
  await page.locator('#pathfinder-banner [data-game-word=philanthropy]').click();
  assert.equal(await page.locator('#detail-title').textContent(),'philanthropy');assert.equal(await page.locator('#detail .pos-tags').innerText(),'n.');
  assert.equal(await page.locator('#play-american').isVisible(),true);await page.locator('#close-modal').click();
  assert.equal(await card(page).getAttribute('data-steps'),'0','Looking up a word never advances the round');
  await card(page).locator('[data-game-action=hint]').click();
  assert.equal(await move(page,'origin:古希腊语:anthropos').getAttribute('class'),'suggested');
  assert.equal(await card(page).getAttribute('data-steps'),'0');
  await move(page,'origin:古希腊语:philein').click();assert.equal(await card(page).getAttribute('data-steps'),'1');
  await card(page).locator('[data-game-action=undo]').click();assert.equal(await card(page).getAttribute('data-steps'),'0');
  // Keyboard play on the graph itself; focus remains in the current game.
  await page.locator('[data-game-node="origin:古希腊语:anthropos"]').focus();await page.keyboard.press('Enter');
  assert.equal(await card(page).getAttribute('data-steps'),'1');
  await page.locator('[data-game-node="word:misanthropy"]').click();
  assert.equal(await card(page).getAttribute('data-phase'),'completed');
  assert.equal(await card(page).getAttribute('data-steps'),'2');
  assert.match(await card(page).innerText(),/抵达终点/);assert.match(await card(page).innerText(),/1 次提示/);
  assert.deepEqual(await page.locator('.pathfinder-trail li>span:last-child').allTextContents(),['philanthropy','anthropos','misanthropy']);
  await page.screenshot({path:'/tmp/wp-pathfinder-win.png',fullPage:true});
  await card(page).locator('[data-game-action=restart]').click();assert.equal(await card(page).getAttribute('data-phase'),'playing');
  await more(page,'reveal');assert.equal(await card(page).getAttribute('data-phase'),'revealed');
  assert.match(await card(page).innerText(),/未完成/);assert.doesNotMatch(await card(page).innerText(),/抵达终点/);
  assert.equal(await card(page).getAttribute('data-steps'),'0');
  await card(page).locator('[data-game-action=restart]').click();
  await move(page,'origin:古希腊语:philein').click();await move(page,'word:philanthropy').click();
  await move(page,'origin:古希腊语:anthropos').click();await move(page,'word:misanthropy').click();
  assert.equal(await card(page).getAttribute('data-steps'),'4');assert.match(await card(page).innerText(),/最短需要 2 步/);
  assert.equal(await page.locator('.pathfinder-route summary').textContent(),'最短路线 · 2 步');
  await card(page).locator('[data-game-action=next]').click();
  assert.equal(await card(page).getAttribute('data-challenge'),deck[1].id);
  const shared=page.url();
  await page.locator('#tab-network').click();await page.locator('.global-network[data-layout-ready=true]').waitFor();
  assert.equal(await page.locator('.global-node.word').count(),527);
  await page.locator('#tab-game').click();await ready(page);assert.equal(await card(page).getAttribute('data-challenge'),deck[1].id);
  const solution=P.shortestPath(model,deck[1].start,deck[1].goal);
  await move(page,solution[1]).click();await page.locator('#tab-map').click();await page.locator('#tab-game').click();await ready(page);
  assert.equal(await card(page).getAttribute('data-steps'),'1','Switching views retains the round');
  await page.goto(shared);await ready(page);assert.equal(await card(page).getAttribute('data-steps'),'0','A shared challenge starts fresh');

  // Every shipped challenge is actually completable through the UI.
  for(const challenge of deck){
   await page.goto(base+'?view=game&challenge='+challenge.id);await ready(page);
   for(const id of P.shortestPath(model,challenge.start,challenge.goal).slice(1))await move(page,id).click();
   assert.equal(await card(page).getAttribute('data-phase'),'completed',challenge.id);
   assert.equal(await card(page).getAttribute('data-steps'),String(challenge.shortestSteps),challenge.id);
  }
  await page.goto(base+'?view=game&challenge=missing');await ready(page);
  assert.equal(new URL(page.url()).searchParams.get('challenge'),deck[0].id);
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const blocked=await page.evaluate(()=>{
   const controls=document.querySelector('.canvas-controls').getBoundingClientRect();
   return [...document.querySelectorAll('.pathfinder-node.available rect')].filter(n=>{const r=n.getBoundingClientRect();return r.left<controls.right&&r.right>controls.left&&r.top<controls.bottom&&r.bottom>controls.top;}).length;
  });assert.equal(blocked,0,'Canvas controls must not cover playable nodes');
  await page.screenshot({path:'/tmp/wp-pathfinder-mobile.png',fullPage:true});
  await page.locator('#network-wide').click();assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'true');
  await page.locator('#pathfinder-banner [data-game-word=philanthropy]').click();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#network-wide').getAttribute('aria-pressed'),'true');await page.keyboard.press('Escape');
  await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:320,height:740});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await move(page,'origin:古希腊语:anthropos').click();
  const steps=await card(page).getAttribute('data-steps');
  await page.locator('#explore-reset').click();assert.equal(await card(page).getAttribute('data-steps'),steps,'Canvas reset is not a round restart');
  await page.locator('#explore-back').click();assert.equal(new URL(page.url()).searchParams.has('challenge'),false);
  await page.locator('#explore-entry').click();await ready(page);assert.equal(await card(page).getAttribute('data-steps'),steps);

  // Failure of optional game code does not break the full graph or word library.
  const failed=await context.newPage();failed.on('pageerror',e=>errors.push(String(e)));
  await failed.route('**/pathfinder.js*',r=>r.abort());await failed.goto(base+'?view=game');
  await failed.locator('#pathfinder-retry').waitFor();await failed.locator('#explore-zoom-in').click();
  await failed.locator('#tab-network').click();await failed.locator('.global-network[data-layout-ready=true]').waitFor();
  assert.equal(await failed.locator('.global-node').count(),784);
  await failed.unroute('**/pathfinder.js*');await failed.locator('#tab-game').click();await ready(failed);
  await failed.locator('#tab-network').focus();await failed.keyboard.press('ArrowRight');await ready(failed);
  assert.equal(await failed.locator('#tab-game').getAttribute('aria-selected'),'true');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,challenges:deck.length,teleport:false,hints:true,undo:true,revealNotWin:true,sharedRoutes:true,mobile:true,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
