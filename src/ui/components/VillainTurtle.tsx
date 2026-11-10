import type { Ellipse } from '../../engine/geometry';

/**
 * 협동의 악당 거북이: 가시 돋친 등껍질, 치켜뜬 큰 눈과 송곳니, 머리 위 불꽃 볏을 가진 악당 (위에서 본 모습).
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
const FANG = '#fff6e0';
const EYE_WHITE = '#fff3c9';
const MOUTH = '#8e2a1f';
const CLAW = '#f3e6c4';
const SPOT = '#5a2a16';
const EYE_RIM = '#5a2a16';
/** 그림 상자 = 카드 반지름 × 4.4 (머리가 카드 밖 2.2까지) */
export const TURTLE_EXTENT = 2.2;
/** 입 (불이 나오는 곳), 카드 반지름 배수 */
export const TURTLE_MOUTH = 2.02;

/** down: 물리쳐서 쓰러지는 중, enter: 다음 단계 거북이가 나오는 중 */
export type TurtleMood = 'idle' | 'angry' | 'hurt' | 'down' | 'enter';

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
  const iris = mood === 'angry' ? '#ff7a2e' : '#f2b422';
  // 눈 하나 (위쪽 눈 기준 좌표). 눈꺼풀이 비스듬히 덮은 반달꼴이라 화난 눈매가 된다
  const eye = (
    <g className="villain__eye">
      <path d="M1.40 -0.42 L1.76 -0.13 C1.92 -0.28 1.66 -0.56 1.40 -0.42 Z" fill={EYE_WHITE} stroke={EYE_RIM} strokeWidth="0.035" strokeLinejoin="round" />
      <circle cx="1.67" cy="-0.325" r="0.075" fill={iris} />
      <ellipse cx="1.67" cy="-0.325" rx="0.022" ry="0.062" fill="#2a1a12" transform="rotate(-50 1.67 -0.325)" />
      <circle cx="1.7" cy="-0.36" r="0.02" fill="#fff" />
    </g>
  );
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
        {/* 가시 꼬리: 좌우로 살랑인다 */}
        <g className="villain__tail">
          <path d="M-1.15 -0.13 L-1.62 -0.02 L-1.62 0.02 L-1.15 0.13 Z" fill={SKIN_DARK} />
          <path d="M-1.25 -0.06 L-1.32 -0.16 L-1.37 -0.05 L-1.45 -0.13 L-1.5 -0.03 Z" fill={spikeDark} />
        </g>

        {/* 굵은 다리와 발톱: 번갈아 가며 꿈틀거린다 */}
        {legs.map((a, i) => {
          const r = (a * Math.PI) / 180;
          return (
            <g key={a} transform={`translate(${(1.12 * Math.cos(r)).toFixed(3)} ${(1.12 * Math.sin(r)).toFixed(3)}) rotate(${a})`}>
              <g className="villain__leg" style={{ animationDelay: `${-i * 0.45}s` }}>
                <ellipse cx="0.1" cy="0" rx="0.36" ry="0.24" fill={SKIN_DARK} />
                <ellipse cx="0.08" cy="0" rx="0.32" ry="0.2" fill={SKIN} />
                <path d="M0.36 -0.13 L0.48 -0.1 L0.38 -0.06 M0.39 -0.02 L0.52 0 L0.39 0.03 M0.36 0.08 L0.48 0.11 L0.37 0.13" fill={CLAW} />
              </g>
            </g>
          );
        })}

        {/* 머리: 굵은 목, 둥글고 넓적한 얼굴, 밝은 주둥이, 송곳니 두 개가 보이는 입 */}
        <g className="villain__head">
          <ellipse cx="1.12" cy="0" rx="0.34" ry="0.34" fill={SKIN_DARK} />
          <path d="M1.06 -0.44 Q1.5 -0.68 1.88 -0.4 Q2.16 -0.16 2.16 0 Q2.16 0.16 1.88 0.4 Q1.5 0.68 1.06 0.44 Z" fill={SKIN_DARK} />
          <path d="M1.1 -0.4 Q1.5 -0.62 1.85 -0.36 Q2.1 -0.15 2.1 0 Q2.1 0.15 1.85 0.36 Q1.5 0.62 1.1 0.4 Z" fill={SKIN} />
          <ellipse cx="1.9" cy="0" rx="0.19" ry="0.29" fill={BELLY} />
          <circle cx="1.84" cy="-0.06" r="0.022" fill={SPOT} />
          <circle cx="1.84" cy="0.06" r="0.022" fill={SPOT} />
          {/* 입: 평소에는 씩 웃는 한 줄, 화나면 크게 벌린다. 송곳니는 앞을 향한다 */}
          {mood === 'angry' ? (
            <g>
              <path d="M1.88 -0.27 Q2.16 0 1.88 0.27 Q1.99 0 1.88 -0.27 Z" fill={MOUTH} />
              <path d="M1.93 -0.21 L2.07 -0.13 L1.96 -0.1 Z M1.93 0.21 L2.07 0.13 L1.96 0.1 Z" fill={FANG} />
            </g>
          ) : (
            <g>
              <path d="M1.9 -0.25 Q2.1 0 1.9 0.25" stroke={MOUTH} strokeWidth="0.045" fill="none" strokeLinecap="round" />
              <path d="M1.95 -0.17 L2.05 -0.12 L1.98 -0.08 Z M1.95 0.17 L2.05 0.12 L1.98 0.08 Z" fill={FANG} />
            </g>
          )}
          {mood === 'hurt' ? (
            <g stroke="#3a2e2a" strokeWidth="0.06" strokeLinecap="round">
              <path d="M1.55 -0.39 L1.71 -0.23 M1.71 -0.39 L1.55 -0.23" />
              <path d="M1.55 0.23 L1.71 0.39 M1.71 0.23 L1.55 0.39" />
            </g>
          ) : (
            <g>
              {eye}
              <g transform="scale(1 -1)">{eye}</g>
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
