import { pointInRegion, type Rect } from './geometry';
import { layoutSymbols } from './layout';
import { createRng } from './rng';
import { computeTable } from './seats';
import { SKY_STEPS, skyCenter, skyPalette, skyPhase, TURTLE_HEAD } from './sky';

const VIEWPORTS: [number, number][] = [[1024, 768], [1280, 800], [1180, 820], [960, 600]];
const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('skyPhase', () => {
  test('정답 수에 따라 해가 왼쪽에서 오른쪽으로 가고, 그다음은 달이 된다', () => {
    expect(skyPhase(0)).toEqual({ body: 'sun', t: 0 });
    expect(skyPhase(SKY_STEPS - 1)).toEqual({ body: 'sun', t: 1 });
    expect(skyPhase(SKY_STEPS)).toEqual({ body: 'moon', t: 0 });
    expect(skyPhase(2 * SKY_STEPS - 1)).toEqual({ body: 'moon', t: 1 });
    expect(skyPhase(2 * SKY_STEPS)).toEqual({ body: 'sun', t: 0 });
  });
  test('한 번 맞힐 때마다 길의 1/6씩 가고, 세 번째에 위 가운데에 온다', () => {
    expect(skyPhase(1).t).toBeCloseTo(1 / 6);
    expect(skyPhase(3).t).toBeCloseTo(0.5);
  });
});

describe('skyPalette', () => {
  test('낮과 밤, 해 뜰 녘과 한낮의 하늘색이 다르다', () => {
    expect(skyPalette({ body: 'sun', t: 0.5 }).sky).not.toBe(skyPalette({ body: 'moon', t: 0.5 }).sky);
    expect(skyPalette({ body: 'sun', t: 0 }).sky).not.toBe(skyPalette({ body: 'sun', t: 0.5 }).sky);
    expect(skyPalette({ body: 'sun', t: 0.5 }).sea).not.toBe(skyPalette({ body: 'moon', t: 0.5 }).sea);
  });
  test('색은 #rrggbb 형식이다', () => {
    for (const t of [0, 0.3, 0.5, 0.9, 1]) {
      const p = skyPalette({ body: 'moon', t });
      expect(p.sky).toMatch(/^#[0-9a-f]{6}$/);
      expect(p.sea).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe.each(VIEWPORTS)('하늘 배치 %ix%i', (W, H) => {
  const t = computeTable(1, W, H, { tallHud: true, sky: true });
  const R = t.center.rx;

  test('해는 바다 왼쪽 중간에서 떠서 위 가운데를 지나 오른쪽 중간으로 간다', () => {
    const start = skyCenter(t, W, H, 0), top = skyCenter(t, W, H, 0.5), end = skyCenter(t, W, H, 1);
    expect(start.cy).toBeCloseTo(H / 2);
    expect(end.cy).toBeCloseTo(H / 2);
    expect(start.cx).toBeLessThan(W / 4);
    expect(end.cx).toBeGreaterThan((3 * W) / 4);
    expect(top.cx).toBeCloseTo(W / 2);
    expect(top.cy - R).toBeGreaterThanOrEqual(0);
    expect(top.cy).toBeLessThan(H / 2 - R);
  });

  test('어느 위치에서도 카드가 화면 안에 있고 자리·정보 칸·배지·나가기와 떨어져 있다', () => {
    const seat = t.seats[0];
    const boxes = [t.hud[0].rect, seat.badge, t.exit];
    for (let i = 0; i <= 20; i++) {
      const c = skyCenter(t, W, H, i / 20);
      expect(c.cx - R).toBeGreaterThanOrEqual(0);
      expect(c.cx + R).toBeLessThanOrEqual(W);
      expect(c.cy - R).toBeGreaterThanOrEqual(0);
      for (let a = 0; a < 360; a += 5) {
        const x = c.cx + 1.2 * R * Math.cos((a * Math.PI) / 180), y = c.cy + 1.2 * R * Math.sin((a * Math.PI) / 180);
        expect(pointInRegion(x, y, seat.region)).toBe(false);
      }
      for (const b of boxes) {
        // 원과 사각형: 가장 가까운 점까지의 거리가 반지름보다 크다
        const nx = Math.max(b.x, Math.min(c.cx, b.x + b.w)), ny = Math.max(b.y, Math.min(c.cy, b.y + b.h));
        expect(Math.hypot(nx - c.cx, ny - c.cy)).toBeGreaterThan(R);
      }
    }
  });

  test('자리는 아래 가운데에 있고 정보 칸·배지·나가기와 겹치지 않으며 글자 8개가 들어간다', () => {
    const seat = t.seats[0];
    expect(seat.region.ellipse.cx).toBeCloseTo(W / 2);
    expect(seat.region.ellipse.cy).toBeCloseTo(H);
    for (const b of [t.hud[0].rect, t.exit]) {
      expect(overlap(b, seat.badge)).toBe(false);
      for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
        expect(pointInRegion(b.x + (b.w * i) / 6, b.y + (b.h * j) / 6, seat.region)).toBe(false);
      }
    }
    for (let seed = 0; seed < 10; seed++) {
      expect(() => layoutSymbols({ region: seat.region, exclusions: [seat.badge], count: Math.min(W, H) >= 700 ? 8 : 5, rng: createRng(seed) })).not.toThrow();
    }
  });
});

describe.each(VIEWPORTS)('거북이 뒤통수 %ix%i', (W, H) => {
  test('엄지 모양 뒤통수는 크고, 해·달이 어디 있어도 닿지 않는다', () => {
    const t = computeTable(1, W, H, { tallHud: true, sky: true });
    const e = t.seats[0].region.ellipse;
    const head = { x: e.cx - TURTLE_HEAD.halfWidth * e.rx, y: e.cy - TURTLE_HEAD.top * e.ry, w: 2 * TURTLE_HEAD.halfWidth * e.rx, h: (TURTLE_HEAD.top - 0.9) * e.ry };
    expect(head.w).toBeGreaterThanOrEqual(0.7 * e.rx);
    for (let i = 0; i <= 40; i++) {
      const c = skyCenter(t, W, H, i / 40);
      const nx = Math.max(head.x, Math.min(c.cx, head.x + head.w)), ny = Math.max(head.y, Math.min(c.cy, head.y + head.h));
      expect(Math.hypot(nx - c.cx, ny - c.cy)).toBeGreaterThan(c.rx + 8);
    }
  });
});
