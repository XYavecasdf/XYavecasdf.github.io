// Opt-in bounded diagnostics. No samples, formants, device IDs or labels stored.
(function(root){
  'use strict';
  function create(hopMs=75,capacity=512){
    if(!(hopMs>0)||!Number.isInteger(capacity)||capacity<1)throw Error('Invalid profiling budget');
    let frames,accepted,total,missed,over,previous,recent;
    function reset(){frames=accepted=total=missed=over=0;previous=null;recent=[];}
    reset();
    function record(at,duration,isAccepted){
      if(!Number.isFinite(at)||!Number.isFinite(duration)||duration<0)return;
      if(previous!==null)missed+=Math.max(0,Math.floor((at-previous)/hopMs)-1);
      previous=at;frames++;accepted+=isAccepted?1:0;total+=duration;
      if(duration>=hopMs)over++;
      recent.push(duration);if(recent.length>capacity)recent.shift();
    }
    function snapshot(){
      const sorted=[...recent].sort((a,b)=>a-b);
      const percentile=p=>sorted.length?sorted[Math.ceil(p*sorted.length)-1]:null;
      return {hop_ms:hopMs,frames,accepted_frames:accepted,missed_hops:missed,
        processing_over_budget:over,cpu_mean_ms:frames?total/frames:null,
        recent_frames:recent.length,cpu_p95_ms:percentile(.95),cpu_p99_ms:percentile(.99),
        cpu_max_recent_ms:sorted.length?sorted[sorted.length-1]:null};
    }
    // Keep cumulative CPU statistics while excluding deliberate pause gaps.
    function pause(){previous=null;}
    return Object.freeze({record,snapshot,reset,pause});
  }
  root.VowelScopeProfiler=Object.freeze({create});
})(globalThis);
