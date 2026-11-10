import type { ModeTable } from '../state';
import { bomb } from './bomb';
import { coop } from './coop';
import { score } from './score';
import { soloStage } from './soloStage';
import { soloSurvival } from './soloSurvival';
import { tower } from './tower';

export const MODES: ModeTable = { soloSurvival, soloStage, score, tower, bomb, coop };
