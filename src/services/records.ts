import { BADGES, masterBadge, type Badge } from '../content/badges';
import type { GameState, ModeId } from '../engine/state';

export const RECORDS_KEY = 'doble.records.v1';
const STAGE_COUNT = 20;
const MASTER_STAGE = 10;

export interface Records {
  version: 1;
  /** `${mode}|${setId}` → 서바이벌 점수 또는 몬스터 사냥 도달 단계 */
  best: Record<string, number>;
  /** setId → 스테이지별 최고 별 (index 0 = 1단계) */
  stars: Record<string, number[]>;
  /** setId → 열린 최고 단계 (기본 1) */
  unlocked: Record<string, number>;
  totalCorrect: number;
  fevers: number;
  badges: string[];
}

export interface GameSummary {
  mode: ModeId;
  setId: string;
  setName: string;
  score: number;
  correct: number;
  fevers: number;
  stage?: number;
  cleared?: boolean;
  stars?: number;
  reached?: number;
}

export const EMPTY_RECORDS: Records = { version: 1, best: {}, stars: {}, unlocked: {}, totalCorrect: 0, fevers: 0, badges: [] };

const bestKey = (mode: ModeId, setId: string) => `${mode}|${setId}`;

export function bestFor(r: Records, mode: ModeId, setId: string): number | null {
  return r.best[bestKey(mode, setId)] ?? null;
}

/** 혼자 하기(서바이벌·스테이지·1인 협동) 결과를 요약한다. 그 밖은 null */
export function summarize(s: GameState, setId: string, setName: string): GameSummary | null {
  const { mode } = s.config;
  const base = { mode, setId, setName, score: s.mode.score ?? 0, correct: s.mode.correct ?? 0, fevers: s.mode.fevers ?? 0 };
  if (mode === 'soloSurvival') return base;
  if (mode === 'soloStage') return { ...base, stage: s.config.stage ?? 1, cleared: s.mode.cleared === 1, stars: s.mode.stars };
  if (mode === 'coop' && s.players.length === 1 && s.coop) return { ...base, score: 0, correct: 0, fevers: 0, reached: s.coop.stage };
  return null;
}

const totalStars = (r: Records) => Object.values(r.stars).flat().reduce((a, b) => a + b, 0);

/** 이번 게임 뒤 새로 받는 배지 (r은 이번 게임을 반영한 기록) */
function earnedBadges(r: Records, g: GameSummary): Badge[] {
  const candidates: [Badge, boolean][] = [
    [BADGES[0], true],
    [BADGES[1], r.fevers > 0],
    [BADGES[2], g.mode === 'soloSurvival' && g.correct >= 30],
    [BADGES[3], r.totalCorrect >= 100],
    [BADGES[4], totalStars(r) >= 30],
    [BADGES[5], g.mode === 'coop' && (g.reached ?? 0) >= 5],
    [masterBadge(g.setId, g.setName), g.mode === 'soloStage' && !!g.cleared && (g.stage ?? 0) >= MASTER_STAGE],
  ];
  return candidates.filter(([b, ok]) => ok && !r.badges.includes(b.id)).map(([b]) => b);
}

export function applyGame(r: Records, g: GameSummary): { records: Records; newBest: boolean; newBadges: Badge[] } {
  const next: Records = {
    ...r,
    best: { ...r.best },
    stars: { ...r.stars },
    unlocked: { ...r.unlocked },
    totalCorrect: r.totalCorrect + g.correct,
    fevers: r.fevers + g.fevers,
    badges: [...r.badges],
  };
  let newBest = false;
  const raise = (value: number) => {
    const key = bestKey(g.mode, g.setId);
    const prev = next.best[key];
    if (prev === undefined ? value > 0 : value > prev) {
      next.best[key] = value;
      newBest = true;
    }
  };
  if (g.mode === 'soloSurvival') raise(g.score);
  if (g.mode === 'coop' && g.reached !== undefined) raise(g.reached);
  if (g.mode === 'soloStage' && g.cleared && g.stage) {
    const stars = [...(next.stars[g.setId] ?? [])];
    while (stars.length < g.stage) stars.push(0);
    if ((g.stars ?? 0) > stars[g.stage - 1]) {
      stars[g.stage - 1] = g.stars ?? 0;
      newBest = true;
    }
    next.stars[g.setId] = stars;
    next.unlocked[g.setId] = Math.max(next.unlocked[g.setId] ?? 1, Math.min(STAGE_COUNT, g.stage + 1));
  }
  const newBadges = earnedBadges(next, g);
  next.badges.push(...newBadges.map(b => b.id));
  return { records: next, newBest, newBadges };
}

const isMap = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 저장된 기록의 모양을 안쪽 값까지 확인한다 */
function isRecords(x: unknown): x is Records {
  if (!isMap(x)) return false;
  const r = x as Partial<Records>;
  return r.version === 1 &&
    isMap(r.best) && Object.values(r.best).every(isNum) &&
    isMap(r.stars) && Object.values(r.stars).every(v => Array.isArray(v) && v.every(isNum)) &&
    isMap(r.unlocked) && Object.values(r.unlocked).every(isNum) &&
    isNum(r.totalCorrect) && isNum(r.fevers) &&
    Array.isArray(r.badges) && r.badges.every(b => typeof b === 'string');
}

/** 저장소를 꺼낸다. 브라우저가 접근을 막으면(SecurityError) 여기서 예외가 나므로 try 안에서만 부른다 */
const storageOf = (storage?: Storage) => storage ?? globalThis.localStorage;

/** 저장된 기록을 읽는다. 읽을 수 없거나 망가졌으면 빈 기록 */
export function loadRecords(storage?: Storage): Records {
  try {
    const raw = storageOf(storage)?.getItem(RECORDS_KEY);
    if (!raw) return EMPTY_RECORDS;
    const parsed: unknown = JSON.parse(raw);
    return isRecords(parsed) ? parsed : EMPTY_RECORDS;
  } catch {
    return EMPTY_RECORDS;
  }
}

/** 기록을 저장한다. 저장할 수 없으면(사생활 보호 모드 등) 조용히 넘어간다 */
export function saveRecords(r: Records, storage?: Storage): void {
  try {
    storageOf(storage)?.setItem(RECORDS_KEY, JSON.stringify(r));
  } catch {
    // 저장 실패는 게임 진행에 영향을 주지 않는다
  }
}
