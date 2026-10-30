const assert=require('node:assert/strict');
const {PercussionDetector}=require('../dist/percussion.js');
const dt=1/60,sr=48000,fft=2048;
for(const [name,min,max] of [['kick',35,180],['snare',180,3500],['cymbal',4500,14000]]){
 const d=new PercussionDetector(),bins=new Uint8Array(1024);
 d.update(bins,sr,fft,dt);
 for(let i=Math.max(1,Math.ceil(min*fft/sr));i<Math.ceil(max*fft/sr);i++)bins[i]=200;
 const hit=d.update(bins,sr,fft,dt);assert(hit[name]>.8,`${name} attack`);
 for(const other of ['kick','snare','cymbal'].filter(x=>x!==name))assert.equal(hit[other],0,`${name} leaks into ${other}`);
 let tail;for(let i=0;i<120;i++)tail=d.update(bins,sr,fft,dt);
 assert(tail[name]<.001,'sustained energy should not retrigger');
 d.reset();assert.deepEqual(d.update(bins,sr,fft,dt),{kick:0,snare:0,cymbal:0});
}
console.log('Passed: independent band attacks, sustained-tone rejection, decay, seek/reset priming.');
