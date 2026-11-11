import { FIRE_MS, RESCUE_NEED } from '../engine/coop/fire';
import { HEAL_EVERY } from '../engine/coop/monster';
import type { GameEvent, RewardId } from '../engine/state';

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
/** 숫자를 한국어로 읽을 때 받침이 있는지 (0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔) */
const DIGIT_BATCHIM = new Set(['0', '1', '3', '6', '7', '8']);

/** 이름 뒤에 붙일 을/를 */
export function objectParticle(name: string): '을' | '를' {
  const last = name.trim().slice(-1);
  const code = last.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END) return (code - HANGUL_START) % 28 !== 0 ? '을' : '를';
  if (DIGIT_BATCHIM.has(last)) return '을';
  return '를';
}

const REWARD_TEXT: Record<RewardId, string> = {
  heal: '거북이를 크게 때리고 하트도 하나 얻었어요',
  special: '거북이를 크게 때렸어요',
};

/** 협동에서 지금 일어난 일을 아이도 알 수 있게 한 문장으로 알려 준다. 알릴 일이 아니면 null */
export function coopMessage(e: GameEvent, names: string[]): string | null {
  switch (e.type) {
    case 'fireStart':
      return names.length > 1
        ? `악당 거북이가 ${names[e.target]}에게 불을 뿜었어요! 친구들이 ${RESCUE_NEED}번 맞히면 구할 수 있어요`
        : `악당 거북이가 불을 뿜었어요! ${FIRE_MS / 1000}초 동안 방어해요`;
    case 'fireRescue':
      return `${names[e.target]}${objectParticle(names[e.target])} 구했어요!`;
    case 'fireBurn':
      return '불을 못 껐어요. 하트가 하나 줄었어요';
    case 'monsterDown':
      return `악당 거북이를 물리쳤어요! ${e.stage + 1}단계 거북이가 나타났어요`;
    case 'heartGain':
      return `${HEAL_EVERY}번 맞혀서 하트를 하나 얻었어요!`;
    case 'missionDone':
      return `미션 성공! ${REWARD_TEXT[e.reward]}`;
    default:
      return null;
  }
}
