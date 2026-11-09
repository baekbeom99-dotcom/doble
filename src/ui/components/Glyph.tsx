import type { CSSProperties } from 'react';
import type { SymbolDef } from '../../content/types';
import type { Placement } from '../../engine/layout';

const GLYPH_SCALE = 0.9;

interface Props {
  symbol: SymbolDef;
  placement: Placement;
  facing: 0 | 180;
  /** 상자 좌표를 이만큼 빼서 그린다 (부모 기준 좌표로 바꿀 때) */
  offset?: { x: number; y: number };
  hit?: boolean;
  /** 힌트·회전 같은 추가 상태 클래스 */
  className?: string;
  onTap?: (id: string) => void;
}

export function Glyph({ symbol, placement, facing, offset = { x: 0, y: 0 }, hit = false, className, onTap }: Props) {
  const { x, y, size, rotation } = placement;
  const box: CSSProperties = {
    left: x - size / 2 - offset.x,
    top: y - size / 2 - offset.y,
    width: size,
    height: size,
    transform: `rotate(${facing + rotation}deg)`,
  };
  return (
    <div
      className={['glyph', hit && 'glyph--hit', className].filter(Boolean).join(' ')}
      data-symbol={symbol.id}
      style={box}
      onPointerDown={onTap ? e => { e.preventDefault(); onTap(symbol.id); } : undefined}
    >
      {symbol.display.kind === 'text' ? (
        <span style={{ fontFamily: symbol.lang === 'ko-KR' ? 'Jua' : 'Fredoka', fontSize: size * GLYPH_SCALE }}>
          {symbol.display.value}
        </span>
      ) : (
        <img src={symbol.display.src} alt={symbol.speech} draggable={false} />
      )}
    </div>
  );
}
