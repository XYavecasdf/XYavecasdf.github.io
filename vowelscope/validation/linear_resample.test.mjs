import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPage} from './page_harness.mjs';
import {dspExperimentPatch} from './dsp_variants.mjs';

function corrected(page='vowelscope/index.html') {
  let patch;
  assert.doesNotThrow(() => {patch=dspExperimentPatch('linear_zero_safe');},
    'The controlled exact-zero research variant must exist');
  return loadPage(page,{patch}).api;
}

test('research linear interpolation preserves exact-zero endpoints of a known triangle', () => {
  // A four-sample triangle resampled at step=1.5 has this exact eight-point cycle.
  // Its mean is zero and mean-square amplitude is 3/8; no copied interpolator oracle.
  const buffer=Float32Array.from({length:768},(_,i)=>[1,0,-1,0][i%4]);
  for(const page of ['vowelscope/index.html','vowelscope/en/index.html']) {
    const parsed=corrected(page).preprocess(buffer,16537.5);
    assert.deepEqual(Array.from(parsed.raw.slice(0,8)),[1,-.5,0,.5,-1,.5,0,-.5]);
    assert.equal(parsed.rms,Math.sqrt(3/8));
    assert.equal(parsed.raw.length,512);
    // The existing unpatched default is deliberately preserved for this experiment.
    const original=loadPage(page).api.preprocess(buffer,16537.5);
    assert.equal(original.raw[3],1);
    assert.equal(original.rms,.75);
  }
});

test('correction changes no preprocessing values when all source samples are nonzero', () => {
  for(const rate of [16000,44100,48000,96000]) {
    const buffer=Float32Array.from({length:8192},(_,i)=>.25+.05*Math.sin(2*Math.PI*830*i/rate));
    const original=loadPage('vowelscope/index.html').api.preprocess(buffer,rate);
    const result=corrected().preprocess(buffer,rate);
    assert.deepEqual(Array.from(result.raw),Array.from(original.raw));
    assert.deepEqual(Array.from(result.y),Array.from(original.y));
    assert.equal(result.rms,original.rms);
  }
});

test('zero-safe research preprocessing retains silence and insufficient-window contracts', () => {
  const api=corrected();
  const result=api.preprocess(new Float32Array(8192),48000);
  assert.equal(result.rms,0);
  assert.ok(Array.from(result.y).every(value=>value===0));
  assert.equal(api.preprocess(new Float32Array(100),48000),null);
});
