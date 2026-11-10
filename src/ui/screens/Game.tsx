import { useEffect, useMemo, useRef, useState } from 'react';
import type { SymbolDef } from '../../content/types';
import { GameController } from '../../engine/controller';
import { elementsOf } from '../../engine/coop/defense';
import { attackEvery } from '../../engine/coop/monster';
import { layoutWithFallback, type Placement } from '../../engine/layout';
import { MODES } from '../../engine/modes';
import { SURVIVAL_START_MS } from '../../engine/modes/soloSurvival';
import { createGame } from '../../engine/reducer';
import { createRng } from '../../engine/rng';
import { computeTable, floorBand } from '../../engine/seats';
import { pendingChoice } from '../../engine/modes/bomb';
import { ROUND_SEED_STEP, type GameConfig, type GameState, type Grade, type RoundState } from '../../engine/state';
import { opponentsOf, teamTotals } from '../../engine/teams';
import { speak } from '../../services/speech';
import { CenterCard } from '../components/CenterCard';
import { CoopPanel, type CoopBanner } from '../components/CoopPanel';
import { SoloHud } from '../components/SoloHud';
import { Hud } from '../components/Hud';
import { extrasRect, SeatView } from '../components/SeatView';

const FLASH_MS = 400;
const BANNER_MS = 1200;
const GRADE_MS = 800;
const SEAT_SEED_STEP = 101;
const CENTER_SEAT = 99;

interface Props {
  config: GameConfig;
  symbols: SymbolDef[];
  onOver: (s: GameState) => void;
  /** 서바이벌 최고 점수 (고스트) */
  best?: number | null;
}

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

export function Game({ config, symbols, onOver, best = null }: Props) {
  const byId = useMemo(() => new Map(symbols.map(s => [s.id, s])), [symbols]);
  const controllerRef = useRef<GameController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new GameController(createGame(config, symbols.map(s => s.id), MODES, symbols), MODES);
  }
  const controller = controllerRef.current;
  const [state, setState] = useState(controller.getState());
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  const [wrongFlash, setWrongFlash] = useState<Set<number>>(new Set());
  const [banner, setBanner] = useState<CoopBanner | null>(null);
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;
  const freezeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hits, setHits] = useState<Map<number, string>>(new Map());
  const hitTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 화면을 떠날 때 정답 강조 타이머를 정리한다
  useEffect(() => () => {
    if (freezeTimer.current) clearTimeout(freezeTimer.current);
    hitTimers.current.forEach(clearTimeout);
  }, []);

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
        // 협동 배너: 공격 경고와 방어 결과를 잠깐 띄운다
        // 혼자 하기 판정을 잠깐 보여준다
        if (e.type === 'grade') {
          const g = e.grade;
          setLastGrade(g);
          timers.push(setTimeout(() => setLastGrade(cur => (cur === g ? null : cur)), GRADE_MS));
        }
        if (e.type === 'challengeStart' || e.type === 'challengeEnd') {
          const text: CoopBanner = e.type === 'challengeStart' ? '공격 준비!' : e.success ? '막았다!' : '아야!';
          setBanner(text);
          timers.push(setTimeout(() => setBanner(b => (b === text ? null : b)), BANNER_MS));
        }
        // 마지막 정답 강조를 보여준 뒤에 결과 화면으로 넘어간다
        if (e.type === 'over') timers.push(setTimeout(() => onOverRef.current(s), FLASH_MS));
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
  const isCoop = config.mode === 'coop';
  const isSolo = config.mode === 'soloSurvival' || config.mode === 'soloStage';
  const table = useMemo(
    () => computeTable(config.players.length as 1 | 2 | 3 | 4, W, H, { tallHud: isCoop || isSolo }),
    [config.players.length, W, H, isCoop, isSolo],
  );
  const round = freeze?.round ?? state.round;

  const { rules } = config;
  // 콤보·아이템·대상 버튼이 뜰 수 있으면 그 칸에도 글자를 놓지 않는다
  const needExtras = rules.combo || rules.items || (config.mode === 'bomb' && config.bomb.target === 'choose');

  const layouts = useMemo(() => {
    const seed = config.seed + round.index * ROUND_SEED_STEP;
    const seats = table.seats.map((seat, i): Placement[] =>
      layoutWithFallback({
        region: seat.region, exclusions: needExtras ? [seat.badge, extrasRect(seat)] : [seat.badge], count: round.cards[i].length,
        rotate: config.symbolRotation, rng: createRng(seed + i * SEAT_SEED_STEP),
      }));
    const c = table.center;
    const center = layoutWithFallback({
      region: { ellipse: c, clip: { x: c.cx - c.rx, y: c.cy - c.ry, w: 2 * c.rx, h: 2 * c.ry } },
      exclusions: [floorBand(c)], count: round.center.length, rotate: config.symbolRotation,
      rng: createRng(seed + CENTER_SEAT * SEAT_SEED_STEP),
    });
    return { seats, center };
  }, [round, table, config.seed, config.symbolRotation, needExtras]);

  const tap = (player: number, symbol: string) => {
    const before = controller.getState();
    // 화면에 보이는 라운드 번호로 보낸다. 이전 카드가 보이는 동안의 터치는 엔진이 무시한다
    const events = controller.dispatch({ type: 'TAP', player, symbol, round: round.index });
    if (events.some(e => e.type === 'round')) {
      setFreeze({ round: before.round, player, symbol });
      // 정답 강조를 보여주는 동안 게임 시간을 멈춘다 (서바이벌 +1초가 줄지 않게)
      controller.hold(FLASH_MS);
      if (freezeTimer.current) clearTimeout(freezeTimer.current);
      freezeTimer.current = setTimeout(() => { freezeTimer.current = null; setFreeze(null); }, FLASH_MS);
    } else if (events.some(e => e.type === 'correct')) {
      // 라운드가 그대로인 정답(협동에서 먼저 맞힌 사람)도 노란 정답 강조를 잠깐 보여준다
      setHits(prev => new Map(prev).set(player, symbol));
      hitTimers.current.push(setTimeout(() => setHits(prev => {
        const next = new Map(prev);
        if (next.get(player) === symbol) next.delete(player);
        return next;
      }), FLASH_MS));
    }
  };

  const solo = config.mode === 'soloSurvival';
  const coop = state.coop;
  const n = config.players.length;
  // 원소 순서 방어 중 차례가 아닌 자리, 또는 전투 중 이번 라운드에 이미 맞힌 자리는 흐리게
  const dimSeat = (i: number) => {
    if (!coop) return false;
    const ch = coop.challenge;
    if (ch?.kind === 'elements') return !elementsOf(i, n).includes(ch.sequence[ch.step]);
    return !ch && coop.answered[i];
  };
  const totals = teamTotals(state);
  const lastRound = rules.finalRound && state.round.index === config.scoreRounds - 1;
  const pending = pendingChoice(state);
  const hudContent = solo ? (
    <>
      <span>{Math.max(0, Math.ceil(state.mode.timeLeft / 1000))}초</span>
      <span className="hud__bar"><i style={{ width: `${Math.min(100, (state.mode.timeLeft / SURVIVAL_START_MS) * 100)}%` }} /></span>
    </>
  ) : (
    <>
      {totals && <span className="hud__teams">{`A ${totals[0]} : ${totals[1]} B`}</span>}
      <span>{Math.min(state.round.index + 1, config.scoreRounds)}/{config.scoreRounds}</span>
      {config.mode === 'bomb' && <span aria-hidden="true">💣</span>}
      {lastRound && <span className="hud__final">×3</span>}
      {!totals && <span className="hud__bar"><i style={{ width: `${(state.round.index / config.scoreRounds) * 100}%` }} /></span>}
    </>
  );

  return (
    <div className={isSolo && state.now < (state.mode.feverUntil ?? 0) ? "table is-fever" : "table"}>
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
          showName={config.players.length <= 2 && !isCoop}
          locked={state.now < state.players[i].lockedUntil}
          flash={freeze?.player === i || hits.has(i) ? 'correct' : wrongFlash.has(i) ? 'wrong' : null}
          correctSymbol={freeze?.player === i ? freeze.symbol : hits.get(i) ?? null}
          onTap={symbol => tap(i, symbol)}
          streak={rules.combo ? state.players[i].streak : 0}
          item={rules.items ? state.players[i].item : null}
          onUseItem={() => controller.dispatch({ type: 'USE_ITEM', player: i })}
          team={config.teams?.[i] ?? null}
          tower={config.mode === 'tower'}
          hintSymbol={state.players[i].hintRound === round.index ? round.answers[i] : null}
          spinning={state.now < state.players[i].spinUntil}
          targets={pending?.from === i
            ? opponentsOf(state, i).map(o => ({ index: o, name: config.players[o].name, color: config.players[o].color }))
            : null}
          onPickTarget={target => controller.dispatch({ type: 'CHOOSE_TARGET', player: i, target })}
          elements={coop ? elementsOf(i, n) : undefined}
          dim={dimSeat(i)}
          hideScore={isCoop}
        />
      ))}
      {table.hud.map((h, i) => (
        <Hud key={i} rect={h.rect} facing={h.facing} tall={isCoop}>
          {coop ? (
            <CoopPanel coop={coop} attackEvery={attackEvery(coop.stage)} banner={banner} />
          ) : isSolo ? (
            <SoloHud mode={state.mode} kind={config.mode as 'soloSurvival' | 'soloStage'} now={state.now} best={best} lastGrade={lastGrade} />
          ) : (
            hudContent
          )}
        </Hud>
      ))}
    </div>
  );
}
