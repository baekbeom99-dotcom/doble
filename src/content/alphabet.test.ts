import { alphabetSymbols, LOOKALIKE_LOWER } from './alphabet';

test('대문자 26, 소문자 26, 섞기 44', () => {
  expect(alphabetSymbols('upper')).toHaveLength(26);
  expect(alphabetSymbols('lower')).toHaveLength(26);
  expect(alphabetSymbols('mixed')).toHaveLength(44);
});
test('섞기에서는 대문자와 모양이 같은 소문자를 뺀다', () => {
  const values = alphabetSymbols('mixed').map(s => (s.display as { value: string }).value);
  for (const c of LOOKALIKE_LOWER) expect(values).not.toContain(c);
  expect(values).toContain('a'); expect(values).toContain('C');
});
test('알파벳 심볼은 영어로 읽는다', () => {
  expect(alphabetSymbols('lower')[0]).toMatchObject({ id: 'en:a', speech: 'a', lang: 'en-US' });
});
