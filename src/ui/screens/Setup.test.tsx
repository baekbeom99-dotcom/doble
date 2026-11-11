import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INITIALS } from '../../content/hangul';
import type { PlayerConfig } from '../../engine/state';
import { fitSetup, Setup } from './Setup';
import { createSymbolSet } from '../../content/registry';
import { EMPTY_RECORDS } from '../../services/records';

const SET_ID = createSymbolSet({ kind: 'consonant', includeDouble: false }).id;

/** 글자 세트를 다 불러와 슬라이더 최대값이 정해질 때까지 기다린다 */
const waitLoaded = () =>
  waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).not.toHaveAttribute('max', '3'));

test('자음 14개 세트에서는 카드당 글자 수 최대값이 7이고, 부족하다는 안내는 보여주지 않는다', async () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '7'));
  expect(screen.queryByText(/심볼이 부족해서/)).not.toBeInTheDocument();
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
  fireEvent.click(screen.getByRole('radio', { name: '알파벳' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 2 글자 수' })).toHaveAttribute('max', '8'));
  setRange(screen.getByRole('slider', { name: '플레이어 1 글자 수' }), 3);
  setRange(screen.getByRole('slider', { name: '플레이어 2 글자 수' }), 8);
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
test('대결 방식은 점수제와 폭탄 돌리기 둘이고, 폭탄 돌리기를 고르면 규칙 설명이 나온다', () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  expect(screen.queryByRole('radio', { name: '탑 쌓기' })).not.toBeInTheDocument();
  expect(screen.queryByText(/카드가 먼저 0장이 되면 이겨요/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '폭탄 돌리기' }));
  expect(screen.getByText(/카드가 먼저 0장이 되면 이겨요/)).toBeInTheDocument();
});
test('덧붙는 요소는 기본으로 켜져 있고 끌 수 있다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('switch', { name: '아이템' }));
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
  fireEvent.click(screen.getByRole('radio', { name: '알파벳' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '8'));
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '3명' }));
  const cfg = await startWith(onStart);
  expect(cfg.teams).toEqual([0, 0, 1]);
  expect(cfg.players[2].cardSize).toBe(cfg.players[0].cardSize - 2);
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
  fireEvent.click(screen.getByRole('radio', { name: '알파벳' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '8'));
  const people = within(screen.getByRole('group', { name: '인원' }));
  fireEvent.click(people.getByRole('radio', { name: '3명' }));
  fireEvent.click(people.getByRole('radio', { name: '4명' }));
  const cfg = await startWith(onStart);
  expect(cfg.players[2].cardSize).toBe(cfg.players[0].cardSize);
});
test('3인 팀 보정은 화면에 보이는(제한된) 심볼 수를 기준으로 한다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="team" onStart={onStart} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '알파벳' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '8'));
  setRange(screen.getByRole('slider', { name: '플레이어 1 글자 수' }), 8);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '7'));
  fireEvent.click(within(screen.getByRole('group', { name: '인원' })).getByRole('radio', { name: '3명' }));
  const cfg = await startWith(onStart);
  expect(cfg.players[0].cardSize).toBe(7);
  expect(cfg.players[2].cardSize).toBe(5);
});
test('협동은 1~4명이고 대결 방식이 없다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="coop" onStart={onStart} onBack={() => {}} />);
  await waitLoaded();
  expect(screen.getByRole('heading', { name: '같이 하기' })).toBeInTheDocument();
  expect(within(screen.getByRole('group', { name: '인원' })).getAllByRole('radio')).toHaveLength(4);
  expect(screen.queryByRole('group', { name: '대결 방식' })).not.toBeInTheDocument();
  expect(await startWith(onStart)).toMatchObject({ mode: 'coop', teams: null, rules: { combo: false, finalRound: false, items: false } });
});
test('혼자 하기: 스테이지 도전은 열린 단계까지 고를 수 있고 심볼 수 슬라이더가 없다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} records={{ ...EMPTY_RECORDS, unlocked: { [SET_ID]: 3 } }} />);
  await waitLoaded();
  fireEvent.click(screen.getByRole('radio', { name: '스테이지 도전' }));
  expect(within(screen.getByRole('group', { name: '단계' })).getAllByRole('radio')).toHaveLength(3);
  expect(screen.queryByRole('slider', { name: '플레이어 1 글자 수' })).not.toBeInTheDocument();
  expect(await startWith(onStart)).toMatchObject({ mode: 'soloStage', stage: 3, rules: { items: true } });
});
test('혼자 하기: 서바이벌은 제한 시간을 고를 수 있고 기본은 40초', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  await waitLoaded();
  const group = screen.getByRole('group', { name: '제한 시간' });
  expect(within(group).getByRole('radio', { name: '40초' })).toBeChecked();
  fireEvent.click(within(group).getByRole('radio', { name: '60초' }));
  expect(await startWith(onStart)).toMatchObject({ mode: 'soloSurvival', timeLimit: 60 });
});
test('혼자 하기: 제한 시간은 서바이벌에서만 고른다', async () => {
  render(<Setup kind="solo" onStart={() => {}} onBack={() => {}} />);
  await waitLoaded();
  fireEvent.click(screen.getByRole('radio', { name: '몬스터 사냥' }));
  expect(screen.queryByRole('group', { name: '제한 시간' })).not.toBeInTheDocument();
});
test('혼자 하기: 기록이 없으면 스테이지는 1단계만', async () => {
  render(<Setup kind="solo" onStart={() => {}} onBack={() => {}} />);
  await waitLoaded();
  fireEvent.click(screen.getByRole('radio', { name: '스테이지 도전' }));
  expect(within(screen.getByRole('group', { name: '단계' })).getAllByRole('radio')).toHaveLength(1);
});
test('혼자 하기: 서바이벌은 아이템이 켜져 있다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  await waitLoaded();
  expect(await startWith(onStart)).toMatchObject({ mode: 'soloSurvival', rules: { combo: false, finalRound: false, items: true } });
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

test('처음에는 자음이 골라져 있고, 글자 수는 고를 수 있는 범위의 가운데 값이다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  expect(screen.getByRole('radio', { name: '자음' })).toBeChecked();
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '7'));
  expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveValue('5');
  const cfg = await startWith(onStart);
  expect(cfg.set.kind).toBe('consonant');
  expect(cfg.players.map((p: PlayerConfig) => p.cardSize)).toEqual([5, 5]);
});
test('글자 세트(받침 없음)는 이중모음을 빼서 카드당 최대 5개이고 기본은 가운데인 4개다', async () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '글자' }));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveValue('4'));
  await waitFor(() => expect(screen.getByRole('slider', { name: '플레이어 1 글자 수' })).toHaveAttribute('max', '5'));
});
test('글자 세트의 초성은 팝업에서 토글 버튼으로 고른다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '글자' }));
  const initials = within(within(screen.getByRole('dialog', { name: '초성 고르기' })).getByRole('group', { name: '초성' }));
  expect(initials.getAllByRole('radio')).toHaveLength(INITIALS.length);
  fireEvent.click(initials.getByRole('radio', { name: 'ㄴ' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: '초성 고르기' })).toHaveTextContent('ㄴ');
  fireEvent.click(screen.getByRole('switch', { name: '받침 있는 글자' }));
  await startWith(onStart);
  expect(onStart.mock.calls[0][0].set).toEqual({ kind: 'syllable', initial: 'ㄴ', batchim: true });
});
test('글자 세트를 고르면 초성 팝업이 바로 열린다', () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  expect(screen.queryByRole('button', { name: '초성 고르기' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('radio', { name: '글자' }));
  expect(screen.getByRole('dialog', { name: '초성 고르기' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
test('켜고 끄는 설정은 스위치로 보여준다', () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByRole('switch', { name: '읽어주기' })).toBeChecked();
  fireEvent.click(screen.getByRole('radio', { name: '자음' }));
  expect(screen.getByRole('switch', { name: '쌍자음 포함' })).not.toBeChecked();
});
test('혼자 하기는 중앙 카드를 돌리지 않는 것이 기본이다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="solo" onStart={onStart} onBack={() => {}} />);
  expect(within(screen.getByRole('group', { name: '중앙 회전' })).getByRole('radio', { name: '안 돌림' })).toBeChecked();
  await startWith(onStart);
  expect(onStart.mock.calls[0][0].rotationStep).toBe(0);
});
test('같이 하기는 중앙 카드를 90°씩 돌리는 것이 기본이다', async () => {
  const onStart = vi.fn();
  render(<Setup kind="versus" onStart={onStart} onBack={() => {}} />);
  await startWith(onStart);
  expect(onStart.mock.calls[0][0].rotationStep).toBe(90);
});
test('이름 입력칸 길이는 이름 길이에 맞춰 늘고 준다', () => {
  render(<Setup kind="versus" onStart={() => {}} onBack={() => {}} />);
  const input = screen.getByLabelText('플레이어 1 이름') as HTMLInputElement;
  const width = () => parseFloat(input.style.width);
  fireEvent.change(input, { target: { value: '민' } });
  const short = width();
  fireEvent.change(input, { target: { value: '민지네 큰언니' } });
  expect(width()).toBeGreaterThan(short);
  fireEvent.change(input, { target: { value: 'Al' } });
  expect(width()).toBeLessThan(short + 0.01 + 1);
});
test('설정 화면은 1024×768 기준으로 그리고 기기 화면에 맞게 통째로 줄이거나 키운다', () => {
  expect(fitSetup(1024, 768)).toEqual({ zoom: 1, width: 1024, height: 768 });
  // 작은 화면: 줄여서 그리되 안쪽 배치는 기준 너비를 그대로 쓴다
  expect(fitSetup(800, 720)).toEqual({ zoom: 0.78125, width: 1024, height: 921.6 });
  // 옆으로 긴 화면: 높이에 맞춘다
  expect(fitSetup(1600, 768)).toEqual({ zoom: 1, width: 1600, height: 768 });
  expect(fitSetup(0, 0).zoom).toBe(1);
});
