import { rectInRegion, rectsGap, regionArea, type Region } from './geometry';

const circle: Region = { ellipse: { cx: 100, cy: 100, rx: 100, ry: 100 }, clip: { x: 0, y: 0, w: 200, h: 200 } };

test('rectInRegion은 inset을 반영한다', () => {
  expect(rectInRegion({ x: 90, y: 4, w: 20, h: 20 }, circle, 0)).toBe(true);
  expect(rectInRegion({ x: 90, y: 4, w: 20, h: 20 }, circle, 8)).toBe(false);
});
test('clip 밖으로 나간 상자는 거부한다', () => {
  const half: Region = { ellipse: { cx: 100, cy: 200, rx: 100, ry: 100 }, clip: { x: 0, y: 0, w: 200, h: 200 } };
  expect(rectInRegion({ x: 90, y: 185, w: 20, h: 20 }, half, 8)).toBe(false);
});
test('rectsGap', () => {
  expect(rectsGap({ x: 0, y: 0, w: 10, h: 10 }, { x: 18, y: 0, w: 10, h: 10 })).toBe(8);
  expect(rectsGap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBeLessThan(0);
});
test('regionArea는 원 넓이를 5% 오차 안에서 추정한다', () => {
  expect(regionArea(circle, [])).toBeGreaterThan(Math.PI * 1e4 * 0.95);
  expect(regionArea(circle, [])).toBeLessThan(Math.PI * 1e4 * 1.05);
});
