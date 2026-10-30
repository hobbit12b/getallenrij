import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, roll, select, advanceTurn, score, remainingTurns, pause, resume } from '../engine.mjs';

function play(game, value) {
  assert.equal(roll(game, value).ok, true);
  return select(game, value - 1);
}

test('players have independent ordered cards; wrong choices do not consume a turn', () => {
  const game = createGame({goal:'turns'});
  roll(game, 5);
  assert.deepEqual(select(game, 3), {ok:false, reason:'wrong-card'});
  assert.equal(game.players[0].turnsTaken, 0);
  assert.equal(remainingTurns(game, 0), 10);
  assert.equal(game.current, 0);
  assert.equal(game.phase, 'choose');
  assert.equal(select(game, 4).turnedDown, true);
  assert.deepEqual(game.players[0].cards, [false, false, false, false, true, false]);
  assert.equal(game.players[0].turnsTaken, 1);
  assert.equal(score(game, 1), 0);
  assert.equal(game.players[1].turnsTaken, 0);
});

test('a repeated throw turns the same hidden card back and still uses one turn', () => {
  const game = createGame({goal:'turns'});
  play(game, 5); advanceTurn(game);
  play(game, 1); advanceTurn(game);
  assert.equal(play(game, 5).turnedDown, false);
  assert.equal(score(game, 0), 0);
  assert.equal(score(game, 1), 1);
  assert.equal(game.players[0].turnsTaken, 2);
  assert.equal(remainingTurns(game, 0), 8);
});

test('race ends immediately when one player turns all six cards down', () => {
  const game = createGame();
  for (let value = 1; value <= 6; value++) {
    const result = play(game, value);
    assert.equal(result.finished, value === 6);
    if (value < 6) {
      advanceTurn(game); play(game, 1); advanceTurn(game);
    }
  }
  assert.equal(game.winner, 0);
  assert.equal(game.phase, 'ended');
  assert.equal(game.players[0].turnsTaken, 6);
  assert.equal(game.players[1].turnsTaken, 5);
  assert.equal(remainingTurns(game, 0), Infinity);
  assert.equal(advanceTurn(game).ok, false);
  assert.equal(roll(game, 4).ok, false);
});

test('one-turn mode waits for the second player and allows a tie', () => {
  const game = createGame({goal:'turns', turnLimit:1});
  assert.equal(play(game, 2).finished, false);
  assert.equal(game.winner, null);
  assert.equal(remainingTurns(game, 0), 0);
  advanceTurn(game);
  assert.equal(game.current, 1);
  assert.equal(play(game, 6).finished, true);
  assert.deepEqual(game.players.map(p=>p.turnsTaken), [1,1]);
  assert.equal(game.winner, 'tie');
  assert.equal(game.phase, 'ended');
  assert.equal(remainingTurns(game, 1), 0);
});

test('ten-turn mode continues at six cards down and judges only after both tenth turns', () => {
  const game = createGame({goal:'turns'});
  const first = [1,2,3,4,5,6,1,2,1,2];
  for (let turn = 0; turn < 10; turn++) {
    assert.equal(game.current, 0);
    assert.equal(play(game, first[turn]).finished, false);
    assert.equal(game.winner, null);
    if (turn === 5) assert.equal(score(game, 0), 6);
    if (turn === 9) assert.deepEqual(game.players.map(p=>p.turnsTaken), [10,9]);
    advanceTurn(game);
    assert.equal(game.current, 1);
    assert.equal(play(game, 1).finished, turn === 9);
    if (turn < 9) advanceTurn(game);
  }
  assert.deepEqual(game.players.map(p=>p.turnsTaken), [10,10]);
  assert.equal(score(game, 0), 6);
  assert.equal(score(game, 1), 0);
  assert.equal(game.winner, 0);
  assert.equal(roll(game, 1).ok, false);
});

test('second player can win fixed-turn mode', () => {
  const game = createGame({goal:'turns', turnLimit:2});
  play(game, 1); advanceTurn(game);
  play(game, 2); advanceTurn(game);
  play(game, 1); advanceTurn(game);
  assert.equal(play(game, 3).finished, true);
  assert.equal(score(game, 0), 0);
  assert.equal(score(game, 1), 2);
  assert.equal(game.winner, 1);
});

test('equal empty scores after ten turns also produce a tie', () => {
  const game = createGame({goal:'turns'});
  for (let turn = 0; turn < 20; turn++) {
    play(game, 4);
    if (turn < 19) advanceTurn(game);
  }
  assert.equal(game.winner, 'tie');
  assert.deepEqual(game.players.map(p=>p.turnsTaken), [10,10]);
  assert.equal(score(game, 0), 0);
  assert.equal(score(game, 1), 0);
});

test('turn advance skips an exhausted player if saved counts are unequal', () => {
  const game = createGame({goal:'turns', turnLimit:2});
  game.players[1].turnsTaken = 2;
  play(game, 1);
  assert.deepEqual(advanceTurn(game), {ok:true, current:0});
  assert.equal(play(game, 2).finished, true);
  assert.deepEqual(game.players.map(p=>p.turnsTaken), [2,2]);
  assert.equal(game.winner, 0);
});

test('double taps and malformed input never add extra turns', () => {
  const game = createGame({goal:'turns'});
  assert.equal(select(game, 0).ok, false);
  assert.equal(advanceTurn(game).ok, false);
  for (const value of [0,7,NaN,1.5,'1']) assert.equal(roll(game, value).ok, false);
  roll(game, 2);
  assert.equal(roll(game, 3).ok, false);
  assert.equal(select(game, 10).ok, false);
  assert.equal(select(game, '1').ok, false);
  assert.equal(select(game, 0).ok, false);
  assert.equal(game.players[0].turnsTaken, 0);
  select(game, 1);
  assert.equal(select(game, 1).ok, false);
  assert.equal(game.players[0].turnsTaken, 1);
  assert.equal(score(game, 0), 1);
  advanceTurn(game);
  assert.equal(advanceTurn(game).ok, false);
  assert.equal(game.current, 1);
});

test('paused actions preserve a pending choice without consuming turns', () => {
  const game = createGame({goal:'turns'});
  roll(game, 4);
  pause(game);
  assert.equal(select(game, 3).ok, false);
  assert.equal(roll(game, 2).ok, false);
  assert.equal(advanceTurn(game).ok, false);
  assert.equal(remainingTurns(game, 0), 10);
  resume(game);
  assert.equal(game.phase, 'choose');
  assert.equal(select(game, 3).ok, true);
  assert.equal(remainingTurns(game, 0), 9);
  assert.equal('deadline' in game, false);
  assert.equal('remainingMs' in game, false);
});

test('invalid modes and nonpositive or fractional turn limits are rejected', () => {
  assert.throws(()=>createGame({goal:'timer'}), RangeError);
  assert.throws(()=>createGame({mode:'invalid'}), RangeError);
  for (const turnLimit of [0,-1,1.5,Infinity,NaN,'10']) {
    assert.throws(()=>createGame({goal:'turns',turnLimit}), RangeError);
  }
});

