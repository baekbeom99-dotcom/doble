# 도블 게임 3단계(경쟁 확장) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 같이 하기에 다음을 추가한다.
- 대결 방식 3가지: 점수제, 탑 쌓기, 폭탄 돌리기
- 덧붙는 요소: 콤보, 막판 3배, 아이템
- 플레이어별 난이도
- 팀 대결(3~4인)

**Architecture:**
- `Mode`는 대결 방식이고, 정답 하나의 값(`value`)을 받아 점수나 카드에 반영한다.
- 값은 reducer가 덧붙는 요소(`combo`, `finalRound`)를 차례로 적용해 계산한다.
- 정답 처리 후에는 콤보 기록 갱신과 아이템 지급이 따로 실행된다.
- 아이템 사용(`USE_ITEM`)과 폭탄 대상 선택(`CHOOSE_TARGET`)은 새 행동으로 추가한다.
- 팀 관련 판단(상대 목록, 순위 집계)은 `engine/teams.ts` 한 곳에 모은다.

**Tech Stack:** 1~2단계와 같다 (Vite 6, React 18, TS 5, Vitest 3)

**Spec:** `docs/superpowers/specs/2026-11-09-dobble-game-design.md` (1.3 경쟁, 1.4 팀 경쟁)

**범위 밖:**
- 점수제의 "목표 점수 먼저 도달" 종료 조건 (이번에도 라운드 수로만 끝난다)
- 혼자 하기의 콤보와 아이템 (5단계)
- 협동 (4단계)
- 이미지 (6단계)

## Global Constraints

- 같이 하기와 팀 대결에서는 덧붙는 요소(콤보, 막판 3배, 아이템)를 각각 설정에서 켜고 끈다. 기본값은 모두 켬이다. 혼자 하기에서는 모두 끈다.
- **값 계산**
  - 정답의 기본 값은 1이다.
  - 콤보: 같은 사람이 연속으로 맞힌 횟수가 이번 정답을 포함해 **4 이상이면 ×2**다. 설계서의 "3연속으로 맞히면 그다음부터 2점"을 그대로 따른 것으로, 1~3번째는 1, 4번째부터 2가 된다.
  - 막판 3배: `round.index === scoreRounds − 1`이면 ×3이다.
  - 둘 다 해당하면 곱한다(최대 6).
- **콤보가 끊기는 경우**: 다른 사람이 맞히면 맞힌 사람을 뺀 모두의 연속 기록이 0이 된다. 내가 틀리면 내 연속 기록이 0이 된다.
- **방식별 값 반영**
  - 점수제: `score += value`
  - 탑 쌓기: 탑 높이 `score += value`
  - 폭탄 돌리기: 카드를 `value`장 넘긴다. 단, 내가 가진 장수보다 많이 넘기지는 못한다.
- **탑 쌓기**
  - 점수 계산은 점수제와 같다. 다르게 보이는 것은 점수 배지에 탑 그림(쌓인 칸, 최대 10칸까지 그림)이 있다는 점과 결과 문구 `탑 {n}층`이다.
  - 정해진 카드를 다 쓰면, 즉 `scoreRounds`라운드가 끝나면 게임이 끝난다.
- **폭탄 돌리기**
  - 시작할 때 각자 `startHand`장(기본 5, 선택 3/5/7)을 들고 있다. `score`가 손에 든 장수다.
  - 넘길 대상: `target`이 `'random'`이면 상대 중 무작위로 고른다.
  - `target`이 `'choose'`이면 맞힌 사람 자리에 대상 버튼이 3000ms 동안 뜨고, 그 사이 고르지 않으면 무작위로 정한다. 기다리는 동안에도 게임은 계속된다.
  - 종료: 누군가의 손이 0장이 되면 끝난다. `scoreRounds`라운드에 도달해도 끝난다.
  - 순위: 장수가 적을수록 위다. 0장인 사람이 `우승`이고, 가장 많이 든 사람에게는 `폭탄!` 표시를 붙인다.
- **아이템**
  - 정답을 맞혔을 때 아이템이 없으면 확률 0.2로 4종 중 하나를 얻는다.
  - 난수 시드: `seed + round.index × 7919 + 500009 + player`
  - ❄️ `freeze`: 상대마다 `lockedUntil = max(기존 값, now + 2000)`
  - 🌀 `swirl`: 상대마다 `spinUntil = now + 3000`
  - 💡 `hint`: 내 `hintRound = round.index`로 정해서 이번 라운드 내 정답이 반짝인다.
  - 🛡️ `shield`: 들고만 있어도 효과가 있다. 공격(얼리기, 뒤섞기)을 받으면 방패가 사라지고 공격은 막힌다. 버튼을 눌러도 아무 일도 없다.
  - 잠겨 있는 동안에는 아이템을 쓸 수 없다.
  - "상대"는 팀 대결이면 상대 팀 전원, 아니면 나를 뺀 모두다.
- **팀**
  - `teams`는 플레이어마다 0 또는 1이다.
  - 4인: `[0, 0, 1, 1]` (아래 두 자리가 A팀, 위 두 자리가 B팀)
  - 3인: `[0, 0, 1]` (위쪽 1명이 B팀). 혼자인 사람의 카드당 심볼 수 기본값은 `max(3, 기본값 − 2)`로 정하고, 설정에서 바꿀 수 있다.
  - 팀 점수는 팀원 점수의 합이다.
  - 폭탄 돌리기 팀전: 카드는 상대 팀원에게만 넘긴다. 누군가 0장이 되면 그 사람의 팀이 이긴다.
  - 팀 이름은 `A팀`, `B팀`이다.
- **난수 시드**
  - 라운드 카드: `seed + round.index × 7919`
  - 폭탄 무작위 대상: `seed + round.index × 7919 + 700001 + player`

## Review Focus

1. **잠긴 사람이나 방패를 든 사람에게 얼리기를 쓸 때**
   - 이미 잠긴 사람: 잠금 시간이 줄어들면 안 되고, 더 긴 쪽이 유지되어야 한다.
   - 방패를 든 사람: 방패만 사라지고 잠기지 않아야 한다.
   → Task 3 테스트
2. **폭탄 대상을 고르는 동안 같은 사람이 또 맞혔을 때**
   - 이전에 넘길 카드는 무작위로 먼저 넘기고, 새로 넘길 카드를 다시 대기시킨다.
   - 대기 중에 손이 0장이 되어도 카드가 사라지거나 음수가 되면 안 된다.
   → Task 5 테스트
3. **마지막 라운드에서 콤보와 막판 3배가 겹칠 때** 값은 6이다. 폭탄 돌리기에서는 가진 장수까지만 넘긴다.
   → Task 2, Task 5 테스트
4. **3인 팀전에서 혼자인 쪽**: 카드당 심볼 수가 낮아지고, 혼자인 사람이 받은 공격은 그 사람에게만 적용되어야 한다.
   → Task 6, Task 9 테스트
5. **동점 순위**: 팀 합계나 개인 점수가 같으면 공동 순위로 같은 등수를 표시하고, 우승도 함께 표시한다(1~2단계에서 미룬 문제).
   → Task 6 테스트

---

## File Structure

```
src/engine/state.ts            GameConfig/PlayerState 확장, 새 Action·Event, Mode.onCorrect(value)
src/engine/reducer.ts          값 계산 → mode.onCorrect → afterCorrect, USE_ITEM, CHOOSE_TARGET
src/engine/teams.ts            opponentsOf, standings
src/engine/modifiers/combo.ts  comboValue, updateStreaks
src/engine/modifiers/finalRound.ts  finalRoundValue
src/engine/modifiers/items.ts  maybeGrantItem, useItem
src/engine/modes/tower.ts
src/engine/modes/bomb.ts       bomb Mode, chooseTarget, 대기 중인 넘기기 처리
src/ui/components/SeatView.tsx 콤보, 아이템 버튼, 대상 선택, 팀 표시, 탑 그림, 힌트/회전 글자
src/ui/screens/Game.tsx        새 행동 연결, 방식별 정보 칸
src/ui/screens/Setup.tsx       대결 방식, 덧붙는 요소, 플레이어별 난이도, 폭탄 옵션, 팀
src/ui/screens/Home.tsx        팀 대결 버튼
src/ui/screens/Result.tsx      standings 기반 순위
src/App.tsx
```

---

### Task 1: 설정·상태 확장과 Mode 시그니처 변경

**Files:**
- Modify: `src/engine/state.ts`, `src/engine/reducer.ts`, `src/engine/modes/score.ts`, `src/engine/modes/soloSurvival.ts`
- Modify (테스트용 설정 값 갱신): `src/engine/reducer.test.ts`, `src/engine/modes/modes.test.ts`, `src/engine/controller.test.ts`, `src/ui/screens/Game.test.tsx`, `src/ui/screens/Result.test.tsx`
- Create: `src/engine/testConfig.ts` (테스트 공용 설정)

**Interfaces:**
- Produces:
```ts
// ModeId는 이 Task에서 바꾸지 않는다. 'tower'는 Task 4, 'bomb'은 Task 5에서 추가한다(MODES가 Record<ModeId, Mode>라서)
export type ItemId = 'freeze' | 'swirl' | 'hint' | 'shield';
export interface Rules { combo: boolean; finalRound: boolean; items: boolean }
export const NO_RULES: Rules;     // 모두 false
export const ALL_RULES: Rules;    // 모두 true
export interface BombConfig { startHand: number; target: 'random' | 'choose' }
export const DEFAULT_BOMB: BombConfig;  // { startHand: 5, target: 'random' }
export interface GameConfig {
  /* 기존 필드 */ mode: ModeId; players: PlayerConfig[]; set: SetConfig; rotationStep: 90 | 180;
  symbolRotation: boolean; speech: boolean; scoreRounds: number; seed: number;
  rules: Rules; teams: number[] | null; bomb: BombConfig;
}
export interface PlayerState {
  score: number; lockedUntil: number;
  streak: number; item: ItemId | null; spinUntil: number; hintRound: number;  // hintRound 초기값 -1
}
export type Action =
  | { type: 'TAP'; player: number; symbol: string; round: number }
  | { type: 'TICK'; dt: number }
  | { type: 'USE_ITEM'; player: number }
  | { type: 'CHOOSE_TARGET'; player: number; target: number };
export type GameEvent =
  | { type: 'correct'; player: number; symbol: string; value: number }
  | { type: 'wrong'; player: number }
  | { type: 'round'; index: number }
  | { type: 'over' }
  | { type: 'gotItem'; player: number; item: ItemId }
  | { type: 'usedItem'; player: number; item: ItemId }
  | { type: 'blocked'; player: number }
  | { type: 'give'; from: number; to: number; count: number };
export interface Mode {
  init(config: GameConfig): Record<string, number>;
  initPlayer?(config: GameConfig, player: number): Partial<PlayerState>;  // 폭탄의 시작 장수 등
  onCorrect(s: GameState, player: number, value: number): { state: GameState; nextRound: boolean; events?: GameEvent[] };
  onWrong(s: GameState, player: number): GameState;
  onTick(s: GameState, dt: number): { state: GameState; events?: GameEvent[] };
  isOver(s: GameState): boolean;
}
// testConfig.ts
export function testConfig(over?: Partial<GameConfig>): GameConfig;
// 기본값: 2인(pink/sky, cardSize 5), ㄱ 글자 세트, 90°, scoreRounds 20, seed 1, rules NO_RULES, teams null, bomb DEFAULT_BOMB
export const TEST_POOL: string[];  // s0..s20
```
- `onTick`의 반환형이 `{ state, events }`로 바뀐다. `soloSurvival`과 `score`도 이 형태에 맞춘다.
- `correct` 이벤트에는 `value`가 붙는다.

- [ ] **Step 1: 기존 테스트의 설정 리터럴을 `testConfig(...)`로 바꾸고, 새 테스트를 추가한다**

```ts
// reducer.test.ts에 추가
test('플레이어 초기 상태에 연속 기록·아이템·회전·힌트 필드가 있다', () => {
  const s = createGame(testConfig(), TEST_POOL, MODES);
  expect(s.players[0]).toEqual({ score: 0, lockedUntil: 0, streak: 0, item: null, spinUntil: 0, hintRound: -1 });
});
test('correct 이벤트에 값이 실린다', () => {
  const g = createGame(testConfig(), TEST_POOL, MODES);
  const { events } = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, MODES);
  expect(events[0]).toEqual({ type: 'correct', player: 0, symbol: g.round.answers[0], value: 1 });
});
test('Mode.initPlayer가 있으면 플레이어 초기 상태에 반영한다', () => {
  const custom = { ...MODES.score, initPlayer: () => ({ score: 7 }) };
  const s = createGame(testConfig(), TEST_POOL, { ...MODES, score: custom });
  expect(s.players.map(p => p.score)).toEqual([7, 7]);
});
```
- [ ] **Step 2: `npm test`를 실행해 새 테스트가 실패하는지 확인한다** (Expected: `testConfig`가 없어서, 또는 필드가 없어서 실패)
- [ ] **Step 3: 위 인터페이스대로 `state.ts`, `reducer.ts`, 두 모드, `testConfig.ts`를 수정한다.** 이 Task에서는 `value`를 항상 1로 넘긴다.
- [ ] **Step 4: `npm test`와 `npx tsc -b`를 실행해 모두 통과하는지 확인한다**
- [ ] **Step 5: 커밋한다** (`refactor: extend game config and mode signature for versus rules`)

---

### Task 2: 콤보와 막판 3배

**Files:**
- Create: `src/engine/modifiers/combo.ts`, `src/engine/modifiers/finalRound.ts`, `src/engine/modifiers/modifiers.test.ts`
- Modify: `src/engine/reducer.ts`

**Interfaces:**
- Consumes: `GameState`, `Rules`(Task 1)
- Produces:
```ts
export const COMBO_FROM = 4;  // 이번 정답을 포함한 연속 횟수가 이 이상이면 ×2
export function comboMultiplier(s: GameState, player: number): number;  // 1 또는 2. rules.combo가 꺼져 있으면 1
export function updateStreaks(s: GameState, player: number, correct: boolean): GameState;
export function finalRoundMultiplier(s: GameState): number;  // 1 또는 3
export function correctValue(s: GameState, player: number): number;  // 1 × combo × final
```
- reducer의 정답 처리 순서:
  1. `value = correctValue(s, player)`
  2. `mode.onCorrect(s, player, value)`
  3. `updateStreaks(…, player, true)`
- 오답 처리: `updateStreaks(…, player, false)`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const rules = { combo: true, finalRound: true, items: false };
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);
const wrongOf = (s: GameState, p: number) => s.round.cards[p].find(id => id !== s.round.answers[p])!;

test('같은 사람이 4번째 연속 정답부터 2점', () => {
  let s = createGame(testConfig({ rules }), TEST_POOL, MODES);
  const values: number[] = [];
  for (let i = 0; i < 5; i++) { const r = tap(s, 0); values.push((r.events[0] as { value: number }).value); s = r.state; }
  expect(values).toEqual([1, 1, 1, 2, 2]);
  expect(s.players[0].score).toBe(7);
});
test('다른 사람이 맞히면 콤보가 끊긴다', () => {
  let s = createGame(testConfig({ rules }), TEST_POOL, MODES);
  for (let i = 0; i < 3; i++) s = tap(s, 0).state;
  s = tap(s, 1).state;
  expect(s.players[0].streak).toBe(0);
  expect(s.players[1].streak).toBe(1);
});
test('틀리면 내 콤보만 끊긴다', () => {
  let s = createGame(testConfig({ rules }), TEST_POOL, MODES);
  s = tap(s, 0).state; s = tap(s, 0).state;
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: s.round.index }, MODES).state;
  expect(s.players[0].streak).toBe(0);
});
test('마지막 라운드는 3배, 콤보와 겹치면 6', () => {
  let s = createGame(testConfig({ rules, scoreRounds: 5 }), TEST_POOL, MODES);
  for (let i = 0; i < 4; i++) s = tap(s, 0).state;
  const r = tap(s, 0);
  expect((r.events[0] as { value: number }).value).toBe(6);
});
test('규칙이 꺼져 있으면 항상 1', () => {
  let s = createGame(testConfig({ scoreRounds: 5 }), TEST_POOL, MODES);
  for (let i = 0; i < 5; i++) s = tap(s, 0).state;
  expect(s.players[0].score).toBe(5);
});
```
- [ ] **Step 2: `npx vitest run src/engine/modifiers`를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현하고 reducer에 연결한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: combo and final-round multipliers`)

---

### Task 3: 아이템

**Files:**
- Create: `src/engine/modifiers/items.ts`, `src/engine/modifiers/items.test.ts`, `src/engine/teams.ts`(이 Task에서는 `opponentsOf`만)
- Modify: `src/engine/reducer.ts`

**Interfaces:**
- Consumes: `GameState`, `ItemId`, `createRng`
- Produces:
```ts
// teams.ts
export function opponentsOf(s: GameState, player: number): number[];  // 팀전이면 상대 팀 전원, 아니면 나를 뺀 모두
// items.ts
export const ITEM_CHANCE = 0.2;
export const ITEMS: readonly ItemId[];  // ['freeze', 'swirl', 'hint', 'shield']
export const FREEZE_MS = 2000;
export const SWIRL_MS = 3000;
export function maybeGrantItem(s: GameState, player: number): { state: GameState; events: GameEvent[] };
export function useItem(s: GameState, player: number): { state: GameState; events: GameEvent[] };
```
- reducer 연결
  - 정답 처리 뒤 `rules.items`가 켜져 있으면 `maybeGrantItem`을 호출한다.
  - `USE_ITEM`: `phase === 'playing'`이고 잠겨 있지 않고 아이템이 있을 때만 `useItem`을 호출한다.
- 아이템 사용 규칙
  - `hint`와 `shield`를 제외하면, 사용 후 내 아이템은 `null`이 된다.
  - `hint`도 사용하면 `null`이 된다.
  - `shield`는 사용 버튼으로는 아무 일도 일어나지 않고, 이벤트도 없다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const cfg = (over = {}) => testConfig({ rules: { combo: false, finalRound: false, items: true }, ...over });
const withItem = (s: GameState, p: number, item: ItemId | null) =>
  ({ ...s, players: s.players.map((pl, i) => (i === p ? { ...pl, item } : pl)) });

test('정답을 많이 맞히면 약 20% 확률로 아이템을 얻는다', () => {
  let got = 0;
  for (let seed = 0; seed < 300; seed++) {
    const s = createGame(cfg({ seed }), TEST_POOL, MODES);
    const r = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES);
    if (r.state.players[0].item) got++;
  }
  expect(got).toBeGreaterThan(30); expect(got).toBeLessThan(90);
});
test('이미 아이템이 있으면 새로 얻지 않는다', () => {
  for (let seed = 0; seed < 50; seed++) {
    const s = withItem(createGame(cfg({ seed }), TEST_POOL, MODES), 0, 'hint');
    expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state.players[0].item).toBe('hint');
  }
});
test('얼리기는 상대를 2초 잠그고, 이미 더 길게 잠긴 사람은 그대로 둔다', () => {
  let s = withItem(createGame(cfg({ players: [...testConfig().players, { name: 'C', color: 'yellow', cardSize: 5 }] }), TEST_POOL, MODES), 0, 'freeze');
  s = { ...s, players: s.players.map((p, i) => (i === 2 ? { ...p, lockedUntil: 5000 } : p)) };
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.state.players.map(p => p.lockedUntil)).toEqual([0, 2000, 5000]);
  expect(r.state.players[0].item).toBeNull();
  expect(r.events).toContainEqual({ type: 'usedItem', player: 0, item: 'freeze' });
});
test('방패를 든 상대는 공격을 막고 방패를 잃는다', () => {
  let s = withItem(withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'swirl'), 1, 'shield');
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.state.players[1].spinUntil).toBe(0);
  expect(r.state.players[1].item).toBeNull();
  expect(r.events).toContainEqual({ type: 'blocked', player: 1 });
});
test('힌트는 이번 라운드 번호를 기록한다', () => {
  const s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'hint');
  expect(reduce(s, { type: 'USE_ITEM', player: 0 }, MODES).state.players[0].hintRound).toBe(0);
});
test('방패 사용 버튼은 아무 일도 하지 않는다', () => {
  const s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'shield');
  const r = reduce(s, { type: 'USE_ITEM', player: 0 }, MODES);
  expect(r.events).toEqual([]); expect(r.state.players[0].item).toBe('shield');
});
test('잠긴 사람은 아이템을 쓸 수 없다', () => {
  let s = withItem(createGame(cfg(), TEST_POOL, MODES), 0, 'freeze');
  s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, lockedUntil: 1000 } : p)) };
  expect(reduce(s, { type: 'USE_ITEM', player: 0 }, MODES).events).toEqual([]);
});
test('팀전에서는 팀원을 공격하지 않는다', () => {
  const four = ['pink', 'sky', 'yellow', 'lime'].map((c, i) => ({ name: `P${i}`, color: c as SeatColor, cardSize: 5 }));
  const s = withItem(createGame(cfg({ players: four, teams: [0, 0, 1, 1] }), TEST_POOL, MODES), 0, 'freeze');
  expect(reduce(s, { type: 'USE_ITEM', player: 0 }, MODES).state.players.map(p => p.lockedUntil)).toEqual([0, 0, 2000, 2000]);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: items`)

---

### Task 4: 탑 쌓기 모드

**Files:**
- Create: `src/engine/modes/tower.ts`
- Modify: `src/engine/modes/index.ts`, `src/engine/modes/modes.test.ts`

**Interfaces:**
- Produces: `tower: Mode`, `MODES.tower`, `ModeId`에 `'tower'` 추가

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('탑 쌓기: 맞히면 값만큼 탑이 높아지고 scoreRounds 뒤에 끝난다', () => {
  let s = createGame(testConfig({ mode: 'tower', scoreRounds: 2, rules: { combo: false, finalRound: true, items: false } }), TEST_POOL, MODES);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state;
  expect(s.players[0].score).toBe(1);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 1 }, MODES).state;
  expect(s.players[0].score).toBe(4);
  expect(s.phase).toBe('over');
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다.** 점수 계산 로직은 `score` 모드와 같으므로, 공통 부분을 함수로 뽑아 함께 쓴다.
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: tower mode`)

---

### Task 5: 폭탄 돌리기 모드

**Files:**
- Create: `src/engine/modes/bomb.ts`, `src/engine/modes/bomb.test.ts`
- Modify: `src/engine/modes/index.ts`, `src/engine/reducer.ts` (`CHOOSE_TARGET` 연결)

**Interfaces:**
- Consumes: `opponentsOf`(Task 3), `Mode.initPlayer`, `onTick`의 events(Task 1)
- Produces:
```ts
export const CHOOSE_TIMEOUT_MS = 3000;
export const bomb: Mode;  // 모드 상태: { pendingFrom: -1, pendingCount: 0, pendingUntil: 0 }. ModeId에 'bomb' 추가
export function chooseTarget(s: GameState, player: number, target: number): { state: GameState; events: GameEvent[] };
export function pendingChoice(s: GameState): { from: number; count: number; until: number } | null;
```
- 규칙
  - `initPlayer`: `score = config.bomb.startHand`
  - `onCorrect(value)`
    - 이전에 대기 중인 넘기기가 있으면 먼저 무작위 대상에게 처리한다.
    - `count = min(value, 내 장수)`
    - `target === 'random'`이면 무작위 상대에게 바로 넘긴다(`give` 이벤트).
    - `target === 'choose'`이면 대기 상태로 저장한다(`pendingUntil = now + 3000`).
    - `nextRound`는 true다.
  - `chooseTarget`: 대기 중인 사람만 고를 수 있고, 대상이 `opponentsOf`에 들어 있어야 한다. 처리하면 대기 상태를 비운다.
  - `onTick`: `now ≥ pendingUntil`이면 무작위로 처리한다.
  - `isOver`: 대기 중인 넘기기가 없고 누군가 0장이거나, `round.index ≥ scoreRounds`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const bombCfg = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'bomb', bomb: { startHand: 2, target: 'random' }, ...over });
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);

test('시작할 때 각자 startHand장을 든다', () => {
  expect(createGame(bombCfg(), TEST_POOL, MODES).players.map(p => p.score)).toEqual([2, 2]);
});
test('맞히면 상대에게 1장 넘기고, 먼저 0장이 되면 끝난다', () => {
  let s = createGame(bombCfg(), TEST_POOL, MODES);
  let r = tap(s, 0);
  expect(r.events).toContainEqual({ type: 'give', from: 0, to: 1, count: 1 });
  r = tap(r.state, 0);
  expect(r.state.players.map(p => p.score)).toEqual([0, 4]);
  expect(r.state.phase).toBe('over');
});
test('값이 장수보다 크면 가진 만큼만 넘긴다', () => {
  let s = createGame(bombCfg({ scoreRounds: 1, rules: { combo: false, finalRound: true, items: false } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(s.players.map(p => p.score)).toEqual([0, 4]);
});
test('대상 고르기: 고르면 그 사람에게, 3초가 지나면 무작위로 넘긴다', () => {
  const three = [...testConfig().players, { name: 'C', color: 'yellow' as const, cardSize: 5 }];
  let s = createGame(bombCfg({ players: three, bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(pendingChoice(s)).toEqual({ from: 0, count: 1, until: 3000 });
  const r = reduce(s, { type: 'CHOOSE_TARGET', player: 0, target: 2 }, MODES);
  expect(r.state.players.map(p => p.score)).toEqual([2, 3, 4]);
  expect(pendingChoice(r.state)).toBeNull();
  let t = tap(r.state, 1).state;
  t = reduce(t, { type: 'TICK', dt: 3000 }, MODES).state;
  expect(pendingChoice(t)).toBeNull();
  expect(t.players[1].score).toBe(2);
});
test('대기 중에 또 맞히면 이전 넘기기를 먼저 무작위로 처리한다', () => {
  let s = createGame(bombCfg({ bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state; s = tap(s, 0).state;
  expect(s.players.map(p => p.score)).toEqual([2, 4]);
  expect(pendingChoice(s)).toEqual({ from: 0, count: 1, until: expect.any(Number) });
});
test('대기 중인 사람만, 상대만 고를 수 있다', () => {
  let s = createGame(bombCfg({ bomb: { startHand: 3, target: 'choose' } }), TEST_POOL, MODES);
  s = tap(s, 0).state;
  expect(reduce(s, { type: 'CHOOSE_TARGET', player: 1, target: 0 }, MODES).events).toEqual([]);
  expect(reduce(s, { type: 'CHOOSE_TARGET', player: 0, target: 0 }, MODES).events).toEqual([]);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: bomb mode`)

---

### Task 6: 팀 집계와 순위

**Files:**
- Modify: `src/engine/teams.ts`
- Create: `src/engine/teams.test.ts`

**Interfaces:**
- Produces:
```ts
export const TEAM_NAMES = ['A팀', 'B팀'] as const;
export interface Standing {
  rank: number;           // 공동 순위는 같은 수 (1, 1, 3 …)
  label: string;          // 플레이어 이름 또는 팀 이름
  players: number[];      // 이 순위 항목에 속한 플레이어
  value: number;          // 점수·탑 높이·장수 (팀이면 합계)
  winner: boolean;        // rank === 1
  bomb: boolean;          // 폭탄 돌리기에서 장수가 가장 많은 항목
}
export function standings(s: GameState): Standing[];
export function teamTotals(s: GameState): number[] | null;  // 팀전이 아니면 null
```
- 정렬: 폭탄 돌리기는 오름차순, 나머지는 내림차순
- 폭탄 팀전에서 누군가 0장이 되어 끝났다면 그 사람의 팀이 1위다(합계와 관계없이).
- 서바이벌은 1명이므로 `value = mode.correct`인 항목 1개를 돌려준다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const withScores = (s: GameState, scores: number[]) => ({ ...s, players: s.players.map((p, i) => ({ ...p, score: scores[i] })) });
const three = ['pink', 'sky', 'yellow'].map((c, i) => ({ name: `P${i}`, color: c as SeatColor, cardSize: 5 }));

test('동점은 같은 순위이고 함께 우승', () => {
  const st = standings(withScores(createGame(testConfig({ players: three }), TEST_POOL, MODES), [5, 7, 7]));
  expect(st.map(x => [x.label, x.rank, x.winner])).toEqual([['P1', 1, true], ['P2', 1, true], ['P0', 3, false]]);
});
test('팀전은 팀 합계로 순위를 매긴다', () => {
  const s = withScores(createGame(testConfig({ players: three, teams: [0, 0, 1] }), TEST_POOL, MODES), [2, 3, 4]);
  expect(standings(s).map(x => [x.label, x.value, x.players])).toEqual([['A팀', 5, [0, 1]], ['B팀', 4, [2]]]);
  expect(teamTotals(s)).toEqual([5, 4]);
});
test('폭탄 돌리기는 적게 든 쪽이 위이고, 가장 많이 든 쪽이 폭탄', () => {
  const st = standings(withScores(createGame(testConfig({ mode: 'bomb', players: three }), TEST_POOL, MODES), [0, 6, 3]));
  expect(st.map(x => [x.label, x.winner, x.bomb])).toEqual([['P0', true, false], ['P2', false, false], ['P1', false, true]]);
});
test('폭탄 팀전은 0장이 된 사람의 팀이 이긴다', () => {
  const s = withScores(createGame(testConfig({ mode: 'bomb', players: three, teams: [0, 0, 1] }), TEST_POOL, MODES), [0, 9, 2]);
  expect(standings(s)[0]).toMatchObject({ label: 'A팀', winner: true });
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: team totals and standings`)

---

### Task 7: 자리 화면 확장 (SeatView)

**Files:**
- Modify: `src/ui/components/SeatView.tsx`, `src/ui/components/Glyph.tsx`, `src/ui/theme/brutal.css`, `src/ui/components/components.test.tsx`

**Interfaces:**
- Consumes: `ItemId`, `TEAM_NAMES`, `SEAT_COLORS`
- Produces: SeatView에 prop을 추가한다(기존 prop은 그대로).
```tsx
streak?: number;                 // 2 이상이면 배지 옆에 "콤보 {n}"
item?: ItemId | null;            // 있으면 배지 옆에 아이템 버튼(aria-label: 얼리기/뒤섞기/힌트/방패)
onUseItem?: () => void;
team?: number | null;            // 배지 안에 A/B 표시
tower?: boolean;                 // 배지 위에 쌓인 칸(최대 10칸)
hintSymbol?: string | null;      // 해당 글자에 glyph--hint (반짝임 애니메이션)
spinning?: boolean;              // 모든 글자에 glyph--spin (회전 애니메이션)
targets?: { index: number; name: string; color: SeatColor }[] | null;  // 폭탄 대상 버튼
onPickTarget?: (index: number) => void;
```
- Glyph에 `className?: string` prop을 추가한다(hint/spin 클래스용).
- 아이템 버튼, 대상 버튼, 콤보 표시는 배지 근처에 둔다. 영역 안쪽 방향으로 배지 높이만큼 떨어뜨리고, 배지처럼 `facing`만큼 회전한다.
- 대상 버튼에는 그 사람의 자리 색과 이름을 넣는다.
- 아이템 버튼 문구: ❄️ 얼리기, 🌀 뒤섞기, 💡 힌트, 🛡️ 방패. 버튼은 `onPointerDown`으로 동작한다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('아이템 버튼을 누르면 onUseItem을 부른다', () => {
  const onUseItem = vi.fn();
  render(<SeatView {...baseProps} item="freeze" onUseItem={onUseItem} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: '얼리기' }));
  expect(onUseItem).toHaveBeenCalled();
});
test('콤보 2 이상이면 표시한다', () => {
  render(<SeatView {...baseProps} streak={3} />);
  expect(screen.getByText('콤보 3')).toBeInTheDocument();
});
test('폭탄 대상 버튼을 누르면 그 사람 번호를 넘긴다', () => {
  const onPickTarget = vi.fn();
  render(<SeatView {...baseProps} targets={[{ index: 2, name: '엄마', color: 'yellow' }]} onPickTarget={onPickTarget} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: '엄마에게' }));
  expect(onPickTarget).toHaveBeenCalledWith(2);
});
test('힌트 글자와 회전 상태를 클래스로 표시한다', () => {
  render(<SeatView {...baseProps} hintSymbol="ko-s:고" spinning />);
  expect(document.querySelector('[data-symbol="ko-s:고"]')).toHaveClass('glyph--hint');
  expect(document.querySelector('[data-symbol="ko-s:가"]')).toHaveClass('glyph--spin');
});
test('팀과 탑을 표시한다', () => {
  render(<SeatView {...baseProps} score={4} team={1} tower />);
  expect(within(screen.getByTestId('badge-0')).getByText('B')).toBeInTheDocument();
  expect(screen.getByTestId('tower-0').children).toHaveLength(4);
});
```
  - `baseProps`는 기존 테스트의 SeatView props를 객체로 뽑아 만든다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다.** CSS에 다음을 추가한다.
  - `glyph--hint`: 노란 배경이 깜빡임
  - `glyph--spin`: 1초에 한 바퀴 회전
  - `.item-btn`, `.target-btn`, `.combo`, `.tower`
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: seat view combo, items, targets, team and tower`)

---

### Task 8: 게임 화면 연결

**Files:**
- Modify: `src/ui/screens/Game.tsx`, `src/ui/screens/Game.test.tsx`

**Interfaces:**
- Consumes: Task 1~7 전부 (`USE_ITEM`, `CHOOSE_TARGET`, `pendingChoice`, `teamTotals`, SeatView 새 prop)
- 연결 규칙
  - SeatView에 넘기는 값
    - `streak`: `rules.combo`가 켜져 있을 때만
    - `item`: `rules.items`가 켜져 있을 때만
    - `team`: `config.teams?.[i] ?? null`
    - `tower`: `mode === 'tower'`
    - `hintSymbol`: `players[i].hintRound === round.index`이면 내 정답, 아니면 null
    - `spinning`: `now < spinUntil`
    - `targets`: `pendingChoice(state)?.from === i`이면 `opponentsOf` 목록, 아니면 null
  - 공용 정보 칸
    - 점수제·탑 쌓기: `{라운드}/{scoreRounds}`
    - 폭탄 돌리기: `{라운드}/{scoreRounds}`와 함께 `💣`
    - 팀전이면 앞에 `A {합} : {합} B`를 붙인다.
    - 마지막 라운드이고 `rules.finalRound`가 켜져 있으면 `×3`을 붙인다.
  - 배지 숫자: `players[i].score` (폭탄 돌리기에서는 손에 든 장수)

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('아이템을 쓰면 상대 자리가 잠긴다', () => { /* createGame으로 정답을 구해 맞히는 대신,
   Game에 initialState를 주입할 수 없으므로: rules.items를 켜고, 아이템이 나올 때까지(최대 시드 50개) 정답을 맞힌 뒤
   얼리기 버튼이 보이면 누르고 seat-1이 is-locked인지 확인한다. 얼리기가 나오는 시드를 찾지 못하면 테스트 실패 */ });
test('폭탄 대상 고르기 버튼이 맞힌 사람 자리에 뜨고, 누르면 사라진다', () => {
  // mode 'bomb', bomb.target 'choose', 3인. seat-0이 정답을 맞힌 뒤 '플레이어 3에게' 버튼을 누르고,
  // 버튼이 사라지며 badge-2의 숫자가 늘었는지 확인한다
});
test('팀전 정보 칸에 팀 합계를 보여준다', () => {
  // 4인, teams [0,0,1,1]. 처음에는 'A 0 : 0 B'가 정보 칸 2곳에 보인다
});
```
  - 위 세 테스트는 주석에 적은 절차대로 구현한다. Game 컴포넌트에 테스트 전용 prop은 추가하지 않는다.
  - 아이템을 얻게 만드는 시드는 테스트에서 `maybeGrantItem`을 직접 돌려 미리 찾는다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: wire versus rules into game screen`)

---

### Task 9: 설정 화면과 홈

**Files:**
- Modify: `src/ui/screens/Setup.tsx`, `src/ui/screens/Setup.test.tsx`, `src/ui/screens/Home.tsx`, `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Produces:
  - `<Home onPick={(kind: 'solo' | 'versus' | 'team') => void} />`. 홈에 `혼자 하기`, `같이 하기`, `팀 대결` 버튼이 있다.
  - `<Setup kind={'solo' | 'versus' | 'team'} onStart onBack />`. 기존 `mode` prop을 대체한다.
- **설정 화면 항목**
  - 공통
    - 플레이어마다 `카드당 심볼 수` 슬라이더를 둔다(aria-label `플레이어 {n} 심볼 수`). 기존의 공통 슬라이더는 없앤다.
    - 슬라이더 최대값은 세트의 `maxCardSize`다.
    - 심볼이 부족하다는 안내는 하나만 보여준다.
  - versus와 team
    - `대결 방식`: 점수제 / 탑 쌓기 / 폭탄 돌리기
    - `덧붙는 요소`: 콤보 / 막판 3배 / 아이템 체크박스. 기본값은 모두 켬이다.
    - 폭탄 돌리기를 고르면 `시작 카드`(3/5/7, 기본 5)와 `넘길 사람`(무작위 / 직접 고르기)이 나타난다.
    - `라운드 수` 라벨은 탑 쌓기일 때 `카드 수`로 바뀐다.
  - team
    - 인원은 3명 또는 4명이다(기본 4).
    - 이름 칸 옆에 팀 표시(A/B)를 둔다.
    - 3인일 때 B팀(혼자인 사람)의 심볼 수 기본값은 `max(3, A팀 값 − 2)`이다. 인원이 3으로 바뀔 때 한 번 적용하고, 그 뒤에는 사용자가 바꿀 수 있다.
  - solo: 지금과 같다. `rules`는 `NO_RULES`, `teams`는 null이다.
- 시작할 때 만드는 `GameConfig`
  - `mode`: solo이면 `soloSurvival`, 아니면 고른 대결 방식
  - `rules`, `bomb`
  - `teams`: team이면 `[0, 0, 1, 1]` 또는 `[0, 0, 1]`, 아니면 null

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('플레이어마다 심볼 수를 따로 정한다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  setRange(screen.getByRole('slider', { name: '플레이어 1 심볼 수' }), 3);
  setRange(screen.getByRole('slider', { name: '플레이어 2 심볼 수' }), 8);
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(onStart.mock.calls[0][0].players.map((p: PlayerConfig) => p.cardSize)).toEqual([3, 8]);
});
test('폭탄 돌리기를 고르면 시작 카드와 넘길 사람 설정이 나온다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '폭탄 돌리기' }));
  fireEvent.click(screen.getByRole('radio', { name: '7장' }));
  fireEvent.click(screen.getByRole('radio', { name: '직접 고르기' }));
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(onStart.mock.calls[0][0]).toMatchObject({ mode: 'bomb', bomb: { startHand: 7, target: 'choose' } });
});
test('덧붙는 요소를 끌 수 있다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('checkbox', { name: '아이템' }));
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(onStart.mock.calls[0][0].rules).toEqual({ combo: true, finalRound: true, items: false });
});
test('팀 대결 3인은 2:1이고 혼자인 사람의 심볼 수가 2 낮다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="team" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '3명' }));
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  const cfg = onStart.mock.calls[0][0];
  expect(cfg.teams).toEqual([0, 0, 1]);
  expect(cfg.players[2].cardSize).toBe(cfg.players[0].cardSize - 2);
});
test('혼자 하기는 덧붙는 요소가 모두 꺼져 있다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(onStart.mock.calls[0][0]).toMatchObject({ mode: 'soloSurvival', rules: { combo: false, finalRound: false, items: false }, teams: null });
});
```
  - `setRange(el, n)`는 테스트 파일에 만드는 헬퍼다. 값을 넣고 `change` 이벤트를 발생시킨다.
  - 기존 Setup 테스트는 `mode="score"` → `kind="versus"`, `mode="soloSurvival"` → `kind="solo"`로 바꾼다. "카드당 심볼 수" 슬라이더 이름은 `플레이어 1 심볼 수`로 바꾼다.
  - `App.test.tsx`에 `팀 대결` → 설정 화면 제목 `팀 대결` 테스트를 추가한다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: versus and team setup`)

---

### Task 10: 결과 화면과 실제 화면 확인

**Files:**
- Modify: `src/ui/screens/Result.tsx`, `src/ui/screens/Result.test.tsx`

**Interfaces:**
- Consumes: `standings`(Task 6)
- 결과 화면 규칙
  - 서바이벌은 지금과 같다(`{n}개 찾았어요`).
  - 그 외에는 `standings` 순서대로 목록을 보여준다. 각 항목에는 다음을 넣는다.
    - 순위 숫자(공동 순위는 같은 숫자)
    - 이름 또는 팀 이름. 팀이면 팀원 이름을 작게 덧붙인다.
    - 값: 점수제 `{n}점`, 탑 쌓기 `탑 {n}층`, 폭탄 `{n}장`
    - 우승이면 `우승`, 폭탄 항목이면 `폭탄!`
  - 목록은 `<ol>` 대신 순위 숫자를 직접 그리는 `<ul>`로 바꾼다. 공동 순위 표시 때문이다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
const withScores = (s: GameState, scores: number[]) => ({ ...s, players: s.players.map((p, i) => ({ ...p, score: scores[i] })) });
const three = ['pink', 'sky', 'yellow'].map((c, i) => ({ name: `P${i}`, color: c as SeatColor, cardSize: 5 }));
const four = [...three, { name: 'P3', color: 'lime' as const, cardSize: 5 }];
const show = (s: GameState) => render(<Result state={s} onRetry={() => {}} onHome={() => {}} />);

test('공동 1위는 같은 순위 숫자를 보여준다', () => {
  show(withScores(createGame(testConfig({ players: three }), TEST_POOL, MODES), [5, 7, 7]));
  const ranks = screen.getAllByTestId('rank-number').map(el => el.textContent);
  expect(ranks).toEqual(['1', '1', '3']);
});
test('탑 쌓기는 층으로 보여준다', () => {
  show(withScores(createGame(testConfig({ mode: 'tower' }), TEST_POOL, MODES), [3, 5]));
  expect(screen.getByText('탑 5층')).toBeInTheDocument();
});
test('폭탄 돌리기는 장으로 보여주고 가장 많이 든 사람에게 폭탄 표시', () => {
  show(withScores(createGame(testConfig({ mode: 'bomb' }), TEST_POOL, MODES), [0, 4]));
  expect(screen.getByText('4장')).toBeInTheDocument();
  expect(screen.getByText('폭탄!')).toBeInTheDocument();
});
test('팀전은 팀 이름과 팀원을 보여준다', () => {
  show(withScores(createGame(testConfig({ players: four, teams: [0, 0, 1, 1] }), TEST_POOL, MODES), [1, 2, 3, 4]));
  const items = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(items[0]).toContain('B팀'); expect(items[0]).toContain('P2'); expect(items[0]).toContain('P3');
  expect(items[1]).toContain('A팀');
});
```
  - 순위 숫자 요소에 `data-testid="rank-number"`를 단다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`, `npx tsc -b`, `npm run build`를 모두 통과하는지 확인한다**
- [ ] **Step 5: 실제 화면을 확인한다.** `npm run preview`로 열고, 브라우저의 서비스 워커와 캐시를 지운 뒤 확인한다.
  - 1024×768
    - 같이 하기 3인 폭탄 돌리기(직접 고르기): 대상 버튼이 뜨는지, 넘긴 장수가 반영되는지
    - 같이 하기 2인 점수제(아이템 켬): 아이템을 얻고 쓸 때 상대가 잠기는지(콘솔에서 반복해서 맞혀 확인)
  - 960×600: 팀 대결 4인 탑 쌓기에서 팀 합계, 탑 그림, 결과 화면
  - 각 화면의 스크린샷을 남긴다.
- [ ] **Step 6: 커밋한다** (`feat: standings-based result screen`)
