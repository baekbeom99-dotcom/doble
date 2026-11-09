import { pointInRegion, type Rect } from './geometry';
import { layoutSymbols } from './layout';
import { createRng } from './rng';
import { computeTable, floorBand, shadowColor, shrinkUntil, type TableGeom } from './seats';

const VIEWPORTS: [number, number][] = [[1024, 768], [1280, 800], [1180, 820], [960, 600]];
const COUNTS = [1, 2, 3, 4] as const;

function gridPoints(r: Rect, step = 8): [number, number][] {
  const pts: [number, number][] = [];
  for (let y = r.y; y <= r.y + r.h; y += step) for (let x = r.x; x <= r.x + r.w; x += step) pts.push([x, y]);
  return pts;
}
const inside = (W: number, H: number, r: Rect) => r.x >= 0 && r.y >= 0 && r.x + r.w <= W && r.y + r.h <= H;
const distToCenter = (t: TableGeom, x: number, y: number) => Math.hypot(x - t.center.cx, y - t.center.cy);
function rectCircleDist(r: Rect, t: TableGeom) {
  const nx = Math.max(r.x, Math.min(t.center.cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(t.center.cy, r.y + r.h));
  return distToCenter(t, nx, ny);
}
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test('shadowColor', () => {
  expect(shadowColor('#FF8FB8')).toBe('96,68,78');
});

describe.each(VIEWPORTS)('%ix%i', (W, H) => {
  const screen = { x: 0, y: 0, w: W, h: H };

  test.each(COUNTS)('%i인: 자리 수와 방향', n => {
    const t = computeTable(n, W, H);
    expect(t.seats).toHaveLength(n);
    expect(t.seats[0].facing).toBe(0);
    if (n >= 2) expect(t.seats.some(s => s.facing === 180)).toBe(true);
  });

  test.each(COUNTS)('%i인: 영역끼리 겹치지 않고 중앙 카드와 간격을 둔다', n => {
    const t = computeTable(n, W, H);
    for (const [x, y] of gridPoints(screen)) {
      const hits = t.seats.filter(s => pointInRegion(x, y, s.region)).length;
      expect(hits).toBeLessThanOrEqual(1);
      if (hits === 1) expect(distToCenter(t, x, y)).toBeGreaterThanOrEqual(t.center.rx * 1.2);
    }
  });

  test.each(COUNTS)('%i인: 배지와 정보 칸은 화면 안에 있고 중앙 카드·서로·자리 영역과 겹치지 않는다', n => {
    const t = computeTable(n, W, H);
    const badges = t.seats.map(s => s.badge);
    const huds = t.hud.map(h => h.rect);
    expect(huds.length).toBeGreaterThan(0);
    for (const r of [...badges, ...huds]) {
      expect(inside(W, H, r)).toBe(true);
      expect(rectCircleDist(r, t)).toBeGreaterThan(t.center.rx);
    }
    const all = [...badges, ...huds];
    all.forEach((a, i) => all.slice(i + 1).forEach(b => expect(overlap(a, b)).toBe(false)));
    for (const h of huds) for (const [x, y] of gridPoints(h, 4)) {
      expect(t.seats.some(s => pointInRegion(x, y, s.region))).toBe(false);
    }
  });

  test.each(COUNTS)('%i인: 모든 자리와 중앙 카드에 심볼 8개가 배치된다 (시드 30개)', n => {
    const t = computeTable(n, W, H);
    const c = t.center;
    for (let seed = 0; seed < 30; seed++) {
      for (const s of t.seats) {
        expect(() => layoutSymbols({ region: s.region, exclusions: [s.badge], count: 8, rng: createRng(seed) })).not.toThrow();
      }
      expect(() => layoutSymbols({
        region: { ellipse: c, clip: { x: c.cx - c.rx, y: c.cy - c.ry, w: 2 * c.rx, h: 2 * c.ry } },
        exclusions: [], count: 8, rng: createRng(seed),
      })).not.toThrow();
    }
  });
});

describe('중앙 카드 바닥 띠', () => {
  test('floorBand는 원의 아래쪽 15% 높이 띠를 돌려준다', () => {
    expect(floorBand({ cx: 100, cy: 100, rx: 50, ry: 50 })).toEqual({ x: 50, y: 135, w: 100, h: 15 });
  });
  test.each(VIEWPORTS)('%ix%i: 바닥 띠를 피해도 중앙 카드에 심볼 8개가 들어간다', (W, H) => {
    const c = computeTable(4, W, H).center;
    for (let seed = 0; seed < 30; seed++) {
      expect(() => layoutSymbols({
        region: { ellipse: c, clip: { x: c.cx - c.rx, y: c.cy - c.ry, w: 2 * c.rx, h: 2 * c.ry } },
        exclusions: [floorBand(c)], count: 8, rng: createRng(seed),
      })).not.toThrow();
    }
  });
});

describe('shrinkUntil', () => {
  test('조건을 만족할 때까지 0.95배씩 줄인다', () => {
    expect(shrinkUntil(100, v => v <= 90)).toBeCloseTo(85.7375);
  });
  test('조건을 끝내 만족하지 못해도 정해진 횟수 뒤에 멈춘다', () => {
    expect(shrinkUntil(100, () => false)).toBeGreaterThan(0);
  });
  test('아주 작은 화면에서도 자리 계산이 끝난다', () => {
    expect(computeTable(4, 4, 4).seats).toHaveLength(4);
    expect(computeTable(2, 4, 4).seats).toHaveLength(2);
  });
});
