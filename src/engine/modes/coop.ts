import { applyDamage, freshMonster, HEARTS_START, NO_MISSION, setCoop, WRONG_PENALTY_MS } from '../coop/monster';
import type { GameEvent, Mode } from '../state';

export const coop: Mode = {
  init: () => ({}),
  initCoop: (config, ctx) => ({
    hearts: HEARTS_START,
    attackCount: 0,
    symbols: ctx.symbols,
    ...freshMonster(1, config.players.length, NO_MISSION),
  }) as ReturnType<NonNullable<Mode['initCoop']>>,

  canTap: (s, player) => !s.coop!.answered[player],

  onCorrect: (s, player) => {
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

  onWrong: s => setCoop(s, { attackLeft: Math.max(0, s.coop!.attackLeft - WRONG_PENALTY_MS) }),

  onTick: (s, dt) => ({ state: setCoop(s, { attackLeft: Math.max(0, s.coop!.attackLeft - dt) }) }),

  isOver: s => (s.coop?.hearts ?? 1) <= 0,
};
