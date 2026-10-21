// OFFLINE RESEARCH ONLY: isolate the classic exact-zero interpolation defect.
// The live shared DSP and both page defaults remain unchanged.
function zeroSafePreprocess(buffer,fs) {
  const Fs=11025,samples=512,raw=new Float64Array(samples),step=fs/Fs;
  const windowLen=Math.ceil(samples*step),offset=buffer.length-windowLen;
  if(offset<0)return null;
  for(let i=0;i<samples;i++) {
    const loc=offset+i*step,j=Math.floor(loc),frac=loc-j;
    const a=buffer[j]||0,b=buffer[j+1]??a;
    raw[i]=a+(b-a)*frac;
  }
  let mean=0,rms=0;
  for(let i=0;i<samples;i++)mean+=raw[i];mean/=samples;
  for(let i=0;i<samples;i++){raw[i]-=mean;rms+=raw[i]*raw[i];}
  rms=Math.sqrt(rms/samples);
  const y=new Float64Array(samples);let prev=0;
  for(let i=0;i<samples;i++) {
    const c=raw[i]-0.97*prev;prev=raw[i];
    y[i]=c*(.54-.46*Math.cos(2*Math.PI*i/(samples-1)));
  }
  return {y,raw,rms};
}

export function linearZeroSafePatch() {
  // Serialize the self-contained function into the actual page's research hook.
  return '\npreprocess='+zeroSafePreprocess.toString()+';\n';
}
