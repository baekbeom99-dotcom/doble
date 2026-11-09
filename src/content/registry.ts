import { alphabetSymbols } from './alphabet';
import { consonantSymbols, syllableSymbols } from './hangul';
import type { SetConfig, SymbolDef, SymbolSet } from './types';

export const MIN_CARD_SIZE = 3;
export const MAX_CARD_SIZE = 8;

/** 카드당 심볼 수가 n일 때 필요한 최소 심볼 수 */
export function minPoolSize(cardSize: number): number {
  return cardSize * 2 - 1;
}

/** 심볼 수로 쓸 수 있는 카드당 최대 심볼 수 (3~8). 불가능하면 0 */
export function maxCardSize(poolSize: number): number {
  for (let n = MAX_CARD_SIZE; n >= MIN_CARD_SIZE; n--) if (minPoolSize(n) <= poolSize) return n;
  return 0;
}

const CASE_NAMES = { upper: '대문자', lower: '소문자', mixed: '대소문자' } as const;

function describe(config: SetConfig): { name: string; build: () => SymbolDef[] } {
  switch (config.kind) {
    case 'consonant':
      return { name: config.includeDouble ? '자음+쌍자음' : '자음', build: () => consonantSymbols(config.includeDouble) };
    case 'syllable':
      return {
        name: `${config.initial} ${config.batchim ? '받침 글자' : '글자'}`,
        build: () => syllableSymbols(config.initial, config.batchim),
      };
    case 'alphabet':
      return { name: CASE_NAMES[config.letterCase], build: () => alphabetSymbols(config.letterCase) };
  }
}

export function createSymbolSet(config: SetConfig): SymbolSet {
  const { name, build } = describe(config);
  return { id: JSON.stringify(config), name, loadSymbols: async () => build() };
}
