import { createRng } from '../rng';
import { ROUND_SEED_STEP, type GameEvent, type GameState } from '../state';
import { setCoop } from './monster';

/** 불을 맞고 조작할 수 없는 최대 시간. 이 안에 못 풀면 하트를 잃는다 */
export const FIRE_MS = 5000;
/** 다른 친구들이 이만큼 맞히면 불이 꺼진다 */
export const RESCUE_NEED = 2;
const MIN_DELAY = 8000;
const DELAY_SPREAD = 4000;
const STAGE_SPEEDUP = 0.95;
const DELAY_FLOOR = 5000;
const FIRE_SEED = 900001;
const COUNT_STEP = 31;

type Step = { state: GameState; events: GameEvent[] };

/** 다음 불 공격까지의 시간: 1단계 8~12초, 단계마다 5%씩 짧아지고 5초보다 짧아지지 않는다 */
export function attackDelay(seed: number, stage: number, count: number): number {
  const rng = createRng(seed + stage * ROUND_SEED_STEP + FIRE_SEED + count * COUNT_STEP);
  const base = MIN_DELAY + rng.next() * DELAY_SPREAD;
  return Math.max(DELAY_FLOOR, Math.round(base * STAGE_SPEEDUP ** (stage - 1)));
}

/** 이 사람이 지금 불을 맞고 있는지 */
export function isBurning(s: GameState, player: number): boolean {
  return s.coop?.fire?.target === player;
}

export function startFire(s: GameState): Step {
  const c = s.coop!;
  const rng = createRng(s.config.seed + c.stage * ROUND_SEED_STEP + FIRE_SEED + c.attackCount * COUNT_STEP + 1);
  const target = rng.int(0, s.players.length - 1);
  return {
    state: setCoop(s, { fire: { target, got: 0, timeLeft: FIRE_MS }, attackLeft: 0 }),
    events: [{ type: 'fireStart', target }],
  };
}

/** 불을 끝내고 다음 공격을 준비한다. 못 풀었으면 하트를 잃는다 */
function endFire(s: GameState, rescued: boolean): Step {
  const c = s.coop!;
  const target = c.fire!.target;
  const attackCount = c.attackCount + 1;
  const delay = attackDelay(s.config.seed, c.stage, attackCount);
  const next = setCoop(s, { fire: null, attackCount, attackLeft: delay, attackTotal: delay });
  if (rescued) return { state: next, events: [{ type: 'fireRescue', target }] };
  return { state: setCoop(next, { hearts: c.hearts - 1 }), events: [{ type: 'fireBurn', target }, { type: 'heartLost' }] };
}

/** 불이 붙은 동안 다른 친구가 맞혔을 때 */
export function fireCorrect(s: GameState, player: number): Step {
  const fire = s.coop!.fire!;
  if (player === fire.target) return { state: s, events: [] };
  const got = fire.got + 1;
  if (got >= RESCUE_NEED) return endFire(s, true);
  return { state: setCoop(s, { fire: { ...fire, got } }), events: [] };
}

export function tickFire(s: GameState, dt: number): Step {
  const fire = s.coop!.fire!;
  const timeLeft = fire.timeLeft - dt;
  if (timeLeft <= 0) return endFire(s, false);
  return { state: setCoop(s, { fire: { ...fire, timeLeft } }), events: [] };
}
