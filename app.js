import {createGame,nextRoll,roll,select,advanceTurn,score,pause,resume} from './engine.mjs?v=20261031e';
import {dieTransform,rollKeyframes} from './dice.mjs?v=20261031b';
import {ForestAudio} from './audio.mjs?v=20261031e';
import {HINT_DELAY,showFirstGuide,helpWords} from './guidance.mjs?v=20261031e';

const $=id=>document.getElementById(id), settings={mode:'computer'};
const patterns={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const forestAudio=new ForestAudio(), jobs=new Set();
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let game,dieValue=1,rolling=false,animation,autoPaused=false,run=0,hintCount=0;
let musicOn=false;
try {musicOn=localStorage.getItem('getallenbos-music')==='on';} catch {}
forestAudio.setMusic(musicOn);
const ai=()=>game?.mode==='computer'&&game.current===1;
const scene=document.querySelector('.scene'), zone=document.querySelector('.dice-zone');

function speak(words) {
  $('announcement').textContent=words;
  if(!('speechSynthesis' in window))return;
  try {
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(words);
    u.lang='nl-NL';u.rate=.86;
    const voice=speechSynthesis.getVoices().find(v=>v.lang.startsWith('nl'));
    if(voice)u.voice=voice;speechSynthesis.speak(u);
  } catch {}
}
function silence(){try{speechSynthesis.cancel();}catch{}}
function later(fn,ms,kind='game') {
  const j={fn,ms,end:Date.now()+ms,id:null,run,kind};
  j.go=()=>{jobs.delete(j);if(j.run===run&&game&&!game.paused)fn();};
  j.id=setTimeout(j.go,ms);jobs.add(j);
}
function stopHints(hide=true) {
  for(const j of jobs)if(j.kind==='hint'){clearTimeout(j.id);jobs.delete(j);}
  if(hide)$('guide').hidden=true;
}
function clear() {
  run++;for(const j of jobs)clearTimeout(j.id);jobs.clear();
  animation?.cancel();animation=null;rolling=false;
  zone.classList.remove('rolling');$('guide').hidden=true;
}
function freeze() {
  if(!game||game.paused)return;
  pause(game);
  for(const j of jobs){clearTimeout(j.id);j.ms=Math.max(0,j.end-Date.now());}
  animation?.pause();document.body.classList.add('paused');silence();forestAudio.suspend();
}
function thaw() {
  if(!game?.paused)return;
  resume(game);
  for(const j of jobs){j.end=Date.now()+j.ms;j.id=setTimeout(j.go,j.ms);}
  animation?.play();document.body.classList.remove('paused');forestAudio.resume();render();
}
function guide(exact=false) {
  if(!game||ai()||!['roll','choose'].includes(game.phase))return;
  const bounds=scene.getBoundingClientRect();
  let target;
  if(game.phase==='roll') target=zone.getBoundingClientRect();
  else target=(exact ? $('cards-'+game.current).children[game.rolled-1] : $('cards-'+game.current)).getBoundingClientRect();
  const x=(target.left+target.width/2-bounds.left)/bounds.width*100;
  const y=(target.top+target.height*.60-bounds.top)/bounds.height*100;
  $('guide').style.left=x+'%';$('guide').style.top=y+'%';
  $('guide').classList.toggle('upside-down',game.current===1);
  $('guide').hidden=false;
}
function armHint(reset=true) {
  stopHints(false);
  if(reset)hintCount=0;
  if(ai()||rolling||!['roll','choose'].includes(game.phase))return;
  if(showFirstGuide(game))guide(true);else $('guide').hidden=true;
  if(hintCount>=2)return;
  later(()=>{
    guide(false);speak(helpWords(game,hintCount>0));hintCount++;
    if(hintCount<2)later(()=>{guide(false);speak(helpWords(game,true));hintCount++;},18000,'hint');
  },HINT_DELAY,'hint');
}
function emotion(p,n){$('character-'+p).src=`assets/character-${p}-${n}.webp`;}
for(let n=1;n<=6;n++){
  const face=document.createElement('div');face.className='die-face';face.dataset.face=n;face.setAttribute('aria-hidden','true');
  face.innerHTML=Array.from({length:9},(_,i)=>`<i class="pip ${patterns[n].includes(i)?'':'empty'}"></i>`).join('');
  $('die').append(face);
}
function showDie(n){
  dieValue=n;animation?.cancel();animation=null;
  $('die').style.transform=dieTransform(n);
  document.querySelectorAll('.die-face').forEach(f=>f.classList.toggle('top',+f.dataset.face===n));
  $('die').setAttribute('aria-label',`Bovenkant: ${n} ${n===1?'stip':'stippen'}`);
}
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
  settings.mode=b.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
});
function render(){
  for(let p=0;p<2;p++){
    const active=game.current===p&&game.phase!=='ended';
    $('player-'+p).classList.toggle('active',active);
    $('status-'+p).textContent=`${p===0?'Eekhoorn':'Egel'}: ${score(game,p)} eikels`;
    Array.from($('cards-'+p).children).forEach((b,i)=>{
      if(!b.classList.contains('transforming')){
        b.classList.toggle('collected',game.players[p].cards[i]);
        b.querySelector('.magic').src='assets/magic-5.webp';
      }
      b.disabled=!active||ai()||rolling||game.paused||game.phase!=='choose';
      b.setAttribute('aria-label',`${p===0?'Eekhoorn':'Egel'}: ${game.players[p].cards[i]?'eikel':'kaart '+(i+1)}`);
    });
  }
  $('roll').disabled=rolling||game.paused||ai()||game.phase!=='roll';
}
function ready(){
  render();if(game.phase==='ended')return;
  emotion(game.current,0);zone.style.top=game.current===0?'57%':'43%';
  $('announcement').textContent=`${game.current===0?'Eekhoorn':'Egel'} is aan de beurt.`;
  if(ai()){stopHints();later(throwDie,1500);}
  else{forestAudio.cue('turn');armHint();}
}
function start(){
  clear();game=createGame(settings);scene.classList.add('playing');
  $('menu').hidden=true;$('game').hidden=false;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  document.body.classList.remove('paused');forestAudio.resume();
  for(let p=0;p<2;p++){
    emotion(p,0);$('player-'+p).classList.remove('celebrate');$('cards-'+p).innerHTML='';
    for(let i=0;i<6;i++){
      const b=document.createElement('button');b.className='card';
      b.innerHTML=`<span class="inner"><img class="face" src="assets/card-${i+1}.webp" alt=""></span><img class="magic" src="assets/magic-5.webp" alt="">`;
      b.onclick=()=>choose(p,i);$('cards-'+p).append(b);
    }
  }
  showDie(1);ready();
}
function randomUnit(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;}
function throwDie(){
  if(!game||game.paused||rolling||game.phase!=='roll')return;
  forestAudio.unlock();const first=showFirstGuide(game);
  stopHints(!first);const n=nextRoll(game,randomUnit);if(!roll(game,n).ok)return;
  rolling=true;render();silence();forestAudio.cue('roll');
  zone.classList.add('rolling');zone.style.top=game.current===0?'43%':'57%';
  animation=$('die').animate(rollKeyframes(dieValue,n),{duration:reduced?10:1250,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  later(()=>{
    showDie(n);rolling=false;zone.classList.remove('rolling');render();
    $('announcement').textContent=`Gegooid: ${n}.`;
    if(ai())later(()=>choose(1,n-1,true),1600);else armHint();
  },reduced?50:1300);
}
function transformCard(p,i,collect){
  const b=$('cards-'+p).children[i],img=b.querySelector('.magic');
  b.classList.add('transforming',collect?'collecting':'restoring');
  const sequence=collect?[1,2,3,4,5]:[5,4,3,2,1];
  const frameDelay=reduced?45:190;
  sequence.forEach((frame,index)=>later(()=>{
    img.src=`assets/magic-${frame}.webp`;b.dataset.frame=String(frame);b.classList.add('magic-visible');
  },(collect?(reduced?20:200):0)+index*frameDelay));
  later(()=>{
    b.classList.remove('transforming','collecting','restoring','magic-visible');
    delete b.dataset.frame;render();
  },reduced?300:1400);
}
function choose(p,i,computer=false){
  if(!game||p!==game.current||rolling||game.paused||ai()!==computer)return;
  const result=select(game,i);
  if(!result.ok){
    if(result.reason==='wrong-card'){
      const b=$('cards-'+p).children[i];b.classList.remove('wrong');void b.offsetWidth;b.classList.add('wrong');
      forestAudio.cue('wrong');armHint(false);
    }
    return;
  }
  stopHints();silence();emotion(p,result.turnedDown?1:2);
  $('player-'+p).classList.toggle('celebrate',result.turnedDown);
  forestAudio.cue(result.turnedDown?'up':'back');
  transformCard(p,i,result.turnedDown);render();
  later(()=>{
    $('player-'+p).classList.remove('celebrate');
    if(result.finished)finish();else{advanceTurn(game);ready();}
  },reduced?550:1850);
}
function finish(){
  stopHints();render();const winner=game.winner,title=`${winner===0?'Eekhoorn':'Egel'} heeft gewonnen!`;
  [0,1].forEach(p=>emotion(p,winner===p?1:2));
  $('result-title').textContent=title;
  $('result-players').innerHTML=[0,1].map(p=>`<div class="result-player ${winner===p?'winner':''}"><img src="assets/character-${p}-${winner===p?1:2}.webp" alt="${p===0?'Eekhoorn':'Egel'}"><b>${score(game,p)} <img class="result-acorn" src="assets/magic-5.webp" alt="eikels"></b></div>`).join('');
  $('result').showModal();forestAudio.cue('win');speak(title);
}
function home(){
  clear();game=null;scene.classList.remove('playing');
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  document.body.classList.remove('paused');$('menu').hidden=false;$('game').hidden=true;
  silence();forestAudio.resume();
}
function updateMusic(){
  forestAudio.setMusic(musicOn);
  $('music-button').setAttribute('aria-pressed',String(musicOn));
  $('music-button').setAttribute('aria-label',musicOn?'Achtergrondmuziek uitzetten':'Zachte achtergrondmuziek aanzetten');
  $('music-button').classList.toggle('music-on',musicOn);
}
updateMusic();
$('music-button').onclick=()=>{
  musicOn=!musicOn;forestAudio.unlock();updateMusic();
  try{localStorage.setItem('getallenbos-music',musicOn?'on':'off');}catch{}
};
$('start').onclick=()=>{forestAudio.unlock();start();};
$('roll').onclick=()=>{if(!ai())throwDie();};
$('repeat-button').onclick=()=>{forestAudio.unlock();if(game){speak(helpWords(game));if(!ai()&&!rolling&&['roll','choose'].includes(game.phase)){armHint(false);guide(false);}}};
$('home-button').onclick=()=>{freeze();$('leave').showModal();};
$('continue').onclick=()=>{$('leave').close();thaw();};
$('quit').onclick=home;$('again').onclick=start;$('result-home').onclick=home;
$('leave').oncancel=e=>{e.preventDefault();$('leave').close();thaw();};
$('result').oncancel=e=>e.preventDefault();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){forestAudio.suspend();if(game&&!game.paused){freeze();autoPaused=true;}}
  else {if(autoPaused){autoPaused=false;if(!$('leave').open)thaw();}else if(!$('leave').open)forestAudio.resume();}
});
window.addEventListener('resize',()=>{if(game&&!$('guide').hidden)guide(showFirstGuide(game));});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
for(const file of [...Array.from({length:6},(_,i)=>`card-${i+1}`),...Array.from({length:2},(_,p)=>Array.from({length:3},(_,e)=>`character-${p}-${e}`)).flat(),...Array.from({length:5},(_,i)=>`magic-${i+1}`),'leaves']){
  const image=new Image();image.src=`assets/${file}.webp`;
}
