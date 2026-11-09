import type { Rng } from './rng';

export interface RoundCards {
  center: string[];
  playerCards: string[][];
  answers: string[];
}

export class PoolTooSmallError extends Error {}

const PREFER_CHANCE = 0.6;

/**
 * 라운드 카드를 만든다. 각 플레이어 카드는 중앙 카드와 정확히 1개(그 플레이어의 정답)만 겹친다.
 */
export function generateRound(opts: {
  pool: readonly string[];
  playerSizes: readonly number[];
  preferAnswer?: (id: string) => boolean;
  rng: Rng;
}): RoundCards {
  const { pool, playerSizes, preferAnswer, rng } = opts;
  const centerSize = Math.max(...playerSizes);
  if (pool.length < centerSize + centerSize - 1) {
    throw new PoolTooSmallError(`심볼이 ${pool.length}개뿐이라 카드당 ${centerSize}개를 만들 수 없어요`);
  }

  const center = rng.sample(pool, centerSize);
  // 우선 대상이 중앙 카드에 없으면 일정 확률로 한 장을 끼워 넣는다 (대상이 한 장뿐인 미션도 나오게)
  if (preferAnswer && !center.some(preferAnswer) && rng.next() < PREFER_CHANCE) {
    const candidates = pool.filter(preferAnswer);
    if (candidates.length > 0) center[rng.int(0, centerSize - 1)] = rng.pick(candidates);
  }
  const outside = pool.filter(id => !center.includes(id));
  const distinct = playerSizes.length <= centerSize;

  let remaining = [...center];
  const answers = playerSizes.map(() => {
    const candidates = distinct ? remaining : center;
    const preferred = preferAnswer ? candidates.filter(preferAnswer) : [];
    const answer = preferred.length > 0 && rng.next() < PREFER_CHANCE ? rng.pick(preferred) : rng.pick(candidates);
    if (distinct) remaining = remaining.filter(id => id !== answer);
    return answer;
  });

  const playerCards = playerSizes.map((size, i) => rng.shuffle([answers[i], ...rng.sample(outside, size - 1)]));
  return { center, playerCards, answers };
}
