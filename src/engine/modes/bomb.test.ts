import { createGame, reduce } from '../reducer';
import type { GameConfig, GameState } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { pendingChoice } from './bomb';
import { MODES } from './index';

const bombCfg = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'bomb', bomb: { startHand: 2, target: 'random' }, ...over });
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);
const three = [...testConfig().players, { name: 'C', color: 'yellow' as const, cardSize: 5 }];

test('시작할 때 각자 startHand장을 든다', () => {
  expect(createGame(bombCfg(), TEST_POOL, MODES).players.map(p => p.score)).toEqual([2, 2]);
});
test('맞히면 상대에게 1장 넘기고, 먼저 0장이 되면 끝난다', () => {
  const s = createGame(bombCfg(), TEST_POOL, MODES);
  let r = tap(s, 0);
  expect(r.events).toContainEqual({ type: 'give', from: 0, to: 1, count: 1 });
  r = tap(r.state, 0);
  expect(r.state.players.map(p => p.score)).toEqual([0, 4]);
  expect(r.state.phase).toBe('over');
});
test('값이 장수보다 크면 가진 만큼만 넘긴다', () => {
  let s = createGame(bombCfg({ scoreRounds: 1, rules: { combo: false, finalRound: true, items: false } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(s.players.map(p => p.score)).toEqual([0, 4]);
});
test('정한 라운드 수에 도달해도 끝난다', () => {
  let s = createGame(bombCfg({ scoreRounds: 1, bomb: { startHand: 5, target: 'random' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(s.phase).toBe('over');
});
test('대상 고르기: 고르면 그 사람에게, 3초가 지나면 무작위로 넘긴다', () => {
  let s = createGame(bombCfg({ players: three, bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(pendingChoice(s)).toEqual({ from: 0, count: 1, until: 3000 });
  const r = reduce(s, { type: 'CHOOSE_TARGET', player: 0, target: 2 }, MODES);
  expect(r.state.players.map(p => p.score)).toEqual([2, 3, 4]);
  expect(r.events).toContainEqual({ type: 'give', from: 0, to: 2, count: 1 });
  expect(pendingChoice(r.state)).toBeNull();
  let t = tap(r.state, 1).state;
  t = reduce(t, { type: 'TICK', dt: 3000 }, MODES).state;
  expect(pendingChoice(t)).toBeNull();
  expect(t.players[1].score).toBe(2);
});
test('대기 중에 또 맞히면 이전 넘기기를 먼저 무작위로 처리한다', () => {
  let s = createGame(bombCfg({ players: three, bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state; s = tap(s, 0).state;
  expect(s.players[0].score).toBe(2);
  expect(s.players.reduce((n, p) => n + p.score, 0)).toBe(9);
  expect(pendingChoice(s)).toEqual({ from: 0, count: 1, until: expect.any(Number) });
});
test('대기 중인 넘기기로 0장이 되기 전에는 끝나지 않는다', () => {
  let s = createGame(bombCfg({ players: three, bomb: { startHand: 1, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(s.phase).toBe('playing');
  const r = reduce(s, { type: 'CHOOSE_TARGET', player: 0, target: 1 }, MODES);
  expect(r.state.players.map(p => p.score)).toEqual([0, 2, 1]);
  expect(r.state.phase).toBe('over');
});
test('대기 중인 사람만, 상대만 고를 수 있다', () => {
  let s = createGame(bombCfg({ players: three, bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(reduce(s, { type: 'CHOOSE_TARGET', player: 1, target: 0 }, MODES).events).toEqual([]);
  expect(reduce(s, { type: 'CHOOSE_TARGET', player: 0, target: 0 }, MODES).events).toEqual([]);
});
test('팀전에서는 상대 팀에게만 넘긴다', () => {
  const four = [...three, { name: 'D', color: 'lime' as const, cardSize: 5 }];
  for (let seed = 0; seed < 40; seed++) {
    const s = createGame(bombCfg({ seed, players: four, teams: [0, 0, 1, 1], bomb: { startHand: 3, target: 'random' } }), TEST_POOL, MODES);
    const give = tap(s, 0).events.find(e => e.type === 'give') as { to: number };
    expect([2, 3]).toContain(give.to);
  }
});
test('대기 중인 넘기기로 누군가 0장이 되면 새 대기를 만들지 않고 끝난다', () => {
  let s = createGame(bombCfg({ players: three, bomb: { startHand: 1, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  const r = tap(s, 1);
  expect(r.state.players[0].score).toBe(0);
  expect(pendingChoice(r.state)).toBeNull();
  expect(r.state.phase).toBe('over');
});
test('마지막 라운드에서는 대기 없이 바로 넘기고 끝난다', () => {
  let s = createGame(bombCfg({ players: three, scoreRounds: 2, bomb: { startHand: 5, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  const r = tap(s, 1);
  expect(pendingChoice(r.state)).toBeNull();
  expect(r.state.phase).toBe('over');
  expect(r.state.players.reduce((n, p) => n + p.score, 0)).toBe(15);
});

test('넘길 수 있는 상대가 한 명뿐이면 고르기 없이 바로 넘긴다', () => {
  const s = createGame(bombCfg({ bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  const r = tap(s, 0);
  expect(pendingChoice(r.state)).toBeNull();
  expect(r.events).toContainEqual({ type: 'give', from: 0, to: 1, count: 1 });
});
