#!/usr/bin/env node
// Phase 3b smoke: compile and exercise each research-only pole variant in the
// exact production script (not a duplicate LPC function).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {ceilingTrackingPatch} from './pole_ceiling_tracking.mjs';
import {dspExperimentPatch} from './dsp_variants.mjs';

const source=fs.readFileSync('vowelscope/index.html','utf8');
const script=source.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script,'Production inline JS missing');
const variants=[
  'pole14_fs9000_bw400','pole14_fs12000_bw400',
  'pole14_bw400_track05','pole14_bw400_track12',
  'pole14_fs12000_poly33','pole14_fs12000_poly49'
];
for(const variant of variants){
  assert.equal(dspExperimentPatch(variant),ceilingTrackingPatch(variant),
    'Runner should invoke exactly the new phase3b variant');
  const canvas=new Proxy({measureText:s=>({width:String(s).length*10})},{
    get(obj,key){return key in obj?obj[key]:()=>{}},
    set(obj,key,val){obj[key]=val;return true}
  });
  const elements=new Map();
  const make=()=>({children:[],dataset:{},style:{},textContent:'',value:'60',
    classList:{add(){},remove(){},toggle(){}},
    appendChild(child){this.children.push(child)},replaceChildren(){this.children=[]},
    getContext(){return canvas},addEventListener(){},setAttribute(){}});
  const document={
    getElementById(id){if(!elements.has(id))elements.set(id,make());return elements.get(id)},
    createElement:make
  };
  const window={location:{search:''},addEventListener(){}};
  const injected=script.replace('    requestAnimationFrame(frame);',
    dspExperimentPatch(variant) + '\nwindow.__research={preprocess,estimateFormants,state};');
  vm.runInNewContext(injected,{document,window,requestAnimationFrame(){}},
    {timeout:5000,filename:'vowelscope/index.html'});
  const {preprocess,estimateFormants,state}=window.__research;
  const input=new Float32Array(8192),fsInput=16000;
  for(let i=0;i<input.length;i++){
    const t=i/fsInput;
    input[i]=.17*Math.sin(2*Math.PI*145*t)
      +.07*Math.sin(2*Math.PI*540*t)
      +.045*Math.sin(2*Math.PI*1450*t)
      +.025*Math.sin(2*Math.PI*2790*t);
  }
  const pre=preprocess(input,fsInput);
  assert.ok(pre&&pre.y?.length===512&&pre.rms>0,'Preprocessing failed');
  const out=estimateFormants(pre.y,11025);
  assert.ok(out&&Number.isFinite(out.f1)&&Number.isFinite(out.f2),
    variant+': expected measurable vowel');
  assert.ok(out.f1>180&&out.f2>720&&out.f2<3300,variant+': frequencies out of bounds');
  if(variant.includes('track')){
    state.acousticFormants={f1:out.f1,f2:out.f2+150,f3:out.f3};
    state.lastAccepted=1000;
    const follow=estimateFormants(pre.y,11025);
    assert.ok(follow&&Number.isFinite(follow.f2),'tracking with previous frame must work');
  }
  console.log('PASS',variant,'F1='+out.f1.toFixed(1),'F2='+out.f2.toFixed(1));
}
