export interface Rect { x: number; y: number; w: number; h: number }
export interface Ellipse { cx: number; cy: number; rx: number; ry: number }
/** 타원과 clip 사각형이 겹치는 부분 */
export interface Region { ellipse: Ellipse; clip: Rect }

function pointInEllipse(px: number, py: number, e: Ellipse, inset: number): boolean {
  const rx = e.rx - inset, ry = e.ry - inset;
  if (rx <= 0 || ry <= 0) return false;
  const dx = (px - e.cx) / rx, dy = (py - e.cy) / ry;
  return dx * dx + dy * dy <= 1;
}

export function pointInRegion(px: number, py: number, region: Region, inset = 0): boolean {
  const c = region.clip;
  return (
    px >= c.x + inset && px <= c.x + c.w - inset &&
    py >= c.y + inset && py <= c.y + c.h - inset &&
    pointInEllipse(px, py, region.ellipse, inset)
  );
}

/** 상자의 네 꼭짓점이 반지름을 inset만큼 줄인 타원 안에 있고, clip을 inset만큼 줄인 사각형 안에 있는지 */
export function rectInRegion(r: Rect, region: Region, inset: number): boolean {
  return (
    pointInRegion(r.x, r.y, region, inset) &&
    pointInRegion(r.x + r.w, r.y, region, inset) &&
    pointInRegion(r.x, r.y + r.h, region, inset) &&
    pointInRegion(r.x + r.w, r.y + r.h, region, inset)
  );
}

/** 두 사각형 사이 거리(축 방향으로 더 큰 쪽). 겹치면 음수 */
export function rectsGap(a: Rect, b: Rect): number {
  const gx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(gx, gy);
}

function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** 격자 샘플링으로 영역 넓이를 추정한다 (제외 사각형은 뺀다) */
export function regionArea(region: Region, exclusions: readonly Rect[], step = 4): number {
  const b = regionBounds(region);
  let count = 0;
  for (let y = b.y + step / 2; y < b.y + b.h; y += step) {
    for (let x = b.x + step / 2; x < b.x + b.w; x += step) {
      if (pointInRegion(x, y, region) && !exclusions.some(e => pointInRect(x, y, e))) count++;
    }
  }
  return count * step * step;
}

/** 타원 경계 상자와 clip의 교집합 */
export function regionBounds(region: Region): Rect {
  const { cx, cy, rx, ry } = region.ellipse;
  const c = region.clip;
  const x0 = Math.max(cx - rx, c.x), y0 = Math.max(cy - ry, c.y);
  const x1 = Math.min(cx + rx, c.x + c.w), y1 = Math.min(cy + ry, c.y + c.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
