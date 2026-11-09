import { createRng } from '../rng';
import { ROUND_SEED_STEP, type GameEvent, type GameState, type Mode } from '../state';
import { opponentsOf } from '../teams';

/** 넘길 사람을 직접 고를 수 있는 시간 */
export const CHOOSE_TIMEOUT_MS = 3000;
const TARGET_SEED = 700001;

type Step = { state: GameState; events: GameEvent[] };

export function pendingChoice(s: GameState): { from: number; count: number; until: number } | null {
  if (s.config.mode !== 'bomb' || s.mode.pendingFrom < 0) return null;
  return { from: s.mode.pendingFrom, count: s.mode.pendingCount, until: s.mode.pendingUntil };
}

const clearPending = (s: GameState): GameState => ({ ...s, mode: { ...s.mode, pendingFrom: -1, pendingCount: 0, pendingUntil: 0 } });

/** from이 to에게 카드를 넘긴다. 가진 장수보다 많이 넘기지 않는다 */
function give(s: GameState, from: number, to: number, count: number): Step {
  const n = Math.min(count, s.players[from].score);
  if (n <= 0) return { state: s, events: [] };
  const players = s.players.map((p, i) => (i === from ? { ...p, score: p.score - n } : i === to ? { ...p, score: p.score + n } : p));
  return { state: { ...s, players }, events: [{ type: 'give', from, to, count: n }] };
}

function randomTarget(s: GameState, from: number): number {
  return createRng(s.config.seed + s.round.index * ROUND_SEED_STEP + TARGET_SEED + from).pick(opponentsOf(s, from));
}

/** 대기 중인 넘기기를 무작위 대상에게 처리한다 */
function resolveRandomly(s: GameState): Step {
  const p = pendingChoice(s);
  if (!p) return { state: s, events: [] };
  return give(clearPending(s), p.from, randomTarget(s, p.from), p.count);
}

export function chooseTarget(s: GameState, player: number, target: number): Step {
  const p = pendingChoice(s);
  if (!p || p.from !== player || !opponentsOf(s, player).includes(target)) return { state: s, events: [] };
  return give(clearPending(s), player, target, p.count);
}

export const bomb: Mode = {
  init: () => ({ pendingFrom: -1, pendingCount: 0, pendingUntil: 0 }),
  initPlayer: config => ({ score: config.bomb.startHand }),
  onCorrect: (s, player, value) => {
    const first = resolveRandomly(s);
    let state = first.state;
    const events = [...first.events];
    // 이전 넘기기로 누군가 0장이 되었으면 게임이 끝나므로 더 넘기지 않는다
    if (state.players.some(p => p.score <= 0)) return { state, nextRound: true, events };
    const count = Math.min(value, state.players[player].score);
    // 마지막 라운드에서는 기다리지 않고 바로 넘겨서 게임이 제때 끝나게 한다
    const lastRound = state.round.index >= state.config.scoreRounds - 1;
    // 상대가 한 명뿐이면 고를 필요가 없으니 바로 넘긴다
    const onlyOne = opponentsOf(state, player).length === 1;
    if (count > 0) {
      if (state.config.bomb.target === 'random' || lastRound || onlyOne) {
        const r = give(state, player, randomTarget(state, player), count);
        state = r.state;
        events.push(...r.events);
      } else {
        state = { ...state, mode: { ...state.mode, pendingFrom: player, pendingCount: count, pendingUntil: state.now + CHOOSE_TIMEOUT_MS } };
      }
    }
    return { state, nextRound: true, events };
  },
  onWrong: s => s,
  onTick: s => (pendingChoice(s) && s.now >= s.mode.pendingUntil ? resolveRandomly(s) : { state: s }),
  isOver: s =>
    !pendingChoice(s) && (s.players.some(p => p.score <= 0) || s.round.index >= s.config.scoreRounds),
};
