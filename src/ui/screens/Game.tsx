import { useEffect, useMemo, useRef, useState } from 'react';
import type { SymbolDef } from '../../content/types';
import { GameController } from '../../engine/controller';
import { layoutWithFallback, type Placement } from '../../engine/layout';
import { MODES } from '../../engine/modes';
import { SURVIVAL_START_MS } from '../../engine/modes/soloSurvival';
import { createGame } from '../../engine/reducer';
import { createRng } from '../../engine/rng';
import { computeTable } from '../../engine/seats';
import type { GameConfig, GameState, RoundState } from '../../engine/state';
import { speak } from '../../services/speech';
import { CenterCard } from '../components/CenterCard';
import { Hud } from '../components/Hud';
import { SeatView } from '../components/SeatView';

const FLASH_MS = 400;
const ROUND_SEED_STEP = 7919;
const SEAT_SEED_STEP = 101;
const CENTER_SEAT = 99;

interface Props { config: GameConfig; symbols: SymbolDef[]; onOver: (s: GameState) => void }

/** 정답 직후 잠깐 이전 라운드를 보여주며 정답 글자를 강조한다 */
interface Freeze { round: RoundState; player: number; symbol: string }

function useViewport() {
  const [size, setSize] = useState({ W: window.innerWidth, H: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ W: window.innerWidth, H: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

export function Game({ config, symbols, onOver }: Props) {
  const byId = useMemo(() => new Map(symbols.map(s => [s.id, s])), [symbols]);
  const controllerRef = useRef<GameController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new GameController(createGame(config, symbols.map(s => s.id), MODES), MODES);
  }
  const controller = controllerRef.current;
  const [state, setState] = useState(controller.getState());
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  const [wrongFlash, setWrongFlash] = useState<Set<number>>(new Set());
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const off = controller.subscribe((s, events) => {
      setState(s);
      for (const e of events) {
        if (e.type === 'correct') {
          const sym = byId.get(e.symbol);
          if (config.speech && sym) speak(sym.speech, sym.lang);
        }
        if (e.type === 'wrong') {
          setWrongFlash(prev => new Set(prev).add(e.player));
          timers.push(setTimeout(() => setWrongFlash(prev => { const n = new Set(prev); n.delete(e.player); return n; }), FLASH_MS));
        }
        if (e.type === 'over') onOverRef.current(s);
      }
    });
    controller.start();
    return () => { off(); controller.stop(); timers.forEach(clearTimeout); };
  }, [controller, byId, config.speech]);

  useEffect(() => {
    // 가로 고정을 시도한다. 지원하지 않거나 전체 화면이 아니면 조용히 넘어간다
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation?.lock?.('landscape').catch(() => {});
  }, []);

  const { W, H } = useViewport();
  const table = useMemo(() => computeTable(config.players.length as 1 | 2 | 3 | 4, W, H), [config.players.length, W, H]);
  const round = freeze?.round ?? state.round;

  const layouts = useMemo(() => {
    const seed = config.seed + round.index * ROUND_SEED_STEP;
    const seats = table.seats.map((seat, i): Placement[] =>
      layoutWithFallback({
        region: seat.region, exclusions: [seat.badge], count: round.cards[i].length,
        rotate: config.symbolRotation, rng: createRng(seed + i * SEAT_SEED_STEP),
      }));
    const c = table.center;
    const center = layoutWithFallback({
      region: { ellipse: c, clip: { x: c.cx - c.rx, y: c.cy - c.ry, w: 2 * c.rx, h: 2 * c.ry } },
      exclusions: [], count: round.center.length, rotate: config.symbolRotation,
      rng: createRng(seed + CENTER_SEAT * SEAT_SEED_STEP),
    });
    return { seats, center };
  }, [round, table, config.seed, config.symbolRotation]);

  const tap = (player: number, symbol: string) => {
    const before = controller.getState();
    // 화면에 보이는 라운드 번호로 보낸다. 이전 카드가 보이는 동안의 터치는 엔진이 무시한다
    const events = controller.dispatch({ type: 'TAP', player, symbol, round: round.index });
    if (events.some(e => e.type === 'round')) {
      setFreeze({ round: before.round, player, symbol });
      setTimeout(() => setFreeze(null), FLASH_MS);
    }
  };

  const solo = config.mode === 'soloSurvival';
  const hudContent = solo ? (
    <>
      <span>{Math.max(0, Math.ceil(state.mode.timeLeft / 1000))}초</span>
      <span className="hud__bar"><i style={{ width: `${Math.min(100, (state.mode.timeLeft / SURVIVAL_START_MS) * 100)}%` }} /></span>
    </>
  ) : (
    <>
      <span>{Math.min(state.round.index + 1, config.scoreRounds)}/{config.scoreRounds}</span>
      <span className="hud__bar"><i style={{ width: `${(state.round.index / config.scoreRounds) * 100}%` }} /></span>
    </>
  );

  return (
    <div className="table">
      <CenterCard circle={table.center} symbols={round.center.map(id => byId.get(id)!)} placements={layouts.center} rotation={round.rotation} />
      {table.seats.map((seat, i) => (
        <SeatView
          key={i}
          index={i}
          geom={seat}
          color={config.players[i].color}
          symbols={round.cards[i].map(id => byId.get(id)!)}
          placements={layouts.seats[i]}
          score={solo ? state.mode.correct : state.players[i].score}
          name={config.players[i].name}
          showName={config.players.length <= 2}
          locked={state.now < state.players[i].lockedUntil}
          flash={freeze?.player === i ? 'correct' : wrongFlash.has(i) ? 'wrong' : null}
          correctSymbol={freeze?.player === i ? freeze.symbol : null}
          onTap={symbol => tap(i, symbol)}
        />
      ))}
      {table.hud.map((h, i) => <Hud key={i} rect={h.rect} facing={h.facing}>{hudContent}</Hud>)}
    </div>
  );
}
