/**
 * 단계마다 몸 색이 바뀌는 평면 몬스터 (네오브루탈리즘: 굵은 검은 선, 평평한 색).
 * 중앙 카드 뒤에 서서 카드를 품는 모양이라, 눈은 카드 양옆, 입은 카드 아래에 있다.
 * viewBox 가운데 (100,100) 반지름 62.5가 중앙 카드 자리다 (크기 = 카드 반지름 × CARD_SCALE).
 */
const BODY_COLORS = ['#A99BFF', '#7FDBFF', '#B8F26B', '#FFE14D', '#FF8FB8'];
const INK = '#111';
/** 몬스터 크기 = 중앙 카드 반지름 × 3.2 */
export const CARD_SCALE = 3.2;

/** idle 평소, angry 공격 준비 중, hurt 맞았을 때 */
export type MonsterMood = 'idle' | 'angry' | 'hurt';

export function Monster({ stage, size, mood = 'idle' }: { stage: number; size: number; mood?: MonsterMood }) {
  const body = BODY_COLORS[(stage - 1) % BODY_COLORS.length];
  const line = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <svg
      className={`monster monster--${mood}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${stage}단계 몬스터`}
    >
      {/* 뿔 */}
      <path d="M58 40 L44 4 L80 30 Z" fill="#fff" {...line} />
      <path d="M142 40 L156 4 L120 30 Z" fill="#fff" {...line} />
      {/* 몸: 카드를 품는 넓은 반구 */}
      <path data-part="body" d="M6 198 C0 110 12 34 100 22 C188 34 200 110 194 198 Z" fill={body} {...line} />
      {/* 점박이 */}
      <circle cx="26" cy="140" r="6" fill={INK} />
      <circle cx="40" cy="176" r="4" fill={INK} />
      <circle cx="174" cy="150" r="5" fill={INK} />
      <circle cx="100" cy="30" r="3" fill={INK} />
      {/* 볼 */}
      <ellipse cx="22" cy="110" rx="9" ry="5" fill="#FF8FB8" opacity=".8" />
      <ellipse cx="178" cy="110" rx="9" ry="5" fill="#FF8FB8" opacity=".8" />
      {/* 눈: 카드 양옆 */}
      {mood === 'hurt' ? (
        <g {...line} strokeWidth={5}>
          <path d="M12 74 L32 94 M32 74 L12 94" />
          <path d="M168 74 L188 94 M188 74 L168 94" />
        </g>
      ) : (
        <g className="monster__eyes">
          <circle cx="22" cy="84" r="16" fill="#fff" {...line} />
          <circle cx="178" cy="84" r="16" fill="#fff" {...line} />
          <circle cx="26" cy="87" r="7" fill={INK} />
          <circle cx="174" cy="87" r="7" fill={INK} />
          <circle cx="28" cy="84" r="2" fill="#fff" />
          <circle cx="176" cy="84" r="2" fill="#fff" />
        </g>
      )}
      {mood === 'angry' && (
        <g {...line} strokeWidth={6}>
          <path d="M6 60 L38 70" />
          <path d="M194 60 L162 70" />
        </g>
      )}
      {/* 입과 이빨: 카드 아래 */}
      <path d="M72 172 L128 172 L122 186 L114 176 L106 186 L100 176 L94 186 L86 176 L78 186 Z" fill="#fff" {...line} strokeWidth={3.5} />
    </svg>
  );
}
