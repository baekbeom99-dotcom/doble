import type { GameState } from './state';

/** 팀전이면 상대 팀 전원, 아니면 나를 뺀 모두 */
export function opponentsOf(s: GameState, player: number): number[] {
  const teams = s.config.teams;
  return s.players
    .map((_, i) => i)
    .filter(i => i !== player && (!teams || teams[i] !== teams[player]));
}
