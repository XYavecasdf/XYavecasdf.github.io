#!/usr/bin/env node
// DEV-ONLY research audit: do near-reference F2 peaks exist in the actual
// VowelScope LPC spectrum when the estimator selects the wrong F2?
// No raw audio or token-level data is published.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function arg(name, fallback=null) {
  const idx=process.argv.indexOf(name);
  return idx>=0?process.argv[idx+1]:fallback;
}
function median(xs){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);const k=a.length>>1;return a.length%2?a[k]:(a[k-1]+a[k])/2;}
function percent(xs,q){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);return a[Math.max(0,Math.ceil(q*a.length)-1)];}
function wavRead(file){
  const b=fs.readFileSync(file);
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV');
  let spec=null,data=null;
  for(let p=12;p+8<=b.length;){
    const len=b.readUInt32LE(p+4),type=b.toString('ascii',p,p+4),at=p+8;
    if(at+len>b.length)throw Error('Truncated WAV');
    if(type==='fmt ')spec={format:b.readUInt16LE(at),channels:b.readUInt16LE(at+2),rate:b.readUInt32LE(at+4),bits:b.readUInt16LE(at+14)};
    if(type==='data')data=b.subarray(at,at+len);
    p=at+len+(len%2);
  }
  if(!spec||!data||spec.channels<1||!((spec.format===1&&spec.bits===16)||(spec.format===3&&spec.bits===32)))throw Error('Unsupported WAV');
  const per=spec.bits/8,frames=Math.floor(data.length/(per*spec.channels));
  const signal=new Float32Array(frames);
  for(let i=0;i<frames;i++){
    let mean=0;
    for(let c=0;c<spec.channels;c++){
      const offset=(i*spec.channels+c)*per;
      mean+=spec.format===1?data.readInt16LE(offset)/32768:data.readFloatLE(offset);
    }
    signal[i]=mean/spec.channels;
  }
  return {signal,sampleRate:spec.rate};
}
function engine(file){
  const html=fs.readFileSync(file,'utf8'),found=html.match(/<script>([\s\S]*?)<\/script>/);
  if(!found)throw Error('No inline page script');
  const marker='    requestAnimationFrame(frame);';
  if(!found[1].includes(marker))throw Error('Source page instrumentation marker missing');
  const script=found[1].replace(marker,'    window.__audit={preprocess,lpcSpectrum,estimateFormants,Fs};');
  const fakeCtx=new Proxy({}, {get:()=>()=>{}});
  const nodes=new Map();
  function el(){return {children:[],style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},textContent:'',value:'60',
    getContext(){return fakeCtx},addEventListener(){},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){}};}
  const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,el());return nodes.get(id)},createElement:el};
  const win={addEventListener(){}};
  vm.runInNewContext(script,{document:doc,window:win,requestAnimationFrame(){}},{timeout:3000,filename:file});
  return win.__audit;
}
function tally(xs){
  const n=xs.length;
  const errors=xs.map(x=>x.error).filter(Number.isFinite);
  const high=xs.filter(x=>x.error>300);
  const mechanisms={};
  for(const x of high)mechanisms[x.mechanism]=(mechanisms[x.mechanism]||0)+1;
  return {n,estimates:errors.length,coverage:n?errors.length/n:null,mae_hz:errors.length?errors.reduce((a,b)=>a+b,0)/errors.length:null,
    median_ae_hz:median(errors),p90_ae_hz:percent(errors,.9),errors_gt300_hz:high.length,
    errors_gt500_hz:xs.filter(x=>x.error>500).length,
    of_gt300:{...mechanisms},peak_near_truth_among_large_errors:high.filter(x=>x.nearReference).length};
}
function main(){
  const manifestPath=path.resolve(arg('--manifest')||''),page=path.resolve(arg('--page','vowelscope/index.html')),out=arg('--out');
  if(!out)throw Error('--out required');
  const man=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const samples=man.samples.filter(x=>x.split==='dev');
  if(!samples.length)throw Error('No development-split corpus rows');
  const a=engine(page),rows=[];
  for(const row of samples){
    const target=Number(row.gt_f2_hz),time=Number(row.gt_time_s);
    if(!Number.isFinite(target)||target<=0||!Number.isFinite(time))continue;
    const filename=path.resolve(path.dirname(manifestPath),row.audio_path);
    if(!filename.startsWith(path.dirname(manifestPath)+path.sep))throw Error('Audio path traversal');
    const {signal,sampleRate}=wavRead(filename);
    const buf=new Float32Array(8192),end=Math.round(time*sampleRate);
    for(let i=0;i<8192;i++){const k=end-8192+i;buf[i]=k>=0&&k<signal.length?signal[k]:0;}
    const p=a.preprocess(buf,sampleRate);
    const spectrum=p?a.lpcSpectrum(p.y,a.Fs):null;
    const peaks=[];
    if(spectrum)for(let i=2;i<spectrum.length-2;i++){
      const v=spectrum[i],base=Math.max(spectrum[i-2].power,spectrum[i+2].power);
      if(v.power>spectrum[i-1].power&&v.power>=spectrum[i+1].power&&v.power>base*1.008&&v.f>=650&&v.f<=3300)
        peaks.push(v);
    }
    const est=p?a.estimateFormants(p.y,a.Fs):null;
    const selected=est?.f2??null,err=selected===null?null:Math.abs(selected-target);
    const nearReference=peaks.some(q=>Math.abs(q.f-target)<=150);
    const mechanism=selected===null?'no_f2_estimate':
      err<=300?'within_300_hz':
      nearReference?'alternative_LPC_peak_near_reference':'no_LPC_peak_near_reference';
    rows.push({vowel:row.vowel_ipa,cohort:row.speaker_id?.[0]||'',error:err,nearReference,mechanism,peakCount:peaks.length});
  }
  const byVowel={},byCohort={};
  for(const r of rows){
    (byVowel[r.vowel]??=[]).push(r);
    (byCohort[{m:'adult_men',w:'adult_women',b:'boys',g:'girls'}[r.cohort]||'unknown']??=[]).push(r);
  }
  const output={
    kind:'dev_lpc_candidate_peak_audit',
    source:man.source,dataset_version:man.version,split:'dev',
    method:'At mean manually selected steady-state center, execute current site preprocessing, AR spectrum and peak picking on the raw 16kHz WAV. A near-reference candidate is a locally maximal LPC spectral peak within ±150 Hz of annotated F2. Large selected-F2 errors exceed 300 Hz. The single-window diagnostic is different from the multi-frame tracking benchmark.',
    note:'Diagnostic categories are descriptive, not proof of why a particular spectral peak appeared. No DSP changes deployed; no raw audio or individual records committed.',
    summary:tally(rows),
    by_vowel:Object.fromEntries(Object.entries(byVowel).map(([k,v])=>[k,tally(v)])),
    by_cohort:Object.fromEntries(Object.entries(byCohort).map(([k,v])=>[k,tally(v)]))
  };
  fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});
  fs.writeFileSync(out,JSON.stringify(output,null,2)+'\n');
  console.log('F2 peak audit: '+rows.length+' development vowel nuclei; >300 Hz errors '+output.summary.errors_gt300_hz+
    ', alternative peak near annotated F2 '+(output.summary.of_gt300.alternative_LPC_peak_near_reference||0));
}
try{main()}catch(e){console.error(e.stack||String(e));process.exitCode=1}
