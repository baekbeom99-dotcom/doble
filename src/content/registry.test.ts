import { createSymbolSet, maxCardSize, minPoolSize } from './registry';

test('minPoolSize와 maxCardSize', () => {
  expect(minPoolSize(3)).toBe(5); expect(minPoolSize(8)).toBe(15);
  expect(maxCardSize(14)).toBe(7); expect(maxCardSize(15)).toBe(8);
  expect(maxCardSize(4)).toBe(0);
});
test('createSymbolSet은 설정에 맞는 세트를 불러온다', async () => {
  const set = createSymbolSet({ kind: 'syllable', initial: 'ㄴ', batchim: false });
  expect(await set.loadSymbols()).toHaveLength(10);
  expect(set.name).toBe('ㄴ 글자');
});
test('세트 이름', () => {
  expect(createSymbolSet({ kind: 'consonant', includeDouble: true }).name).toBe('자음+쌍자음');
  expect(createSymbolSet({ kind: 'syllable', initial: 'ㄱ', batchim: true }).name).toBe('ㄱ 받침 글자');
  expect(createSymbolSet({ kind: 'alphabet', letterCase: 'mixed' }).name).toBe('대소문자');
});
