// Research-only optimized polyphase sinc resampling at 12 kHz.
// No change to the deployed VowelScope pages.
import {poleResearchPatch} from './lpc_poles.mjs';

const PREPROCESS=String.raw`
    // Polyphase fractional-delay FIR. Precompute 64 phase kernels once per
    // sample-rate pair, then perform one dot product per output sample instead
    // of two convolutions + interpolation for each output sample.
    let polyphaseCache=null;
    preprocess=function(buffer,inputRate){
      const outputRate=12000,samples=__SAMPLES__,M=__HALF__;
      const step=inputRate/outputRate;
      const windowLen=Math.ceil(samples*step),offset=buffer.length-windowLen;
      if(offset<0)return null;
      const key=inputRate+'-'+outputRate+'-'+M;
      if(!polyphaseCache||polyphaseCache.key!==key){
        const phases=[],cutoff=Math.min(.45*outputRate/inputRate,.45);
        const parts=64;
        for(let n=0;n<parts;n++){
          const delay=n/parts,weights=new Float64Array(2*M+1);
          let norm=0;
          for(let k=-M;k<=M;k++){
            const diff=k-delay;
            const sinc=Math.abs(diff)<1e-12?2*cutoff:
              Math.sin(2*Math.PI*cutoff*diff)/(Math.PI*diff);
            const taper=.54+.46*Math.cos(Math.PI*k/M);
            const v=sinc*taper;
            weights[k+M]=v;norm+=v;
          }
          for(let k=0;k<weights.length;k++)weights[k]/=norm;
          phases.push(weights);
        }
        polyphaseCache={key,phases};
      }
      const raw=new Float64Array(samples),len=buffer.length;
      for(let i=0;i<samples;i++){
        const pos=offset+i*step,at=Math.floor(pos),part=pos-at;
        // Half-sample quantization is bounded to <=1/128 input samples.
        let phase=Math.round(part*64),j=at;
        if(phase===64){phase=0;j++;}
        const weights=polyphaseCache.phases[phase];
        let acc=0;
        for(let k=-M;k<=M;k++){
          const ix=Math.max(0,Math.min(len-1,j+k));
          acc+=buffer[ix]*weights[k+M];
        }
        raw[i]=acc;
      }
      let avg=0,rms=0;
      for(let i=0;i<samples;i++)avg+=raw[i];
      avg/=samples;
      for(let i=0;i<samples;i++){raw[i]-=avg;rms+=raw[i]*raw[i];}
      rms=Math.sqrt(rms/samples);
      const y=new Float64Array(samples);let previous=0;
      for(let i=0;i<samples;i++){
        const v=raw[i]-0.97*previous;previous=raw[i];
        y[i]=v*(.54-.46*Math.cos(2*Math.PI*i/(samples-1)));
      }
      return {y,raw,rms};
    };
`;

export function optimizedCeilingPatch(name){
  const config={
    pole14_fs12000_poly33:{M:16,samples:512},
    // Match the original 512/11025-second nominal window to the nearest output sample.
    pole14_fs12000_poly33_fixed_window:{M:16,samples:557},
    pole14_fs12000_poly49:{M:24,samples:512},
    pole14_fs12000_poly_adaptive:{M:'Math.max(16,Math.ceil(inputRate/2000))',samples:512}
  }[name];
  if(!config)throw Error('Unknown optimized ceiling experiment: '+name);
  let patch=poleResearchPatch('pole14_bw400');
  const marker='    estimateFormants=function(y,fs){';
  if(!patch.includes(marker))throw Error('Pole estimator structure changed');
  patch=patch.replace(marker,marker+'\n      fs=12000;');
  return patch+'\n'+PREPROCESS.replaceAll('__HALF__',String(config.M)).replaceAll('__SAMPLES__',String(config.samples));
}
