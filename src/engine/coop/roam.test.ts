import { nextRoam, ROAM_SLOTS, roamInterval } from './roam';

test('세 번째 거북이부터 자리를 옮기고, 단계가 높을수록 더 자주 옮긴다', () => {
  expect(roamInterval(1)).toBeNull();
  expect(roamInterval(2)).toBeNull();
  expect(roamInterval(3)).toBe(8000);
  expect(roamInterval(4)!).toBeLessThan(roamInterval(3)!);
  expect(roamInterval(6)!).toBeLessThan(roamInterval(5)!);
  expect(roamInterval(30)).toBe(2500);
});
test('다음 자리는 지금 자리와 다른 칸이다', () => {
  for (const cur of ROAM_SLOTS) for (const r of [0, 0.3, 0.6, 0.999]) {
    const next = nextRoam(cur, () => r);
    expect(ROAM_SLOTS).toContain(next);
    expect(next).not.toBe(cur);
  }
});
