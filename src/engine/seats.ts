import type { Ellipse, Rect, Region } from './geometry';

export const SEAT_COLORS = {
  pink: '#FF8FB8',
  sky: '#7FDBFF',
  yellow: '#FFE14D',
  lime: '#B8F26B',
  purple: '#A99BFF',
} as const;
export type SeatColor = keyof typeof SEAT_COLORS;

const SHADOW_BASE = [0x2b, 0x2b, 0x2b];

/** 채도를 낮춘 그림자 색: #2B2B2B 75% + 영역색 25%. 'r,g,b' 문자열 */
export function shadowColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return rgb.map((c, i) => Math.round(SHADOW_BASE[i] * 0.75 + c * 0.25)).join(',');
}

export interface SeatGeom { index: number; region: Region; facing: 0 | 180; badge: Rect }
export interface TableGeom {
  center: Ellipse;
  seats: SeatGeom[];
  hud: { rect: Rect; facing: 0 | 180 }[];
}

const CENTER_RATIO = 0.22;
const MIN_GAP_RATIO = 0.2;
const SHRINK = 0.95;

function centeredRect(cx: number, cy: number, w: number, h: number): Rect {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** 타원 경계와 점 사이 최소 거리 (점은 타원 밖에 있다고 가정, 경계 샘플링) */
function ellipseGap(e: Ellipse, px: number, py: number): number {
  let min = Infinity;
  for (let i = 0; i < 360; i++) {
    const a = (i * Math.PI) / 180;
    min = Math.min(min, Math.hypot(e.cx + e.rx * Math.cos(a) - px, e.cy + e.ry * Math.sin(a) - py));
  }
  return min;
}

export function computeTable(playerCount: 1 | 2 | 3 | 4, W: number, H: number): TableGeom {
  const R0 = CENTER_RATIO * Math.min(W, H);
  const center: Ellipse = { cx: W / 2, cy: H / 2, rx: R0, ry: R0 };
  const hudH = 0.075 * H;
  const screen: Rect = { x: 0, y: 0, w: W, h: H };
  const minGap = MIN_GAP_RATIO * R0;
  return playerCount <= 2
    ? halfCircleTable(playerCount, W, H, center, hudH, screen, minGap)
    : cornerTable(playerCount, W, H, center, hudH, screen, minGap);
}

function halfCircleTable(n: 1 | 2, W: number, H: number, center: Ellipse, hudH: number, screen: Rect, minGap: number): TableGeom {
  let r = 0.4 * H;
  const gapOf = (r: number) => Math.hypot(W - 0.94 * r - center.cx, H - center.cy) - r - center.rx;
  while (gapOf(r) < minGap) r *= SHRINK;

  const bw = 0.11 * W;
  const cos = Math.cos((20 * Math.PI) / 180), sin = Math.sin((20 * Math.PI) / 180);
  const bottom = { cx: W - 0.94 * r, cy: H };
  const seats: SeatGeom[] = [{
    index: 0,
    region: { ellipse: { ...bottom, rx: r, ry: r }, clip: screen },
    facing: 0,
    badge: centeredRect(bottom.cx - r * cos, bottom.cy - r * sin, bw, hudH),
  }];
  const hud: TableGeom['hud'] = [{ rect: { x: 0.02 * W, y: H - 0.02 * H - hudH, w: 0.16 * W, h: hudH }, facing: 0 }];

  if (n === 2) {
    const top = { cx: 0.94 * r, cy: 0 };
    seats.push({
      index: 1,
      region: { ellipse: { ...top, rx: r, ry: r }, clip: screen },
      facing: 180,
      badge: centeredRect(top.cx + r * cos, top.cy + r * sin, bw, hudH),
    });
    hud.push({ rect: { x: W - 0.18 * W, y: 0.02 * H, w: 0.16 * W, h: hudH }, facing: 180 });
  }
  return { center, seats, hud };
}

/** 자리 순서: 0 왼쪽 아래, 1 오른쪽 아래, 2 오른쪽 위, 3 왼쪽 위. 3인은 0, 1, 3 위치를 쓴다 */
const CORNERS = [
  { left: true, bottom: true },
  { left: false, bottom: true },
  { left: false, bottom: false },
  { left: true, bottom: false },
];

function cornerTable(n: 3 | 4, W: number, H: number, center: Ellipse, hudH: number, screen: Rect, minGap: number): TableGeom {
  let rx = 0.3 * W, ry = 0.29 * H;
  const fits = () => {
    if ((4 * rx) / 3 > W / 2 - 4 || (4 * ry) / 3 > H / 2 - 4) return false;
    const e = { cx: rx / 3, cy: ry / 3, rx, ry };
    return ellipseGap(e, center.cx, center.cy) - center.rx >= minGap;
  };
  while (!fits()) { rx *= SHRINK; ry *= SHRINK; }

  const positions = n === 4 ? [0, 1, 2, 3] : [0, 1, 3];
  const bw = 0.07 * W;
  const seats = positions.map((pos, index): SeatGeom => {
    const { left, bottom } = CORNERS[pos];
    const cx = left ? rx / 3 : W - rx / 3;
    const cy = bottom ? H - ry / 3 : ry / 3;
    return {
      index,
      region: { ellipse: { cx, cy, rx, ry }, clip: screen },
      facing: bottom ? 0 : 180,
      badge: centeredRect(left ? cx + rx : cx - rx, cy, bw, hudH),
    };
  });
  const y = H / 2 - hudH / 2;
  const hud: TableGeom['hud'] = [
    { rect: { x: 0.02 * W, y, w: 0.16 * W, h: hudH }, facing: 0 },
    { rect: { x: W - 0.18 * W, y, w: 0.16 * W, h: hudH }, facing: 180 },
  ];
  return { center, seats, hud };
}
