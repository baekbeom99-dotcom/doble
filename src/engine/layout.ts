import { rectInRegion, rectsGap, regionArea, regionBounds, type Rect, type Region } from './geometry';
import type { Rng } from './rng';

/** x,y는 중심, size는 정사각 글자 상자 한 변 */
export interface Placement { x: number; y: number; size: number; rotation: number }

export class LayoutError extends Error {}

const MAX_TRIES = 400;
const SHRINK = 0.95;
const MAX_FAILS_AT_MIN = 20;
const ROTATED_BOX = 1.42;

export function layoutSymbols(opts: {
  region: Region;
  exclusions: readonly Rect[];
  count: number;
  sizeRange?: [number, number];
  minGap?: number;
  inset?: number;
  targetFill?: number;
  minSize?: number;
  rotate?: boolean;
  rng: Rng;
}): Placement[] {
  const {
    region, exclusions, count, rng,
    sizeRange = [0.6, 1.4], minGap = 8, inset = 8, targetFill = 0.7, minSize = 44, rotate = false,
  } = opts;

  const ratios = Array.from({ length: count }, () => sizeRange[0] + rng.next() * (sizeRange[1] - sizeRange[0]))
    .sort((a, b) => b - a);
  const sumSq = ratios.reduce((s, r) => s + r * r, 0);
  let base = Math.sqrt((targetFill * regionArea(region, exclusions)) / sumSq);
  const bounds = regionBounds(region);
  const boxScale = rotate ? ROTATED_BOX : 1;

  let failsAtMin = 0;
  for (;;) {
    const sizes = ratios.map(r => Math.max(minSize, r * base));
    const placed = tryPlace(sizes);
    if (placed) {
      return placed.map(p => ({ ...p, rotation: rotate ? rng.int(0, 359) : 0 }));
    }
    if (sizes.every(s => s === minSize)) {
      if (++failsAtMin >= MAX_FAILS_AT_MIN) {
        throw new LayoutError(`영역에 글자 ${count}개를 최소 ${minSize}px로 배치할 수 없어요`);
      }
    }
    base *= SHRINK;
  }

  function tryPlace(sizes: number[]): Omit<Placement, 'rotation'>[] | null {
    const boxes: Rect[] = [];
    const out: Omit<Placement, 'rotation'>[] = [];
    for (const size of sizes) {
      const side = size * boxScale;
      let ok = false;
      for (let t = 0; t < MAX_TRIES && !ok; t++) {
        const x = bounds.x + side / 2 + rng.next() * Math.max(0, bounds.w - side);
        const y = bounds.y + side / 2 + rng.next() * Math.max(0, bounds.h - side);
        const box = { x: x - side / 2, y: y - side / 2, w: side, h: side };
        if (!rectInRegion(box, region, inset)) continue;
        if (boxes.some(b => rectsGap(b, box) < minGap)) continue;
        if (exclusions.some(e => rectsGap(e, box) < minGap)) continue;
        boxes.push(box);
        out.push({ x, y, size });
        ok = true;
      }
      if (!ok) return null;
    }
    return out;
  }
}

type LayoutOptions = Parameters<typeof layoutSymbols>[0];

/** 회전 없이도, 최소 크기로도 들어가지 않을 때 차례로 줄여 볼 최소 크기 */
const FALLBACK_MIN_SIZES = [36, 28, 20, 12, 8];

/**
 * 화면이 작거나 회전 상자가 커서 배치가 안 되면 조건을 차례로 완화해 다시 배치한다.
 * 1) 요청대로 2) 회전 없이 3) 최소 크기를 점점 줄여서. 여백과 간격 조건은 끝까지 지킨다.
 */
export function layoutWithFallback(opts: LayoutOptions): Placement[] {
  const attempts: Partial<LayoutOptions>[] = [
    {},
    ...(opts.rotate ? [{ rotate: false }] : []),
    ...FALLBACK_MIN_SIZES.map(minSize => ({ rotate: false, minSize })),
  ];
  let lastError: unknown;
  for (const change of attempts) {
    try {
      return layoutSymbols({ ...opts, ...change });
    } catch (e) {
      if (!(e instanceof LayoutError)) throw e;
      lastError = e;
    }
  }
  throw lastError;
}
