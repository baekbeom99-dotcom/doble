import type { ReactNode } from 'react';
import type { Rect } from '../../engine/geometry';

export function Hud({ rect, facing, tall = false, children }: { rect: Rect; facing: 0 | 180; tall?: boolean; children: ReactNode }) {
  return (
    <div
      className={tall ? 'hud hud--tall' : 'hud'}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, transform: `rotate(${facing}deg)` }}
    >
      {children}
    </div>
  );
}
