import { speak } from './speech';

afterEach(() => vi.unstubAllGlobals());

test('speechSynthesis가 있으면 언어를 지정해 읽는다', () => {
  const speakFn = vi.fn(), cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak: speakFn, cancel });
  vi.stubGlobal('SpeechSynthesisUtterance', class { lang = ''; rate = 1; constructor(public text: string) {} });
  speak('가', 'ko-KR');
  expect(cancel).toHaveBeenCalled();
  expect(speakFn.mock.calls[0][0]).toMatchObject({ text: '가', lang: 'ko-KR', rate: 0.9 });
});
test('speechSynthesis가 없어도 예외를 던지지 않는다', () => {
  vi.stubGlobal('speechSynthesis', undefined);
  expect(() => speak('A', 'en-US')).not.toThrow();
});
