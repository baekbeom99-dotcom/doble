import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { syllableSymbols } from '../../content/hangul';
import { MODES } from '../../engine/modes';
import { createGame, reduce } from '../../engine/reducer';
import { testConfig } from '../../engine/testConfig';
import { DEFAULT_BOMB, NO_RULES, type GameConfig } from '../../engine/state';
import { speak } from '../../services/speech';
import { Game } from './Game';

vi.mock('../../services/speech', () => ({ speak: vi.fn() }));

const symbols = syllableSymbols('ㄱ', false);
const pool21 = symbols.map(s => s.id);
const duoCfg: GameConfig = {
  mode: 'score', players: [{ name: 'A', color: 'pink', cardSize: 5 }, { name: 'B', color: 'sky', cardSize: 5 }],
  set: { kind: 'syllable', initial: 'ㄱ', batchim: false }, rotationStep: 90, symbolRotation: false, speech: true, scoreRounds: 20, seed: 3, rules: NO_RULES, teams: null, bomb: DEFAULT_BOMB,
};

beforeEach(() => { window.innerWidth = 1024; window.innerHeight = 768; });

test('정답 글자를 누르면 점수가 오르고 음성이 나온다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  const answer = createGame(duoCfg, pool21, MODES).round.answers[0];
  fireEvent.pointerDown(screen.getByTestId('seat-0').querySelector(`[data-symbol="${answer}"]`)!);
  expect(speak).toHaveBeenCalled();
  expect(within(screen.getByTestId('badge-0')).getByText('1')).toBeInTheDocument();
});
test('점수제에서는 공용 정보 칸에 라운드를 보여준다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByText('1/20').length).toBe(2);
});
test('오답을 누르면 그 자리가 잠긴다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  const g = createGame(duoCfg, pool21, MODES);
  const wrong = g.round.cards[0].find(id => id !== g.round.answers[0])!;
  fireEvent.pointerDown(screen.getByTestId('seat-0').querySelector(`[data-symbol="${wrong}"]`)!);
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-locked');
});
test('정답 직후 이전 카드가 보이는 동안의 터치는 새 라운드 기준으로 판정하지 않는다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  const g = createGame(duoCfg, pool21, MODES);
  fireEvent.pointerDown(screen.getByTestId('seat-0').querySelector(`[data-symbol="${g.round.answers[0]}"]`)!);
  for (const id of g.round.cards[1]) {
    const el = screen.getByTestId('seat-1').querySelector(`[data-symbol="${id}"]`);
    if (el) fireEvent.pointerDown(el);
  }
  expect(screen.getByTestId('seat-1').querySelector('.seat-region')).not.toHaveClass('is-locked');
  expect(within(screen.getByTestId('badge-1')).getByText('0')).toBeInTheDocument();
});
test('서바이벌에서는 공용 정보 칸에 남은 초를 짧게 보여준다', () => {
  render(<Game config={{ ...duoCfg, mode: 'soloSurvival', players: [duoCfg.players[0]] }} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByText('30초')).toBeInTheDocument();
});
test('작은 화면에서 4명·8개·심볼 회전이어도 게임 화면이 그려진다', () => {
  window.innerWidth = 960; window.innerHeight = 600;
  const cfg: GameConfig = {
    ...duoCfg, symbolRotation: true,
    players: ['pink', 'sky', 'yellow', 'lime'].map((color, i) => ({ name: `P${i}`, color: color as 'pink', cardSize: 8 })),
  };
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByTestId('center-card').querySelectorAll('[data-symbol]')).toHaveLength(8);
});
test('중앙 카드의 글자는 바닥 띠에서 8px 이상 떨어져 있다', () => {
  render(<Game config={{ ...duoCfg, players: duoCfg.players.map(p => ({ ...p, cardSize: 8 })) }} symbols={symbols} onOver={() => {}} />);
  const card = screen.getByTestId('center-card');
  const diameter = parseFloat(card.style.width);
  const bandTop = diameter * (1 - 0.15);
  const glyphs = [...card.querySelectorAll<HTMLElement>('[data-symbol]')];
  expect(glyphs).toHaveLength(8);
  for (const g of glyphs) expect(parseFloat(g.style.top) + parseFloat(g.style.height)).toBeLessThanOrEqual(bandTop - 8);
});

const tapSeat = (seat: number, symbol: string) =>
  fireEvent.pointerDown(screen.getByTestId(`seat-${seat}`).querySelector(`[data-symbol="${symbol}"]`)!);

test('아이템을 얻어 얼리기를 쓰면 상대 자리가 잠긴다', () => {
  const rules = { combo: false, finalRound: false, items: true };
  let found: GameConfig | null = null;
  for (let seed = 0; seed < 200 && !found; seed++) {
    const cfg = testConfig({ seed, rules });
    const g = createGame(cfg, pool21, MODES);
    const r = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, MODES);
    if (r.state.players[0].item === 'freeze') found = cfg;
  }
  expect(found).not.toBeNull();
  render(<Game config={found!} symbols={symbols} onOver={() => {}} />);
  tapSeat(0, createGame(found!, pool21, MODES).round.answers[0]);
  fireEvent.pointerDown(screen.getByRole('button', { name: '얼리기' }));
  expect(screen.getByTestId('seat-1').querySelector('.seat-region')).toHaveClass('is-locked');
  expect(screen.queryByRole('button', { name: '얼리기' })).not.toBeInTheDocument();
});
test('폭탄 대상 고르기 버튼이 맞힌 사람 자리에 뜨고, 누르면 사라진다', () => {
  const players = [...testConfig().players, { name: 'C', color: 'yellow' as const, cardSize: 5 }];
  const cfg = testConfig({ mode: 'bomb', players, bomb: { startHand: 3, target: 'choose' } });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  tapSeat(0, createGame(cfg, pool21, MODES).round.answers[0]);
  const pick = within(screen.getByTestId('seat-0')).getByRole('button', { name: 'C에게' });
  fireEvent.pointerDown(pick);
  expect(within(screen.getByTestId('seat-0')).queryByRole('button', { name: 'C에게' })).not.toBeInTheDocument();
  expect(within(screen.getByTestId('badge-2')).getByText('4')).toBeInTheDocument();
});
test('팀전 정보 칸에 팀 합계를 보여준다', () => {
  const players = ['pink', 'sky', 'yellow', 'lime'].map((c, i) => ({ name: `P${i}`, color: c as 'pink', cardSize: 5 }));
  render(<Game config={testConfig({ players, teams: [0, 0, 1, 1] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByText('A 0 : 0 B')).toHaveLength(2);
});
test('막판 3배가 켜져 있으면 마지막 라운드에 ×3을 보여준다', () => {
  render(<Game config={testConfig({ scoreRounds: 1, rules: { combo: false, finalRound: true, items: false } })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByText(/×3/)).toHaveLength(2);
});
test('게임 화면을 떠나면 남은 타이머를 모두 정리한다', () => {
  vi.useFakeTimers();
  try {
    const { unmount } = render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
    tapSeat(0, createGame(duoCfg, pool21, MODES).round.answers[0]);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
test('서바이벌: 정답 강조를 보여주는 동안에는 시간이 줄지 않아 +1초가 그대로 남는다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
    render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
    act(() => { vi.advanceTimersByTime(16); });
    tapSeat(0, createGame(cfg, pool21, MODES).round.answers[0]);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getAllByText('31초').length).toBeGreaterThan(0);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getAllByText('30초').length).toBeGreaterThan(0);
  } finally {
    vi.useRealTimers();
  }
});
test('마지막 정답의 강조 표시를 보여준 뒤에 결과 화면으로 넘어간다', () => {
  vi.useFakeTimers();
  try {
    const onOver = vi.fn();
    const cfg = testConfig({ scoreRounds: 1 });
    render(<Game config={cfg} symbols={symbols} onOver={onOver} />);
    tapSeat(0, createGame(cfg, pool21, MODES).round.answers[0]);
    expect(onOver).not.toHaveBeenCalled();
    expect(screen.getByTestId('seat-0').querySelector('.glyph--hit')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onOver).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

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
    act(() => { vi.advanceTimersByTime(20300); });
    expect(screen.getAllByText('공격 준비!').length).toBeGreaterThan(0);
  } finally { vi.useRealTimers(); }
});
test('협동 1인: 정보 칸 하나와 원소 4개, 배지에 점수 숫자가 없다', () => {
  render(<Game config={testConfig({ mode: 'coop', players: [testConfig().players[0]] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByLabelText(/몬스터 체력/)).toHaveLength(1);
  ['🔥', '💧', '🌿', '⚡'].forEach(icon => expect(within(screen.getByTestId('seat-0')).getByText(icon)).toBeInTheDocument());
  expect(within(screen.getByTestId('badge-0')).queryByText('0')).not.toBeInTheDocument();
});
test('협동: 라운드가 안 바뀌는 정답에도 노란 정답 강조가 나온다', () => {
  const cfg = testConfig({ mode: 'coop' });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  const ans = createGame(cfg, pool21, MODES, symbols).round.answers[0];
  tapSeat(0, ans);
  expect(screen.getByTestId('seat-0').querySelector(`[data-symbol="${ans}"]`)).toHaveClass('glyph--hit');
});

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
      act(() => { vi.advanceTimersByTime(450); });
    }
    expect(document.querySelector('.table')).toHaveClass('is-fever');
  } finally { vi.useRealTimers(); }
});
test('스테이지 도전: 진행 수를 보여준다', () => {
  render(<Game config={testConfig({ mode: 'soloStage', stage: 1, players: [testConfig().players[0]] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByText('0/7')).toBeInTheDocument();
});
test('스테이지 도전: 자리 배지에 맞힌 수가 나온다', () => {
  const cfg = testConfig({ mode: 'soloStage', stage: 1, players: [testConfig().players[0]] });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  tapSeat(0, createGame(cfg, pool21, MODES).round.answers[0]);
  expect(within(screen.getByTestId('badge-0')).getByText('1')).toBeInTheDocument();
});
