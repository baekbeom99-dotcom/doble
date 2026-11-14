const RATE = 0.9;
/** 읽던 소리를 끊은 뒤 새 소리를 내기까지 기다리는 시간. 안드로이드 크롬은 끊자마자 읽으라고 하면 새 소리까지 삼킨다 */
const AFTER_CANCEL_MS = 80;

type Lang = 'ko-KR' | 'en-US';
type AudioCtor = typeof AudioContext;

let pending: ReturnType<typeof setTimeout> | null = null;
let audio: AudioContext | null = null;

function synthOf(): SpeechSynthesis | null {
  const synth = globalThis.speechSynthesis;
  return synth && typeof globalThis.SpeechSynthesisUtterance === 'function' ? synth : null;
}

/** 그 언어를 읽을 수 있는 목소리. 목록을 아직 못 받았으면 undefined, 받았는데 없으면 null */
function voiceFor(synth: SpeechSynthesis, lang: Lang): SpeechSynthesisVoice | null | undefined {
  const voices = synth.getVoices?.() ?? [];
  if (voices.length === 0) return undefined;
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const prefix = lang.slice(0, 2).toLowerCase();
  return voices.find(v => norm(v.lang) === lang.toLowerCase()) ?? voices.find(v => norm(v.lang).startsWith(prefix)) ?? null;
}

/** 읽어 줄 목소리가 없는 기기에서 대신 내는 짧은 딩동 소리 */
function chime(): void {
  const Ctor: AudioCtor | undefined = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return;
  try {
    audio ??= new Ctor();
    void audio.resume?.();
    const t = audio.currentTime;
    [880, 1320].forEach((freq, i) => {
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.25);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t + i * 0.09);
      osc.stop(t + i * 0.09 + 0.3);
    });
  } catch {
    // 소리를 못 내도 게임은 그대로 이어진다
  }
}

/** 정답 글자를 소리로 읽어준다. 읽어 줄 목소리가 없는 기기에서는 딩동 소리를 낸다 */
export function speak(text: string, lang: Lang): void {
  const synth = synthOf();
  if (!synth) { chime(); return; }
  const voice = voiceFor(synth, lang);
  if (voice === null) { chime(); return; }

  const say = () => {
    pending = null;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = RATE;
    if (voice) u.voice = voice;
    // 크롬은 가끔 멈춘 상태로 남아 있어서 읽기 전에 풀어 준다
    synth.resume?.();
    synth.speak(u);
  };

  if (pending) clearTimeout(pending);
  if (synth.speaking || synth.pending) {
    synth.cancel();
    pending = setTimeout(say, AFTER_CANCEL_MS);
  } else {
    say();
  }
}

/**
 * 소리 낼 준비: 사용자가 버튼을 누른 순간에 불러야 한다.
 * 모바일 브라우저는 누른 순간에 한 번 소리를 내 봐야 그 뒤의 소리를 허락하고, 목소리 목록도 이때부터 불러온다
 */
export function primeSpeech(): void {
  const synth = synthOf();
  if (!synth) return;
  synth.getVoices?.();
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0;
  synth.speak(u);
}
