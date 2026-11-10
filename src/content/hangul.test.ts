import { consonantSymbols, syllableSymbols } from './hangul';
import type { SymbolDef } from './types';

const valueOf = (s: SymbolDef) => (s.display as { value: string }).value;

test('기본 자음 14개, 쌍자음 포함 19개', () => {
  expect(consonantSymbols(false)).toHaveLength(14);
  expect(consonantSymbols(true)).toHaveLength(19);
  expect(consonantSymbols(false)[0]).toMatchObject({ id: 'ko-c:ㄱ', speech: '기역', lang: 'ko-KR' });
});
test('받침 없는 ㄱ 음절은 이중모음을 빼고 기본 모음 10개: 가 갸 거 겨 고 교 구 규 그 기', () => {
  const s = syllableSymbols('ㄱ', false);
  expect(s.map(x => x.display.kind === 'text' && x.display.value).join(' ')).toBe('가 갸 거 겨 고 교 구 규 그 기');
  expect(s.find(x => x.tags.vowel === 'ㅗ')!.display).toEqual({ kind: 'text', value: '고' });
});
test('받침 있는 ㄱ 음절은 42개이고 모두 받침이 있다', () => {
  const s = syllableSymbols('ㄱ', true);
  expect(s).toHaveLength(42);
  expect(s.every(x => x.tags.batchim)).toBe(true);
  expect(s.map(valueOf)).toContain('각');
  expect(s.map(valueOf)).toContain('공');
});
test('쌍자음 초성도 동작한다', () => {
  expect(syllableSymbols('ㄲ', false)[0].display).toEqual({ kind: 'text', value: '까' });
});
test('id는 세트 안에서 중복되지 않는다', () => {
  const s = syllableSymbols('ㅎ', true);
  expect(new Set(s.map(x => x.id)).size).toBe(s.length);
});
