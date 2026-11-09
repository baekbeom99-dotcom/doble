import { fireEvent, render, screen } from '@testing-library/react';
import type { SymbolDef } from '../../content/types';
import type { Placement } from '../../engine/layout';
import type { SeatGeom } from '../../engine/seats';
import { CenterCard } from './CenterCard';
import { Glyph } from './Glyph';
import { Hud } from './Hud';
import { SeatView } from './SeatView';

const ko: SymbolDef = { id: 'ko-s:가', display: { kind: 'text', value: '가' }, speech: '가', lang: 'ko-KR', tags: {} };
const ko2: SymbolDef = { id: 'ko-s:고', display: { kind: 'text', value: '고' }, speech: '고', lang: 'ko-KR', tags: {} };
const en: SymbolDef = { id: 'en:A', display: { kind: 'text', value: 'A' }, speech: 'A', lang: 'en-US', tags: {} };
const p: Placement = { x: 100, y: 100, size: 60, rotation: 0 };
const geom: SeatGeom = {
  index: 0,
  region: { ellipse: { cx: 700, cy: 768, rx: 300, ry: 300 }, clip: { x: 0, y: 0, w: 1024, h: 768 } },
  facing: 0,
  badge: { x: 380, y: 650, w: 110, h: 56 },
};
const syms = [ko, ko2];
const pls: Placement[] = [{ x: 600, y: 650, size: 70, rotation: 0 }, { x: 750, y: 600, size: 50, rotation: 0 }];

test('글자를 pointerdown하면 onTap에 id를 넘긴다', () => {
  const onTap = vi.fn();
  render(<SeatView index={0} geom={geom} color="pink" symbols={syms} placements={pls} score={3} name="민지" showName
    locked={false} flash={null} correctSymbol={null} onTap={onTap} />);
  fireEvent.pointerDown(document.querySelector('[data-symbol="ko-s:가"]')!);
  expect(onTap).toHaveBeenCalledWith('ko-s:가');
  expect(screen.getByText('민지')).toBeInTheDocument();
  expect(screen.getByText('3')).toBeInTheDocument();
  expect(screen.getByTestId('seat-0')).toBeInTheDocument();
  expect(screen.getByTestId('badge-0')).toBeInTheDocument();
});
test('잠긴 상태에서는 onTap을 부르지 않는다', () => {
  const onTap = vi.fn();
  render(<SeatView index={0} geom={geom} color="pink" symbols={syms} placements={pls} score={0} name="A" showName={false}
    locked flash={null} correctSymbol={null} onTap={onTap} />);
  fireEvent.pointerDown(document.querySelector('[data-symbol="ko-s:가"]')!);
  expect(onTap).not.toHaveBeenCalled();
  expect(screen.queryByText('A')).not.toBeInTheDocument();
});
test('정답 표시 중에는 정답 글자 상자에 강조 표시가 붙는다', () => {
  render(<SeatView index={0} geom={geom} color="pink" symbols={syms} placements={pls} score={1} name="A" showName={false}
    locked={false} flash="correct" correctSymbol="ko-s:고" onTap={() => {}} />);
  expect(document.querySelector('[data-symbol="ko-s:고"]')).toHaveClass('glyph--hit');
  expect(document.querySelector('[data-symbol="ko-s:가"]')).not.toHaveClass('glyph--hit');
});
test('한글은 Jua, 알파벳은 Fredoka로 그린다', () => {
  render(<><Glyph symbol={ko} placement={p} facing={0} /><Glyph symbol={en} placement={p} facing={180} /></>);
  expect(screen.getByText('가')).toHaveStyle({ fontFamily: 'Jua' });
  expect(screen.getByText('A')).toHaveStyle({ fontFamily: 'Fredoka' });
});
test('중앙 카드는 회전 각도만큼 돌아간다', () => {
  render(<CenterCard circle={{ cx: 512, cy: 384, rx: 160, ry: 160 }} symbols={[ko]} placements={[{ x: 512, y: 384, size: 60, rotation: 0 }]} rotation={90} />);
  expect(screen.getByTestId('center-card')).toHaveStyle({ transform: 'rotate(90deg)' });
});
test('Hud는 내용을 보여준다', () => {
  render(<Hud rect={{ x: 10, y: 10, w: 160, h: 40 }} facing={180}>7/20</Hud>);
  expect(screen.getByText('7/20')).toBeInTheDocument();
});
