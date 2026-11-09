import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PlayerConfig } from '../../engine/state';
import { Setup } from './Setup';

/** 글자 세트를 다 불러와 슬라이더 최대값이 정해질 때까지 기다린다 */
const waitLoaded = () =>
  waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).not.toHaveAttribute('max', '3'));

test('자음 14개 세트에서는 카드당 심볼 수 최대값이 7이다', async () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).toHaveAttribute('max', '7'));
  expect(screen.getByText('심볼이 부족해서 카드당 최대 7개까지 쓸 수 있어요')).toBeInTheDocument();
});
test('시작하면 설정과 불러온 심볼을 넘긴다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  const [config, symbols] = onStart.mock.calls[0];
  expect(config.players).toHaveLength(2);
  expect(config.mode).toBe('score');
  expect(symbols.length).toBeGreaterThanOrEqual(config.players[0].cardSize * 2 - 1);
});
test('혼자 하기는 1명으로 시작한다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  expect(screen.queryByRole('group', { name: '인원' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(onStart.mock.calls[0][0].players).toHaveLength(1);
});
test('같은 자리 색은 두 명이 고를 수 없다', async () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  await waitLoaded();
  expect(within(screen.getByRole('group', { name: '플레이어 2 색' })).getByRole('radio', { name: '핑크' })).toBeDisabled();
});
test('인원을 4명으로 바꾸면 이름 칸이 4개가 된다', async () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  await waitLoaded();
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '4명' }));
  expect(screen.getByLabelText('플레이어 4 이름')).toHaveValue('플레이어 4');
});
test('인원을 줄였다 늘려도 두 사람이 같은 색을 가질 수 없다', async () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  await waitLoaded();
  const people = within(screen.getByRole('group', { name: '인원' }));
  fireEvent.click(people.getByRole('radio', { name: '4명' }));
  fireEvent.click(people.getByRole('radio', { name: '2명' }));
  expect(within(screen.getByRole('group', { name: '플레이어 1 색' })).getByRole('radio', { name: '노랑' })).toBeDisabled();
});

const setRange = (el: HTMLElement, n: number) => fireEvent.change(el, { target: { value: String(n) } });
const startWith = async (onStart: ReturnType<typeof vi.fn>) => {
  fireEvent.click(screen.getByRole('button', { name: '시작' }));
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  return onStart.mock.calls[0][0];
};

test('플레이어마다 심볼 수를 따로 정한다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 2 심볼 수' })).toHaveAttribute('max', '8'));
  setRange(screen.getByRole('slider', { name: '플레이어 1 심볼 수' }), 3);
  setRange(screen.getByRole('slider', { name: '플레이어 2 심볼 수' }), 8);
  const cfg = await startWith(onStart);
  expect(cfg.players.map((p: PlayerConfig) => p.cardSize)).toEqual([3, 8]);
});
test('폭탄 돌리기를 고르면 시작 카드와 넘길 사람 설정이 나온다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  expect(screen.queryByRole('radio', { name: '7장' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '폭탄 돌리기' }));
  fireEvent.click(screen.getByRole('radio', { name: '7장' }));
  fireEvent.click(screen.getByRole('radio', { name: '직접 고르기' }));
  expect(await startWith(onStart)).toMatchObject({ mode: 'bomb', bomb: { startHand: 7, target: 'choose' } });
});
test('탑 쌓기는 라운드 수 대신 카드 수를 고른다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '탑 쌓기' }));
  expect(screen.getByRole('group', { name: '카드 수' })).toBeInTheDocument();
  expect((await startWith(onStart)).mode).toBe('tower');
});
test('덧붙는 요소는 기본으로 켜져 있고 끌 수 있다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('checkbox', { name: '아이템' }));
  expect((await startWith(onStart)).rules).toEqual({ combo: true, finalRound: true, items: false });
});
test('팀 대결은 기본 4인 2:2이다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="team" onStart={onStart} onBack={() => {}} />);
  expect(screen.getByRole('heading', { name: '팀 대결' })).toBeInTheDocument();
  const cfg = await startWith(onStart);
  expect(cfg.players).toHaveLength(4);
  expect(cfg.teams).toEqual([0, 0, 1, 1]);
});
test('팀 대결 3인은 2:1이고 혼자인 사람의 심볼 수가 2 낮다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="team" onStart={onStart} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).toHaveAttribute('max', '8'));
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '3명' }));
  const cfg = await startWith(onStart);
  expect(cfg.teams).toEqual([0, 0, 1]);
  expect(cfg.players[2].cardSize).toBe(cfg.players[0].cardSize - 2);
});
test('혼자 하기는 덧붙는 요소가 모두 꺼져 있다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  expect(screen.queryByRole('checkbox', { name: '아이템' })).not.toBeInTheDocument();
  expect(await startWith(onStart)).toMatchObject({ mode: 'soloSurvival', rules: { combo: false, finalRound: false, items: false }, teams: null });
});
test('시작 버튼을 빠르게 두 번 눌러도 한 번만 시작한다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  const start = screen.getByRole('button', { name: '시작' });
  fireEvent.click(start); fireEvent.click(start);
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  await new Promise(r => setTimeout(r, 20));
  expect(onStart).toHaveBeenCalledTimes(1);
});
test('팀 대결을 3인에서 4인으로 되돌리면 3번 플레이어의 심볼 수도 돌아온다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="team" onStart={onStart} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).toHaveAttribute('max', '8'));
  const people = within(screen.getByRole('group', { name: '인원' }));
  fireEvent.click(people.getByRole('radio', { name: '3명' }));
  fireEvent.click(people.getByRole('radio', { name: '4명' }));
  const cfg = await startWith(onStart);
  expect(cfg.players[2].cardSize).toBe(cfg.players[0].cardSize);
});
test('3인 팀 보정은 화면에 보이는(제한된) 심볼 수를 기준으로 한다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="team" onStart={onStart} onBack={() => {}} />);
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).toHaveAttribute('max', '8'));
  setRange(screen.getByRole('slider', { name: '플레이어 1 심볼 수' }), 8);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 심볼 수' })).toHaveAttribute('max', '7'));
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '3명' }));
  const cfg = await startWith(onStart);
  expect(cfg.players[0].cardSize).toBe(7);
  expect(cfg.players[2].cardSize).toBe(5);
});
