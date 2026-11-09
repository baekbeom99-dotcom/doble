import type { ModeTable } from '../state';
import { score } from './score';
import { soloSurvival } from './soloSurvival';

export const MODES: ModeTable = { soloSurvival, score };
