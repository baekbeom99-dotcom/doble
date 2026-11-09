import type { GameState } from '../state';

/** 이번 정답을 포함한 연속 횟수가 이 이상이면 값이 2배 */
export const COMBO_FROM = 4;

export function comboMultiplier(s: GameState, player: number): number {
  if (!s.config.rules.combo) return 1;
  return s.players[player].streak + 1 >= COMBO_FROM ? 2 : 1;
}

/** 정답이면 맞힌 사람 +1, 나머지는 0. 오답이면 틀린 사람만 0 */
export function updateStreaks(s: GameState, player: number, correct: boolean): GameState {
  const players = s.players.map((p, i) => {
    if (correct) return { ...p, streak: i === player ? p.streak + 1 : 0 };
    return i === player ? { ...p, streak: 0 } : p;
  });
  return { ...s, players };
}
