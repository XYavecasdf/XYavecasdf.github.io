const test = require('node:test');
const assert = require('node:assert/strict');
let A;
try { A = require('../analysis.js'); } catch { A = {}; }
test('analysis API exists', () => assert.equal(typeof A.analyze, 'function'));
test('silence never produces a VOT', () => { const r=A.analyze(new Float32Array(24000),24000,'cv'); assert.equal(r.markers,null); });
test('sustained vowel without burst is rejected', () => { const x=Float32Array.from({length:24000},(_,i)=>.2*Math.sin(2*Math.PI*150*i/24000)); assert.equal(A.analyze(x,24000,'cv').markers,null); });
test('known artificial 60 ms burst-to-voicing delay is recovered', () => { const d=A.synthesize(60,'cv',24000); const r=A.analyze(d.samples,d.sampleRate,'cv'); assert.ok(r.markers); assert.ok(Math.abs((r.markers.voice-r.markers.burst)*1000-60)<15,JSON.stringify(r.markers)); });
test('known artificial intervocalic delay locates second vowel', () => { const d=A.synthesize(45,'vcv',24000); const r=A.analyze(d.samples,d.sampleRate,'vcv'); assert.ok(r.markers); assert.ok(r.markers.voice>.65); assert.ok(Math.abs((r.markers.voice-r.markers.burst)*1000-45)<15); });
test('manual VOT supports prevoicing and closure validation', () => { assert.equal(A.measure({burst:.6,voice:.55,closure:.4},'vcv').vot,-50); assert.equal(A.measure({burst:.6,voice:.65,closure:.4},'vcv').closure,200); assert.equal(A.measure({burst:.6,voice:.65,closure:.7},'vcv').closure,null); assert.equal(A.measure({burst:.6,voice:.65,closure:.4},'cv').closure,null); });
test('FFT locates a known 1000 Hz component', () => { const x=Float32Array.from({length:1024},(_,i)=>Math.sin(2*Math.PI*1000*i/16000)); const s=A.spectrum(x,16000); let k=0; for(let i=1;i<s.power.length;i++)if(s.power[i]>s.power[k])k=i; assert.ok(Math.abs(k*s.binHz-1000)<20); });
test('WAV exports PCM with correct sample rate and length', () => { const b=A.encodeWav(new Float32Array([0,.5,-.5]),24000); const v=new DataView(b); assert.equal(v.getUint32(24,true),24000); assert.equal(v.getUint32(40,true),6); assert.equal(b.byteLength,50); });
test('competing release-like bursts are rejected rather than assigned an arbitrary VOT',()=>{const d=A.synthesize(60,'cv',24000);let seed=99;for(let i=7200;i<7296;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;d.samples[i]=.65*(seed/4294967296*2-1);}assert.equal(A.analyze(d.samples,24000,'cv').markers,null);});
