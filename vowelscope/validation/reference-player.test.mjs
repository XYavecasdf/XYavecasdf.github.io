import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('only the 17 exact CC0 recordings are exposed, with pinned author provenance', () => {
  const data = moduleAPI().vowels;
  const supported = Object.entries(data).filter(([, v]) => v.audio);
  const inventory = JSON.parse(fs.readFileSync('vowelscope/reference-audio-sources.json', 'utf8'));
  const assets = inventory.assets.filter(asset => asset.file.endsWith('.wav'));
  assert.equal(supported.length, 17);
  assert.equal(assets.length, supported.length);
  for (const [symbol, item] of supported) {
    assert.equal(item.audio.license, 'CC0-1.0');
    assert.equal(item.audio.author, 'Ruben Schachtenhaufen');
    assert.ok(item.audio.url.includes('/81c8086257d84f5e434790603bb39b901df8143c/'));
    assert.ok(item.audio.url.endsWith(encodeURIComponent(symbol) + '.wav'));
    const source = assets.find(asset => asset.file === symbol + '.wav');
    assert.ok(source && source.url === item.audio.url);
    assert.match(source.sha256, /^[a-f0-9]{64}$/);
  }
  assert.equal(data['ɪ'].audio, null, 'Do not substitute /i/ for /ɪ/');
  assert.equal(data['ə'].audio, null, 'Do not invent missing reference recordings');
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
    assert.ok(device.instances[0].src.endsWith('/i.wav'));
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
    assert.equal(nodes.get('referenceReplay').disabled, true);
    assert.equal(device.instances.length, 2);
    assert.equal(nodes.get('referenceSymbol').textContent, '[ ɪ ]');
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
