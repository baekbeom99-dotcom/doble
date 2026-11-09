import { render, screen } from '@testing-library/react';
import { MODES } from '../../engine/modes';
import { createGame } from '../../engine/reducer';
import type { GameConfig } from '../../engine/state';
import { Result } from './Result';

const pool = Array.from({ length: 21 }, (_, i) => `s${i}`);
const base: GameConfig = {
  mode: 'score', players: [{ name: '민지', color: 'pink', cardSize: 5 }, { name: '아빠', color: 'sky', cardSize: 5 }, { name: '엄마', color: 'lime', cardSize: 5 }],
  set: { kind: 'consonant', includeDouble: false }, rotationStep: 90, symbolRotation: false, speech: false, scoreRounds: 20, seed: 1,
};

test('점수제는 순위를 보여주고 동점 1등은 함께 우승', () => {
  const s = createGame(base, pool, MODES);
  const final = { ...s, players: [{ score: 5, lockedUntil: 0 }, { score: 7, lockedUntil: 0 }, { score: 7, lockedUntil: 0 }] };
  render(<Result state={final} onRetry={() => {}} onHome={() => {}} />);
  const items = screen.getAllByRole('listitem').map(li => li.textContent);
  expect(items[0]).toContain('아빠'); expect(items[0]).toContain('우승');
  expect(items[1]).toContain('엄마'); expect(items[1]).toContain('우승');
  expect(items[2]).toContain('민지'); expect(items[2]).not.toContain('우승');
});
test('서바이벌은 찾은 개수를 보여준다', () => {
  const s = createGame({ ...base, mode: 'soloSurvival', players: [base.players[0]] }, pool, MODES);
  render(<Result state={{ ...s, mode: { ...s.mode, correct: 12 } }} onRetry={() => {}} onHome={() => {}} />);
  expect(screen.getByText('12개 찾았어요')).toBeInTheDocument();
});
