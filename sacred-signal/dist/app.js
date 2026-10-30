'use strict';
const $=id=>document.getElementById(id),canvas=$('canvas'),ctx=canvas.getContext('2d');
const audio=new Audio();audio.preload='auto';let ac,analyser,source,destination,buffer,recorder,chunks=[],url,recording=false,demo=false,elapsed=0,last=0,phase=0,low=0,mid=0,high=0;let colorKick=0,colorSnare=0,colorCymbal=0;let clipStart=0,recordEnd=0;const symbols=[];const waveformBands=[];
const layerState=Array.from({length:5},(_,i)=>({enabled:true,opacity:i===0?.8:.24,scale:[1,1.25,.8,1.5,1.05][i],response:['kick','snare','cymbal','kick','snare'][i]}));
const detector=new PercussionDetector();let hits={kick:0,snare:0,cymbal:0};
for(let i=0;i<5;i++){
 const img=new Image();symbols.push(img);
 img.onerror=()=>message(`Geometry 00${i+1} could not decode.`);
 img.src=SVG_ASSETS[i===0?'geometry.svg':`geometry-${i+1}.svg`];
 const row=document.createElement('div');row.className='layer-row';row.innerHTML=`<label class="toggle"><input type="checkbox" checked aria-label="Enable geometry 00${i+1}">Geometry 00${i+1}</label><div class="layer-controls"><label>Opacity <output>${Math.round(layerState[i].opacity*100)}%</output><input type="range" min="0" max="100" value="${layerState[i].opacity*100}" aria-label="Geometry 00${i+1} opacity"></label><label>Scale <output>${layerState[i].scale}×</output><input type="range" min="0.3" max="2" step="0.05" value="${layerState[i].scale}" aria-label="Geometry 00${i+1} scale"></label><label>React to<select aria-label="Geometry 00${i+1} response"><option value="kick">Kick</option><option value="snare">Snare</option><option value="cymbal">Cymbals</option><option value="all">All hits</option></select></label></div>`;
 row.querySelector('input[type=checkbox]').onchange=e=>layerState[i].enabled=e.target.checked;
 const ranges=row.querySelectorAll('input[type=range]');ranges[0].oninput=e=>{layerState[i].opacity=e.target.value/100;e.target.previousElementSibling.value=e.target.value+'%';};ranges[1].oninput=e=>{layerState[i].scale=+e.target.value;e.target.previousElementSibling.value=e.target.value+'×';};
 const select=row.querySelector('select');select.value=layerState[i].response;select.onchange=e=>layerState[i].response=e.target.value;$('layers').append(row);
}
$('focus').onchange=()=>{detector.reset();['low','mid','high'].forEach((id,i)=>$(id+'-label').textContent=($('focus').value==='drums'?['KICK','SNARE','CYMBAL']:['LOW','MID','HIGH'])[i]);};
const tintCache=new Map();
function tintedSymbol(i,hue,palette){
 const quantizedHue=Math.round(hue/15)*15;const key=`${i}-${palette}-${quantizedHue}`;if(tintCache.has(key))return tintCache.get(key);
 const img=symbols[i],c=document.createElement('canvas');c.width=1000;c.height=Math.round(1000*img.naturalHeight/img.naturalWidth);
 const g=c.getContext('2d');g.drawImage(img,0,0,c.width,c.height);g.globalCompositeOperation='source-in';g.fillStyle=palette==='mono'?'#dce3e9':`hsl(${quantizedHue+i*12},80%,75%)`;g.fillRect(0,0,c.width,c.height);if(tintCache.size>=90)tintCache.delete(tintCache.keys().next().value);tintCache.set(key,c);return c;
}
$('video-format').onchange=()=>{
 const horizontal=$('video-format').value==='horizontal';
 canvas.width=horizontal?1920:1080;canvas.height=horizontal?1080:1920;
 canvas.classList.toggle('horizontal',horizontal);
 $('format-info').textContent=horizontal?'LANDSCAPE · 16:9 · 1920 × 1080 · 30 FPS':'STORIES · 9:16 · 1080 × 1920 · 30 FPS';
};
function graph(){if(ac)return;ac=new AudioContext();analyser=ac.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=0;buffer=new Uint8Array(analyser.frequencyBinCount);source=ac.createMediaElementSource(audio);destination=ac.createMediaStreamDestination();source.connect(analyser);analyser.connect(ac.destination);analyser.connect(destination);
 for(const [name,min,max,color] of [['KICK',35,180,'#ccff98'],['SNARE',180,3500,'#72d8ff'],['CYMBALS',4500,14000,'#ee95ff']]){
  const hp=ac.createBiquadFilter(),lp=ac.createBiquadFilter(),scope=ac.createAnalyser();
  hp.type='highpass';hp.frequency.value=min;hp.Q.value=.707;
  lp.type='lowpass';lp.frequency.value=Math.min(max,ac.sampleRate*.45);lp.Q.value=.707;
  scope.fftSize=2048;source.connect(hp);hp.connect(lp);lp.connect(scope);
  waveformBands.push({name,color,scope,data:new Float32Array(scope.fftSize)});
 }
}
function message(s){$('notice').textContent=s;}
const stamp=s=>`${Math.floor((s||0)/60)}:${String(Math.floor((s||0)%60)).padStart(2,'0')}`;
function updateClipRange(){
 const duration=Number.isFinite(audio.duration)?audio.duration:0,length=+$('clip-length').value;
 clipStart=Math.max(0,Math.min(clipStart,Math.max(0,duration-.1)));
 const start=length?clipStart:0,end=duration?(length?Math.min(duration,start+length):duration):(length||0);
 $('clip-range').textContent=`Clip: ${stamp(start)} → ${stamp(end)}${duration?' · '+stamp(end-start)+' duration':' · Load a song to set the start.'}`;
}
$('clip-length').onchange=updateClipRange;
$('clip-start').onclick=()=>{if(recording)return;clipStart=audio.currentTime;updateClipRange();message('Clip starts at '+stamp(clipStart)+'.');};
audio.addEventListener('timeupdate',()=>{if(recording&&audio.currentTime>=recordEnd)stopRecording();});
for(const id of ['sensitivity','depth','motion','threshold','color-intensity'])$(id).addEventListener('input',()=>$(id+'-out').value=$(id).value+(id==='depth'?'':'×'));
$('file').onchange=async()=>{if(recording)return;const file=$('file').files[0];if(!file)return;audio.pause();if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);audio.src=url;clipStart=0;detector.reset();demo=false;$('demo').textContent='Explore demo';$('trackname').textContent=file.name.replace(/\.[^.]+$/,'');$('trackinfo').textContent='LOCAL FILE · READY TO PLAY';$('mode').textContent='● AUDIO READY';message('');};
audio.onseeking=()=>detector.reset();
audio.onloadedmetadata=()=>{updateClipRange();$('clip-start').disabled=false;$('play').disabled=false;$('seek').disabled=false;$('record').disabled=false;$('time').textContent=`0:00 / ${stamp(audio.duration)}`;};audio.onerror=()=>{message('This audio format could not be decoded. Try an MP3, WAV, or M4A.');$('play').disabled=$('record').disabled=true;};
$('play').onclick=async()=>{try{graph();await ac.resume();if(audio.paused){demo=false;await audio.play();}else audio.pause();}catch(e){message('Playback could not start: '+e.message);}};
audio.onplay=()=>{$('play').textContent='Ⅱ';$('mode').textContent=recording?'● RECORDING':'● AUDIO REACTIVE';};audio.onpause=()=>{$('play').textContent='▶';if(!recording)$('mode').textContent='● PAUSED';};audio.onended=()=>{if(recording)stopRecording();};
$('seek').oninput=()=>{if(Number.isFinite(audio.duration)&&!recording)audio.currentTime=$('seek').value/1000*audio.duration;};
$('demo').onclick=()=>{if(recording)return;audio.pause();demo=!demo;$('demo').textContent=demo?'Stop demo':'Explore demo';$('mode').textContent=demo?'● SIMULATED AUDIO':'● GENERATIVE PREVIEW';};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else canvas.requestFullscreen?.();};
function stopRecording(){if(recorder?.state==='recording')recorder.stop();}
$('record').onclick=async()=>{if(recording){stopRecording();return;}if(!canvas.captureStream||!window.MediaRecorder){message('Recording is unavailable in this browser. Open in Chrome or Edge.');return;}try{graph();await ac.resume();const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(x=>MediaRecorder.isTypeSupported(x));if(!mime)throw Error('No supported video encoder');audio.pause();const clipLength=+$('clip-length').value;const recordStart=clipLength?clipStart:0;recordEnd=clipLength?Math.min(audio.duration,recordStart+clipLength):audio.duration;if(!Number.isFinite(recordEnd)||recordEnd<=recordStart)throw Error('Choose a start before the end of the song');audio.currentTime=recordStart;detector.reset();demo=false;const stream=canvas.captureStream(30);destination.stream.getAudioTracks().forEach(t=>stream.addTrack(t));chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:12000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{recording=false;$('video-format').disabled=false;$('clip-length').disabled=false;$('clip-start').disabled=false;$('record').textContent='◉ Export video';$('file').disabled=false;$('seek').disabled=false;$('play').disabled=false;stream.getVideoTracks().forEach(t=>t.stop());audio.pause();const blob=new Blob(chunks,{type:recorder.mimeType});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='sacred-signal-'+$('video-format').value+'-'+Math.floor(recordStart)+'s-'+Math.floor(recordEnd)+'s-'+canvas.width+'x'+canvas.height+'.'+(mime.includes('mp4')?'mp4':'webm');link.click();setTimeout(()=>URL.revokeObjectURL(link.href),60000);message(mime.includes('mp4')?`MP4 exported with audio · ${canvas.width} × ${canvas.height}.`:`WebM exported with audio · ${canvas.width} × ${canvas.height}. Convert to MP4 if needed; this browser does not support MP4 recording.`);$('hint').textContent='Load audio to record a video with sound. Files stay on your device.';};recorder.onerror=e=>{message('Recording failed: '+(e.error?.message||'Encoder error'));stopRecording();};recorder.start(1000);recording=true;$('video-format').disabled=true;$('clip-length').disabled=true;$('clip-start').disabled=true;$('record').textContent='■ Finish & download';$('file').disabled=true;$('seek').disabled=true;$('play').disabled=true;$('hint').textContent=`Recording ${stamp(recordStart)} → ${stamp(recordEnd)}. Keep this tab visible. Stops automatically at the bracket end.`;await audio.play();$('mode').textContent='● RECORDING';}catch(e){message('Could not record: '+e.message);if(recorder?.state==='recording')stopRecording();}};
function band(a,b){let sum=0,start=Math.floor(a/ac.sampleRate*analyser.fftSize),end=Math.min(buffer.length,Math.ceil(b/ac.sampleRate*analyser.fftSize));for(let i=start;i<end;i++)sum+=buffer[i];return sum/Math.max(1,end-start)/255;}
function circle(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
const eyeImage=new Image(),eyeTints=new Map();
eyeImage.onerror=()=>message('Eye artwork could not decode.');
eyeImage.src=SVG_ASSETS['eye.svg'];
function eye(x,y,r,angle,hue){
 if(!eyeImage.complete||!eyeImage.naturalWidth)return;
 const key=((Math.round(hue/15)*15)%360+360)%360;
 if(!eyeTints.has(key)){
  const c=document.createElement('canvas');c.width=256;c.height=Math.round(256*eyeImage.naturalHeight/eyeImage.naturalWidth);
  const g=c.getContext('2d');g.drawImage(eyeImage,0,0,c.width,c.height);g.globalCompositeOperation='source-in';g.fillStyle=`hsl(${key},75%,72%)`;g.fillRect(0,0,c.width,c.height);eyeTints.set(key,c);
 }
 const img=eyeTints.get(key),w=r*2,h=w*img.height/img.width;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=.55;ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();
}

function drawWaveforms(W,H){
 if(!$('waveforms').checked)return;
 const channels=[['KICK',hits.kick],['SNARE',hits.snare],['CYMBALS',hits.cymbal]];
 const landscape=W>H;const left=landscape?W-550:150,width=landscape?440:W-300,top=H-400,rowHeight=76;
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.shadowBlur=0;ctx.globalAlpha=1;
 ctx.fillStyle='rgba(6,9,17,.45)';ctx.fillRect(left-18,top-42,width+36,292);
 ctx.font='14px monospace';ctx.fillStyle='#778087';ctx.fillText('PERCUSSION / ATTACKS',left,top-18);
 channels.forEach(([name,hit],j)=>{
  const attack=Math.min(1,Math.max(0,hit)),y=top+j*rowHeight,base=y+43;
  const light=Math.round(110+attack*145),color=`rgb(${light},${light},${light})`;
  ctx.font='bold 17px monospace';ctx.fillStyle=color;ctx.fillText(name,left,y+10);
  ctx.font='12px monospace';ctx.fillStyle='#687178';ctx.fillText(['35–180 Hz','180–3500 Hz','4.5–14 kHz'][j],left+110,y+10);
  ctx.fillStyle='#252a2e';ctx.fillRect(left+width-140,y-2,140,7);
  ctx.fillStyle=color;ctx.fillRect(left+width-140,y-2,140*attack,7);
  // A short bright pulse gives each attack a clear visual accent.
  ctx.globalAlpha=attack*.65;ctx.fillRect(left,y+19,3+attack*4,44);ctx.globalAlpha=1;
  ctx.strokeStyle='#252a2e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,base);ctx.lineTo(left+width,base);ctx.stroke();
  const channel=waveformBands[j];if(channel&&!audio.paused)channel.scope.getFloatTimeDomainData(channel.data);
  ctx.save();ctx.beginPath();ctx.rect(left,y+19,width,46);ctx.clip();ctx.strokeStyle=color;ctx.globalAlpha=.35+attack*.65;ctx.lineWidth=1+attack*2;ctx.shadowColor='#ffffff';ctx.shadowBlur=attack*14;ctx.beginPath();
  for(let k=0;k<700;k++){
   let sample=0;
   if(channel&&!audio.paused)sample=channel.data[Math.floor(k/699*(channel.data.length-1))];
   else if(demo)sample=Math.sin(k*(j===0?.045:j===1?.31:1.7)+elapsed*12)*attack*.65;
   const x=left+k/699*width,py=base-Math.max(-1,Math.min(1,sample*2))*(8+attack*14);
   if(k===0)ctx.moveTo(x,py);else ctx.lineTo(x,py);
  }
  ctx.stroke();ctx.restore();
 });
 ctx.font='11px monospace';ctx.fillStyle='#586169';ctx.fillText(demo?'SIMULATED SIGNAL':'FILTERED MIX / TRANSIENT RESPONSE',left,top+239);
 ctx.restore();
}
function draw(t){requestAnimationFrame(draw);const dt=Math.min(.05,(t-last)/1000||.016);last=t;elapsed+=dt;const gain=+$('sensitivity').value;const drums=$('focus').value==='drums';
if(ac&&!audio.paused){
 analyser.getByteFrequencyData(buffer);hits=detector.update(buffer,ac.sampleRate,analyser.fftSize,dt,+$('threshold').value);
 if(drums){low=hits.kick*gain;mid=hits.snare*gain;high=hits.cymbal*gain;}
 else{const smooth=1-Math.exp(-dt*9);low+=(band(25,250)*gain-low)*smooth;mid+=(band(250,2500)*gain-mid)*smooth;high+=(band(2500,12000)*gain-high)*smooth;}
}else if(demo){
 const pulse=(rate,offset,decay)=>Math.exp(-((elapsed+offset)%rate)*decay);
 hits={kick:pulse(.6,0,12),snare:pulse(1.2,.6,15),cymbal:pulse(.3,.15,22)};
 low=hits.kick*gain;mid=hits.snare*gain;high=hits.cymbal*gain;
}else{const decay=Math.exp(-dt*8);low*=decay;mid*=decay;high*=decay;hits={kick:0,snare:0,cymbal:0};}
const colorSmooth=1-Math.exp(-dt*12);
colorKick+=(hits.kick-colorKick)*colorSmooth;colorSnare+=(hits.snare-colorSnare)*colorSmooth;colorCymbal+=(hits.cymbal-colorCymbal)*colorSmooth;
phase+=dt*(.025+mid*.08)*+$('motion').value;
const W=canvas.width,H=canvas.height,pal=$('palette').value;
const colorAmount=$('reactive-color').checked&&pal!=='mono'?+$('color-intensity').value:0;
const baseHue=({vision:175,gold:38,violet:275,ember:5,ocean:215,jade:140,rose:320,ice:195,aurora:165,copper:25,ultraviolet:285,sunset:20,ruby:345,mono:210}[pal]??175);
const hue=baseHue+colorAmount*(-colorKick*45+colorSnare*85+colorCymbal*25),depth=+$('depth').value;
const accentShift=({aurora:150,copper:155,ultraviolet:160,sunset:305,ruby:230}[pal]??70);

ctx.fillStyle='#060911';ctx.fillRect(0,0,W,H);const bg=ctx.createRadialGradient(W>H?W*.40:W/2,H*.42,10,W>H?W*.40:W/2,H*.42,850);bg.addColorStop(0,`hsla(${hue+accentShift},65%,${20+colorCymbal*colorAmount*8}%,.8)`);bg.addColorStop(.55,`hsla(${hue+40},70%,9%,.7)`);bg.addColorStop(1,'#060911');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.save();ctx.translate(W>H?W*.40:W/2,W>H?H*.50:H*.42);const framing=Math.min(1,460/(38+depth*depth*6.2)/(1+Math.min(low,2)*.16));ctx.scale(framing,framing);ctx.globalCompositeOperation='screen';
for(let j=depth;j>=1;j--){const r=38+j*j*6.2*(1+low*.16),n=12+j*4,spin=phase*(j%2?1:-1)+j*.12;ctx.save();ctx.rotate(spin);ctx.strokeStyle=`hsla(${hue+j*(accentShift/7)},75%,${62+Math.min(18,colorCymbal*colorAmount*18)}%,${.1+high*.15})`;ctx.lineWidth=1;circle(0,0,r);for(let k=0;k<n;k++){let a=k/n*Math.PI*2;let x=Math.cos(a)*r,y=Math.sin(a)*r;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(Math.cos(a+Math.PI*.65)*r,Math.sin(a+Math.PI*.65)*r);ctx.stroke();if($('eyes').checked)eye(x,y,Math.max(9,r*Math.PI/n*.8),a+Math.PI/2,hue+j*accentShift/7);}ctx.restore();}
ctx.save();ctx.rotate(-phase*.7);let size=620*(1+low*.22);ctx.shadowColor=`hsl(${hue},85%,60%)`;ctx.shadowBlur=12+high*35;ctx.globalAlpha=.85;if($('geometry').value==='source'){
 layerState.forEach((layer,i)=>{const img=symbols[i];if(!layer.enabled||!img.complete||!img.naturalWidth)return;
 const response=layer.response==='all'?Math.max(low,mid,high):({kick:low,snare:mid,cymbal:high}[layer.response]);
 const w=620*layer.scale*(1+Math.min(2,response)*.16),h=w*img.naturalHeight/img.naturalWidth;
 ctx.save();ctx.rotate(phase*(i%2?1:-1)*(1+i*.28)+i*Math.PI/12+mid*.035*(i%2?1:-1));ctx.globalAlpha=Math.min(1,layer.opacity*(.85+response*.45+colorCymbal*colorAmount*.4));ctx.shadowBlur=8+Math.min(high,2)*20;ctx.drawImage(tintedSymbol(i,hue+(i%2?accentShift:0),pal),-w/2,-w/2,w,h);ctx.restore();});
}else{
 ctx.strokeStyle=`hsl(${hue},85%,76%)`;ctx.lineWidth=2;
 const kind=$('geometry').value,r=size/6;
 if(kind.startsWith('svg-')){const i=Number(kind.slice(4)),img=symbols[i];if(img.complete&&img.naturalWidth)ctx.drawImage(tintedSymbol(i,hue,pal),-size/2,-size/2,size,size*img.naturalHeight/img.naturalWidth);}
 else if(kind==='vesica'){circle(-r*.65,0,r*1.3);circle(r*.65,0,r*1.3);}
 else if(kind==='star'||kind==='sri'){const count=kind==='star'?2:9;for(let j=0;j<count;j++){const radius=size*(kind==='star'?.45:.46-j*.04),offset=(j%2?Math.PI/2:-Math.PI/2);ctx.beginPath();for(let k=0;k<=3;k++){const angle=k/3*Math.PI*2+offset;ctx.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);}ctx.stroke();}}
 else if(kind==='metatron'){const points=[[0,0]];for(const radius of [r*1.2,r*2.4])for(let k=0;k<6;k++){const a=k/6*Math.PI*2;points.push([Math.cos(a)*radius,Math.sin(a)*radius]);}for(let i=0;i<points.length;i++){circle(...points[i],r*.58);for(let j=i+1;j<points.length;j++){ctx.beginPath();ctx.moveTo(...points[i]);ctx.lineTo(...points[j]);ctx.stroke();}}}
 else if(kind==='mandala'){for(let j=0;j<3;j++){ctx.beginPath();for(let k=0;k<=12;k++){const a=k/12*Math.PI*2+j*.3;ctx.lineTo(Math.cos(a)*size*(.45-j*.1),Math.sin(a)*size*(.45-j*.1));}ctx.stroke();}}
 else{circle(0,0,r);for(let ring=1;ring<=(kind==='seed'?1:2);ring++)for(let k=0;k<6*ring;k++){const a=k/(6*ring)*Math.PI*2;circle(Math.cos(a)*r*ring,Math.sin(a)*r*ring,r);}circle(0,0,size*(kind==='seed'?.34:.49));}
}
ctx.restore();
const glow=ctx.createRadialGradient(0,0,0,0,0,80+low*90);glow.addColorStop(0,'rgba(245,255,218,.85)');glow.addColorStop(.13,`hsla(${hue},90%,75%,.6)`);glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(-220,-220,440,440);ctx.restore();
if(recording&&audio.currentTime>=recordEnd)stopRecording();
drawWaveforms(W,H);
if(pal==='mono'){ctx.save();ctx.globalCompositeOperation='saturation';ctx.fillStyle='#808080';ctx.fillRect(0,0,W,H);ctx.restore();}
for(const [id,v]of [['low',low],['mid',mid],['high',high]]){const percent=Math.min(100,Math.round(v*100));$(id).textContent=percent+'%';$(id+'-bar').style.width=percent+'%';}if(audio.duration){$('time').textContent=stamp(audio.currentTime)+' / '+stamp(audio.duration);if(!$('seek').matches(':active'))$('seek').value=audio.currentTime/audio.duration*1000;}}
requestAnimationFrame(draw);

$('randomize').onclick=()=>{
 const choose=items=>items[Math.floor(Math.random()*items.length)];
 $('geometry').value=choose(Array.from($('geometry').options,o=>o.value));
 $('palette').value=choose(Array.from($('palette').options,o=>o.value));
 for(const [id,min,max,step] of [['depth',3,11,1],['motion',.2,1.6,.1],['sensitivity',.7,2,.1]]){
  $(id).value=(Math.round((min+Math.random()*(max-min))/step)*step).toFixed(id==='depth'?0:1);
  $(id).dispatchEvent(new Event('input'));
 }
 $('eyes').checked=Math.random()>.2;
 const rows=$('layers').querySelectorAll('.layer-row');
 let enabled=0;
 layerState.forEach((layer,i)=>{
  layer.enabled=i===0||Math.random()>.25;enabled+=Number(layer.enabled);
  layer.opacity=i===0?.55+Math.random()*.25:.1+Math.random()*.3;
  layer.scale=.5+Math.random()*1.1;
  layer.response=choose(['kick','snare','cymbal','all']);
  const row=rows[i];row.querySelector('input[type=checkbox]').checked=layer.enabled;
  const ranges=row.querySelectorAll('input[type=range]');
  ranges[0].value=Math.round(layer.opacity*100);ranges[1].value=(Math.round(layer.scale/.05)*.05).toFixed(2);
  ranges.forEach(input=>input.dispatchEvent(new Event('input')));
  row.querySelector('select').value=layer.response;
 });
 message(`New combination · ${$('geometry').selectedOptions[0].textContent}. Adjust any control to refine it.`);
};
