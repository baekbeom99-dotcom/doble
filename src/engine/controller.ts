import { reduce } from './reducer';
import type { Action, GameEvent, GameState, ModeTable } from './state';

/** 탭이 숨겨졌다 돌아올 때 시간이 한 번에 흐르지 않도록 프레임 간격을 제한한다 */
export const MAX_DT = 100;

type Listener = (s: GameState, events: GameEvent[]) => void;

export class GameController {
  private state: GameState;
  private listeners = new Set<Listener>();
  private last: number | null = null;
  private raf: number | null = null;
  private holdLeft = 0;

  constructor(initial: GameState, private modes: ModeTable) {
    this.state = initial;
  }

  getState(): GameState {
    return this.state;
  }

  dispatch(a: Action): GameEvent[] {
    const { state, events } = reduce(this.state, a, this.modes);
    if (state === this.state && events.length === 0) return events;
    this.state = state;
    this.listeners.forEach(fn => fn(state, events));
    return events;
  }

  frame(timestampMs: number): void {
    let dt = this.last === null ? 0 : Math.min(MAX_DT, Math.max(0, timestampMs - this.last));
    this.last = timestampMs;
    // 멈춤 시간이 남아 있으면 그만큼 시간을 흘려보내지 않는다
    const held = Math.min(dt, this.holdLeft);
    this.holdLeft -= held;
    dt -= held;
    if (dt > 0) this.dispatch({ type: 'TICK', dt });
  }

  /** ms 동안 게임 시간을 멈춘다 (정답 강조를 보여주는 동안 등) */
  hold(ms: number): void {
    this.holdLeft = Math.max(this.holdLeft, ms);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  start(): void {
    if (this.raf !== null || typeof requestAnimationFrame !== 'function') return;
    const loop = (t: number) => {
      this.frame(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.last = null;
  }
}
