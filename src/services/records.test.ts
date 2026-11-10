import { MODES } from '../engine/modes';
import { createGame } from '../engine/reducer';
import { TEST_POOL, testConfig } from '../engine/testConfig';
import { applyGame, bestFor, EMPTY_RECORDS, loadRecords, saveRecords, summarize, type GameSummary } from './records';

const surv = (over: Partial<GameSummary> = {}): GameSummary =>
  ({ mode: 'soloSurvival', setId: 'S', setName: 'ㄱ 글자', score: 10, correct: 8, fevers: 0, ...over });

test('서바이벌 최고 기록과 새 기록 표시', () => {
  let { records, newBest } = applyGame(EMPTY_RECORDS, surv({ score: 10 }));
  expect(newBest).toBe(true); expect(bestFor(records, 'soloSurvival', 'S')).toBe(10);
  ({ records, newBest } = applyGame(records, surv({ score: 7 })));
  expect(newBest).toBe(false); expect(bestFor(records, 'soloSurvival', 'S')).toBe(10);
  expect(bestFor(EMPTY_RECORDS, 'soloSurvival', 'S')).toBeNull();
});
test('스테이지 클리어는 별과 다음 단계를 연다. 실패하면 그대로', () => {
  let { records } = applyGame(EMPTY_RECORDS, surv({ mode: 'soloStage', stage: 1, cleared: true, stars: 2 }));
  expect(records.stars.S).toEqual([2]); expect(records.unlocked.S).toBe(2);
  ({ records } = applyGame(records, surv({ mode: 'soloStage', stage: 1, cleared: true, stars: 1 })));
  expect(records.stars.S).toEqual([2]);
  ({ records } = applyGame(records, surv({ mode: 'soloStage', stage: 2, cleared: false })));
  expect(records.unlocked.S).toBe(2);
});
test('20단계를 클리어해도 열린 단계는 20을 넘지 않는다', () => {
  const { records } = applyGame(EMPTY_RECORDS, surv({ mode: 'soloStage', stage: 20, cleared: true, stars: 3 }));
  expect(records.unlocked.S).toBe(20);
});
test('배지: 첫 게임, 피버, 서바이벌 30, 글자 100개', () => {
  const first = applyGame(EMPTY_RECORDS, surv({ correct: 30, fevers: 1 }));
  expect(first.newBadges.map(b => b.id).sort()).toEqual(['fever', 'first', 'survival30']);
  const again = applyGame({ ...first.records, totalCorrect: 90 }, surv({ correct: 10 }));
  expect(again.newBadges.map(b => b.id)).toEqual(['letters100']);
  expect(applyGame(again.records, surv()).newBadges).toEqual([]);
});
test('세트 마스터: 그 세트로 스테이지 10 클리어', () => {
  const r = applyGame(EMPTY_RECORDS, surv({ mode: 'soloStage', stage: 10, cleared: true, stars: 1 }));
  expect(r.newBadges).toContainEqual({ id: 'master:S', name: 'ㄱ 글자 마스터', description: expect.any(String) });
});
test('몬스터 사냥 5단계면 사냥꾼, 최고 단계 기록', () => {
  const r = applyGame(EMPTY_RECORDS, { mode: 'coop', setId: 'S', setName: 'x', score: 0, correct: 0, fevers: 0, reached: 5 });
  expect(r.newBadges.map(b => b.id)).toContain('hunter5');
  expect(bestFor(r.records, 'coop', 'S')).toBe(5);
});
test('별 30개 배지', () => {
  const r = applyGame({ ...EMPTY_RECORDS, badges: ['first'], stars: { S: Array(10).fill(3) } },
    surv({ mode: 'soloStage', stage: 11, cleared: true, stars: 1 }));
  expect(r.newBadges.map(b => b.id)).toContain('stars30');
});
test('저장하고 다시 읽는다', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as unknown as Storage;
  const { records } = applyGame(EMPTY_RECORDS, surv());
  saveRecords(records, storage);
  expect(loadRecords(storage)).toEqual(records);
});
test('저장소가 예외를 던져도 빈 기록으로 동작하고, 저장 실패는 무시한다', () => {
  const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as unknown as Storage;
  expect(loadRecords(broken)).toEqual(EMPTY_RECORDS);
  expect(() => saveRecords(EMPTY_RECORDS, broken)).not.toThrow();
});
test('망가진 기록은 빈 기록으로 읽는다', () => {
  for (const raw of ['not json', '{"version":1}', '{"version":2,"best":{}}', 'null', '[]']) {
    const storage = { getItem: () => raw, setItem: () => {} } as unknown as Storage;
    expect(loadRecords(storage)).toEqual(EMPTY_RECORDS);
  }
});
test('summarize: 서바이벌, 스테이지, 1인 협동만 요약하고 같이 하기는 null', () => {
  const p1 = [testConfig().players[0]];
  const s = createGame(testConfig({ mode: 'soloSurvival', players: p1 }), TEST_POOL, MODES);
  expect(summarize({ ...s, mode: { ...s.mode, score: 9, correct: 5, fevers: 1 } }, 'S', 'n'))
    .toEqual({ mode: 'soloSurvival', setId: 'S', setName: 'n', score: 9, correct: 5, fevers: 1 });
  const st = createGame(testConfig({ mode: 'soloStage', stage: 3, players: p1 }), TEST_POOL, MODES);
  expect(summarize({ ...st, mode: { ...st.mode, cleared: 1, stars: 2 } }, 'S', 'n')).toMatchObject({ stage: 3, cleared: true, stars: 2 });
  const co = createGame(testConfig({ mode: 'coop', players: p1 }), TEST_POOL, MODES);
  expect(summarize({ ...co, coop: { ...co.coop!, stage: 4 } }, 'S', 'n')).toMatchObject({ mode: 'coop', reached: 4, correct: 0 });
  expect(summarize(createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES), 'S', 'n')).toBeNull();
  expect(summarize(createGame(testConfig(), TEST_POOL, MODES), 'S', 'n')).toBeNull();
});
test('localStorage 자체에 접근할 수 없어도(SecurityError) 읽기·쓰기가 예외를 던지지 않는다', () => {
  const spy = vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => { throw new Error('SecurityError'); });
  try {
    expect(loadRecords()).toEqual(EMPTY_RECORDS);
    expect(() => saveRecords(EMPTY_RECORDS)).not.toThrow();
  } finally { spy.mockRestore(); }
});
test('안쪽 값이 망가진 기록도 빈 기록으로 읽는다', () => {
  for (const inner of [{ stars: { A: {} } }, { stars: { A: [1, 'x'] } }, { unlocked: { A: 'x' } }, { best: { k: null } }, { badges: [1] }]) {
    const raw = JSON.stringify({ ...EMPTY_RECORDS, ...inner });
    const storage = { getItem: () => raw, setItem: () => {} } as unknown as Storage;
    expect(loadRecords(storage)).toEqual(EMPTY_RECORDS);
  }
});
