# 도블 게임 5단계(혼자 하기 확장) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 혼자 하기를 세 가지 방식(서바이벌, 스테이지 도전, 몬스터 사냥)으로 늘리고 다음을 붙인다.
- 반응 속도 판정, 콤보·피버 타임, 혼자 하기용 아이템
- 기록·별·배지 저장, 고스트, 수집함 화면
- 1인 화면의 중앙 카드 확대 (1~2단계에서 미룬 항목)

**Architecture:**
- 혼자 하기 점수 계산(판정, 피버, 점수 2배, 시간 정지)은 `engine/solo/scoring.ts` 한 곳에 둔다. 서바이벌과 스테이지 도전이 함께 쓴다.
- 기록과 배지는 순수 함수 `applyGame(records, summary)`로 계산한다. localStorage 읽기·쓰기는 얇은 서비스(`services/records.ts`)가 맡는다.
- 몬스터 사냥은 협동 모드를 1인으로 시작하는 메뉴다. 엔진은 바꾸지 않는다.

**Tech Stack:** 지금과 같다

**Spec:** `docs/superpowers/specs/2026-11-09-dobble-game-design.md` (1.2 혼자 하기)

**범위 밖:**
- 이미지 세트(6단계)
- 협동 밸런스 조정(미션 완료율). 필요하면 따로 정한다.
- 몬스터 사냥에 반응 속도 판정과 피버 적용: 협동 엔진에는 점수가 없어서 기록(도달 단계)만 남긴다.

## Global Constraints

- **반응 속도 판정** (서바이벌·스테이지)
  - 반응 시간 = 지금 시각 − 현재 라운드가 시작된 시각. 정답 강조 0.4초는 게임 시간이 멈추므로 포함되지 않는다.
  - `perfect` ≤ 1500ms → 3점, `great` ≤ 3000ms → 2점, 그 밖 `good` → 1점
- **피버 타임**: 연속 정답이 5의 배수(5, 10, …)가 될 때마다 5000ms 동안 점수 ×2. 오답이면 연속 기록이 0이 된다.
- **혼자 하기 아이템**
  - 맞힐 때 아이템이 없으면 확률 0.2로 얻는다. 종류는 💡 `hint`, ⏸️ `timeStop`, ✨ `double`.
  - `timeStop`: 3000ms 동안 시간 막대가 줄지 않는다. TICK이 정지 종료 시각을 걸치면 종료 이후의 시간만 줄인다. 즉 `줄어드는 양 = max(0, 새 now − max(이전 now, timeStopUntil))`.
  - `double`: 10000ms 동안 점수 ×2. 피버와 겹치면 ×4다.
  - 아이템 사용 버튼은 기존 SeatView의 아이템 버튼을 쓴다.
- **점수** = 판정 점수 × 피버 배율 × 2배 배율. 서바이벌의 시간 규칙(+1초, −2초)은 그대로다.
- **스테이지 도전** (1~20단계)
  - 목표 개수: `min(20, 6 + n)`
  - 제한 시간: 20000ms
  - 카드당 심볼 수: `min(8, maxCardSize(pool), 3 + floor((n − 1) / 3))`. 플레이어 설정 값 대신 이 값을 쓴다.
  - 목표를 채우면 클리어, 시간이 0이 되면 실패
  - 별: 클리어할 때 남은 시간이 40% 이상이면 ★3, 20% 이상이면 ★2, 그 밖은 ★1
  - 세트마다 클리어한 다음 단계가 열린다. 처음에는 1단계만 열려 있다.
- **기록 저장** (localStorage 키 `doble.records.v1`)
  - 최고 기록: 서바이벌 점수, 몬스터 사냥 도달 단계. 키는 `{mode}|{setId}`
  - 스테이지별 최고 별 개수
  - 세트별 열린 단계
  - 혼자 하기 누적 정답 수, 피버 횟수, 받은 배지 목록
  - 읽기·쓰기 실패(사생활 보호 모드 등)는 무시한다. 게임은 그대로 동작해야 한다.
- **배지**
  - `first`: 첫 게임 — 혼자 하기를 한 판 끝냄
  - `fever`: 피버 타임 — 피버를 한 번 일으킴
  - `survival30`: 서바이벌 30 — 서바이벌 한 판에서 30개 맞힘
  - `letters100`: 글자 100개 — 혼자 하기 누적 정답 100개
  - `stars30`: 별 30개 — 모은 별의 합이 30개
  - `hunter5`: 몬스터 사냥꾼 — 몬스터 사냥에서 5단계 도달
  - `master:{setId}`: `{세트 이름} 마스터` — 그 세트로 스테이지 10 클리어
- **고스트**: 서바이벌 정보 칸에 `최고 {best}점`과 함께, 지금 점수를 최고 점수와 비교하는 막대를 보여준다. 최고 기록이 없으면 보여주지 않는다.
- **1인 중앙 카드**: 반지름을 `0.26 × min(W, H)`로 키운다. 자리 영역과의 간격 규칙은 그대로다.
- **세트 id**: `createSymbolSet(config.set).id`

## Review Focus

1. **localStorage를 쓸 수 없을 때**: `getItem`이나 `setItem`이 예외를 던져도 게임이 시작되고 결과 화면이 나와야 한다. 빈 기록으로 동작한다.
   → Task 3 테스트
2. **저장된 기록이 망가졌을 때**(JSON이 아니거나 필드가 빠짐): 빈 기록으로 시작하고, 다음에 저장할 때 올바른 형태로 덮어쓴다.
   → Task 3 테스트
3. **피버와 2배 아이템이 겹칠 때**: 점수는 ×4다. 피버는 오답으로 연속 기록이 끊겨도 남은 시간 동안 계속된다.
   → Task 1 테스트
4. **시간 정지 중 오답**: 시간 정지는 시간이 저절로 줄어드는 것만 막는다. 오답 −2초는 그대로 적용한다.
   → Task 1 테스트
5. **스테이지 마지막 정답과 시간 종료가 겹칠 때**: 정답으로 목표를 채운 뒤에는 그 뒤의 TICK으로 실패 처리되면 안 된다. 클리어는 reducer가 바로 끝낸다.
   → Task 2 테스트

---

## File Structure

```
src/engine/state.ts            ModeId 'soloStage', ItemId에 'timeStop' | 'double', GameConfig.stage, 새 이벤트
src/engine/solo/scoring.ts     judge, soloCorrect, soloTick, soloWrong
src/engine/modes/soloSurvival.ts  점수·판정·피버·아이템 반영
src/engine/modes/soloStage.ts  stageParams, stars, 모드
src/engine/modifiers/items.ts  아이템 종류를 모드별로, timeStop·double 사용
src/engine/seats.ts            1인 중앙 카드 확대
src/services/records.ts        Records 타입, applyGame, loadRecords, saveRecords, summarize
src/content/badges.ts          배지 정의
src/ui/components/SoloHud.tsx  점수·판정·피버·고스트
src/ui/screens/Game.tsx        혼자 하기 연결
src/ui/screens/Setup.tsx       혼자 하기 방식 선택, 스테이지 선택
src/ui/screens/Result.tsx      새 기록, 별, 배지, 다음 스테이지
src/ui/screens/Collection.tsx  수집함
src/ui/screens/Home.tsx, src/App.tsx
```

---

### Task 1: 혼자 하기 점수 계산과 서바이벌

**Files:**
- Create: `src/engine/solo/scoring.ts`, `src/engine/solo/scoring.test.ts`
- Modify: `src/engine/state.ts`, `src/engine/modes/soloSurvival.ts`, `src/engine/modifiers/items.ts`, `src/engine/modes/modes.test.ts`

**Interfaces:**
- Produces:
```ts
// state.ts
export type ItemId = 'freeze' | 'swirl' | 'hint' | 'shield' | 'timeStop' | 'double';
export type Grade = 'perfect' | 'great' | 'good';
// GameEvent에 추가
| { type: 'grade'; grade: Grade; points: number }
| { type: 'fever' };
// scoring.ts
export const GRADE_POINTS: Record<Grade, number>;  // { perfect: 3, great: 2, good: 1 }
export const FEVER_EVERY = 5;
export const FEVER_MS = 5000;
export const TIME_STOP_MS = 3000;
export const DOUBLE_MS = 10000;
export function judge(reactionMs: number): Grade;
/** 혼자 하기 모드 상태의 공통 필드 */
export const SOLO_FIELDS: Record<string, number>;
// { score: 0, correct: 0, streak: 0, roundAt: 0, feverUntil: 0, doubleUntil: 0, timeStopUntil: 0, perfect: 0, great: 0, good: 0, fevers: 0 }
export function soloCorrect(s: GameState): { mode: Record<string, number>; events: GameEvent[] };
export function soloWrong(mode: Record<string, number>): Record<string, number>;   // streak 0
/** 이번 TICK에서 실제로 흐른 시간 (시간 정지 구간 제외). s.now는 TICK 적용 후 시각 */
export function flowingDt(s: GameState, dt: number): number;
// items.ts
export const SOLO_ITEMS: readonly ItemId[];  // ['hint', 'timeStop', 'double']
```
- 처리 규칙
  - `soloCorrect`: 판정 → 점수 계산 → 다음을 갱신한다.
    - `score`, `correct`, `streak`, 판정별 횟수
    - `roundAt = now` (다음 라운드 시작 시각)
    - 피버를 일으키면 `feverUntil = now + 5000`, `fevers + 1`, `fever` 이벤트
  - `maybeGrantItem`: 혼자 하기 모드(`soloSurvival`, `soloStage`)이면 `SOLO_ITEMS`에서 고른다.
  - `useItem`
    - `timeStop`: `mode.timeStopUntil = now + 3000`
    - `double`: `mode.doubleUntil = now + 10000`
  - 서바이벌의 `onTick`은 `timeLeft −= flowingDt(s, dt)`로 줄인다.
  - 혼자 하기 설정의 `rules.items`는 true로 둔다(Task 6 Setup에서). 콤보와 막판 3배는 false다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const solo = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]], ...over });
const tap = (s: GameState) => reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, MODES);
const wait = (s: GameState, ms: number) => reduce(s, { type: 'TICK', dt: ms }, MODES).state;

test('판정 경계', () => {
  expect(judge(1500)).toBe('perfect'); expect(judge(1501)).toBe('great');
  expect(judge(3000)).toBe('great'); expect(judge(3001)).toBe('good');
});
test('빨리 맞히면 3점, 느리면 1점', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  let r = tap(wait(s, 1000));
  expect(r.events).toContainEqual({ type: 'grade', grade: 'perfect', points: 3 });
  r = tap(wait(r.state, 4000));
  expect(r.events).toContainEqual({ type: 'grade', grade: 'good', points: 1 });
  expect(r.state.mode).toMatchObject({ score: 4, correct: 2, perfect: 1, good: 1 });
});
test('5연속이면 피버: 5초 동안 점수 2배', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  for (let i = 0; i < 4; i++) s = tap(s).state;
  const r = tap(s);
  expect(r.events).toContainEqual({ type: 'fever' });
  expect(r.state.mode.feverUntil).toBe(r.state.now + 5000);
  expect(tap(r.state).events).toContainEqual({ type: 'grade', grade: 'perfect', points: 6 });
});
test('피버와 2배 아이템이 겹치면 4배, 오답으로 연속이 끊겨도 피버는 남는다', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  for (let i = 0; i < 5; i++) s = tap(s).state;
  s = { ...s, mode: { ...s.mode, doubleUntil: s.now + 10000 } };
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: s.round.index }, MODES).state;
  expect(s.mode.streak).toBe(0);
  s = wait(s, 1500);
  expect(tap(s).events).toContainEqual({ type: 'grade', grade: 'perfect', points: 12 });
});
test('시간 정지 중에는 시간이 줄지 않지만 오답 −2초는 적용된다', () => {
  let s = createGame(solo(), TEST_POOL, MODES);
  s = { ...s, mode: { ...s.mode, timeStopUntil: 3000 } };
  s = wait(s, 2000);
  expect(s.mode.timeLeft).toBe(30000);
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: s.round.index }, MODES).state;
  expect(s.mode.timeLeft).toBe(28000);
  s = wait(s, 2000);
  expect(s.mode.timeLeft).toBe(27000);
});
test('혼자 하기 아이템은 힌트·시간 정지·2배 중에서 나온다', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 300; seed++) {
    const s = createGame(solo({ seed, rules: { combo: false, finalRound: false, items: true } }), TEST_POOL, MODES);
    const item = tap(s).state.players[0].item;
    if (item) seen.add(item);
  }
  expect([...seen].sort()).toEqual(['double', 'hint', 'timeStop']);
});
test('시간 정지와 2배 아이템을 쓰면 해당 시각이 기록된다', () => {
  const s = createGame(solo({ rules: { combo: false, finalRound: false, items: true } }), TEST_POOL, MODES);
  const withItem = (item: ItemId) => ({ ...s, players: [{ ...s.players[0], item }] });
  expect(reduce(withItem('timeStop'), { type: 'USE_ITEM', player: 0 }, MODES).state.mode.timeStopUntil).toBe(3000);
  expect(reduce(withItem('double'), { type: 'USE_ITEM', player: 0 }, MODES).state.mode.doubleUntil).toBe(10000);
});
```
  - `modes.test.ts`의 기존 서바이벌 테스트에서 기대하는 `mode` 객체에 새 필드가 생겨도 통과하는지 확인한다(`toMatchObject`를 쓴다).

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: solo scoring with grades, fever and solo items`)

---

### Task 2: 스테이지 도전 모드

**Files:**
- Create: `src/engine/modes/soloStage.ts`, `src/engine/modes/soloStage.test.ts`
- Modify: `src/engine/state.ts`, `src/engine/modes/index.ts`, `src/engine/reducer.ts`(스테이지 카드 크기)

**Interfaces:**
- Produces:
```ts
// state.ts: ModeId에 'soloStage', GameConfig에 stage?: number (스테이지 도전에서만 사용)
export const STAGE_COUNT = 20;
export const STAGE_TIME_MS = 20000;
export function stageParams(n: number, poolSize: number): { target: number; cardSize: number; timeMs: number };
export function stageStars(timeLeft: number, timeMs: number): 1 | 2 | 3;
export const soloStage: Mode;  // mode 상태: SOLO_FIELDS + { timeLeft, target, cleared: 0|1, stars: 0..3 }
```
- 카드 크기: `makeRound`에 `opts.cardSizes?: number[]`를 추가해 플레이어 설정 값을 덮어쓴다. 스테이지 모드일 때 reducer가 `stageParams(...).cardSize`를 넘긴다(createGame과 nextRound 모두).
- 규칙
  - `onCorrect`: `soloCorrect` 후 `correct ≥ target`이면 `cleared = 1`, `stars = stageStars(timeLeft, timeMs)`
  - `onWrong`: `timeLeft −= 2000`, 연속 기록 0
  - `onTick`: `timeLeft −= flowingDt(s, dt)`
  - `isOver`: `cleared === 1 || timeLeft ≤ 0`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const stageCfg = (stage: number) => testConfig({ mode: 'soloStage', stage, players: [testConfig().players[0]] });
test('스테이지 수치', () => {
  expect(stageParams(1, 21)).toEqual({ target: 7, cardSize: 3, timeMs: 20000 });
  expect(stageParams(10, 21)).toEqual({ target: 16, cardSize: 6, timeMs: 20000 });
  expect(stageParams(20, 21)).toEqual({ target: 20, cardSize: 8, timeMs: 20000 });
  expect(stageParams(20, 14)).toMatchObject({ cardSize: 7 });
});
test('별 기준', () => {
  expect(stageStars(8000, 20000)).toBe(3); expect(stageStars(7999, 20000)).toBe(2);
  expect(stageStars(4000, 20000)).toBe(2); expect(stageStars(3999, 20000)).toBe(1);
});
test('스테이지 카드 크기를 쓴다', () => {
  expect(createGame(stageCfg(10), TEST_POOL, MODES).round.cards[0]).toHaveLength(6);
});
test('목표를 채우면 클리어하고 별을 받으며, 이후 TICK으로 실패하지 않는다', () => {
  let s = createGame(stageCfg(1), TEST_POOL, MODES);
  let last: GameEvent[] = [];
  for (let i = 0; i < 7; i++) ({ state: s, events: last } = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, MODES));
  expect(last).toContainEqual({ type: 'over' });
  expect(s.mode).toMatchObject({ cleared: 1, stars: 3 });
  expect(reduce(s, { type: 'TICK', dt: 30000 }, MODES).state.mode.cleared).toBe(1);
});
test('시간이 다 되면 실패', () => {
  const r = reduce(createGame(stageCfg(1), TEST_POOL, MODES), { type: 'TICK', dt: 20000 }, MODES);
  expect(r.state.phase).toBe('over');
  expect(r.state.mode.cleared).toBe(0);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: solo stage challenge mode`)

---

### Task 3: 기록과 배지

**Files:**
- Create: `src/services/records.ts`, `src/services/records.test.ts`, `src/content/badges.ts`

**Interfaces:**
- Produces:
```ts
// records.ts
export const RECORDS_KEY = 'doble.records.v1';
export interface Records {
  version: 1;
  best: Record<string, number>;          // `${mode}|${setId}` → 서바이벌 점수 또는 몬스터 사냥 단계
  stars: Record<string, number[]>;       // setId → 스테이지별 최고 별 (index 0 = 1단계)
  unlocked: Record<string, number>;      // setId → 열린 최고 단계 (기본 1)
  totalCorrect: number;
  fevers: number;
  badges: string[];
}
export interface GameSummary {
  mode: ModeId; setId: string; setName: string;
  score: number; correct: number; fevers: number;
  stage?: number; cleared?: boolean; stars?: number;   // 스테이지 도전
  reached?: number;                                     // 몬스터 사냥 도달 단계
}
export const EMPTY_RECORDS: Records;
export function summarize(s: GameState, setId: string, setName: string): GameSummary | null;  // 혼자 하기(서바이벌·스테이지·1인 협동)가 아니면 null
export function applyGame(r: Records, g: GameSummary): { records: Records; newBest: boolean; newBadges: Badge[] };
export function loadRecords(storage?: Storage): Records;   // 실패하면 EMPTY_RECORDS
export function saveRecords(r: Records, storage?: Storage): void;  // 실패하면 무시
export function bestFor(r: Records, mode: ModeId, setId: string): number | null;
// badges.ts
export interface Badge { id: string; name: string; description: string }
export const BADGES: Badge[];   // 고정 배지 6개 (master는 세트마다 만들어지므로 목록에 없음)
export function masterBadge(setId: string, setName: string): Badge;  // id `master:${setId}`, 이름 `${setName} 마스터`
export function earnedBadges(r: Records, g: GameSummary): Badge[];   // 이번 게임 뒤 새로 받는 배지
```
- `applyGame` 규칙
  - 서바이벌: `best = max(best, score)`
  - 1인 협동(몬스터 사냥): `best = max(best, reached)`
  - 스테이지: 클리어하면 `stars[stage−1] = max(기존, stars)`, `unlocked = max(unlocked, stage + 1)`(최대 20)
  - `totalCorrect += correct`, `fevers += fevers`
  - 새 배지를 `badges`에 추가하고, 반환값으로도 돌려준다.
  - `newBest`는 최고 기록이 실제로 올랐을 때만 true다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const surv = (over: Partial<GameSummary> = {}): GameSummary =>
  ({ mode: 'soloSurvival', setId: 'S', setName: 'ㄱ 글자', score: 10, correct: 8, fevers: 0, ...over });

test('서바이벌 최고 기록과 새 기록 표시', () => {
  let { records, newBest } = applyGame(EMPTY_RECORDS, surv({ score: 10 }));
  expect(newBest).toBe(true); expect(bestFor(records, 'soloSurvival', 'S')).toBe(10);
  ({ records, newBest } = applyGame(records, surv({ score: 7 })));
  expect(newBest).toBe(false); expect(bestFor(records, 'soloSurvival', 'S')).toBe(10);
});
test('스테이지 클리어는 별과 다음 단계를 연다. 실패하면 그대로', () => {
  let { records } = applyGame(EMPTY_RECORDS, surv({ mode: 'soloStage', stage: 1, cleared: true, stars: 2 }));
  expect(records.stars.S).toEqual([2]); expect(records.unlocked.S).toBe(2);
  ({ records } = applyGame(records, surv({ mode: 'soloStage', stage: 1, cleared: true, stars: 1 })));
  expect(records.stars.S).toEqual([2]);
  ({ records } = applyGame(records, surv({ mode: 'soloStage', stage: 2, cleared: false })));
  expect(records.unlocked.S).toBe(2);
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
  const r = applyGame(EMPTY_RECORDS, { mode: 'coop', setId: 'S', setName: 'x', score: 0, correct: 12, fevers: 0, reached: 5 });
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
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } as Storage;
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
  for (const raw of ['not json', '{"version":1}', '{"version":2,"best":{}}', 'null']) {
    const storage = { getItem: () => raw, setItem: () => {} } as unknown as Storage;
    expect(loadRecords(storage)).toEqual(EMPTY_RECORDS);
  }
});
test('summarize: 서바이벌, 스테이지, 1인 협동만 요약하고 같이 하기는 null', () => {
  const s = createGame(testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] }), TEST_POOL, MODES);
  expect(summarize({ ...s, mode: { ...s.mode, score: 9, correct: 5, fevers: 1 } }, 'S', 'n'))
    .toEqual({ mode: 'soloSurvival', setId: 'S', setName: 'n', score: 9, correct: 5, fevers: 1 });
  expect(summarize(createGame(testConfig(), TEST_POOL, MODES), 'S', 'n')).toBeNull();
});
```
  - `summarize`(스테이지): `stage = config.stage`, `cleared = mode.cleared === 1`, `stars = mode.stars`를 넣는다.
  - `summarize`(1인 협동): `reached = coop.stage`, `correct`는 0이다(협동은 정답 수를 세지 않음).

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: solo records and badges`)

---

### Task 4: 1인 중앙 카드 확대와 혼자 하기 정보 칸

**Files:**
- Modify: `src/engine/seats.ts`, `src/engine/seats.test.ts`
- Create: `src/ui/components/SoloHud.tsx`, `src/ui/components/solo.test.tsx`

**Interfaces:**
- Produces:
```tsx
<SoloHud mode={Record<string, number>} kind={'soloSurvival' | 'soloStage'} now={number} best={number | null} lastGrade={Grade | null} />
```
- `computeTable(1, …)`: 중앙 카드 반지름 `0.26 × min(W, H)`. 2인 이상은 그대로다.
- SoloHud(정보 칸 안) 내용
  - 서바이벌: `{초}초`, 점수 `{score}점`. `best`가 있으면 `최고 {best}점`과 고스트 막대(`aria-label="최고 기록 대비 {pct}%"`, pct = round(score / best × 100), 최대 100)
  - 스테이지: `{correct}/{target}`, `{초}초`
  - 피버 중이면 `피버!`, 2배 중이면 `×2`, 시간 정지 중이면 `⏸️` 표시
  - `lastGrade`가 있으면 `Perfect` / `Great` / `Good`을 크게 보여준다.
- 혼자 하기 정보 칸은 1~2인과 같은 모서리 자리를 쓰되, `tallHud: true`로 크게 잡는다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
// seats.test.ts
test.each(VIEWPORTS)('%ix%i 1인 중앙 카드는 0.26×min(W,H)이고 자리와 간격을 유지한다', (W, H) => {
  const t = computeTable(1, W, H, { tallHud: true });
  expect(t.center.rx).toBeCloseTo(0.26 * Math.min(W, H));
  for (const [x, y] of gridPoints({ x: 0, y: 0, w: W, h: H })) {
    if (pointInRegion(x, y, t.seats[0].region)) expect(Math.hypot(x - t.center.cx, y - t.center.cy)).toBeGreaterThanOrEqual(t.center.rx * 1.2);
  }
  for (let seed = 0; seed < 10; seed++) expect(() => layoutSymbols({ region: t.seats[0].region, exclusions: [t.seats[0].badge], count: 8, rng: createRng(seed) })).not.toThrow();
});
```
```tsx
// solo.test.tsx
const m = { timeLeft: 12400, score: 37, correct: 9, streak: 0, roundAt: 0, feverUntil: 5000, doubleUntil: 0, timeStopUntil: 0, perfect: 0, great: 0, good: 0, fevers: 1, target: 16 };
test('서바이벌: 남은 초, 점수, 고스트', () => {
  render(<SoloHud mode={m} kind="soloSurvival" now={1000} best={50} lastGrade="perfect" />);
  expect(screen.getByText('13초')).toBeInTheDocument();
  expect(screen.getByText('37점')).toBeInTheDocument();
  expect(screen.getByText('최고 50점')).toBeInTheDocument();
  expect(screen.getByLabelText('최고 기록 대비 74%')).toBeInTheDocument();
  expect(screen.getByText('피버!')).toBeInTheDocument();
  expect(screen.getByText('Perfect')).toBeInTheDocument();
});
test('최고 기록이 없으면 고스트를 숨긴다', () => {
  render(<SoloHud mode={m} kind="soloSurvival" now={9000} best={null} lastGrade={null} />);
  expect(screen.queryByText(/최고/)).not.toBeInTheDocument();
  expect(screen.queryByText('피버!')).not.toBeInTheDocument();
});
test('스테이지: 진행 수', () => {
  render(<SoloHud mode={m} kind="soloStage" now={9000} best={null} lastGrade={null} />);
  expect(screen.getByText('9/16')).toBeInTheDocument();
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: bigger solo center card and solo hud`)

---

### Task 5: 게임 화면에 혼자 하기 연결

**Files:**
- Modify: `src/ui/screens/Game.tsx`, `src/ui/screens/Game.test.tsx`, `src/ui/theme/brutal.css`

**Interfaces:**
- Consumes: Task 1~4
- Game에 prop을 추가한다: `best?: number | null` (고스트용, App이 넘긴다)
- 규칙
  - 혼자 하기(서바이벌·스테이지)이면 다음을 적용한다.
    - `computeTable(1, W, H, { tallHud: true })`
    - 정보 칸에 `SoloHud`를 넣는다.
    - SeatView에 `item`(rules.items일 때), `onUseItem`, `hintSymbol`을 넘긴다.
  - `grade` 이벤트가 오면 `lastGrade`를 800ms 동안 보여준다(타이머는 화면을 떠날 때 정리).
  - 피버 중이면 `.table`에 `is-fever` 클래스를 붙인다. 화면 가장자리에 노란 띠가 깜빡인다.
  - 몬스터 사냥(1인 협동)은 지금 협동 화면 그대로다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('서바이벌: 맞히면 판정과 점수가 정보 칸에 나온다', () => {
  const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} best={20} />);
  expect(screen.getByText('최고 20점')).toBeInTheDocument();
  tapSeat(0, createGame(cfg, pool21, MODES).round.answers[0]);
  expect(screen.getByText('Perfect')).toBeInTheDocument();
  expect(screen.getByText('3점')).toBeInTheDocument();
});
test('서바이벌: 5연속이면 피버 효과가 켜진다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
    render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
    let g = createGame(cfg, pool21, MODES);
    for (let i = 0; i < 5; i++) {
      tapSeat(0, g.round.answers[0]);
      g = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: g.round.index }, MODES).state;
      act(() => { vi.advanceTimersByTime(450); });  // 정답 강조가 끝나 다음 라운드가 보이도록
    }
    expect(document.querySelector('.table')).toHaveClass('is-fever');
  } finally { vi.useRealTimers(); }
});
test('스테이지 도전: 진행 수를 보여준다', () => {
  render(<Game config={testConfig({ mode: 'soloStage', stage: 1, players: [testConfig().players[0]] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByText('0/7')).toBeInTheDocument();
});
```
  - 두 번째 테스트는 정답 강조 0.4초 동안 이전 라운드가 보여서, 매 정답 뒤 가짜 타이머로 450ms를 진행시킨다. 라운드 카드는 시간과 무관하게 라운드 번호로 정해지므로, 엔진을 따로 돌려 같은 정답을 계산할 수 있다.
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: wire solo extras into game screen`)

---

### Task 6: 혼자 하기 설정과 결과, 기록 저장

**Files:**
- Modify: `src/ui/screens/Setup.tsx`, `src/ui/screens/Setup.test.tsx`, `src/ui/screens/Result.tsx`, `src/ui/screens/Result.test.tsx`, `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Setup(kind `solo`)
  - `방식` 선택: `서바이벌` / `스테이지 도전` / `몬스터 사냥` (기본 서바이벌)
  - 스테이지 도전: `단계` 선택(1~열린 단계, 기본은 열린 최고 단계). Setup은 `records` prop으로 열린 단계를 받는다. 카드당 심볼 수 슬라이더는 숨긴다.
  - 몬스터 사냥: `mode: 'coop'`, 인원 1명
  - 혼자 하기의 `rules`: `{ combo: false, finalRound: false, items: true }`. 단, 몬스터 사냥은 `NO_RULES`
- App
  - 시작할 때 `loadRecords()`를 부르고, 서바이벌이면 `bestFor(...)`를 Game의 `best`로 넘긴다.
  - 게임이 끝나면 `summarize` → `applyGame` → `saveRecords`를 하고, 결과를 Result에 넘긴다.
- Result에 prop을 추가한다: `outcome?: { newBest: boolean; newBadges: Badge[]; best: number | null }`, `onNextStage?: () => void`
  - 서바이벌
    - `{correct}개 찾았어요`
    - `{score}점`
    - `Perfect {p} · Great {g} · Good {o}`
    - 새 기록이면 `새 기록!`
  - 스테이지
    - 클리어: `{n}단계 클리어!`, 별 `★`×stars + `☆`×(3−stars), 버튼 `다음 단계`(20단계면 숨김)
    - 실패: `{n}단계 실패`, 버튼 `다시 하기`
  - 몬스터 사냥: 협동 결과에 더해, 새 기록이면 `새 기록!`
  - 새 배지가 있으면 `새 배지: {이름}` 목록을 보여준다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
// Setup.test.tsx
test('혼자 하기: 스테이지 도전은 열린 단계까지 고를 수 있고 심볼 수 슬라이더가 없다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} records={{ ...EMPTY_RECORDS, unlocked: { [SET_ID]: 3 } }} />);
  await waitLoaded();
  fireEvent.click(screen.getByRole('radio', { name: '스테이지 도전' }));
  expect(within(screen.getByRole('group', { name: '단계' })).getAllByRole('radio')).toHaveLength(3);
  expect(screen.queryByRole('slider', { name: '플레이어 1 심볼 수' })).not.toBeInTheDocument();
  expect(await startWith(onStart)).toMatchObject({ mode: 'soloStage', stage: 3, rules: { items: true } });
});
test('혼자 하기: 몬스터 사냥은 1인 협동', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  await waitLoaded();
  fireEvent.click(screen.getByRole('radio', { name: '몬스터 사냥' }));
  const cfg = await startWith(onStart);
  expect(cfg).toMatchObject({ mode: 'coop', rules: { items: false } });
  expect(cfg.players).toHaveLength(1);
});
```
  - `SET_ID`는 기본 세트(ㄱ 글자, 받침 없음)의 `createSymbolSet(...).id`다. `waitLoaded`가 `플레이어 1 심볼 수` 슬라이더를 기다리므로, 스테이지 도전 테스트는 방식을 바꾸기 전에 기다린다.
```tsx
// Result.test.tsx
test('서바이벌: 점수, 판정 수, 새 기록, 새 배지', () => {
  const s = createGame(testConfig({ mode: 'soloSurvival', players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={{ ...s, mode: { ...s.mode, correct: 12, score: 30, perfect: 8, great: 3, good: 1 } }}
    onRetry={() => {}} onHome={() => {}} outcome={{ newBest: true, best: 30, newBadges: [{ id: 'first', name: '첫 게임', description: '' }] }} />);
  expect(screen.getByText('30점')).toBeInTheDocument();
  expect(screen.getByText('Perfect 8 · Great 3 · Good 1')).toBeInTheDocument();
  expect(screen.getByText('새 기록!')).toBeInTheDocument();
  expect(screen.getByText('새 배지: 첫 게임')).toBeInTheDocument();
});
test('스테이지 클리어: 별과 다음 단계 버튼', () => {
  const onNextStage = vi.fn();
  const s = createGame(testConfig({ mode: 'soloStage', stage: 4, players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={{ ...s, mode: { ...s.mode, cleared: 1, stars: 2 } }} onRetry={() => {}} onHome={() => {}} onNextStage={onNextStage} />);
  expect(screen.getByText('4단계 클리어!')).toBeInTheDocument();
  expect(screen.getByText('★★☆')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다음 단계' }));
  expect(onNextStage).toHaveBeenCalled();
});
test('스테이지 실패: 다음 단계 버튼이 없다', () => {
  const s = createGame(testConfig({ mode: 'soloStage', stage: 4, players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={s} onRetry={() => {}} onHome={() => {}} onNextStage={() => {}} />);
  expect(screen.getByText('4단계 실패')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '다음 단계' })).not.toBeInTheDocument();
});
```
```tsx
// App.test.tsx
test('게임이 끝나면 기록이 localStorage에 저장된다', async () => {
  localStorage.clear();
  // saveRecords를 App 흐름에서 호출하는지 확인: App의 onOver 처리 함수 `recordGame(state, setId, setName)`를 export해 직접 호출한다
  const s = createGame(testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] }), TEST_POOL, MODES);
  const out = recordGame({ ...s, mode: { ...s.mode, score: 12, correct: 6 } }, 'S', 'ㄱ 글자');
  expect(out?.newBest).toBe(true);
  expect(JSON.parse(localStorage.getItem('doble.records.v1')!).best['soloSurvival|S']).toBe(12);
});
```
  - `recordGame(state, setId, setName): Outcome | null`은 App.tsx에서 export한다. 내부에서 load → summarize → applyGame → save를 하고 Result용 `outcome`을 돌려준다.
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: solo setup, results and record saving`)

---

### Task 7: 수집함 화면과 실제 확인

**Files:**
- Create: `src/ui/screens/Collection.tsx`, `src/ui/screens/Collection.test.tsx`
- Modify: `src/ui/screens/Home.tsx`, `src/App.tsx`

**Interfaces:**
- `<Collection records={Records} onBack={() => void} />`
- 홈에 `수집함` 버튼을 추가한다(흰 배경, 다른 버튼보다 작게).
- 수집함 내용
  - **배지**: 고정 배지 6개를 모두 보여준다. 받은 것은 진하게, 못 받은 것은 흐리게(`.is-locked`). 세트 마스터 배지는 받은 것만 보여준다.
  - **최고 기록**: `best`의 항목마다 `{방식} · {세트 이름}: {값}`. 방식 이름은 서바이벌 / 몬스터 사냥이고, 값은 `n점` / `n단계`다. 세트 이름은 setId(JSON)를 `createSymbolSet(JSON.parse(setId)).name`으로 만든다.
  - **스테이지 별**: 세트마다 `{세트 이름}: ★ {합}개 · {열린 단계}단계까지`
  - 기록이 하나도 없으면 `아직 기록이 없어요. 혼자 하기로 시작해 보세요`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
const SET = createSymbolSet({ kind: 'syllable', initial: 'ㄱ', batchim: false }).id;
test('배지는 받은 것과 못 받은 것을 구분한다', () => {
  render(<Collection records={{ ...EMPTY_RECORDS, badges: ['first', `master:${SET}`] }} onBack={() => {}} />);
  expect(screen.getByText('첫 게임').closest('.badge-card')).not.toHaveClass('is-locked');
  expect(screen.getByText('피버 타임').closest('.badge-card')).toHaveClass('is-locked');
  expect(screen.getByText('ㄱ 글자 마스터')).toBeInTheDocument();
});
test('최고 기록과 스테이지 별을 보여준다', () => {
  render(<Collection records={{ ...EMPTY_RECORDS, best: { [`soloSurvival|${SET}`]: 42, [`coop|${SET}`]: 3 }, stars: { [SET]: [3, 2] }, unlocked: { [SET]: 3 } }} onBack={() => {}} />);
  expect(screen.getByText('서바이벌 · ㄱ 글자: 42점')).toBeInTheDocument();
  expect(screen.getByText('몬스터 사냥 · ㄱ 글자: 3단계')).toBeInTheDocument();
  expect(screen.getByText('ㄱ 글자: ★ 5개 · 3단계까지')).toBeInTheDocument();
});
test('기록이 없으면 안내 문구', () => {
  render(<Collection records={EMPTY_RECORDS} onBack={() => {}} />);
  expect(screen.getByText('아직 기록이 없어요. 혼자 하기로 시작해 보세요')).toBeInTheDocument();
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다.** App에 `collection` 화면을 추가한다.
- [ ] **Step 4: `npm test`, `npx tsc -b`, `npm run build`를 모두 통과하는지 확인한다**
- [ ] **Step 5: 실제 화면을 확인한다.** 서비스 워커와 캐시를 지운 뒤 확인한다.
  - 1024×768
    - 서바이벌: 판정 표시, 점수, 정답 강조
    - 스테이지 1단계를 콘솔로 7번 맞혀 클리어 → 결과 화면의 별과 `다음 단계`
    - 수집함에 기록과 배지가 보이는지
  - 960×600: 1인 중앙 카드 확대와 정보 칸 배치
  - 각 화면의 스크린샷을 남긴다.
- [ ] **Step 6: 커밋한다** (`feat: collection screen`)
