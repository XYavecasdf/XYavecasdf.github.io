// Shared production acoustic functions. Loaded directly by both static locales.
// Classic numerical behavior is preserved, including historical interpolation.
(function(root){
  'use strict';
  const Fs=11025;
    function preprocess(buffer,fs){const samples=512,raw=new Float64Array(samples),step=fs/Fs,windowLen=Math.ceil(samples*step),offset=buffer.length-windowLen;if(offset<0)return null;
      for(let i=0;i<samples;i++){const loc=offset+i*step,j=Math.floor(loc),frac=loc-j;let a=buffer[j]||0,b=buffer[j+1]||a;raw[i]=a+(b-a)*frac;}
      let mean=0,rms=0;for(let i=0;i<samples;i++)mean+=raw[i];mean/=samples;for(let i=0;i<samples;i++){raw[i]-=mean;rms+=raw[i]*raw[i];}rms=Math.sqrt(rms/samples);
      const y=new Float64Array(samples);let prev=0;for(let i=0;i<samples;i++){const c=raw[i]-0.97*prev;prev=raw[i];y[i]=c*(.54-.46*Math.cos(2*Math.PI*i/(samples-1)));}
      return {y,raw,rms};
    }
    function levinsonDurbin(r,order){const a=new Float64Array(order+1);a[0]=1;let error=r[0];if(error<1e-13)return null;
      for(let p=1;p<=order;p++){let acc=r[p];for(let k=1;k<p;k++)acc+=a[k]*r[p-k];const reflection=-acc/error;if(!Number.isFinite(reflection)||Math.abs(reflection)>=0.999)return null;
        const next=a.slice();for(let k=1;k<p;k++)next[k]=a[k]+reflection*a[p-k];next[p]=reflection;for(let k=1;k<=p;k++)a[k]=next[k];error*=1-reflection*reflection;if(error<=1e-14)return null;}
      return a;
    }
    function lpcSpectrum(y,fs){const order=14,r=new Float64Array(order+1);
      for(let lag=0;lag<=order;lag++){let sum=0;for(let i=lag;i<y.length;i++)sum+=y[i]*y[i-lag];r[lag]=sum;}r[0]*=1.0001;
      const a=levinsonDurbin(r,order);if(!a)return null;
      const step=12.5,min=100,max=4500,amplitudes=[];
      for(let f=min;f<=max;f+=step){let real=1,imag=0;const w=2*Math.PI*f/fs;for(let k=1;k<a.length;k++){real+=a[k]*Math.cos(w*k);imag-=a[k]*Math.sin(w*k);}amplitudes.push({f,power:1/Math.max(real*real+imag*imag,1e-12)});}
      return amplitudes;
    }
    function estimateFormants(y,fs,spectrumFunction=lpcSpectrum){const spectrum=spectrumFunction(y,fs);if(!spectrum)return null;const peaks=[];
      for(let i=2;i<spectrum.length-2;i++){if(spectrum[i].power>spectrum[i-1].power&&spectrum[i].power>=spectrum[i+1].power){
        const p=spectrum[i];const base=Math.max(spectrum[i-2].power,spectrum[i+2].power);if(p.power>base*1.008)peaks.push(p);
      }}
      const first=peaks.find(p=>p.f>=180&&p.f<=1100);if(!first)return null;
      const second=peaks.find(p=>p.f>=Math.max(650,first.f+320)&&p.f<=3300);if(!second)return null;
      const third=peaks.find(p=>p.f>=second.f+370&&p.f<=4450);
      if(second.f<720||first.f>1020)return null;
      return {f1:first.f,f2:second.f,f3:third?third.f:null};
    }
    // Voiced-vowel guard: normalized short-lag autocorrelation distinguishes
    // quasi-periodic voiced segments from unvoiced consonant noise.
    // 512 samples at 11.025 kHz = ~46 ms; not a phoneme recognizer.
    function voicedEvidence(raw,fs){
      let crossings=0,total=0;
      for(let i=0;i<raw.length;i++){
        total+=raw[i]*raw[i];
        if(i>0&&((raw[i]>=0)!==(raw[i-1]>=0)))crossings++;
      }
      if(total<1e-8)return {voiced:false,periodicity:0,zcr:0};
      const zcr=crossings/(raw.length-1);
      // High zero-crossing density is characteristic of /s, ʃ, f/ etc.
      if(zcr>0.22)return {voiced:false,periodicity:0,zcr};
      let best=0;
      const minLag=Math.ceil(fs/480),maxLag=Math.min(Math.floor(fs/75),Math.floor(raw.length/2.4));
      for(let lag=minLag;lag<=maxLag;lag++){
        let corr=0,e1=0,e2=0;
        for(let i=0;i<raw.length-lag;i++){const a=raw[i],b=raw[i+lag];corr+=a*b;e1+=a*a;e2+=b*b;}
        if(e1>1e-10&&e2>1e-10)best=Math.max(best,corr/Math.sqrt(e1*e2));
      }
      return {voiced:best>=0.56,periodicity:best,zcr};
    }

  function smoothFormants(accepted,previous,slider){
    const visual={...accepted};
    if(previous){
      const amount=.08+(100-Number(slider))*.006;
      for(const key of ['f1','f2','f3']){
        if(visual[key]!=null&&previous[key]!=null){
          visual[key]=amount*visual[key]+(1-amount)*previous[key];
        }
      }
    }
    return visual;
  }
  root.VowelScopeDSP=Object.freeze({preprocess,levinsonDurbin,lpcSpectrum,
    estimateFormants,voicedEvidence,smoothFormants});
})(globalThis);
