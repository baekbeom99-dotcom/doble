import { createRng } from './rng';

test('같은 시드는 같은 수열을 만든다', () => {
  const a = createRng(42), b = createRng(42);
  expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
});
test('시드가 다르면 수열도 다르다', () => {
  expect(createRng(1).next()).not.toEqual(createRng(2).next());
});
test('int는 경계값을 포함한다', () => {
  const r = createRng(7); const seen = new Set<number>();
  for (let i = 0; i < 500; i++) seen.add(r.int(1, 3));
  expect([...seen].sort()).toEqual([1, 2, 3]);
});
test('sample은 중복 없이 n개를 뽑는다', () => {
  const s = createRng(3).sample([1, 2, 3, 4, 5, 6], 4);
  expect(new Set(s).size).toBe(4);
});
test('sample은 n이 원소 수보다 크면 예외를 던진다', () => {
  expect(() => createRng(3).sample([1, 2], 3)).toThrow();
});
