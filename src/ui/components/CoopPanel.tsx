import { ELEMENTS } from '../../engine/coop/defense';
import type { CoopState } from '../../engine/state';
import { Monster } from './Monster';

export type CoopBanner = '공격 준비!' | '막았다!' | '아야!';

interface Props {
  coop: CoopState;
  /** 지금 단계의 공격 간격 (타이머 막대 기준) */
  attackEvery: number;
  banner: CoopBanner | null;
}

const seconds = (ms: number) => Math.max(0, Math.ceil(ms / 1000));
const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

export function CoopPanel({ coop, attackEvery, banner }: Props) {
  const { stage, hearts, hp, maxHp, attackLeft, mission, challenge } = coop;
  return (
    <div className="coop">
      {banner && <div className="coop__banner">{banner}</div>}
      <div className="coop__head">
        <Monster stage={stage} size={52} />
        <div className="coop__stats">
          <span className="coop__stage">{stage}단계</span>
          <span className="meter meter--hp" aria-label={`몬스터 체력 ${hp}/${maxHp}`}>
            <i style={{ width: pct(hp, maxHp) }} />
          </span>
          <span className="coop__hearts" aria-label={`하트 ${hearts}`}>
            {'❤️'.repeat(Math.max(0, hearts))}
            {'🤍'.repeat(Math.max(0, 3 - hearts))}
          </span>
        </div>
      </div>

      {challenge ? (
        <div className="coop__challenge">
          {challenge.kind === 'elements' ? (
            <span className="coop__sequence">
              {challenge.sequence.map((e, i) => (
                <span
                  key={i}
                  data-testid="element-step"
                  className={['element-step', i < challenge.step && 'is-done', i === challenge.step && 'is-current'].filter(Boolean).join(' ')}
                  style={{ borderColor: i === challenge.step ? '#111' : ELEMENTS[e].color }}
                >
                  {ELEMENTS[e].icon}
                </span>
              ))}
            </span>
          ) : (
            <b className="coop__quota">{`${challenge.count}/${challenge.target}`}</b>
          )}
          <span className="coop__time">{seconds(challenge.timeLeft)}초</span>
        </div>
      ) : (
        <span className="meter meter--attack" aria-label={`공격까지 ${seconds(attackLeft)}초`}>
          <i style={{ width: pct(attackLeft, attackEvery) }} />
        </span>
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
