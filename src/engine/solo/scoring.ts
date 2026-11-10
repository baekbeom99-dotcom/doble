import type { GameEvent, GameState, Grade } from '../state';

export const GRADE_POINTS: Record<Grade, number> = { perfect: 3, great: 2, good: 1 };
const PERFECT_MS = 1500;
const GREAT_MS = 3000;
/** 연속 정답이 이 수의 배수가 될 때마다 피버 */
export const FEVER_EVERY = 5;
export const FEVER_MS = 5000;
export { DOUBLE_MS, TIME_STOP_MS } from '../modifiers/items';

/** 혼자 하기 모드 상태의 공통 필드 */
export const SOLO_FIELDS: Record<string, number> = {
  score: 0, correct: 0, streak: 0, roundAt: 0,
  feverUntil: 0, doubleUntil: 0, timeStopUntil: 0,
  perfect: 0, great: 0, good: 0, fevers: 0,
};

export function judge(reactionMs: number): Grade {
  if (reactionMs <= PERFECT_MS) return 'perfect';
  if (reactionMs <= GREAT_MS) return 'great';
  return 'good';
}

/** 정답 처리: 판정 → 점수(피버·2배 배율) → 연속 기록과 피버 */
export function soloCorrect(s: GameState): { mode: Record<string, number>; events: GameEvent[] } {
  const m = s.mode;
  const grade = judge(s.now - m.roundAt);
  const multiplier = (s.now < m.feverUntil ? 2 : 1) * (s.now < m.doubleUntil ? 2 : 1);
  const points = GRADE_POINTS[grade] * multiplier;
  const streak = m.streak + 1;
  const events: GameEvent[] = [{ type: 'grade', grade, points }];
  const mode = {
    ...m,
    score: m.score + points,
    correct: m.correct + 1,
    streak,
    roundAt: s.now,
    [grade]: m[grade] + 1,
  };
  if (streak % FEVER_EVERY === 0) {
    mode.feverUntil = s.now + FEVER_MS;
    mode.fevers = m.fevers + 1;
    events.push({ type: 'fever' });
  }
  return { mode, events };
}

export function soloWrong(mode: Record<string, number>): Record<string, number> {
  return { ...mode, streak: 0 };
}

/** 이번 TICK에서 실제로 흐른 시간 (시간 정지 구간 제외). s.now는 TICK 적용 후 시각 */
export function flowingDt(s: GameState, dt: number): number {
  const prev = s.now - dt;
  return Math.max(0, s.now - Math.max(prev, s.mode.timeStopUntil ?? 0));
}
