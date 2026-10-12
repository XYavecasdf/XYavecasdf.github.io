// Phase 3b research variants (not loaded by the live website).
// Ceiling variants alter the internal LPC analysis sample rate using
// anti-aliased resampling. They are NOT Praat's complete FormantPath method.
// Tracking variants choose among pole-pairs with an unsupervised continuity
// penalty, never using the corpus label or reference measurements.
import {poleResearchPatch} from './lpc_poles.mjs';

const RESAMPLE=String.raw`
  preprocess=function(buffer,inputRate){
    const samples=512, analysisRate=__FS__;
    const step=inputRate/analysisRate;
    const windowLen=Math.ceil(samples*step),offset=buffer.length-windowLen;
    if(offset<0)return null;
    // Per-tap Hamming-windowed sinc, cutoff at 90% target Nyquist.
    // For input lower than target we never create high-frequency content.
    const M=24,cutoff=Math.min(.45*analysisRate/inputRate,.45);
    const taps=new Float64Array(2*M+1);
    let norm=0;
    for(let j=-M;j<=M;j++){
      const sinc=j===0?2*cutoff:Math.sin(2*Math.PI*cutoff*j)/(Math.PI*j);
      const win=.54+.46*Math.cos(Math.PI*j/M);
      const h=sinc*win;taps[j+M]=h;norm+=h;
    }
    const lowpass=index=>{
      let acc=0;
      for(let k=-M;k<=M;k++){
        const pos=Math.max(0,Math.min(buffer.length-1,index+k));
        acc+=buffer[pos]*taps[k+M];
      }
      return acc/norm;
    };
    const raw=new Float64Array(samples);
    for(let i=0;i<samples;i++){
      const at=offset+i*step,j=Math.floor(at),frac=at-j;
      raw[i]=lowpass(j)*(1-frac)+lowpass(j+1)*frac;
    }
    let avg=0,rms=0;
    for(const x of raw)avg+=x;
    avg/=samples;
    for(let i=0;i<samples;i++){raw[i]-=avg;rms+=raw[i]*raw[i];}
    rms=Math.sqrt(rms/samples);
    const y=new Float64Array(samples);let prev=0;
    for(let i=0;i<samples;i++){
      const v=raw[i]-0.97*prev;prev=raw[i];
      y[i]=v*(.54-.46*Math.cos(2*Math.PI*i/(samples-1)));
    }
    return {y,raw,rms};
  };
`;

const TRACK_SELECT=String.raw`
      const previous=state.acousticFormants;
      const pool=[];
      const f1s=poles.filter(p=>p.f>=180&&p.f<=1020);
      for(const first of f1s){
        for(const second of poles){
          if(second.f<Math.max(720,first.f+320)||second.f>3300)continue;
          // Earliest feasible pair by default; only a credible near-by
          // alternative can win when the previous acoustic frame exists.
          const index1=poles.indexOf(first),index2=poles.indexOf(second);
          const baseCost=index1*1.5+index2*.35;
          const offset=previous&&state.lastAccepted>0
            ? Math.min(4,Math.abs(first.f-previous.f1)/300)+
              Math.min(4,Math.abs(second.f-previous.f2)/850)
            : 0;
          pool.push({first,second,cost:baseCost+__TRACK__*offset});
        }
      }
      if(!pool.length)return null;
      pool.sort((a,b)=>a.cost-b.cost);
      const {first,second}=pool[0];
      const third=poles.find(p=>p.f>=second.f+370&&p.f<=4450);
      return {f1:first.f,f2:second.f,f3:third?third.f:null};
`;

export function ceilingTrackingPatch(name){
  const options={
    pole14_fs9000_bw400:{analysisFs:9000,track:0},
    pole14_fs12000_bw400:{analysisFs:12000,track:0},
    pole14_bw400_track05:{analysisFs:11025,track:.5},
    pole14_bw400_track12:{analysisFs:11025,track:1.2}
  };
  const option=options[name];
  if(!option)throw Error('Unknown research variant '+name);
  let patch=poleResearchPatch('pole14_bw400');
  if(option.analysisFs!==11025){
    // Every frame is preprocessed into a frame of the new analysis rate.
    // processAudio still passes the old Fs constant, hence we override only
    // the pole-analysis argument; the live source remains entirely unchanged.
    const original='    estimateFormants=function(y,fs){';
    if(!patch.includes(original))throw Error('Pole patch interface changed');
    patch=patch.replace(original,
      original+'\n      fs='+option.analysisFs+';');
    patch+= '\n'+RESAMPLE.replaceAll('__FS__',String(option.analysisFs));
  }
  if(option.track){
    const original=String.raw`
      const first=poles.find(p=>p.f>=180&&p.f<=1100);
      if(!first||first.f>1020)return null;
      const second=poles.find(p=>p.f>=Math.max(720,first.f+320)&&p.f<=3300);
      if(!second)return null;
      const third=poles.find(p=>p.f>=second.f+370&&p.f<=4450);
      return {f1:first.f,f2:second.f,f3:third?third.f:null};`;
    if(!patch.includes(original))throw Error('Pole candidate block changed');
    patch=patch.replace(original,TRACK_SELECT.replaceAll('__TRACK__',String(option.track)));
  }
  return patch;
}
