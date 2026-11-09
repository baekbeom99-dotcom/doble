import { MODES } from '../modes';
import { createGame, reduce } from '../reducer';
import type { GameState } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';

const rules = { combo: true, finalRound: true, items: false };
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);
const wrongOf = (s: GameState, p: number) => s.round.cards[p].find(id => id !== s.round.answers[p])!;
const valueOf = (events: ReturnType<typeof tap>['events']) => (events[0] as { value: number }).value;

test('같은 사람이 4번째 연속 정답부터 2점', () => {
  let s = createGame(testConfig({ rules }), TEST_POOL, MODES);
  const values: number[] = [];
  for (let i = 0; i < 5; i++) { const r = tap(s, 0); values.push(valueOf(r.events)); s = r.state; }
  expect(values).toEqual([1, 1, 1, 2, 2]);
  expect(s.players[0].score).toBe(7);
});
test('다른 사람이 맞히면 콤보가 끊긴다', () => {
  let s = createGame(testConfig({ rules }), TEST_POOL, MODES);
  for (let i = 0; i < 3; i++) s = tap(s, 0).state;
  s = tap(s, 1).state;
  expect(s.players[0].streak).toBe(0);
  expect(s.players[1].streak).toBe(1);
});
test('틀리면 내 콤보만 끊긴다', () => {
  let s = createGame(testConfig({ rules }), TEST_POOL, MODES);
  s = tap(s, 0).state; s = tap(s, 0).state;
  s = reduce(s, { type: 'TAP', player: 1, symbol: wrongOf(s, 1), round: s.round.index }, MODES).state;
  expect(s.players[0].streak).toBe(2);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: s.round.index }, MODES).state;
  expect(s.players[0].streak).toBe(0);
});
test('마지막 라운드는 3배, 콤보와 겹치면 6', () => {
  let s = createGame(testConfig({ rules, scoreRounds: 5 }), TEST_POOL, MODES);
  for (let i = 0; i < 4; i++) s = tap(s, 0).state;
  expect(valueOf(tap(s, 0).events)).toBe(6);
});
test('규칙이 꺼져 있으면 항상 1', () => {
  let s = createGame(testConfig({ scoreRounds: 5 }), TEST_POOL, MODES);
  for (let i = 0; i < 5; i++) s = tap(s, 0).state;
  expect(s.players[0].score).toBe(5);
});
