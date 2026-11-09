import { generateRound } from './cardGen';
import { createRng } from './rng';
import { LOCK_MS, type Action, type GameConfig, type GameEvent, type GameState, type ModeTable, type RoundState } from './state';

const ROUND_SEED_STEP = 7919;

export function makeRound(config: GameConfig, pool: string[], index: number): RoundState {
  const r = generateRound({
    pool,
    playerSizes: config.players.map(p => p.cardSize),
    rng: createRng(config.seed + index * ROUND_SEED_STEP),
  });
  return { index, center: r.center, cards: r.playerCards, answers: r.answers, rotation: (index * config.rotationStep) % 360 };
}

export function createGame(config: GameConfig, pool: string[], modes: ModeTable): GameState {
  return {
    config,
    pool,
    now: 0,
    phase: 'playing',
    players: config.players.map(() => ({ score: 0, lockedUntil: 0 })),
    round: makeRound(config, pool, 0),
    mode: modes[config.mode].init(config),
  };
}

export function reduce(s: GameState, a: Action, modes: ModeTable): { state: GameState; events: GameEvent[] } {
  if (s.phase !== 'playing') return { state: s, events: [] };
  const mode = modes[s.config.mode];
  const events: GameEvent[] = [];
  let state = s;

  if (a.type === 'TICK') {
    state = mode.onTick({ ...s, now: s.now + a.dt }, a.dt);
  } else {
    const p = s.players[a.player];
    const ignored =
      !p || a.round !== s.round.index || s.now < p.lockedUntil || !s.round.cards[a.player].includes(a.symbol);
    if (ignored) return { state: s, events: [] };

    if (a.symbol === s.round.answers[a.player]) {
      const res = mode.onCorrect(s, a.player);
      state = res.state;
      events.push({ type: 'correct', player: a.player, symbol: a.symbol });
      if (res.nextRound) {
        const index = state.round.index + 1;
        state = { ...state, round: makeRound(state.config, state.pool, index) };
        events.push({ type: 'round', index });
      }
    } else {
      const players = s.players.map((pl, i) => (i === a.player ? { ...pl, lockedUntil: s.now + LOCK_MS } : pl));
      state = mode.onWrong({ ...s, players }, a.player);
      events.push({ type: 'wrong', player: a.player });
    }
  }

  if (mode.isOver(state)) {
    state = { ...state, phase: 'over' };
    events.push({ type: 'over' });
  }
  return { state, events };
}
