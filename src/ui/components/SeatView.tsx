import type { CSSProperties } from 'react';
import type { SymbolDef } from '../../content/types';
import type { Rect } from '../../engine/geometry';
import type { Placement } from '../../engine/layout';
import { paperShades, SEAT_COLORS, type SeatColor, type SeatGeom } from '../../engine/seats';
import type { ItemId } from '../../engine/state';
import { Glyph } from './Glyph';
import { TURTLE_SHELL, TurtleBack } from './TurtleBack';

export const ITEM_LABELS: Record<ItemId, string> = { freeze: '얼리기', swirl: '뒤섞기', hint: '힌트', shield: '방패', timeStop: '시간 정지', double: '2배' };
const ITEM_ICONS: Record<ItemId, string> = { freeze: '❄️', swirl: '🌀', hint: '💡', shield: '🛡️', timeStop: '⏸️', double: '✨' };
const TEAM_LETTERS = ['A', 'B'];
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
  hintSymbol?: string | null;
  spinning?: boolean;
  targets?: TargetOption[] | null;
  onPickTarget?: (index: number) => void;
  /** 이번 라운드에 이미 맞혀서 흐리게 표시 (협동) */
  dim?: boolean;
  /** 이름 뒤 점수를 숨긴다 (협동) */
  hideScore?: boolean;
  /** 이름을 놓을 곡선 (SVG path d). 없으면 이름을 그리지 않는다 */
  namePath?: string;
  /** 악당 거북이의 불을 맞고 있다 (협동) */
  burning?: boolean;
  /** 거북이 뒷모습으로 그린다 (혼자 하기) */
  turtle?: boolean;
  /** 손에 든 카드 수 (폭탄 돌리기). 점수 뒤에 작은 카드 그림으로 보여 준다 */
  cards?: number;
}

/** 카드 그림은 이만큼까지만 그리고, 넘으면 +를 붙인다 */
const CARD_ICONS_MAX = 7;

/** 페이퍼컷: 같은 색 종이를 진하기만 다르게 세 겹 겹친다. 그림자는 아래로 부드럽게 */
export function regionStyle(color: string): CSSProperties {
  const [mid, dark] = paperShades(color);
  return {
    background: color,
    boxShadow: `0 0 0 9px ${mid}, 0 0 0 18px ${dark}, 0 10px 22px 14px rgba(70,45,25,.28)`,
  };
}

/** 콤보·아이템·대상 버튼이 놓이는 칸. 배지 자리에서 영역 안쪽(플레이어 반대쪽)으로 떨어뜨린다 */
export function extrasRect(geom: SeatGeom): Rect {
  if (geom.extras) return geom.extras;
  const b = geom.badge;
  const clip = geom.region.clip;
  const w = b.h * EXTRAS_WIDTH_PER_HEIGHT;
  const x = Math.min(Math.max(clip.x + 4, b.x + b.w / 2 - w / 2), clip.x + clip.w - w - 4);
  const y = geom.facing === 0 ? b.y - b.h - EXTRAS_GAP : b.y + b.h + EXTRAS_GAP;
  return { x, y, w, h: b.h };
}

export function SeatView(props: Props) {
  const { index, geom, color, symbols, placements, score, name, showName, locked, flash, correctSymbol, onTap } = props;
  const { streak = 0, item = null, onUseItem, team = null, hintSymbol = null, spinning = false, targets = null, onPickTarget } = props;
  const { dim = false, hideScore = false, namePath, burning = false, turtle = false, cards } = props;
  const { cx, cy, rx, ry } = geom.region.ellipse;
  // 혼자 하기 거북이는 초록 등껍질로 칠한다
  const hex = turtle ? TURTLE_SHELL : SEAT_COLORS[color];
  const regionClass = ['seat-region', locked && 'is-locked', flash === 'wrong' && 'is-wrong', dim && 'is-dim', burning && 'is-burning']
    .filter(Boolean).join(' ');
  const ex = extrasRect(geom);
  const rotate = `rotate(${geom.facing}deg)`;
  const showExtras = streak >= 2 || item || (targets && targets.length > 0);
  const box = { left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2 };

  return (
    <div className={dim ? 'seat seat--dim' : 'seat'} data-testid={`seat-${index}`}>
      {turtle && <TurtleBack index={index} ellipse={geom.region.ellipse} layer="under" cheer={flash === 'correct'} />}
      <div className={regionClass} style={{ ...box, ...regionStyle(hex) }} />
      {turtle && <TurtleBack index={index} ellipse={geom.region.ellipse} layer="over" />}
      {symbols.map((s, i) => (
        <Glyph
          key={s.id}
          symbol={s}
          placement={placements[i]}
          facing={geom.facing}
          hit={flash === 'correct' && correctSymbol === s.id}
          className={[hintSymbol === s.id && 'glyph--hint', spinning && 'glyph--spin'].filter(Boolean).join(' ') || undefined}
          onTap={locked || burning ? undefined : onTap}
        />
      ))}
      {showName && namePath && (
        <svg className="seat-name">
          <path id={`seat-name-${index}`} d={namePath} fill="none" />
          <text>
            <textPath href={`#seat-name-${index}`} startOffset="50%" textAnchor="middle">
              {team !== null && <tspan className="seat-name__team">{TEAM_LETTERS[team]}</tspan>}
              {team !== null && ' '}
              {name}
              {!hideScore && <tspan className="seat-name__score" data-testid={`score-${index}`} dx="10">{score}</tspan>}
              {cards !== undefined && cards > 0 && (
                <tspan className="seat-name__cards" data-testid={`cards-${index}`} dx="6" aria-hidden="true">
                  {'▮'.repeat(Math.min(cards, CARD_ICONS_MAX))}{cards > CARD_ICONS_MAX ? '+' : ''}
                </tspan>
              )}
            </textPath>
          </text>
        </svg>
      )}
      {showExtras && (
        <div className="extras" style={{ left: ex.x, top: ex.y, width: ex.w, height: ex.h, transform: rotate, overflow: 'hidden', justifyContent: geom.extras ? (turtle ? 'flex-end' : 'flex-start') : undefined }}>
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
