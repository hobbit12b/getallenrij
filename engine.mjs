/** Pure state transitions for Dobbelbos. No clocks or scheduled work. */
export function createGame({ mode = 'computer', goal = 'race', turnLimit = 10 } = {}) {
  if (!['computer', 'friend'].includes(mode)) throw new RangeError('Unknown player mode');
  if (!['race', 'turns'].includes(goal)) throw new RangeError('Unknown game goal');
  if (!Number.isInteger(turnLimit) || turnLimit <= 0) throw new RangeError('Turn limit must be a positive integer');
  return {
    mode, goal, turnLimit,
    players: [
      { cards: Array(6).fill(false), turnsTaken: 0 },
      { cards: Array(6).fill(false), turnsTaken: 0 },
    ],
    current: 0,
    phase: 'roll',
    rolled: null,
    winner: null,
    paused: false,
  };
}

export function score(game, playerIndex) {
  return game.players[playerIndex].cards.filter(Boolean).length;
}

export function remainingTurns(game, playerIndex) {
  return game.goal === 'turns'
    ? Math.max(0, game.turnLimit - game.players[playerIndex].turnsTaken)
    : Infinity;
}

function finishByScore(game) {
  const first = score(game, 0), second = score(game, 1);
  game.winner = first === second ? 'tie' : first > second ? 0 : 1;
  game.phase = 'ended';
}

export function roll(game, value) {
  if (game.paused) return { ok: false, reason: 'paused' };
  if (game.phase !== 'roll') return { ok: false, reason: 'invalid-state' };
  if (remainingTurns(game, game.current) === 0) return { ok: false, reason: 'no-turns-left' };
  if (!Number.isInteger(value) || value < 1 || value > 6) return { ok: false, reason: 'invalid-roll' };
  game.rolled = value;
  game.phase = 'choose';
  return { ok: true, value };
}

export function select(game, index) {
  if (game.paused) return { ok: false, reason: 'paused' };
  if (game.phase !== 'choose') return { ok: false, reason: 'invalid-state' };
  if (remainingTurns(game, game.current) === 0) return { ok: false, reason: 'no-turns-left' };
  if (!Number.isInteger(index) || index < 0 || index > 5) return { ok: false, reason: 'invalid-card' };
  if (index !== game.rolled - 1) return { ok: false, reason: 'wrong-card' };

  const player = game.players[game.current];
  player.cards[index] = !player.cards[index];
  player.turnsTaken++;
  game.phase = 'between';

  if (game.goal === 'race' && score(game, game.current) === 6) {
    game.phase = 'ended';
    game.winner = game.current;
  } else if (game.goal === 'turns' && game.players.every(p => p.turnsTaken >= game.turnLimit)) {
    finishByScore(game);
  }
  return { ok: true, turnedDown: player.cards[index], finished: game.phase === 'ended' };
}

export function advanceTurn(game) {
  if (game.paused) return { ok: false, reason: 'paused' };
  if (game.phase !== 'between') return { ok: false, reason: 'invalid-state' };

  const other = 1 - game.current;
  if (remainingTurns(game, other) > 0) {
    game.current = other;
  } else if (remainingTurns(game, game.current) === 0) {
    // Also handle restored states whose players have used unequal turn counts.
    finishByScore(game);
    return { ok: true, current: game.current, finished: true };
  }
  game.rolled = null;
  game.phase = 'roll';
  return { ok: true, current: game.current };
}

export function pause(game) {
  if (game.phase === 'ended' || game.paused) return { ok: false, reason: 'invalid-state' };
  game.paused = true;
  return { ok: true };
}

export function resume(game) {
  if (game.phase === 'ended' || !game.paused) return { ok: false, reason: 'invalid-state' };
  game.paused = false;
  return { ok: true };
}
