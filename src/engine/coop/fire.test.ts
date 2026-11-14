import { createGame, reduce } from '../reducer';
import type { GameConfig, GameState } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { MODES } from '../modes';
import { attackDelay, FIRE_MS, RESCUE_NEED } from './fire';

const coopCfg = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'coop', ...over });
const three = () => coopCfg({ players: [0, 1, 2].map(i => ({ ...testConfig().players[0], name: `P${i}` })) });
const solo = () => coopCfg({ players: [testConfig().players[0]] });
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);
const tick = (s: GameState, dt: number) => reduce(s, { type: 'TICK', dt }, MODES);
/** 공격 타이머를 다 흘려 불 공격을 시작시킨다 */
const ignite = (s: GameState) => tick(s, s.coop!.attackLeft);

test('공격 간격은 1단계 8~12초이고, 같은 시드면 같으며, 단계가 오르면 짧아진다', () => {
  for (let k = 0; k < 30; k++) {
    const d = attackDelay(7, 1, k);
    expect(d).toBeGreaterThanOrEqual(8000);
    expect(d).toBeLessThanOrEqual(12000);
    expect(attackDelay(7, 1, k)).toBe(d);
    expect(attackDelay(7, 6, k)).toBeLessThanOrEqual(Math.round(12000 * 0.95 ** 5));
    expect(attackDelay(7, 60, k)).toBeGreaterThanOrEqual(5000);
  }
});

test('시작하면 불은 없고 공격 타이머가 가득이다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  expect(s.coop!.fire).toBeNull();
  expect(s.coop!.attackLeft).toBe(s.coop!.attackTotal);
  expect(s.coop!.attackLeft).toBeGreaterThanOrEqual(8000);
});

test('공격 시간이 되면 한 사람에게 불을 뿜고, 그 사람은 누를 수 없다', () => {
  const r = ignite(createGame(three(), TEST_POOL, MODES));
  const fire = r.state.coop!.fire!;
  expect(fire).toMatchObject({ got: 0, timeLeft: FIRE_MS });
  expect([0, 1, 2]).toContain(fire.target);
  expect(r.events).toContainEqual({ type: 'fireStart', target: fire.target });
  expect(tap(r.state, fire.target).events).toEqual([]);
});

test(`다른 친구들이 ${RESCUE_NEED}번 맞히면 불이 꺼지고 하트는 그대로다`, () => {
  let s = ignite(createGame(three(), TEST_POOL, MODES)).state;
  const target = s.coop!.fire!.target;
  const others = [0, 1, 2].filter(p => p !== target);
  s = tap(s, others[0]).state;
  expect(s.coop!.fire!.got).toBe(1);
  const r = tap(s, others[1]);
  expect(r.events).toContainEqual({ type: 'fireRescue', target });
  expect(r.state.coop!.fire).toBeNull();
  expect(r.state.coop!.hearts).toBe(3);
  expect(r.state.coop!.attackLeft).toBe(r.state.coop!.attackTotal);
  expect(r.state.coop!.attackLeft).toBeGreaterThan(0);
});

test('불 붙은 사람을 빼고 모두 맞히면 맞힌 사람 수만큼 합체 공격과 새 라운드 (2인)', () => {
  const s = ignite(createGame(coopCfg(), TEST_POOL, MODES)).state;
  const target = s.coop!.fire!.target;
  const r = tap(s, 1 - target);
  expect(r.events).toContainEqual({ type: 'damage', amount: 1, combo: true });
  expect(r.state.round.index).toBe(s.round.index + 1);
  expect(r.state.coop!.fire).toMatchObject({ target, got: 1 });
});

test('아무도 못 풀어 주면 저절로 풀리고 하트가 1개 준다', () => {
  let s = ignite(createGame(coopCfg(), TEST_POOL, MODES)).state;
  const target = s.coop!.fire!.target;
  const r = tick(s, FIRE_MS);
  expect(r.events).toContainEqual({ type: 'fireBurn', target });
  expect(r.events).toContainEqual({ type: 'heartLost' });
  expect(r.state.coop!.hearts).toBe(2);
  expect(r.state.coop!.fire).toBeNull();
  s = r.state;
  expect(tap(s, target).events.length).toBeGreaterThan(0);
});

test('혼자일 때도 불을 맞고, 5초 뒤 하트를 잃는다', () => {
  let s = ignite(createGame(solo(), TEST_POOL, MODES)).state;
  expect(s.coop!.fire!.target).toBe(0);
  expect(tap(s, 0).events).toEqual([]);
  s = tick(s, FIRE_MS - 1).state;
  expect(s.coop!.hearts).toBe(3);
  s = tick(s, 1).state;
  expect(s.coop!.hearts).toBe(2);
});

test('불 공격 중 오답은 공격 타이머에 영향이 없다', () => {
  const s = ignite(createGame(three(), TEST_POOL, MODES)).state;
  const p = [0, 1, 2].find(i => i !== s.coop!.fire!.target)!;
  const wrong = s.round.cards[p].find(id => id !== s.round.answers[p])!;
  const r = reduce(s, { type: 'TAP', player: p, symbol: wrong, round: s.round.index }, MODES);
  expect(r.state.coop!.fire).toEqual(s.coop!.fire);
});
