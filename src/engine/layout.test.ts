import { rectInRegion, rectsGap, type Rect, type Region } from './geometry';
import { layoutSymbols, layoutWithFallback, LayoutError, type Placement } from './layout';
import { createRng } from './rng';

const big: Region = { ellipse: { cx: 300, cy: 600, rx: 260, ry: 260 }, clip: { x: 0, y: 0, w: 900, h: 600 } };
const badge: Rect = { x: 40, y: 520, w: 90, h: 44 };
const boxOf = (p: Placement): Rect => ({ x: p.x - p.size / 2, y: p.y - p.size / 2, w: p.size, h: p.size });

test('200개 시드에서 여백·간격·최소 크기·제외 영역 조건을 모두 지킨다', () => {
  for (let seed = 0; seed < 200; seed++) {
    const ps = layoutSymbols({ region: big, exclusions: [badge], count: 8, rng: createRng(seed) });
    expect(ps).toHaveLength(8);
    ps.forEach((p, i) => {
      expect(p.size).toBeGreaterThanOrEqual(44);
      expect(rectInRegion(boxOf(p), big, 8)).toBe(true);
      expect(rectsGap(boxOf(p), badge)).toBeGreaterThanOrEqual(8);
      ps.slice(i + 1).forEach(q => expect(rectsGap(boxOf(p), boxOf(q))).toBeGreaterThanOrEqual(8));
    });
  }
});
test('크기가 다양하다', () => {
  const ps = layoutSymbols({ region: big, exclusions: [], count: 6, rng: createRng(5) });
  expect(Math.max(...ps.map(p => p.size)) / Math.min(...ps.map(p => p.size))).toBeGreaterThan(1.3);
});
test('같은 시드는 같은 배치를 만든다', () => {
  const a = layoutSymbols({ region: big, exclusions: [], count: 6, rng: createRng(9) });
  const b = layoutSymbols({ region: big, exclusions: [], count: 6, rng: createRng(9) });
  expect(a).toEqual(b);
});
test('도저히 들어가지 않으면 LayoutError를 던진다', () => {
  const tiny: Region = { ellipse: { cx: 50, cy: 50, rx: 50, ry: 50 }, clip: { x: 0, y: 0, w: 100, h: 100 } };
  expect(() => layoutSymbols({ region: tiny, exclusions: [], count: 8, rng: createRng(1) })).toThrow(LayoutError);
});

describe('layoutWithFallback', () => {
  const center: Region = { ellipse: { cx: 132, cy: 132, rx: 132, ry: 132 }, clip: { x: 0, y: 0, w: 264, h: 264 } };
  test('회전 상자가 들어가지 않으면 회전 없이 배치한다', () => {
    for (let seed = 0; seed < 20; seed++) {
      const ps = layoutWithFallback({ region: center, exclusions: [], count: 8, rotate: true, rng: createRng(seed) });
      expect(ps).toHaveLength(8);
    }
  });
  test('최소 크기로도 들어가지 않으면 더 작게라도 배치한다', () => {
    const small: Region = { ellipse: { cx: 80, cy: 80, rx: 80, ry: 80 }, clip: { x: 0, y: 0, w: 160, h: 160 } };
    const ps = layoutWithFallback({ region: small, exclusions: [], count: 8, rng: createRng(1) });
    expect(ps).toHaveLength(8);
    ps.forEach((p, i) => ps.slice(i + 1).forEach(q => expect(rectsGap(boxOf(p), boxOf(q))).toBeGreaterThanOrEqual(8)));
  });
});
