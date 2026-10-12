#!/usr/bin/env node
// VowelScope offline benchmark: executes the actual in-page DSP via a mocked
// WebAudio input. It does not use a separate implementation of the estimator.
// Node.js 20+. Inputs must be legally acquired locally; no corpus is fetched.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {dspExperimentPatch} from './dsp_variants.mjs';

function fail(message) { throw Error(message); }
function parseArgs(argv) {
  const args = { mode: 'classic', split: 'test', dspVariant: 'original', page: path.resolve('vowelscope/index.html') };
  for (let i=0; i<argv.length; i++) {
    const a=argv[i];
    if(a==='--help') { console.log('Usage: node vowelscope/validation/benchmark.mjs --manifest /path/to/manifest.json [--page vowelscope/index.html] [--mode classic|stable] [--out report.json] [--split test|train|dev|all] [--self-test] [--oracle-only] [--dsp-variant original|antialias|burg|burg_antialias|peak_prominence|peak_bandwidth|peak_tracking|peak_guard|peak_guard_strict]'); process.exit(0); }
    if(a==='--self-test') args.selfTest=true;
    else if(a==='--oracle-only') args.oracleOnly=true;
    else if(['--manifest','--page','--mode','--out','--split','--dsp-variant'].includes(a)) args[a==='--dsp-variant'?'dspVariant':a.slice(2)]=argv[++i];
    else fail('Unknown argument: '+a);
  }
  if(!args.selfTest&&!args.manifest)fail('A --manifest file is required.');
  if(!['classic','stable'].includes(args.mode))fail('Invalid --mode.');
  if(!['test','train','dev','all'].includes(args.split))fail('Invalid --split.');
  if(!['original','antialias','burg','burg_antialias','peak_prominence','peak_bandwidth','peak_tracking','peak_guard','peak_guard_strict'].includes(args.dspVariant))fail('Invalid DSP experiment.');
  return args;
}
function loadWav(filename) {
  const b=fs.readFileSync(filename);
  if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')fail('Not a RIFF/WAVE file: '+filename);
  let fmt=null, audio=null;
  for(let p=12;p+8<=b.length;){
    const tag=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4),at=p+8;
    if(at+n>b.length)fail('Truncated WAV chunk: '+filename);
    if(tag==='fmt '){fmt={format:b.readUInt16LE(at),channels:b.readUInt16LE(at+2),rate:b.readUInt32LE(at+4),bits:b.readUInt16LE(at+14)};}
    if(tag==='data')audio=b.subarray(at,at+n);
    p=at+n+(n%2);
  }
  if(!fmt||!audio||fmt.rate<11025||fmt.channels<1)fail('Unsupported/empty WAV, or sample rate < 11025 Hz: '+filename);
  if(!((fmt.format===1&&fmt.bits===16)||(fmt.format===3&&fmt.bits===32)))fail('Convert to PCM16 or float32 WAV first: '+filename);
  const bytes=fmt.bits/8,frames=Math.floor(audio.length/(bytes*fmt.channels));
  const samples=new Float32Array(frames);
  for(let i=0;i<frames;i++){
    let total=0;
    for(let ch=0;ch<fmt.channels;ch++){
      const offset=(i*fmt.channels+ch)*bytes;
      total+=fmt.format===1?audio.readInt16LE(offset)/32768:audio.readFloatLE(offset);
    }
    samples[i]=total/fmt.channels;
  }
  return {rate:fmt.rate,samples,duration:frames/fmt.rate};
}
function createEngine(htmlPath,variant='original') {
  const html=fs.readFileSync(htmlPath,'utf8');
  const match=html.match(/<script>([\s\S]*?)<\/script>/);
  if(!match)fail('Inline VowelScope script not found: '+htmlPath);
  const marker='    requestAnimationFrame(frame);';
  if(!match[1].includes(marker))fail('VowelScope script changed; update benchmark instrumentation.');
  const js=match[1].replace(marker,dspExperimentPatch(variant)+"\n"+
    "    window.__vsBench = {state,processAudio,nearestVowel,symbols:VOWELS.map(v=>v.symbol),setBuffer(buf){audioBuffer=buf}};");
  const ctx=new Proxy({measureText:s=>({width:String(s).length*13})},
    {get(t,k){return k in t?t[k]:(()=>{})},set(t,k,v){t[k]=v;return true}});
  const nodes=new Map();
  const make=(tag)=>({tag,dataset:{},style:{},children:[],value:'60',
    textContent:'',classList:{add(){},remove(){},toggle(){}},
    setAttribute(k,v){this[k]=v},addEventListener(){},getContext(){return ctx},
    appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]}});
  const document={getElementById(id){if(!nodes.has(id))nodes.set(id,make(id));return nodes.get(id);},createElement:make};
  const window={addEventListener(){}};
  vm.runInNewContext(js,{document,window,requestAnimationFrame(){}},{timeout:3000,filename:htmlPath});
  if(!window.__vsBench)fail('Unable to instrument source.');
  return {api:window.__vsBench,nodes};
}
function median(xs) {
  if(!xs.length)return null;
  const a=[...xs].sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function percentile(xs,p){if(!xs.length)return null;const a=[...xs].sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.ceil(p*a.length)-1)];}
function numeric(x){return x===null||x===undefined||x===''?null:Number(x);}
function safeAudioPath(root,relative) {
  if(typeof relative!=='string'||path.isAbsolute(relative))fail('audio_path must be relative');
  const base=path.resolve(root),full=path.resolve(base,relative);
  if(!full.startsWith(base+path.sep))fail('Audio path escapes dataset root: '+relative);
  return full;
}
function analyzeRow(row,manifestDir,mode,page,variant='original') {
  const audioFile=safeAudioPath(manifestDir,row.audio_path);
  const wav=loadWav(audioFile);
  const t0=Number(row.start_s),t1=Number(row.end_s);
  if(!Number.isFinite(t0)||!Number.isFinite(t1)||t0<0||t1<=t0||t1>wav.duration+0.002)
    fail('Invalid vowel start/end for '+row.audio_path);
  const {api,nodes}=createEngine(page,variant);
  const buffer=new Float32Array(8192);
  let currentT=0;
  api.state.mode=mode;api.state.running=true;
  api.state.ctx={sampleRate:wav.rate};
  api.state.analyser={getFloatTimeDomainData(dst){
    const end=Math.round(currentT*wav.rate);
    for(let i=0;i<dst.length;i++){const k=end-dst.length+i;dst[i]=k>=0&&k<wav.samples.length?wav.samples[k]:0;}
  }};
  api.setBuffer(buffer);
  const gtTime=numeric(row.gt_time_s);
  const middle=gtTime!==null?gtTime:(t0+t1)/2;
  if(middle<t0||middle>t1)fail('gt_time_s outside annotated vowel for '+row.audio_path);
  const span=t1-t0;
  // Measured at the stable nucleus; include a short lead-in so the tracker
  // reaches the nucleus normally (rather than being initialised at the target).
  const collectStart=Math.max(t0,middle-Math.min(0.075,span*0.24));
  const collectEnd=Math.min(t1,middle+Math.min(0.075,span*0.24));
  const scanStart=Math.max(0,t0-0.18);
  const frames=[];
  for(let t=scanStart;t<=collectEnd+0.001;t+=0.075){
    currentT=t;
    const previous=api.state.sampleCount;
    api.processAudio(1000+Math.round(t*1000));
    const f=api.state.formants;
    if(t>=collectStart-1e-6&&f&&api.state.sampleCount>previous){
      frames.push({f1:f.f1,f2:f.f2,f3:f.f3,ipa:nodes.get('ipaSymbol')?.textContent||''});
    }
  }
  const pred=frames.length?{
    f1:median(frames.map(x=>x.f1)),f2:median(frames.map(x=>x.f2)),
    f3:median(frames.map(x=>x.f3).filter(x=>Number.isFinite(x))),
    ipa:frames[frames.length-1].ipa}:null;
  const gtF1=numeric(row.gt_f1_hz),gtF2=numeric(row.gt_f2_hz);
  const validLabel=typeof row.vowel_ipa==='string'&&api.symbols.includes(row.vowel_ipa);
  const maeF1=pred&&gtF1!==null?Math.abs(pred.f1-gtF1):null;
  const maeF2=pred&&gtF2!==null?Math.abs(pred.f2-gtF2):null;
  return {audio_path:row.audio_path,start_s:t0,end_s:t1,source:row.source||'',language:row.language||'',
    speaker_id:row.speaker_id||'',split:row.split||'test',vowel_ipa:row.vowel_ipa||'',gt_f0_hz:numeric(row.gt_f0_hz),
    detected:!!pred,frames:frames.length,estimated:pred,reference:{f1:gtF1,f2:gtF2},
    error:{f1_abs_hz:maeF1,f2_abs_hz:maeF2},
    predicted_ipa:pred?.ipa||null,
    label_match:validLabel?(pred?pred.ipa===row.vowel_ipa:false):null};
}
function summarize(rows,mode){
  const n=rows.length,detected=rows.filter(x=>x.detected);
  const paired=rows.filter(x=>x.detected&&x.error.f1_abs_hz!==null&&x.error.f2_abs_hz!==null);
  const labeled=rows.filter(x=>x.label_match!==null);
  const a1=paired.map(x=>x.error.f1_abs_hz),a2=paired.map(x=>x.error.f2_abs_hz);
  const groups={},speakers={},vowels={};
  for(const r of rows){
    const lang=r.language||'unspecified',speaker=r.speaker_id||'unspecified',vowel=r.vowel_ipa||'unspecified';
    (groups[lang]??=[]).push(r);(speakers[speaker]??=[]).push(r);(vowels[vowel]??=[]).push(r);
  }
  const groupStats=items=>{
    const available=items.filter(x=>x.detected);
    const pairs=items.filter(x=>x.error.f1_abs_hz!==null&&x.error.f2_abs_hz!==null);
    return {n:items.length,coverage:available.length/items.length,
      acoustic_pairs:pairs.length,
      mae_f1_hz:pairs.length?pairs.reduce((a,x)=>a+x.error.f1_abs_hz,0)/pairs.length:null,
      mae_f2_hz:pairs.length?pairs.reduce((a,x)=>a+x.error.f2_abs_hz,0)/pairs.length:null};
  };
  const matrix={};
  for(const r of labeled){const actual=r.vowel_ipa;matrix[actual]??={};const predicted=r.predicted_ipa||'(miss)';matrix[actual][predicted]=(matrix[actual][predicted]||0)+1;}
  return {mode,n,detected:detected.length,coverage:n?detected.length/n:null,
    acoustic_pairs:paired.length,mae_f1_hz:a1.length?a1.reduce((a,b)=>a+b,0)/a1.length:null,
    mae_f2_hz:a2.length?a2.reduce((a,b)=>a+b,0)/a2.length:null,
    median_ae_f1_hz:median(a1),median_ae_f2_hz:median(a2),
    p90_ae_f1_hz:percentile(a1,.9),p90_ae_f2_hz:percentile(a2,.9),
    label_examples:labeled.length,top1_on_all_labeled:labeled.length?labeled.filter(x=>x.label_match).length/labeled.length:null,
    top1_on_detected:labeled.filter(x=>x.detected).length?labeled.filter(x=>x.label_match).length/labeled.filter(x=>x.detected).length:null,
    by_language:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,groupStats(v)])),
    by_speaker:Object.fromEntries(Object.entries(speakers).map(([k,v])=>[k,groupStats(v)])),
    by_vowel:Object.fromEntries(Object.entries(vowels).map(([k,v])=>[k,groupStats(v)])),
    confusion:matrix};
}
function main(){
  const args=parseArgs(process.argv.slice(2));
  if(args.selfTest){
    const {api}=createEngine(args.page);
    const a=api.nearestVowel(280,2350).vowel.symbol;
    if(a!=='i')fail('Smoke failed: reference /i/ mapped to '+a);
    console.log('SMOKE PASS: actual VowelScope source loads and /i/ reference lookup works. Not an acoustic accuracy test.');
    return;
  }
  const mf=path.resolve(args.manifest),page=path.resolve(args.page);
  const manifest=JSON.parse(fs.readFileSync(mf,'utf8'));
  if(!Array.isArray(manifest.samples)||!manifest.samples.length)fail('manifest.samples must contain labeled vowel instances.');
  const selected=manifest.samples.filter(r=>args.split==='all'||(r.split||'test')===args.split);
  if(!selected.length)fail('No samples in the '+args.split+' split; use --split all to inspect the full corpus.');
  if(args.oracleOnly){
    // Oracle: skip all waveform estimation and pass the original corpus F1/F2
    // into precisely the page's current nearest-reference classifier.
    const {api}=createEngine(page);
    const results=selected.map(row=>{
      const f1=numeric(row.gt_f1_hz),f2=numeric(row.gt_f2_hz);
      const valid=Number.isFinite(f1)&&f1>0&&Number.isFinite(f2)&&f2>0;
      const predicted=valid?api.nearestVowel(f1,f2).vowel.symbol:null;
      const label=api.symbols.includes(row.vowel_ipa)?row.vowel_ipa:null;
      return {
        audio_path:row.audio_path,start_s:row.start_s,end_s:row.end_s,
        vowel_ipa:row.vowel_ipa||'',
        speaker_id:row.speaker_id||'',language:row.language||'',
        gt_f0_hz:numeric(row.gt_f0_hz),
        reference:{f1:f1,f2:f2},
        oracle_ipa:predicted, label_match:label?(valid?predicted===label:null):null
      };
    });
    const labeled=results.filter(r=>r.label_match!==null);
    const confusion={},byVowel={};
    for(const r of labeled){
      const truth=r.vowel_ipa,pred=r.oracle_ipa;
      confusion[truth]??={};confusion[truth][pred]=(confusion[truth][pred]||0)+1;
      const x=byVowel[truth]??={n:0,correct:0};x.n++;if(r.label_match)x.correct++;
    }
    const report={schema_version:1,kind:'oracle_reference_formants',
      source:manifest.source||'unspecified',dataset_version:manifest.version||'unspecified',
      split:args.split,source_html:path.relative(process.cwd(),page),
      description:'Actual page classifier applied to source annotated F1/F2, bypassing LPC; not a phoneme recognizer.',
      summary:{n:results.length,comparable:labeled.length,
        correct:labeled.filter(r=>r.label_match).length,
        exact_symbol_accuracy:labeled.length?labeled.filter(r=>r.label_match).length/labeled.length:null,
        by_vowel:Object.fromEntries(Object.entries(byVowel).map(([k,v])=>[k,{...v,accuracy:v.correct/v.n}])),
        confusion},
      results};
    const content=JSON.stringify(report,null,2);
    if(args.out){fs.mkdirSync(path.dirname(path.resolve(args.out)),{recursive:true});fs.writeFileSync(args.out,content+'\n');console.log('Oracle: '+report.summary.correct+'/'+labeled.length+' comparable labels. Saved '+args.out);}
    else console.log(content);
    return;
  }
  const results=[];
  for(const row of selected){
    try{results.push(analyzeRow(row,path.dirname(mf),args.mode,page,args.dspVariant));}
    catch(e){fail('Failed on '+(row.audio_path||'?')+': '+e.message);}
  }
  const report={schema_version:1,source:manifest.source||'unspecified',dataset_version:manifest.version||'unspecified',
    checked_at:new Date().toISOString(),source_html:path.relative(process.cwd(),page),split:args.split,dsp_variant:args.dspVariant,summary:summarize(results,args.mode),results};
  const content=JSON.stringify(report,null,2);
  if(args.out){fs.mkdirSync(path.dirname(path.resolve(args.out)),{recursive:true});fs.writeFileSync(args.out,content+'\n');}
  else console.log(content);
  if(args.out)console.log('Saved '+args.out+' | coverage '+(100*report.summary.coverage).toFixed(1)+'% | paired '+report.summary.acoustic_pairs+'/'+results.length);
}
try{main()}catch(e){console.error('ERROR: '+e.message);process.exitCode=1}
