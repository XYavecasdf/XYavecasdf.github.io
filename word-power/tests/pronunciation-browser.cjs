// Real playback samples plus deterministic failure, synthesis and card-lifecycle checks.
// Requires playwright and Chromium; NODE_PATH / CHROME_BIN may point at installations.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const base = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://127.0.0.1:8765/word-power/';
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../lexicon.json'), 'utf8'));

async function open(page, word) {
  if (await page.locator('#overlay').getAttribute('aria-hidden') === 'false') {
    await page.locator('#close-modal').click();
  }
  await page.locator('#search').fill(word);
  await page.locator('.word-chip').filter({hasText: new RegExp('^' + word + '$')}).first().click();
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
    headless: true, args: ['--no-sandbox']});
  const errors = [];
  try {
    const context = await browser.newContext({ignoreHTTPSErrors: args.includes('--ignore-https-errors')});
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(String(e)));
    const mediaRequests = [];
    page.on('request', r => {if (r.url().startsWith('https://upload.wikimedia.org/')) mediaRequests.push(r.url())});
    await page.addInitScript(() => {
      const NativeAudio = window.Audio;
      window.__media = [];
      window.Audio = function (...args) {const audio = new NativeAudio(...args); window.__media.push(audio); return audio};
    });
    await page.goto(base + '?word=laconic', {waitUntil: 'networkidle'});
    await page.locator('#speak-word').waitFor();
    assert.equal(mediaRequests.length, 0, 'No audio is requested before a playback click');
    const playback = [];
    for (const word of ['laconic', 'proscribe', 'alter ego']) {
      await open(page, word);
      await page.locator('[data-recording="0"]').click();
      await page.waitForFunction(() => {const a = window.__media.at(-1); return a?.currentTime > 0.02 && a.duration > 0}, null, {timeout: 18000});
      const sample = await page.evaluate(() => {
        const audio = window.__media.at(-1);
        return {src: audio.src, duration: audio.duration, currentTime: audio.currentTime};
      });
      assert.ok(sample.currentTime > 0 && sample.duration > 0, word);
      playback.push({word, ...sample});
      await page.locator('#close-modal').click();
      assert.equal(await page.evaluate(() => window.__media.at(-1).paused), true, 'Close must stop audio');
    }
    // Every entry must retain a readable card and the synthesis option.
    await page.locator('#clear-all').click();
    const coverage = await page.evaluate(words => {
      const missing = [];
      for (const word of words) {
        const chip = [...document.querySelectorAll('.word-chip')].find(b => b.dataset.word === word);
        chip.click();
        const primary = document.querySelector('.audio-actions button:first-child');
        if (!document.getElementById('speak-word') || primary?.id !== 'play-american' ||
            !primary.getAttribute('aria-label').includes('美式英语') ||
            document.getElementById('detail-title').textContent !== word) missing.push(word);
      }
      return {checked: words.length, missing};
    }, Object.keys(data.lexicon));
    assert.deepEqual(coverage.missing, []);
    await open(page, 'laconic');
    await page.setViewportSize({width: 390, height: 844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    // Fault injection does not stand in for the real playback checks above.
    await page.route('https://upload.wikimedia.org/**', r => r.abort());
    await page.locator('[data-recording="0"]').click();
    await page.getByRole('status').filter({hasText: '录音暂时无法播放'}).waitFor();
    assert.equal(await page.locator('#speak-word').isEnabled(), true);
    const americanPlayback = [];
    for (const word of ['proscribe', 'laconicism', 'zoology']) {
      await open(page, word);
      await page.locator('#play-american[data-us-synthetic]').click();
      await page.waitForFunction(() => {const a = window.__media.at(-1); return a?.currentTime > 0.02 && a.duration > 0}, null, {timeout: 12000});
      const sample = await page.evaluate(() => ({src: window.__media.at(-1).src, duration: window.__media.at(-1).duration}));
      assert.ok(sample.src.includes('/audio/en-US/'), word);
      americanPlayback.push({word, ...sample});
    }
    await page.evaluate(() => {
      window.__spoken = [];
      window.__cancelled = 0;
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {configurable: true, value: class {constructor(text) {this.text = text}}});
      Object.defineProperty(window, 'speechSynthesis', {configurable: true, value: {
        getVoices: () => [{name: 'Test English', lang: 'en-US'}],
        speak: utterance => {window.__spoken.push(utterance); utterance.onstart?.()},
        cancel: () => {window.__cancelled++}
      }});
    });
    await open(page, 'laconicism');
    assert.equal(await page.locator('[data-recording]').count(), 0);
    await page.locator('#speak-word').click();
    assert.equal(await page.evaluate(() => window.__spoken.at(-1).text), 'laconicism');
    assert.equal(await page.evaluate(() => window.__spoken.at(-1).lang), 'en-US');
    await page.getByRole('status').filter({hasText: '非真人录音'}).waitFor();
    await page.locator('#stop-pronunciation').click();
    assert.ok(await page.evaluate(() => window.__cancelled > 0));
    await page.locator('#speak-word').click();
    const cancelledBeforeClose = await page.evaluate(() => window.__cancelled);
    await page.locator('#close-modal').click();
    assert.ok(await page.evaluate(() => window.__cancelled) > cancelledBeforeClose);
    await open(page, 'laconicism');
    const spoken = await page.evaluate(() => window.__spoken.length);
    for (const lang of ['en-GB', 'en-AU', 'zh-CN']) {
      await page.evaluate(lang => {window.speechSynthesis.getVoices = () => [{lang}]}, lang);
      await page.locator('#speak-word').click();
      await page.getByRole('status').filter({hasText: '没有可用的美音朗读'}).waitFor();
      assert.equal(await page.evaluate(() => window.__spoken.length), spoken, 'Do not substitute a non-US voice: ' + lang);
    }
    await page.evaluate(() => {delete window.speechSynthesis});
    await page.locator('#speak-word').click();
    await page.getByRole('status').filter({hasText: '没有可用的美音朗读'}).waitFor();
    await page.locator('#play-american').click();
    await page.waitForFunction(() => window.__media.at(-1)?.currentTime > 0.02);

    // A stale external lexicon must not erase the embedded audio index.
    const stale = structuredClone(data);
    delete stale.metadata.pronunciation_audio_version;
    for (const entry of Object.values(stale.lexicon)) delete entry.pronunciation_audio;
    await page.route('**/lexicon.json', r => r.fulfill({json: stale}));
    await page.goto(base + '?word=laconic');
    await page.locator('[data-recording="0"]').waitFor();
    await page.route('**/lexicon.json', r => r.abort());
    await page.reload();
    await page.locator('[data-recording="0"]').waitFor();
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ok: true, coverage, playback, americanPlayback, failures: errors,
      checked: ['no autoplay', 'real Ogg/WAV/phrase playback', 'close stops audio', 'mobile layout',
        'failed recording', 'English synthesis', 'stop/close cancels speech',
        'US MP3 without browser speech', 'reject UK/AU-only voices', 'missing English voices/API', 'stale external JSON', 'offline embedded fallback']}, null, 2));
  } finally {await browser.close()}
})().catch(e => {console.error(e); process.exitCode = 1});
