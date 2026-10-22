import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {loadPage} from './page_harness.mjs';

const pages = ['vowelscope/index.html', 'vowelscope/en/index.html'];
function media() {
  const instances = [];
  class Audio {
    constructor() { this.events = new Map(); this.paused = false; instances.push(this); }
    addEventListener(name, fn) { this.events.set(name, fn); }
    play() { this.plays = (this.plays || 0) + 1; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ''; }
    load() {}
    emit(name) { this.events.get(name)?.(); }
  }
  return {instances, Audio};
}
function moduleAPI() {
  const filename = 'vowelscope/reference-player.js';
  assert.ok(fs.existsSync(filename), 'Shared articulatory reference player is missing');
  const window = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {window});
  return window.VowelScopeReference;
}

test('all 28 reference vowels have explicit articulatory categories', () => {
  const data = moduleAPI().vowels;
  const expected = 'i y ɨ ɵ ɯ u ɪ ʊ e ø ɤ o ə ɛ ɜ œ ʌ ɔ æ ɐ a ɑ ɒ ʉ ʏ ɘ ɞ ɶ'.split(' ');
  assert.deepEqual(Object.keys(data).sort(), expected.sort());
  assert.ok(data.i.frontness > data.u.frontness);
  assert.ok(data.i.openness < data.a.openness);
  assert.equal(data.i.rounding, 'unrounded');
  assert.equal(data.y.rounding, 'rounded');
  assert.equal(data['ə'].rounding, 'unspecified');
  assert.equal(data['ɐ'].rounding, 'unspecified');
});

test('all 28 symbols have a local MP3 matched to an explicit source-catalog entry', () => {
  const data = moduleAPI().vowels;
  const inventory = JSON.parse(fs.readFileSync('vowelscope/reference-audio-sources.json', 'utf8'));
  const sourceBytes = fs.readFileSync('vowelscope/reference-audio/upstream-symbol-data.json');
  assert.equal(crypto.createHash('sha256').update(sourceBytes).digest('hex'), inventory.source_catalog_sha256);
  const upstream = JSON.parse(sourceBytes).vowels;
  assert.equal(inventory.recordings?.length, 28, 'Complete source catalog is missing');
  assert.equal(Object.values(data).filter(v => v.audio).length, 28);
  const files = new Set();
  for (const [symbol, vowel] of Object.entries(data)) {
    const asset = inventory.recordings.find(item => item.symbol === symbol);
    assert.ok(asset, `Missing independent source catalog entry for ${symbol}`);
    const original = upstream.find(item => item.character === symbol);
    assert.equal(asset.title, original.name);
    assert.equal(asset.original_file, original.audio);
    assert.equal(vowel.audio.license, 'CC-BY-SA-3.0');
    assert.equal(vowel.audio.title, asset.title);
    assert.equal(vowel.audio.originalFile, asset.original_file);
    const expected = `/vowelscope/reference-audio/u${symbol.codePointAt(0).toString(16).padStart(4, '0')}.mp3`;
    assert.equal(vowel.audio.url, expected);
    assert.equal(vowel.audio.url, '/' + asset.public_path);
    assert.ok(fs.existsSync('.' + expected), `Missing deployed audio for ${symbol}`);
    const bytes = fs.readFileSync('.' + expected);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), asset.mp3_sha256);
    assert.ok(vowel.audio.source.includes('/fc6270c08a8aed6141cbe04595db8801ba767b49/public/sounds/'));
    assert.ok(!files.has(expected), `Duplicate audio binding for ${symbol}`);
    files.add(expected);
  }
});

for (const page of pages) {
  test(`${page}: selecting a vowel opens the diagram and starts its exact recording`, async () => {
    const device = media();
    const {api, nodes} = loadPage(page, {window: {Audio: device.Audio}});
    assert.equal(device.instances.length, 0, 'No reference request before a user action');
    const button = nodes.get('targetButtons').children.find(b => b.textContent === 'i');
    button.dispatch('click');
    assert.equal(api.state.target, 'i');
    assert.equal(button['aria-pressed'], 'true');
    assert.equal(nodes.get('referenceDemo').hidden, false);
    assert.equal(nodes.get('referenceSymbol').textContent, '[ i ]');
    assert.ok(nodes.get('referenceTongue').d.startsWith('M '));
    assert.equal(device.instances.length, 1);
    assert.ok(device.instances[0].src.endsWith('/u0069.mp3'));
    assert.equal(device.instances[0].plays, 1);
    button.dispatch('click');
    assert.equal(api.state.target, 'i', 'Second click replays without collapsing');
    assert.ok(device.instances[0].paused);
    assert.equal(device.instances.length, 2);
  });

  test(`${page}: rapid selection cancels audio and ignores stale completion/errors`, () => {
    const device = media();
    const {nodes} = loadPage(page, {window: {Audio: device.Audio}});
    const click = symbol => nodes.get('targetButtons').children.find(b => b.textContent === symbol).dispatch('click');
    click('i'); click('u');
    assert.ok(device.instances[0].paused);
    device.instances[1].emit('playing');
    const status = nodes.get('referenceAudioStatus').textContent;
    device.instances[0].emit('error'); device.instances[0].emit('ended');
    assert.equal(nodes.get('referenceAudioStatus').textContent, status);
    click('ɪ');
    assert.ok(device.instances[1].paused);
    assert.equal(nodes.get('referenceReplay').disabled, false);
    assert.equal(device.instances.length, 3);
    assert.ok(device.instances[2].src.endsWith('/u026a.mp3'));
    assert.equal(nodes.get('referenceSymbol').textContent, '[ ɪ ]');
  });

  test(`${page}: every button, including previously missing vowels, starts its own audio`, () => {
    const device = media();
    const {nodes} = loadPage(page, {window: {Audio: device.Audio}});
    const inventory = JSON.parse(fs.readFileSync('vowelscope/reference-audio-sources.json', 'utf8'));
    assert.ok(Array.isArray(inventory.recordings), 'Complete source catalog is missing');
    for (const button of nodes.get('targetButtons').children) {
      button.dispatch('click');
      assert.equal(nodes.get('referenceReplay').disabled, false, button.textContent);
      const expected = inventory.recordings.find(item => item.symbol === button.textContent);
      assert.equal(device.instances.at(-1).src, '/' + expected.public_path);
      assert.equal(nodes.get('referenceSource').href, expected.source_page);
    }
    assert.equal(device.instances.length, 28);
  });

  test(`${page}: vowels without specified rounding do not teach a fixed lip shape`, () => {
    const {nodes} = loadPage(page);
    const click = symbol => nodes.get('targetButtons').children.find(b => b.textContent === symbol).dispatch('click');
    for (const symbol of ['ə', 'ɐ']) {
      click(symbol);
      assert.equal(nodes.get('referenceLipShape').visibility, 'hidden');
      assert.equal(nodes.get('referenceLips').visibility, 'hidden');
      assert.equal(nodes.get('referenceLipUnknown').visibility, 'visible');
      assert.match(nodes.get('referenceArticulation').textContent,
        page.includes('/en/') ? /not specified/ : /未指定/);
    }
    click('y');
    assert.equal(nodes.get('referenceLipShape').visibility, 'visible');
    assert.equal(nodes.get('referenceLipUnknown').visibility, 'hidden');
  });

  test(`${page}: illustrated tongue dorsum does not cross the drawn palate`, () => {
    const {nodes} = loadPage(page);
    // Roof from the actual page: M148,103 Q200,69 247,93 L263,126.
    const roofY = x => {
      if (x >= 247) return 93 + (x - 247) * 33 / 16;
      let lo = 0, hi = 1;
      for (let step = 0; step < 35; step++) {
        const t = (lo + hi) / 2, px = (1-t)**2*148 + 2*(1-t)*t*200 + t*t*247;
        if (px < x) lo = t; else hi = t;
      }
      const t = (lo + hi) / 2;
      return (1-t)**2*103 + 2*(1-t)*t*69 + t*t*93;
    };
    for (const button of nodes.get('targetButtons').children) {
      button.dispatch('click');
      const numbers = nodes.get('referenceTongue').d.match(/-?\d+(?:\.\d+)?/g).map(Number);
      const controls = [numbers.slice(6,8), numbers.slice(8,10), numbers.slice(10,12), numbers.slice(12,14)];
      for (let step = 0; step <= 40; step++) {
        const t = step/40, b = [(1-t)**3,3*(1-t)**2*t,3*(1-t)*t*t,t**3];
        const point = [0,1].map(axis => controls.reduce((sum,p,i) => sum+p[axis]*b[i],0));
        if (point[0] < 148) continue; // posterior tongue root, outside the drawn hard palate
        assert.ok(point[0] <= 263 && point[1] - roofY(point[0]) >= 4.5,
          `${button.textContent}: tongue dorsum intersects roof at ${point}`);
      }
    }
  });

  test(`${page}: reference playback cancels active microphone capture`, () => {
    const device = media();
    const {api, nodes} = loadPage(page, {window: {Audio: device.Audio}});
    let stopped = false;
    Object.assign(api.state, {running: true, stream: {getTracks: () => [{stop() { stopped = true; }}]}});
    nodes.get('targetButtons').children.find(b => b.textContent === 'a').dispatch('click');
    assert.equal(api.state.running, false);
    assert.ok(stopped);
    assert.equal(api.state.acousticFormants, null);
  });

  test(`${page}: late microphone permission after reference playback releases its track`, async () => {
    const device = media();
    let resolvePermission, released = false;
    const permission = new Promise(resolve => { resolvePermission = resolve; });
    const {api, nodes} = loadPage(page, {window: {Audio: device.Audio},
      navigator: {mediaDevices: {getUserMedia: () => permission}}});
    const pending = api.startMic();
    nodes.get('targetButtons').children[0].dispatch('click');
    resolvePermission({getTracks: () => [{stop() { released = true; }}]});
    await pending;
    assert.ok(released);
    assert.equal(api.state.running, false);
  });

  test(`${page}: autoplay rejection restores a usable replay control`, async () => {
    const device = media();
    device.Audio.prototype.play = () => Promise.reject({name:'NotAllowedError'});
    const {nodes} = loadPage(page, {window: {Audio: device.Audio}});
    nodes.get('targetButtons').children[0].dispatch('click');
    // Cross-realm promise adoption in the production VM needs a full turn.
    await new Promise(resolve => setImmediate(resolve));
    assert.match(nodes.get('referenceAudioStatus').textContent,
      page.includes('/en/') ? /blocked/ : /阻止/);
    assert.equal(nodes.get('referenceReplay').disabled, false);
    assert.equal(nodes.get('referenceStop').disabled, true);
  });

  test(`${page}: stop, microphone start and pagehide release reference playback`, async () => {
    const device = media();
    const {api, nodes, dispatchWindow} = loadPage(page, {window: {Audio: device.Audio}});
    const click = () => nodes.get('targetButtons').children[0].dispatch('click');
    click(); nodes.get('referenceStop').dispatch('click');
    assert.ok(device.instances[0].paused);
    click(); await api.startMic();
    assert.ok(device.instances[1].paused);
    click(); dispatchWindow('pagehide');
    assert.ok(device.instances[2].paused);
  });

  test(`${page}: audio failure has a localized retry state and diagram remains usable`, () => {
    const device = media();
    const {nodes} = loadPage(page, {window: {Audio: device.Audio}});
    nodes.get('targetButtons').children[0].dispatch('click');
    device.instances[0].emit('error');
    assert.match(nodes.get('referenceAudioStatus').textContent,
      page.includes('/en/') ? /Unable to load/ : /无法加载/);
    assert.equal(nodes.get('referenceReplay').disabled, false);
    assert.equal(nodes.get('referenceDemo').hidden, false);
    for (const button of nodes.get('targetButtons').children) button.dispatch('click');
    assert.ok(!nodes.get('referenceTongue').d.includes('NaN'));
  });
}
