export interface SymbolDef {
  id: string;
  display: { kind: 'text'; value: string } | { kind: 'image'; src: string };
  /** 정답일 때 읽어줄 말 */
  speech: string;
  lang: 'ko-KR' | 'en-US';
  tags: { initial?: string; vowel?: string; batchim?: boolean; final?: string };
}

export interface SymbolSet {
  id: string;
  name: string;
  loadSymbols(): Promise<SymbolDef[]>;
}

export type SetConfig =
  | { kind: 'consonant'; includeDouble: boolean }
  | { kind: 'syllable'; initial: string; batchim: boolean }
  | { kind: 'alphabet'; letterCase: 'upper' | 'lower' | 'mixed' };
