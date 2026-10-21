import assert from 'node:assert/strict';
import test from 'node:test';

async function auditApi() {
  let api;
  await assert.doesNotReject(async()=>{api=await import('./filter_response_audit.mjs');},
    'The coefficient audit must inspect the actual research filter bank');
  return api;
}

test('coefficient response matches the analytic three-tap binomial filter',async()=>{
  const {responseDb}=await auditApi(),weights=[.25,.5,.25];
  assert.equal(responseDb(weights,0,16000),0);
  assert.ok(Math.abs(responseDb(weights,4000,16000)-20*Math.log10(.5))<1e-10);
  assert.ok(responseDb(weights,8000,16000)<-200);
});

test('actual polyphase banks preserve unit DC gain in every generated phase',async()=>{
  const {inspectBank,responseDb}=await auditApi();
  for(const [variant,taps] of [['pole14_fs12000_poly33',33],['pole14_fs12000_poly49',49]]) {
    const bank=inspectBank(48000,variant);
    assert.equal(bank.phases.length,64);
    for(const weights of bank.phases) {
      assert.equal(weights.length,taps);
      assert.ok(Math.abs(responseDb(weights,0,48000))<1e-10);
    }
  }
});

test('reported reachable phases follow actual multirate preprocessing positions',async()=>{
  const {inspectBank}=await auditApi();
  for(const [rate,count] of [[16000,3],[44100,40],[48000,1],[96000,1]]) {
    const bank=inspectBank(rate,'pole14_fs12000_poly33');
    assert.equal(bank.reachable.length,count);
    assert.equal(bank.samples,512);
    if(rate===16000)assert.deepEqual(bank.reachable,[0,21,43]);
    if(rate===48000||rate===96000)assert.deepEqual(bank.reachable,[0]);
  }
});

test('rate-scaled research bank has the predefined physical support at each input rate',async()=>{
  const {inspectBank}=await auditApi();
  for(const [rate,taps] of [[16000,33],[44100,47],[48000,49],[96000,97]]) {
    let bank;
    assert.doesNotThrow(()=>{bank=inspectBank(rate,'pole14_fs12000_poly_adaptive');},
      'The isolated rate-scaled candidate must be supported by the actual coefficient audit');
    assert.equal(bank.phases[0].length,taps);
    assert.equal(bank.samples,512);
  }
});

test('rate-scaled research bank meets the frozen sampled pass and stop budgets at every rate',async()=>{
  const {auditResponses}=await auditApi();
  const report=auditResponses(['pole14_fs12000_poly_adaptive']);
  assert.equal(report.cases.length,4,'Explicit variant selection must be honored');
  for(const result of report.cases) {
    assert.equal(result.pass_within_budget,true,`${result.input_rate_hz} passband failed`);
    assert.equal(result.stop_within_budget,true,`${result.input_rate_hz} stopband failed`);
  }
});
