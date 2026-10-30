/* Antarctica is a separate geographic bonus, never part of country scoring. */
(function(){
'use strict';
const project=([lon,lat])=>{const r=(90+lat)/30*440,t=lon*Math.PI/180;return [Math.sin(t)*r,-Math.cos(t)*r]};
const shuffled=(items,random=Math.random)=>{const result=items.slice();for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result};
const score=results=>results.filter(r=>r.correct).length;
if(typeof document==='undefined'){module.exports={project,shuffled,score};return}
const el=id=>document.getElementById(id),root=el('polarExperience');
let places=[],deck=[],cursor=0,results=[],selected=null,open=false,hidden=[],timer=null,loading=null;
const study=()=>el('polarMode').value==='study',hard=()=>el('polarDifficulty').value==='hard';
function clear(){clearTimeout(timer);timer=null}
function focus(){root.scrollIntoView({behavior:'instant',block:'start'})}
function facts(place){el('polarFacts').hidden=false;el('polarKind').textContent=place.kind;el('polarFactName').textContent=place.name;el('polarFact').textContent=place.fact;el('polarSource').href=place.source}
function render(){
 const done=cursor>=deck.length,target=deck[cursor],answered=!!results[cursor];
 el('polarRound').textContent=study()?'12 PLACES · EXPLORE FREELY':done?'EXPEDITION COMPLETE':`PLACE ${cursor+1} / ${deck.length}`;
 el('polarQuestion').textContent=study()?'Study Antarctica.':done?(score(results)===12?'Polar explorer!':'Keep exploring Antarctica.'):target.name;
 el('polarInstruction').textContent=study()?'Tap any numbered marker to read its name and facts.':done?'Restart for a fresh route through the frozen continent.':'Tap the numbered location that matches this feature.';
 el('polarNext').hidden=study()||answered;el('polarNext').textContent=done?'Play again ↗':answered?'Next place ↗':'Skip & reveal ↗';
 el('polarScore').textContent=study()?'Unscored study mode':`${score(results)} / 12 correct`;
 const svg=el('polarMarkers');svg.replaceChildren();
 for(const p of places){const [x,y]=project(p.center),right=answered&&target.id===p.id,wrong=answered&&selected===p.id&&!results[cursor].correct,found=!hard()&&results.some(r=>r.correct&&r.id===p.id),label=study()||right||found;
 const g=document.createElementNS('http://www.w3.org/2000/svg','g');g.setAttribute('transform',`translate(${x} ${y})`);g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-label',label?p.name:`Location ${p.id+1}`);g.classList.add('polar-marker');if(right||found)g.classList.add('correct');if(wrong)g.classList.add('wrong');
 const circle=document.createElementNS(g.namespaceURI,'circle');circle.setAttribute('r','20');const text=document.createElementNS(g.namespaceURI,'text');text.setAttribute('y','6');text.textContent=p.id+1;g.append(circle,text);
 if(label){const name=document.createElementNS(g.namespaceURI,'text');name.setAttribute('class','polar-label');name.setAttribute('y','-29');name.textContent=p.name;g.append(name)}
 g.addEventListener('click',()=>choose(p));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(p)}});svg.append(g)}
 let choices=el('polarChoices');if(!choices){choices=document.createElement('div');choices.id='polarChoices';choices.className='polar-choices';el('polarMarkers').parentElement.after(choices)}choices.replaceChildren();for(const p of places){const b=document.createElement('button');b.textContent=study()?`${p.id+1} · ${p.name}`:String(p.id+1);b.setAttribute('aria-label',study()?p.name:`Choose location ${p.id+1}`);b.onclick=()=>choose(p);choices.append(b)}
}
function choose(p){if(study()){facts(p);render();return}if(cursor>=deck.length||results[cursor])return;answer(p)}
function answer(p){clear();const target=deck[cursor],correct=!!p&&p.id===target.id;selected=p?.id??null;results.push({id:target.id,correct});el('polarFeedback').textContent=correct?'✓ Correct.':`${p?'Not quite.':'Location revealed.'} ${target.name} is highlighted in green.`;facts(target);if(typeof playUiSound==='function')playUiSound(correct?'correct':'wrong');render();timer=setTimeout(next,correct?800:2200);}
function next(){clear();if(cursor>=deck.length){restart();return}if(!results[cursor]){answer(null);return}cursor++;selected=null;el('polarFeedback').textContent='';el('polarFacts').hidden=true;if(cursor>=deck.length){try{const best=Math.max(score(results),Number(localStorage.getItem('atlas-antarctica-best'))||0);localStorage.setItem('atlas-antarctica-best',String(best));el('polarFeedback').textContent=`Personal best: ${best} / 12. ${score(results)===12?'❄ Polar Explorer bonus earned!':''}`}catch{}}render()}
function restart(){clear();deck=shuffled(places);cursor=0;results=[];selected=null;el('polarFeedback').textContent='';el('polarFacts').hidden=true;render()}
async function show(){el('polarOpen').disabled=true;try{if(!places.length){loading??=fetch('antarctica.json').then(r=>{if(!r.ok)throw Error('Could not load the polar map.');return r.json()});places=await loading}if(typeof cancelAdvance==='function')cancelAdvance();if(typeof setMapActive==='function')setMapActive(false);hidden=[...document.querySelectorAll('.collection,.game-layout,#countryFacts,.stats,#review,#profileDialog')].map(node=>[node,node.hidden]);for(const [node]of hidden)node.hidden=true;root.hidden=false;open=true;restart();focus()}catch(e){loading=null;el('polarOpen').textContent='Retry Antarctica bonus';console.error(e)}finally{el('polarOpen').disabled=false}}
function close(){clear();root.hidden=true;open=false;if(typeof setMapActive==='function')setMapActive(true);for(const [node,value]of hidden)node.hidden=value;if(typeof scheduleAdvance==='function')scheduleAdvance();document.querySelector('.collection').scrollIntoView({behavior:'instant',block:'start'})}
el('polarOpen').addEventListener('click',show);el('polarClose').addEventListener('click',close);el('polarRestart').addEventListener('click',restart);el('polarNext').addEventListener('click',next);el('polarMode').addEventListener('change',restart);el('polarDifficulty').addEventListener('change',restart);
// Country navigation restores the original country experience before its handler runs.
for(const button of document.querySelectorAll('header button,header a'))button.addEventListener('click',()=>{if(open)close()},true);
})();
