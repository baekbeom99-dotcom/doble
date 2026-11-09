import type { CoopState, GameEvent, GameState, Mission } from '../state';

export const HEARTS_START = 3;
export const HEARTS_MAX = 5;
/** 오답일 때 공격까지 남은 시간이 줄어드는 양 */
export const WRONG_PENALTY_MS = 1500;

type Step = { state: GameState; events: GameEvent[] };

export function monsterHp(stage: number, players: number): number {
  return (8 + 4 * (stage - 1)) * players;
}

export function attackEvery(stage: number): number {
  return Math.max(8000, Math.round(20000 * 0.9 ** (stage - 1)));
}

export function setCoop(s: GameState, patch: Partial<CoopState>): GameState {
  return { ...s, coop: { ...s.coop!, ...patch } };
}

/** 새 단계의 몬스터. 미션은 newMission이 만든다 (없으면 완료된 빈 미션) */
export function freshMonster(stage: number, players: number, mission: Mission): Partial<CoopState> {
  const hp = monsterHp(stage, players);
  return {
    stage,
    hp,
    maxHp: hp,
    attackLeft: attackEvery(stage),
    answered: Array.from({ length: players }, () => false),
    challenge: null,
    mission,
  };
}

/** 미션을 아직 만들 수 없을 때 쓰는 빈 미션 */
export const NO_MISSION: Mission = { text: '', ids: [], target: 3, progress: 0, reward: 'heal', done: true };

/** 피해를 주고, 체력이 0이 되면 단계를 올려 새 몬스터·새 미션을 만든다 */
export function applyDamage(s: GameState, amount: number, combo: boolean): Step {
  const c = s.coop!;
  const events: GameEvent[] = [{ type: 'damage', amount, combo }];
  const hp = c.hp - amount;
  if (hp > 0) return { state: setCoop(s, { hp }), events };
  const stage = c.stage + 1;
  events.push({ type: 'monsterDown', stage: c.stage });
  return { state: setCoop(s, freshMonster(stage, s.players.length, NO_MISSION)), events };
}
