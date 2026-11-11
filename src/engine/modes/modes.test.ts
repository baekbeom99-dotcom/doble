import { createGame, reduce } from '../reducer';
import { DEFAULT_BOMB, NO_RULES, type GameConfig, type GameState } from '../state';
import { MODES } from './index';
import { TEST_POOL, testConfig } from '../testConfig';

const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);
const base: Omit<GameConfig, 'mode' | 'players'> = {
  set: { kind: 'consonant', includeDouble: false }, rotationStep: 90, symbolRotation: false, speech: false, scoreRounds: 20, seed: 1, rules: NO_RULES, teams: null, bomb: DEFAULT_BOMB,
};
const soloCfg: GameConfig = { ...base, mode: 'soloSurvival', players: [{ name: 'A', color: 'pink', cardSize: 5 }] };
const duoCfg: GameConfig = { ...base, mode: 'score', players: [{ name: 'A', color: 'pink', cardSize: 5 }, { name: 'B', color: 'sky', cardSize: 5 }] };
const wrongOf = (s: GameState, p: number) => s.round.cards[p].find(id => id !== s.round.answers[p])!;

test('서바이벌: 40초로 시작하고 정답 +3초, 오답 −2초, 0이 되면 끝', () => {
  let s = createGame(soloCfg, pool, MODES);
  expect(s.mode.timeLeft).toBe(40000);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state;
  expect(s.mode.timeLeft).toBe(43000);
  expect(s.mode.correct).toBe(1);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 1 }, MODES).state;
  expect(s.mode.timeLeft).toBe(41000);
  const r = reduce(s, { type: 'TICK', dt: 41000 }, MODES);
  expect(r.state.phase).toBe('over'); expect(r.events).toContainEqual({ type: 'over' });
});
test('서바이벌: 설정한 제한 시간으로 시작한다', () => {
  expect(createGame({ ...soloCfg, timeLimit: 60 }, pool, MODES).mode.timeLeft).toBe(60000);
});
test('점수제: 먼저 맞힌 사람이 1점을 얻고, scoreRounds 라운드 뒤에 끝난다', () => {
  let s = createGame({ ...duoCfg, scoreRounds: 2 }, pool, MODES);
  s = reduce(s, { type: 'TAP', player: 1, symbol: s.round.answers[1], round: 0 }, MODES).state;
  expect(s.players.map(p => p.score)).toEqual([0, 1]);
  expect(s.phase).toBe('playing');
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 1 }, MODES).state;
  expect(s.phase).toBe('over'); expect(s.players.map(p => p.score)).toEqual([1, 1]);
});
test('점수제: 시간이 흘러도 끝나지 않는다', () => {
  const s = createGame(duoCfg, pool, MODES);
  expect(reduce(s, { type: 'TICK', dt: 600000 }, MODES).state.phase).toBe('playing');
});

