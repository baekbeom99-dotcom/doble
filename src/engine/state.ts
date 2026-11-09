import type { SetConfig } from '../content/types';
import type { SeatColor } from './seats';

export type ModeId = 'soloSurvival' | 'score' | 'tower';
export type ItemId = 'freeze' | 'swirl' | 'hint' | 'shield';

export interface PlayerConfig { name: string; color: SeatColor; cardSize: number }

/** 같이 하기에 덧붙는 요소 */
export interface Rules { combo: boolean; finalRound: boolean; items: boolean }
export const NO_RULES: Rules = { combo: false, finalRound: false, items: false };
export const ALL_RULES: Rules = { combo: true, finalRound: true, items: true };

export interface BombConfig { startHand: number; target: 'random' | 'choose' }
export const DEFAULT_BOMB: BombConfig = { startHand: 5, target: 'random' };

export interface GameConfig {
  mode: ModeId;
  players: PlayerConfig[];
  set: SetConfig;
  rotationStep: 90 | 180;
  symbolRotation: boolean;
  speech: boolean;
  /** 라운드 수 (점수제·폭탄), 카드 수 (탑 쌓기). 기본 20 */
  scoreRounds: number;
  seed: number;
  rules: Rules;
  /** 플레이어별 팀 번호(0 또는 1). 팀전이 아니면 null */
  teams: number[] | null;
  bomb: BombConfig;
}

export interface PlayerState {
  /** 점수제: 점수, 탑 쌓기: 탑 높이, 폭탄 돌리기: 손에 든 장수 */
  score: number;
  lockedUntil: number;
  /** 이 사람이 연속으로 맞힌 횟수 */
  streak: number;
  item: ItemId | null;
  /** 뒤섞기 공격을 받아 글자가 도는 시각까지 */
  spinUntil: number;
  /** 힌트를 쓴 라운드 번호 (-1이면 없음) */
  hintRound: number;
}

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
  | { type: 'TICK'; dt: number }
  | { type: 'USE_ITEM'; player: number }
  | { type: 'CHOOSE_TARGET'; player: number; target: number };

export type GameEvent =
  | { type: 'correct'; player: number; symbol: string; value: number }
  | { type: 'wrong'; player: number }
  | { type: 'round'; index: number }
  | { type: 'over' }
  | { type: 'gotItem'; player: number; item: ItemId }
  | { type: 'usedItem'; player: number; item: ItemId }
  | { type: 'blocked'; player: number }
  | { type: 'give'; from: number; to: number; count: number };

export interface Mode {
  init(config: GameConfig): Record<string, number>;
  /** 플레이어 초기 상태를 덮어쓴다 (예: 폭탄 돌리기의 시작 장수) */
  initPlayer?(config: GameConfig, player: number): Partial<PlayerState>;
  onCorrect(s: GameState, player: number, value: number): { state: GameState; nextRound: boolean; events?: GameEvent[] };
  onWrong(s: GameState, player: number): GameState;
  onTick(s: GameState, dt: number): { state: GameState; events?: GameEvent[] };
  isOver(s: GameState): boolean;
}

export type ModeTable = Record<ModeId, Mode>;

export const LOCK_MS = 1500;

/** 라운드마다 난수 시드를 바꾸는 간격 */
export const ROUND_SEED_STEP = 7919;
