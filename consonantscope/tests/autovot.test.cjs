const test=require('node:test'),assert=require('node:assert/strict');let M;try{M=require('../scripts/autovot-comparison-core.cjs');}catch{M={};}
const reference={id:'x',cropStart:.575,cropEnd:.975,goldBurst:.6,goldVoice:.67,goldVotMs:70,condition:'clean',phone:'P'};
test('AutoVOT comparison API exists',()=>assert.equal(typeof M.predictionRow,'function'));
test('upstream millisecond frame outputs receive the independent crop offset',()=>{const r=M.predictionRow('12.5 40 100',reference,'bb');assert.ok(Math.abs(r.predBurst-.615)<1e-12);assert.ok(Math.abs(r.predVoice-.675)<1e-12);assert.equal(r.predVotMs,60);assert.equal(r.votErrorMs,-10);assert.equal(r.status,'measured');});
test('invalid or nonfinite model predictions are rejected, not counted as accurate',()=>{for(const line of ['nan 30 50','1 40 20','1 -1 30','1 0 999','1 10','0 20 50'])assert.equal(M.predictionRow(line,reference,'bb').status,'invalid');});
test('prediction count mismatch fails instead of truncating zip output',()=>assert.throws(()=>M.matchPredictions(['1 20 60'],[reference,reference],'bb'),/count/));
test('model score is retained as an uncalibrated score, not a probability',()=>{const r=M.predictionRow('15 20 90',reference,'bb');assert.equal(r.modelScore,15);assert.equal(r.scoreType,'uncalibrated_structured_margin');});
test('model outputs never inherit heuristic runtime measurements',()=>assert.equal(M.predictionRow('15 20 90',{...reference,runtimeMs:4.2},'bb').runtimeMs,null));
test('invalid model rows clear any heuristic error fields',()=>{const r=M.predictionRow('nan 20 90',{...reference,votErrorMs:5,burstErrorMs:2,voiceErrorMs:7},'bb');assert.equal(r.votErrorMs,null);assert.equal(r.burstErrorMs,null);assert.equal(r.voiceErrorMs,null);});
