import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function core() {
  const filename = 'vowelscope/dsp/core.js';
  assert.ok(fs.existsSync(filename), 'Shared production DSP module does not exist');
  const context = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, {filename});
  return context.VowelScopeDSP;
}

test('shared engine exposes pure analysis functions for the real browser pages', () => {
  const dsp = core();
  for (const name of ['preprocess', 'levinsonDurbin', 'lpcSpectrum', 'estimateFormants', 'voicedEvidence', 'smoothFormants']) {
    assert.equal(typeof dsp[name], 'function', name);
  }
});

test('shared classic estimator preserves the archived synthetic acoustic fixture', () => {
  const dsp = core(), input = new Float32Array(8192);
  for (let i = 0; i < input.length; i++) {
    const t = i / 16000;
    input[i] = .18 * Math.sin(2 * Math.PI * 145 * t) + .09 * Math.sin(2 * Math.PI * 590 * t)
      + .065 * Math.sin(2 * Math.PI * 1600 * t) + .025 * Math.sin(2 * Math.PI * 3150 * t);
  }
  const parsed = dsp.preprocess(input, 16000);
  assert.deepEqual(JSON.parse(JSON.stringify(dsp.estimateFormants(parsed.y, 11025))), {f1: 587.5, f2: 1600, f3: 3150});
  assert.equal(dsp.estimateFormants(new Float64Array(512), 11025), null);
});

test('smoothing copies estimates without mutating accepted measurements or previous display', () => {
  const dsp = core();
  const acoustic = Object.freeze({f1: 600, f2: 1800, f3: null});
  const prior = Object.freeze({f1: 400, f2: 1400, f3: 3200});
  const result = dsp.smoothFormants(acoustic, prior, 58), alpha = .08 + (100 - 58) * .006;
  assert.notEqual(result, acoustic);
  assert.equal(result.f1, alpha * 600 + (1 - alpha) * 400);
  assert.equal(result.f2, alpha * 1800 + (1 - alpha) * 1400);
  assert.equal(result.f3, null);
  assert.equal(acoustic.f2, 1800);
  assert.equal(prior.f2, 1400);
});

test('candidate selection still accepts a replaced spectrum for isolated research variants', () => {
  const dsp = core();
  const spectrum = Array.from({length: 353}, (_, i) => ({f: 100 + 12.5 * i, power: 1}));
  for (const f of [500, 1500, 3000]) spectrum.find(x => x.f === f).power = 10;
  assert.deepEqual(JSON.parse(JSON.stringify(dsp.estimateFormants([], 11025, () => spectrum))), {f1: 500, f2: 1500, f3: 3000});
});
