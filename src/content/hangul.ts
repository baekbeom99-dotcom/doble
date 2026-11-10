import type { SymbolDef } from './types';

/** 유니코드 초성 순서 (19개) */
export const INITIALS = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'] as const;
export const BASIC_CONSONANTS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'] as const;

const CONSONANT_NAMES = ['기역', '쌍기역', '니은', '디귿', '쌍디귿', '리을', '미음', '비읍', '쌍비읍', '시옷', '쌍시옷', '이응', '지읒', '쌍지읒', '치읓', '키읔', '티읕', '피읖', '히읗'];

/** 유니코드 중성 순서 (21개) */
const VOWELS = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
/** 아이 한글 학습의 기본 모음 10개. 이중모음(ㅐ ㅒ ㅔ ㅖ ㅘ ㅙ ㅚ ㅝ ㅞ ㅟ ㅢ)은 쓰지 않는다 */
const BASIC_VOWELS = ['ㅏ', 'ㅑ', 'ㅓ', 'ㅕ', 'ㅗ', 'ㅛ', 'ㅜ', 'ㅠ', 'ㅡ', 'ㅣ'];
/** 받침 있는 세트에 쓰는 모음과 대표 받침(종성 인덱스) */
const BATCHIM_VOWELS = ['ㅏ', 'ㅓ', 'ㅗ', 'ㅜ', 'ㅡ', 'ㅣ'];
const FINALS: [string, number][] = [['ㄱ', 1], ['ㄴ', 4], ['ㄷ', 7], ['ㄹ', 8], ['ㅁ', 16], ['ㅂ', 17], ['ㅇ', 21]];

export function consonantSymbols(includeDouble: boolean): SymbolDef[] {
  const list: readonly string[] = includeDouble ? INITIALS : BASIC_CONSONANTS;
  return list.map(c => ({
    id: `ko-c:${c}`,
    display: { kind: 'text', value: c },
    speech: CONSONANT_NAMES[INITIALS.indexOf(c as (typeof INITIALS)[number])],
    lang: 'ko-KR',
    tags: { initial: c },
  }));
}

function compose(cho: number, jung: number, jong: number): string {
  return String.fromCharCode(0xac00 + (cho * 21 + jung) * 28 + jong);
}

function syllable(initial: string, vowel: string, final?: [string, number]): SymbolDef {
  const value = compose(INITIALS.indexOf(initial as (typeof INITIALS)[number]), VOWELS.indexOf(vowel), final ? final[1] : 0);
  return {
    id: `ko-s:${value}`,
    display: { kind: 'text', value },
    speech: value,
    lang: 'ko-KR',
    tags: { initial, vowel, batchim: !!final, ...(final ? { final: final[0] } : {}) },
  };
}

export function syllableSymbols(initial: string, batchim: boolean): SymbolDef[] {
  if (!INITIALS.includes(initial as (typeof INITIALS)[number])) throw new Error(`초성이 아니에요: ${initial}`);
  if (!batchim) return BASIC_VOWELS.map(v => syllable(initial, v));
  return BATCHIM_VOWELS.flatMap(v => FINALS.map(f => syllable(initial, v, f)));
}
