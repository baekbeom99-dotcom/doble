import { render, screen } from '@testing-library/react';
import type { SymbolDef } from '../../content/types';
import type { Placement } from '../../engine/layout';
import type { SeatGeom } from '../../engine/seats';
import type { CoopState } from '../../engine/state';
import { CoopPanel } from './CoopPanel';
import { SeatView } from './SeatView';
import { VillainTurtle } from './VillainTurtle';

const base: CoopState = {
  stage: 2, hearts: 2, hp: 7, maxHp: 24, attackLeft: 9000, attackTotal: 10000, attackCount: 0, answered: [false, false], fire: null,
  mission: { text: '모음 ㅗ가 들어간 글자 3번 찾기', ids: ['ko-s:고'], target: 3, progress: 1, reward: 'heal', done: false }, symbols: [],
};
const names = ['민지', '준호'];
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

test('거북이 체력, 하트, 불 공격까지 남은 시간, 미션을 보여준다', () => {
  render(<CoopPanel coop={base} names={names} message={null} />);
  expect(screen.getByLabelText('거북이 체력 7/24')).toBeInTheDocument();
  expect(screen.getByLabelText('하트 2')).toBeInTheDocument();
  expect(screen.getByLabelText('불 공격까지 9초')).toBeInTheDocument();
  expect(screen.getByText('모음 ㅗ가 들어간 글자 3번 찾기')).toBeInTheDocument();
  expect(screen.getByText('1/3')).toBeInTheDocument();
  expect(screen.getByText('2단계')).toBeInTheDocument();
});
test('미션을 끝내면 완료!를 보여준다', () => {
  render(<CoopPanel coop={{ ...base, mission: { ...base.mission, progress: 3, done: true } }} names={names} message={null} />);
  expect(screen.getByText('완료!')).toBeInTheDocument();
});
test('불 공격 중에는 누구를 구하는 중인지와 진행 수, 남은 초를 보여준다', () => {
  render(<CoopPanel coop={{ ...base, fire: { target: 1, got: 1, timeLeft: 3200 } }} names={names} message={null} />);
  expect(screen.getByText('준호 구하기 1/2')).toBeInTheDocument();
  expect(screen.getByText('4초')).toBeInTheDocument();
});
test('상황 문구를 띠로 보여준다', () => {
  render(<CoopPanel coop={base} names={names} message="준호를 구했어요!" />);
  expect(screen.getByRole('status')).toHaveTextContent('준호를 구했어요!');
});
test('악당 거북이는 단계마다 몸 색이 바뀌고, 머리 방향만큼 돈다', () => {
  const circle = { cx: 512, cy: 384, rx: 130, ry: 130 };
  const { container, rerender } = render(<VillainTurtle stage={1} circle={circle} heading={0} mood="idle" />);
  const first = container.querySelector('[data-part="body"]')!.getAttribute('fill');
  rerender(<VillainTurtle stage={2} circle={circle} heading={90} mood="angry" />);
  expect(container.querySelector('[data-part="body"]')!.getAttribute('fill')).not.toBe(first);
  expect(screen.getByTestId('villain-turtle')).toHaveStyle({ transform: 'rotate(90deg)' });
  expect(screen.getByRole('img', { name: '2단계 악당 거북이' })).toBeInTheDocument();
});
test('불을 맞은 자리는 표시되고 누를 수 없으며, 흐림 상태와 점수 숨김도 된다', () => {
  const onTap = vi.fn();
  render(<SeatView {...baseSeatProps} onTap={onTap} burning dim hideScore score={7} showName namePath="M0 0 A1 1 0 0 1 10 0" />);
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-burning');
  expect(screen.getByTestId('seat-0').querySelector('.seat-region')).toHaveClass('is-dim');
  expect(screen.queryByTestId('score-0')).not.toBeInTheDocument();
});
