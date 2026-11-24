// End-to-end checks for restored stories, aliases, source notes and new origins.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const base = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://127.0.0.1:8765/word-power/';
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../lexicon.json'), 'utf8'));
async function open(page, word) {
  if (await page.locator('#overlay').getAttribute('aria-hidden') === 'false') await page.locator('#close-modal').click();
  await page.locator('#search').fill(word);
  await page.locator('.word-chip').filter({hasText: new RegExp('^' + word + '$')}).first().click();
}
(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox']});
  try {
    const context = await browser.newContext({ignoreHTTPSErrors: args.includes('--ignore-https-errors'),
      permissions: ['clipboard-read', 'clipboard-write']});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + '?word=laconic');
    await page.locator('#play-american').waitFor();
    assert.equal(await page.locator('.book-story').count(), 3);
    await page.locator('#copy-link').click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(copied.includes('You lose.') && copied.includes('烧成平地') && copied.includes('Saw sub, sank same.'));
    let checkedWords = 0, panels = 0;
    for (const [word, entry] of Object.entries(data.lexicon)) {
      if (!entry.book_stories?.length) continue;
      await open(page, word);
      const cards = page.locator('.book-story');
      assert.equal(await cards.count(), entry.book_stories.length, word);
      assert.deepEqual(await cards.locator('h3').allTextContents(),
        entry.book_stories.map(r => data.book_stories[r.story_id].title), word);
      assert.equal(await page.locator('#play-american').isVisible(), true, word);
      assert.equal(await page.locator('.entry-sources').getAttribute('open'), null, word);
      for (const ref of entry.book_stories) {
        const card = page.locator('[data-story-id="' + ref.story_id + '"]');
        await card.locator('.story-evidence > summary').click();
        const text = await card.locator('.story-evidence').innerText();
        assert.ok(text.includes('PDF 第 '), word);
        assert.ok(await card.locator('a.secondary-link').count(), word);
        await card.locator('.story-evidence > summary').click();
      }
      checkedWords++; panels += entry.book_stories.length;
    }
    await open(page, 'sycophant');
    assert.ok((await page.locator('.story-kind').innerText()).includes('有争议'));
    await open(page, 'genocide');
    await page.locator('.story-evidence > summary').click();
    assert.ok((await page.locator('.story-evidence').innerText()).includes('1945'));
    await open(page, 'regicide');
    assert.ok((await page.locator('.book-story .story-source').innerText()).includes('用法提醒'));
    await page.locator('#close-modal').click();
    await page.locator('#search').fill('guppies');
    assert.ok(await page.locator('.word-chip[data-word="guppy"]').count());
    await page.locator('#clear-all').click();
    await page.locator('#origin-filter').selectOption('地名');
    assert.equal(await page.locator('.word-chip').count(), 8);
    await page.locator('#clear-all').click();
    await open(page, 'boycott');
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    if (process.env.STORY_SCREENSHOT) await page.screenshot({path:process.env.STORY_SCREENSHOT});
    console.log(JSON.stringify({ok:true, checkedWords, panels, copiedAllLaconicStories:true,
      aliases:true, namedOrigins:true, mobile:true, errors}));
  } finally {await browser.close()}
})().catch(e => {console.error(e); process.exitCode=1});
