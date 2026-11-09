# 도블 게임 1~2단계(기반 + 핵심 플레이) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 태블릿에서 혼자 하기(서바이벌)와 경쟁(점수제)을 1~4인으로 플레이할 수 있는 PWA를 만든다. 심볼 세트는 한글 자음, 초성 음절, 알파벳을 지원한다.

**Architecture:**
- 순수 TypeScript 엔진: 시드 난수, 카드 생성, 배치, 자리 계산, reducer, 모드.
- React UI: 엔진 상태를 그리고, 터치를 `Action`으로 바꿔 엔진에 넘긴다.
- 시간은 `TICK(dt)` 행동으로만 흐르고, 같은 시드를 넣으면 같은 결과가 나온다.

**Tech Stack:** Vite 6, React 18, TypeScript 5, Vitest 2 + @testing-library/react + jsdom, vite-plugin-pwa, @fontsource/jua, @fontsource/fredoka

**Spec:** `docs/superpowers/specs/2026-11-09-dobble-game-design.md`

**이번 범위:** 설계서 4장의 1단계와 2단계. 다음은 이후 계획서에서 다룬다.
- 3단계(경쟁 확장): 탑 쌓기, 폭탄 돌리기, 콤보, 막판 3배, 아이템, 팀 경쟁, 플레이어별 난이도 설정 화면
- 4단계: 협동
- 5단계: 혼자 하기 확장
- 6단계: 이미지

## Global Constraints

- 태블릿 가로 화면, 한 기기 공유, 서버 없음, 오프라인 동작(PWA)
- 카드당 심볼 수 3~8, 세트의 최소 심볼 수 = `카드당 심볼 수 × 2 − 1`
- 오답 시 그 플레이어만 1500ms 동안 터치 잠금
- 중앙 카드 회전: 라운드마다 `rotationStep`(기본 90, 선택 180)만큼 회전
- 글자 배치
  - 영역 경계에서 안쪽으로 8px 이상 떨어진다(`inset`).
  - 글자끼리 간격은 8px 이상이다(`minGap`).
  - 목표 채움 비율은 0.7, 크기 비율은 0.6~1.4, 최소 크기는 44px이다.
  - 자리를 찾지 못하면 기준 크기를 5%씩 줄인다.
- 서바이벌: 30000ms로 시작, 정답 +1000ms, 오답 −2000ms
- 디자인(네오브루탈리즘)
  - 배경은 크림 #FFF4D6 단색, 장식 없음
  - 영역에 검정 4px 테두리
  - 그림자 = #2B2B2B 75% + 영역색 25%, `0 0 0 6px rgba(c,.35), 0 0 14px 6px rgba(c,.25)`
  - 정보 칸은 흰 바탕에 검정 3px 테두리
  - 점수 배지는 영역색으로 칠하고, 영역 테두리에 걸친다
- 자리 색: 핑크 #FF8FB8, 하늘 #7FDBFF, 노랑 #FFE14D, 연두 #B8F26B, 보라 #A99BFF. 중앙 카드는 흰색
- 폰트: 한글 Jua, 알파벳 Fredoka. 글자색은 검정 #111
- UI 문구는 한국어로 쓴다.
- 테스트 대상 화면 크기(CSS px): 1024×768, 1280×800, 1180×820, 960×600

## Review Focus

1. **알파벳 섞기의 닮은꼴 글자**: c/C, o/O처럼 크기만 다르고 모양이 같은 글자가 있다. 글자 크기가 다양하기 때문에 크기로는 구분할 수 없다. 섞기 모드에서는 소문자 `c o s u v w x z`를 빼서 44개로 만든다. → Task 4 테스트
2. **라운드가 바뀐 직후의 터치**: 두 사람이 거의 동시에 정답을 누르면, 두 번째 터치는 이미 새 라운드에 도착한다. 이 터치를 오답으로 처리하면 안 되고 무시해야 한다. → Task 8 테스트(`TAP`에 `round` 번호를 포함)
3. **잠금 중 터치**: 잠겨 있는 동안 누른 터치는 무시하고, 잠금 시간을 늘리지도 않는다. → Task 8 테스트
4. **작은 화면이나 비율이 다른 태블릿**: 960×600에서도 4인 모든 자리와 중앙 카드에 8개 심볼이 44px 이상으로 배치되어야 한다. → Task 7 통합 테스트
5. **백그라운드 탭에서 돌아왔을 때**: 탭이 숨겨졌다 돌아오면 `requestAnimationFrame`의 dt가 수 초로 튄다. 그대로 쓰면 서바이벌 시간이 한 번에 사라지므로 dt를 100ms로 제한한다. → Task 12 테스트

---

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html, .gitignore
src/main.tsx, src/App.tsx
src/content/types.ts        Symbol, SymbolSet, SetConfig
src/content/hangul.ts       consonantSet, syllableSet
src/content/alphabet.ts     alphabetSet
src/content/registry.ts     createSymbolSet, minPoolSize, maxCardSize
src/engine/rng.ts           createRng
src/engine/geometry.ts      Rect, Ellipse, Region, 포함·겹침 판정, 면적 추정
src/engine/layout.ts        layoutSymbols, LayoutError
src/engine/seats.ts         computeTable, shadowColor, SEAT_COLORS
src/engine/cardGen.ts       generateRound, PoolTooSmallError
src/engine/state.ts         GameConfig, GameState, Action, GameEvent, Mode
src/engine/reducer.ts       createGame, reduce
src/engine/modes/soloSurvival.ts
src/engine/modes/score.ts
src/engine/controller.ts    GameController (rAF 루프, 구독)
src/services/speech.ts      speak
src/ui/theme/brutal.css
src/ui/components/Glyph.tsx, SeatView.tsx, CenterCard.tsx, Hud.tsx
src/ui/screens/Home.tsx, Setup.tsx, Game.tsx, Result.tsx
```

테스트는 같은 폴더에 `*.test.ts(x)`로 둔다.

---

### Task 1: 프로젝트 세팅

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/App.test.tsx`, `src/test-setup.ts`

**Interfaces:**
- Produces: `npm test`(vitest run), `npm run dev`, `npm run build`, 테스트 환경 jsdom

- [ ] **Step 1: 저장소를 만들고 기존 설계서를 첫 커밋으로 남긴다**

```bash
git init
git add docs
git commit -m "docs: add game design spec and phase 1-2 plan"
```

- [ ] **Step 2: 패키지를 설치한다**

```bash
npm init -y
npm install react@18 react-dom@18 @fontsource/jua @fontsource/fredoka
npm install -D vite@6 @vitejs/plugin-react typescript@5 @types/react@18 @types/react-dom@18 vitest@2 jsdom @testing-library/react @testing-library/jest-dom vite-plugin-pwa
```

- [ ] **Step 3: 설정 파일을 작성한다**
  - `package.json` scripts: `dev: vite`, `build: tsc -b && vite build`, `preview: vite preview`, `test: vitest run`
  - `vite.config.ts`: react 플러그인, `test: { environment: 'jsdom', setupFiles: ['src/test-setup.ts'] }`
  - `src/test-setup.ts`: `import '@testing-library/jest-dom'`
  - `tsconfig.json`: `strict: true`, `jsx: react-jsx`, `types: ["vitest/globals"]`
  - `index.html`: `<html lang="ko">`, viewport `width=device-width, initial-scale=1, user-scalable=no`, `#root`
  - `.gitignore`: `node_modules`, `dist`

- [ ] **Step 4: 실패하는 테스트를 작성한다**

```tsx
// src/App.test.tsx
import { render, screen } from '@testing-library/react';
import App from './App';
test('홈 화면 제목을 보여준다', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: '도블 놀이' })).toBeInTheDocument();
});
```

- [ ] **Step 5: `npm test`를 실행해 실패를 확인한다** (Expected: FAIL, `./App`을 찾지 못함)

- [ ] **Step 6: `src/App.tsx`를 만든다.** 지금은 `<h1>도블 놀이</h1>`만 반환한다. `src/main.tsx`는 `createRoot`로 렌더한다.

- [ ] **Step 7: `npm test`와 `npm run build`를 실행해 둘 다 통과하는지 확인한다**

- [ ] **Step 8: 커밋한다**

```bash
git add -A
git commit -m "chore: scaffold vite react ts app with vitest"
```

---

### Task 2: 시드 난수

**Files:**
- Create: `src/engine/rng.ts`, `src/engine/rng.test.ts`

**Interfaces:**
- Produces:
```ts
export interface Rng {
  next(): number;                          // [0,1)
  int(min: number, max: number): number;   // min 이상 max 이하 정수
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];    // 새 배열을 반환
  sample<T>(items: readonly T[], n: number): T[]; // 중복 없이 n개
}
export function createRng(seed: number): Rng;
```

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('같은 시드는 같은 수열을 만든다', () => {
  const a = createRng(42), b = createRng(42);
  expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
});
test('시드가 다르면 수열도 다르다', () => {
  expect(createRng(1).next()).not.toEqual(createRng(2).next());
});
test('int는 경계값을 포함한다', () => {
  const r = createRng(7); const seen = new Set<number>();
  for (let i = 0; i < 500; i++) seen.add(r.int(1, 3));
  expect([...seen].sort()).toEqual([1, 2, 3]);
});
test('sample은 중복 없이 n개를 뽑는다', () => {
  const s = createRng(3).sample([1, 2, 3, 4, 5, 6], 4);
  expect(new Set(s).size).toBe(4);
});
test('sample은 n이 원소 수보다 크면 예외를 던진다', () => {
  expect(() => createRng(3).sample([1, 2], 3)).toThrow();
});
```

- [ ] **Step 2: `npx vitest run src/engine/rng.test.ts`를 실행해 실패를 확인한다**
- [ ] **Step 3: mulberry32로 `createRng`를 구현한다.** `shuffle`은 Fisher–Yates로 하고, `sample`은 `shuffle` 결과의 앞 n개를 쓴다.
- [ ] **Step 4: 테스트를 다시 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: seeded rng`)

---

### Task 3: 한글 심볼 세트

**Files:**
- Create: `src/content/types.ts`, `src/content/hangul.ts`, `src/content/hangul.test.ts`

**Interfaces:**
- Produces:
```ts
// types.ts
export interface SymbolDef {
  id: string;
  display: { kind: 'text'; value: string } | { kind: 'image'; src: string };
  speech: string;
  lang: 'ko-KR' | 'en-US';
  tags: { initial?: string; vowel?: string; batchim?: boolean; final?: string };
}
export interface SymbolSet { id: string; name: string; loadSymbols(): Promise<SymbolDef[]> }
export type SetConfig =
  | { kind: 'consonant'; includeDouble: boolean }
  | { kind: 'syllable'; initial: string; batchim: boolean }
  | { kind: 'alphabet'; letterCase: 'upper' | 'lower' | 'mixed' };

// hangul.ts
export const INITIALS: readonly string[];          // 19개, 유니코드 초성 순서
export const BASIC_CONSONANTS: readonly string[];  // ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ
export function consonantSymbols(includeDouble: boolean): SymbolDef[];
export function syllableSymbols(initial: string, batchim: boolean): SymbolDef[];
```
- 결정 사항
  - id 형식: 자음은 `ko-c:ㄱ`, 음절은 `ko-s:가`
  - 자음의 `speech`는 이름이다: 기역, 쌍기역, 니은, 디귿, 쌍디귿, 리을, 미음, 비읍, 쌍비읍, 시옷, 쌍시옷, 이응, 지읒, 쌍지읒, 치읓, 키읔, 티읕, 피읖, 히읗
  - 음절의 `speech`는 그 글자 자체다.
  - **받침 없음** (`batchim: false`): 모음 21개 전부 → 21개
  - **받침 있음** (`batchim: true`): 받침이 있는 음절만 만든다. 모음 6개(ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ) × 대표 받침 7개(ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅇ) → 42개
  - 음절 코드: `0xAC00 + (초성 * 21 + 중성) * 28 + 종성`. 종성 인덱스는 ㄱ=1, ㄴ=4, ㄷ=7, ㄹ=8, ㅁ=16, ㅂ=17, ㅇ=21이다.
  - `tags`: `initial`(초성 문자), `vowel`(중성 문자), `batchim`, `final`(받침 문자)

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('기본 자음 14개, 쌍자음 포함 19개', () => {
  expect(consonantSymbols(false)).toHaveLength(14);
  expect(consonantSymbols(true)).toHaveLength(19);
  expect(consonantSymbols(false)[0]).toMatchObject({ id: 'ko-c:ㄱ', speech: '기역', lang: 'ko-KR' });
});
test('받침 없는 ㄱ 음절은 가부터 기까지 21개', () => {
  const s = syllableSymbols('ㄱ', false);
  expect(s).toHaveLength(21);
  expect(s[0].display).toEqual({ kind: 'text', value: '가' });
  expect(s[20].display).toEqual({ kind: 'text', value: '기' });
  expect(s.find(x => x.tags.vowel === 'ㅗ')!.display).toEqual({ kind: 'text', value: '고' });
});
test('받침 있는 ㄱ 음절은 42개이고 모두 받침이 있다', () => {
  const s = syllableSymbols('ㄱ', true);
  expect(s).toHaveLength(42);
  expect(s.every(x => x.tags.batchim)).toBe(true);
  expect(s.map(x => (x.display as { value: string }).value)).toContain('각');
  expect(s.map(x => (x.display as { value: string }).value)).toContain('공');
});
test('쌍자음 초성도 동작한다', () => {
  expect(syllableSymbols('ㄲ', false)[0].display).toEqual({ kind: 'text', value: '까' });
});
test('id는 세트 안에서 중복되지 않는다', () => {
  const s = syllableSymbols('ㅎ', true);
  expect(new Set(s.map(x => x.id)).size).toBe(s.length);
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: `types.ts`와 `hangul.ts`를 위 인터페이스대로 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: hangul symbol sets`)

---

### Task 4: 알파벳 세트와 세트 레지스트리

**Files:**
- Create: `src/content/alphabet.ts`, `src/content/registry.ts`, `src/content/alphabet.test.ts`, `src/content/registry.test.ts`

**Interfaces:**
- Consumes: `SymbolDef`, `SymbolSet`, `SetConfig`(Task 3)
- Produces:
```ts
export const LOOKALIKE_LOWER = ['c','o','s','u','v','w','x','z'] as const;
export function alphabetSymbols(letterCase: 'upper'|'lower'|'mixed'): SymbolDef[];
// registry.ts
export function createSymbolSet(config: SetConfig): SymbolSet;  // id는 config를 직렬화해 만든다
export function minPoolSize(cardSize: number): number;           // cardSize * 2 - 1
export function maxCardSize(poolSize: number): number;           // 3~8 범위에서 가능한 최대값, 불가능하면 0
```
- 결정 사항: 알파벳 id는 `en:A` / `en:a` 형식이다. `speech`는 글자 자체이고 `lang`은 `en-US`다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('대문자 26, 소문자 26, 섞기 44', () => {
  expect(alphabetSymbols('upper')).toHaveLength(26);
  expect(alphabetSymbols('lower')).toHaveLength(26);
  expect(alphabetSymbols('mixed')).toHaveLength(44);
});
test('섞기에서는 대문자와 모양이 같은 소문자를 뺀다', () => {
  const values = alphabetSymbols('mixed').map(s => (s.display as { value: string }).value);
  for (const c of LOOKALIKE_LOWER) expect(values).not.toContain(c);
  expect(values).toContain('a'); expect(values).toContain('C');
});
test('minPoolSize와 maxCardSize', () => {
  expect(minPoolSize(3)).toBe(5); expect(minPoolSize(8)).toBe(15);
  expect(maxCardSize(14)).toBe(7); expect(maxCardSize(15)).toBe(8);
  expect(maxCardSize(4)).toBe(0);
});
test('createSymbolSet은 설정에 맞는 세트를 불러온다', async () => {
  const set = createSymbolSet({ kind: 'syllable', initial: 'ㄴ', batchim: false });
  expect(await set.loadSymbols()).toHaveLength(21);
  expect(set.name).toBe('ㄴ 글자');
});
```
- 세트 이름: 자음은 `자음` 또는 `자음+쌍자음`, 음절은 `{초성} 글자` 또는 `{초성} 받침 글자`, 알파벳은 `대문자`, `소문자`, `대소문자`

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: alphabet set and set registry`)

---

### Task 5: 라운드 카드 생성

**Files:**
- Create: `src/engine/cardGen.ts`, `src/engine/cardGen.test.ts`

**Interfaces:**
- Consumes: `Rng`(Task 2)
- Produces:
```ts
export interface RoundCards { center: string[]; playerCards: string[][]; answers: string[] }
export class PoolTooSmallError extends Error {}
export function generateRound(opts: {
  pool: readonly string[];          // 심볼 id 목록
  playerSizes: readonly number[];   // 플레이어별 카드당 심볼 수 (3~8)
  preferAnswer?: (id: string) => boolean;  // 4단계 미션용. 이번 단계에서는 시그니처만 둔다
  rng: Rng;
}): RoundCards;
```
- 알고리즘
  1. `centerSize = max(playerSizes)`로 정하고, `pool.length < centerSize + max(playerSizes) - 1`이면 `PoolTooSmallError`를 던진다.
  2. 중앙 카드 = `pool`에서 `centerSize`개를 뽑는다.
  3. 정답
     - 인원 ≤ `centerSize`이면 중앙 카드에서 중복 없이 인원수만큼 뽑는다.
     - 인원 > `centerSize`이면 중복을 허용해 고른다.
     - `preferAnswer`가 있고 조건에 맞는 후보가 있으면 각 정답을 60% 확률로 그 후보 중에서 고른다.
  4. 플레이어 카드 = 정답 + (`pool − 중앙 카드`에서 `size − 1`개)를 섞는다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);
test('1000개 시드에서 모든 플레이어 카드는 중앙 카드와 정확히 1개만 겹친다', () => {
  for (let seed = 0; seed < 1000; seed++) {
    const r = generateRound({ pool, playerSizes: [3, 5, 8, 6], rng: createRng(seed) });
    expect(r.center).toHaveLength(8);
    r.playerCards.forEach((card, i) => {
      expect(card).toHaveLength([3, 5, 8, 6][i]);
      expect(new Set(card).size).toBe(card.length);
      const common = card.filter(id => r.center.includes(id));
      expect(common).toEqual([r.answers[i]]);
    });
    expect(new Set(r.answers).size).toBe(4);
  }
});
test('심볼이 부족하면 PoolTooSmallError를 던진다', () => {
  expect(() => generateRound({ pool: pool.slice(0, 14), playerSizes: [8], rng: createRng(1) }))
    .toThrow(PoolTooSmallError);
  expect(() => generateRound({ pool: pool.slice(0, 15), playerSizes: [8], rng: createRng(1) }))
    .not.toThrow();
});
test('preferAnswer에 맞는 정답이 더 자주 나온다', () => {
  let hits = 0;
  for (let seed = 0; seed < 500; seed++) {
    const r = generateRound({ pool, playerSizes: [4], preferAnswer: id => id === 's0' || id === 's1', rng: createRng(seed) });
    if (r.answers[0] === 's0' || r.answers[0] === 's1') hits++;
  }
  expect(hits).toBeGreaterThan(100);
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: round card generator`)

---

### Task 6: 기하 계산과 심볼 배치

**Files:**
- Create: `src/engine/geometry.ts`, `src/engine/layout.ts`, `src/engine/geometry.test.ts`, `src/engine/layout.test.ts`

**Interfaces:**
- Consumes: `Rng`
- Produces:
```ts
// geometry.ts
export interface Rect { x: number; y: number; w: number; h: number }
export interface Ellipse { cx: number; cy: number; rx: number; ry: number }
export interface Region { ellipse: Ellipse; clip: Rect }  // 타원 ∩ clip 사각형
export function rectInRegion(r: Rect, region: Region, inset: number): boolean;
export function rectsGap(a: Rect, b: Rect): number;  // 두 사각형 사이 거리. 겹치면 음수
export function regionArea(region: Region, exclusions: readonly Rect[], step?: number): number; // 격자 샘플링, 기본 step 4

// layout.ts
export interface Placement { x: number; y: number; size: number; rotation: number } // x,y는 중심, size는 정사각 상자 한 변
export class LayoutError extends Error {}
export function layoutSymbols(opts: {
  region: Region; exclusions: readonly Rect[]; count: number;
  sizeRange?: [number, number];  // 기본 [0.6, 1.4]
  minGap?: number;     // 기본 8
  inset?: number;      // 기본 8
  targetFill?: number; // 기본 0.7
  minSize?: number;    // 기본 44
  rotate?: boolean;    // 기본 false. true면 회전 각도는 0~359 무작위, 충돌 판정은 size×1.42 상자로 한다
  rng: Rng;
}): Placement[];
```
- 결정 사항
  - **`inset` 판정**: 상자의 네 꼭짓점이 반지름을 `inset`만큼 줄인 타원 안에 있고, 상자가 `clip`을 `inset`만큼 줄인 사각형 안에 있어야 한다.
  - **배치 알고리즘**
    1. 크기 비율을 `count`개 무작위로 정하고 큰 것부터 정렬한다.
    2. `base = sqrt(targetFill × regionArea / Σ비율²)`로 기준 크기를 정한다.
    3. 각 글자마다 영역 경계 상자 안에서 후보 위치를 최대 400번 무작위로 시도한다. `inset`, `minGap`(이미 놓인 글자와 `exclusions` 모두), 영역 포함 조건을 확인한다.
    4. 한 글자라도 실패하면 `base *= 0.95` 하고 처음부터 다시 배치한다.
    5. 각 크기는 `max(minSize, 비율 × base)`로 한다. 모든 크기가 `minSize`인 상태에서 20번 연속 실패하면 `LayoutError`를 던진다.

- [ ] **Step 1: 기하 함수의 실패하는 테스트를 작성한다**

```ts
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
```

- [ ] **Step 2: 배치 함수의 실패하는 테스트를 작성한다**

```ts
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
```

- [ ] **Step 3: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 4: `geometry.ts`와 `layout.ts`를 구현한다**
- [ ] **Step 5: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 6: 커밋한다** (`feat: geometry and symbol layout`)

---

### Task 7: 자리 계산(테이블 배치)

**Files:**
- Create: `src/engine/seats.ts`, `src/engine/seats.test.ts`

**Interfaces:**
- Consumes: `Region`, `Rect`, `Ellipse`, `regionArea`, `layoutSymbols`(Task 6)
- Produces:
```ts
export const SEAT_COLORS = { pink: '#FF8FB8', sky: '#7FDBFF', yellow: '#FFE14D', lime: '#B8F26B', purple: '#A99BFF' } as const;
export type SeatColor = keyof typeof SEAT_COLORS;
export function shadowColor(hex: string): string;  // '#2B2B2B' 75% + hex 25%를 'r,g,b'로. 예: '#FF8FB8' → '96,68,78'
export interface SeatGeom { index: number; region: Region; facing: 0 | 180; badge: Rect }
export interface TableGeom {
  center: Ellipse;  // rx === ry
  seats: SeatGeom[];
  hud: { rect: Rect; facing: 0 | 180 }[];  // 공용 정보 칸
}
export function computeTable(playerCount: 1 | 2 | 3 | 4, W: number, H: number): TableGeom;
```
- 수치 (모두 W, H에 대한 비율)
  - **중앙 카드**: `(W/2, H/2)`, 반지름 `R0 = 0.22 × min(W,H)`
  - **정보 칸 높이**: `hudH = 0.075H`
  - **1인과 2인**
    - 원 반지름 `r`은 `0.40H`에서 시작한다.
    - 아래 자리: 중심 `(W − 0.94r, H)`, `facing 0`
    - 위 자리(2인만): 중심 `(0.94r, 0)`, `facing 180`
    - 중앙 카드와의 간격(`중심 거리 − r − R0`)이 `0.2R0` 이상이 될 때까지 `r *= 0.95`를 반복한다.
    - 점수 배지: 크기 `0.11W × hudH`. 아래 자리는 원 중심에서 `(−cos20°, −sin20°)` 방향으로 r만큼 간 점에 배지 중심을 둔다. 위 자리는 그 반대 방향.
    - 공용 정보 칸: `(0.02W, H − 0.02H − hudH, 0.16W, hudH)`, `facing 0`. 2인일 때는 반대쪽 모서리에 하나 더 둔다(`facing 180`).
  - **3인과 4인**
    - 타원 `rx = 0.30W`, `ry = 0.29H`. 모서리에서 `(rx/3, ry/3)`만큼 안쪽으로 중심을 둔다.
    - 자리 순서: 0 = 왼쪽 아래, 1 = 오른쪽 아래, 2 = 오른쪽 위, 3 = 왼쪽 위. 3인은 0, 1, 3을 쓴다. 위쪽 자리는 `facing 180`.
    - 타원끼리 겹치지 않고 중앙 카드와의 간격이 `0.2R0` 이상이 될 때까지 `rx`, `ry`를 함께 0.95배씩 줄인다.
    - 점수 배지: 크기 `0.07W × hudH`. 중심은 화면 가운데 쪽 가로 끝 `(cx ± rx, cy)`.
    - 공용 정보 칸: 왼쪽 `(0.02W, H/2 − hudH/2, 0.16W, hudH)` `facing 0`, 오른쪽은 대칭 위치에 `facing 180`.
  - 모든 자리의 `clip`은 화면 전체 `{0, 0, W, H}`다.
  - 1인은 2인의 아래 자리 배치를 그대로 쓴다. 설계서에는 1인일 때 "중앙 카드를 크게"라고 되어 있지만, 이번 단계에서는 2인과 같은 `R0`를 쓴다. 크게 키우는 것은 5단계(혼자 하기 확장)에서 다룬다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const VIEWPORTS: [number, number][] = [[1024, 768], [1280, 800], [1180, 820], [960, 600]];
test('shadowColor', () => { expect(shadowColor('#FF8FB8')).toBe('96,68,78'); });

describe.each(VIEWPORTS)('%ix%i', (W, H) => {
  test.each([1, 2, 3, 4] as const)('%i인: 자리 수와 방향', n => {
    const t = computeTable(n, W, H);
    expect(t.seats).toHaveLength(n);
    if (n >= 2) expect(t.seats.some(s => s.facing === 180)).toBe(true);
  });
  test.each([1, 2, 3, 4] as const)('%i인: 중앙 카드와 간격, 배지와 정보 칸이 화면 안에 있음', n => {
    const t = computeTable(n, W, H);
    // 각 자리 영역의 샘플 점 중 중앙 카드 반지름 × 1.2 안에 들어오는 점이 없어야 한다
    // 배지와 정보 칸 사각형은 {0,0,W,H} 안에 있고, 중앙 카드 원과 겹치지 않는다
    // 정보 칸은 어떤 자리 영역과도 겹치지 않는다
    // 서로 다른 자리 영역의 샘플 점이 겹치지 않는다
  });
  test.each([1, 2, 3, 4] as const)('%i인: 모든 자리와 중앙 카드에 심볼 8개가 배치된다 (시드 30개)', n => {
    const t = computeTable(n, W, H);
    for (let seed = 0; seed < 30; seed++) {
      for (const s of t.seats) {
        expect(() => layoutSymbols({ region: s.region, exclusions: [s.badge], count: 8, rng: createRng(seed) })).not.toThrow();
      }
      const c = t.center;
      expect(() => layoutSymbols({
        region: { ellipse: c, clip: { x: c.cx - c.rx, y: c.cy - c.ry, w: 2 * c.rx, h: 2 * c.ry } },
        exclusions: [], count: 8, rng: createRng(seed),
      })).not.toThrow();
    }
  });
});
```
  - 두 번째 테스트의 주석 4개는 각각 `expect`로 구현한다. 샘플 점은 8px 격자를 쓰고, "영역 안"은 `rectInRegion({x,y,w:0,h:0}, region, 0)`으로 판정한다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다.** 8개 배치가 실패하는 화면 크기가 있으면 수치를 임의로 바꾸지 않는다. 실패한 화면 크기와 자리를 기록하고 멈춰서 보고한다.
- [ ] **Step 5: 커밋한다** (`feat: table seat geometry`)

---

### Task 8: 게임 상태와 reducer

**Files:**
- Create: `src/engine/state.ts`, `src/engine/reducer.ts`, `src/engine/reducer.test.ts`

**Interfaces:**
- Consumes: `generateRound`, `createRng`, `SetConfig`, `SeatColor`
- Produces:
```ts
export type ModeId = 'soloSurvival' | 'score';
export interface PlayerConfig { name: string; color: SeatColor; cardSize: number }
export interface GameConfig {
  mode: ModeId; players: PlayerConfig[]; set: SetConfig;
  rotationStep: 90 | 180; symbolRotation: boolean; speech: boolean;
  scoreRounds: number;  // 기본 20
  seed: number;
}
export interface PlayerState { score: number; lockedUntil: number }
export interface RoundState { index: number; center: string[]; cards: string[][]; answers: string[]; rotation: number }
export interface GameState {
  config: GameConfig; pool: string[]; now: number; phase: 'playing' | 'over';
  players: PlayerState[]; round: RoundState; mode: Record<string, number>;  // 모드별 숫자 상태
}
export type Action =
  | { type: 'TAP'; player: number; symbol: string; round: number }
  | { type: 'TICK'; dt: number };
export type GameEvent =
  | { type: 'correct'; player: number; symbol: string }
  | { type: 'wrong'; player: number }
  | { type: 'round'; index: number }
  | { type: 'over' };
export interface Mode {
  init(config: GameConfig): Record<string, number>;
  onCorrect(s: GameState, player: number): { state: GameState; nextRound: boolean };
  onWrong(s: GameState, player: number): GameState;
  onTick(s: GameState, dt: number): GameState;
  isOver(s: GameState): boolean;
}
export const LOCK_MS = 1500;
// reducer.ts
export function createGame(config: GameConfig, pool: string[], modes: Record<ModeId, Mode>): GameState;
export function reduce(s: GameState, a: Action, modes: Record<ModeId, Mode>): { state: GameState; events: GameEvent[] };
```
- 규칙
  - 라운드 `i`의 카드는 `generateRound({ pool, playerSizes, rng: createRng(config.seed + i * 7919) })`로 만든다. 회전은 `(i * rotationStep) % 360`이다.
  - **TAP을 무시하는 경우**(이벤트 없음): `phase !== 'playing'`, `a.round !== round.index`(지난 라운드의 터치), `now < lockedUntil`, 플레이어 카드에 없는 심볼
  - **정답**: `mode.onCorrect`를 호출하고 `correct` 이벤트를 낸다. `nextRound`가 true면 다음 라운드를 만들고 `round` 이벤트를 낸다.
  - **오답**: `lockedUntil = now + LOCK_MS`로 잠그고, `mode.onWrong`을 호출하고, `wrong` 이벤트를 낸다.
  - **TICK**: `now += dt` 후 `mode.onTick`을 호출한다.
  - 모든 행동 뒤에 `mode.isOver`가 true면 `phase = 'over'`로 바꾸고 `over` 이벤트를 낸다.
  - 이 Task의 테스트는 아래의 가짜 모드로 한다. 실제 모드는 Task 9에서 만든다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
const fake: Mode = {
  init: () => ({ correct: 0 }),
  onCorrect: (s) => ({ state: { ...s, mode: { correct: s.mode.correct + 1 } }, nextRound: true }),
  onWrong: s => s, onTick: s => s, isOver: s => s.mode.correct >= 3,
};
const modes = { soloSurvival: fake, score: fake };
const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);
const cfg: GameConfig = { mode: 'score', players: [{ name: 'A', color: 'pink', cardSize: 4 }, { name: 'B', color: 'sky', cardSize: 6 }],
  set: { kind: 'consonant', includeDouble: false }, rotationStep: 90, symbolRotation: false, speech: false, scoreRounds: 20, seed: 1 };
const wrongOf = (s: GameState, p: number) => s.round.cards[p].find(id => id !== s.round.answers[p])!;

test('정답이면 다음 라운드로 넘어가고 중앙 카드가 90° 돈다', () => {
  const g = createGame(cfg, pool, modes);
  const { state, events } = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, modes);
  expect(events.map(e => e.type)).toEqual(['correct', 'round']);
  expect(state.round.index).toBe(1);
  expect(state.round.rotation).toBe(90);
});
test('오답이면 1500ms 동안 잠기고, 잠긴 동안의 터치는 무시하며 잠금을 늘리지 않는다', () => {
  let s = createGame(cfg, pool, modes);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 0 }, modes).state;
  expect(s.players[0].lockedUntil).toBe(1500);
  const r = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 0 }, modes);
  expect(r.events).toEqual([]); expect(r.state.players[0].lockedUntil).toBe(1500);
  s = reduce(s, { type: 'TICK', dt: 1500 }, modes).state;
  expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, modes).events[0].type).toBe('correct');
});
test('지난 라운드 번호가 달린 터치는 오답 처리 없이 무시한다', () => {
  let s = createGame(cfg, pool, modes);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, modes).state;
  const r = reduce(s, { type: 'TAP', player: 1, symbol: 'anything', round: 0 }, modes);
  expect(r.events).toEqual([]); expect(r.state.players[1].lockedUntil).toBe(0);
});
test('한 플레이어의 잠금은 다른 플레이어에게 영향을 주지 않는다', () => {
  let s = createGame(cfg, pool, modes);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 0 }, modes).state;
  expect(reduce(s, { type: 'TAP', player: 1, symbol: s.round.answers[1], round: 0 }, modes).events[0].type).toBe('correct');
});
test('isOver가 true가 되면 over 이벤트가 나고 이후 터치는 무시한다', () => {
  let s = createGame(cfg, pool, modes); let last: GameEvent[] = [];
  for (let i = 0; i < 3; i++) ({ state: s, events: last } = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, modes));
  expect(last.at(-1)).toEqual({ type: 'over' }); expect(s.phase).toBe('over');
  expect(reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: s.round.index }, modes).events).toEqual([]);
});
test('같은 시드는 같은 라운드를 만든다', () => {
  expect(createGame(cfg, pool, modes).round).toEqual(createGame(cfg, pool, modes).round);
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: `state.ts`와 `reducer.ts`를 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: game state reducer`)

---

### Task 9: 서바이벌 모드와 점수제 모드

**Files:**
- Create: `src/engine/modes/soloSurvival.ts`, `src/engine/modes/score.ts`, `src/engine/modes/index.ts`, `src/engine/modes/modes.test.ts`

**Interfaces:**
- Consumes: `Mode`, `GameState`, `createGame`, `reduce`(Task 8)
- Produces: `export const MODES: Record<ModeId, Mode>` (`modes/index.ts`)
- 규칙
  - **soloSurvival**
    - 상태 `{ timeLeft: 30000, correct: 0 }`
    - 정답: `timeLeft += 1000`, `correct += 1`, `nextRound: true`
    - 오답: `timeLeft −= 2000`
    - TICK: `timeLeft −= dt`
    - `isOver`: `timeLeft ≤ 0`
  - **score**
    - 플레이어 점수는 `players[i].score`에 쌓는다.
    - 정답: 맞힌 사람 `+1`, `nextRound: true`
    - `isOver`: `round.index ≥ scoreRounds`. 즉 `scoreRounds`개 라운드를 다 끝냈을 때다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('서바이벌: 30초로 시작하고 정답 +1초, 오답 −2초, 0이 되면 끝', () => {
  let s = createGame({ ...soloCfg, mode: 'soloSurvival' }, pool, MODES);
  expect(s.mode.timeLeft).toBe(30000);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state;
  expect(s.mode.timeLeft).toBe(31000);
  s = reduce(s, { type: 'TAP', player: 0, symbol: wrongOf(s, 0), round: 1 }, MODES).state;
  expect(s.mode.timeLeft).toBe(29000);
  const r = reduce(s, { type: 'TICK', dt: 29000 }, MODES);
  expect(r.state.phase).toBe('over'); expect(r.events).toContainEqual({ type: 'over' });
});
test('점수제: 먼저 맞힌 사람이 1점을 얻고, scoreRounds 라운드 뒤에 끝난다', () => {
  let s = createGame({ ...duoCfg, mode: 'score', scoreRounds: 2 }, pool, MODES);
  s = reduce(s, { type: 'TAP', player: 1, symbol: s.round.answers[1], round: 0 }, MODES).state;
  expect(s.players.map(p => p.score)).toEqual([0, 1]);
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 1 }, MODES).state;
  expect(s.phase).toBe('over'); expect(s.players.map(p => p.score)).toEqual([1, 1]);
});
```
  - `soloCfg`, `duoCfg`, `pool`, `wrongOf`는 Task 8 테스트와 같은 방식으로 이 파일에 정의한다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: survival and score modes`)

---

### Task 10: 정답 읽어주기

**Files:**
- Create: `src/services/speech.ts`, `src/services/speech.test.ts`

**Interfaces:**
- Produces: `export function speak(text: string, lang: 'ko-KR' | 'en-US'): void`
- 규칙
  - 이전 발화를 취소(`cancel`)하고 새로 읽는다. 속도 `rate = 0.9`.
  - `window.speechSynthesis`가 없으면 아무것도 하지 않고, 예외도 던지지 않는다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```ts
test('speechSynthesis가 있으면 언어를 지정해 읽는다', () => {
  const speakFn = vi.fn(), cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak: speakFn, cancel });
  vi.stubGlobal('SpeechSynthesisUtterance', class { lang = ''; rate = 1; constructor(public text: string) {} });
  speak('가', 'ko-KR');
  expect(cancel).toHaveBeenCalled();
  expect(speakFn.mock.calls[0][0]).toMatchObject({ text: '가', lang: 'ko-KR', rate: 0.9 });
  vi.unstubAllGlobals();
});
test('speechSynthesis가 없어도 예외를 던지지 않는다', () => {
  vi.stubGlobal('speechSynthesis', undefined);
  expect(() => speak('A', 'en-US')).not.toThrow();
  vi.unstubAllGlobals();
});
```

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: speech service`)

---

### Task 11: 테마와 카드 컴포넌트

**Files:**
- Create: `src/ui/theme/brutal.css`, `src/ui/components/Glyph.tsx`, `src/ui/components/SeatView.tsx`, `src/ui/components/CenterCard.tsx`, `src/ui/components/Hud.tsx`, `src/ui/components/components.test.tsx`
- Modify: `src/main.tsx` (CSS와 폰트 import 추가: `@fontsource/jua`, `@fontsource/fredoka/500.css`)

**Interfaces:**
- Consumes: `SymbolDef`, `SeatGeom`, `Ellipse`, `Placement`, `layoutSymbols`, `SEAT_COLORS`, `shadowColor`, `createRng`
- Produces:
```tsx
<SeatView geom={SeatGeom} color={SeatColor} symbols={SymbolDef[]} placements={Placement[]}
  score={number} name={string} showName={boolean} locked={boolean} flash={'correct'|'wrong'|null}
  correctSymbol={string|null} onTap={(symbolId: string) => void} />
<CenterCard circle={Ellipse} symbols={SymbolDef[]} placements={Placement[]} rotation={number} />
<Hud rect={Rect} facing={0|180}>{children}</Hud>
<Glyph symbol={SymbolDef} placement={Placement} facing={0|180} />
```
- 결정 사항
  - **SeatView**
    - 화면 좌표계로 절대 배치한다. 영역은 `border-radius: 50%` div로 그린다. 위치는 `left = cx − rx`, `top = cy − ry`, 크기는 `2rx × 2ry`다.
    - 영역 배경은 자리 색, 테두리는 `4px solid #111`, 그림자는 Global Constraints의 값에 `shadowColor`를 넣는다.
    - 글자 상자마다 `onPointerDown`으로 `onTap(id)`를 호출한다(`click`이 아니다). 상자의 `data-symbol` 속성에 id를 넣는다.
    - `locked`일 때는 영역에 `filter: grayscale(1)`을 주고 터치를 무시한다.
    - `flash`가 `'wrong'`이면 흔들림 애니메이션과 빨간 테두리(`#E24B4A`)를 400ms 동안 보여준다. `'correct'`이면 정답 글자 상자에 노란 배경(`#FFE14D`)과 검정 3px 테두리를 씌운다.
    - 점수 배지는 `geom.badge` 위치에 둔다. 영역색으로 칠하고 검정 3px 테두리를 두르며, `facing`만큼 회전한다. `showName`이면 이름도 넣는다.
  - **Glyph**
    - 글자 폰트: `lang === 'ko-KR'`이면 `'Jua'`, 아니면 `'Fredoka'`. `font-size = placement.size × 0.9`, 색은 `#111`.
    - 회전 = `facing + placement.rotation`.
    - 이미지 심볼(`kind: 'image'`)이면 `<img>`를 상자 크기에 맞춰 넣는다(6단계용 분기).
  - **CenterCard**: 흰 원과 같은 테두리·그림자 규칙을 쓰고, 전체를 `rotate(rotation deg)`로 돌린다. `transition: transform 300ms`.
  - **brutal.css**
    - `body` 배경 `#FFF4D6`, 화면 전체에 `touch-action: none; user-select: none; -webkit-touch-callout: none; overscroll-behavior: none`
    - 흔들림 `@keyframes shake`를 정의한다.

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('글자를 pointerdown하면 onTap에 id를 넘긴다', () => {
  const onTap = vi.fn();
  render(<SeatView geom={geom} color="pink" symbols={syms} placements={pls} score={3} name="민지" showName
    locked={false} flash={null} correctSymbol={null} onTap={onTap} />);
  fireEvent.pointerDown(document.querySelector('[data-symbol="ko-s:가"]')!);
  expect(onTap).toHaveBeenCalledWith('ko-s:가');
  expect(screen.getByText('민지')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
});
test('잠긴 상태에서는 onTap을 부르지 않는다', () => {
  const onTap = vi.fn();
  render(<SeatView geom={geom} color="pink" symbols={syms} placements={pls} score={0} name="A" showName={false}
    locked flash={null} correctSymbol={null} onTap={onTap} />);
  fireEvent.pointerDown(document.querySelector('[data-symbol="ko-s:가"]')!);
  expect(onTap).not.toHaveBeenCalled();
});
test('한글은 Jua, 알파벳은 Fredoka로 그린다', () => {
  render(<><Glyph symbol={ko} placement={p} facing={0} /><Glyph symbol={en} placement={p} facing={180} /></>);
  expect(screen.getByText('가')).toHaveStyle({ fontFamily: 'Jua' });
  expect(screen.getByText('A')).toHaveStyle({ fontFamily: 'Fredoka' });
});
```
  - `geom`, `syms`, `pls`, `ko`, `en`, `p`는 테스트 파일 위쪽에 고정값으로 정의한다.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다**
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: neo-brutal theme and card components`)

---

### Task 12: 게임 루프 컨트롤러와 게임 화면

**Files:**
- Create: `src/engine/controller.ts`, `src/engine/controller.test.ts`, `src/ui/screens/Game.tsx`, `src/ui/screens/Game.test.tsx`

**Interfaces:**
- Consumes: `createGame`, `reduce`, `MODES`, `computeTable`, `layoutSymbols`, `speak`, 컴포넌트(Task 11)
- Produces:
```ts
export const MAX_DT = 100;
export class GameController {
  constructor(initial: GameState, modes: Record<ModeId, Mode>);
  getState(): GameState;
  dispatch(a: Action): GameEvent[];
  frame(timestampMs: number): void;  // 이전 timestamp와의 차이를 MAX_DT로 제한해 TICK을 보낸다. 첫 프레임은 dt 0
  subscribe(fn: (s: GameState, events: GameEvent[]) => void): () => void;
  start(): void; stop(): void;       // requestAnimationFrame으로 frame을 반복 호출
}
```
```tsx
<Game config={GameConfig} symbols={SymbolDef[]} onOver={(s: GameState) => void} />
```
- 게임 화면 규칙
  - `window.innerWidth/innerHeight`로 `computeTable`을 계산하고, `resize`가 일어나면 다시 계산한다.
  - 글자 배치는 `useMemo`로 라운드와 자리마다 한 번만 계산한다. 시드는 `config.seed + round.index * 7919 + seat * 101`, 중앙 카드는 `seat = 99`를 쓴다. 옵션: `exclusions: [badge]`, `rotate: config.symbolRotation`
  - 이벤트 처리
    - `correct`: `config.speech`가 켜져 있으면 `speak(symbol.speech, symbol.lang)`를 호출한다. 해당 자리에 `flash = 'correct'`를 400ms 동안 준다.
    - `wrong`: 해당 자리에 `flash = 'wrong'`을 400ms 동안 준다.
    - `over`: `onOver(state)`를 호출한다.
  - 공용 정보 칸
    - 서바이벌: `남은 시간 {초}초` + 진행 막대(30초 기준, 넘치면 꽉 참)
    - 점수제: `{현재 라운드+1}/{scoreRounds}` + 진행 막대
  - 점수 배지: 서바이벌은 `mode.correct`, 점수제는 `players[i].score`. 이름은 1~2인일 때만 보여준다.

- [ ] **Step 1: 컨트롤러의 실패하는 테스트를 작성한다**

```ts
test('frame 사이의 dt를 100ms로 제한한다', () => {
  const c = new GameController(createGame(soloCfg, pool, MODES), MODES);
  c.frame(1000); c.frame(1016); expect(c.getState().now).toBe(16);
  c.frame(9016); expect(c.getState().now).toBe(116);
  expect(c.getState().mode.timeLeft).toBe(30000 - 116);
});
test('subscribe는 dispatch 결과 이벤트를 받는다', () => {
  const c = new GameController(createGame(soloCfg, pool, MODES), MODES);
  const seen: string[] = []; c.subscribe((_, ev) => ev.forEach(e => seen.push(e.type)));
  const s = c.getState();
  c.dispatch({ type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 });
  expect(seen).toEqual(['correct', 'round']);
});
```

- [ ] **Step 2: 게임 화면의 실패하는 테스트를 작성한다**

```tsx
test('정답 글자를 누르면 점수가 오르고 음성이 나온다', async () => {
  const spy = vi.spyOn(speech, 'speak').mockImplementation(() => {});
  window.innerWidth = 1024; window.innerHeight = 768;
  render(<Game config={{ ...duoCfg, speech: true, seed: 3 }} symbols={syllableSymbols('ㄱ', false)} onOver={() => {}} />);
  const answer = createGame({ ...duoCfg, seed: 3 }, pool21, MODES).round.answers[0];
  fireEvent.pointerDown(screen.getAllByTestId('seat-0')[0].querySelector(`[data-symbol="${answer}"]`)!);
  expect(spy).toHaveBeenCalled();
  expect(within(screen.getByTestId('badge-0')).getByText('1')).toBeInTheDocument();
});
```
  - `SeatView`의 루트에 `data-testid="seat-{index}"`, 배지에 `data-testid="badge-{index}"`를 단다(Task 11 컴포넌트에 prop으로 index를 넘겨 추가).
  - `pool21`은 `syllableSymbols('ㄱ', false).map(s => s.id)`다.

- [ ] **Step 3: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 4: `controller.ts`와 `Game.tsx`를 구현한다**
- [ ] **Step 5: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 6: 커밋한다** (`feat: game loop controller and game screen`)

---

### Task 13: 홈, 설정, 결과 화면과 화면 전환

**Files:**
- Create: `src/ui/screens/Home.tsx`, `src/ui/screens/Setup.tsx`, `src/ui/screens/Result.tsx`, `src/ui/screens/Setup.test.tsx`
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `GameConfig`, `createSymbolSet`, `maxCardSize`, `INITIALS`, `SEAT_COLORS`, `Game`
- Produces:
  - `App` 내부 상태: `'home' | 'setup' | 'game' | 'result'`
  - `<Setup mode={ModeId} onStart={(config: GameConfig, symbols: SymbolDef[]) => void} onBack={() => void} />`
- **홈**: 제목 `도블 놀이`, 버튼 `혼자 하기`(soloSurvival), `같이 하기`(score). 협동과 팀 경쟁은 이후 단계에서 추가하므로 지금은 보여주지 않는다.
- **설정 화면 항목**
  - 인원: 같이 하기는 2~4명, 혼자 하기는 1명으로 고정
  - 플레이어 이름: 기본값 `플레이어 1`… 
  - 자리 색: `SEAT_COLORS` 5개 중에서 고르고, 같은 색은 중복 선택할 수 없다. 기본값은 핑크, 하늘, 노랑, 연두
  - 세트
    - 자음(쌍자음 포함 토글)
    - 글자(초성 19개 중 선택 + 받침 토글)
    - 알파벳(대문자/소문자/대소문자)
  - 카드당 심볼 수: 3~8 슬라이더. 이번 단계에서는 모든 플레이어가 같은 값을 쓴다.
  - 라운드 수: 같이 하기만, 10/20/30 중 선택, 기본 20
  - 중앙 회전: 90°/180°, 기본 90°
  - 심볼 회전: 켜기/끄기, 기본 끔
  - 읽어주기: 켜기/끄기, 기본 켬
- **심볼 수 검증**
  - 세트의 심볼 수로 `maxCardSize`를 계산해서 슬라이더 최대값으로 쓴다.
  - 현재 값이 최대값보다 크면 최대값으로 낮추고, `심볼이 부족해서 카드당 최대 {n}개까지 쓸 수 있어요`를 보여준다.
  - `maxCardSize`가 0이면 시작 버튼 대신 `이 세트는 심볼이 너무 적어요`를 보여준다.
- **시작**: `seed = Date.now()`로 정하고, 심볼을 불러온 뒤 `onStart`를 호출한다.
- **결과 화면**
  - 서바이벌: `{correct}개 찾았어요`
  - 점수제: 점수 순위 목록. 1등에게는 `우승` 표시를 붙이고, 동점이면 함께 표시한다.
  - 버튼: `다시 하기`(같은 설정에 새 시드), `처음으로`

- [ ] **Step 1: 실패하는 테스트를 작성한다**

```tsx
test('자음 14개 세트에서는 카드당 심볼 수 최대값이 7이다', async () => {
  render(<Setup mode="score" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  expect(screen.getByRole('slider', { name: '카드당 심볼 수' })).toHaveAttribute('max', '7');
});
test('시작하면 설정과 불러온 심볼을 넘긴다', async () => {
  const onStart = vi.fn();
  render(<Setup mode="score" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  const [config, symbols] = onStart.mock.calls[0];
  expect(config.players).toHaveLength(2);
  expect(symbols.length).toBeGreaterThanOrEqual(config.players[0].cardSize * 2 - 1);
});
test('같은 자리 색은 두 명이 고를 수 없다', () => {
  render(<Setup mode="score" onStart={() => {}} onBack={() => {}} />);
  // 플레이어 2의 색 선택지 중 핑크(플레이어 1의 색)는 선택할 수 없다
  expect(within(screen.getByRole('group', { name: '플레이어 2 색' })).getByRole('radio', { name: '핑크' })).toBeDisabled();
});
```
  - 세 번째 테스트처럼 이미 다른 플레이어가 고른 색만 예외적으로 비활성화한다.
  - `App.test.tsx`에 테스트를 추가한다: `같이 하기` → 설정 화면 표시 → `처음으로`(onBack) → 홈 복귀.

- [ ] **Step 2: 테스트를 실행해 실패를 확인한다**
- [ ] **Step 3: 구현한다.** 버튼과 입력 요소에도 네오브루탈리즘 스타일을 쓴다. 검정 3px 테두리를 두르고, 누르면 그림자 띠가 두꺼워진다.
- [ ] **Step 4: 테스트를 실행해 통과를 확인한다**
- [ ] **Step 5: 커밋한다** (`feat: home, setup, result screens`)

---

### Task 14: PWA, 가로 고정, 실제 화면 확인

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icon-192.png`, `public/icon-512.png` (검정 테두리 노란 원에 "ㄱ"이 있는 단순한 아이콘), `.claude/launch.json`

**Interfaces:**
- Consumes: 앱 전체

- [ ] **Step 1: `vite-plugin-pwa`를 설정한다**
  - manifest: `name: '도블 놀이'`, `short_name: '도블'`, `display: 'fullscreen'`, `orientation: 'landscape'`, `background_color: '#FFF4D6'`, `theme_color: '#FFF4D6'`, 아이콘 2개
  - `registerType: 'autoUpdate'`
  - workbox `globPatterns: ['**/*.{js,css,html,woff2,png}']`. 폰트도 오프라인 캐시에 들어가게 한다.

- [ ] **Step 2: 세로 화면 안내를 넣는다.** `@media (orientation: portrait)`일 때 `태블릿을 가로로 돌려 주세요` 안내를 화면 전체에 보여준다. 게임 화면 진입 시 `screen.orientation.lock('landscape')`를 시도하고, 실패하면 조용히 무시한다.

- [ ] **Step 3: `npm test`와 `npm run build`를 실행한다.** 모든 테스트가 통과하고 `dist/sw.js`, `dist/manifest.webmanifest`가 생성되어야 한다.

- [ ] **Step 4: 실제 화면을 확인한다**
  - `.claude/launch.json`에 `npm run preview`(포트 4173) 설정을 추가하고 미리보기를 연다.
  - 1024×768에서 다음을 확인하고 스크린샷을 남긴다.
    - 혼자 하기 1판: 정답 → 시간 +1, 오답 → 흔들림과 회색 잠금
    - 같이 하기 2인과 4인: 대각선 반원, 모서리 타원, 배지, 공용 정보 칸
    - 중앙 카드 90° 회전
    - 글자 겹침 없음

- [ ] **Step 5: 커밋한다** (`feat: pwa manifest and landscape handling`)
