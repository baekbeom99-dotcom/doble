import type { SymbolDef } from './types';

/** 대문자와 모양이 같아 크기로만 구분되는 소문자. 섞기 모드에서 뺀다. */
export const LOOKALIKE_LOWER = ['c', 'o', 's', 'u', 'v', 'w', 'x', 'z'] as const;

const UPPER = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const LOWER = UPPER.map(c => c.toLowerCase());

const toSymbol = (c: string): SymbolDef => ({
  id: `en:${c}`,
  display: { kind: 'text', value: c },
  speech: c,
  lang: 'en-US',
  tags: {},
});

export function alphabetSymbols(letterCase: 'upper' | 'lower' | 'mixed'): SymbolDef[] {
  if (letterCase === 'upper') return UPPER.map(toSymbol);
  if (letterCase === 'lower') return LOWER.map(toSymbol);
  const lookalike: readonly string[] = LOOKALIKE_LOWER;
  return [...UPPER, ...LOWER.filter(c => !lookalike.includes(c))].map(toSymbol);
}
