/** A collected card is an acorn. Repeated numbers restore the numbered card. */
export function createGame({mode = 'computer'} = {}) {
  if (!['computer','friend'].includes(mode)) throw new RangeError('Unknown player mode');
  return {mode, players:[0,1].map(()=>({cards:Array(6).fill(false), turnsTaken:0})), current:0, phase:'roll', rolled:null, winner:null, paused:false, tiebreak:null, finishTargets:null};
}
export function score(game, player) { return game.players[player].cards.filter(Boolean).length; }
function randomUnit(random) {
  const unit=random();
  if (!(unit>=0 && unit<1)) throw new RangeError('Random value must be in [0, 1)');
  return unit;
}
/** After four independent, uniform throws, zero acorns has probability 2/27.
 * If both have zero, both must finish at ten: six new acorns still remain.
 * Correct for those forced ties so the unconditional tie chance is 20%.
 * Ordered pairs are sampled symmetrically, preserving a 50/50 win chance. */
function planFinish(game, random) {
  const possible=game.players.map((p,i)=>[6,8,10].filter(turn=>turn-p.turnsTaken>=6-score(game,i)));
  const pairs=possible[0].flatMap(a=>possible[1].map(b=>[a,b]));
  const tied=pairs.filter(([a,b])=>a===b), different=pairs.filter(([a,b])=>a!==b);
  const forcedTieChance=(2/27)**2;
  const optionalTieChance=(.2-forcedTieChance)/(1-forcedTieChance);
  const draw=randomUnit(random);
  const pool=!different.length||draw<optionalTieChance?tied:different;
  game.finishTargets=pool[Math.floor(randomUnit(random)*pool.length)];
}
/** First four throws stay uniform. Later throws follow a feasible random path
 * to the jointly selected finishing rounds, without an early completion. */
export function nextRoll(game, random = Math.random) {
  if (game.phase !== 'roll' || game.paused) throw new RangeError('Not ready to roll');
  const unit = randomUnit(random);
  if (game.tiebreak) return 1+Math.floor(unit*6);
  const p = game.players[game.current];
  if(p.turnsTaken<4)return 1+Math.floor(unit*6);
  if(!game.finishTargets)throw new RangeError('Finishing rounds have not been planned');
  const missing = 6-score(game,game.current), turnsAfter = game.finishTargets[game.current]-p.turnsTaken-1;
  const choices = p.cards.flatMap((acorn,i)=>{
    const remaining=missing+(acorn?1:-1);
    return remaining<=turnsAfter && (remaining>0||turnsAfter===0)?[i+1]:[];
  });
  if (!choices.length) throw new RangeError('No cards remain');
  {
    const setbacks=choices.filter(n=>p.cards[n-1]), progress=choices.filter(n=>!p.cards[n-1]);
    if (setbacks.length && progress.length) {
      const setbackChance=.25;
      if (unit<setbackChance) return setbacks[Math.floor(unit/setbackChance*setbacks.length)];
      return progress[Math.min(progress.length-1,Math.floor((unit-setbackChance)/(1-setbackChance)*progress.length))];
    }
  }
  return choices[Math.floor(unit * choices.length)];
}
export function roll(game, value) {
  if (game.paused || game.phase !== 'roll') return {ok:false,reason:'invalid-state'};
  if (!Number.isInteger(value) || value < 1 || value > 6) return {ok:false,reason:'invalid-roll'};
  game.rolled=value;
  if (game.tiebreak) {
    game.tiebreak.values[game.current]=value;
    game.phase='between';
    const [a,b]=game.tiebreak.values;
    if (game.current===1 && a!==b) {
      game.phase='ended'; game.winner=a>b?0:1;
    }
  } else game.phase='choose';
  return {ok:true,value};
}
export function select(game, index) {
  if (game.paused || game.phase !== 'choose') return {ok:false,reason:'invalid-state'};
  if (!Number.isInteger(index) || index < 0 || index > 5) return {ok:false,reason:'invalid-card'};
  if (index !== game.rolled-1) return {ok:false,reason:'wrong-card'};
  const p=game.players[game.current]; p.cards[index]=!p.cards[index]; p.turnsTaken++;
  game.phase='between';
  // Always complete the round. Stopping immediately on player 0's sixth acorn
  // would give the starter all ties in finishing time.
  if (game.current===1 && (score(game,0)===6 || score(game,1)===6)) {
    if (score(game,0)===6 && score(game,1)===6) game.tiebreak={values:[null,null],round:1};
    else {game.phase='ended';game.winner=score(game,0)===6?0:1;}
  }
  return {ok:true,turnedDown:p.cards[index],finished:game.phase==='ended'};
}
export function advanceTurn(game, random = Math.random) {
  if (game.paused || game.phase !== 'between') return {ok:false};
  if(!game.finishTargets && game.players.every(p=>p.turnsTaken===4))planFinish(game,random);
  if (game.tiebreak && game.current===1 && game.tiebreak.values.every(n=>n!==null)) {
    game.tiebreak.values=[null,null]; game.tiebreak.round++;
  }
  game.current=1-game.current;game.rolled=null;game.phase='roll';return {ok:true,current:game.current};
}
export function pause(game) { if(game.paused)return {ok:false};game.paused=true;return {ok:true}; }
export function resume(game) { if(!game.paused)return {ok:false};game.paused=false;return {ok:true}; }
