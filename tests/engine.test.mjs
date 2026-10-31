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
test('six different throws finish the race and stop all further input',()=>{
 const g=createGame();for(let n=1;n<=6;n++){play(g,n);if(n<6){advanceTurn(g);play(g,1);advanceTurn(g);}}
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
test('2000 seeded games with both player modes finish in 6–12 own turns',()=>{
 const wins=[0,0];
 for(let seed=1;seed<=2000;seed++){
  let state=seed;const rng=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const g=createGame({mode:seed%2?'computer':'friend'});
  for(let steps=0;steps<24&&g.phase!=='ended';steps++){play(g,nextRoll(g,rng));if(g.phase!=='ended')advanceTurn(g);}
  assert.equal(g.phase,'ended');const winner=g.players[g.winner];assert.ok(winner.turnsTaken>=6&&winner.turnsTaken<=12);
  assert.equal(score(g,g.winner),6);wins[g.winner]++;
 }
 assert.ok(wins[0]>100&&wins[1]>100);
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
