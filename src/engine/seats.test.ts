import { pointInRegion, type Rect } from './geometry';
import { layoutSymbols } from './layout';
import { createRng } from './rng';
import { computeTable, floorBand, nameArc, paperShades, shrinkUntil, type TableGeom } from './seats';

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

test('paperShades는 12%, 25% 어두운 두 색을 돌려준다', () => {
  expect(paperShades('#C8C8C8')).toEqual(['#b0b0b0', '#969696']);
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

describe.each(VIEWPORTS)('tallHud %ix%i', (W, H) => {
  test.each(COUNTS)('%i인: 정보 칸이 0.2H 높이이고 자리·중앙 카드와 겹치지 않으며 글자 8개가 들어간다', n => {
    const t = computeTable(n, W, H, { tallHud: true });
    expect(t.hud.length).toBe(n === 1 ? 1 : 2);
    for (const h of t.hud) {
      expect(h.rect.h).toBeCloseTo(0.2 * H);
      expect(h.rect.w).toBeCloseTo(0.2 * W);
      expect(inside(W, H, h.rect)).toBe(true);
      expect(rectCircleDist(h.rect, t)).toBeGreaterThan(t.center.rx);
      for (const [x, y] of gridPoints(h.rect, 4)) expect(t.seats.some(s => pointInRegion(x, y, s.region))).toBe(false);
      for (const s of t.seats) expect(overlap(h.rect, s.badge)).toBe(false);
    }
    for (let seed = 0; seed < 10; seed++) for (const s of t.seats) {
      expect(() => layoutSymbols({ region: s.region, exclusions: [s.badge], count: 8, rng: createRng(seed) })).not.toThrow();
    }
  });
});

test.each(VIEWPORTS)('%ix%i 1인은 중앙 카드를 위, 자리를 아래 가운데에 치우치지 않게 놓는다', (W, H) => {
  const t = computeTable(1, W, H, { tallHud: true });
  const e = t.seats[0].region.ellipse;
  expect(e.cx).toBeCloseTo(W / 2);
  expect(e.cy).toBeCloseTo(H);
  expect(t.center.cx).toBeCloseTo(W / 2);
  expect(t.center.cy).toBeLessThan(H / 2);
  expect(t.center.rx).toBeGreaterThan(0.22 * Math.min(W, H));
  expect(t.center.rx).toBeLessThanOrEqual(0.26 * Math.min(W, H) + 1e-9);
  for (const [x, y] of gridPoints({ x: 0, y: 0, w: W, h: H })) {
    if (pointInRegion(x, y, t.seats[0].region)) expect(Math.hypot(x - t.center.cx, y - t.center.cy)).toBeGreaterThanOrEqual(t.center.rx * 1.2);
  }
  for (let seed = 0; seed < 10; seed++) {
    expect(() => layoutSymbols({ region: t.seats[0].region, exclusions: [t.seats[0].badge], count: 8, rng: createRng(seed) })).not.toThrow();
  }
});
test('2인 중앙 카드는 그대로 0.22×min(W,H)이다', () => {
  expect(computeTable(2, 1024, 768).center.rx).toBeCloseTo(0.22 * 768);
});

describe.each(VIEWPORTS)('나가기 버튼 %ix%i', (W, H) => {
  test.each([[1, false], [1, true], [2, false], [2, true], [3, false], [3, true], [4, false], [4, true]] as const)(
    '%i인 (tallHud %s): 화면 안에서 자리·배지·정보 칸·중앙 카드와 겹치지 않는다', (n, tallHud) => {
      const t = computeTable(n, W, H, { tallHud });
      const r = t.exit;
      expect(r.w).toBeGreaterThanOrEqual(44);
      expect(r.h).toBeGreaterThanOrEqual(44);
      expect(inside(W, H, r)).toBe(true);
      expect(rectCircleDist(r, t)).toBeGreaterThan(t.center.rx);
      for (const [x, y] of gridPoints(r, 4)) expect(t.seats.some(s => pointInRegion(x, y, s.region))).toBe(false);
      for (const o of [...t.seats.map(s => s.badge), ...t.hud.map(h => h.rect)]) expect(overlap(r, o)).toBe(false);
    });
});

describe('nameArc', () => {
  const variants = [{}, { tallHud: true }, { tallHud: true, coop: true }] as const;
  test.each(VIEWPORTS)('%ix%i: 이름은 플레이어 기준 왼쪽 테두리 바깥에, 화면 안에서 정보 칸·나가기와 겹치지 않게 놓인다', (W, H) => {
    for (const opts of variants) for (const n of COUNTS) {
      const t = computeTable(n, W, H, opts);
      const avoid = [...t.hud.map(h => h.rect), t.exit];
      for (const s of t.seats) {
        const arc = nameArc(s, W, H, avoid);
        const e = s.region.ellipse;
        for (const [x, y] of arc.points) {
          const d = ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2;
          expect(d).toBeGreaterThan(1);
          expect(d).toBeLessThan(1.3);
          expect(x).toBeGreaterThanOrEqual(8); expect(x).toBeLessThanOrEqual(W - 8);
          expect(y).toBeGreaterThanOrEqual(8); expect(y).toBeLessThanOrEqual(H - 8);
          for (const r of avoid) expect(x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4).toBe(false);
        }
        const [mx] = arc.points[Math.floor(arc.points.length / 2)];
        // 왼쪽 테두리가 화면 안에 있으면 그쪽에 둔다 (모서리 자리는 왼쪽이 화면 밖이라 보이는 가장 왼쪽에 둔다)
        if (s.facing === 0 && e.cx - e.rx > 0) expect(mx).toBeLessThan(e.cx);
        if (s.facing === 180 && e.cx + e.rx < W) expect(mx).toBeGreaterThan(e.cx);
      }
    }
  });
  test('하늘 장면(1인)도 왼쪽 테두리에 놓인다', () => {
    const t = computeTable(1, 1024, 768, { tallHud: true, sky: true });
    const arc = nameArc(t.seats[0], 1024, 768, [t.hud[0].rect, t.exit]);
    expect(arc.points[4][0]).toBeLessThan(512);
  });
});

describe.each(VIEWPORTS)('협동 배치 %ix%i', (W, H) => {
  test.each(COUNTS)('%i인: 중앙 카드는 0.17×min(W,H)이고 자리는 카드 반지름 2.2배 밖에 있다 (거북이 자리)', n => {
    const t = computeTable(n, W, H, { tallHud: true, coop: true });
    // 1인은 위에 카드, 아래에 자리를 두므로 간격을 지키려고 카드가 조금 작아질 수 있다
    if (n === 1) {
      expect(t.center.rx).toBeLessThanOrEqual(0.17 * Math.min(W, H) + 1e-9);
      expect(t.center.rx).toBeGreaterThan(0.14 * Math.min(W, H));
    } else expect(t.center.rx).toBeCloseTo(0.17 * Math.min(W, H));
    for (const s of t.seats) for (const [x, y] of gridPoints({ x: 0, y: 0, w: W, h: H }, 6)) {
      if (pointInRegion(x, y, s.region)) expect(distToCenter(t, x, y)).toBeGreaterThanOrEqual(t.center.rx * 2.2 - 1);
    }
    for (let seed = 0; seed < 10; seed++) for (const s of t.seats) {
      expect(() => layoutSymbols({ region: s.region, exclusions: [s.badge], count: 7, rng: createRng(seed) })).not.toThrow();
    }
  });
});
