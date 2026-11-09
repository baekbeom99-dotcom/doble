import type { SymbolDef } from '../../content/types';
import type { Ellipse } from '../../engine/geometry';
import type { Placement } from '../../engine/layout';
import { Glyph } from './Glyph';
import { regionStyle } from './SeatView';

interface Props { circle: Ellipse; symbols: SymbolDef[]; placements: Placement[]; rotation: number }

export function CenterCard({ circle, symbols, placements, rotation }: Props) {
  const left = circle.cx - circle.rx, top = circle.cy - circle.ry;
  return (
    <div
      className="center-card"
      data-testid="center-card"
      style={{ left, top, width: circle.rx * 2, height: circle.ry * 2, transform: `rotate(${rotation}deg)`, ...regionStyle('#FFFFFF') }}
    >
      {symbols.map((s, i) => (
        <Glyph key={s.id} symbol={s} placement={placements[i]} facing={0} offset={{ x: left, y: top }} />
      ))}
    </div>
  );
}
