import { flowingDt, SOLO_FIELDS, soloCorrect, soloWrong } from '../solo/scoring';
import type { Mode } from '../state';

/** 설정에서 고르지 않았을 때의 제한 시간 (초) */
export const SURVIVAL_DEFAULT_S = 40;
const BONUS_MS = 5000;
const PENALTY_MS = 2000;

export const soloSurvival: Mode = {
  init: config => ({ ...SOLO_FIELDS, timeLeft: (config.timeLimit ?? SURVIVAL_DEFAULT_S) * 1000 }),
  onCorrect: s => {
    const { mode, events } = soloCorrect(s);
    return { state: { ...s, mode: { ...mode, timeLeft: mode.timeLeft + BONUS_MS } }, nextRound: true, events };
  },
  onWrong: s => ({ ...s, mode: { ...soloWrong(s.mode), timeLeft: s.mode.timeLeft - PENALTY_MS } }),
  onTick: (s, dt) => ({ state: { ...s, mode: { ...s.mode, timeLeft: s.mode.timeLeft - flowingDt(s, dt) } } }),
  isOver: s => s.mode.timeLeft <= 0,
};
