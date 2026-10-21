import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function profiler() {
  const filename = 'vowelscope/dsp/profiler.js';
  assert.ok(fs.existsSync(filename), 'Repeatable browser profiling module is missing');
  const context = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context);
  return context.VowelScopeProfiler.create(75, 4);
}

test('profiling distinguishes analysis CPU time, missed hops and accepted measurements', () => {
  const p = profiler();
  for (const [at, duration, accepted] of [[1000, 2, true], [1075, 5, false], [1300, 80, true], [1375, 10, true]]) {
    p.record(at, duration, accepted);
  }
  const s = p.snapshot();
  assert.equal(s.frames, 4);
  assert.equal(s.accepted_frames, 3);
  assert.equal(s.missed_hops, 2);
  assert.equal(s.processing_over_budget, 1);
  assert.equal(s.cpu_mean_ms, 24.25);
  assert.equal(s.cpu_p95_ms, 80);
  assert.equal(s.hop_ms, 75);
});

test('profiling keeps bounded recent percentiles and resets between capture sessions', () => {
  const p = profiler();
  for (let i = 0; i < 20; i++) p.record(1000 + i * 75, i, true);
  const s = p.snapshot();
  assert.equal(s.recent_frames, 4);
  assert.equal(s.frames, 20);
  assert.equal(s.cpu_mean_ms, 9.5);
  assert.equal(s.cpu_p95_ms, 19);
  p.reset();
  assert.equal(p.snapshot().frames, 0);
  assert.equal(p.snapshot().cpu_p95_ms, null);
});

test('deliberate display pauses do not count as missed processing opportunities', () => {
  const p = profiler();
  p.record(1000, 1, true);
  assert.equal(typeof p.pause, 'function');
  p.pause();
  p.record(11000, 1, true);
  assert.equal(p.snapshot().missed_hops, 0);
  assert.equal(p.snapshot().frames, 2);
});
