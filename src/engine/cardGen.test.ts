import { generateRound, PoolTooSmallError } from './cardGen';
import { createRng } from './rng';

const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);

test('1000개 시드에서 모든 플레이어 카드는 중앙 카드와 정확히 1개만 겹친다', () => {
  for (let seed = 0; seed < 1000; seed++) {
    const r = generateRound({ pool, playerSizes: [3, 5, 8, 6], rng: createRng(seed) });
    expect(r.center).toHaveLength(8);
    r.playerCards.forEach((card, i) => {
      expect(card).toHaveLength([3, 5, 8, 6][i]);
      expect(new Set(card).size).toBe(card.length);
      const common = card.filter(id => r.center.includes(id));
      expect(common).toEqual([r.answers[i]]);
    });
    expect(new Set(r.answers).size).toBe(4);
  }
});
test('심볼이 부족하면 PoolTooSmallError를 던진다', () => {
  expect(() => generateRound({ pool: pool.slice(0, 14), playerSizes: [8], rng: createRng(1) }))
    .toThrow(PoolTooSmallError);
  expect(() => generateRound({ pool: pool.slice(0, 15), playerSizes: [8], rng: createRng(1) }))
    .not.toThrow();
});
test('인원이 카드당 심볼 수보다 많으면 정답이 겹칠 수 있지만 규칙은 지킨다', () => {
  const r = generateRound({ pool, playerSizes: [3, 3, 3, 3], rng: createRng(4) });
  r.playerCards.forEach((card, i) => expect(card.filter(id => r.center.includes(id))).toEqual([r.answers[i]]));
});
test('preferAnswer에 맞는 정답이 더 자주 나온다', () => {
  let hits = 0;
  for (let seed = 0; seed < 500; seed++) {
    const r = generateRound({ pool, playerSizes: [4], preferAnswer: id => id === 's0' || id === 's1', rng: createRng(seed) });
    if (r.answers[0] === 's0' || r.answers[0] === 's1') hits++;
  }
  expect(hits).toBeGreaterThan(100);
});
