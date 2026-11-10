import type { Ellipse } from '../../engine/geometry';

/**
 * 협동의 악당 거북이: 가시 돋친 등껍질, 갈고리 부리, 머리 위 불꽃 볏을 가진 늑대거북 악당 (위에서 본 모습).
 * 중앙 카드가 등껍질 가운데이고, 좌표는 카드 반지름을 1로 둔 값이다. heading(도) 쪽으로 머리가 향한다 (0 = 오른쪽).
 */
/** 단계마다 바뀌는 등껍질 색 [가시 바깥, 가시 안쪽, 테두리] */
const SHELLS = [
  ['#3f4a24', '#56622f', '#6b7a3a'],
  ['#2f3f4a', '#41566a', '#55708a'],
  ['#3d2f4a', '#553f66', '#6e5487'],
  ['#4a2f24', '#66402f', '#84553e'],
  ['#24313f', '#33465a', '#456079'],
];
const SKIN = '#c8622f';
const SKIN_DARK = '#9e4422';
const BELLY = '#e8b34a';
const BEAK = '#f0c86a';
const MOUTH = '#8e2a1f';
const CLAW = '#f3e6c4';
const SPOT = '#5a2a16';
const EYE_RIM = '#5a2a16';
/** 그림 상자 = 카드 반지름 × 4.4 (머리가 카드 밖 2.2까지) */
export const TURTLE_EXTENT = 2.2;
/** 입 (불이 나오는 곳), 카드 반지름 배수 */
export const TURTLE_MOUTH = 2.02;

export type TurtleMood = 'idle' | 'angry' | 'hurt';

interface Props {
  stage: number;
  circle: Ellipse;
  heading: number;
  mood: TurtleMood;
}

/** 등껍질 가장자리의 큰 가시: n개의 삼각형을 이어 붙인 별 모양 */
function spikes(n: number, inner: number, outer: number): string {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? outer : inner;
    d += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)} `;
  }
  return d + 'Z';
}

export function VillainTurtle({ stage, circle, heading, mood }: Props) {
  const [spikeDark, spikeMid, rim] = SHELLS[(stage - 1) % SHELLS.length];
  const size = 2 * TURTLE_EXTENT * circle.rx;
  const legs = [45, -45, 135, -135];
  const open = mood === 'angry' ? 0.2 : 0.09;
  return (
    <div
      className={`villain villain--${mood}`}
      data-testid="villain-turtle"
      style={{ left: circle.cx - size / 2, top: circle.cy - size / 2, width: size, height: size, transform: `rotate(${heading}deg)` }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`${-TURTLE_EXTENT} ${-TURTLE_EXTENT} ${2 * TURTLE_EXTENT} ${2 * TURTLE_EXTENT}`}
        role="img"
        aria-label={`${stage}단계 악당 거북이`}
      >
        {/* 가시 꼬리 */}
        <path d="M-1.15 -0.13 L-1.62 -0.02 L-1.62 0.02 L-1.15 0.13 Z" fill={SKIN_DARK} />
        <path d="M-1.25 -0.06 L-1.32 -0.16 L-1.37 -0.05 L-1.45 -0.13 L-1.5 -0.03 Z" fill={spikeDark} />

        {/* 굵은 다리와 발톱, 짙은 반점 */}
        {legs.map(a => {
          const r = (a * Math.PI) / 180;
          return (
            <g key={a} transform={`translate(${(1.12 * Math.cos(r)).toFixed(3)} ${(1.12 * Math.sin(r)).toFixed(3)}) rotate(${a})`}>
              <ellipse cx="0.1" cy="0" rx="0.36" ry="0.24" fill={SKIN_DARK} />
              <ellipse cx="0.08" cy="0" rx="0.32" ry="0.2" fill={SKIN} />
              <circle cx="0.02" cy="-0.07" r="0.035" fill={SPOT} />
              <circle cx="0.12" cy="0.06" r="0.03" fill={SPOT} />
              <path d="M0.36 -0.13 L0.48 -0.1 L0.38 -0.06 M0.39 -0.02 L0.52 0 L0.39 0.03 M0.36 0.08 L0.48 0.11 L0.37 0.13" fill={CLAW} />
            </g>
          );
        })}

        {/* 머리: 굵은 목, 앞으로 갈수록 좁아지는 큰 얼굴, 한 덩어리 입, 앞쪽 부리 끝 */}
        <g className="villain__head">
          <ellipse cx="1.12" cy="0" rx="0.34" ry="0.36" fill={SKIN_DARK} />
          <path d="M1.05 -0.46 Q1.6 -0.52 1.92 -0.24 Q2.12 0 1.92 0.24 Q1.6 0.52 1.05 0.46 Z" fill={SKIN_DARK} />
          <path d="M1.1 -0.41 Q1.6 -0.46 1.88 -0.21 Q2.06 0 1.88 0.21 Q1.6 0.46 1.1 0.41 Z" fill={BELLY} />
          <circle cx="1.3" cy="-0.3" r="0.035" fill={SPOT} />
          <circle cx="1.22" cy="0.27" r="0.03" fill={SPOT} />
          <circle cx="1.42" cy="0.34" r="0.025" fill={SPOT} />
          {/* 입: 가운데가 갈라지지 않은 한 줄의 굽은 입. 화나면 크게 벌린다 */}
          {mood === 'angry'
            ? <path d="M1.78 -0.26 Q2.06 0 1.78 0.26 Q1.9 0 1.78 -0.26 Z" fill={MOUTH} />
            : <path d="M1.8 -0.22 Q2.0 0 1.8 0.22" stroke={MOUTH} strokeWidth="0.05" fill="none" strokeLinecap="round" />}
          {/* 부리 끝: 앞쪽 가운데 하나 */}
          <path d="M1.99 -0.09 Q2.18 0 1.99 0.09 Q2.04 0 1.99 -0.09 Z" fill={BEAK} />
          {mood === 'hurt' ? (
            <g stroke="#3a2e2a" strokeWidth="0.06" strokeLinecap="round">
              <path d="M1.46 -0.3 L1.6 -0.16 M1.6 -0.3 L1.46 -0.16" />
              <path d="M1.46 0.16 L1.6 0.3 M1.6 0.16 L1.46 0.3" />
            </g>
          ) : (
            <g>
              {/* 매서운 눈: 뒤쪽 바깥에서 입 쪽 안으로 모이는 대각선 아몬드꼴 (눈썹 없음) */}
              <path d="M1.34 -0.37 Q1.6 -0.36 1.78 -0.12 Q1.56 -0.18 1.36 -0.25 Z" fill={EYE_RIM} />
              <path d="M1.38 -0.34 Q1.6 -0.33 1.73 -0.15 Q1.56 -0.2 1.4 -0.27 Z" fill={mood === 'angry' ? '#ffb347' : '#ffd84a'} />
              <circle cx="1.58" cy="-0.25" r="0.035" fill="#2a1a12" />
              <path d="M1.34 0.37 Q1.6 0.36 1.78 0.12 Q1.56 0.18 1.36 0.25 Z" fill={EYE_RIM} />
              <path d="M1.38 0.34 Q1.6 0.33 1.73 0.15 Q1.56 0.2 1.4 0.27 Z" fill={mood === 'angry' ? '#ffb347' : '#ffd84a'} />
              <circle cx="1.58" cy="0.25" r="0.035" fill="#2a1a12" />
            </g>
          )}
          {/* 머리 위 불꽃 볏: 뒤로 날린다 */}
          <g className="villain__crest">
            <path d="M1.36 -0.1 Q1.02 -0.3 0.8 -0.14 Q0.98 -0.07 0.86 0 Q0.98 0.07 0.8 0.14 Q1.02 0.3 1.36 0.1 Z" fill="#d9583b" />
            <path d="M1.33 -0.06 Q1.06 -0.18 0.9 -0.08 Q1.02 0 0.9 0.08 Q1.06 0.18 1.33 0.06 Z" fill="#f2a34a" />
            <path d="M1.29 -0.025 Q1.14 -0.07 1.03 0 Q1.14 0.07 1.29 0.025 Z" fill="#fbe08a" />
          </g>
        </g>

        {/* 가시 돋친 등껍질 (두 겹) */}
        <path data-part="body" d={spikes(16, 1.08, 1.42)} fill={spikeDark} />
        <path d={spikes(16, 1.06, 1.28)} fill={spikeMid} transform="rotate(11.25)" />
        <circle cx="0" cy="0" r="1.1" fill={rim} />
      </svg>
    </div>
  );
}
