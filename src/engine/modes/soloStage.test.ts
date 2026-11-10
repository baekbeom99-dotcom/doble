import { createGame, reduce } from '../reducer';
import type { GameEvent } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { MODES } from './index';
import { stageParams, stageStars } from './soloStage';

const stageCfg = (stage: number) => testConfig({ mode: 'soloStage', stage, players: [testConfig().players[0]] });

test('스테이지 수치', () => {
  expect(stageParams(1, 21)).toEqual({ target: 7, cardSize: 3, timeMs: 20000 });
  expect(stageParams(10, 21)).toEqual({ target: 16, cardSize: 6, timeMs: 20000 });
  expect(stageParams(20, 21)).toEqual({ target: 20, cardSize: 8, timeMs: 20000 });
  expect(stageParams(20, 14)).toMatchObject({ cardSize: 7 });
});
test('별 기준', () => {
  expect(stageStars(8000, 20000)).toBe(3); expect(stageStars(7999, 20000)).toBe(2);
  expect(stageStars(4000, 20000)).toBe(2); expect(stageStars(3999, 20000)).toBe(1);
});
test('스테이지 카드 크기를 쓴다 (첫 라운드와 다음 라운드 모두)', () => {
  let s = createGame(stageCfg(10), TEST_POOL, MODES);
  expect(s.round.cards[0]).toHaveLength(6);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state;
  expect(s.round.cards[0]).toHaveLength(6);
});
test('목표를 채우면 클리어하고 별을 받으며, 이후 TICK으로 실패하지 않는다', () => {
  let s = createGame(stageCfg(1), TEST_POOL, MODES);
  let last: GameEvent[] = [];
  for (let i = 0; i < 7; i++) ({ state: s, events: last } = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, MODES));
  expect(last).toContainEqual({ type: 'over' });
  expect(s.mode).toMatchObject({ cleared: 1, stars: 3, target: 7 });
  expect(reduce(s, { type: 'TICK', dt: 30000 }, MODES).state.mode.cleared).toBe(1);
});
test('시간이 다 되면 실패', () => {
  const r = reduce(createGame(stageCfg(1), TEST_POOL, MODES), { type: 'TICK', dt: 20000 }, MODES);
  expect(r.state.phase).toBe('over');
  expect(r.state.mode.cleared).toBe(0);
});
test('오답은 2초를 줄이고 연속 기록을 끊는다', () => {
  const s = createGame(stageCfg(1), TEST_POOL, MODES);
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  expect(reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: 0 }, MODES).state.mode).toMatchObject({ timeLeft: 18000, streak: 0 });
});
