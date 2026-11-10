import { flowingDt, SOLO_FIELDS, soloCorrect, soloWrong } from '../solo/scoring';
import type { Mode } from '../state';

export const SURVIVAL_START_MS = 30000;
const BONUS_MS = 1000;
const PENALTY_MS = 2000;

export const soloSurvival: Mode = {
  init: () => ({ ...SOLO_FIELDS, timeLeft: SURVIVAL_START_MS }),
  onCorrect: s => {
    const { mode, events } = soloCorrect(s);
    return { state: { ...s, mode: { ...mode, timeLeft: mode.timeLeft + BONUS_MS } }, nextRound: true, events };
  },
  onWrong: s => ({ ...s, mode: { ...soloWrong(s.mode), timeLeft: s.mode.timeLeft - PENALTY_MS } }),
  onTick: (s, dt) => ({ state: { ...s, mode: { ...s.mode, timeLeft: s.mode.timeLeft - flowingDt(s, dt) } } }),
  isOver: s => s.mode.timeLeft <= 0,
};
