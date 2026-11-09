/** 단계마다 몸 색이 바뀌는 평면 몬스터. 나중에 public/assets/characters/의 그림으로 바꿀 수 있다 */
const BODY_COLORS = ['#A99BFF', '#7FDBFF', '#B8F26B', '#FFE14D', '#FF8FB8'];

export function Monster({ stage, size }: { stage: number; size: number }) {
  const body = BODY_COLORS[(stage - 1) % BODY_COLORS.length];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${stage}단계 몬스터`}>
      <path
        data-part="body"
        d="M15 90 Q10 40 30 22 L38 8 L46 22 Q50 20 54 22 L62 8 L70 22 Q90 40 85 90 Z"
        fill={body}
        stroke="#111"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="37" cy="48" r="9" fill="#fff" stroke="#111" strokeWidth="3" />
      <circle cx="63" cy="48" r="9" fill="#fff" stroke="#111" strokeWidth="3" />
      <circle cx="39" cy="50" r="4" fill="#111" />
      <circle cx="61" cy="50" r="4" fill="#111" />
      <path d="M30 70 L70 70 L65 80 L58 72 L50 80 L42 72 L35 80 Z" fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
