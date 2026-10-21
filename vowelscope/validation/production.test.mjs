import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPage} from './page_harness.mjs';

const pages = ['vowelscope/index.html', 'vowelscope/en/index.html'];
const plain = value => JSON.parse(JSON.stringify(value));

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

// Simulate only browser-owned hardware resources. Tests invoke real page logic.
function device(failure = null) {
  const tracks = [];
  const contexts = [];
  const fail = stage => { if (failure === stage) throw new Error(`Injected ${stage} failure`); };
  class AudioContext {
    constructor() {
      fail('constructor'); this.state = 'suspended'; this.sampleRate = 48000;
      this.nodes = []; this.destination = {}; contexts.push(this);
    }
    async resume() { fail('resume'); this.state = 'running'; }
    async close() { this.state = 'closed'; }
    node(kind) {
      fail(kind);
      const n = {kind, connected: false, gain: {value: 1},
        connect() { this.connected = true; fail('connect'); },
        disconnect() { if (kind === 'source') fail('disconnect'); this.connected = false; }};
      this.nodes.push(n); return n;
    }
    createMediaStreamSource() { return this.node('source'); }
    createAnalyser() { return this.node('analyser'); }
    createGain() { return this.node('gain'); }
  }
  return {tracks, contexts, options: {
    navigator: {mediaDevices: {async getUserMedia() {
      const track = {readyState: 'live', stop() { this.readyState = 'ended'; }};
      tracks.push(track);
      return {getTracks: () => [track]};
    }}},
    window: {AudioContext}
  }};
}

function replay(page, smooth) {
  const {api, nodes} = loadPage(page, {search: '?lab=1'});
  const input = new Float32Array(8192);
  if (smooth !== undefined) nodes.get('smooth').value = String(smooth);
  Object.assign(api.state, {running: true, ctx: {sampleRate: 16000},
    analyser: {getFloatTimeDomainData(dst) { dst.set(input); }}});
  api.setBuffer(new Float32Array(8192));
  const read = (now, f1, f2) => {
    for (let i = 0; i < input.length; i++) {
      const t = i / 16000;
      input[i] = .18 * Math.sin(2 * Math.PI * 145 * t)
        + .09 * Math.sin(2 * Math.PI * f1 * t)
        + .065 * Math.sin(2 * Math.PI * f2 * t)
        + .025 * Math.sin(2 * Math.PI * 3150 * t);
    }
    api.processAudio(now);
    return plain({acoustic: api.state.acousticFormants, visual: api.state.visualFormants});
  };
  return {api, nodes, read};
}

for (const page of pages) {
  for (const cancel of ['stop', 'pagehide']) {
    test(`${page}: ${cancel} releases acquired resources before a pending resume completes`, async () => {
      const hardware = device(), resumed = deferred(), constructed = deferred();
      const Base = hardware.options.window.AudioContext;
      hardware.options.window.AudioContext = class extends Base {
        constructor() { super(); constructed.resolve(); }
        async resume() { await resumed.promise; if (this.state !== 'closed') this.state = 'running'; }
      };
      const {api, dispatchWindow} = loadPage(page, hardware.options);
      const starting = api.startMic();
      await constructed.promise;
      try {
        if (cancel === 'stop') await api.stopMic(); else await dispatchWindow('pagehide');
        assert.ok(hardware.tracks.every(t => t.readyState === 'ended'), 'Stop must not await resume to release the microphone');
        assert.ok(hardware.contexts.every(c => c.state === 'closed'));
      } finally { resumed.resolve(); await starting; }
      assert.equal(api.state.running, false);
    });
  }

  for (const cancel of ['stop', 'pagehide']) {
    test(`${page}: ${cancel} cancels capture that is still awaiting permission`, async () => {
      const hardware = device(), permission = deferred();
      const acquire = hardware.options.navigator.mediaDevices.getUserMedia;
      hardware.options.navigator.mediaDevices.getUserMedia = async () => { await permission.promise; return acquire(); };
      const {api, dispatchWindow} = loadPage(page, hardware.options);
      const starting = api.startMic();
      if (cancel === 'stop') await api.stopMic(); else dispatchWindow('pagehide');
      permission.resolve(); await starting;
      assert.equal(api.state.running, false);
      assert.ok(hardware.tracks.every(t => t.readyState === 'ended'));
      assert.ok(hardware.contexts.every(c => c.state === 'closed'));
    });
  }

  test(`${page}: concurrent start calls share one permission request`, async () => {
    const hardware = device(), permission = deferred();
    const acquire = hardware.options.navigator.mediaDevices.getUserMedia;
    let requests = 0;
    hardware.options.navigator.mediaDevices.getUserMedia = async () => { requests++; await permission.promise; return acquire(); };
    const {api} = loadPage(page, hardware.options);
    const first = api.startMic(), second = api.startMic();
    permission.resolve(); await Promise.all([first, second]);
    assert.equal(requests, 1);
    assert.equal(hardware.contexts.length, 1);
    await api.stopMic();
  });

  test(`${page}: completing an old context close cannot erase a new capture`, async () => {
    const hardware = device(), closing = deferred();
    const {api} = loadPage(page, hardware.options);
    await api.startMic();
    const old = api.state.ctx;
    old.close = async function() { await closing.promise; this.state = 'closed'; };
    const stopping = api.stopMic();
    await api.startMic();
    const current = api.state.ctx;
    assert.notEqual(current, old);
    closing.resolve(); await stopping;
    assert.equal(api.state.ctx, current);
    assert.equal(api.state.running, true);
    assert.equal(current.state, 'running');
    await api.stopMic();
  });

  for (const failure of ['constructor', 'resume', 'source', 'analyser', 'gain', 'connect']) {
    test(`${page}: failed ${failure} startup releases acquired audio resources`, async () => {
      const hardware = device(failure);
      const {api, nodes} = loadPage(page, hardware.options);
      await api.startMic();
      assert.ok(hardware.tracks.every(t => t.readyState === 'ended'), 'Microphone stream leaked');
      assert.ok(hardware.contexts.every(c => c.state === 'closed'), 'AudioContext leaked');
      assert.ok(hardware.contexts.every(c => c.nodes.every(n => !n.connected)), 'Connected audio node leaked');
      assert.equal(api.state.running, false);
      assert.equal(api.state.ctx, null);
      assert.equal(api.state.stream, null);
      assert.equal(nodes.get('startBtn').disabled, false);
      assert.equal(nodes.get('freezeBtn').disabled, true);
      assert.match(nodes.get('error').textContent, /Injected/);
    });
  }

  test(`${page}: successful capture can stop, reset and restart`, async () => {
    const hardware = device();
    const {api, nodes} = loadPage(page, hardware.options);
    await api.startMic();
    assert.equal(api.state.running, true);
    const firstStream = api.state.stream;
    assert.equal(api.state.ctx.state, 'running');
    assert.equal(api.state.analyser.fftSize, 8192);
    assert.equal(api.state.analyser.smoothingTimeConstant, 0);
    assert.equal(api.state.mute.gain.value, 0);
    assert.equal(nodes.get('freezeBtn').disabled, false);
    api.state.acousticFormants = {f1: 500, f2: 1500, f3: null};
    api.state.visualFormants = api.state.formants = {f1: 490, f2: 1400, f3: null};
    await api.stopMic();
    assert.ok(hardware.contexts.every(c => c.state === 'closed'));
    assert.ok(hardware.tracks.every(t => t.readyState === 'ended'));
    assert.equal(api.state.running, false);
    for (const key of ['formants', 'acousticFormants', 'visualFormants', 'ctx', 'stream', 'source', 'analyser', 'mute']) {
      assert.equal(api.state[key], null);
    }
    assert.equal(nodes.get('f1').textContent, '—');
    await api.startMic();
    assert.equal(api.state.running, true);
    assert.equal(api.state.sampleCount, 0);
    assert.equal(hardware.contexts.length, 2);
    assert.notEqual(api.state.stream, firstStream);
    assert.equal(api.state.stream.getTracks()[0].readyState, 'live');
    await api.stopMic();
    assert.ok(hardware.tracks.every(t => t.readyState === 'ended'));
  });

  test(`${page}: one failed disconnect does not prevent context cleanup`, async () => {
    const hardware = device('disconnect');
    const {api} = loadPage(page, hardware.options);
    await api.startMic();
    await api.stopMic();
    assert.equal(hardware.contexts[0].state, 'closed');
    assert.ok(hardware.contexts[0].nodes.filter(n => n.kind !== 'source').every(n => !n.connected));
    assert.equal(api.state.running, false);
    assert.equal(api.state.ctx, null);
  });

  test(`${page}: permission denial restores controls and leaves capture stopped`, async () => {
    const {api, nodes} = loadPage(page, {navigator: {mediaDevices: {
      async getUserMedia() { throw Object.assign(new Error('denied'), {name: 'NotAllowedError'}); }
    }}});
    await api.startMic();
    assert.equal(api.state.running, false);
    assert.equal(api.state.stream, null);
    assert.equal(nodes.get('startBtn').disabled, false);
    assert.match(nodes.get('error').textContent, page.includes('/en/') ? /permission denied/ : /权限被拒绝/);
  });

  test(`${page}: missing microphone API leaves an actionable error`, async () => {
    const {api, nodes} = loadPage(page);
    await api.startMic();
    assert.equal(api.state.running, false);
    assert.equal(nodes.get('startBtn').disabled, false);
    assert.match(nodes.get('error').textContent, /HTTPS/);
  });

  test(`${page}: stable acceptance uses acoustic history despite visual lag`, () => {
    const {api} = loadPage(page);
    const acoustic = {f1: 500, f2: 1500, f3: 3000};
    const candidate = {f1: 500, f2: 2200, f3: 3000};
    api.state.acousticFormants = acoustic;
    api.state.visualFormants = api.state.formants = {f1: 500, f2: 1100, f3: 3000};
    assert.deepEqual(plain(api.acceptFormants(candidate, 1000)), candidate,
      'A coherent acoustic transition must not be rejected because the display lags');
  });

  test(`${page}: stable mode confirms true acoustic jumps even when the display is nearby`, () => {
    const {api} = loadPage(page);
    api.state.acousticFormants = {f1: 500, f2: 1500, f3: 3000};
    api.state.visualFormants = api.state.formants = {f1: 500, f2: 2200, f3: 3000};
    const candidate = {f1: 500, f2: 2600, f3: 3000};
    assert.equal(api.acceptFormants(candidate, 1000), null);
    assert.deepEqual(plain(api.acceptFormants(candidate, 1100)), candidate);
  });

  test(`${page}: classic EMA follows the original formula without changing raw estimates`, () => {
    const slow = replay(page, 95), fast = replay(page, 0);
    assert.equal(slow.api.state.mode, 'classic');
    const first = slow.read(1000, 590, 1600);
    fast.read(1000, 590, 1600);
    const second = slow.read(1100, 850, 2400), quick = fast.read(1100, 850, 2400);
    assert.ok(first.acoustic && second.acoustic);
    assert.deepEqual(first.visual, first.acoustic);
    assert.deepEqual(second.acoustic, quick.acoustic);
    const alpha = .08 + (100 - 95) * .006;
    for (const key of ['f1', 'f2', 'f3']) {
      assert.equal(second.visual[key], alpha * second.acoustic[key] + (1 - alpha) * first.visual[key]);
    }
    assert.notDeepEqual(second.visual, quick.visual);
    assert.equal(slow.api.state.formants, slow.api.state.visualFormants);
    assert.notEqual(slow.api.state.acousticFormants, slow.api.state.visualFormants);
  });

  test(`${page}: paused display and mode reset preserve state contracts`, () => {
    const {api, nodes, read} = replay(page);
    const before = read(1000, 590, 1600);
    nodes.get('freezeBtn').dispatch('click');
    assert.equal(api.state.frozen, true);
    assert.deepEqual(read(1100, 850, 2400), before);
    assert.equal(api.state.sampleCount, 1);
    api.setTrackingMode('stable');
    for (const key of ['formants', 'acousticFormants', 'visualFormants', 'firstCandidate', 'pendingJump']) {
      assert.equal(api.state[key], null);
    }
    assert.equal(api.state.trail.length, 0);
    assert.equal(api.state.lastAccepted, 0);
  });
}

test('Chinese and English classic measurements and display outputs agree', () => {
  const locales = pages.map(page => replay(page));
  // Recorded from unmodified c544b67 with real HTML smooth=58, input 16 kHz.
  // This pins the original display behavior as well as cross-locale parity.
  const baseline = [
    {acoustic: {f1: 587.5, f2: 1600, f3: 3150}, visual: {f1: 587.5, f2: 1600, f3: 3150}},
    {acoustic: {f1: 850, f2: 2400, f3: 3150}, visual: {f1: 674.6499999999999, f2: 1865.6, f3: 3150}},
    {acoustic: {f1: 537.5, f2: 1450, f3: 3150}, visual: {f1: 629.1161999999998, f2: 1727.6208, f3: 3150}}
  ];
  const frames = [[1000, 590, 1600], [1100, 850, 2400], [1200, 540, 1450]];
  for (let i = 0; i < frames.length; i++) {
    const zh = locales[0].read(...frames[i]), en = locales[1].read(...frames[i]);
    assert.deepEqual(zh, en);
    assert.deepEqual(zh, baseline[i]);
  }
  assert.equal(locales[0].nodes.get('ipaSymbol').textContent, locales[1].nodes.get('ipaSymbol').textContent);
});
