import type { SymbolDef } from '../../content/types';
import { createRng } from '../rng';
import { ROUND_SEED_STEP, type GameConfig, type GameEvent, type GameState, type Mission, type RewardId } from '../state';
import { applyDamage, HEARTS_MAX, setCoop } from './monster';

export const MISSION_TARGET = 3;
/** 미션을 해내면 주는 큰 피해 (최대 체력 대비) */
export const MISSION_RATIO = 0.4;
const MISSION_SEED = 800003;
const REWARDS: readonly RewardId[] = ['heal', 'special'];

type Step = { state: GameState; events: GameEvent[] };

const unique = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
const label = (s: SymbolDef) => (s.display.kind === 'text' ? s.display.value : s.speech);

export function missionDamage(maxHp: number): number {
  return Math.ceil(MISSION_RATIO * maxHp);
}

/** 몬스터 단계마다 하나씩 붙는 학습 미션. 혼자 하는 몬스터 사냥에는 미션이 없다 */
export function makeMission(config: GameConfig, symbols: SymbolDef[], stage: number): Mission {
  const rng = createRng(config.seed + stage * ROUND_SEED_STEP + MISSION_SEED);
  const reward = rng.pick(REWARDS);
  const base = { target: MISSION_TARGET, progress: 0, reward, done: false };
  if (config.players.length === 1) return { ...base, text: '', ids: [] };
  if (config.set.kind === 'syllable') {
    const key = config.set.batchim ? 'final' : 'vowel';
    const values = unique(symbols.map(s => s.tags[key]));
    if (values.length > 0) {
      const v = rng.pick(values);
      const ids = symbols.filter(s => s.tags[key] === v).map(s => s.id);
      const text = key === 'final' ? `받침 ${v}가 있는 글자 ${MISSION_TARGET}번 찾기` : `모음 ${v}가 들어간 글자 ${MISSION_TARGET}번 찾기`;
      return { ...base, text, ids };
    }
  }
  const x = rng.pick(symbols);
  return { ...base, text: `'${label(x)}' ${MISSION_TARGET}번 찾기`, ids: [x.id] };
}

/** 미션 보상: 언제나 큰 피해를 주고, 하트 보상이면 하트도 하나 늘어난다 */
export function applyReward(s: GameState, reward: RewardId): Step {
  const c = s.coop!;
  const healed = reward === 'heal' ? setCoop(s, { hearts: Math.min(HEARTS_MAX, c.hearts + 1) }) : s;
  return applyDamage(healed, missionDamage(c.maxHp), false);
}

/** 정답 글자가 미션 대상이면 진행도를 올리고, 완료되면 보상을 적용한다 */
export function missionProgress(s: GameState, symbol: string): Step {
  const m = s.coop!.mission;
  if (m.done || !m.ids.includes(symbol)) return { state: s, events: [] };
  const progress = m.progress + 1;
  if (progress < m.target) return { state: setCoop(s, { mission: { ...m, progress } }), events: [] };
  const done = setCoop(s, { mission: { ...m, progress, done: true } });
  const r = applyReward(done, m.reward);
  return { state: r.state, events: [{ type: 'missionDone', reward: m.reward }, ...r.events] };
}
