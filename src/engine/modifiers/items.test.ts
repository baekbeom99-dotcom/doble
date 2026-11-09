import { MODES } from '../modes';
import { createGame, reduce } from '../reducer';
import type { SeatColor } from '../seats';
import type { GameConfig, GameState, ItemId } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';

const cfg = (over: Partial<GameConfig> = {}) => testConfig({ rules: { combo: false, finalRound: false, items: true }, ...over });
const withItem = (s: GameState, p: number, item: ItemId | null): GameState =>
  ({ ...s, players: s.players.map((pl, i) => (i === p ? { ...pl, item } : pl)) });

test('정답을 많이 맞히면 약 20% 확률로 아이템을 얻는다', () => {
  let got = 0;
  for (let seed = 0; seed < 300; seed++) {
    const s = createGame(cfg({ seed }), TEST_POOL, MODES);
    const r = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES);
    if (r.state.players[0].item) {
      got++;
      expect(r.events).toContainEqual({ type: 'gotItem', player: 0, item: r.state.players[0].item });
    }
  }
  expect(got).toBeGreaterThan(30); expect(got).toBeLessThan(90);
});
test('아이템 규칙이 꺼져 있으면 얻지 않는다', () => {
  for (let seed = 0; seed < 100; seed++) {
    const s = createGame(testConfig({ seed }), TEST_POOL, MODES);
    expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state.players[0].item).toBeNull();
  }
});
test('이미 아이템이 있으면 새로 얻지 않는다', () => {
  for (let seed = 0; seed < 50; seed++) {
    const s = withItem(createGame(cfg({ seed }), TEST_POOL, MODES), 0, 'hint');
    expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state.players[0].item).toBe('hint');
  }
});
test('얼리기는 상대를 2초 잠그고, 이미 더 길게 잠긴 사람은 그대로 둔다', () => {
  let s = withItem(createGame(cfg({ players: [...testConfig().players, { name: 'C', color: 'yellow', cardSize: 5 }] }), TEST_POOL, MODES), 0, 'freeze');
  s = { ...s, players: s.players.map((p, i) => (i === 2 ? { ...p, lockedUntil: 5000 } : p)) };
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.state.players.map(p => p.lockedUntil)).toEqual([0, 2000, 5000]);
  expect(r.state.players[0].item).toBeNull();
  expect(r.events).toContainEqual({ type: 'usedItem', player: 0, item: 'freeze' });
});
test('방패를 든 상대는 공격을 막고 방패를 잃는다', () => {
  const s = withItem(withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'swirl'), 1, 'shield');
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.state.players[1].spinUntil).toBe(0);
  expect(r.state.players[1].item).toBeNull();
  expect(r.events).toContainEqual({ type: 'blocked', player: 1 });
});
test('뒤섞기는 상대 글자를 3초 동안 돌린다', () => {
  const s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'swirl');
  expect(reduce(s, { type: 'USE_ITEM', player: 0 }, MODES).state.players[1].spinUntil).toBe(3000);
});
test('힌트는 이번 라운드 번호를 기록한다', () => {
  const s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'hint');
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.state.players[0].hintRound).toBe(0);
  expect(r.state.players[0].item).toBeNull();
});
test('방패 사용 버튼은 아무 일도 하지 않는다', () => {
  const s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'shield');
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.events).toEqual([]); expect(r.state.players[0].item).toBe('shield');
});
test('잠긴 사람은 아이템을 쓸 수 없다', () => {
  let s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'freeze');
  s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, lockedUntil: 1000 } : p)) };
  expect(reduce(s, { type: 'USE_ITEM', player: 0 }, MODES).events).toEqual([]);
});
test('팀전에서는 팀원을 공격하지 않는다', () => {
  const four = ['pink', 'sky', 'yellow', 'lime'].map((c, i) => ({ name: `P${i}`, color: c as SeatColor, cardSize: 5 }));
  const s = withItem(createGame(cfg({ players: four, teams: [0, 0, 1, 1] }), TEST_POOL, MODES), 0, 'freeze');
  expect(reduce(s, { type: 'USE_ITEM', player: 0 }, MODES).state.players.map(p => p.lockedUntil)).toEqual([0, 0, 2000, 2000]);
});
