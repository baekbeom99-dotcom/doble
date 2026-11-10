import type { CSSProperties } from 'react';
import type { Ellipse } from '../../engine/geometry';
import { skyPalette, type SkyPhase } from '../../engine/sky';

/** 하늘에 천천히 지나가는 것들. 위치(%)·크기·시간(s)·시작 지연(s)을 미리 정해 두어 매번 같은 리듬으로 움직인다 */
const CLOUDS = [
  { top: 8, scale: 1, dur: 70, delay: -10 },
  { top: 22, scale: 0.7, dur: 90, delay: -50 },
  { top: 34, scale: 0.85, dur: 80, delay: -30 },
];
const BIRDS = [
  { top: 16, dur: 45, delay: -5 },
  { top: 28, dur: 55, delay: -30 },
];
const STARS = [
  { left: 6, top: 8 }, { left: 18, top: 30 }, { left: 30, top: 12 }, { left: 42, top: 38 },
  { left: 55, top: 6 }, { left: 64, top: 26 }, { left: 76, top: 14 }, { left: 88, top: 34 },
  { left: 94, top: 6 }, { left: 12, top: 44 }, { left: 48, top: 22 }, { left: 82, top: 44 },
];

const WAVE = 'M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20 V60 H0 Z';

function Cloud() {
  return (
    <svg viewBox="0 0 120 60" width="120" height="60" aria-hidden="true">
      <path
        d="M14 50 Q2 50 4 38 Q6 26 20 28 Q22 10 42 12 Q54 0 70 10 Q90 4 96 24 Q116 24 116 40 Q116 50 104 50 Z"
        fill="#fffaf2"
      />
    </svg>
  );
}

function Bird() {
  return (
    <svg viewBox="0 0 40 16" width="40" height="16" aria-hidden="true">
      <path d="M2 12 Q10 2 20 10 Q30 2 38 12" fill="none" stroke="#5b4a45" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <path d="M10 1 L12.5 7.5 L19 10 L12.5 12.5 L10 19 L7.5 12.5 L1 10 L7.5 7.5 Z" fill="#f6d776" />
    </svg>
  );
}

/** 해 둘레에서 천천히 도는 햇살 (달이면 점선 달무리) */
function Halo({ body, circle }: { body: SkyPhase['body']; circle: Ellipse }) {
  const size = circle.rx * 2.7;
  const rays = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <div
      className={`sky__halo sky__halo--${body}`}
      style={{ left: circle.cx - size / 2, top: circle.cy - size / 2, width: size, height: size }}
    >
      {body === 'sun' ? (
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
          {rays.map(a => (
            <path key={a} d="M46 4 L54 4 L50 14 Z" transform={`rotate(${a} 50 50)`} fill="#f2a34a" />
          ))}
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#fff6c9" strokeWidth="2" strokeDasharray="3 6" opacity=".6" />
        </svg>
      )}
    </div>
  );
}

interface Props {
  phase: SkyPhase;
  /** 지금 해·달(중앙 카드) 위치 */
  circle: Ellipse;
}

/** 혼자 하기 배경: 위쪽 절반은 하늘, 아래쪽 절반은 물결치는 바다 */
export function SkyScene({ phase, circle }: Props) {
  const { sky, sea } = skyPalette(phase);
  const day = phase.body === 'sun';
  return (
    <div className="sky" data-testid="sky" data-body={phase.body} style={{ '--sky': sky, '--sea': sea } as CSSProperties}>
      <div className="sky__air" />
      <div className="sky__deco" key={phase.body}>
        {day
          ? (
            <>
              {CLOUDS.map((c, i) => (
                <div key={`c${i}`} className="sky__drift" style={{ top: `${c.top}%`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, scale: String(c.scale) }}>
                  <Cloud />
                </div>
              ))}
              {BIRDS.map((b, i) => (
                <div key={`b${i}`} className="sky__drift sky__bird" style={{ top: `${b.top}%`, animationDuration: `${b.dur}s`, animationDelay: `${b.delay}s` }}>
                  <Bird />
                </div>
              ))}
            </>
          )
          : STARS.map((s, i) => (
            <div key={`s${i}`} className="sky__star" style={{ left: `${s.left}%`, top: `${s.top}%`, animationDelay: `${-i * 1.7}s` }}>
              <Star />
            </div>
          ))}
      </div>
      <Halo body={phase.body} circle={circle} />
      <div className="sky__sea">
        {[0, 1, 2].map(i => (
          <svg key={i} className={`sky__wave sky__wave--${i}`} viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
            <path d={WAVE} />
          </svg>
        ))}
      </div>
    </div>
  );
}
