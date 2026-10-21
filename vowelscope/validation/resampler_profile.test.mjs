import assert from 'node:assert/strict';
import test from 'node:test';

test('runtime profile measures actual processed frames without manufacturing acoustic references',async()=>{
  let profile;
  await assert.doesNotReject(async()=>{profile=await import('./resampler_profile.mjs');},
    'The resampler host profile driver must exist');
  const result=profile.profileCase(48000,'pole14_fs12000_poly_adaptive',3,1);
  assert.equal(result.warm.samples,3);
  assert.equal(result.warm.processed_frames,3);
  assert.equal(result.warm.accepted_frames,3);
  assert.equal(result.processing_hop_ms,75);
  assert.ok(Number.isFinite(result.cold_elapsed_ms)&&result.cold_elapsed_ms>=0);
  assert.match(result.timer,/wall-clock/);
  assert.ok(Number.isFinite(result.warm.p95_ms)&&result.warm.p95_ms>=0);
  assert.equal('references' in result,false);
});
