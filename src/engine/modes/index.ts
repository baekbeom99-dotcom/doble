import type { ModeTable } from '../state';
import { bomb } from './bomb';
import { coop } from './coop';
import { score } from './score';
import { soloStage } from './soloStage';
import { soloSurvival } from './soloSurvival';

export const MODES: ModeTable = { soloSurvival, soloStage, score, bomb, coop };
