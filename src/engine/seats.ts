import { pointInRegion, type Ellipse, type Rect, type Region } from './geometry';
import { skyArc } from './sky';

export const SEAT_COLORS = {
  pink: '#F4AEBD',
  sky: '#A3D2E6',
  yellow: '#F4D97F',
  lime: '#C2DF97',
  purple: '#C3B6F2',
} as const;
export type SeatColor = keyof typeof SEAT_COLORS;

export interface SeatGeom { index: number; region: Region; facing: 0 | 180; badge: Rect }
export interface TableGeom {
  center: Ellipse;
  seats: SeatGeom[];
  hud: { rect: Rect; facing: 0 | 180 }[];
  /** 게임 중 나가기 버튼 자리 */
  exit: Rect;
}

const CENTER_RATIO = 0.22;
const SOLO_CENTER_RATIO = 0.26;
const MIN_GAP_RATIO = 0.2;
const SHRINK = 0.95;
/** 화면이 아주 작아 조건을 끝내 만족하지 못할 때 무한히 줄이지 않도록 하는 상한 */
const MAX_SHRINK_STEPS = 100;

/** 조건을 만족할 때까지 값을 0.95배씩 줄인다. 최대 100번까지만 줄인다 */
export function shrinkUntil(start: number, fits: (v: number) => boolean): number {
  let v = start;
  for (let i = 0; i < MAX_SHRINK_STEPS && !fits(v); i++) v *= SHRINK;
  return v;
}

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

/** 정보 칸 크기. 협동은 몬스터·미션을 담느라 크게(tallHud) 잡는다 */
interface HudBox { w: number; h: number }

export interface TableOptions {
  /** 협동용 큰 정보 칸 (0.2W × 0.2H) */
  tallHud?: boolean;
  /** 혼자 하기 하늘·바다 장면: 중앙 카드(해·달)가 반타원을 따라 움직인다 (1인 전용) */
  sky?: boolean;
  /** 협동: 중앙 카드(악당 거북이 등껍질)를 줄이고 거북이 몸이 들어갈 간격을 둔다 */
  coop?: boolean;
}

const COOP_CENTER_RATIO = 0.17;
/** 협동에서 자리 영역은 카드 반지름의 2.2배 밖에 둔다 (거북이 머리·다리) */
const COOP_GAP_RATIO = 1.2;

/** 자리 영역(타원)이 정보 칸과 겹치지 않는지 (정보 칸의 격자 점 검사) */
function clearOf(e: Ellipse, rects: Rect[]): boolean {
  const steps = 6;
  for (const r of rects) {
    for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
      const x = r.x + (r.w * i) / steps, y = r.y + (r.h * j) / steps;
      const dx = (x - e.cx) / e.rx, dy = (y - e.cy) / e.ry;
      if (dx * dx + dy * dy <= 1) return false;
    }
  }
  return true;
}

export function computeTable(playerCount: 1 | 2 | 3 | 4, W: number, H: number, opts: TableOptions = {}): TableGeom {
  // 혼자 할 때는 자리가 하나라 공간이 넉넉하므로 중앙 카드를 크게 한다
  const ratio = opts.coop ? COOP_CENTER_RATIO : playerCount === 1 ? SOLO_CENTER_RATIO : CENTER_RATIO;
  const gapRatio = opts.coop ? COOP_GAP_RATIO : MIN_GAP_RATIO;
  const R0 = ratio * Math.min(W, H);
  const center: Ellipse = { cx: W / 2, cy: H / 2, rx: R0, ry: R0 };
  const hudH = 0.075 * H;
  const box: HudBox = opts.tallHud ? { w: 0.2 * W, h: 0.2 * H } : { w: 0.16 * W, h: hudH };
  const screen: Rect = { x: 0, y: 0, w: W, h: H };
  const minGap = gapRatio * R0;
  const table = playerCount === 1
    ? opts.sky ? skyTable(W, H, hudH, box, screen) : soloTable(W, H, hudH, box, screen, ratio, gapRatio)
    : playerCount === 2
      ? halfCircleTable(2, W, H, center, hudH, box, screen, minGap)
      : cornerTable(playerCount, W, H, center, hudH, box, screen, minGap);
  return { ...table, exit: exitRect(playerCount, W, H) };
}

export const EXIT_W = 88;
export const EXIT_H = 44;

/** 나가기 버튼: 1인 오른쪽 위, 2인 왼쪽 가운데, 3~4인 위쪽 가운데 (자리 영역이 닿지 않는 곳) */
function exitRect(n: number, W: number, H: number): Rect {
  const m = 0.02 * Math.min(W, H);
  if (n === 1) return { x: W - m - EXIT_W, y: m, w: EXIT_W, h: EXIT_H };
  if (n === 2) return { x: m, y: H / 2 - EXIT_H / 2, w: EXIT_W, h: EXIT_H };
  return { x: W / 2 - EXIT_W / 2, y: m, w: EXIT_W, h: EXIT_H };
}

const SKY_RADIUS = 0.19;
const SKY_SEAT_RY = 0.42;
const SKY_SEAT_RX = 0.36;
const SKY_SAMPLES = 24;

/**
 * 1인 하늘·바다 장면: 정보 칸은 왼쪽 아래, 자리는 아래 가운데 반타원.
 * 중앙 카드(해·달)는 skyArc를 따라 움직이므로 center는 출발 위치(t=0)다.
 * 자리 가로 반지름은 정보 칸과 겹치지 않고, 해가 어디 있어도 0.2R 간격이 남을 때까지 줄인다.
 */
function skyTable(W: number, H: number, hudH: number, box: HudBox, screen: Rect): Omit<TableGeom, 'exit'> {
  const R = SKY_RADIUS * Math.min(W, H);
  const hudRect: Rect = { x: 0.02 * W, y: H - 0.02 * H - box.h, w: box.w, h: box.h };
  const ry = SKY_SEAT_RY * H;
  const clearOfSun = (e: Ellipse) => {
    const region = { ellipse: e, clip: screen };
    for (let i = 0; i <= SKY_SAMPLES; i++) {
      const c = skyArc(W, H, R, i / SKY_SAMPLES);
      for (let a = 0; a < 360; a += 5) {
        const rad = (a * Math.PI) / 180;
        if (pointInRegion(c.cx + (1 + MIN_GAP_RATIO) * R * Math.cos(rad), c.cy + (1 + MIN_GAP_RATIO) * R * Math.sin(rad), region)) return false;
      }
    }
    return true;
  };
  const rx = shrinkUntil(SKY_SEAT_RX * W, v => {
    const e = { cx: W / 2, cy: H, rx: v, ry };
    return clearOf(e, [hudRect]) && clearOfSun(e);
  });
  const ellipse: Ellipse = { cx: W / 2, cy: H, rx, ry };
  const cos = Math.cos((20 * Math.PI) / 180), sin = Math.sin((20 * Math.PI) / 180);
  const seat: SeatGeom = {
    index: 0,
    region: { ellipse, clip: screen },
    facing: 0,
    // 정보 칸이 왼쪽 아래에 있으니 배지는 오른쪽 테두리에 단다
    badge: centeredRect(ellipse.cx + rx * cos, ellipse.cy - ry * sin, 0.11 * W, hudH),
  };
  return { center: skyArc(W, H, R, 0), seats: [seat], hud: [{ rect: hudRect, facing: 0 }] };
}

const SOLO_MARGIN = 0.03;
const SOLO_RX = 0.42;
const SOLO_RY = 0.46;

/** 1인: 중앙 카드를 위 가운데, 자리 반타원을 아래 가운데에 놓아 한쪽으로 치우치지 않게 한다 */
function soloTable(W: number, H: number, hudH: number, box: HudBox, screen: Rect, ratio: number, gapRatio: number): Omit<TableGeom, 'exit'> {
  const rx = SOLO_RX * W, ry = SOLO_RY * H;
  const margin = SOLO_MARGIN * H;
  // 카드 지름 + 간격(0.2R) + 자리 높이가 화면 높이에 들어가게 한다
  const R0 = Math.min(ratio * Math.min(W, H), (H - ry - margin) / (2 + gapRatio));
  const center: Ellipse = { cx: W / 2, cy: margin + R0, rx: R0, ry: R0 };
  const ellipse: Ellipse = { cx: W / 2, cy: H, rx, ry };
  const cos = Math.cos((20 * Math.PI) / 180), sin = Math.sin((20 * Math.PI) / 180);
  const seat: SeatGeom = {
    index: 0,
    region: { ellipse, clip: screen },
    facing: 0,
    badge: centeredRect(ellipse.cx - rx * cos, ellipse.cy - ry * sin, 0.11 * W, hudH),
  };
  const hud = [{ rect: { x: 0.02 * W, y: 0.02 * H, w: box.w, h: box.h }, facing: 0 as const }];
  return { center, seats: [seat], hud };
}

function halfCircleTable(n: 1 | 2, W: number, H: number, center: Ellipse, hudH: number, box: HudBox, screen: Rect, minGap: number): Omit<TableGeom, 'exit'> {
  const hudRects: Rect[] = [{ x: 0.02 * W, y: H - 0.02 * H - box.h, w: box.w, h: box.h }];
  if (n === 2) hudRects.push({ x: W - 0.02 * W - box.w, y: 0.02 * H, w: box.w, h: box.h });
  const gapOf = (r: number) => Math.hypot(W - 0.94 * r - center.cx, H - center.cy) - r - center.rx;
  const r = shrinkUntil(0.4 * H, v =>
    gapOf(v) >= minGap &&
    clearOf({ cx: W - 0.94 * v, cy: H, rx: v, ry: v }, hudRects) &&
    (n === 1 || clearOf({ cx: 0.94 * v, cy: 0, rx: v, ry: v }, hudRects)));

  const bw = 0.11 * W;
  const cos = Math.cos((20 * Math.PI) / 180), sin = Math.sin((20 * Math.PI) / 180);
  const bottom = { cx: W - 0.94 * r, cy: H };
  const seats: SeatGeom[] = [{
    index: 0,
    region: { ellipse: { ...bottom, rx: r, ry: r }, clip: screen },
    facing: 0,
    badge: centeredRect(bottom.cx - r * cos, bottom.cy - r * sin, bw, hudH),
  }];
  const hud: Omit<TableGeom, 'exit'>['hud'] = [{ rect: hudRects[0], facing: 0 }];

  if (n === 2) {
    const top = { cx: 0.94 * r, cy: 0 };
    seats.push({
      index: 1,
      region: { ellipse: { ...top, rx: r, ry: r }, clip: screen },
      facing: 180,
      badge: centeredRect(top.cx + r * cos, top.cy + r * sin, bw, hudH),
    });
    hud.push({ rect: hudRects[1], facing: 180 });
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

function cornerTable(n: 3 | 4, W: number, H: number, center: Ellipse, hudH: number, box: HudBox, screen: Rect, minGap: number): Omit<TableGeom, 'exit'> {
  const y = H / 2 - box.h / 2;
  const hudRects: Rect[] = [{ x: 0.02 * W, y, w: box.w, h: box.h }, { x: W - 0.02 * W - box.w, y, w: box.w, h: box.h }];
  // 가로·세로 반지름을 같은 비율(scale)로 줄인다. 대칭이라 왼쪽 위 타원으로 검사한다
  const fits = (scale: number) => {
    const rx = 0.3 * W * scale, ry = 0.29 * H * scale;
    if ((4 * rx) / 3 > W / 2 - 4 || (4 * ry) / 3 > H / 2 - 4) return false;
    const e = { cx: rx / 3, cy: ry / 3, rx, ry };
    return ellipseGap(e, center.cx, center.cy) - center.rx >= minGap && clearOf(e, hudRects);
  };
  const scale = shrinkUntil(1, fits);
  const rx = 0.3 * W * scale, ry = 0.29 * H * scale;

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
  const hud: Omit<TableGeom, 'exit'>['hud'] = [
    { rect: hudRects[0], facing: 0 },
    { rect: hudRects[1], facing: 180 },
  ];
  return { center, seats, hud };
}

/** 중앙 카드 바닥 띠의 높이 (지름 대비) */
export const FLOOR_BAND_RATIO = 0.15;

/** 중앙 카드 아래쪽 바닥 띠 영역 (회전 전 기준). 글자 배치에서 제외한다 */
export function floorBand(e: Ellipse): Rect {
  const h = 2 * e.ry * FLOOR_BAND_RATIO;
  return { x: e.cx - e.rx, y: e.cy + e.ry - h, w: 2 * e.rx, h };
}

/** 이름 글자의 바닥선이 영역 테두리에서 떨어진 거리 */
export const NAME_OFFSET = 12;
/** 이름 곡선의 길이(px). 글자는 가운데 맞춤으로 이 곡선 위에 놓인다 */
const NAME_ARC_PX = 200;
const NAME_SAMPLES = 9;
/** 화면 가장자리·피할 칸과 이름 사이 여백 (글자 높이 포함) */
const NAME_MARGIN = 30;
const NAME_AVOID_PAD = 8;
const NAME_STEP = (2 * Math.PI) / 180;
const NAME_MAX_STEPS = 60;

/**
 * 영역 테두리 바깥, 플레이어 기준 왼쪽 위(왼쪽 수평에서 30° 위)에서 시작하는 이름 곡선.
 * 화면 밖이거나 피할 칸(정보 칸·나가기)에 걸리면 위쪽으로 조금씩 옮긴다.
 * 각도가 커지는 방향(화면에서 시계 방향)으로 그리므로 글자의 위쪽이 항상 영역 바깥을 향한다.
 */
export function nameArc(seat: SeatGeom, W: number, H: number, avoid: Rect[] = []): { d: string; points: [number, number][] } {
  const { cx, cy, rx, ry } = seat.region.ellipse;
  const Rx = rx + NAME_OFFSET, Ry = ry + NAME_OFFSET;
  const half = NAME_ARC_PX / 2 / ((Rx + Ry) / 2);
  const at = (a: number): [number, number] => [cx + Rx * Math.cos(a), cy + Ry * Math.sin(a)];
  const sample = (m: number) => Array.from({ length: NAME_SAMPLES }, (_, i) => at(m - half + (2 * half * i) / (NAME_SAMPLES - 1)));
  const fits = (m: number) => sample(m).every(([x, y]) =>
    x >= NAME_MARGIN && x <= W - NAME_MARGIN && y >= NAME_MARGIN && y <= H - NAME_MARGIN &&
    !avoid.some(r => x >= r.x - NAME_AVOID_PAD && x <= r.x + r.w + NAME_AVOID_PAD && y >= r.y - NAME_AVOID_PAD && y <= r.y + r.h + NAME_AVOID_PAD));
  // 아래 자리(0°)는 화면 왼쪽 위, 위 자리(180°)는 화면 오른쪽 아래가 그 사람의 왼쪽 위다
  let mid = seat.facing === 0 ? (210 * Math.PI) / 180 : (30 * Math.PI) / 180;
  for (let i = 0; i < NAME_MAX_STEPS && !fits(mid); i++) mid += NAME_STEP;
  const [x0, y0] = at(mid - half), [x1, y1] = at(mid + half);
  const f = (v: number) => v.toFixed(1);
  return { d: `M${f(x0)} ${f(y0)} A${f(Rx)} ${f(Ry)} 0 0 1 ${f(x1)} ${f(y1)}`, points: sample(mid) };
}

/** 페이퍼컷 겹 색: 원래 색을 12%, 25% 어둡게 한 두 색 (#rrggbb) */
export function paperShades(hex: string): [string, string] {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const shade = (f: number) => '#' + rgb.map(c => Math.round(c * (1 - f)).toString(16).padStart(2, '0')).join('');
  return [shade(0.12), shade(0.25)];
}
