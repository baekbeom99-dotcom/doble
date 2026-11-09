import type { ModeTable } from '../state';
import { bomb } from './bomb';
import { score } from './score';
import { soloSurvival } from './soloSurvival';
import { tower } from './tower';

/** coop은 Task 2에서 실제 협동 모드로 바꾼다 */
export const MODES: ModeTable = { soloSurvival, score, tower, bomb, coop: score };
