import { render, screen } from '@testing-library/react';
import type { SymbolDef } from '../../content/types';
import type { Placement } from '../../engine/layout';
import type { SeatGeom } from '../../engine/seats';
import type { CoopState } from '../../engine/state';
import { CoopPanel } from './CoopPanel';
import { Monster } from './Monster';
import { SeatView } from './SeatView';

const base: CoopState = {
  stage: 2, hearts: 2, hp: 7, maxHp: 24, attackLeft: 9000, attackCount: 0, answered: [false, false], challenge: null,
  mission: { text: '모음 ㅗ가 들어간 글자 3번 찾기', ids: ['ko-s:고'], target: 3, progress: 1, reward: 'heal', done: false }, symbols: [],
};
const ko: SymbolDef = { id: 'ko-s:가', display: { kind: 'text', value: '가' }, speech: '가', lang: 'ko-KR', tags: {} };
const geom: SeatGeom = {
  index: 0, facing: 0, badge: { x: 380, y: 650, w: 110, h: 56 },
  region: { ellipse: { cx: 700, cy: 768, rx: 300, ry: 300 }, clip: { x: 0, y: 0, w: 1024, h: 768 } },
};
const pls: Placement[] = [{ x: 600, y: 650, size: 70, rotation: 0 }];
const baseSeatProps = {
  index: 0, geom, color: 'pink' as const, symbols: [ko], placements: pls, score: 0, name: '민지', showName: false,
  locked: false, flash: null, correctSymbol: null, onTap: () => {},
};

test('몬스터 체력, 하트, 공격 시간, 미션을 보여준다', () => {
  render(<CoopPanel coop={base} attackEvery={18000} banner={null} />);
  expect(screen.getByLabelText('몬스터 체력 7/24')).toBeInTheDocument();
  expect(screen.getByLabelText('하트 2')).toBeInTheDocument();
  expect(screen.getByLabelText('공격까지 9초')).toBeInTheDocument();
  expect(screen.getByText('모음 ㅗ가 들어간 글자 3번 찾기')).toBeInTheDocument();
  expect(screen.getByText('1/3')).toBeInTheDocument();
  expect(screen.getByText('2단계')).toBeInTheDocument();
});
test('미션을 끝내면 완료!를 보여준다', () => {
  render(<CoopPanel coop={{ ...base, mission: { ...base.mission, progress: 3, done: true } }} attackEvery={18000} banner={null} />);
  expect(screen.getByText('완료!')).toBeInTheDocument();
});
test('원소 순서 챌린지는 지금 차례를 강조한다', () => {
  const coop = { ...base, challenge: { kind: 'elements' as const, timeLeft: 8000, sequence: [1, 0, 3], step: 1, target: 3, count: 0 } };
  render(<CoopPanel coop={coop} attackEvery={18000} banner="공격 준비!" />);
  const steps = screen.getAllByTestId('element-step');
  expect(steps).toHaveLength(3);
  expect(steps[1]).toHaveClass('is-current');
  expect(steps[0]).toHaveClass('is-done');
  expect(screen.getByText('공격 준비!')).toBeInTheDocument();
});
test('공동 목표 챌린지는 카운트를 보여준다', () => {
  const coop = { ...base, challenge: { kind: 'quota' as const, timeLeft: 6500, sequence: [], step: 0, target: 6, count: 2 } };
  render(<CoopPanel coop={coop} attackEvery={18000} banner={null} />);
  expect(screen.getByText('2/6')).toBeInTheDocument();
});
test('몬스터 색은 단계마다 바뀐다', () => {
  const { container, rerender } = render(<Monster stage={1} size={60} />);
  const first = container.querySelector('[data-part="body"]')!.getAttribute('fill');
  rerender(<Monster stage={2} size={60} />);
  expect(container.querySelector('[data-part="body"]')!.getAttribute('fill')).not.toBe(first);
});
test('자리에 원소 아이콘과 흐림 상태를 표시하고, 점수를 숨길 수 있다', () => {
  render(<SeatView {...baseSeatProps} score={7} elements={[0, 2]} dim hideScore />);
  expect(screen.getByText('🔥')).toBeInTheDocument();
  expect(screen.getByText('🌿')).toBeInTheDocument();
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-dim');
  expect(screen.queryByText('7')).not.toBeInTheDocument();
});
