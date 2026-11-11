import type { CoopState, GameEvent, GameState, Mission } from '../state';
import { attackDelay } from './fire';
import { makeMission } from './missions';

export const HEARTS_START = 3;
export const HEARTS_MAX = 5;
/** 혼자 할 때 이만큼 맞힐 때마다 하트가 1개 회복된다 */
export const HEAL_EVERY = 5;
/** 오답일 때 공격까지 남은 시간이 줄어드는 양 */
export const WRONG_PENALTY_MS = 1500;

type Step = { state: GameState; events: GameEvent[] };

export function monsterHp(stage: number, players: number): number {
  return (8 + 4 * (stage - 1)) * players;
}

export function setCoop(s: GameState, patch: Partial<CoopState>): GameState {
  return { ...s, coop: { ...s.coop!, ...patch } };
}

/** 새 단계의 몬스터와 미션. 불 공격 중에 쓰러뜨리면 불도 꺼진다 */
export function freshMonster(stage: number, players: number, mission: Mission, seed: number, attackCount: number): Partial<CoopState> {
  const hp = monsterHp(stage, players);
  const delay = attackDelay(seed, stage, attackCount);
  return {
    stage,
    hp,
    maxHp: hp,
    attackLeft: delay,
    attackTotal: delay,
    answered: Array.from({ length: players }, () => false),
    fire: null,
    mission,
  };
}

/** 피해를 주고, 체력이 0이 되면 단계를 올려 새 몬스터·새 미션을 만든다 */
export function applyDamage(s: GameState, amount: number, combo: boolean): Step {
  const c = s.coop!;
  const events: GameEvent[] = [{ type: 'damage', amount, combo }];
  const hp = c.hp - amount;
  if (hp > 0) return { state: setCoop(s, { hp }), events };
  const stage = c.stage + 1;
  events.push({ type: 'monsterDown', stage: c.stage });
  return { state: setCoop(s, freshMonster(stage, s.players.length, makeMission(s.config, c.symbols, stage), s.config.seed, c.attackCount)), events };
}
