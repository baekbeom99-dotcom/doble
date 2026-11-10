/** 거북이가 설 수 있는 가로 칸 (가운데 0, 화면 양 끝 ±1) */
export const ROAM_SLOTS = [-1, -0.5, 0, 0.5, 1] as const;

const ROAM_FROM_STAGE = 3;
const ROAM_START_MS = 8000;
const ROAM_STEP_MS = 1500;
const ROAM_MIN_MS = 2500;

/** 자리를 옮기는 간격. 세 번째 거북이부터 옮기고, 단계가 높을수록 자주 옮긴다 */
export function roamInterval(stage: number): number | null {
  if (stage < ROAM_FROM_STAGE) return null;
  return Math.max(ROAM_MIN_MS, ROAM_START_MS - (stage - ROAM_FROM_STAGE) * ROAM_STEP_MS);
}

/** 지금 칸이 아닌 다른 칸을 고른다 */
export function nextRoam(current: number, rand: () => number = Math.random): number {
  const others = ROAM_SLOTS.filter(v => v !== current);
  return others[Math.min(others.length - 1, Math.floor(rand() * others.length))];
}
