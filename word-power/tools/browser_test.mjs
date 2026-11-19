#!/usr/bin/env node
/**
 * Real-browser smoke test for Word Power using Chrome DevTools Protocol.
 *
 * Requires a running HTTP server, e.g.:
 *   python -m http.server 8765 --bind 127.0.0.1
 * from the repository root, then:
 *   node tools/browser_test.mjs --url http://127.0.0.1:8765/word-power/ \
 *       --chrome "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
 *
 * The test checks rendering, search, word-card details, IPA/morphology/source
 * links, origin filtering, and a mobile viewport. It does not claim visual
 * pixel equivalence.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, value, index, all) => {
    if (value.startsWith('--')) pairs.push([value.slice(2), all[index + 1]]);
    return pairs;
  }, [])
);
const url = args.url || 'http://127.0.0.1:8765/word-power/';
const chrome = args.chrome || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const port = Number(args.port || 9223);
const profile = args.profile || `${process.env.TEMP || '.'}\\word-power-cdp-profile`;

const chromeProcess = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-crash-reporter',
  '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`,
  '--remote-allow-origins=*', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

async function waitForBrowser() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error('Chrome DevTools endpoint did not start');
}

let nextId = 0;
const pending = new Map();
let ws;

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true, userGesture: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Runtime.evaluate failed');
  }
  return result.result?.value;
}

try {
  await waitForBrowser();
  const target = await (await fetch(
    `http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' },
  )).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  for (let i = 0; i < 60; i += 1) {
    if (await evaluate('document.readyState') === 'complete') break;
    await sleep(200);
  }
  await sleep(800);

  const initial = await evaluate(`(() => ({
    title: document.title,
    metrics: ['metric-roots','metric-words','metric-branches'].map(id => document.getElementById(id)?.textContent),
    chips: document.querySelectorAll('button.word-chip').length,
    branches: document.querySelectorAll('.branch').length,
    groups: document.querySelectorAll('.cat').length,
    search: !!document.getElementById('search'),
    filterOptions: document.querySelectorAll('#origin-filter option').length
  }))()`);

  const search = await evaluate(`(() => {
    const input = document.getElementById('search');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'atheism');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(resolve => setTimeout(() => resolve({
      chips: [...document.querySelectorAll('button.word-chip')].map(b => b.dataset.word),
      branches: document.querySelectorAll('.branch').length
    }), 120));
  })()`);

  const detail = await evaluate(`(() => {
    const chip = document.querySelector('button.word-chip[data-word="atheism"]');
    if (!chip) return { error: 'atheism chip missing after search' };
    chip.click();
    const overlay = document.getElementById('overlay');
    const ipa = document.querySelector('#detail-body .ipa')?.textContent || '';
    const morphs = document.querySelectorAll('#detail-body .morph').length;
    const links = [...document.querySelectorAll('#detail-body a')].map(a => a.href);
    return {
      visible: overlay.classList.contains('visible'),
      title: document.getElementById('detail-title')?.textContent,
      ipa,
      morphs,
      links,
      hasCambridge: links.some(h => h.includes('cambridge.org')),
      hasWiktionary: links.some(h => h.includes('wiktionary.org')),
    };
  })()`);

  const detail2 = await evaluate(`(() => {
    document.getElementById('close-modal')?.click();
    const input = document.getElementById('search');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'philanthropist');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return new Promise(resolve => setTimeout(() => {
      const chip = document.querySelector('button.word-chip[data-word="philanthropist"]');
      if (!chip) return resolve({ error: 'philanthropist chip missing' });
      chip.click();
      resolve({
        title: document.getElementById('detail-title')?.textContent,
        morphs: [...document.querySelectorAll('#detail-body .morph')].map(m => m.textContent.trim()),
        roots: [...document.querySelectorAll('#detail-body .hint-item')].map(m => m.textContent.trim()),
        ipa: document.querySelector('#detail-body .ipa')?.textContent || ''
      });
    }, 120));
  })()`);

  const filter = await evaluate(`(() => {
    document.getElementById('close-modal')?.click();
    const input = document.getElementById('search');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const select = document.getElementById('origin-filter');
    select.value = '古希腊语';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return new Promise(resolve => setTimeout(() => resolve({
      chips: document.querySelectorAll('button.word-chip').length,
      labels: [...document.querySelectorAll('.branch .origin')].map(e => e.textContent.trim()).slice(0, 5),
      branches: document.querySelectorAll('.branch').length
    }), 120));
  })()`);

  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  const mobile = await evaluate(`(() => ({
    width: window.innerWidth,
    sidebar: getComputedStyle(document.querySelector('.sidebar')).display,
    layout: getComputedStyle(document.querySelector('.layout')).gridTemplateColumns,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    chips: document.querySelectorAll('button.word-chip').length
  }))()`);

  const results = { initial, search, detail, detail2, filter, mobile };
  const failures = [];
  if (initial.metrics.join(',') !== '238,507,8') failures.push(`metrics ${initial.metrics}`);
  if (initial.chips !== 679) failures.push(`initial chips ${initial.chips} != 679`);
  if (initial.branches !== 243) failures.push(`initial branches ${initial.branches} != 243`);
  if (!initial.search) failures.push('search input missing');
  if (!search.chips.includes('atheism')) failures.push('search did not find atheism');
  if (!detail.visible) failures.push('detail overlay did not open');
  if (detail.title !== 'atheism') failures.push(`detail title ${detail.title}`);
  if (!detail.ipa.includes('ˈeɪθiɪzəm')) failures.push(`atheism IPA ${detail.ipa}`);
  if (detail.morphs < 2) failures.push(`atheism morphs ${detail.morphs}`);
  if (!detail.hasWiktionary) failures.push('Wiktionary source link missing');
  if (detail2.title !== 'philanthropist') failures.push(`philanthropist title ${detail2.title}`);
  if (!detail2.roots.some(r => r.includes('philos'))) failures.push('philos root missing');
  if (!detail2.roots.some(r => r.includes('anthropos'))) failures.push('anthropos root missing');
  if (filter.chips < 1) failures.push('Greek filter returned no chips');
  if (!filter.labels.every(l => l === 'Ancient Greek')) failures.push(`filter labels ${filter.labels}`);
  if (mobile.sidebar !== 'none') failures.push(`mobile sidebar ${mobile.sidebar}`);
  if (mobile.horizontalOverflow) failures.push('mobile horizontal overflow');

  console.log(JSON.stringify({ url, results, failures, ok: failures.length === 0 }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  console.error(JSON.stringify({ url, ok: false, error: String(error) }, null, 2));
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  chromeProcess.kill();
}
