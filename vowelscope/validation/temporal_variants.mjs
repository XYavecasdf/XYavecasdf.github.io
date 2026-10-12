// Offline research only, never imported into the production HTML page.
// Rolling median is applied BEFORE the website EMA, so run with
// --smoothing none to isolate the median effect.
export function temporalPatch(name) {
  if(!['median3','median5'].includes(name))throw Error('Unsupported research window '+name);
  return "\n    // Temporal median on consecutive *raw* LPC candidates, offline only.\n    // Does not make a claim about isolated vowel accuracy or vowel identity.\n    const baseEstimate=estimateFormants;\n    const medianQueue=[];\n    estimateFormants=function(y,fs){\n      const candidate=baseEstimate(y,fs);\n      if(!candidate)return null;\n      medianQueue.push(candidate);\n      if(medianQueue.length>__WINDOW__)medianQueue.shift();\n      const median=values=>{\n        if(!values.length)return null;\n        const a=values.slice().sort((x,y)=>x-y),n=a.length;\n        return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;\n      };\n      return {\n        f1:median(medianQueue.map(v=>v.f1).filter(Number.isFinite)),\n        f2:median(medianQueue.map(v=>v.f2).filter(Number.isFinite)),\n        f3:median(medianQueue.map(v=>v.f3).filter(Number.isFinite))\n      };\n    };\n".replaceAll('__WINDOW__',name==='median3'?'3':'5');
}
