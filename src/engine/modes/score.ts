import type { Mode } from '../state';

/** 맞힌 값만큼 score를 올리고, scoreRounds 라운드가 끝나면 종료하는 공통 규칙 */
export const pointsMode: Mode = {
  init: () => ({}),
  onCorrect: (s, player, value) => ({
    state: { ...s, players: s.players.map((p, i) => (i === player ? { ...p, score: p.score + value } : p)) },
    nextRound: true,
  }),
  onWrong: s => s,
  onTick: s => ({ state: s }),
  isOver: s => s.round.index >= s.config.scoreRounds,
};

export const score: Mode = pointsMode;
