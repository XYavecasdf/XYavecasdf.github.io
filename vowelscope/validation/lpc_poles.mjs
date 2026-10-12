// Phase 3: isolated LPC polynomial-root prototype for offline research.
// No GPL code is copied. Durand–Kerner is a general numerical algorithm.
// Complex roots of z^p+a1*z^(p-1)+...+ap give center frequencies and
// bandwidths. Not a replica of Praat's formant analysis implementation.
export function cMul(a,b){return [a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];}
export function cDiv(a,b){const d=b[0]*b[0]+b[1]*b[1];return d>1e-28?[(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d]:null;}
export function polyAt(coefficients,z){
  let val=[coefficients[0],0];
  for(let j=1;j<coefficients.length;j++){
    val=cMul(val,z);val[0]+=coefficients[j];
  }
  return val;
}
export function rootsDurandKerner(coefficients,maxIterations=180){
  const n=coefficients.length-1;
  if(n<1||coefficients[0]!==1||coefficients.some(x=>!Number.isFinite(x)))return null;
  // Rotated circular seed avoids conjugate/real-axis degeneracy.
  let roots=Array.from({length:n},(_,j)=>[
    .91*Math.cos(2*Math.PI*(j+.29)/n),
    .91*Math.sin(2*Math.PI*(j+.29)/n)
  ]);
  let converged=false;
  for(let iteration=0;iteration<maxIterations;iteration++){
    const next=[],updates=[];
    for(let i=0;i<n;i++){
      const zi=roots[i];
      let denominator=[1,0];
      for(let j=0;j<n;j++)if(j!==i){
        denominator=cMul(denominator,[zi[0]-roots[j][0],zi[1]-roots[j][1]]);
      }
      let correction=cDiv(polyAt(coefficients,zi),denominator);
      if(!correction)return null;
      const norm=Math.hypot(correction[0],correction[1]);
      if(!Number.isFinite(norm))return null;
      // Bounded steps reduce numerical explosion when initial guesses cluster.
      if(norm>.45){correction=[correction[0]*.45/norm,correction[1]*.45/norm];}
      next.push([zi[0]-correction[0],zi[1]-correction[1]]);
      updates.push(Math.min(norm,.45));
    }
    roots=next;
    if(Math.max(...updates)<1e-8){converged=true;break;}
  }
  if(!converged)return null;
  const residual=Math.max(...roots.map(z=>Math.hypot(...polyAt(coefficients,z))));
  if(!Number.isFinite(residual)||residual>3e-5)return null;
  return roots;
}
export function polesToFormants(coefficients,fs,bandwidthCeiling=700){
  const roots=rootsDurandKerner(coefficients);
  if(!roots)return null;
  return roots.map(root=>{
    const radius=Math.hypot(root[0],root[1]);
    const angle=Math.atan2(root[1],root[0]);
    const freq=fs*angle/(2*Math.PI);
    const bw=-(fs/Math.PI)*Math.log(radius);
    return {f:freq,bw,radius};
  }).filter(v=>Number.isFinite(v.f)&&Number.isFinite(v.bw)&&
    v.f>=100&&v.f<Math.min(4450,fs/2)&&v.bw>0&&v.bw<=bandwidthCeiling&&v.radius<1)
    .sort((a,b)=>a.f-b.f);
}
export function poleResearchPatch(name){
  const params={
    pole14_bw700:{order:14,bw:700},
    pole14_bw400:{order:14,bw:400},
    pole16_bw700:{order:16,bw:700}
  }[name];
  if(!params)throw Error('Unsupported pole research variant '+name);
  const declarations=[cMul,cDiv,polyAt,rootsDurandKerner,polesToFormants]
    .map(f=>f.toString()).join('\n');
  return declarations + '\n'+String.raw`
    // Experimental pole-derived F1/F2/F3; no reference labels in algorithm.
    estimateFormants=function(y,fs){
      const order=__ORDER__,r=new Float64Array(order+1);
      for(let lag=0;lag<=order;lag++){
        let sum=0;for(let i=lag;i<y.length;i++)sum+=y[i]*y[i-lag];
        r[lag]=sum;
      }
      r[0]*=1.0001;
      const ar=levinsonDurbin(r,order);
      if(!ar)return null;
      const poles=polesToFormants(ar,fs,__BW__);
      if(!poles)return null;
      const first=poles.find(p=>p.f>=180&&p.f<=1100);
      if(!first||first.f>1020)return null;
      const second=poles.find(p=>p.f>=Math.max(720,first.f+320)&&p.f<=3300);
      if(!second)return null;
      const third=poles.find(p=>p.f>=second.f+370&&p.f<=4450);
      return {f1:first.f,f2:second.f,f3:third?third.f:null};
    };
  `.replaceAll('__ORDER__',String(params.order)).replaceAll('__BW__',String(params.bw));
}
