import type { Grade, ItemId } from '../../engine/state';
import { ITEM_ICONS, ITEM_LABELS } from './SeatView';

const GRADE_LABELS: Record<Grade, string> = { perfect: 'Perfect', great: 'Great', good: 'Good' };

interface Props {
  mode: Record<string, number>;
  kind: 'soloSurvival' | 'soloStage';
  now: number;
  /** 서바이벌 최고 점수 (고스트). 없으면 null */
  best: number | null;
  lastGrade: Grade | null;
  /** 가진 아이템 (없으면 null). 아이템을 쓰지 않는 게임이면 넘기지 않는다 */
  item?: ItemId | null;
  onUseItem?: () => void;
}

export function SoloHud({ mode, kind, now, best, lastGrade, item, onUseItem }: Props) {
  const seconds = Math.max(0, Math.ceil(mode.timeLeft / 1000));
  const ghost = best !== null && best > 0 ? Math.min(100, Math.round((mode.score / best) * 100)) : null;
  return (
    <div className="solo">
      <div className="solo__row">
        <b className="solo__time">{seconds}초</b>
        {kind === 'soloSurvival' ? <b className="solo__score">{mode.score}점</b> : <b className="solo__score">{`${mode.correct}/${mode.target}`}</b>}
      </div>
      <div className="solo__row solo__effects">
        {item !== undefined && (
          <span className="solo__item">
            <span className="solo__item-label">아이템</span>
            <span className="solo__slot">
              {item && (
                <button className="item-btn" aria-label={ITEM_LABELS[item]} onPointerDown={e => { e.preventDefault(); onUseItem?.(); }}>
                  {ITEM_ICONS[item]}
                </button>
              )}
            </span>
          </span>
        )}
        {now < mode.feverUntil && <span className="solo__fever">피버!</span>}
        {now < mode.doubleUntil && <span className="solo__double">×2</span>}
        {now < mode.timeStopUntil && <span aria-label="시간 정지">⏸️</span>}
        {lastGrade && <span className={`solo__grade solo__grade--${lastGrade}`}>{GRADE_LABELS[lastGrade]}</span>}
      </div>
      {kind === 'soloSurvival' && ghost !== null && (
        <div className="solo__ghost">
          <span>최고 {best}점</span>
          <span className="meter meter--ghost" aria-label={`최고 기록 대비 ${ghost}%`}>
            <i style={{ width: `${ghost}%` }} />
          </span>
        </div>
      )}
    </div>
  );
}
