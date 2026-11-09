import { fireEvent, render, screen, within } from '@testing-library/react';
import { syllableSymbols } from '../../content/hangul';
import { MODES } from '../../engine/modes';
import { createGame } from '../../engine/reducer';
import type { GameConfig } from '../../engine/state';
import { speak } from '../../services/speech';
import { Game } from './Game';

vi.mock('../../services/speech', () => ({ speak: vi.fn() }));

const symbols = syllableSymbols('ㄱ', false);
const pool21 = symbols.map(s => s.id);
const duoCfg: GameConfig = {
  mode: 'score', players: [{ name: 'A', color: 'pink', cardSize: 5 }, { name: 'B', color: 'sky', cardSize: 5 }],
  set: { kind: 'syllable', initial: 'ㄱ', batchim: false }, rotationStep: 90, symbolRotation: false, speech: true, scoreRounds: 20, seed: 3,
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
