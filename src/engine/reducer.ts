import { generateRound } from './cardGen';
import { updateStreaks } from './modifiers/combo';
import { correctValue } from './modifiers/finalRound';
import { maybeGrantItem, useItem } from './modifiers/items';
import { createRng } from './rng';
import {
  LOCK_MS,
  type Action,
  type GameConfig,
  type GameEvent,
  type GameState,
  type ModeTable,
  type PlayerState,
  type RoundState,
} from './state';

import { ROUND_SEED_STEP } from './state';
export { ROUND_SEED_STEP };

type Step = { state: GameState; events: GameEvent[] };

export function makeRound(config: GameConfig, pool: string[], index: number): RoundState {
  const r = generateRound({
    pool,
    playerSizes: config.players.map(p => p.cardSize),
    rng: createRng(config.seed + index * ROUND_SEED_STEP),
  });
  return { index, center: r.center, cards: r.playerCards, answers: r.answers, rotation: (index * config.rotationStep) % 360 };
}

const BLANK_PLAYER: PlayerState = { score: 0, lockedUntil: 0, streak: 0, item: null, spinUntil: 0, hintRound: -1 };

export function createGame(config: GameConfig, pool: string[], modes: ModeTable): GameState {
  const mode = modes[config.mode];
  return {
    config,
    pool,
    now: 0,
    phase: 'playing',
    players: config.players.map((_, i) => ({ ...BLANK_PLAYER, ...mode.initPlayer?.(config, i) })),
    round: makeRound(config, pool, 0),
    mode: mode.init(config),
  };
}

function nextRound(s: GameState): Step {
  const index = s.round.index + 1;
  return { state: { ...s, round: makeRound(s.config, s.pool, index) }, events: [{ type: 'round', index }] };
}

function handleTap(s: GameState, a: Extract<Action, { type: 'TAP' }>, modes: ModeTable): Step | null {
  const mode = modes[s.config.mode];
  const p = s.players[a.player];
  const ignored = !p || a.round !== s.round.index || s.now < p.lockedUntil || !s.round.cards[a.player].includes(a.symbol);
  if (ignored) return null;

  if (a.symbol !== s.round.answers[a.player]) {
    const players = s.players.map((pl, i) => (i === a.player ? { ...pl, lockedUntil: s.now + LOCK_MS } : pl));
    return { state: updateStreaks(mode.onWrong({ ...s, players }, a.player), a.player, false), events: [{ type: 'wrong', player: a.player }] };
  }

  const value = correctValue(s, a.player);
  const res = mode.onCorrect(s, a.player, value);
  const events: GameEvent[] = [{ type: 'correct', player: a.player, symbol: a.symbol, value }, ...(res.events ?? [])];
  const granted = maybeGrantItem(updateStreaks(res.state, a.player, true), a.player);
  let state = granted.state;
  events.push(...granted.events);
  if (res.nextRound) {
    const next = nextRound(state);
    state = next.state;
    events.push(...next.events);
  }
  return { state, events };
}

function handleTick(s: GameState, dt: number, modes: ModeTable): Step {
  const res = modes[s.config.mode].onTick({ ...s, now: s.now + dt }, dt);
  return { state: res.state, events: res.events ?? [] };
}

function handleUseItem(s: GameState, player: number): Step | null {
  const p = s.players[player];
  if (!p || s.now < p.lockedUntil) return null;
  const step = useItem(s, player);
  return step.events.length ? step : null;
}

export function reduce(s: GameState, a: Action, modes: ModeTable): Step {
  if (s.phase !== 'playing') return { state: s, events: [] };

  let step: Step | null = null;
  if (a.type === 'TAP') step = handleTap(s, a, modes);
  else if (a.type === 'TICK') step = handleTick(s, a.dt, modes);
  else if (a.type === 'USE_ITEM') step = handleUseItem(s, a.player);
  if (!step) return { state: s, events: [] };

  if (modes[s.config.mode].isOver(step.state)) {
    step = { state: { ...step.state, phase: 'over' }, events: [...step.events, { type: 'over' }] };
  }
  return step;
}
