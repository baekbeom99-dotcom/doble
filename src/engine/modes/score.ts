import type { Mode } from '../state';

export const score: Mode = {
  init: () => ({}),
  onCorrect: (s, player) => ({
    state: { ...s, players: s.players.map((p, i) => (i === player ? { ...p, score: p.score + 1 } : p)) },
    nextRound: true,
  }),
  onWrong: s => s,
  onTick: s => s,
  isOver: s => s.round.index >= s.config.scoreRounds,
};
