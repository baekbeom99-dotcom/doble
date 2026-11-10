import { fireCorrect, isBurning, startFire, tickFire } from '../coop/fire';
import { makeMission, missionProgress } from '../coop/missions';
import { applyDamage, freshMonster, HEARTS_START, setCoop, WRONG_PENALTY_MS } from '../coop/monster';
import type { CoopState, GameEvent, GameState, Mode } from '../state';

/** 불을 맞은 사람을 빼고 모두 이번 라운드에 맞혔는지 */
function allAnswered(s: GameState): boolean {
  return s.coop!.answered.every((a, i) => a || isBurning(s, i));
}

export const coop: Mode = {
  init: () => ({}),
  initCoop: (config, ctx): CoopState => ({
    hearts: HEARTS_START,
    attackCount: 0,
    symbols: ctx.symbols,
    ...(freshMonster(1, config.players.length, makeMission(config, ctx.symbols, 1), config.seed, 0) as Omit<CoopState, 'hearts' | 'attackCount' | 'symbols'>),
  }),

  canTap: (s, player) => !isBurning(s, player) && !s.coop!.answered[player],

  onCorrect: (before, player) => {
    // 미션 진행도를 먼저 올린다. 보상으로 몬스터가 쓰러지면 새 몬스터와 새 라운드
    const mission = missionProgress(before, before.round.answers[player]);
    let s = mission.state;
    if (s.coop!.stage !== before.coop!.stage) return { state: s, nextRound: true, events: mission.events };
    const events: GameEvent[] = [...mission.events];
    // 불이 붙어 있으면 다른 친구의 정답이 불 끄기에 보탬이 된다
    if (s.coop!.fire) {
      const r = fireCorrect(s, player);
      s = r.state;
      events.push(...r.events);
    }
    const stage = s.coop!.stage;
    const answered = s.coop!.answered.map((a, i) => a || i === player);
    const first = applyDamage(setCoop(s, { answered }), 1, false);
    events.push(...first.events);
    let state = first.state;
    // 몬스터가 쓰러졌으면 새 몬스터와 새 라운드
    if (state.coop!.stage !== stage) return { state, nextRound: true, events };
    // 불 맞은 사람을 빼고 모두 맞혔으면 합체 공격 (맞힌 사람 수만큼 추가 피해)
    if (allAnswered(state)) {
      const helpers = state.coop!.answered.filter(Boolean).length;
      const combo = applyDamage(state, helpers, true);
      state = setCoop(combo.state, { answered: combo.state.coop!.answered.map(() => false) });
      events.push(...combo.events);
      return { state, nextRound: true, events };
    }
    return { state, nextRound: false, events };
  },

  // 불 공격 중 오답은 잠금만 걸고 공격 타이머는 줄이지 않는다
  onWrong: s => (s.coop!.fire ? s : setCoop(s, { attackLeft: Math.max(0, s.coop!.attackLeft - WRONG_PENALTY_MS) })),

  onTick: (s, dt) => {
    if (s.coop!.fire) return tickFire(s, dt);
    const attackLeft = s.coop!.attackLeft - dt;
    if (attackLeft <= 0) return startFire(s);
    return { state: setCoop(s, { attackLeft }) };
  },

  isOver: s => (s.coop?.hearts ?? 1) <= 0,
};
