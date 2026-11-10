import type { SetConfig, SymbolDef } from '../content/types';
import type { SeatColor } from './seats';

export type ModeId = 'soloSurvival' | 'soloStage' | 'score' | 'tower' | 'bomb' | 'coop';
export type ItemId = 'freeze' | 'swirl' | 'hint' | 'shield' | 'timeStop' | 'double';
export type Grade = 'perfect' | 'great' | 'good';

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
  /** 스테이지 도전의 단계 (1~20) */
  stage?: number;
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

export type ChallengeKind = 'elements' | 'quota';
export type RewardId = 'heal' | 'bonus' | 'special';

export interface Mission {
  text: string;
  /** 미션 대상 심볼 id */
  ids: string[];
  target: number;
  progress: number;
  reward: RewardId;
  done: boolean;
}

export interface Challenge {
  kind: ChallengeKind;
  timeLeft: number;
  /** 원소 순서 (공동 목표면 빈 배열) */
  sequence: number[];
  /** 원소 순서에서 지금 차례 위치 */
  step: number;
  /** 공동 목표 수 (원소 순서면 sequence.length) */
  target: number;
  /** 공동 목표 진행 수 */
  count: number;
}

export interface CoopState {
  stage: number;
  hearts: number;
  hp: number;
  maxHp: number;
  /** 몬스터 공격까지 남은 시간 */
  attackLeft: number;
  /** 지금까지 시작한 방어 챌린지 수 (난수 시드용) */
  attackCount: number;
  /** 이번 라운드에 맞힌 사람 */
  answered: boolean[];
  challenge: Challenge | null;
  mission: Mission;
  /** 미션을 새로 만들 때 쓰는 심볼 정보 */
  symbols: SymbolDef[];
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
  /** 협동 상태 (협동이 아니면 null) */
  coop: CoopState | null;
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
  | { type: 'give'; from: number; to: number; count: number }
  | { type: 'damage'; amount: number; combo: boolean }
  | { type: 'monsterDown'; stage: number }
  | { type: 'heartLost' }
  | { type: 'challengeStart'; kind: ChallengeKind }
  | { type: 'challengeEnd'; success: boolean }
  | { type: 'missionDone'; reward: RewardId }
  | { type: 'grade'; grade: Grade; points: number }
  | { type: 'fever' };

export interface Mode {
  init(config: GameConfig): Record<string, number>;
  /** 플레이어 초기 상태를 덮어쓴다 (예: 폭탄 돌리기의 시작 장수) */
  initPlayer?(config: GameConfig, player: number): Partial<PlayerState>;
  onCorrect(s: GameState, player: number, value: number): { state: GameState; nextRound: boolean; events?: GameEvent[] };
  onWrong(s: GameState, player: number): GameState;
  onTick(s: GameState, dt: number): { state: GameState; events?: GameEvent[] };
  isOver(s: GameState): boolean;
  /** false면 이 사람의 터치를 무시한다 (이미 맞힌 사람, 차례가 아닌 사람 등) */
  canTap?(s: GameState, player: number): boolean;
  /** 협동 상태를 만든다 */
  initCoop?(config: GameConfig, ctx: { pool: string[]; symbols: SymbolDef[] }): CoopState;
}

export type ModeTable = Record<ModeId, Mode>;

export const LOCK_MS = 1500;

/** 라운드마다 난수 시드를 바꾸는 간격 */
export const ROUND_SEED_STEP = 7919;
