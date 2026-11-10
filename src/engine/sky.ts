import type { Ellipse } from './geometry';
import type { TableGeom } from './seats';

/** 해(또는 달)가 왼쪽 중간에서 오른쪽 중간까지 가는 데 걸리는 정답 수 */
export const SKY_STEPS = 7;
/** 화면 가장자리와 해 사이 여백 (짧은 변 대비) */
export const SKY_MARGIN = 0.03;

/**
 * 혼자 하기 거북이 뒤통수(엄지손가락 모양 기둥). 자리 타원 반지름 단위:
 * 가로 반폭 halfWidth, 꼭대기는 등껍질 아래 끝에서 top배 높이.
 */
export const TURTLE_HEAD = { halfWidth: 0.36, top: 1.3 } as const;

export type SkyBody = 'sun' | 'moon';
/** t: 0 왼쪽 중간(뜰 때) → 0.5 위 가운데 → 1 오른쪽 중간(질 때) */
export interface SkyPhase { body: SkyBody; t: number }

/** 정답 수로 지금 해·달과 위치를 정한다. 해가 오른쪽에 닿으면 왼쪽에서 달이 뜬다 */
export function skyPhase(correct: number): SkyPhase {
  const k = ((correct % (2 * SKY_STEPS)) + 2 * SKY_STEPS) % (2 * SKY_STEPS);
  return { body: k < SKY_STEPS ? 'sun' : 'moon', t: (k % SKY_STEPS) / (SKY_STEPS - 1) };
}

/** 반지름 R인 해의 중심. 수평선(화면 가운데 높이)에서 떠서 위로 반타원을 그린다 */
export function skyArc(W: number, H: number, R: number, t: number): Ellipse {
  const m = SKY_MARGIN * Math.min(W, H);
  const a = W / 2 - m - R, b = H / 2 - m - R;
  const angle = Math.PI * t;
  return { cx: W / 2 - a * Math.cos(angle), cy: H / 2 - b * Math.sin(angle), rx: R, ry: R };
}

export function skyCenter(table: TableGeom, W: number, H: number, t: number): Ellipse {
  return skyArc(W, H, table.center.rx, t);
}

type Keys = [string, string, string];
const PALETTE: Record<SkyBody, { sky: Keys; sea: Keys }> = {
  // 해 뜰 녘 → 한낮 → 해 질 녘
  sun: { sky: ['#ffc2a8', '#9adcff', '#ffa877'], sea: ['#5f93bd', '#3aa3d4', '#4f6fa6'] },
  // 초저녁 → 한밤 → 새벽 전
  moon: { sky: ['#5d4f9c', '#262d5e', '#4c4188'], sea: ['#2d4079', '#17214b', '#2a3b74'] },
};

function mix(a: string, b: string, f: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (n: number, s: number) => (n >> s) & 255;
  const c = [16, 8, 0].map(s => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * f));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

function along(keys: Keys, t: number): string {
  return t <= 0.5 ? mix(keys[0], keys[1], t / 0.5) : mix(keys[1], keys[2], (t - 0.5) / 0.5);
}

/** 해·달 위치에 어울리는 하늘·바다 색 */
export function skyPalette(p: SkyPhase): { sky: string; sea: string } {
  const k = PALETTE[p.body];
  return { sky: along(k.sky, p.t), sea: along(k.sea, p.t) };
}
