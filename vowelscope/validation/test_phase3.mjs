#!/usr/bin/env node
// Numerics and UI-separation regression tests; no corpus or microphone needed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readPageSource} from './page_source.mjs';
import { polesToFormants, poleResearchPatch } from './lpc_poles.mjs';

const fsHz=11025;
const resonances=[
  {f:400,bw:80},{f:1350,bw:110},{f:2700,bw:150},
  {f:3400,bw:180},{f:4100,bw:200},{f:4650,bw:210},{f:5150,bw:260}
];
let coefficients=[1];
for(const {f,bw} of resonances){
  const r=Math.exp(-Math.PI*bw/fsHz),a=-2*r*Math.cos(2*Math.PI*f/fsHz);
  const next=new Array(coefficients.length+2).fill(0);
  for(let i=0;i<coefficients.length;i++){
    next[i]+=coefficients[i];next[i+1]+=a*coefficients[i];
    next[i+2]+=r*r*coefficients[i];
  }
  coefficients=next;
}
const recovered=polesToFormants(coefficients,fsHz,700);
assert.ok(recovered&&recovered.length>=5,'Should recover five below-ceiling pole pairs');
for(let i=0;i<5;i++){
  assert.ok(Math.abs(recovered[i].f-resonances[i].f)<.05,'Pole frequency accuracy');
  assert.ok(Math.abs(recovered[i].bw-resonances[i].bw)<.05,'Pole bandwidth accuracy');
}
assert.equal(polesToFormants([1,NaN],fsHz),null,'Non-finite polynomial rejected');
for(const kind of ['pole14_bw700','pole14_bw400','pole16_bw700']){
  assert.match(poleResearchPatch(kind),/levinsonDurbin/);
}
function evaluatePage(path,smooth){
  const {inline:script,prefix}=readPageSource(path);
  assert.ok(script,'HTML should contain a JS script');
  const canvas=new Proxy({measureText:s=>({width:String(s).length*10})},{
    get(target,key){return key in target?target[key]:()=>{}},
    set(target,key,val){target[key]=val;return true}
  });
  const nodes=new Map();
  function el(){return{children:[],dataset:{},style:{},value:'60',textContent:'',
    classList:{add(){},remove(){},toggle(){}},getContext(){return canvas},
    appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},
    setAttribute(){},addEventListener(){}}}
  const document={
    getElementById(id){if(!nodes.has(id))nodes.set(id,el());return nodes.get(id)},
    createElement:el
  };
  const window={location:{search:'?lab=1'},addEventListener(){}};
  const instrumented=script.replace('    requestAnimationFrame(frame);',
    '    window.__test={state,processAudio,setBuffer(buf){audioBuffer=buf}};');
  vm.runInNewContext(prefix+instrumented,{document,window,requestAnimationFrame(){}},{timeout:3000,filename:path});
  assert.ok(window.__test);
  nodes.get('smooth').value=String(smooth);
  const {state,processAudio}=window.__test,buf=new Float32Array(8192);
  const input=new Float32Array(8192);
  state.mode='classic';state.running=true;state.ctx={sampleRate:16000};
  state.analyser={getFloatTimeDomainData(dst){dst.set(input)}};
  window.__test.setBuffer(buf);
  const read=(k,f1,f2)=>{
    for(let i=0;i<input.length;i++){
      const t=i/16000;
      input[i]=.18*Math.sin(2*Math.PI*145*t)
          +.09*Math.sin(2*Math.PI*f1*t)
          +.065*Math.sin(2*Math.PI*f2*t)
          +.025*Math.sin(2*Math.PI*3150*t);
    }
    processAudio(k);
    assert.ok(state.acousticFormants&&state.visualFormants,'both branches populated');
    assert.equal(state.formants,state.visualFormants,'legacy alias follows visualization');
    assert.notEqual(state.acousticFormants,state.visualFormants,'distinct measurement objects');
    return {acoustic:{...state.acousticFormants},visual:{...state.visualFormants}};
  };
  const first=read(1000,590,1600),second=read(1100,850,2400);
  assert.ok(state.sampleCount===2,'two measured frames');
  assert.notEqual(nodes.get('labRaw').textContent,'—','raw shown in lab');
  return {first,second};
}
for(const path of ['vowelscope/index.html','vowelscope/en/index.html']){
  const slow=evaluatePage(path,95),fast=evaluatePage(path,0);
  for(const k of ['f1','f2']){
    assert.ok(Math.abs(slow.second.acoustic[k]-fast.second.acoustic[k])<1e-8,
      'Raw acoustic measure must not depend on display slider');
  }
  const different=Math.abs(slow.second.visual.f2-fast.second.visual.f2)
    +Math.abs(slow.second.visual.f1-fast.second.visual.f1);
  assert.ok(different>2,'Displayed smoothed formants should respond to slider');
}
console.log('PASS: pole reconstruction and bilingual acoustic/visual separation.');
