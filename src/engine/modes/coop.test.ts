import { attackDelay } from '../coop/fire';
import { monsterHp } from '../coop/monster';
import { createGame, reduce } from '../reducer';
import type { GameConfig, GameState } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { coop } from './coop';
import { MODES } from './index';

const coopCfg = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'coop', ...over });
const solo = () => coopCfg({ players: [testConfig().players[0]] });
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);

test('몬스터 체력 공식', () => {
  expect(monsterHp(1, 2)).toBe(16); expect(monsterHp(3, 1)).toBe(16);
});
test('시작 상태: 하트 3, 1단계 몬스터, 공격 타이머 가득', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  expect(s.coop).toMatchObject({ stage: 1, hearts: 3, hp: 16, maxHp: 16, attackLeft: attackDelay(s.config.seed, 1, 0), answered: [false, false], fire: null });
});
test('한 명이 맞히면 피해 1, 라운드는 그대로이고 그 사람은 더 못 누른다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  const r = tap(s, 0);
  expect(r.state.coop!.hp).toBe(15);
  expect(r.state.round.index).toBe(0);
  expect(r.events).toContainEqual({ type: 'damage', amount: 1, combo: false });
  expect(tap(r.state, 0).events).toEqual([]);
});
test('모두 맞히면 합체 공격으로 인원수만큼 추가 피해, 새 라운드', () => {
  let s = createGame(coopCfg(), TEST_POOL, MODES);
  s = tap(s, 0).state;
  const r = tap(s, 1);
  expect(r.state.coop!.hp).toBe(16 - 4);
  expect(r.events).toContainEqual({ type: 'damage', amount: 2, combo: true });
  expect(r.state.round.index).toBe(1);
  expect(r.state.coop!.answered).toEqual([false, false]);
});
test('1인은 매 정답이 합체 공격이다', () => {
  const r = tap(createGame(solo(), TEST_POOL, MODES), 0);
  expect(r.state.coop!.hp).toBe(8 - 2);
  expect(r.state.round.index).toBe(1);
});
test('혼자 할 때는 맞힐 때마다 불 공격이 1500ms 늦춰진다 (처음 간격을 넘지는 않는다)', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  const total = s.coop!.attackTotal;
  s = reduce(s, { type: 'TICK', dt: 4000 }, MODES).state;
  s = tap(s, 0).state;
  expect(s.coop!.attackLeft).toBe(total - 4000 + 1500);
  s = tap(s, 0).state;
  s = tap(s, 0).state;
  expect(s.coop!.attackLeft).toBe(total);
});
test('여럿이 할 때도 맞힐 때마다 불 공격이 700ms 늦춰진다', () => {
  let s = createGame(coopCfg(), TEST_POOL, MODES);
  s = reduce(s, { type: 'TICK', dt: 4000 }, MODES).state;
  const left = s.coop!.attackLeft;
  s = tap(s, 0).state;
  expect(s.coop!.attackLeft).toBe(left + 700);
  expect(tap(s, 1).state.coop!.attackLeft).toBe(left + 1400);
});
test('혼자 할 때는 5번 맞힐 때마다 하트가 1개 회복된다 (최대 5개)', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  for (let i = 0; i < 4; i++) s = tap(s, 0).state;
  expect(s.coop!.hearts).toBe(3);
  const fifth = tap(s, 0);
  expect(fifth.state.coop!.hearts).toBe(4);
  expect(fifth.events).toContainEqual({ type: 'heartGain' });
  s = fifth.state;
  for (let i = 0; i < 15; i++) s = tap(s, 0).state;
  expect(s.coop!.hearts).toBe(5);
});
test('여럿이 할 때는 맞힌 횟수로 하트가 회복되지 않는다', () => {
  let s = createGame(coopCfg(), TEST_POOL, MODES);
  const events = [];
  for (let i = 0; i < 6; i++) for (const p of [0, 1]) { const r = tap(s, p); s = r.state; events.push(...r.events); }
  expect(events).not.toContainEqual({ type: 'heartGain' });
});
test('오답이면 공격 타이머가 1500ms 줄어든다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  expect(reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: 0 }, MODES).state.coop!.attackLeft).toBe(s.coop!.attackLeft - 1500);
});
test('몬스터를 쓰러뜨리면 2단계 몬스터가 나오고 카드가 1장 커진다', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  const events: string[] = [];
  for (let i = 0; i < 4; i++) { const r = tap(s, 0); s = r.state; r.events.forEach(e => events.push(e.type)); }
  expect(events).toContain('monsterDown');
  expect(s.coop).toMatchObject({ stage: 2, hp: monsterHp(2, 1), maxHp: monsterHp(2, 1), attackLeft: attackDelay(s.config.seed, 2, 0) });
  expect(s.round.cards[0]).toHaveLength(6);
});
test('오답으로 잠겨 있는 동안에도 공격 타이머는 흐른다', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  const start = s.coop!.attackLeft;
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: 0 }, MODES).state;
  s = reduce(s, { type: 'TICK', dt: 1000 }, MODES).state;
  expect(s.players[0].lockedUntil).toBeGreaterThan(s.now);
  expect(s.coop!.attackLeft).toBe(start - 1500 - 1000);
});
test('하트가 0이 되면 끝난다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  expect(coop.isOver({ ...s, coop: { ...s.coop!, hearts: 0 } })).toBe(true);
  expect(coop.isOver(s)).toBe(false);
});
