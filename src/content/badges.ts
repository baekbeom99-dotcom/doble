export interface Badge { id: string; name: string; description: string }

/** 고정 배지. 세트 마스터 배지는 세트마다 masterBadge로 만든다 */
export const BADGES: Badge[] = [
  { id: 'first', name: '첫 게임', description: '혼자 하기를 한 판 끝냈어요' },
  { id: 'fever', name: '피버 타임', description: '5연속으로 맞혀 피버를 일으켰어요' },
  { id: 'survival30', name: '서바이벌 30', description: '서바이벌 한 판에서 30개를 맞혔어요' },
  { id: 'letters100', name: '글자 100개', description: '혼자 하기에서 모두 100개를 맞혔어요' },
  { id: 'stars30', name: '별 30개', description: '스테이지 도전에서 별을 30개 모았어요' },
  { id: 'hunter5', name: '몬스터 사냥꾼', description: '몬스터 사냥에서 5단계에 갔어요' },
];

export function masterBadge(setId: string, setName: string): Badge {
  return { id: `master:${setId}`, name: `${setName} 마스터`, description: `${setName}로 스테이지 10을 클리어했어요` };
}
