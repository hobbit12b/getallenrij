import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,nextRoll,roll,select,advanceTurn,score,pause,resume} from '../engine.mjs';
import {showFirstGuide,helpWords} from '../guidance.mjs';
function play(g,n){assert.equal(roll(g,n).ok,true);return select(g,n-1);}
test('wrong card and double taps never consume an extra turn',()=>{
 const g=createGame();roll(g,5);assert.equal(select(g,3).reason,'wrong-card');
 assert.equal(g.players[0].turnsTaken,0);assert.equal(select(g,4).turnedDown,true);
 assert.equal(select(g,4).ok,false);assert.equal(roll(g,2).ok,false);assert.equal(g.players[0].turnsTaken,1);
});
test('repeating a number changes an acorn back to its numbered card',()=>{
 const g=createGame();play(g,5);advanceTurn(g);play(g,1);advanceTurn(g);
 assert.equal(play(g,5).turnedDown,false);assert.equal(score(g,0),0);assert.equal(g.players[0].turnsTaken,2);
});
test('the starter must let the other player complete the round before winning',()=>{
 const g=createGame();for(let n=1;n<=6;n++){play(g,n);if(n<6){advanceTurn(g);play(g,1);advanceTurn(g);}}
 assert.equal(g.winner,null);assert.equal(g.phase,'between');
 advanceTurn(g);play(g,1);
 assert.equal(g.winner,0);assert.equal(g.phase,'ended');assert.equal(score(g,0),6);
 assert.equal(advanceTurn(g).ok,false);assert.equal(roll(g,1).ok,false);
});
test('all six faces remain available during the first six own throws',()=>{
 for(let turns=0;turns<6;turns++)for(let mask=0;mask<64;mask++){
  const count=mask.toString(2).replaceAll('0','').length;
  if(count>turns||count%2!==turns%2||count===6)continue;
  const g=createGame();g.players[0].turnsTaken=turns;g.players[0].cards=Array.from({length:6},(_,i)=>!!(mask&(1<<i)));
  assert.deepEqual(Array.from({length:6},(_,i)=>nextRoll(g,()=>i/6)),[1,2,3,4,5,6]);
 }
});
test('every allowed late outcome preserves the twelve-turn bound, including setbacks when affordable',()=>{
 for(let turns=6;turns<12;turns++)for(let mask=0;mask<63;mask++){
  const g=createGame(),p=g.players[0];p.turnsTaken=turns;p.cards=Array.from({length:6},(_,i)=>!!(mask&(1<<i)));
  const count=score(g,0),missing=6-count;
  if(count%2!==turns%2||missing>12-turns)continue;
  const seen=new Set(Array.from({length:60},(_,i)=>nextRoll(g,()=>i/60)));
  for(let n=1;n<=6;n++)assert.equal(seen.has(n),missing+(p.cards[n-1]?1:-1)<=11-turns);
 }
});
test('the tenth throw may still remove an acorn',()=>{
 const g=createGame();g.players[0]={turnsTaken:9,cards:[true,true,true,true,true,false]};
 const n=nextRoll(g,()=>0);assert.equal(n,1);assert.equal(play(g,n).turnedDown,false);
 assert.equal(score(g,0),4);
});
test('the leader after six own turns can still lose',()=>{
 const g=createGame({mode:'friend'});
 g.players[0]={turnsTaken:6,cards:[true,true,true,true,false,false]};
 g.players[1]={turnsTaken:6,cards:[true,true,false,false,false,false]};
 const sequence=[1,3,2,4,1,5,2,6];
 for(const n of sequence){
  const allowed=new Set(Array.from({length:60},(_,i)=>nextRoll(g,()=>i/60)));
  assert.ok(allowed.has(n));play(g,n);if(g.phase!=='ended')advanceTurn(g);
 }
 assert.equal(g.winner,1);assert.equal(g.players[1].turnsTaken,10);
});
test('20000 seeded games have fair winners, varied finishing rounds and at most twelve card turns',()=>{
 const wins=[0,0],rounds=new Set();let tiebreaks=0;
 for(let seed=1;seed<=20000;seed++){
  let state=seed;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const g=createGame({mode:seed%2?'computer':'friend'});
  for(let steps=0;steps<100&&g.phase!=='ended';steps++){
   const n=nextRoll(g,rng);if(g.tiebreak)roll(g,n);else play(g,n);
   if(g.phase!=='ended')advanceTurn(g);
  }
  assert.equal(g.phase,'ended');const winner=g.players[g.winner];assert.ok(winner.turnsTaken>=6&&winner.turnsTaken<=12);
  assert.equal(g.players[0].turnsTaken,g.players[1].turnsTaken);
  if(g.tiebreak)tiebreaks++;
  rounds.add(winner.turnsTaken);
  assert.equal(score(g,g.winner),6);wins[g.winner]++;
 }
 assert.ok(Math.abs(wins[0]/20000-.5)<.012,`Observed wins: ${wins}`);
 assert.ok(tiebreaks/20000<.4,`Too many simultaneous finishes: ${tiebreaks}`);
 assert.deepEqual([...rounds].sort((a,b)=>a-b),[6,8,10,12]);
});
test('later turns favour missing numbers but retain a fifteen percent setback chance when possible',()=>{
 const g=createGame();g.players[0]={turnsTaken:6,cards:[true,true,true,true,false,false]};
 let setbacks=0;
 for(let i=0;i<10000;i++)if(nextRoll(g,()=>i/10000)<=4)setbacks++;
 assert.equal(setbacks,1500);
});

function tiedGame(){
 const g=createGame({mode:'friend'});
 for(let n=1;n<=6;n++)for(let p=0;p<2;p++){play(g,n);advanceTurn(g);}
 return g;
}
test('equal finishing rounds give a fair extra throw, with equal rolls replayed',()=>{
 const wins=[0,0];let ties=0;
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++){
  const g=tiedGame();assert.ok(g.tiebreak);assert.equal(g.winner,null);
  assert.deepEqual(Array.from({length:6},(_,i)=>nextRoll(g,()=>i/6)),[1,2,3,4,5,6]);
  roll(g,a);assert.equal(g.phase,'between');assert.equal(select(g,a-1).ok,false);
  advanceTurn(g);roll(g,b);
  assert.deepEqual(g.tiebreak.values,[a,b]);
  if(a===b){
   ties++;assert.equal(g.winner,null);advanceTurn(g);
   assert.deepEqual(g.tiebreak.values,[null,null]);assert.equal(g.tiebreak.round,2);
  }else{assert.equal(g.phase,'ended');wins[g.winner]++;assert.equal(g.winner,a>b?0:1);}
  assert.deepEqual(g.players.map(p=>p.turnsTaken),[6,6]);
  assert.deepEqual(g.players.map((_,p)=>score(g,p)),[6,6]);
 }
 assert.deepEqual(wins,[15,15]);assert.equal(ties,6);
});
test('the second player can win outright in the same number of card turns',()=>{
 const g=createGame();
 for(let n=1;n<=6;n++){
  play(g,1);advanceTurn(g);play(g,n);if(g.phase!=='ended')advanceTurn(g);
 }
 assert.equal(g.winner,1);assert.deepEqual(g.players.map(p=>p.turnsTaken),[6,6]);
});
test('pausing and duplicate taps cannot consume an extra tie-break throw',()=>{
 const g=tiedGame();pause(g);assert.equal(roll(g,6).ok,false);resume(g);
 roll(g,6);assert.equal(roll(g,1).ok,false);pause(g);assert.equal(advanceTurn(g).ok,false);
 resume(g);advanceTurn(g);roll(g,1);assert.equal(g.winner,0);
 assert.equal(roll(g,6).ok,false);assert.equal(advanceTurn(g).ok,false);
});
test('pause preserves a pending selection and pending end-of-game presentation',()=>{
 const g=createGame();roll(g,4);pause(g);assert.equal(select(g,3).ok,false);resume(g);assert.equal(select(g,3).ok,true);
 g.phase='ended';assert.equal(pause(g).ok,true);assert.equal(resume(g).ok,true);
});
test('visual instruction is only for the first human turn; contextual help remains available',()=>{
 const g=createGame();assert.equal(showFirstGuide(g),true);roll(g,3);assert.equal(showFirstGuide(g),true);
 assert.equal(helpWords(g),'Waar ligt de 3?');assert.equal(helpWords(g,false),'Tel de stippen. Kijk naar je rij.');
 select(g,2);advanceTurn(g);assert.equal(showFirstGuide(g),false);assert.equal(helpWords(g),'Egel is aan de beurt.');
 play(g,1);advanceTurn(g);assert.equal(showFirstGuide(g),false);assert.equal(helpWords(g),'Tik op de dobbelsteen.');
});
test('both classmates receive their own first visual instruction',()=>{
 const g=createGame({mode:'friend'});play(g,1);advanceTurn(g);assert.equal(showFirstGuide(g),true);
});
test('invalid rolls, selections, modes and random values are rejected',()=>{
 assert.throws(()=>createGame({mode:'invalid'}),RangeError);
 for(const n of [0,7,1.5,NaN,'1'])assert.equal(roll(createGame(),n).ok,false);
 for(const n of [-1,1,NaN,Infinity])assert.throws(()=>nextRoll(createGame(),()=>n),RangeError);
 const g=createGame();assert.equal(select(g,0).ok,false);roll(g,2);assert.equal(select(g,'1').ok,false);
});
