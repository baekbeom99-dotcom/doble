const RATE = 0.9;

/** 정답 글자를 소리로 읽어준다. 브라우저가 지원하지 않으면 아무것도 하지 않는다 */
export function speak(text: string, lang: 'ko-KR' | 'en-US'): void {
  const synth = globalThis.speechSynthesis;
  if (!synth || typeof globalThis.SpeechSynthesisUtterance !== 'function') return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = RATE;
  synth.speak(u);
}
