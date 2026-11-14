import { primeSpeech, speak } from './speech';

class Utterance { lang = ''; rate = 1; volume = 1; voice: unknown = null; constructor(public text: string) {} }

function stubSynth(over: Record<string, unknown> = {}) {
  const synth = { speak: vi.fn(), cancel: vi.fn(), resume: vi.fn(), getVoices: vi.fn(() => [] as unknown[]), speaking: false, pending: false, ...over };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance);
  return synth;
}

// 소리 장치는 한 번 만들면 계속 쓰므로 감시 함수도 테스트끼리 함께 쓴다
const start = vi.fn();
function stubAudio() {
  const node = () => ({ connect: vi.fn(function (this: unknown, next: unknown) { return next; }) });
  class Ctx {
    currentTime = 0;
    destination = {};
    resume = vi.fn();
    createOscillator = () => ({ ...node(), type: '', frequency: { value: 0 }, start, stop: vi.fn() });
    createGain = () => ({ ...node(), gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() } });
  }
  vi.stubGlobal('AudioContext', Ctx);
  return start;
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); start.mockClear(); });

test('speechSynthesis가 있으면 언어를 지정해 읽고, 읽는 중이 아니면 끊지 않는다', () => {
  const synth = stubSynth();
  speak('가', 'ko-KR');
  expect(synth.cancel).not.toHaveBeenCalled();
  expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: '가', lang: 'ko-KR', rate: 0.9 });
});
test('읽는 중이면 끊고 잠깐 기다렸다가 새 소리를 낸다 (끊자마자 읽으면 안드로이드에서 소리가 사라진다)', () => {
  vi.useFakeTimers();
  const synth = stubSynth({ speaking: true });
  speak('나', 'ko-KR');
  expect(synth.cancel).toHaveBeenCalledTimes(1);
  expect(synth.speak).not.toHaveBeenCalled();
  vi.advanceTimersByTime(80);
  expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: '나' });
});
test('그 언어의 목소리가 있으면 그 목소리로 읽는다', () => {
  const ko = { lang: 'ko_KR', name: '한국어' };
  const synth = stubSynth({ getVoices: vi.fn(() => [{ lang: 'en-US' }, ko]) });
  speak('다', 'ko-KR');
  expect(synth.speak.mock.calls[0][0].voice).toBe(ko);
});
test('읽어 줄 목소리가 없는 기기에서는 딩동 소리를 대신 낸다', () => {
  stubAudio();
  const synth = stubSynth({ getVoices: vi.fn(() => [{ lang: 'en-US' }]) });
  speak('라', 'ko-KR');
  expect(synth.speak).not.toHaveBeenCalled();
  expect(start).toHaveBeenCalled();
});
test('speechSynthesis가 없으면 딩동 소리를 내고, 그것도 없으면 조용히 넘어간다', () => {
  vi.stubGlobal('speechSynthesis', undefined);
  expect(() => speak('A', 'en-US')).not.toThrow();
  stubAudio();
  speak('A', 'en-US');
  expect(start).toHaveBeenCalled();
});
test('primeSpeech는 소리 없는 한마디로 브라우저의 소리 허락을 받아 둔다', () => {
  const synth = stubSynth();
  primeSpeech();
  expect(synth.getVoices).toHaveBeenCalled();
  expect(synth.speak.mock.calls[0][0]).toMatchObject({ text: '', volume: 0 });
});
