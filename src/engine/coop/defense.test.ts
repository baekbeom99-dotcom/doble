import { MODES } from '../modes';
import { createGame, reduce } from '../reducer';
import type { ChallengeKind, GameEvent, GameState } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { elementsOf, startChallenge } from './defense';

const at = (s: GameState, kind: ChallengeKind): GameState => {
  for (let n = 0; n < 50; n++) {
    const r = startChallenge({ ...s, coop: { ...s.coop!, attackCount: n } });
    if (r.state.coop!.challenge!.kind === kind) return r.state;
  }
  throw new Error('kind not found');
};
const coop2 = () => createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES);
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);

test('원소 주인: 2인이면 0번이 불·풀, 1번이 물·번개, 1인은 전부', () => {
  expect(elementsOf(0, 2)).toEqual([0, 2]); expect(elementsOf(1, 2)).toEqual([1, 3]);
  expect(elementsOf(0, 1)).toEqual([0, 1, 2, 3]);
});
test('공격 타이머가 0이 되면 챌린지가 시작되고 새 라운드가 된다', () => {
  const r = reduce(coop2(), { type: 'TICK', dt: 20000 }, MODES);
  expect(r.state.coop!.challenge).not.toBeNull();
  expect(r.events.map(e => e.type)).toEqual(expect.arrayContaining(['challengeStart', 'round']));
  expect(r.state.round.index).toBe(1);
});
test('두 종류가 모두 나온다', () => {
  const kinds = new Set<string>();
  for (let n = 0; n < 20; n++) kinds.add(startChallenge({ ...coop2(), coop: { ...coop2().coop!, attackCount: n } }).state.coop!.challenge!.kind);
  expect([...kinds].sort()).toEqual(['elements', 'quota']);
});
test('원소 순서: 차례인 사람만 누를 수 있고, 아닌 사람 터치는 잠금 없이 무시', () => {
  const s = at(coop2(), 'elements');
  const ch = s.coop!.challenge!;
  expect(ch.sequence).toHaveLength(3);
  expect(ch.timeLeft).toBe(3000 + 2500 * 3);
  const owner = ch.sequence[0] % 2, other = 1 - owner;
  const r = tap(s, other);
  expect(r.events).toEqual([]);
  expect(r.state.players[other].lockedUntil).toBe(0);
});
test('원소 순서를 끝까지 맞히면 성공: 피해 3, 타이머 리셋', () => {
  let s = at(coop2(), 'elements');
  const hp = s.coop!.hp;
  const events: GameEvent[] = [];
  for (const e of s.coop!.challenge!.sequence) { const r = tap(s, e % 2); s = r.state; events.push(...r.events); }
  expect(events).toContainEqual({ type: 'challengeEnd', success: true });
  expect(s.coop).toMatchObject({ challenge: null, hp: hp - 3, attackLeft: 20000 });
});
test('시간이 다 되면 실패: 하트 −1', () => {
  const s = at(coop2(), 'quota');
  const r = reduce(s, { type: 'TICK', dt: 10000 }, MODES);
  expect(r.events).toContainEqual({ type: 'challengeEnd', success: false });
  expect(r.events).toContainEqual({ type: 'heartLost' });
  expect(r.state.coop!.hearts).toBe(2);
  expect(r.state.coop!.challenge).toBeNull();
});
test('공동 목표: 누가 맞혀도 카운트, 목표 도달 즉시 성공', () => {
  let s = at(coop2(), 'quota');
  expect(s.coop!.challenge!.target).toBe(4);
  for (let i = 0; i < 3; i++) s = tap(s, i % 2).state;
  expect(s.coop!.challenge!.count).toBe(3);
  const r = tap(s, 1);
  expect(r.events).toContainEqual({ type: 'challengeEnd', success: true });
});
test('마지막 정답 뒤에 남은 시간이 0이 되어도 실패하지 않는다', () => {
  let s = at(coop2(), 'quota');
  s = reduce(s, { type: 'TICK', dt: 9990 }, MODES).state;
  for (let i = 0; i < 4; i++) s = tap(s, i % 2).state;
  const r = reduce(s, { type: 'TICK', dt: 20 }, MODES);
  expect(r.events.filter(e => e.type === 'challengeEnd')).toEqual([]);
  expect(r.state.coop!.hearts).toBe(3);
});
test('챌린지 성공 피해로 몬스터가 쓰러지면 단계가 오른다', () => {
  const base = coop2();
  let s = at({ ...base, coop: { ...base.coop!, hp: 2 } }, 'quota');
  for (let i = 0; i < 4; i++) s = tap(s, i % 2).state;
  expect(s.coop).toMatchObject({ stage: 2, challenge: null });
});
test('챌린지 중 오답은 공격 타이머를 줄이지 않는다', () => {
  const s = at(coop2(), 'quota');
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  const r = reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: s.round.index }, MODES);
  expect(r.state.coop!.attackLeft).toBe(s.coop!.attackLeft);
});
test('1인은 원소 순서를 혼자 끝까지 할 수 있다', () => {
  const one = createGame(testConfig({ mode: 'coop', players: [testConfig().players[0]] }), TEST_POOL, MODES);
  let s = at(one, 'elements');
  const len = s.coop!.challenge!.sequence.length;
  for (let i = 0; i < len; i++) s = tap(s, 0).state;
  expect(s.coop!.challenge).toBeNull();
});
