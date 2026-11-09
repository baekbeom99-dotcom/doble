import type { Mode } from '../state';

export const score: Mode = {
  init: () => ({}),
  onCorrect: (s, player, value) => ({
    state: { ...s, players: s.players.map((p, i) => (i === player ? { ...p, score: p.score + value } : p)) },
    nextRound: true,
  }),
  onWrong: s => s,
  onTick: s => ({ state: s }),
  isOver: s => s.round.index >= s.config.scoreRounds,
};
