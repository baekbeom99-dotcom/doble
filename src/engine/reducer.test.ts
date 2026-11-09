import { createGame, reduce } from './reducer';
import type { GameConfig, GameEvent, GameState, Mode } from './state';

const fake: Mode = {
  init: () => ({ correct: 0 }),
  onCorrect: (s) => ({ state: { ...s, mode: { correct: s.mode.correct + 1 } }, nextRound: true }),
  onWrong: s => s, onTick: s => s, isOver: s => s.mode.correct >= 3,
};
const modes = { soloSurvival: fake, score: fake };
const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);
const cfg: GameConfig = {
  mode: 'score', players: [{ name: 'A', color: 'pink', cardSize: 4 }, { name: 'B', color: 'sky', cardSize: 6 }],
  set: { kind: 'consonant', includeDouble: false }, rotationStep: 90, symbolRotation: false, speech: false, scoreRounds: 20, seed: 1,
};
const wrongOf = (s: GameState, p: number) => s.round.cards[p].find(id => id !== s.round.answers[p])!;

test('정답이면 다음 라운드로 넘어가고 중앙 카드가 90° 돈다', () => {
  const g = createGame(cfg, pool, modes);
  const { state, events } = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, modes);
  expect(events.map(e => e.type)).toEqual(['correct', 'round']);
  expect(state.round.index).toBe(1);
  expect(state.round.rotation).toBe(90);
});
test('180° 설정이면 라운드마다 180°씩 돈다', () => {
  const g = createGame({ ...cfg, rotationStep: 180 }, pool, modes);
  const { state } = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, modes);
  expect(state.round.rotation).toBe(180);
});
test('오답이면 1500ms 동안 잠기고, 잠긴 동안의 터치는 무시하며 잠금을 늘리지 않는다', () => {
  let s = createGame(cfg, pool, modes);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 0 }, modes).state;
  expect(s.players[0].lockedUntil).toBe(1500);
  const r = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 0 }, modes);
  expect(r.events).toEqual([]); expect(r.state.players[0].lockedUntil).toBe(1500);
  s = reduce(s, { type: 'TICK', dt: 1500 }, modes).state;
  expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, modes).events[0].type).toBe('correct');
});
test('지난 라운드 번호가 달린 터치는 오답 처리 없이 무시한다', () => {
  let s = createGame(cfg, pool, modes);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, modes).state;
  const r = reduce(s, { type: 'TAP', player: 1, symbol: 'anything', round: 0 }, modes);
  expect(r.events).toEqual([]); expect(r.state.players[1].lockedUntil).toBe(0);
});
test('자기 카드에 없는 심볼 터치는 무시한다', () => {
  const s = createGame(cfg, pool, modes);
  const r = reduce(s, { type: 'TAP', player: 0, symbol: 'not-on-card', round: 0 }, modes);
  expect(r.events).toEqual([]);
});
test('한 플레이어의 잠금은 다른 플레이어에게 영향을 주지 않는다', () => {
  let s = createGame(cfg, pool, modes);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 0 }, modes).state;
  expect(reduce(s, { type: 'TAP', player: 1, symbol: s.round.answers[1], round: 0 }, modes).events[0].type).toBe('correct');
});
test('isOver가 true가 되면 over 이벤트가 나고 이후 터치는 무시한다', () => {
  let s = createGame(cfg, pool, modes); let last: GameEvent[] = [];
  for (let i = 0; i < 3; i++) ({ state: s, events: last } = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, modes));
  expect(last.at(-1)).toEqual({ type: 'over' }); expect(s.phase).toBe('over');
  expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, modes).events).toEqual([]);
});
test('같은 시드는 같은 라운드를 만든다', () => {
  expect(createGame(cfg, pool, modes).round).toEqual(createGame(cfg, pool, modes).round);
});
