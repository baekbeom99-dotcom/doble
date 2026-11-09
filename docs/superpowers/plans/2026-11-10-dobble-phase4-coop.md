# 도블 게임 4단계(협동) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1~4인 협동 모드 "몬스터 물리치기"를 추가한다.
- 팀 하트, 몬스터 체력, 공격 타이머
- 합체 공격
- 방어 챌린지 2종(원소 순서, 공동 목표)
- 학습 미션
- 스테이지(갈수록 어려워짐)

**Architecture:**
- 협동 상태는 숫자만 담는 `GameState.mode`로는 부족해서, 별도 필드 `GameState.coop`에 둔다. 담는 내용은 몬스터, 하트, 단계, 챌린지, 미션이다.
- `Mode`에 선택 훅 `canTap`을 추가한다. 이번 라운드에 이미 맞힌 사람, 원소 차례가 아닌 사람의 터치를 reducer가 무시하게 하기 위해서다.
- 라운드 생성(`makeRound`)이 다음을 반영하게 한다.
  - 미션 조건에 맞는 글자가 정답으로 자주 나오게 함
  - 단계에 따라 카드당 심볼 수를 늘림
- 엔진은 `coop/monster.ts`, `coop/defense.ts`, `coop/missions.ts`로 나누고, `modes/coop.ts`가 이들을 조합한다.
- 화면은 협동용 정보 칸 `CoopPanel`을 쓴다. 정보 칸은 일반 모드보다 크게(높이 0.2H) 잡는다.

**Tech Stack:** 지금과 같다 (Vite 6, React 18, TS 5, Vitest 3)

**Spec:** `docs/superpowers/specs/2026-11-09-dobble-game-design.md` (1.5 협동)

**범위 밖:**
- 혼자 하기의 "몬스터 사냥" 메뉴(5단계). 단, 협동 모드 자체는 1인으로도 시작할 수 있다.
- 몬스터 그림 파일. 이번에는 SVG로 그리고, 파일 경로만 남긴다.
- 이미지 세트(6단계)

## Global Constraints

- **하트**: 시작 3개, 최대 5개. 0이 되면 게임 오버다.
- **몬스터 체력**: `monsterHp(stage, players) = (8 + 4 × (stage − 1)) × players`. 1단계부터 시작한다.
- **공격 간격**: `attackEvery(stage) = max(8000, round(20000 × 0.9^(stage − 1)))` ms. 몬스터가 바뀔 때와 방어 챌린지가 끝날 때 다시 채운다.
- **정답 피해**: 정답 1개마다 몬스터에게 1. 같은 라운드에서 **모두가** 맞히면 합체 공격으로 인원수만큼 추가 피해를 준다(그 라운드 피해가 2배가 됨). 그다음 새 라운드로 넘어간다.
- **라운드 진행(전투 중)**: 맞힌 사람은 그 라운드에서 더 터치할 수 없다(`canTap` false). 라운드는 모두가 맞혀야 넘어간다.
- **오답**: 1500ms 잠금(기존 규칙)에 더해, 공격 타이머가 1500ms 줄어든다.
- **방어 챌린지**
  - 공격 타이머가 0이 되면 시작한다.
  - 종류는 무작위 50:50이다. 난수 시드는 `seed + stage × 7919 + 900001 + attackCount`.
  - 시작할 때 새 라운드로 바꾼다.
  - 챌린지 중에는 정답 피해가 없다. 맞힐 때마다 바로 새 라운드로 바뀐다.
  - 성공하면 몬스터에게 피해 3을 준다. 실패하면 하트 −1이다. 어느 쪽이든 끝나면 전투로 돌아가고 공격 타이머를 다시 채운다.
- **원소 순서 방어**
  - 원소는 0 불(🔥, #E24B4A), 1 물(💧, #378ADD), 2 풀(🌿, #639922), 3 번개(⚡, #EF9F27)다.
  - 원소 `e`의 주인은 `e % players`번 플레이어다.
  - 순서 길이는 `min(6, 3 + floor((stage − 1) / 2))`이고, 원소를 무작위로 뽑는다(연속 중복 허용).
  - 제한 시간은 `3000 + 2500 × 길이` ms.
  - 지금 차례 원소의 주인만 터치할 수 있다. 맞히면 다음 단계로 넘어가고, 길이만큼 맞히면 성공이다.
- **공동 목표 방어**
  - 목표는 `2 × players + (stage − 1)`개, 제한 시간은 10000ms다.
  - 누가 맞혀도 카운터가 +1 된다. 목표에 도달하면 바로 성공이다.
- **스테이지**
  - 몬스터 체력이 0이 되면 단계 +1이 되고, 새 몬스터, 새 미션, 새 라운드로 바뀐다.
  - 카드당 심볼 수는 `min(8, maxCardSize(pool), cardSize + (stage − 1))`이다(플레이어별).
- **미션**
  - 몬스터마다 하나씩 붙는다. 목표는 정답 3번이다.
  - 정답 글자가 미션 대상이면(누가 맞혀도) 진행도 +1이다. 전투와 챌린지 모두에서 센다.
  - 미션 종류
    - 글자 세트(받침 없음): `모음 {v}가 들어간 글자 3번 찾기` (pool의 모음 중 무작위)
    - 글자 세트(받침 있음): `받침 {f}가 있는 글자 3번 찾기` (pool의 받침 중 무작위)
    - 자음·알파벳·기타: `'{x}' 3번 찾기` (pool의 글자 중 무작위)
  - 보상(무작위 중 하나)
    - `heal`: 하트 +1 (최대 5)
    - `bonus`: 피해 5
    - `special` 필살기: 피해 `ceil(0.3 × 몬스터 최대 체력)`
  - 미션 시드: `seed + stage × 7919 + 800003`
  - 카드 생성: 미션 대상 글자가 중앙 카드에 없으면 0.6 확률로 중앙 카드의 무작위 한 장을 미션 대상으로 바꾼다. 그다음 기존 규칙대로 정답을 0.6 확률로 미션 대상에서 고른다.
- **결과**: `{stage − 1}마리 물리쳤어요`, 그리고 `{stage}단계까지 갔어요`.
- **정보 칸 크기(협동만)**: `computeTable(n, W, H, { tallHud: true })`
  - 정보 칸 높이 0.2H, 너비 0.2W
  - 3~4인: 가운데 줄 왼쪽·오른쪽(`y = H/2 − 0.1H`)
  - 1~2인: 지금과 같은 모서리
- 화면 문구
  - 경고: `공격 준비!`
  - 성공: `막았다!`
  - 실패: `아야!`

## Review Focus

1. **미션 대상 글자가 한 장뿐일 때** (받침 없는 글자 세트의 모음 미션 = 글자 1개): 미션을 완료할 수 있어야 한다. 중앙 카드에 끼워 넣는 규칙이 동작하는지 확인한다.
   → Task 4 테스트(300 시드 중 미션 대상이 정답으로 나오는 비율이 20% 이상)
2. **원소 순서 방어 중 차례가 아닌 사람의 터치**: 오답 잠금이나 공격 타이머 감소가 생기면 안 된다. 그냥 무시한다.
   → Task 3 테스트
3. **챌린지 마지막 순간의 처리 순서**: 제한 시간이 끝나는 TICK과 마지막 정답이 겹치면, 정답이 먼저 처리된 경우 성공이어야 한다. 실패와 성공이 동시에 일어나면 안 된다.
   → Task 3 테스트
4. **1인 협동**: 원소 4개를 모두 맡는다. 합체 공격은 매 정답마다 일어난다(모두 = 1명). 오답 잠금 중에도 공격 타이머는 계속 흐른다.
   → Task 2, Task 3 테스트
5. **챌린지 성공 피해로 몬스터가 쓰러질 때**: 단계가 올라가고, 전투가 새 몬스터 기준으로 시작되어야 한다.
   → Task 3 테스트

---

## File Structure

```
src/engine/state.ts           ModeId 'coop', Mode.canTap, GameState.coop, CoopState 타입, 새 이벤트
src/engine/reducer.ts         canTap 확인, makeRound(미션 우선·단계별 심볼 수), createGame(symbols)
src/engine/cardGen.ts         preferAnswer일 때 중앙 카드에 대상 끼워 넣기
src/engine/coop/monster.ts    monsterHp, attackEvery, applyDamage(단계 상승 포함)
src/engine/coop/defense.ts    startChallenge, challengeTap, tickChallenge, ELEMENTS
src/engine/coop/missions.ts   makeMission, missionProgress, applyReward
src/engine/modes/coop.ts      coop Mode
src/engine/seats.ts           computeTable 옵션 tallHud
src/engine/teams.ts           standings에 협동 항목
src/ui/components/CoopPanel.tsx  몬스터·체력·하트·타이머·미션·챌린지 표시
src/ui/components/Monster.tsx    단계별 색이 바뀌는 평면 SVG 몬스터
src/ui/components/SeatView.tsx   원소 아이콘, dim 상태
src/ui/screens/Game.tsx       협동 연결
src/ui/screens/Setup.tsx      kind 'coop'
src/ui/screens/Home.tsx       협동 버튼
src/ui/screens/Result.tsx     협동 결과
```

---

### Task 1: 협동용 엔진 기반

**Files:**
- Modify: `src/engine/state.ts`, `src/engine/reducer.ts`, `src/engine/modes/index.ts`, `src/engine/reducer.test.ts`, `src/engine/testConfig.ts`

**Interfaces:**
- Produces:
```ts
export type ModeId = 'soloSurvival' | 'score' | 'tower' | 'bomb' | 'coop';
export type ChallengeKind = 'elements' | 'quota';
export type RewardId = 'heal' | 'bonus' | 'special';
export interface Mission { text: string; ids: string[]; target: number; progress: number; reward: RewardId; done: boolean }
export interface Challenge {
  kind: ChallengeKind;
  timeLeft: number;
  sequence: number[];   // 원소 순서 (quota면 빈 배열)
  step: number;         // 원소 순서에서 지금 차례 위치
  target: number;       // quota 목표 (elements면 sequence.length)
  count: number;        // quota 진행 수
}
export interface CoopState {
  stage: number; hearts: number; hp: number; maxHp: number;
  attackLeft: number; attackCount: number;
  answered: boolean[];          // 이번 라운드에 맞힌 사람
  challenge: Challenge | null;
  mission: Mission;
}
// GameState에 추가
coop: CoopState | null;
// Mode에 추가
canTap?(s: GameState, player: number): boolean;
// GameEvent에 추가
| { type: 'damage'; amount: number; combo: boolean }
| { type: 'monsterDown'; stage: number }
| { type: 'heartLost' }
| { type: 'challengeStart'; kind: ChallengeKind }
| { type: 'challengeEnd'; success: boolean }
| { type: 'missionDone'; reward: RewardId };
// reducer.ts
export function makeRound(config: GameConfig, pool: string[], index: number, opts?: { preferIds?: string[]; sizeBonus?: number }): RoundState;
export function createGame(config: GameConfig, pool: string[], modes: ModeTable, symbols?: SymbolDef[]): GameState;
// Mode에 추가 (init은 그대로 둔다)
initCoop?(config: GameConfig, ctx: { pool: string[]; symbols: SymbolDef[] }): CoopState;
// createGame에 symbols가 없으면 pool id로 최소 SymbolDef를 만들어 넘긴다 (테스트 편의)
```
- reducer 규칙
  - `handleTap`의 무시 조건에 `mode.canTap?.(s, player) === false`를 추가한다.
  - 다음 라운드를 만들 때 `s.coop`이 있으면 다음 값을 넘긴다.
    - `preferIds = coop.mission.done ? undefined : coop.mission.ids`
    - `sizeBonus = coop.stage − 1`
  - `makeRound`는 `sizeBonus`만큼 카드당 심볼 수를 늘린다. 상한은 `min(8, maxCardSize(pool.length))`다.
  - `createGame`은 `mode.initCoop`가 있으면 `coop`을 채우고, 없으면 `coop: null`로 둔다.
  - 이 Task에서 `MODES.coop`은 임시로 `score`와 같은 객체로 두고, Task 2에서 바꾼다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('협동이 아닌 게임은 coop이 null이다', () => {
  expect(createGame(testConfig(), TEST_POOL, MODES).coop).toBeNull();
});
test('canTap이 false면 그 사람의 터치를 이벤트 없이 무시한다', () => {
  const blocked: Mode = { ...fake, canTap: (_s, p) => p !== 0 };
  const table: ModeTable = { ...modes, score: blocked };
  const g = createGame(cfg, pool, table);
  expect(reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, table).events).toEqual([]);
  expect(reduce(g, { type: 'TAP', player: 1, symbol: g.round.answers[1], round: 0 }, table).events[0].type).toBe('correct');
});
test('makeRound는 sizeBonus만큼 카드를 키우되 8과 pool 한도를 넘지 않는다', () => {
  const r = makeRound(testConfig({ players: [{ name: 'A', color: 'pink', cardSize: 5 }] }), TEST_POOL, 0, { sizeBonus: 2 });
  expect(r.cards[0]).toHaveLength(7);
  const big = makeRound(testConfig({ players: [{ name: 'A', color: 'pink', cardSize: 7 }] }), TEST_POOL, 0, { sizeBonus: 5 });
  expect(big.cards[0]).toHaveLength(8);
  const small = makeRound(testConfig({ players: [{ name: 'A', color: 'pink', cardSize: 5 }] }), TEST_POOL.slice(0, 13), 0, { sizeBonus: 5 });
  expect(small.cards[0]).toHaveLength(7);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다.** reducer 테스트의 `modes` 객체에 `coop: fake`를 추가한다.
- [ ] **Step 4: `npm test`와 `npx tsc -b`를 실행해 모두 통과하는지 확인한다**
- [ ] **Step 5: 커밋한다** (`refactor: engine hooks for coop mode`)

---

### Task 2: 몬스터와 협동 전투

**Files:**
- Create: `src/engine/coop/monster.ts`, `src/engine/modes/coop.ts`, `src/engine/modes/coop.test.ts`
- Modify: `src/engine/modes/index.ts`

**Interfaces:**
- Consumes: Task 1 타입·훅
- Produces:
```ts
// monster.ts
export const HEARTS_START = 3;
export const HEARTS_MAX = 5;
export const WRONG_PENALTY_MS = 1500;
export function monsterHp(stage: number, players: number): number;
export function attackEvery(stage: number): number;
/** 피해를 주고, 체력이 0이 되면 단계를 올려 새 몬스터·새 미션을 만든다 */
export function applyDamage(s: GameState, amount: number, combo: boolean): { state: GameState; events: GameEvent[] };
// coop.ts
export const coop: Mode;  // initCoop, canTap, onCorrect, onWrong, onTick, isOver
```
- 전투 규칙(챌린지가 없을 때)
  - `onCorrect`
    1. 맞힌 사람을 `answered`로 표시한다.
    2. `applyDamage(1, false)`
    3. 모두 맞혔으면 `applyDamage(players, true)`를 하고, `answered`를 초기화하고, `nextRound` true
    4. 아니면 `nextRound` false
  - 단계가 오르면 `answered`를 초기화하고 `nextRound` true다.
  - `onWrong`: `attackLeft −= 1500`
  - `onTick`: `attackLeft −= dt`. 0 이하가 되면 Task 3의 `startChallenge`를 부른다. 이 Task에서는 챌린지 시작을 하지 않고 `attackLeft`를 0에서 멈춘다(Task 3에서 연결).
  - `canTap`: 전투 중에는 `!answered[player]`
  - `isOver`: `hearts ≤ 0`
  - `initCoop`: 1단계 몬스터, 하트 3, 미션은 Task 4 전까지 `{ text: '', ids: [], target: 3, progress: 0, reward: 'heal', done: true }`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const coopCfg = (over: Partial<GameConfig> = {}) => testConfig({ mode: 'coop', ...over });
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);

test('몬스터 체력과 공격 간격 공식', () => {
  expect(monsterHp(1, 2)).toBe(16); expect(monsterHp(3, 1)).toBe(16);
  expect(attackEvery(1)).toBe(20000); expect(attackEvery(2)).toBe(18000); expect(attackEvery(30)).toBe(8000);
});
test('시작 상태: 하트 3, 1단계 몬스터, 공격 타이머 가득', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  expect(s.coop).toMatchObject({ stage: 1, hearts: 3, hp: 16, maxHp: 16, attackLeft: 20000, answered: [false, false], challenge: null });
});
test('한 명이 맞히면 피해 1, 라운드는 그대로이고 그 사람은 더 못 누른다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  const r = tap(s, 0);
  expect(r.state.coop!.hp).toBe(15);
  expect(r.state.round.index).toBe(0);
  expect(r.events).toContainEqual({ type: 'damage', amount: 1, combo: false });
  expect(tap(r.state, 0).events).toEqual([]);
});
test('모두 맞히면 합체 공격으로 인원수만큼 추가 피해, 새 라운드', () => {
  let s = createGame(coopCfg(), TEST_POOL, MODES);
  s = tap(s, 0).state;
  const r = tap(s, 1);
  expect(r.state.coop!.hp).toBe(16 - 4);
  expect(r.events).toContainEqual({ type: 'damage', amount: 2, combo: true });
  expect(r.state.round.index).toBe(1);
  expect(r.state.coop!.answered).toEqual([false, false]);
});
test('1인은 매 정답이 합체 공격이다', () => {
  const s = createGame(coopCfg({ players: [testConfig().players[0]] }), TEST_POOL, MODES);
  const r = tap(s, 0);
  expect(r.state.coop!.hp).toBe(8 - 2);
  expect(r.state.round.index).toBe(1);
});
test('오답이면 공격 타이머가 1500ms 줄어든다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  expect(reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: 0 }, MODES).state.coop!.attackLeft).toBe(18500);
});
test('몬스터를 쓰러뜨리면 2단계 몬스터가 나오고 카드가 1장 커진다', () => {
  let s = createGame(coopCfg({ players: [testConfig().players[0]] }), TEST_POOL, MODES);
  const events: string[] = [];
  for (let i = 0; i < 4; i++) { const r = tap(s, 0); s = r.state; r.events.forEach(e => events.push(e.type)); }
  expect(events).toContain('monsterDown');
  expect(s.coop).toMatchObject({ stage: 2, hp: monsterHp(2, 1), maxHp: monsterHp(2, 1), attackLeft: attackEvery(2) });
  expect(s.round.cards[0]).toHaveLength(6);
});
test('오답으로 잠겨 있는 동안에도 공격 타이머는 흐른다', () => {
  let s = createGame(coopCfg({ players: [testConfig().players[0]] }), TEST_POOL, MODES);
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: 0 }, MODES).state;
  s = reduce(s, { type: 'TICK', dt: 1000 }, MODES).state;
  expect(s.players[0].lockedUntil).toBeGreaterThan(s.now);
  expect(s.coop!.attackLeft).toBe(20000 - 1500 - 1000);
});
test('하트가 0이 되면 끝난다', () => {
  const s = createGame(coopCfg(), TEST_POOL, MODES);
  expect(coop.isOver({ ...s, coop: { ...s.coop!, hearts: 0 } })).toBe(true);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: coop monster combat`)

---

### Task 3: 방어 챌린지

**Files:**
- Create: `src/engine/coop/defense.ts`, `src/engine/coop/defense.test.ts`
- Modify: `src/engine/modes/coop.ts`

**Interfaces:**
- Produces:
```ts
export const ELEMENTS = [
  { icon: '🔥', name: '불', color: '#E24B4A' },
  { icon: '💧', name: '물', color: '#378ADD' },
  { icon: '🌿', name: '풀', color: '#639922' },
  { icon: '⚡', name: '번개', color: '#EF9F27' },
] as const;
export const QUOTA_MS = 10000;
export const CHALLENGE_DAMAGE = 3;
export function elementsOf(player: number, players: number): number[];  // 이 사람이 맡은 원소
export function startChallenge(s: GameState): { state: GameState; events: GameEvent[] };
export function challengeCanTap(s: GameState, player: number): boolean;
/** 챌린지 중 정답 처리. 끝나면 결과를 적용한다 */
export function challengeCorrect(s: GameState, player: number): { state: GameState; events: GameEvent[] };
export function tickChallenge(s: GameState, dt: number): { state: GameState; events: GameEvent[] };
```
- 규칙은 Global Constraints를 따른다.
  - 챌린지가 시작되면 `answered`를 초기화하고, 새 라운드를 만든다(coop의 `onTick`이 `nextRound`를 요청할 수 없으므로 `startChallenge`가 `round`를 직접 바꾸고 `round` 이벤트를 낸다).
  - 챌린지 중 정답은 `nextRound` true다(원소 단계·quota 모두).
  - 끝남(성공/실패) → `challengeEnd` 이벤트
    - 성공이면 `applyDamage(3)`, 실패면 하트 −1과 `heartLost` 이벤트
    - `challenge = null`, `attackLeft = attackEvery(stage)`, `attackCount += 1`
  - 챌린지 중 오답: 잠금만 걸고 타이머는 줄이지 않는다.
  - TICK에서는 정답이 이미 처리된 다음에 시간을 줄인다. 마지막 정답으로 성공하면 `challenge`가 null이 되므로, 같은 시각에 실패가 일어날 수 없다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const at = (s: GameState, kind: ChallengeKind): GameState => {
  // 원하는 종류가 나올 때까지 attackCount를 바꿔 가며 startChallenge를 호출해 찾는다
  for (let n = 0; n < 50; n++) {
    const r = startChallenge({ ...s, coop: { ...s.coop!, attackCount: n } });
    if (r.state.coop!.challenge!.kind === kind) return r.state;
  }
  throw new Error('kind not found');
};
const coop2 = () => createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES);
const tap = (s: GameState, p: number) => reduce(s, { type: 'TAP', player: p, symbol: s.round.answers[p], round: s.round.index }, MODES);

test('원소 주인: 2인이면 0번이 불·풀, 1번이 물·번개', () => {
  expect(elementsOf(0, 2)).toEqual([0, 2]); expect(elementsOf(1, 2)).toEqual([1, 3]);
  expect(elementsOf(0, 1)).toEqual([0, 1, 2, 3]);
});
test('공격 타이머가 0이 되면 챌린지가 시작되고 새 라운드가 된다', () => {
  const r = reduce(coop2(), { type: 'TICK', dt: 20000 }, MODES);
  expect(r.state.coop!.challenge).not.toBeNull();
  expect(r.events.map(e => e.type)).toEqual(expect.arrayContaining(['challengeStart', 'round']));
});
test('원소 순서: 차례인 사람만 누를 수 있고, 아닌 사람 터치는 잠금 없이 무시', () => {
  const s = at(coop2(), 'elements');
  const ch = s.coop!.challenge!;
  expect(ch.sequence).toHaveLength(3);
  expect(ch.timeLeft).toBe(3000 + 2500 * 3);
  const owner = ch.sequence[0] % 2, other = 1 - owner;
  const r = tap(s, other);
  expect(r.events).toEqual([]);
  expect(r.state.players[other].lockedUntil).toBe(0);
});
test('원소 순서를 끝까지 맞히면 성공: 피해 3, 타이머 리셋', () => {
  let s = at(coop2(), 'elements');
  const hp = s.coop!.hp;
  const events: GameEvent[] = [];
  for (const e of s.coop!.challenge!.sequence) { const r = tap(s, e % 2); s = r.state; events.push(...r.events); }
  expect(events).toContainEqual({ type: 'challengeEnd', success: true });
  expect(s.coop).toMatchObject({ challenge: null, hp: hp - 3, attackLeft: 20000 });
});
test('시간이 다 되면 실패: 하트 −1', () => {
  const s = at(coop2(), 'quota');
  const r = reduce(s, { type: 'TICK', dt: 10000 }, MODES);
  expect(r.events).toContainEqual({ type: 'challengeEnd', success: false });
  expect(r.events).toContainEqual({ type: 'heartLost' });
  expect(r.state.coop!.hearts).toBe(2);
});
test('공동 목표: 누가 맞혀도 카운트, 목표 도달 즉시 성공', () => {
  let s = at(coop2(), 'quota');
  expect(s.coop!.challenge!.target).toBe(4);
  for (let i = 0; i < 3; i++) s = tap(s, i % 2).state;
  expect(s.coop!.challenge!.count).toBe(3);
  const r = tap(s, 1);
  expect(r.events).toContainEqual({ type: 'challengeEnd', success: true });
});
test('마지막 정답 뒤에 남은 시간이 0이 되어도 실패하지 않는다', () => {
  let s = at(coop2(), 'quota');
  s = reduce(s, { type: 'TICK', dt: 9990 }, MODES).state;
  for (let i = 0; i < 4; i++) s = tap(s, i % 2).state;
  const r = reduce(s, { type: 'TICK', dt: 20 }, MODES);
  expect(r.events.filter(e => e.type === 'challengeEnd')).toEqual([]);
  expect(r.state.coop!.hearts).toBe(3);
});
test('챌린지 성공 피해로 몬스터가 쓰러지면 단계가 오른다', () => {
  const base = coop2();
  let s = at({ ...base, coop: { ...base.coop!, hp: 2 } }, 'quota');
  for (let i = 0; i < 4; i++) s = tap(s, i % 2).state;
  expect(s.coop).toMatchObject({ stage: 2, challenge: null });
});
test('챌린지 중 오답은 공격 타이머를 줄이지 않는다', () => {
  const s = at(coop2(), 'quota');
  const wrong = s.round.cards[0].find(id => id !== s.round.answers[0])!;
  const r = reduce(s, { type: 'TAP', player: 0, symbol: wrong, round: s.round.index }, MODES);
  expect(r.state.coop!.attackLeft).toBe(s.coop!.attackLeft);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현하고 `coop` 모드에 연결한다** (`onTick`, `onCorrect`, `onWrong`, `canTap`이 챌린지 중이면 defense 함수로 위임)
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: coop defense challenges`)

---

### Task 4: 학습 미션

**Files:**
- Create: `src/engine/coop/missions.ts`, `src/engine/coop/missions.test.ts`
- Modify: `src/engine/cardGen.ts`, `src/engine/cardGen.test.ts`, `src/engine/modes/coop.ts`, `src/engine/coop/monster.ts`(새 몬스터마다 새 미션)

**Interfaces:**
- Produces:
```ts
export const MISSION_TARGET = 3;
export const SPECIAL_RATIO = 0.3;
export const BONUS_DAMAGE = 5;
export function makeMission(config: GameConfig, symbols: SymbolDef[], stage: number): Mission;
/** 정답 글자가 미션 대상이면 진행도를 올리고, 완료되면 보상을 적용한다 */
export function missionProgress(s: GameState, symbol: string): { state: GameState; events: GameEvent[] };
export function applyReward(s: GameState, reward: RewardId): { state: GameState; events: GameEvent[] };
```
- `GameState`가 미션을 만들려면 심볼 정보가 필요하다. 그래서 `CoopState`에 `symbols: SymbolDef[]`를 추가한다. 새 몬스터가 나올 때 `makeMission`에 넘긴다.
- `generateRound`: `preferAnswer`가 있고 중앙 카드에 대상이 없으면 0.6 확률로 대상 하나(풀에서 무작위)를 중앙 카드의 무작위 칸에 넣는다. 정답 고르기는 기존 규칙과 같다.
- 정답이 처리될 때마다(전투·챌린지 공통) `missionProgress`를 호출한다. 이미 완료된 미션은 더 세지 않는다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const ko = syllableSymbols('ㄱ', false), koB = syllableSymbols('ㄱ', true), con = consonantSymbols(false);
test('받침 없는 글자 세트는 모음 미션', () => {
  const m = makeMission(testConfig({ set: { kind: 'syllable', initial: 'ㄱ', batchim: false } }), ko, 1);
  expect(m.text).toMatch(/^모음 .가 들어간 글자 3번 찾기$/);
  expect(m.ids.length).toBeGreaterThanOrEqual(1);
  expect(m).toMatchObject({ target: 3, progress: 0, done: false });
});
test('받침 있는 글자 세트는 받침 미션', () => {
  const m = makeMission(testConfig({ set: { kind: 'syllable', initial: 'ㄱ', batchim: true } }), koB, 1);
  expect(m.text).toMatch(/^받침 .가 있는 글자 3번 찾기$/);
  expect(m.ids).toHaveLength(6);
});
test('자음 세트는 글자 미션', () => {
  const m = makeMission(testConfig({ set: { kind: 'consonant', includeDouble: false } }), con, 1);
  expect(m.text).toMatch(/^'.' 3번 찾기$/);
  expect(m.ids).toHaveLength(1);
});
test('미션 대상이 한 장뿐이어도 정답으로 자주 나온다', () => {
  let hits = 0;
  for (let seed = 0; seed < 300; seed++) {
    const r = generateRound({ pool: TEST_POOL, playerSizes: [5, 5], preferAnswer: id => id === 's7', rng: createRng(seed) });
    if (r.answers.includes('s7')) hits++;
  }
  expect(hits).toBeGreaterThan(60);
});
test('미션 대상을 3번 맞히면 완료되고 보상이 적용된다', () => {
  let s = createGame(testConfig({ mode: 'coop', players: [testConfig().players[0]] }), ko.map(x => x.id), MODES, ko);
  const target = s.coop!.mission.ids[0];
  s = { ...s, coop: { ...s.coop!, mission: { ...s.coop!.mission, ids: [target], reward: 'heal' }, hearts: 2 } };
  let r = missionProgress(s, target); r = missionProgress(r.state, target); r = missionProgress(r.state, 'ko-s:없음');
  expect(r.state.coop!.mission.progress).toBe(2);
  r = missionProgress(r.state, target);
  expect(r.state.coop!.mission.done).toBe(true);
  expect(r.state.coop!.hearts).toBe(3);
  expect(r.events).toContainEqual({ type: 'missionDone', reward: 'heal' });
});
test('보상: 하트는 5를 넘지 않고, 필살기는 최대 체력의 30%', () => {
  const s = createGame(testConfig({ mode: 'coop' }), ko.map(x => x.id), MODES, ko);
  expect(applyReward({ ...s, coop: { ...s.coop!, hearts: 5 } }, 'heal').state.coop!.hearts).toBe(5);
  expect(applyReward(s, 'special').state.coop!.hp).toBe(16 - Math.ceil(16 * 0.3));
  expect(applyReward(s, 'bonus').state.coop!.hp).toBe(11);
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다.** Task 2 테스트의 임시 미션 기대값이 있으면 실제 미션 기준으로 고친다.
- [ ] **Step 5: 커밋한다** (`feat: coop learning missions`)

---

### Task 5: 협동용 정보 칸 배치

**Files:**
- Modify: `src/engine/seats.ts`, `src/engine/seats.test.ts`

**Interfaces:**
- Produces: `computeTable(playerCount, W, H, opts?: { tallHud?: boolean }): TableGeom`
- `tallHud`일 때 정보 칸은 `0.2W × 0.2H`다.
  - 3~4인: 왼쪽 `(0.02W, H/2 − 0.1H)`, 오른쪽은 대칭 위치
  - 1~2인: 왼쪽 아래 `(0.02W, H − 0.02H − 0.2H)`, 2인이면 오른쪽 위 `(W − 0.22W, 0.02H)`도 추가
- 정보 칸과 자리 영역이 겹치면 자리 영역을 0.95배씩 줄인다(`shrinkUntil` 조건에 포함).

- [ ] **Step 1: 실패하는 테스트를 작성한다.** 기존 `describe.each(VIEWPORTS)`에 `tallHud` 케이스를 추가한다.
```ts
test.each(COUNTS)('%i인 tallHud: 정보 칸이 0.2H 높이이고 자리·중앙 카드와 겹치지 않으며 글자 8개가 들어간다', n => {
  const t = computeTable(n, W, H, { tallHud: true });
  for (const h of t.hud) {
    expect(h.rect.h).toBeCloseTo(0.2 * H);
    expect(inside(W, H, h.rect)).toBe(true);
    expect(rectCircleDist(h.rect, t)).toBeGreaterThan(t.center.rx);
    for (const [x, y] of gridPoints(h.rect, 4)) expect(t.seats.some(s => pointInRegion(x, y, s.region))).toBe(false);
  }
  for (let seed = 0; seed < 10; seed++) for (const s of t.seats)
    expect(() => layoutSymbols({ region: s.region, exclusions: [s.badge], count: 8, rng: createRng(seed) })).not.toThrow();
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: tall hud layout for coop`)

---

### Task 6: 협동 화면 부품 (CoopPanel, Monster, 자리의 원소 표시)

**Files:**
- Create: `src/ui/components/CoopPanel.tsx`, `src/ui/components/Monster.tsx`, `src/ui/components/coop.test.tsx`
- Modify: `src/ui/components/SeatView.tsx`, `src/ui/theme/brutal.css`

**Interfaces:**
- Consumes: `CoopState`, `ELEMENTS`
- Produces:
```tsx
<CoopPanel coop={CoopState} attackEvery={number} banner={'공격 준비!' | '막았다!' | '아야!' | null} />
<Monster stage={number} size={number} />   // 단계마다 몸 색이 바뀌는 평면 SVG(검정 3px 외곽선, 눈 2개, 이빨)
// SeatView에 prop 추가
elements?: number[];   // 배지 옆에 원소 아이콘
dim?: boolean;         // 원소 순서에서 차례가 아니면 영역과 글자가 흐려짐(.is-dim, opacity .35)
hideScore?: boolean;   // 배지의 점수 숫자를 숨김 (협동)
```
- CoopPanel 내용(위에서 아래로)
  1. 몬스터 그림과 `{stage}단계`
  2. 체력 막대: 빨강 채움, `aria-label="몬스터 체력 {hp}/{maxHp}"`
  3. 하트: ❤️ × hearts, 🤍 × (3 − hearts가 0보다 크면). `aria-label="하트 {hearts}"`
  4. 공격 타이머 막대: `aria-label="공격까지 {초}초"`
  5. 미션 문구와 `{progress}/{target}`. 완료되면 `완료!`
  6. 챌린지 중이면
     - 원소 순서: 아이콘을 나열하고, 지난 단계는 흐리게, 지금 단계는 노란 테두리
     - 공동 목표: `{count}/{target}`과 남은 초
  7. `banner`가 있으면 맨 위에 크게 표시한다.
- 몬스터 색: 단계 순서대로 `['#A99BFF', '#7FDBFF', '#B8F26B', '#FFE14D', '#FF8FB8']`를 반복한다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
const base: CoopState = { stage: 2, hearts: 2, hp: 7, maxHp: 24, attackLeft: 9000, attackCount: 0, answered: [false, false],
  challenge: null, mission: { text: '모음 ㅗ가 들어간 글자 3번 찾기', ids: ['ko-s:고'], target: 3, progress: 1, reward: 'heal', done: false }, symbols: [] };

test('몬스터 체력, 하트, 공격 시간, 미션을 보여준다', () => {
  render(<CoopPanel coop={base} attackEvery={18000} banner={null} />);
  expect(screen.getByLabelText('몬스터 체력 7/24')).toBeInTheDocument();
  expect(screen.getByLabelText('하트 2')).toBeInTheDocument();
  expect(screen.getByLabelText('공격까지 9초')).toBeInTheDocument();
  expect(screen.getByText('모음 ㅗ가 들어간 글자 3번 찾기')).toBeInTheDocument();
  expect(screen.getByText('1/3')).toBeInTheDocument();
  expect(screen.getByText('2단계')).toBeInTheDocument();
});
test('원소 순서 챌린지는 지금 차례를 강조한다', () => {
  const coop = { ...base, challenge: { kind: 'elements' as const, timeLeft: 8000, sequence: [1, 0, 3], step: 1, target: 3, count: 0 } };
  render(<CoopPanel coop={coop} attackEvery={18000} banner="공격 준비!" />);
  const steps = screen.getAllByTestId('element-step');
  expect(steps).toHaveLength(3);
  expect(steps[1]).toHaveClass('is-current');
  expect(steps[0]).toHaveClass('is-done');
  expect(screen.getByText('공격 준비!')).toBeInTheDocument();
});
test('공동 목표 챌린지는 카운트를 보여준다', () => {
  const coop = { ...base, challenge: { kind: 'quota' as const, timeLeft: 6500, sequence: [], step: 0, target: 6, count: 2 } };
  render(<CoopPanel coop={coop} attackEvery={18000} banner={null} />);
  expect(screen.getByText('2/6')).toBeInTheDocument();
});
test('자리에 원소 아이콘과 흐림 상태를 표시한다', () => {
  render(<SeatView {...baseSeatProps} elements={[0, 2]} dim />);
  expect(screen.getByText('🔥')).toBeInTheDocument();
  expect(screen.getByText('🌿')).toBeInTheDocument();
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-dim');
});
```
  - `baseSeatProps`는 `components.test.tsx`의 `baseProps`와 같은 값을 이 파일에 정의한다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: coop panel, monster and element seats`)

---

### Task 7: 게임 화면에 협동 연결

**Files:**
- Modify: `src/ui/screens/Game.tsx`, `src/ui/screens/Game.test.tsx`

**Interfaces:**
- Consumes: Task 1~6
- 규칙
  - `config.mode === 'coop'`이면 `computeTable(n, W, H, { tallHud: true })`를 쓰고, 정보 칸에 `CoopPanel`을 넣는다.
  - `createGame`에 `symbols`를 넘긴다.
  - SeatView에 넘기는 값
    - `elements = elementsOf(i, n)`
    - `dim`: 원소 챌린지 중이고 내가 차례가 아닐 때, 또는 전투 중 이번 라운드에 이미 맞혔을 때
  - 협동에는 개인 점수가 없으므로 배지에 숫자를 보여주지 않는다. SeatView에 `hideScore?: boolean` prop을 추가해 `true`로 넘긴다(Task 6에서 추가). 배지에는 2인 이하일 때 이름, 그리고 원소 아이콘만 들어간다.
  - 배너
    - `challengeStart` 이벤트에 `공격 준비!`를 1200ms 동안 띄운다.
    - `challengeEnd`에 성공이면 `막았다!`, 실패면 `아야!`를 1200ms 동안 띄운다.
    - 배너 타이머도 화면을 떠날 때 정리한다.
  - 정답 강조(0.4초 멈춤)는 협동에서도 그대로 쓴다. 전투 중에 라운드가 안 바뀌는 정답은 강조하지 않고, 맞힌 자리만 흐려진다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('협동: 한 명이 맞히면 몬스터 체력이 줄고 그 자리가 흐려진다', () => {
  const cfg = testConfig({ mode: 'coop' });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByLabelText('몬스터 체력 16/16').length).toBeGreaterThan(0);
  tapSeat(0, createGame(cfg, pool21, MODES, symbols).round.answers[0]);
  expect(screen.getAllByLabelText('몬스터 체력 15/16').length).toBeGreaterThan(0);
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-dim');
});
test('협동: 공격 시간이 다 되면 공격 준비! 배너와 챌린지가 나온다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    render(<Game config={testConfig({ mode: 'coop' })} symbols={symbols} onOver={() => {}} />);
    act(() => { vi.advanceTimersByTime(20200); });
    expect(screen.getAllByText('공격 준비!').length).toBeGreaterThan(0);
  } finally { vi.useRealTimers(); }
});
test('협동 1인: 정보 칸 하나와 원소 4개', () => {
  render(<Game config={testConfig({ mode: 'coop', players: [testConfig().players[0]] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByLabelText(/몬스터 체력/)).toHaveLength(1);
  ['🔥', '💧', '🌿', '⚡'].forEach(icon => expect(within(screen.getByTestId('seat-0')).getByText(icon)).toBeInTheDocument());
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: wire coop into game screen`)

---

### Task 8: 설정·홈·결과

**Files:**
- Modify: `src/ui/screens/Setup.tsx`, `src/ui/screens/Setup.test.tsx`, `src/ui/screens/Home.tsx`, `src/ui/screens/Result.tsx`, `src/ui/screens/Result.test.tsx`, `src/engine/teams.ts`, `src/engine/teams.test.ts`, `src/App.test.tsx`

**Interfaces:**
- `SetupKind`에 `'coop'`을 추가한다.
  - 제목은 `협동`, 인원 1~4명(기본 2)이다.
  - 대결 방식, 덧붙는 요소, 라운드 수는 보여주지 않는다.
  - 설정 값: `mode: 'coop'`, `rules: NO_RULES`, `teams: null`
- 홈에 `협동` 버튼을 추가한다(배경 연두 #B8F26B).
- `standings`(협동): `[{ rank: 1, label: '우리 팀', players: 전원, value: stage, winner: true, bomb: false }]`
- 결과 화면(협동)
  - 큰 글씨로 `{stage − 1}마리 물리쳤어요`
  - 그 아래 `{stage}단계까지 갔어요`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
// Setup.test.tsx
test('협동은 1~4명이고 대결 방식이 없다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="coop" onStart={onStart} onBack={() => {}} />);
  await waitLoaded();
  expect(screen.getByRole('heading', { name: '협동' })).toBeInTheDocument();
  expect(within(screen.getByRole('group', { name: '인원' })).getAllByRole('radio')).toHaveLength(4);
  expect(screen.queryByRole('group', { name: '대결 방식' })).not.toBeInTheDocument();
  expect(await startWith(onStart)).toMatchObject({ mode: 'coop', teams: null, rules: { combo: false, finalRound: false, items: false } });
});
// teams.test.ts
test('협동 순위는 우리 팀 하나이고 값은 단계', () => {
  const s = createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES);
  expect(standings({ ...s, coop: { ...s.coop!, stage: 4 } })).toEqual([
    { rank: 1, label: '우리 팀', players: [0, 1], value: 4, winner: true, bomb: false },
  ]);
});
// Result.test.tsx
test('협동 결과는 물리친 몬스터 수와 단계를 보여준다', () => {
  const s = createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES);
  show({ ...s, coop: { ...s.coop!, stage: 4 } });
  expect(screen.getByText('3마리 물리쳤어요')).toBeInTheDocument();
  expect(screen.getByText('4단계까지 갔어요')).toBeInTheDocument();
});
// App.test.tsx
test('협동 → 협동 설정 화면', async () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '협동' }));
  expect(screen.getByRole('heading', { name: '협동' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).not.toHaveAttribute('max', '3'));
});
```
- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: `npm test`, `npx tsc -b`, `npm run build`를 모두 통과하는지 확인한다**
- [ ] **Step 5: 실제 화면을 확인한다.** 서비스 워커와 캐시를 지운 뒤 확인한다.
  - 1024×768 협동 2인
    - 전투: 맞힌 자리가 흐려지고, 합체 공격 후 새 라운드
    - 20초 뒤 `공격 준비!`와 챌린지
    - 원소 순서 진행
    - 미션 문구
  - 960×600 협동 4인
    - 정보 칸이 자리와 겹치지 않는지
  - 하트를 다 잃었을 때 결과 화면(콘솔로 하트 상태를 직접 조작하지 말고, 챌린지를 3번 실패시켜 확인)
  - 각 화면의 스크린샷을 남긴다.
- [ ] **Step 6: 커밋한다** (`feat: coop setup, home and result`)
