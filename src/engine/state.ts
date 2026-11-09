import type { SetConfig } from '../content/types';
import type { SeatColor } from './seats';

export type ModeId = 'soloSurvival' | 'score';

export interface PlayerConfig { name: string; color: SeatColor; cardSize: number }

export interface GameConfig {
  mode: ModeId;
  players: PlayerConfig[];
  set: SetConfig;
  rotationStep: 90 | 180;
  symbolRotation: boolean;
  speech: boolean;
  /** 점수제 라운드 수 (기본 20) */
  scoreRounds: number;
  seed: number;
}

export interface PlayerState { score: number; lockedUntil: number }

export interface RoundState {
  index: number;
  center: string[];
  cards: string[][];
  answers: string[];
  rotation: number;
}

export interface GameState {
  config: GameConfig;
  pool: string[];
  now: number;
  phase: 'playing' | 'over';
  players: PlayerState[];
  round: RoundState;
  /** 모드별 숫자 상태 */
  mode: Record<string, number>;
}

export type Action =
  | { type: 'TAP'; player: number; symbol: string; round: number }
  | { type: 'TICK'; dt: number };

export type GameEvent =
  | { type: 'correct'; player: number; symbol: string }
  | { type: 'wrong'; player: number }
  | { type: 'round'; index: number }
  | { type: 'over' };

export interface Mode {
  init(config: GameConfig): Record<string, number>;
  onCorrect(s: GameState, player: number): { state: GameState; nextRound: boolean };
  onWrong(s: GameState, player: number): GameState;
  onTick(s: GameState, dt: number): GameState;
  isOver(s: GameState): boolean;
}

export type ModeTable = Record<ModeId, Mode>;

export const LOCK_MS = 1500;
