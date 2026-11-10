import { coopMessage, objectParticle } from './coopText';

const names = ['민지', '플레이어 2', 'Tom'];

test('을/를은 이름 끝 글자의 받침으로 고른다', () => {
  expect(objectParticle('민지')).toBe('를');
  expect(objectParticle('준')).toBe('을');
  expect(objectParticle('플레이어 1')).toBe('을');
  expect(objectParticle('플레이어 2')).toBe('를');
  expect(objectParticle('Tom')).toBe('를');
});

test('불 공격이 시작되면 누가 맞았고 어떻게 구하는지 알려 준다', () => {
  expect(coopMessage({ type: 'fireStart', target: 0 }, names)).toBe('악당 거북이가 민지에게 불을 뿜었어요! 친구들이 2번 맞히면 구할 수 있어요');
  expect(coopMessage({ type: 'fireStart', target: 0 }, ['민지'])).toBe('악당 거북이가 불을 뿜었어요! 5초 동안 방어해요');
});

test('구했을 때, 못 구했을 때, 거북이를 물리쳤을 때, 미션을 해냈을 때', () => {
  expect(coopMessage({ type: 'fireRescue', target: 1 }, names)).toBe('플레이어 2를 구했어요!');
  expect(coopMessage({ type: 'fireBurn', target: 0 }, names)).toBe('불을 못 껐어요. 하트가 하나 줄었어요');
  expect(coopMessage({ type: 'monsterDown', stage: 1 }, names)).toBe('악당 거북이를 물리쳤어요! 2단계 거북이가 나타났어요');
  expect(coopMessage({ type: 'missionDone', reward: 'heal' }, names)).toBe('미션 성공! 거북이를 크게 때리고 하트도 하나 얻었어요');
  expect(coopMessage({ type: 'missionDone', reward: 'special' }, names)).toBe('미션 성공! 거북이를 크게 때렸어요');
});

test('알릴 일이 아닌 이벤트는 null', () => {
  expect(coopMessage({ type: 'damage', amount: 1, combo: false }, names)).toBeNull();
  expect(coopMessage({ type: 'heartLost' }, names)).toBeNull();
});
