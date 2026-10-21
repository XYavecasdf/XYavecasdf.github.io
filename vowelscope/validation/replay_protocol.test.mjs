import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

function syntheticDataset() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vowelscope-replay-'));
  const rate = 16000, count = rate * 2, wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(count * 2, 40);
  for (let i = 0; i < count; i++) {
    const t = i / rate, f1 = t < .7 ? 590 : 850, f2 = t < .7 ? 1600 : 2400;
    const sample = .18 * Math.sin(2 * Math.PI * 145 * t) + .09 * Math.sin(2 * Math.PI * f1 * t)
      + .065 * Math.sin(2 * Math.PI * f2 * t) + .025 * Math.sin(2 * Math.PI * 3150 * t);
    wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(root, 'synthetic.wav'), wav);
  const manifest = path.join(root, 'manifest.json');
  fs.writeFileSync(manifest, JSON.stringify({source: 'synthetic protocol fixture', version: '1', samples: [{
    audio_path: 'synthetic.wav', start_s: .3, end_s: 1.4, gt_time_s: .8,
    speaker_id: 'synthetic', split: 'dev', gt_f1_hz: 850, gt_f2_hz: 2400, vowel_ipa: 'æ'
  }]}));
  return {root, manifest};
}

test('replay v2 follows live HTML defaults and explicitly preserves historical slider replay', () => {
  const {root, manifest} = syntheticDataset();
  try {
    const run = smoothing => {
      const out = path.join(root, smoothing + '.json');
      execFileSync(process.execPath, ['vowelscope/validation/benchmark.mjs', '--manifest', manifest,
        '--split', 'dev', '--measurement', 'acoustic', '--smoothing', smoothing, '--out', out], {stdio: 'pipe'});
      return JSON.parse(fs.readFileSync(out));
    };
    const current = run('default');
    assert.equal(current.schema_version, 2);
    assert.equal(current.replay_protocol, 'html-defaults-v2');
    assert.equal(current.smoothing_value, 58);
    assert.match(current.code_digest, /^[a-f0-9]{64}$/);
    assert.match(current.source_commit, /^[a-f0-9]{40}$/);
    assert.equal(typeof current.source_dirty, 'boolean');
    const legacy = run('legacy');
    assert.equal(legacy.smoothing_value, 60);
    assert.deepEqual(current.results[0].estimated, legacy.results[0].estimated,
      'Classic raw acoustic estimates must be independent of the visual slider');
    assert.equal(current.summary.n, 1);
    assert.equal(current.summary.detected, 1);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('single-window peak audit records source provenance without individual traces', () => {
  const {root, manifest} = syntheticDataset();
  try {
    const out = path.join(root, 'peak-audit.json');
    execFileSync(process.execPath, ['vowelscope/validation/peak_audit.mjs', '--manifest', manifest,
      '--page', 'vowelscope/index.html', '--out', out], {stdio: 'pipe'});
    const result = JSON.parse(fs.readFileSync(out));
    assert.match(result.code_digest ?? '', /^[a-f0-9]{64}$/);
    assert.match(result.source_commit ?? '', /^[a-f0-9]{40}$/);
    assert.equal(typeof result.source_dirty, 'boolean');
    assert.equal(result.summary.n, 1);
    assert.equal('results' in result, false);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('unreviewed open-corpus queues cannot be mistaken for acoustic reference benchmarks', () => {
  const {root, manifest} = syntheticDataset();
  try {
    const pending = JSON.parse(fs.readFileSync(manifest));
    pending.kind = 'reference_review_queue'; pending.reference_review_status = 'pending';
    fs.writeFileSync(manifest, JSON.stringify(pending));
    assert.throws(() => execFileSync(process.execPath, ['vowelscope/validation/benchmark.mjs',
      '--manifest', manifest, '--split', 'dev', '--out', path.join(root, 'unsafe.json')], {stdio: 'pipe'}),
    error => /reference.*not.*reviewed/i.test(error.stderr.toString()));
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('a reviewed manifest cannot conceal a pending reference row', () => {
  const {root, manifest} = syntheticDataset();
  try {
    const pending = JSON.parse(fs.readFileSync(manifest));
    pending.kind = 'acoustic_reference_manifest'; pending.reference_review_status = 'reviewed';
    pending.samples[0].reference_review_status = 'pending';
    fs.writeFileSync(manifest, JSON.stringify(pending));
    assert.throws(() => execFileSync(process.execPath, ['vowelscope/validation/benchmark.mjs',
      '--manifest', manifest, '--split', 'dev', '--out', path.join(root, 'unsafe.json')], {stdio: 'pipe'}),
    error => /reference.*not.*reviewed/i.test(error.stderr.toString()));
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
});

test('CLI can replay the isolated zero-safe variant with distinct patch provenance', () => {
  const {root,manifest}=syntheticDataset();
  try {
    const run=variant=>{
      const out=path.join(root,variant+'.json');
      assert.doesNotThrow(()=>execFileSync(process.execPath,['vowelscope/validation/benchmark.mjs',
        '--manifest',manifest,'--split','dev','--measurement','acoustic','--dsp-variant',variant,
        '--out',out],{stdio:'pipe'}),'Registered research variants must work through the real CLI');
      return JSON.parse(fs.readFileSync(out));
    };
    const original=run('original'),corrected=run('linear_zero_safe');
    assert.equal(corrected.dsp_variant,'linear_zero_safe');
    assert.notEqual(corrected.dsp_patch_digest,original.dsp_patch_digest);
    assert.equal(corrected.page_digest,original.page_digest);
    assert.equal(corrected.summary.n,original.summary.n);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('CLI replays the rate-scaled pole candidate through the production acoustic path',()=>{
  const {root,manifest}=syntheticDataset();
  try {
    const out=path.join(root,'adaptive.json');
    assert.doesNotThrow(()=>execFileSync(process.execPath,['vowelscope/validation/benchmark.mjs',
      '--manifest',manifest,'--split','dev','--measurement','acoustic',
      '--dsp-variant','pole14_fs12000_poly_adaptive','--out',out],{stdio:'pipe'}));
    const report=JSON.parse(fs.readFileSync(out));
    assert.equal(report.dsp_variant,'pole14_fs12000_poly_adaptive');
    assert.equal(report.measurement,'acoustic');
    assert.equal(report.summary.n,1);
    assert.equal(report.summary.detected,1);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
