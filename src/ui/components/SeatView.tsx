import type { CSSProperties } from 'react';
import type { SymbolDef } from '../../content/types';
import type { Rect } from '../../engine/geometry';
import type { Placement } from '../../engine/layout';
import { SEAT_COLORS, shadowColor, type SeatColor, type SeatGeom } from '../../engine/seats';
import type { ItemId } from '../../engine/state';
import { Glyph } from './Glyph';

export const ITEM_LABELS: Record<ItemId, string> = { freeze: '얼리기', swirl: '뒤섞기', hint: '힌트', shield: '방패' };
const ITEM_ICONS: Record<ItemId, string> = { freeze: '❄️', swirl: '🌀', hint: '💡', shield: '🛡️' };
const TEAM_LETTERS = ['A', 'B'];
const MAX_TOWER = 10;
const EXTRAS_GAP = 6;
/** 콤보 표시 + 아이템 버튼 + 대상 버튼 3개가 함께 들어가는 너비 (배지 높이 배수) */
const EXTRAS_WIDTH_PER_HEIGHT = 6;

export interface TargetOption { index: number; name: string; color: SeatColor }

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
  streak?: number;
  item?: ItemId | null;
  onUseItem?: () => void;
  team?: number | null;
  tower?: boolean;
  hintSymbol?: string | null;
  spinning?: boolean;
  targets?: TargetOption[] | null;
  onPickTarget?: (index: number) => void;
}

export function regionStyle(color: string): CSSProperties {
  const c = shadowColor(color);
  return { background: color, boxShadow: `0 0 0 6px rgba(${c},.35), 0 0 14px 6px rgba(${c},.25)` };
}

/** 콤보·아이템·대상 버튼이 놓이는 칸. 배지에서 영역 안쪽(플레이어 반대쪽)으로 떨어뜨린다 */
export function extrasRect(geom: SeatGeom): Rect {
  const b = geom.badge;
  const clip = geom.region.clip;
  const w = b.h * EXTRAS_WIDTH_PER_HEIGHT;
  const x = Math.min(Math.max(clip.x + 4, b.x + b.w / 2 - w / 2), clip.x + clip.w - w - 4);
  const y = geom.facing === 0 ? b.y - b.h - EXTRAS_GAP : b.y + b.h + EXTRAS_GAP;
  return { x, y, w, h: b.h };
}

export function SeatView(props: Props) {
  const { index, geom, color, symbols, placements, score, name, showName, locked, flash, correctSymbol, onTap } = props;
  const { streak = 0, item = null, onUseItem, team = null, tower = false, hintSymbol = null, spinning = false, targets = null, onPickTarget } = props;
  const { cx, cy, rx, ry } = geom.region.ellipse;
  const hex = SEAT_COLORS[color];
  const regionClass = ['seat-region', locked && 'is-locked', flash === 'wrong' && 'is-wrong'].filter(Boolean).join(' ');
  const b = geom.badge;
  const ex = extrasRect(geom);
  const rotate = `rotate(${geom.facing}deg)`;
  const showExtras = streak >= 2 || item || (targets && targets.length > 0);

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
          className={[hintSymbol === s.id && 'glyph--hint', spinning && 'glyph--spin'].filter(Boolean).join(' ') || undefined}
          onTap={locked ? undefined : onTap}
        />
      ))}
      <div className="badge" data-testid={`badge-${index}`} style={{ left: b.x, top: b.y, width: b.w, height: b.h, background: hex, transform: rotate }}>
        {team !== null && <span className="badge__team">{TEAM_LETTERS[team]}</span>}
        {showName && <span className="badge__name">{name}</span>}
        <b className="badge__score">{score}</b>
        {tower && (
          <span className="tower" data-testid={`tower-${index}`}>
            {Array.from({ length: Math.min(score, MAX_TOWER) }, (_, i) => <i key={i} />)}
          </span>
        )}
      </div>
      {showExtras && (
        <div className="extras" style={{ left: ex.x, top: ex.y, width: ex.w, height: ex.h, transform: rotate, overflow: 'hidden' }}>
          {streak >= 2 && <span className="combo">콤보 {streak}</span>}
          {item && (
            <button
              className="item-btn"
              aria-label={ITEM_LABELS[item]}
              onPointerDown={e => { e.preventDefault(); onUseItem?.(); }}
            >
              {ITEM_ICONS[item]}
            </button>
          )}
          {targets?.map(t => (
            <button
              key={t.index}
              className="target-btn"
              aria-label={`${t.name}에게`}
              style={{ background: SEAT_COLORS[t.color] }}
              onPointerDown={e => { e.preventDefault(); onPickTarget?.(t.index); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
