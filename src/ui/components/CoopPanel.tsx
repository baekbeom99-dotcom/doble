import type { CoopState } from '../../engine/state';

interface Props {
  coop: CoopState;
  /** 지금 일어난 일을 알려 주는 문구 (없으면 null) */
  message: string | null;
  /** 혼자 하는 몬스터 사냥: 좁은 칸에 맞춰 체력 막대를 아랫줄로 내린다 */
  solo?: boolean;
  /** 문구 띠를 칸에서 이만큼 더 띄운다 (칸 위의 불 게이지를 가리지 않게) */
  bannerLift?: number;
}

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

/** 협동 정보 칸: 단계, 거북이 체력, 하트, 미션. 불 게이지는 칸 밖의 FireGauge가 그린다 */
export function CoopPanel({ coop, message, solo = false, bannerLift = 0 }: Props) {
  const { stage, hearts, hp, maxHp, mission } = coop;
  return (
    <div className={solo ? 'coop coop--solo' : 'coop'}>
      {message && <div className="coop__banner" role="status" style={bannerLift ? { marginBottom: 16 + bannerLift } : undefined}>{message}</div>}
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

      {mission.text && (
        <div className="coop__mission">
          <span>{mission.text}</span>
          <b>{mission.done ? '완료!' : `${mission.progress}/${mission.target}`}</b>
        </div>
      )}
    </div>
  );
}
