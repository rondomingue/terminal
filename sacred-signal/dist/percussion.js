'use strict';
// Adaptive positive spectral flux detects attacks, rather than sustained loudness.
class PercussionDetector {
 constructor(){this.reset();}
 reset(){this.previous=null;this.elapsed=0;this.states=Array.from({length:3},()=>({average:.004,pulse:0,last:-1}));}
 update(bins,sampleRate,fftSize,dt,threshold=1.5){
  this.elapsed+=dt;
  if(!this.previous){this.previous=Float32Array.from(bins,x=>x/255);return {kick:0,snare:0,cymbal:0};}
  const regions=[[35,180,.11,8],[180,3500,.09,11],[4500,14000,.055,16]];
  const result={};
  regions.forEach(([min,max,refractory,decay],j)=>{
   const start=Math.max(1,Math.ceil(min*fftSize/sampleRate)),end=Math.min(bins.length,Math.ceil(max*fftSize/sampleRate));let flux=0,energy=0;
   for(let i=start;i<end;i++){const v=bins[i]/255;flux+=Math.max(0,v-this.previous[i]);energy+=v;}
   flux/=Math.max(1,end-start);energy/=Math.max(1,end-start);
   const state=this.states[j],gate=Math.max(.012,state.average*threshold*2.5);
   state.pulse*=Math.exp(-dt*decay);
   if(flux>gate&&energy>.035&&this.elapsed-state.last>refractory){state.pulse=Math.min(1,flux/Math.max(.08,gate*3));state.last=this.elapsed;}
   state.average+=(flux-state.average)*(1-Math.exp(-dt*2));
   result[['kick','snare','cymbal'][j]]=state.pulse;
  });
  for(let i=0;i<bins.length;i++)this.previous[i]=bins[i]/255;
  return result;
 }
}
if(typeof module!=='undefined')module.exports={PercussionDetector};
