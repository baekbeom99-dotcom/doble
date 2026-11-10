import { MODES } from '../modes';
import { createGame, reduce } from '../reducer';
import type { GameConfig, GameState, ItemId } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { judge } from './scoring';

const solo = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]], ...over });
const tap = (s: GameState) => reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, MODES);
const wait = (s: GameState, ms: number) => reduce(s, { type: 'TICK', dt: ms }, MODES).state;
const wrongOf = (s: GameState) => s.round.cards[0].find(id => id !== s.round.answers[0])!;

test('판정 경계', () => {
  expect(judge(1500)).toBe('perfect'); expect(judge(1501)).toBe('great');
  expect(judge(3000)).toBe('great'); expect(judge(3001)).toBe('good');
});
test('빨리 맞히면 3점, 느리면 1점', () => {
  const s = createGame(solo(), TEST_POOL, MODES);
  let r = tap(wait(s, 1000));
  expect(r.events).toContainEqual({ type: 'grade', grade: 'perfect', points: 3 });
  r = tap(wait(r.state, 4000));
  expect(r.events).toContainEqual({ type: 'grade', grade: 'good', points: 1 });
  expect(r.state.mode).toMatchObject({ score: 4, correct: 2, perfect: 1, good: 1 });
});
test('5연속이면 피버: 5초 동안 점수 2배', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  for (let i = 0; i < 4; i++) s = tap(s).state;
  const r = tap(s);
  expect(r.events).toContainEqual({ type: 'fever' });
  expect(r.state.mode.feverUntil).toBe(r.state.now + 5000);
  expect(tap(r.state).events).toContainEqual({ type: 'grade', grade: 'perfect', points: 6 });
});
test('피버와 2배 아이템이 겹치면 4배, 오답으로 연속이 끊겨도 피버는 남는다', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  for (let i = 0; i < 5; i++) s = tap(s).state;
  s = { ...s, mode: { ...s.mode, doubleUntil: s.now + 10000 } };
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s), round: s.round.index }, MODES).state;
  expect(s.mode.streak).toBe(0);
  s = wait(s, 1500);
  expect(tap(s).events).toContainEqual({ type: 'grade', grade: 'perfect', points: 12 });
});
test('시간 정지 중에는 시간이 줄지 않지만 오답 −2초는 적용되고, 정지가 끝난 뒤의 시간만 줄어든다', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  s = { ...s, mode: { ...s.mode, timeStopUntil: 3000 } };
  s = wait(s, 2000);
  expect(s.mode.timeLeft).toBe(40000);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s), round: s.round.index }, MODES).state;
  expect(s.mode.timeLeft).toBe(38000);
  s = wait(s, 2000);
  expect(s.mode.timeLeft).toBe(37000);
});
test('혼자 하기 아이템은 힌트·시간 정지·2배 중에서 나온다', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 300; seed++) {
    const s = createGame(solo({ seed, rules: { combo: false, finalRound: false, items: true } }), TEST_POOL, MODES);
    const item = tap(s).state.players[0].item;
    if (item) seen.add(item);
  }
  expect([...seen].sort()).toEqual(['double', 'hint', 'timeStop']);
});
test('시간 정지와 2배 아이템을 쓰면 해당 시각이 기록된다', () => {
  const s = createGame(solo({ rules: { combo: false, finalRound: false, items: true } }), TEST_POOL, MODES);
  const withItem = (item: ItemId): GameState => ({ ...s, players: [{ ...s.players[0], item }] });
  expect(reduce(withItem('timeStop'), { type: 'USE_ITEM', player: 0 }, MODES).state.mode.timeStopUntil).toBe(3000);
  expect(reduce(withItem('double'), { type: 'USE_ITEM', player: 0 }, MODES).state.mode.doubleUntil).toBe(10000);
});
