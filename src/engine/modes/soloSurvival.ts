import type { Mode } from '../state';

export const SURVIVAL_START_MS = 30000;
const BONUS_MS = 1000;
const PENALTY_MS = 2000;

export const soloSurvival: Mode = {
  init: () => ({ timeLeft: SURVIVAL_START_MS, correct: 0 }),
  onCorrect: s => ({
    state: { ...s, mode: { ...s.mode, timeLeft: s.mode.timeLeft + BONUS_MS, correct: s.mode.correct + 1 } },
    nextRound: true,
  }),
  onWrong: s => ({ ...s, mode: { ...s.mode, timeLeft: s.mode.timeLeft - PENALTY_MS } }),
  onTick: (s, dt) => ({ ...s, mode: { ...s.mode, timeLeft: s.mode.timeLeft - dt } }),
  isOver: s => s.mode.timeLeft <= 0,
};
