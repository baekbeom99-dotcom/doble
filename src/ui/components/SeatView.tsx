import type { CSSProperties } from 'react';
import type { SymbolDef } from '../../content/types';
import type { Placement } from '../../engine/layout';
import { SEAT_COLORS, shadowColor, type SeatColor, type SeatGeom } from '../../engine/seats';
import { Glyph } from './Glyph';

interface Props {
  index: number;
  geom: SeatGeom;
  color: SeatColor;
  symbols: SymbolDef[];
  placements: Placement[];
  score: number;
  name: string;
  showName: boolean;
  locked: boolean;
  flash: 'correct' | 'wrong' | null;
  correctSymbol: string | null;
  onTap: (symbolId: string) => void;
}

export function regionStyle(color: string): CSSProperties {
  const c = shadowColor(color);
  return { background: color, boxShadow: `0 0 0 6px rgba(${c},.35), 0 0 14px 6px rgba(${c},.25)` };
}

export function SeatView(props: Props) {
  const { index, geom, color, symbols, placements, score, name, showName, locked, flash, correctSymbol, onTap } = props;
  const { cx, cy, rx, ry } = geom.region.ellipse;
  const hex = SEAT_COLORS[color];
  const regionClass = ['seat-region', locked && 'is-locked', flash === 'wrong' && 'is-wrong'].filter(Boolean).join(' ');
  const b = geom.badge;
  return (
    <div className="seat" data-testid={`seat-${index}`}>
      <div className={regionClass} style={{ left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2, ...regionStyle(hex) }} />
      {symbols.map((s, i) => (
        <Glyph
          key={s.id}
          symbol={s}
          placement={placements[i]}
          facing={geom.facing}
          hit={flash === 'correct' && correctSymbol === s.id}
          onTap={locked ? undefined : onTap}
        />
      ))}
      <div
        className="badge"
        data-testid={`badge-${index}`}
        style={{ left: b.x, top: b.y, width: b.w, height: b.h, background: hex, transform: `rotate(${geom.facing}deg)` }}
      >
        {showName && <span className="badge__name">{name}</span>}
        <b className="badge__score">{score}</b>
      </div>
    </div>
  );
}
