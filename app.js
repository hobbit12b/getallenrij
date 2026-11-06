import {RecordedVoice} from './voice.mjs?v=20261106a';
import {createGame,nextRoll,roll,select,advanceTurn,score,pause,resume} from './engine.mjs?v=20261105a';
import {dieTransform,rollKeyframes} from './dice.mjs?v=20261104b';
import {ForestAudio} from './audio.mjs?v=20261101a';
import {HINT_DELAY,showFirstGuide,helpWords} from './guidance.mjs?v=20261104b';

const $=id=>document.getElementById(id), settings={mode:'computer'};
const patterns={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
const forestAudio=new ForestAudio({onMusicState:state=>{const b=$('music-button');if(b){b.dataset.audioState=state;b.setAttribute('aria-busy',String(state==='loading'));}}}), jobs=new Set();
forestAudio.preload().catch(()=>{});
const recordedVoice=new RecordedVoice(()=>forestAudio.context);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let game,dieValue=1,rolling=false,animation,autoPaused=false,run=0,hintCount=0;
let musicOn=false;
let introTimer,introStep=0,introRun=0;
let tieExplained=false,tieLessonRun=0;
const tieWords='Gelijkspel! Gooi allebei. Wie het meeste gooit, wint het spel!';

const ai=()=>game?.mode==='computer'&&game.current===1;
const scene=document.querySelector('.scene'), zone=document.querySelector('.dice-zone');

function speak(words,onDone) {
  $('announcement').textContent=words;
  forestAudio.unlock();
  try{speechSynthesis.cancel();}catch{}
  recordedVoice.play(words,{
    onStart:()=>{if($('intro').open)clearTimeout(introTimer);if($('tie-intro').open)clearTieJobs();},
    onEnd:onDone,
    onError:(error)=>{console.warn('Stemopname kon niet worden afgespeeld:',words,error);onDone?.();}
  });
}
function silence(){recordedVoice.stop();try{speechSynthesis.cancel();}catch{}}
const introWords=[
  'Verzamel zes eikels om te winnen!',
  'Gooi de dobbelsteen. Tik op de kaart met evenveel stippen. Die wordt een eikel.',
  'Ligt er al een eikel? Dan wordt het weer een kaart. Speel om de beurt.'
];
function explain(step){
  clearTimeout(introTimer);const token=++introRun;introStep=step;
  $('intro').dataset.step=String(step);
  document.querySelectorAll('.intro-panel').forEach((panel,i)=>panel.hidden=i!==step);
  document.querySelectorAll('.intro-dot').forEach((dot,i)=>dot.classList.toggle('current',i===step));
  $('intro-next').setAttribute('aria-label',step===2?'Spelen':'Volgende stap');
  const next=()=>{if(token===introRun&&$('intro').open&&!document.hidden)nextExplanation();};
  // A fallback also progresses the visual explanation if a device has no voice.
  introTimer=setTimeout(next,[5000,12000,12000][step]);
  speak(introWords[step],()=>{if(token!==introRun)return;clearTimeout(introTimer);introTimer=setTimeout(next,1000);});
}
function stopExplanation(){++introRun;clearTimeout(introTimer);silence();if($('intro').open)$('intro').close();}
function nextExplanation(){if(introStep<2)explain(introStep+1);else{stopExplanation();start();}}
function explainGame(){forestAudio.unlock();musicOn=false;updateMusic();$('intro').showModal();explain(0);}
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
  run++;tieLessonRun++;for(const j of jobs)clearTimeout(j.id);jobs.clear();
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
  if(ai()&&game.phase==='roll'&&![...jobs].some(j=>j.kind==='game'))ready();
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
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||button.disabled)return;
  button.classList.add('tap-feedback');
  clearTimeout(button.feedbackTimer);
  button.feedbackTimer=setTimeout(()=>button.classList.remove('tap-feedback'),220);
},true);
document.querySelectorAll('[data-mode]').forEach(b=>{
  let lastSpoken=-Infinity;
  const announce=()=>{
    if(performance.now()-lastSpoken<1200)return;
    lastSpoken=performance.now();
    const words=b.dataset.mode==='computer'?'Eén speler':'Twee spelers';
    $('announcement').textContent=words;
    // These optional recordings can be added without changing the game code.
    recordedVoice.play(words);
  };
  b.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse'&&forestAudio.context?.state==='running')announce();
  });
  b.addEventListener('focus',()=>{if(forestAudio.context?.state==='running')announce();});
  b.onclick=()=>{
    forestAudio.unlock();announce();
    settings.mode=b.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',String(x===b));});
  };
});
function render(){
  for(let p=0;p<2;p++){
    const active=game.current===p&&game.phase!=='ended';
    $('player-'+p).classList.toggle('active',active);
    $('status-'+p).textContent=`${p===0?'Eekhoorn':'Egel'}: ${score(game,p)} eikels`;
    const result=$('tie-throw-'+p),value=game.tiebreak?.values[p];
    result.hidden=!value || (rolling&&game.current===p);
    result.setAttribute('aria-label',`Extra worp: ${value??0}`);
    if(value)result.innerHTML=Array.from({length:9},(_,i)=>`<i class="pip ${patterns[value].includes(i)?'':'empty'}"></i>`).join('');
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
  if(game.tiebreak&&!tieExplained){explainTie();return;}
  if(game.tiebreak&&game.current===0&&game.tiebreak.round>1)speak('Evenveel! Gooi allebei nog een keer.');
  else if(!game.tiebreak&&game.current===1&&score(game,0)===6){
    speak('Eekhoorn heeft zes eikels. Egel mag nog één keer!',ai()?()=>later(throwDie,500):undefined);
    if(ai()){stopHints();return;}
  }
  if(ai()){stopHints();later(throwDie,!game.tiebreak&&score(game,0)===6?4500:1500);}
  else{forestAudio.cue('turn');armHint();}
}
function clearTieJobs(){
  for(const j of jobs)if(j.kind==='tie-intro'){clearTimeout(j.id);jobs.delete(j);}
}
function explainTie(){
  clearTieJobs();stopHints();const token=++tieLessonRun;
  if(!$('tie-intro').open)$('tie-intro').showModal();
  // Keep the first extra throw from cutting off the spoken explanation.
  later(beginTieRound,9000,'tie-intro');
  speak(tieWords,()=>{
    if(token!==tieLessonRun||!$('tie-intro').open||game?.paused)return;
    clearTieJobs();later(beginTieRound,600,'tie-intro');
  });
}
function beginTieRound(){
  if(!game||game.paused||!$('tie-intro').open)return;
  ++tieLessonRun;clearTieJobs();$('tie-intro').close();silence();tieExplained=true;ready();
}
function start(){
  stopExplanation();
  clear();tieExplained=false;game=createGame(settings);scene.classList.add('playing');
  $('menu').hidden=true;$('game').hidden=false;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  document.body.classList.remove('paused');forestAudio.unlock();musicOn=true;updateMusic(true);
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
  zone.classList.add('rolling');zone.style.top=game.current===0?'57%':'43%';
  animation=$('die').animate(rollKeyframes(dieValue,n),{duration:reduced?10:1250,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  later(()=>{
    showDie(n);rolling=false;zone.classList.remove('rolling');render();
    $('announcement').textContent=`Gegooid: ${n}.`;
    if(game.tiebreak){
      later(()=>{if(game.phase==='ended')finish();else{advanceTurn(game,randomUnit);ready();}},2000);
    }else if(ai())later(()=>choose(1,n-1,true),1600);else armHint();
  },reduced?50:1300);
}
function transformCard(p,i,collect){
  const b=$('cards-'+p).children[i],img=b.querySelector('.magic');
  if(collect)later(()=>forestAudio.cue('up'),reduced?20:200);else forestAudio.cue('back');
  b.classList.remove('smoke-out');
  b.classList.add('transforming',collect?'collecting':'restoring');
  const sequence=collect?[1,2,3,4,5]:[5,4,3,2,1];
  const frameDelay=reduced?45:(collect?190:170);
  sequence.forEach((frame,index)=>later(()=>{
    img.src=`assets/magic-${frame}.webp`;b.dataset.frame=String(frame);b.classList.add('magic-visible');
  },(collect?(reduced?20:200):0)+index*frameDelay));
  if(!collect)later(()=>b.classList.add('smoke-out'),reduced?210:800);
  later(()=>{
    b.classList.remove('transforming','collecting','restoring','magic-visible','smoke-out');
    delete b.dataset.frame;render();
  },reduced?300:(collect?1400:1060));
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
  transformCard(p,i,result.turnedDown);render();
  later(()=>{
    $('player-'+p).classList.remove('celebrate');
    if(result.finished)finish();else{advanceTurn(game,randomUnit);ready();}
  },reduced?550:1850);
}
function finish(){
  stopHints();render();const winner=game.winner,title=`${winner===0?'Eekhoorn':'Egel'} heeft gewonnen!`;
  [0,1].forEach(p=>emotion(p,winner===p?1:2));
  $('result-title').textContent=title;
  $('result').classList.toggle('winner-opposite',game.mode==='friend'&&winner===1);
  $('result-players').innerHTML=`<div class="winner-stage"><div class="sunburst" aria-hidden="true"></div><span class="winner-stars" aria-hidden="true">✦ ★ ✦</span><img class="winner-portrait" src="assets/character-${winner}-1.webp" alt="${winner===0?'Eekhoorn':'Egel'} heeft gewonnen"><div class="winner-harvest" aria-label="Zes eikels">${Array.from({length:6},(_,i)=>`<img src="assets/magic-5.webp" alt="" style="--i:${i}">`).join('')}</div></div>`;
  $('result').showModal();forestAudio.cue('win');speak(title);
}
function home(){
  clear();game=null;scene.classList.remove('playing');
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  document.body.classList.remove('paused');$('menu').hidden=false;$('game').hidden=true;
  silence();musicOn=false;updateMusic();forestAudio.resume();
}
function updateMusic(restart=false){
  forestAudio.setMusic(musicOn,{restart});
  $('music-button').setAttribute('aria-pressed',String(musicOn));
  $('music-button').setAttribute('aria-label',musicOn?'Muziek stoppen':'Muziek vanaf de intro starten');
  $('music-button').classList.toggle('music-on',musicOn);
}
updateMusic();
$('music-button').onclick=()=>{
  musicOn=!musicOn;forestAudio.unlock();updateMusic();

};
$('start').onclick=explainGame;
$('intro-next').onclick=nextExplanation;
$('intro-skip').onclick=()=>{stopExplanation();start();};
$('intro-repeat').onclick=()=>explain(introStep);
$('intro').oncancel=e=>{e.preventDefault();stopExplanation();start();};
$('tie-start').onclick=beginTieRound;
$('tie-repeat').onclick=explainTie;
$('tie-intro').oncancel=e=>{e.preventDefault();beginTieRound();};
$('roll').onclick=()=>{if(!ai())throwDie();};
$('repeat-button').onclick=()=>{forestAudio.unlock();if(game){speak(helpWords(game));if(!ai()&&!rolling&&['roll','choose'].includes(game.phase)){armHint(false);guide(false);}}};
$('home-button').onclick=()=>{freeze();$('leave').showModal();};
$('continue').onclick=()=>{$('leave').close();thaw();};
$('quit').onclick=home;$('again').onclick=start;$('result-home').onclick=home;
$('leave').oncancel=e=>{e.preventDefault();$('leave').close();thaw();};
$('result').oncancel=e=>e.preventDefault();
document.addEventListener('visibilitychange',()=>{
  if($('intro').open){if(document.hidden){++introRun;clearTimeout(introTimer);silence();}else explain(introStep);}
  if(document.hidden){forestAudio.suspend();if(game&&!game.paused){freeze();autoPaused=true;}}
  else {if(autoPaused){autoPaused=false;if(!$('leave').open){thaw();if($('tie-intro').open)explainTie();}}else if(!$('leave').open)forestAudio.resume();}
});
window.addEventListener('resize',()=>{if(game&&!$('guide').hidden)guide(showFirstGuide(game));});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
for(const file of [...Array.from({length:6},(_,i)=>`card-${i+1}`),...Array.from({length:2},(_,p)=>Array.from({length:3},(_,e)=>`character-${p}-${e}`)).flat(),...Array.from({length:5},(_,i)=>`magic-${i+1}`),'leaves']){
  const image=new Image();image.src=`assets/${file}.webp`;
}
