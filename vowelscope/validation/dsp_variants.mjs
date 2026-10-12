import {peakExperimentPatch} from './peak_variants.mjs';
import {guardPeakPatch} from './peak_guard.mjs';
import {temporalPatch} from './temporal_variants.mjs';
import {poleResearchPatch} from './lpc_poles.mjs';
import {ceilingTrackingPatch} from './pole_ceiling_tracking.mjs';
// OFFLINE RESEARCH ONLY. Do not include this file in the live webpage.
// Inject only the variant transforms; the remaining speech pipeline runs the
// unchanged production VowelScope JavaScript code.
export function dspExperimentPatch(name) {
  if (name === 'original') return '';
  if (['peak_prominence','peak_bandwidth','peak_tracking'].includes(name)) return peakExperimentPatch(name);
  if (['peak_guard','peak_guard_strict'].includes(name)) return guardPeakPatch(name);
  if (['median3','median5'].includes(name)) return temporalPatch(name);
  if (['pole14_bw700','pole14_bw400','pole16_bw700'].includes(name)) return poleResearchPatch(name);
  if (['pole14_fs9000_bw400','pole14_fs12000_bw400','pole14_bw400_track05','pole14_bw400_track12'].includes(name)) return ceilingTrackingPatch(name);
  if (!['antialias','burg','burg_antialias'].includes(name))
    throw Error('Unknown DSP research variant: '+name);
  const antialias = "\n    // Research: FIR low-pass (33 taps) prior to 11.025kHz downsampling.\n    preprocess=function(buffer,fs){\n      const samples=512,step=fs/Fs,windowLen=Math.ceil(samples*step),offset=buffer.length-windowLen;\n      if(offset<0)return null;\n      const M=16,fc=Math.min(.45*Fs/fs,.46),h=new Float64Array(2*M+1);\n      let norm=0;\n      for(let n=-M;n<=M;n++){\n        const sinc=n===0?2*fc:Math.sin(2*Math.PI*fc*n)/(Math.PI*n);\n        const win=.54+.46*Math.cos(Math.PI*n/M);\n        h[n+M]=sinc*win;norm+=h[n+M];\n      }\n      const filtered=(j)=>{\n        let v=0;\n        for(let k=-M;k<=M;k++){\n          const pos=Math.min(buffer.length-1,Math.max(0,j+k));\n          v+=buffer[pos]*h[k+M];\n        }\n        return v/norm;\n      };\n      const raw=new Float64Array(samples);\n      for(let i=0;i<samples;i++){\n        const loc=offset+i*step,j=Math.floor(loc),frac=loc-j;\n        raw[i]=(1-frac)*filtered(j)+frac*filtered(j+1);\n      }\n      let mean=0,rms=0;\n      for(let i=0;i<samples;i++)mean+=raw[i];mean/=samples;\n      for(let i=0;i<samples;i++){raw[i]-=mean;rms+=raw[i]*raw[i];}\n      rms=Math.sqrt(rms/samples);\n      const y=new Float64Array(samples);let prev=0;\n      for(let i=0;i<samples;i++){\n        const v=raw[i]-0.97*prev;prev=raw[i];\n        y[i]=v*(.54-.46*Math.cos(2*Math.PI*i/(samples-1)));\n      }\n      return {y,raw,rms};\n    };";
  const burg = "\n    // Research: Burg AR model, order 14; not Praat's complete algorithm.\n    function experimentalBurg(y,order){\n      let ef=Float64Array.from(y.slice(1));\n      let eb=Float64Array.from(y.slice(0,y.length-1));\n      let a=new Float64Array(order+1);a[0]=1;\n      for(let m=1;m<=order;m++){\n        let num=0,den=0;\n        for(let k=0;k<ef.length;k++){num+=ef[k]*eb[k];den+=ef[k]*ef[k]+eb[k]*eb[k];}\n        if(den<1e-15)return null;\n        const reflection=-2*num/den;\n        if(!Number.isFinite(reflection)||Math.abs(reflection)>=.999999)return null;\n        const next=a.slice();next[m]=reflection;\n        for(let k=1;k<m;k++)next[k]=a[k]+reflection*a[m-k];\n        a=next;\n        if(m<order){\n          const nf=new Float64Array(ef.length-1),nb=new Float64Array(ef.length-1);\n          for(let k=0;k<nf.length;k++){\n            nf[k]=ef[k+1]+reflection*eb[k+1];\n            nb[k]=eb[k]+reflection*ef[k];\n          }\n          ef=nf;eb=nb;\n        }\n      }\n      return a;\n    }\n    lpcSpectrum=function(y,fs){\n      const a=experimentalBurg(y,14);if(!a)return null;\n      const step=12.5,amplitudes=[];\n      for(let f=100;f<=4500;f+=step){\n        let real=1,imag=0;const w=2*Math.PI*f/fs;\n        for(let k=1;k<a.length;k++){real+=a[k]*Math.cos(w*k);imag-=a[k]*Math.sin(w*k);}\n        amplitudes.push({f,power:1/Math.max(real*real+imag*imag,1e-12)});\n      }\n      return amplitudes;\n    };";
  return (name.includes('antialias') ? antialias : '') + (name.includes('burg') ? burg : '');
}
