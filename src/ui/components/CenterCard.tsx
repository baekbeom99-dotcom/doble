import type { SymbolDef } from '../../content/types';
import type { Ellipse } from '../../engine/geometry';
import type { Placement } from '../../engine/layout';
import { FLOOR_BAND_RATIO } from '../../engine/seats';
import { Glyph } from './Glyph';

/** 혼자 하기: 해·달, 협동: 악당 거북이 등껍질 */
/** 카드 종이 색과 겹친 고리 색 [가운데, 고리1, 고리2]. 등껍질 고리는 거북이 그림이 그린다 */
const CARD_PAPER = {
  plain: ['#FFFAF0', '#EADCC2', '#D9C6A5'],
  sun: ['#FFF0C4', '#F6BB5C', '#EE9A45'],
  moon: ['#F4F0D8', '#D9D3B8', '#BDB59A'],
  shell: ['#EEF3DC', null, null],
} as const;

function cardStyle(variant: keyof typeof CARD_PAPER) {
  const [paper, ring1, ring2] = CARD_PAPER[variant];
  const shadow = '0 8px 18px 6px rgba(70,45,25,.28)';
  return { background: paper, boxShadow: ring1 ? `0 0 0 10px ${ring1}, 0 0 0 20px ${ring2}, ${shadow}` : shadow };
}

interface Props { circle: Ellipse; symbols: SymbolDef[]; placements: Placement[]; rotation: number; variant?: 'sun' | 'moon' | 'shell' }

export function CenterCard({ circle, symbols, placements, rotation, variant }: Props) {
  const left = circle.cx - circle.rx, top = circle.cy - circle.ry;
  return (
    <div
      className={variant ? `center-card center-card--${variant}` : 'center-card'}
      data-testid="center-card"
      style={{ left, top, width: circle.rx * 2, height: circle.ry * 2, transform: `rotate(${rotation}deg)`, ...cardStyle(variant ?? 'plain') }}
    >
      <div className="center-card__floor" data-testid="center-floor" style={{ height: `${FLOOR_BAND_RATIO * 100}%` }} />
      {symbols.map((s, i) => (
        <Glyph key={s.id} symbol={s} placement={placements[i]} facing={0} offset={{ x: left, y: top }} />
      ))}
    </div>
  );
}
