import type { ModeTable } from '../state';
import { bomb } from './bomb';
import { score } from './score';
import { soloSurvival } from './soloSurvival';
import { tower } from './tower';

export const MODES: ModeTable = { soloSurvival, score, tower, bomb };
