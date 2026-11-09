import { challengeCanTap, challengeCorrect, startChallenge, tickChallenge } from '../coop/defense';
import { applyDamage, freshMonster, HEARTS_START, NO_MISSION, setCoop, WRONG_PENALTY_MS } from '../coop/monster';
import type { CoopState, GameEvent, Mode } from '../state';

export const coop: Mode = {
  init: () => ({}),
  initCoop: (config, ctx): CoopState => ({
    hearts: HEARTS_START,
    attackCount: 0,
    symbols: ctx.symbols,
    ...(freshMonster(1, config.players.length, NO_MISSION) as Omit<CoopState, 'hearts' | 'attackCount' | 'symbols'>),
  }),

  canTap: (s, player) => (s.coop!.challenge ? challengeCanTap(s, player) : !s.coop!.answered[player]),

  onCorrect: (s, player) => {
    // 방어 챌린지 중: 정답 피해 없이 챌린지만 진행하고, 매번 새 라운드
    if (s.coop!.challenge) {
      const r = challengeCorrect(s, player);
      return { state: r.state, nextRound: true, events: r.events };
    }
    const stage = s.coop!.stage;
    const answered = s.coop!.answered.map((a, i) => a || i === player);
    const first = applyDamage(setCoop(s, { answered }), 1, false);
    const events: GameEvent[] = [...first.events];
    let state = first.state;
    // 몬스터가 쓰러졌으면 새 몬스터와 새 라운드
    if (state.coop!.stage !== stage) return { state, nextRound: true, events };
    // 모두 맞혔으면 합체 공격
    if (state.coop!.answered.every(Boolean)) {
      const combo = applyDamage(state, s.players.length, true);
      state = setCoop(combo.state, { answered: combo.state.coop!.answered.map(() => false) });
      events.push(...combo.events);
      return { state, nextRound: true, events };
    }
    return { state, nextRound: false, events };
  },

  // 챌린지 중 오답은 잠금만 걸고 공격 타이머는 줄이지 않는다
  onWrong: s => (s.coop!.challenge ? s : setCoop(s, { attackLeft: Math.max(0, s.coop!.attackLeft - WRONG_PENALTY_MS) })),

  onTick: (s, dt) => {
    if (s.coop!.challenge) return tickChallenge(s, dt);
    const attackLeft = s.coop!.attackLeft - dt;
    if (attackLeft <= 0) return startChallenge(s);
    return { state: setCoop(s, { attackLeft }) };
  },

  isOver: s => (s.coop?.hearts ?? 1) <= 0,
};
