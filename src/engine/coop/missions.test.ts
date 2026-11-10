import { consonantSymbols, syllableSymbols } from '../../content/hangul';
import { generateRound } from '../cardGen';
import { MODES } from '../modes';
import { createGame, reduce } from '../reducer';
import { createRng } from '../rng';
import type { GameState } from '../state';
import { TEST_POOL, testConfig } from '../testConfig';
import { applyReward, makeMission, missionDamage, missionProgress } from './missions';

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
test('단계마다 미션이 달라질 수 있다 (같은 단계는 같은 미션)', () => {
  const cfg = testConfig({ set: { kind: 'syllable', initial: 'ㄱ', batchim: false } });
  expect(makeMission(cfg, ko, 2)).toEqual(makeMission(cfg, ko, 2));
  const texts = new Set([1, 2, 3, 4, 5, 6].map(st => makeMission(cfg, ko, st).text));
  expect(texts.size).toBeGreaterThan(1);
});
test('미션 대상이 한 장뿐이어도 정답으로 자주 나온다', () => {
  let hits = 0;
  for (let seed = 0; seed < 300; seed++) {
    const r = generateRound({ pool: TEST_POOL, playerSizes: [5, 5], preferAnswer: id => id === 's7', rng: createRng(seed) });
    if (r.answers.includes('s7')) hits++;
  }
  expect(hits).toBeGreaterThan(60);
});
test('협동 시작 시 실제 미션이 붙고, 새 몬스터마다 새 미션이 붙는다', () => {
  let s = createGame(testConfig({ mode: 'coop' }), ko.map(x => x.id), MODES, ko);
  expect(s.coop!.mission.done).toBe(false);
  expect(s.coop!.mission.text).toMatch(/^모음/);
  for (let i = 0; i < 12 && s.coop!.stage === 1; i++) s = reduce(s, { type: 'TAP', player: i % 2, symbol: s.round.answers[i % 2], round: s.round.index }, MODES).state;
  expect(s.coop!.stage).toBe(2);
  expect(s.coop!.mission.progress).toBe(0);
  expect(s.coop!.mission.text).not.toBe('');
});
test('혼자 하는 몬스터 사냥에는 찾기 미션이 없다', () => {
  const cfg = testConfig({ mode: 'coop', players: [testConfig().players[0]], set: { kind: 'syllable', initial: 'ㄱ', batchim: false } });
  expect(makeMission(cfg, ko, 1)).toMatchObject({ text: '', ids: [] });
  expect(makeMission(cfg, ko, 4)).toMatchObject({ text: '', ids: [] });
});
test('미션 대상을 3번 맞히면 완료되고 큰 피해를 준다', () => {
  let s: GameState = createGame(testConfig({ mode: 'coop' }), ko.map(x => x.id), MODES, ko);
  const target = s.coop!.mission.ids[0];
  s = { ...s, coop: { ...s.coop!, mission: { ...s.coop!.mission, ids: [target], reward: 'heal' }, hearts: 2 } };
  let r = missionProgress(s, target); r = missionProgress(r.state, target); r = missionProgress(r.state, 'ko-s:없음');
  expect(r.state.coop!.mission.progress).toBe(2);
  expect(r.state.coop!.hp).toBe(16);
  r = missionProgress(r.state, target);
  expect(r.state.coop!.mission.done).toBe(true);
  expect(r.state.coop!.hp).toBe(16 - missionDamage(16));
  expect(r.state.coop!.hearts).toBe(3);
  expect(r.events).toContainEqual({ type: 'missionDone', reward: 'heal' });
  expect(r.events).toContainEqual({ type: 'damage', amount: missionDamage(16), combo: false });
  expect(missionProgress(r.state, target).state.coop!.mission.progress).toBe(3);
});
test('정답 처리 때 미션 진행도가 오른다', () => {
  let s: GameState = createGame(testConfig({ mode: 'coop' }), ko.map(x => x.id), MODES, ko);
  s = { ...s, coop: { ...s.coop!, mission: { ...s.coop!.mission, ids: [s.round.answers[0]] } } };
  s = reduce(s, { type: 'TAP', player: 0, symbol: s.round.answers[0], round: 0 }, MODES).state;
  expect(s.coop!.mission.progress).toBe(1);
});
test('미션 피해는 최대 체력의 40%이고, 하트 보상은 5를 넘지 않는다', () => {
  expect(missionDamage(16)).toBe(7);
  expect(missionDamage(40)).toBe(16);
  const s = createGame(testConfig({ mode: 'coop' }), ko.map(x => x.id), MODES, ko);
  const full = applyReward({ ...s, coop: { ...s.coop!, hearts: 5 } }, 'heal').state.coop!;
  expect(full.hearts).toBe(5);
  expect(full.hp).toBe(16 - 7);
  const plain = applyReward({ ...s, coop: { ...s.coop!, hearts: 2 } }, 'special').state.coop!;
  expect(plain.hearts).toBe(2);
  expect(plain.hp).toBe(16 - 7);
});
