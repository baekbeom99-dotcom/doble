import { fireEvent, render, screen, within } from '@testing-library/react';
import type { SymbolDef } from '../../content/types';
import type { Placement } from '../../engine/layout';
import { computeTable, type SeatGeom } from '../../engine/seats';
import { layoutSymbols } from '../../engine/layout';
import { createRng } from '../../engine/rng';
import { CenterCard } from './CenterCard';
import { Glyph } from './Glyph';
import { Hud } from './Hud';
import { extrasRect, SeatView } from './SeatView';

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
  render(<SeatView index={0} geom={geom} color="pink" symbols={syms} placements={pls} score={3} name="민지" showName namePath="M0 0 A1 1 0 0 1 10 0"
    locked={false} flash={null} correctSymbol={null} onTap={onTap} />);
  fireEvent.pointerDown(document.querySelector('[data-symbol="ko-s:가"]')!);
  expect(onTap).toHaveBeenCalledWith('ko-s:가');
  expect(screen.getByText('민지')).toBeInTheDocument();
  expect(screen.getByTestId('score-0')).toHaveTextContent('3');
  expect(screen.getByTestId('seat-0')).toBeInTheDocument();
  expect(screen.queryByTestId('badge-0')).not.toBeInTheDocument();
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
test('중앙 카드 아래쪽에 바닥 띠를 그린다', () => {
  render(<CenterCard circle={{ cx: 512, cy: 384, rx: 160, ry: 160 }} symbols={[ko]} placements={[{ x: 512, y: 384, size: 60, rotation: 0 }]} rotation={0} />);
  const floor = screen.getByTestId('center-floor');
  expect(screen.getByTestId('center-card')).toContainElement(floor);
  expect(floor).toHaveStyle({ height: '15%' });
});

const baseProps = {
  index: 0, geom, color: 'pink' as const, symbols: syms, placements: pls, score: 0, name: '민지', showName: false,
  locked: false, flash: null, correctSymbol: null, onTap: () => {},
};

test('아이템 버튼을 누르면 onUseItem을 부른다', () => {
  const onUseItem = vi.fn();
  render(<SeatView {...baseProps} item="freeze" onUseItem={onUseItem} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: '얼리기' }));
  expect(onUseItem).toHaveBeenCalled();
});
test('콤보 2 이상이면 표시하고, 1이면 표시하지 않는다', () => {
  const { rerender } = render(<SeatView {...baseProps} streak={3} />);
  expect(screen.getByText('콤보 3')).toBeInTheDocument();
  rerender(<SeatView {...baseProps} streak={1} />);
  expect(screen.queryByText(/콤보/)).not.toBeInTheDocument();
});
test('폭탄 대상 버튼을 누르면 그 사람 번호를 넘긴다', () => {
  const onPickTarget = vi.fn();
  render(<SeatView {...baseProps} targets={[{ index: 2, name: '엄마', color: 'yellow' }]} onPickTarget={onPickTarget} />);
  fireEvent.pointerDown(screen.getByRole('button', { name: '엄마에게' }));
  expect(onPickTarget).toHaveBeenCalledWith(2);
});
test('힌트 글자와 회전 상태를 클래스로 표시한다', () => {
  render(<SeatView {...baseProps} hintSymbol="ko-s:고" spinning />);
  expect(document.querySelector('[data-symbol="ko-s:고"]')).toHaveClass('glyph--hint');
  expect(document.querySelector('[data-symbol="ko-s:가"]')).toHaveClass('glyph--spin');
});
test('팀 글자와 점수를 이름 곡선에 붙인다', () => {
  render(<SeatView {...baseProps} score={4} team={1} showName namePath="M0 0 A1 1 0 0 1 10 0" />);
  expect(screen.getByText('B')).toBeInTheDocument();
  expect(screen.getByTestId('score-0')).toHaveTextContent('4');
});
test('혼자 하기 자리는 거북이 뒷모습으로 그린다', () => {
  render(<SeatView {...baseProps} turtle />);
  expect(screen.getByTestId('turtle-back-0')).toBeInTheDocument();
});
test('extrasRect는 배지에서 영역 안쪽으로 떨어진 칸이고 화면 안에 있다', () => {
  const r = extrasRect(geom);
  expect(r.y + r.h).toBeLessThanOrEqual(geom.badge.y);
  expect(r.x).toBeGreaterThanOrEqual(0);
  expect(r.x + r.w).toBeLessThanOrEqual(1024);
  const top = extrasRect({ ...geom, facing: 180, badge: { x: 380, y: 60, w: 110, h: 56 } });
  expect(top.y).toBeGreaterThanOrEqual(60 + 56);
});
test('extras 칸은 콤보·아이템·대상 버튼 3개가 함께 들어갈 만큼 넓고, 넘치는 내용은 잘린다', () => {
  expect(extrasRect(geom).w).toBeGreaterThanOrEqual(geom.badge.h * 6);
  render(<SeatView {...baseProps} streak={3} item="hint" targets={[{ index: 1, name: 'B', color: 'sky' }]} />);
  expect(document.querySelector('.extras')).toHaveStyle({ overflow: 'hidden' });
});
test.each([[960, 600], [1024, 768]])('%ix%i 4인: 배지와 버튼 칸을 피해도 자리마다 글자 8개가 44px 이상으로 들어간다', (W, H) => {
  const t = computeTable(4, W, H);
  for (let seed = 0; seed < 20; seed++) {
    for (const s of t.seats) {
      expect(() => layoutSymbols({ region: s.region, exclusions: [s.badge, extrasRect(s)], count: 8, rng: createRng(seed) })).not.toThrow();
    }
  }
});

test('이름은 영역 테두리를 따라 곡선(textPath)으로 그린다', () => {
  render(<SeatView index={0} geom={geom} color="pink" symbols={syms} placements={pls} score={3} name="민지" showName namePath="M10 10 A100 100 0 0 1 200 10"
    locked={false} flash={null} correctSymbol={null} onTap={() => {}} />);
  const label = screen.getByText('민지');
  expect(label.closest('textPath')).not.toBeNull();
  const path = document.getElementById(label.closest('textPath')!.getAttribute('href')!.slice(1))!;
  expect(path.getAttribute('d')).toBe('M10 10 A100 100 0 0 1 200 10');
});
