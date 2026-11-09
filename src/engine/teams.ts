import type { GameState } from './state';

/** 팀전이면 상대 팀 전원, 아니면 나를 뺀 모두 */
export function opponentsOf(s: GameState, player: number): number[] {
  const teams = s.config.teams;
  return s.players
    .map((_, i) => i)
    .filter(i => i !== player && (!teams || teams[i] !== teams[player]));
}

export const TEAM_NAMES = ['A팀', 'B팀'] as const;

export interface Standing {
  /** 공동 순위는 같은 수 (1, 1, 3 …) */
  rank: number;
  label: string;
  players: number[];
  /** 점수·탑 높이·장수 (팀이면 합계) */
  value: number;
  winner: boolean;
  /** 폭탄 돌리기에서 진 쪽 중 가장 많이 든 항목 */
  bomb: boolean;
}

export function teamTotals(s: GameState): number[] | null {
  const teams = s.config.teams;
  if (!teams) return null;
  return TEAM_NAMES.map((_, t) => s.players.reduce((sum, p, i) => sum + (teams[i] === t ? p.score : 0), 0));
}

type Entry = Omit<Standing, 'rank' | 'winner' | 'bomb'>;

function entries(s: GameState): Entry[] {
  const { config } = s;
  if (config.mode === 'soloSurvival') return [{ label: config.players[0].name, players: [0], value: s.mode.correct }];
  const teams = config.teams;
  if (teams) {
    return TEAM_NAMES.map((label, t) => {
      const players = config.players.map((_, i) => i).filter(i => teams[i] === t);
      return { label, players, value: players.reduce((sum, i) => sum + s.players[i].score, 0) };
    });
  }
  return config.players.map((p, i) => ({ label: p.name, players: [i], value: s.players[i].score }));
}

/** 결과 순위. 폭탄 돌리기는 적게 든 쪽이 위이고, 0장인 사람이 있는 팀이 1위다 */
export function standings(s: GameState): Standing[] {
  const isBomb = s.config.mode === 'bomb';
  const list = entries(s);
  const key = (e: Entry) => {
    if (!isBomb) return -e.value;
    return e.players.some(i => s.players[i].score <= 0) ? -Infinity : e.value;
  };
  const ranked = [...list]
    .sort((a, b) => key(a) - key(b))
    .map(e => ({ ...e, rank: 1 + list.filter(o => key(o) < key(e)).length }));
  const losers = ranked.filter(e => e.rank !== 1);
  const worst = Math.max(...losers.map(e => e.value));
  return ranked.map(e => ({ ...e, winner: e.rank === 1, bomb: isBomb && e.rank !== 1 && e.value === worst }));
}
