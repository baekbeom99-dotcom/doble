import { nextRound } from '../reducer';
import { createRng } from '../rng';
import { ROUND_SEED_STEP, type Challenge, type GameEvent, type GameState } from '../state';
import { applyDamage, attackEvery, setCoop } from './monster';

export const ELEMENTS = [
  { icon: '🔥', name: '불', color: '#E24B4A' },
  { icon: '💧', name: '물', color: '#378ADD' },
  { icon: '🌿', name: '풀', color: '#639922' },
  { icon: '⚡', name: '번개', color: '#EF9F27' },
] as const;
export const QUOTA_MS = 10000;
export const CHALLENGE_DAMAGE = 3;
const CHALLENGE_SEED = 900001;

type Step = { state: GameState; events: GameEvent[] };

/** 이 사람이 맡은 원소. 원소 e의 주인은 e % players번 */
export function elementsOf(player: number, players: number): number[] {
  return ELEMENTS.map((_, e) => e).filter(e => e % players === player);
}

export function startChallenge(s: GameState): Step {
  const c = s.coop!;
  const n = s.players.length;
  const rng = createRng(s.config.seed + c.stage * ROUND_SEED_STEP + CHALLENGE_SEED + c.attackCount);
  let challenge: Challenge;
  if (rng.next() < 0.5) {
    const len = Math.min(6, 3 + Math.floor((c.stage - 1) / 2));
    const sequence = Array.from({ length: len }, () => rng.int(0, ELEMENTS.length - 1));
    challenge = { kind: 'elements', timeLeft: 3000 + 2500 * len, sequence, step: 0, target: len, count: 0 };
  } else {
    challenge = { kind: 'quota', timeLeft: QUOTA_MS, sequence: [], step: 0, target: 2 * n + (c.stage - 1), count: 0 };
  }
  const started = setCoop(s, { challenge, attackLeft: 0, answered: c.answered.map(() => false) });
  const next = nextRound(started);
  return { state: next.state, events: [{ type: 'challengeStart', kind: challenge.kind }, ...next.events] };
}

export function challengeCanTap(s: GameState, player: number): boolean {
  const ch = s.coop!.challenge!;
  if (ch.kind === 'quota') return true;
  return elementsOf(player, s.players.length).includes(ch.sequence[ch.step]);
}

/** 챌린지가 끝나면 결과를 적용하고 전투로 돌아간다 */
function finish(s: GameState, success: boolean): Step {
  const c = s.coop!;
  const back = setCoop(s, { challenge: null, attackLeft: attackEvery(c.stage), attackCount: c.attackCount + 1 });
  const events: GameEvent[] = [{ type: 'challengeEnd', success }];
  if (success) {
    const hit = applyDamage(back, CHALLENGE_DAMAGE, false);
    return { state: hit.state, events: [...events, ...hit.events] };
  }
  return { state: setCoop(back, { hearts: c.hearts - 1 }), events: [...events, { type: 'heartLost' }] };
}

export function challengeCorrect(s: GameState, _player: number): Step {
  const ch = s.coop!.challenge!;
  if (ch.kind === 'elements') {
    const step = ch.step + 1;
    if (step >= ch.sequence.length) return finish(s, true);
    return { state: setCoop(s, { challenge: { ...ch, step } }), events: [] };
  }
  const count = ch.count + 1;
  if (count >= ch.target) return finish(s, true);
  return { state: setCoop(s, { challenge: { ...ch, count } }), events: [] };
}

export function tickChallenge(s: GameState, dt: number): Step {
  const ch = s.coop!.challenge!;
  const timeLeft = ch.timeLeft - dt;
  if (timeLeft <= 0) return finish(s, false);
  return { state: setCoop(s, { challenge: { ...ch, timeLeft } }), events: [] };
}
