import type { SymbolDef } from '../../content/types';
import { createRng } from '../rng';
import { ROUND_SEED_STEP, type GameConfig, type GameEvent, type GameState, type Mission, type RewardId } from '../state';
import { applyDamage, HEARTS_MAX, setCoop } from './monster';

export const MISSION_TARGET = 3;
export const SPECIAL_RATIO = 0.3;
export const BONUS_DAMAGE = 5;
const MISSION_SEED = 800003;
const REWARDS: readonly RewardId[] = ['heal', 'bonus', 'special'];

type Step = { state: GameState; events: GameEvent[] };

const unique = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];
const label = (s: SymbolDef) => (s.display.kind === 'text' ? s.display.value : s.speech);

/** 몬스터 단계마다 하나씩 붙는 학습 미션 */
export function makeMission(config: GameConfig, symbols: SymbolDef[], stage: number): Mission {
  const rng = createRng(config.seed + stage * ROUND_SEED_STEP + MISSION_SEED);
  const reward = rng.pick(REWARDS);
  const base = { target: MISSION_TARGET, progress: 0, reward, done: false };
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

export function applyReward(s: GameState, reward: RewardId): Step {
  const c = s.coop!;
  if (reward === 'heal') return { state: setCoop(s, { hearts: Math.min(HEARTS_MAX, c.hearts + 1) }), events: [] };
  const amount = reward === 'bonus' ? BONUS_DAMAGE : Math.ceil(SPECIAL_RATIO * c.maxHp);
  return applyDamage(s, amount, false);
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
