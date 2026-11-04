/** A collected card is an acorn. Repeated numbers restore the numbered card. */
export function createGame({mode = 'computer'} = {}) {
  if (!['computer','friend'].includes(mode)) throw new RangeError('Unknown player mode');
  return {mode, players:[0,1].map(()=>({cards:Array(6).fill(false), turnsTaken:0})), current:0, phase:'roll', rolled:null, winner:null, paused:false, tiebreak:null};
}
export function score(game, player) { return game.players[player].cards.filter(Boolean).length; }
/** Keep every outcome that still permits finishing within twelve own turns.
 * Setbacks remain possible late in the race, including on the tenth throw.
 * Both players use the same rule; no winner is selected in advance. */
export function nextRoll(game, random = Math.random) {
  if (game.phase !== 'roll' || game.paused) throw new RangeError('Not ready to roll');
  const unit = random();
  if (!(unit >= 0 && unit < 1)) throw new RangeError('Random value must be in [0, 1)');
  if (game.tiebreak) return 1+Math.floor(unit*6);
  const p = game.players[game.current];
  const missing = 6-score(game,game.current), turnsAfter = 12-p.turnsTaken-1;
  const choices = p.cards.flatMap((acorn,i)=>missing+(acorn?1:-1)<=turnsAfter?[i+1]:[]);
  if (!choices.length) throw new RangeError('No cards remain');
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
  // would give the starter all ties in finishing time (usually turn twelve).
  if (game.current===1 && (score(game,0)===6 || score(game,1)===6)) {
    if (score(game,0)===6 && score(game,1)===6) game.tiebreak={values:[null,null],round:1};
    else {game.phase='ended';game.winner=score(game,0)===6?0:1;}
  }
  return {ok:true,turnedDown:p.cards[index],finished:game.phase==='ended'};
}
export function advanceTurn(game) {
  if (game.paused || game.phase !== 'between') return {ok:false};
  if (game.tiebreak && game.current===1 && game.tiebreak.values.every(n=>n!==null)) {
    game.tiebreak.values=[null,null]; game.tiebreak.round++;
  }
  game.current=1-game.current;game.rolled=null;game.phase='roll';return {ok:true,current:game.current};
}
export function pause(game) { if(game.paused)return {ok:false};game.paused=true;return {ok:true}; }
export function resume(game) { if(!game.paused)return {ok:false};game.paused=false;return {ok:true}; }
