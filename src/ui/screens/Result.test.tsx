import { fireEvent, render, screen } from '@testing-library/react';
import { MODES } from '../../engine/modes';
import { createGame } from '../../engine/reducer';
import type { SeatColor } from '../../engine/seats';
import type { GameState } from '../../engine/state';
import { TEST_POOL, testConfig } from '../../engine/testConfig';
import { Result } from './Result';

const withScores = (s: GameState, scores: number[]): GameState => ({ ...s, players: s.players.map((p, i) => ({ ...p, score: scores[i] })) });
const three = ['pink', 'sky', 'yellow'].map((c, i) => ({ name: `P${i}`, color: c as SeatColor, cardSize: 5 }));
const four = [...three, { name: 'P3', color: 'lime' as const, cardSize: 5 }];
const show = (s: GameState) => render(<Result state={s} onRetry={() => {}} onHome={() => {}} />);

test('공동 1위는 같은 순위 숫자를 보여주고 함께 우승', () => {
  show(withScores(createGame(testConfig({ players: three }), TEST_POOL, MODES), [5, 7, 7]));
  expect(screen.getAllByTestId('rank-number').map(el => el.textContent)).toEqual(['1', '1', '3']);
  const items = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(items[0]).toContain('우승'); expect(items[1]).toContain('우승'); expect(items[2]).not.toContain('우승');
});
test('점수제는 점으로 보여준다', () => {
  show(withScores(createGame(testConfig(), TEST_POOL, MODES), [3, 5]));
  expect(screen.getByText('5점')).toBeInTheDocument();
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
test('서바이벌은 찾은 개수를 보여준다', () => {
  const s = createGame(testConfig({ mode: 'soloSurvival', players: [three[0]] }), TEST_POOL, MODES);
  show({ ...s, mode: { ...s.mode, correct: 12 } });
  expect(screen.getByText('12개 찾았어요')).toBeInTheDocument();
});
test('이름이 같은 플레이어가 있어도 React 키 경고가 나지 않는다', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const same = [{ name: '민수', color: 'pink' as const, cardSize: 5 }, { name: '민수', color: 'sky' as const, cardSize: 5 }];
  show(withScores(createGame(testConfig({ players: same }), TEST_POOL, MODES), [1, 2]));
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
test('협동 결과는 물리친 몬스터 수와 단계를 보여준다', () => {
  const s = createGame(testConfig({ mode: 'coop' }), TEST_POOL, MODES);
  show({ ...s, coop: { ...s.coop!, stage: 4 } });
  expect(screen.getByText('3마리 물리쳤어요')).toBeInTheDocument();
  expect(screen.getByText('4단계까지 갔어요')).toBeInTheDocument();
});
test('서바이벌: 점수, 판정 수, 새 기록, 새 배지', () => {
  const s = createGame(testConfig({ mode: 'soloSurvival', players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={{ ...s, mode: { ...s.mode, correct: 12, score: 30, perfect: 8, great: 3, good: 1 } }}
    onRetry={() => {}} onHome={() => {}} outcome={{ newBest: true, best: 30, newBadges: [{ id: 'first', name: '첫 게임', description: '' }] }} />);
  expect(screen.getByText('12개 찾았어요')).toBeInTheDocument();
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
test('스테이지 20 클리어에는 다음 단계 버튼이 없다', () => {
  const s = createGame(testConfig({ mode: 'soloStage', stage: 20, players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={{ ...s, mode: { ...s.mode, cleared: 1, stars: 3 } }} onRetry={() => {}} onHome={() => {}} onNextStage={() => {}} />);
  expect(screen.queryByRole('button', { name: '다음 단계' })).not.toBeInTheDocument();
});
test('스테이지 실패: 다음 단계 버튼이 없다', () => {
  const s = createGame(testConfig({ mode: 'soloStage', stage: 4, players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={s} onRetry={() => {}} onHome={() => {}} onNextStage={() => {}} />);
  expect(screen.getByText('4단계 실패')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '다음 단계' })).not.toBeInTheDocument();
});
test('몬스터 사냥 새 기록', () => {
  const s = createGame(testConfig({ mode: 'coop', players: [three[0]] }), TEST_POOL, MODES);
  render(<Result state={{ ...s, coop: { ...s.coop!, stage: 3 } }} onRetry={() => {}} onHome={() => {}} outcome={{ newBest: true, best: 3, newBadges: [] }} />);
  expect(screen.getByText('2마리 물리쳤어요')).toBeInTheDocument();
  expect(screen.getByText('새 기록!')).toBeInTheDocument();
});
