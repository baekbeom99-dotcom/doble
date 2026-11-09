import type { GameState } from '../state';
import { comboMultiplier } from './combo';

export function finalRoundMultiplier(s: GameState): number {
  return s.config.rules.finalRound && s.round.index === s.config.scoreRounds - 1 ? 3 : 1;
}

/** 정답 하나의 값: 1 × 콤보 × 막판 */
export function correctValue(s: GameState, player: number): number {
  return comboMultiplier(s, player) * finalRoundMultiplier(s);
}
