import type { CSSProperties } from 'react';
import { paperShades } from '../engine/seats';

/** 버튼·카드용 페이퍼컷 스타일: 같은 색 종이 두 겹 테두리와 아래로 떨어지는 그림자 */
export function paperStack(color: string): CSSProperties {
  const [mid, dark] = paperShades(color);
  return { background: color, boxShadow: `0 0 0 7px ${mid}, 0 0 0 14px ${dark}, 0 12px 18px 10px rgba(70,45,25,.3)` };
}
