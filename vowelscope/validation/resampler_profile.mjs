// Synthetic host analysis profile. No hardware, references or accuracy claims.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadPage} from './page_harness.mjs';
import {readPageSource} from './page_source.mjs';
import {dspExperimentPatch} from './dsp_variants.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PAGE=path.join(ROOT,'vowelscope/index.html');
const RATES=[16000,44100,48000,96000];
const VARIANTS=['pole14_fs12000_poly33','pole14_fs12000_poly_adaptive'];
const COMPONENTS=[[145,.17],[540,.07],[1450,.045],[2790,.025]];
const TIMER='performance.now() wall-clock elapsed milliseconds; includes scheduling and GC';
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');

export function profileCase(rate,variant,warmFrames=200,warmupFrames=20) {
  if(!RATES.includes(rate)||!VARIANTS.includes(variant)||!Number.isInteger(warmFrames)||warmFrames<1||
      !Number.isInteger(warmupFrames)||warmupFrames<0)throw Error('Invalid profile configuration');
  const patch=dspExperimentPatch(variant),{api}=loadPage(PAGE,{patch});
  const input=Float32Array.from({length:8192},(_,i)=>COMPONENTS.reduce((sum,[frequency,amplitude])=>
    sum+amplitude*Math.sin(2*Math.PI*frequency*i/rate),0));
  Object.assign(api.state,{running:true,mode:'classic',ctx:{sampleRate:rate},
    analyser:{getFloatTimeDomainData(destination){destination.set(input);}}});
  api.setBuffer(new Float32Array(8192));
  let now=925;
  const measure=()=>{
    now+=75;
    const acceptedBefore=api.state.sampleCount,start=performance.now();
    api.processAudio(now);
    const ms=performance.now()-start;
    return {ms,processed:api.state.lastProcess===now,accepted:api.state.sampleCount>acceptedBefore};
  };
  const cold=measure();
  for(let i=0;i<warmupFrames;i++)measure();
  const warm=Array.from({length:warmFrames},measure),sorted=warm.map(row=>row.ms).sort((a,b)=>a-b);
  const percentile=probability=>sorted[Math.ceil(probability*sorted.length)-1];
  const p95=percentile(.95),processed=warm.filter(row=>row.processed).length;
  return {variant,input_rate_hz:rate,processing_hop_ms:75,warmup_frames:warmupFrames,
    dsp_patch_digest:digest(patch),timer:TIMER,cold_elapsed_ms:cold.ms,cold_processed:cold.processed,cold_accepted:cold.accepted,
    warm:{samples:warmFrames,processed_frames:processed,accepted_frames:warm.filter(row=>row.accepted).length,
      mean_ms:sorted.reduce((sum,value)=>sum+value,0)/sorted.length,median_ms:percentile(.5),
      p95_ms:p95,p99_ms:percentile(.99),max_ms:sorted.at(-1),
      overruns_gt_hop:warm.filter(row=>row.ms>75).length,p95_within_hop_budget:processed===warmFrames&&p95<75}};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.length!==2)throw Error('This frozen profile takes no arguments');
  const cases=VARIANTS.flatMap(variant=>RATES.map(rate=>profileCase(rate,variant)));
  const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{encoding:'utf8'}).trim();
  const source=readPageSource(PAGE);
  console.log(JSON.stringify({schema_version:1,kind:'node_vm_resampler_profile',protocol:'cold1-warmup20-timed200-v1',
    source_commit:git('rev-parse','HEAD'),source_dirty:git('status','--porcelain').length>0,
    page_digest:source.codeDigest,source_assets:source.files,node_version:process.version,
    host:{platform:process.platform,architecture:process.arch,cpu_model:os.cpus()[0]?.model??null},
    profile_sources_sha256:Object.fromEntries(['resampler_profile.mjs','page_harness.mjs','page_source.mjs']
      .map(name=>[name,digest(fs.readFileSync(new URL(name,import.meta.url)))])),
    stimulus:{kind:'stationary synthetic multitone',buffer_samples:8192,components_hz_amplitude:COMPONENTS,
      no_acoustic_references:true},
    timer:TIMER,percentile_method:'Nearest rank; every timed call retained',
    limitations:[
      'One host run; cold/warm JIT behavior and host load prevent a general performance claim.',
      'Measures actual processAudio on a mocked page, excluding page setup, capture and actual rendering/scheduling.',
      'Input is stationary synthetic audio, not speech accuracy or independent detection coverage.',
      '75-ms timestamps are simulated; this is not an input-to-display latency or delayed/dropped-hop test.',
      'Mobile/desktop physical devices and browser audio processing remain untested.'
    ],cases},null,2));
}
