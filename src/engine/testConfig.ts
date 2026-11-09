import { DEFAULT_BOMB, NO_RULES, type GameConfig } from './state';

/** 테스트 공용 심볼 id 목록 (21개) */
export const TEST_POOL: string[] = Array.from({ length: 21 }, (_, i) => `s${i}`);

/** 테스트 공용 기본 설정: 2인 점수제, 덧붙는 요소 없음 */
export function testConfig(over: Partial<GameConfig> = {}): GameConfig {
  return {
    mode: 'score',
    players: [{ name: 'A', color: 'pink', cardSize: 5 }, { name: 'B', color: 'sky', cardSize: 5 }],
    set: { kind: 'syllable', initial: 'ㄱ', batchim: false },
    rotationStep: 90,
    symbolRotation: false,
    speech: false,
    scoreRounds: 20,
    seed: 1,
    rules: NO_RULES,
    teams: null,
    bomb: DEFAULT_BOMB,
    ...over,
  };
}
