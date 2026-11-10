import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { syllableSymbols } from '../../content/hangul';
import { MODES } from '../../engine/modes';
import { createGame, reduce } from '../../engine/reducer';
import { testConfig } from '../../engine/testConfig';
import { DEFAULT_BOMB, NO_RULES, type GameConfig } from '../../engine/state';
import { speak } from '../../services/speech';
import { Game } from './Game';

vi.mock('../../services/speech', () => ({ speak: vi.fn() }));

// 카드당 8개까지 쓰는 테스트가 있어 받침 있는 세트(42개)를 쓴다
const symbols = syllableSymbols('ㄱ', true);
const pool = symbols.map(s => s.id);
const duoCfg: GameConfig = {
  mode: 'score', players: [{ name: 'A', color: 'pink', cardSize: 5 }, { name: 'B', color: 'sky', cardSize: 5 }],
  set: { kind: 'syllable', initial: 'ㄱ', batchim: false }, rotationStep: 90, symbolRotation: false, speech: true, scoreRounds: 20, seed: 3, rules: NO_RULES, teams: null, bomb: DEFAULT_BOMB,
};

beforeEach(() => { window.innerWidth = 1024; window.innerHeight = 768; });

test('정답 글자를 누르면 점수가 오르고 음성이 나온다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  const answer = createGame(duoCfg, pool, MODES).round.answers[0];
  fireEvent.pointerDown(screen.getByTestId('seat-0').querySelector(`[data-symbol="${answer}"]`)!);
  expect(speak).toHaveBeenCalled();
  expect(screen.getByTestId('score-0')).toHaveTextContent('1');
});
test('점수제에서는 공용 정보 칸에 라운드를 보여준다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByText('1/20').length).toBe(2);
});
test('오답을 누르면 그 자리가 잠긴다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  const g = createGame(duoCfg, pool, MODES);
  const wrong = g.round.cards[0].find(id => id !== g.round.answers[0])!;
  fireEvent.pointerDown(screen.getByTestId('seat-0').querySelector(`[data-symbol="${wrong}"]`)!);
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-locked');
});
test('정답 직후 이전 카드가 보이는 동안의 터치는 새 라운드 기준으로 판정하지 않는다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  const g = createGame(duoCfg, pool, MODES);
  fireEvent.pointerDown(screen.getByTestId('seat-0').querySelector(`[data-symbol="${g.round.answers[0]}"]`)!);
  for (const id of g.round.cards[1]) {
    const el = screen.getByTestId('seat-1').querySelector(`[data-symbol="${id}"]`);
    if (el) fireEvent.pointerDown(el);
  }
  expect(screen.getByTestId('seat-1').querySelector('.seat-region')).not.toHaveClass('is-locked');
  expect(screen.getByTestId('score-1')).toHaveTextContent('0');
});
test('서바이벌에서는 공용 정보 칸에 남은 초를 짧게 보여준다', () => {
  render(<Game config={{ ...duoCfg, mode: 'soloSurvival', players: [duoCfg.players[0]] }} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByText('40초')).toBeInTheDocument();
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
    const g = createGame(cfg, pool, MODES);
    const r = reduce(g, { type: 'TAP', player: 0, symbol: g.round.answers[0], round: 0 }, MODES);
    if (r.state.players[0].item === 'freeze') found = cfg;
  }
  expect(found).not.toBeNull();
  render(<Game config={found!} symbols={symbols} onOver={() => {}} />);
  tapSeat(0, createGame(found!, pool, MODES).round.answers[0]);
  fireEvent.pointerDown(screen.getByRole('button', { name: '얼리기' }));
  expect(screen.getByTestId('seat-1').querySelector('.seat-region')).toHaveClass('is-locked');
  expect(screen.queryByRole('button', { name: '얼리기' })).not.toBeInTheDocument();
});
test('폭탄 대상 고르기 버튼이 맞힌 사람 자리에 뜨고, 누르면 사라진다', () => {
  const players = [...testConfig().players, { name: 'C', color: 'yellow' as const, cardSize: 5 }];
  const cfg = testConfig({ mode: 'bomb', players, bomb: { startHand: 3, target: 'choose' } });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
  const pick = within(screen.getByTestId('seat-0')).getByRole('button', { name: 'C에게' });
  fireEvent.pointerDown(pick);
  expect(within(screen.getByTestId('seat-0')).queryByRole('button', { name: 'C에게' })).not.toBeInTheDocument();
  expect(screen.getByTestId('score-2')).toHaveTextContent('4');
});
test('폭탄 돌리기: 정보 칸에 규칙을 적고, 맞히면 카드가 받는 사람에게 날아간다', () => {
  const cfg = testConfig({ mode: 'bomb', bomb: { startHand: 3, target: 'random' } });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByText(/맞히면 카드를 넘겨요/)).toHaveLength(2);
  expect(screen.getByTestId('cards-0')).toHaveTextContent('▮▮▮');
  expect(screen.queryByTestId('give-card')).not.toBeInTheDocument();
  tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
  expect(screen.getAllByTestId('give-card').length).toBeGreaterThan(0);
  expect(screen.getByTestId('cards-0')).toHaveTextContent('▮▮');
});
test('협동: 불 게이지를 정보 칸 밖에 양쪽으로 크게 보여준다', () => {
  const players = ['pink', 'sky', 'yellow', 'lime'].map((c, i) => ({ name: `P${i}`, color: c as 'pink', cardSize: 5 }));
  render(<Game config={testConfig({ mode: 'coop', players })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByTestId('fire-gauge')).toHaveLength(2);
  expect(screen.getAllByLabelText(/불 공격까지 \d+초/)).toHaveLength(2);
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
    tapSeat(0, createGame(duoCfg, pool, MODES).round.answers[0]);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  } finally {
    vi.useRealTimers();
  }
});
test('서바이벌: 정답 강조를 보여주는 동안에는 시간이 줄지 않아 +5초가 그대로 남는다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
    render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
    act(() => { vi.advanceTimersByTime(16); });
    tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getAllByText('45초').length).toBeGreaterThan(0);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getAllByText('44초').length).toBeGreaterThan(0);
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
    tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
    expect(onOver).not.toHaveBeenCalled();
    expect(screen.getByTestId('seat-0').querySelector('.glyph--hit')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onOver).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

test('협동: 한 명이 맞히면 거북이 체력이 줄고 그 자리가 흐려진다', () => {
  const cfg = testConfig({ mode: 'coop' });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByLabelText('거북이 체력 16/16').length).toBeGreaterThan(0);
  tapSeat(0, createGame(cfg, pool, MODES, symbols).round.answers[0]);
  expect(screen.getAllByLabelText('거북이 체력 15/16').length).toBeGreaterThan(0);
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-dim');
});
test('협동: 공격 시간이 되면 거북이가 한 사람에게 불을 뿜고, 무슨 일인지 문구로 알려 준다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    render(<Game config={testConfig({ mode: 'coop' })} symbols={symbols} onOver={() => {}} />);
    // 공격 간격은 8~12초 사이에서 정해지므로, 불이 붙을 때까지 조금씩 흘린다
    for (let t = 0; t < 13000 && !document.querySelector('.seat-region.is-burning'); t += 200) act(() => { vi.advanceTimersByTime(200); });
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/악당 거북이가 .+에게 불을 뿜었어요/);
    expect(document.querySelectorAll('.seat-region.is-burning')).toHaveLength(1);
    // 먼저 고개를 돌리고, 다 돌린 뒤에 불이 나간다
    expect(screen.queryByTestId('fire-beam')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByTestId('fire-beam')).toBeInTheDocument();
  } finally { vi.useRealTimers(); }
});
test('협동 1인: 정보 칸 하나이고 이름에 점수 숫자가 없다', () => {
  render(<Game config={testConfig({ mode: 'coop', players: [testConfig().players[0]] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getAllByLabelText(/거북이 체력/)).toHaveLength(1);
  expect(screen.queryByTestId('score-0')).not.toBeInTheDocument();
});
test('협동: 라운드가 안 바뀌는 정답에도 노란 정답 강조가 나온다', () => {
  const cfg = testConfig({ mode: 'coop' });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
  const ans = createGame(cfg, pool, MODES, symbols).round.answers[0];
  tapSeat(0, ans);
  expect(screen.getByTestId('seat-0').querySelector(`[data-symbol="${ans}"]`)).toHaveClass('glyph--hit');
});

test('서바이벌: 맞히면 판정과 점수가 정보 칸에 나온다', () => {
  const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
  render(<Game config={cfg} symbols={symbols} onOver={() => {}} best={20} />);
  expect(screen.getByText('최고 20점')).toBeInTheDocument();
  tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
  expect(screen.getByText('Perfect')).toBeInTheDocument();
  expect(screen.getByText('3점')).toBeInTheDocument();
});
test('서바이벌: 5연속이면 피버 효과가 켜진다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
    render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
    let g = createGame(cfg, pool, MODES);
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
  tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
  expect(screen.getByTestId('score-0')).toHaveTextContent('1');
});

test('나가기를 누르면 확인 창이 뜨고, 그만하기를 누르면 onExit을 부른다', () => {
  const onExit = vi.fn();
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} onExit={onExit} />);
  fireEvent.click(screen.getByRole('button', { name: '나가기' }));
  expect(screen.getByRole('dialog', { name: '게임을 그만할까요?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(onExit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '나가기' }));
  fireEvent.click(screen.getByRole('button', { name: '그만하기' }));
  expect(onExit).toHaveBeenCalled();
});
test('나가기 확인 창이 떠 있는 동안 게임 시간이 흐르지 않는다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    render(<Game config={{ ...duoCfg, mode: 'soloSurvival', players: [duoCfg.players[0]] }} symbols={symbols} onOver={() => {}} onExit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '나가기' }));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(screen.getByText('40초')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '계속하기' }));
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByText('40초')).not.toBeInTheDocument();
  } finally { vi.useRealTimers(); }
});
test('정답을 맞히면 화면 가장자리가 맞힌 사람 색으로 반짝인다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.queryByTestId('edge-flash')).not.toBeInTheDocument();
  tapSeat(1, createGame(duoCfg, pool, MODES).round.answers[1]);
  expect(screen.getByTestId('edge-flash')).toHaveAttribute('data-player', '1');
});
test('협동: 중앙 카드는 악당 거북이 등껍질이다', () => {
  render(<Game config={testConfig({ mode: 'coop' })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByRole('img', { name: '1단계 악당 거북이' })).toBeInTheDocument();
  expect(screen.getByTestId('center-card')).toHaveClass('center-card--shell');
});
test('혼자 하기: 자리는 거북이 뒷모습이다', () => {
  render(<Game config={testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] })} symbols={symbols} onOver={() => {}} />);
  expect(screen.getByTestId('turtle-back-0')).toBeInTheDocument();
});

test('혼자 하기: 하늘·바다 장면이 나오고, 맞히면 해(중앙 카드)가 오른쪽으로 조금 움직인다', () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'] });
  try {
    const cfg = testConfig({ mode: 'soloSurvival', players: [testConfig().players[0]] });
    render(<Game config={cfg} symbols={symbols} onOver={() => {}} />);
    expect(screen.getByTestId('sky')).toHaveAttribute('data-body', 'sun');
    expect(screen.queryByTestId('patterns')).not.toBeInTheDocument();
    const card = () => screen.getByTestId('center-card');
    expect(card()).toHaveClass('center-card--sun');
    const before = parseFloat(card().style.left);
    tapSeat(0, createGame(cfg, pool, MODES).round.answers[0]);
    act(() => { vi.advanceTimersByTime(450); });
    expect(parseFloat(card().style.left)).toBeGreaterThan(before);
  } finally { vi.useRealTimers(); }
});
test('같이 하기: 배경 무늬가 있고 정답마다 다음 무늬로 바뀐다', () => {
  render(<Game config={duoCfg} symbols={symbols} onOver={() => {}} />);
  expect(screen.queryByTestId('sky')).not.toBeInTheDocument();
  expect(screen.getByTestId('pattern-wave')).toHaveClass('is-on');
  tapSeat(0, createGame(duoCfg, pool, MODES).round.answers[0]);
  expect(screen.getByTestId('pattern-wave')).not.toHaveClass('is-on');
  expect(screen.getByTestId('pattern-dot')).toHaveClass('is-on');
});
