import { GameController } from './controller';
import { MODES } from './modes';
import { createGame } from './reducer';
import type { GameConfig } from './state';

const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);
const soloCfg: GameConfig = {
  mode: 'soloSurvival', players: [{ name: 'A', color: 'pink', cardSize: 5 }],
  set: { kind: 'consonant', includeDouble: false }, rotationStep: 90, symbolRotation: false, speech: false, scoreRounds: 20, seed: 1,
};

test('frame 사이의 dt를 100ms로 제한한다', () => {
  const c = new GameController(createGame(soloCfg, pool, MODES), MODES);
  c.frame(1000); c.frame(1016); expect(c.getState().now).toBe(16);
  c.frame(9016); expect(c.getState().now).toBe(116);
  expect(c.getState().mode.timeLeft).toBe(30000 - 116);
});
test('subscribe는 dispatch 결과 이벤트를 받는다', () => {
  const c = new GameController(createGame(soloCfg, pool, MODES), MODES);
  const seen: string[] = []; c.subscribe((_, ev) => ev.forEach(e => seen.push(e.type)));
  const s = c.getState();
  c.dispatch({ type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 });
  expect(seen).toEqual(['correct', 'round']);
});
test('구독을 해제하면 더 이상 알림을 받지 않는다', () => {
  const c = new GameController(createGame(soloCfg, pool, MODES), MODES);
  const fn = vi.fn(); const off = c.subscribe(fn); off();
  c.frame(0); c.frame(16);
  expect(fn).not.toHaveBeenCalled();
});
