// Coefficient-level research audit. No source audio or formant estimates.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {loadPage} from './page_harness.mjs';
import {readPageSource} from './page_source.mjs';
import {dspExperimentPatch} from './dsp_variants.mjs';

const RATES=[16000,44100,48000,96000];
const BASE_VARIANTS=['pole14_fs12000_poly33','pole14_fs12000_poly49'];
const VARIANTS=[...BASE_VARIANTS,'pole14_fs12000_poly_adaptive'];
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PAGE=path.join(ROOT,'vowelscope/index.html');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');

export function responseDb(weights,frequency,sampleRate) {
  let real=0,imaginary=0;
  for(let i=0;i<weights.length;i++) {
    const angle=2*Math.PI*frequency*i/sampleRate;
    real+=weights[i]*Math.cos(angle);imaginary-=weights[i]*Math.sin(angle);
  }
  // Finite JSON output; the reporting floor is explicitly recorded below.
  return 20*Math.log10(Math.max(Math.hypot(real,imaginary),1e-15));
}

export function inspectBank(rate,variant) {
  if(!RATES.includes(rate)||!VARIANTS.includes(variant))throw Error('Unsupported fixed audit configuration');
  const patch=dspExperimentPatch(variant),marker='const weights=polyphaseCache.phases[phase];';
  if(patch.split(marker).length!==2)throw Error('Research phase-selection hook changed; update the audit');
  const hook={visited:new Set()},instrumented=patch.replace(marker,
    'window.__firAudit.visited.add(phase);\n'+marker)+
    '\nwindow.__firAudit.getBank=()=>polyphaseCache;\n';
  const {api}=loadPage(PAGE,{patch:instrumented,window:{__firAudit:hook}});
  // Zero input initializes the actual kernels and records the phases reached.
  const parsed=api.preprocess(new Float32Array(8192),rate),phases=hook.getBank()?.phases;
  if(!parsed||!Array.isArray(phases)||phases.length!==64||!phases.every(weights=>
    weights.length>0&&Array.from(weights).every(Number.isFinite)))throw Error('Invalid actual filter bank');
  return {phases,samples:parsed.raw.length,reachable:[...hook.visited].sort((a,b)=>a-b),
    dsp_patch_digest:digest(patch),instrumented_patch_digest:digest(instrumented)};
}

function envelope(bank,frequency,rate) {
  const all=bank.phases.map(weights=>responseDb(weights,frequency,rate));
  const reachable=bank.reachable.map(phase=>all[phase]);
  return {frequency_hz:frequency,all_phase_min_db:Math.min(...all),all_phase_max_db:Math.max(...all),
    reachable_min_db:Math.min(...reachable),reachable_max_db:Math.max(...reachable)};
}

export function auditResponses(variants=BASE_VARIANTS) {
  if(!Array.isArray(variants)||!variants.length||new Set(variants).size!==variants.length||
      variants.some(variant=>!VARIANTS.includes(variant)))throw Error('Invalid audit variant selection');
  const cases=[];
  for(const variant of variants)for(const inputRate of RATES) {
    const bank=inspectBank(inputRate,variant),frequencies=[0];
    for(let frequency=250;frequency<=4500;frequency+=250)frequencies.push(frequency);
    for(let frequency=6500;frequency<=inputRate/2;frequency+=250)frequencies.push(frequency);
    if(frequencies.at(-1)!==inputRate/2)frequencies.push(inputRate/2);
    const curve=frequencies.map(frequency=>envelope(bank,frequency,inputRate));
    const pass=curve.filter(row=>row.frequency_hz>=250&&row.frequency_hz<=4500);
    const stop=curve.filter(row=>row.frequency_hz>=6500);
    const passMin=Math.min(...pass.map(row=>row.reachable_min_db));
    const passMax=Math.max(...pass.map(row=>row.reachable_max_db));
    const stopMax=Math.max(...stop.map(row=>row.reachable_max_db));
    cases.push({variant,input_rate_hz:inputRate,output_rate_hz:12000,taps:bank.phases[0].length,
      samples:bank.samples,bank_phases:bank.phases.length,reachable_phase_indices:bank.reachable,
      summary_phase_scope:'reachable',
      dsp_patch_digest:bank.dsp_patch_digest,instrumented_patch_digest:bank.instrumented_patch_digest,
      sampled_pass_min_db:passMin,sampled_pass_max_db:passMax,sampled_stop_max_db:stopMax,
      pass_within_budget:passMin>=-1&&passMax<=1,stop_within_budget:stopMax<=-20,curve});
  }
  const git=(...args)=>execFileSync('git',['-C',ROOT,...args],{encoding:'utf8'}).trim();
  const source=readPageSource(PAGE);
  return {schema_version:1,kind:'polyphase_coefficient_response_audit',protocol:'sampled-fir-response-v1',
    source_commit:git('rev-parse','HEAD'),source_dirty:git('status','--porcelain').length>0,variants,
    page_digest:source.codeDigest,source_assets:source.files,node_version:process.version,
    audit_sources_sha256:Object.fromEntries(['filter_response_audit.mjs','page_harness.mjs','page_source.mjs']
      .map(name=>[name,digest(fs.readFileSync(new URL(name,import.meta.url)))])),
    budgets:{passband_hz:[250,4500],passband_gain_db:[-1,1],stopband_start_hz:6500,
      stopband_max_gain_db:-20,frequency_step_hz:250,include_input_nyquist:true,reporting_floor_db:-300},
    limitations:[
      'Sampled frequencies only; no continuous-band certification or formant-accuracy result.',
      'Uses actual normalized filter coefficients; excludes edge clamping, mean removal, pre-emphasis and LPC.',
      'Reachable phases are observed from actual 512-sample preprocessing; all 64 bank phases are reported separately.',
      'No independent recordings, final references, capture hardware or microphone latency tested.',
      'Budgets are engineering audit targets, not the mandatory acoustic accuracy thresholds.'
    ],cases};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length&&(args.length!==1||args[0]!=='--include-adaptive'))throw Error('Expected no arguments or --include-adaptive');
  console.log(JSON.stringify(auditResponses(args.length?VARIANTS:BASE_VARIANTS),null,2));
}
