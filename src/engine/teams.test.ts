import { MODES } from './modes';
import { createGame } from './reducer';
import type { SeatColor } from './seats';
import type { GameState } from './state';
import { standings, teamTotals } from './teams';
import { TEST_POOL, testConfig } from './testConfig';

const withScores = (s: GameState, scores: number[]): GameState => ({ ...s, players: s.players.map((p, i) => ({ ...p, score: scores[i] })) });
const three = ['pink', 'sky', 'yellow'].map((c, i) => ({ name: `P${i}`, color: c as SeatColor, cardSize: 5 }));

test('동점은 같은 순위이고 함께 우승', () => {
  const st = standings(withScores(createGame(testConfig({ players: three }), TEST_POOL, MODES), [5, 7, 7]));
  expect(st.map(x => [x.label, x.rank, x.winner])).toEqual([['P1', 1, true], ['P2', 1, true], ['P0', 3, false]]);
});
test('팀전은 팀 합계로 순위를 매긴다', () => {
  const s = withScores(createGame(testConfig({ players: three, teams: [0, 0, 1] }), TEST_POOL, MODES), [2, 3, 4]);
  expect(standings(s).map(x => [x.label, x.value, x.players])).toEqual([['A팀', 5, [0, 1]], ['B팀', 4, [2]]]);
  expect(teamTotals(s)).toEqual([5, 4]);
});
test('팀전이 아니면 teamTotals는 null', () => {
  expect(teamTotals(createGame(testConfig(), TEST_POOL, MODES))).toBeNull();
});
test('폭탄 돌리기는 적게 든 쪽이 위이고, 가장 많이 든 쪽이 폭탄', () => {
  const st = standings(withScores(createGame(testConfig({ mode: 'bomb', players: three }), TEST_POOL, MODES), [0, 6, 3]));
  expect(st.map(x => [x.label, x.winner, x.bomb])).toEqual([['P0', true, false], ['P2', false, false], ['P1', false, true]]);
});
test('폭탄 팀전은 0장이 된 사람의 팀이 이긴다', () => {
  const s = withScores(createGame(testConfig({ mode: 'bomb', players: three, teams: [0, 0, 1] }), TEST_POOL, MODES), [0, 9, 2]);
  expect(standings(s)[0]).toMatchObject({ label: 'A팀', winner: true, rank: 1 });
  expect(standings(s)[1]).toMatchObject({ label: 'B팀', winner: false, bomb: true });
});
test('서바이벌은 찾은 개수 하나를 돌려준다', () => {
  const s = createGame(testConfig({ mode: 'soloSurvival', players: [three[0]] }), TEST_POOL, MODES);
  expect(standings({ ...s, mode: { ...s.mode, correct: 12 } })).toEqual([
    { rank: 1, label: 'P0', players: [0], value: 12, winner: true, bomb: false },
  ]);
});
test('협동 순위는 우리 팀 하나이고 값은 단계', () => {
  const s = createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES);
  expect(standings({ ...s, coop: { ...s.coop!, stage: 4 } })).toEqual([
    { rank: 1, label: '우리 팀', players: [0, 1], value: 4, winner: true, bomb: false },
  ]);
});
