import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPage} from './page_harness.mjs';
import {dspExperimentPatch} from './dsp_variants.mjs';

function inputTone(rate, frequency, amplitude = .2) {
  return Float32Array.from({length: 8192}, (_, i) => amplitude * Math.sin(2 * Math.PI * frequency * i / rate));
}

test('fixed-duration polyphase experiment retains the original physical analysis window', () => {
  const {api} = loadPage('vowelscope/index.html', {patch: dspExperimentPatch('pole14_fs12000_poly33_fixed_window')});
  const parsed = api.preprocess(inputTone(48000, 1000), 48000);
  assert.equal(parsed.raw.length, 557);
  assert.ok(Math.abs(parsed.raw.length / 12000 - 512 / 11025) <= .5 / 12000);
});

test('33-tap candidate preserves 1-kHz energy and suppresses an 8-kHz alias at 48-to-12 kHz', () => {
  const {api} = loadPage('vowelscope/index.html', {patch: dspExperimentPatch('pole14_fs12000_poly33')});
  const inputRms = .2 / Math.sqrt(2);
  const pass = api.preprocess(inputTone(48000, 1000), 48000).rms;
  const stop = api.preprocess(inputTone(48000, 8000), 48000).rms;
  const passDb = 20 * Math.log10(pass / inputRms), stopDb = 20 * Math.log10(stop / inputRms);
  assert.ok(Math.abs(passDb) <= 1, `1-kHz gain ${passDb} dB exceeds +/-1-dB test budget`);
  assert.ok(stopDb <= -20, `8-kHz alias ${stopDb} dB exceeds -20-dB test budget`);
});

test('polyphase preprocessing remains finite on DC and supported microphone sample rates', () => {
  for (const rate of [16000, 44100, 48000, 96000]) {
    const {api} = loadPage('vowelscope/index.html', {patch: dspExperimentPatch('pole14_fs12000_poly33')});
    const parsed = api.preprocess(new Float32Array(8192).fill(.25), rate);
    assert.ok(parsed);
    assert.ok(parsed.rms < 1e-12);
    assert.ok([...parsed.y].every(Number.isFinite));
    assert.equal(api.preprocess(new Float32Array(100), rate), null);
  }
});

function adaptive(page='vowelscope/index.html') {
  let patch;
  assert.doesNotThrow(()=>{patch=dspExperimentPatch('pole14_fs12000_poly_adaptive');},
    'Rate-scaled FIR must remain a selectable offline experiment');
  return loadPage(page,{patch}).api;
}

test('rate-scaled FIR preserves poly33 preprocessing and formants at 16 kHz in both locales',()=>{
  const input=Float32Array.from({length:8192},(_,i)=>{
    const t=i/16000;
    return .17*Math.sin(2*Math.PI*145*t)+.07*Math.sin(2*Math.PI*540*t)
      +.045*Math.sin(2*Math.PI*1450*t)+.025*Math.sin(2*Math.PI*2790*t);
  });
  for(const page of ['vowelscope/index.html','vowelscope/en/index.html']) {
    const original=loadPage(page,{patch:dspExperimentPatch('pole14_fs12000_poly33')}).api;
    const candidate=adaptive(page),before=original.preprocess(input,16000),after=candidate.preprocess(input,16000);
    assert.deepEqual(Array.from(after.raw),Array.from(before.raw));
    assert.deepEqual(Array.from(after.y),Array.from(before.y));
    assert.equal(after.rms,before.rms);
    const baseline=original.estimateFormants(before.y,11025);
    assert.ok(baseline,'Synthetic regression fixture must contain a measurable vowel');
    assert.deepEqual(JSON.parse(JSON.stringify(candidate.estimateFormants(after.y,11025))),
      JSON.parse(JSON.stringify(baseline)));
  }
});

test('adaptive kernel cache cannot carry a previous capture rate into new measurements',()=>{
  const reused=adaptive();
  for(const rate of [48000,96000,16000,44100,48000]) {
    const input=inputTone(rate,1000),reference=adaptive().preprocess(input,rate),actual=reused.preprocess(input,rate);
    assert.deepEqual(Array.from(actual.raw),Array.from(reference.raw));
    assert.deepEqual(Array.from(actual.y),Array.from(reference.y));
    const silence=reused.preprocess(new Float32Array(8192).fill(.25),rate);
    assert.ok(silence.rms<1e-12);
    assert.ok(Array.from(silence.y).every(Number.isFinite));
    assert.equal(reused.preprocess(new Float32Array(100),rate),null);
  }
});
