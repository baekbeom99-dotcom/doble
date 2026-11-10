import { FIRE_MS, RESCUE_NEED } from '../../engine/coop/fire';
import type { Rect } from '../../engine/geometry';
import type { CoopState } from '../../engine/state';

interface Props {
  coop: CoopState;
  /** 플레이어 이름 (불 맞은 사람 표시용) */
  names: string[];
  rect: Rect;
  facing: 0 | 180;
  /** 혼자 하는 몬스터 사냥: 구할 사람이 없으니 방어하는 중이라고 알린다 */
  solo?: boolean;
}

/** 이보다 적게 남으면 막대가 깜빡인다 */
const URGENT_MS = 3000;
/** 이보다 좁은 게이지는 막대를 따로 두지 않고 알약 전체를 막대로 채운다 */
const FILL_BELOW_W = 420;
const seconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

/** 협동 불 게이지: 정보 칸 밖에 크게 그리는 막대. 불 공격까지 남은 시간, 불 공격 중에는 버티는 시간을 보여 준다 */
export function FireGauge({ coop, names, rect, facing, solo = false }: Props) {
  const { fire, attackLeft, attackTotal } = coop;
  const label = !fire ? '불 공격까지' : solo ? '방어하는 중' : `${names[fire.target]} 구하기 ${fire.got}/${RESCUE_NEED}`;
  const left = fire ? fire.timeLeft : attackLeft;
  const total = fire ? FIRE_MS : attackTotal;
  const className = ['fire-gauge', rect.w < FILL_BELOW_W && 'fire-gauge--fill', fire && 'fire-gauge--fire', !fire && left <= URGENT_MS && 'fire-gauge--urgent'].filter(Boolean).join(' ');
  return (
    <div
      className={className}
      data-testid="fire-gauge"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, transform: `rotate(${facing}deg)` }}
    >
      <b className="fire-gauge__label">{label}</b>
      <span className="meter fire-gauge__bar" aria-label={`${label} ${seconds(left)}초`}>
        <i style={{ width: pct(left, total) }} />
      </span>
      <span className="fire-gauge__time">{seconds(left)}초</span>
    </div>
  );
}
