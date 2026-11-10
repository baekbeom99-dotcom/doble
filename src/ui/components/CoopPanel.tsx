import { RESCUE_NEED } from '../../engine/coop/fire';
import type { CoopState } from '../../engine/state';

interface Props {
  coop: CoopState;
  /** 플레이어 이름 (불 맞은 사람 표시용) */
  names: string[];
  /** 지금 일어난 일을 알려 주는 문구 (없으면 null) */
  message: string | null;
  /** 정보 칸이 화면 위쪽에 있으면 문구를 칸 아래에 띄운다 */
  bannerBelow?: boolean;
}

const seconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

export function CoopPanel({ coop, names, message, bannerBelow = false }: Props) {
  const { stage, hearts, hp, maxHp, attackLeft, attackTotal, mission, fire } = coop;
  return (
    <div className="coop">
      {message && <div className={bannerBelow ? 'coop__banner coop__banner--below' : 'coop__banner'} role="status">{message}</div>}
      <div className="coop__head">
        <span className="coop__stage">{stage}단계</span>
        <span className="meter meter--hp" aria-label={`거북이 체력 ${hp}/${maxHp}`}>
          <i style={{ width: pct(hp, maxHp) }} />
        </span>
        <span className="coop__hearts" aria-label={`하트 ${hearts}`}>
          {'❤️'.repeat(Math.max(0, hearts))}
          {'🤍'.repeat(Math.max(0, 3 - hearts))}
        </span>
      </div>

      {fire ? (
        <div className="coop__fire">
          <b>{`${names[fire.target]} 구하기 ${fire.got}/${RESCUE_NEED}`}</b>
          <span className="coop__time">{seconds(fire.timeLeft)}초</span>
        </div>
      ) : (
        <div className="coop__attack">
          <span>불 공격까지</span>
          <span className="meter meter--attack" aria-label={`불 공격까지 ${seconds(attackLeft)}초`}>
            <i style={{ width: pct(attackLeft, attackTotal) }} />
          </span>
        </div>
      )}

      {mission.text && (
        <div className="coop__mission">
          <span>{mission.text}</span>
          <b>{mission.done ? '완료!' : `${mission.progress}/${mission.target}`}</b>
        </div>
      )}
    </div>
  );
}
