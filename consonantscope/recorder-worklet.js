class PCMRecorder extends AudioWorkletProcessor {
  constructor(){super();this.active=false;this.buffer=new Float32Array(2048);this.offset=0;this.port.onmessage=e=>{if(e.data==='start'){this.offset=0;this.active=true;}else if(e.data==='stop'){this.active=false;if(this.offset)this.port.postMessage({samples:this.buffer.slice(0,this.offset)});this.offset=0;this.port.postMessage({stopped:true});}};}
  process(inputs){const channels=inputs[0];if(this.active&&channels&&channels.length){const count=channels[0].length;for(let i=0;i<count;i++){let sum=0;for(const c of channels)sum+=c[i];this.buffer[this.offset++]=sum/channels.length;if(this.offset===this.buffer.length){this.port.postMessage({samples:this.buffer.slice()});this.offset=0;}}}return true;}
}
registerProcessor('pcm-recorder',PCMRecorder);
