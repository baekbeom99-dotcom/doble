import { ROUND_SEED_STEP } from '../state';
import { createRng } from '../rng';
import type { GameEvent, GameState, ItemId, PlayerState } from '../state';
import { opponentsOf } from '../teams';

export const ITEM_CHANCE = 0.2;
export const ITEMS: readonly ItemId[] = ['freeze', 'swirl', 'hint', 'shield'];
/** 혼자 하기(서바이벌·스테이지)에서 나오는 아이템 */
export const SOLO_ITEMS: readonly ItemId[] = ['hint', 'timeStop', 'double'];
export const TIME_STOP_MS = 3000;
export const DOUBLE_MS = 10000;

/** 혼자 하기 점수 규칙을 쓰는 모드인지 */
export const isSoloScoring = (s: GameState) => s.config.mode.startsWith('solo');
export const FREEZE_MS = 2000;
export const SWIRL_MS = 3000;
const ITEM_SEED = 500009;

type Step = { state: GameState; events: GameEvent[] };

const setPlayer = (s: GameState, player: number, change: Partial<PlayerState>): GameState => ({
  ...s,
  players: s.players.map((p, i) => (i === player ? { ...p, ...change } : p)),
});

/** 정답을 맞힌 사람이 아이템이 없으면 확률적으로 하나 준다 */
export function maybeGrantItem(s: GameState, player: number): Step {
  if (!s.config.rules.items || s.players[player].item) return { state: s, events: [] };
  const rng = createRng(s.config.seed + s.round.index * ROUND_SEED_STEP + ITEM_SEED + player);
  if (rng.next() >= ITEM_CHANCE) return { state: s, events: [] };
  const item = rng.pick(isSoloScoring(s) ? SOLO_ITEMS : ITEMS);
  return { state: setPlayer(s, player, { item }), events: [{ type: 'gotItem', player, item }] };
}

/** 공격 아이템을 상대에게 적용한다. 방패를 든 상대는 방패를 잃고 공격을 막는다 */
function attack(s: GameState, player: number, hit: (p: PlayerState) => Partial<PlayerState>): Step {
  const events: GameEvent[] = [];
  let state = s;
  for (const o of opponentsOf(s, player)) {
    const target = state.players[o];
    if (target.item === 'shield') {
      state = setPlayer(state, o, { item: null });
      events.push({ type: 'blocked', player: o });
    } else {
      state = setPlayer(state, o, hit(target));
    }
  }
  return { state, events };
}

export function useItem(s: GameState, player: number): Step {
  const item = s.players[player].item;
  if (!item || item === 'shield') return { state: s, events: [] };

  let step: Step;
  if (item === 'freeze') step = attack(s, player, p => ({ lockedUntil: Math.max(p.lockedUntil, s.now + FREEZE_MS) }));
  else if (item === 'swirl') step = attack(s, player, () => ({ spinUntil: s.now + SWIRL_MS }));
  else if (item === 'timeStop') step = { state: { ...s, mode: { ...s.mode, timeStopUntil: s.now + TIME_STOP_MS } }, events: [] };
  else if (item === 'double') step = { state: { ...s, mode: { ...s.mode, doubleUntil: s.now + DOUBLE_MS } }, events: [] };
  else step = { state: setPlayer(s, player, { hintRound: s.round.index }), events: [] };

  return {
    state: setPlayer(step.state, player, { item: null }),
    events: [{ type: 'usedItem', player, item }, ...step.events],
  };
}
