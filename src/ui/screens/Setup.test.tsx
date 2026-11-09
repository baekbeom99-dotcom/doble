import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Setup } from './Setup';

test('자음 14개 세트에서는 카드당 심볼 수 최대값이 7이다', async () => {
  render(<Setup mode="score" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '카드당 심볼 수' })).toHaveAttribute('max', '7'));
  expect(screen.getByText('심볼이 부족해서 카드당 최대 7개까지 쓸 수 있어요')).toBeInTheDocument();
});
test('시작하면 설정과 불러온 심볼을 넘긴다', async () => {
  const onStart = vi.fn();
  render(<Setup mode="score" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  const [config, symbols] = onStart.mock.calls[0];
  expect(config.players).toHaveLength(2);
  expect(config.mode).toBe('score');
  expect(symbols.length).toBeGreaterThanOrEqual(config.players[0].cardSize * 2 - 1);
});
test('혼자 하기는 1명으로 시작한다', async () => {
  const onStart = vi.fn();
  render(<Setup mode="soloSurvival" onStart={onStart} onBack={() => {}} />);
  expect(screen.queryByRole('group', { name: '인원' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(onStart.mock.calls[0][0].players).toHaveLength(1);
});
test('같은 자리 색은 두 명이 고를 수 없다', () => {
  render(<Setup mode="score" onStart={() => {}} onBack={() => {}} />);
  expect(within(screen.getByRole('group', { name: '플레이어 2 색' })).getByRole('radio', { name: '핑크' })).toBeDisabled();
});
test('인원을 4명으로 바꾸면 이름 칸이 4개가 된다', () => {
  render(<Setup mode="score" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '4명' }));
  expect(screen.getByLabelText('플레이어 4 이름')).toHaveValue('플레이어 4');
});
