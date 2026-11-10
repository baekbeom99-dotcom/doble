import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SymbolDef } from '../../content/types';
import { GameController } from '../../engine/controller';
import { pointInRegion, type Ellipse } from '../../engine/geometry';
import { layoutWithFallback, type Placement } from '../../engine/layout';
import { MODES } from '../../engine/modes';
import { SURVIVAL_START_MS } from '../../engine/modes/soloSurvival';
import { createGame } from '../../engine/reducer';
import { createRng } from '../../engine/rng';
import { computeTable, floorBand, nameArc, SEAT_COLORS, type SeatGeom } from '../../engine/seats';
import { pendingChoice } from '../../engine/modes/bomb';
import { ROUND_SEED_STEP, type GameConfig, type GameState, type Grade, type RoundState } from '../../engine/state';
import { opponentsOf, teamTotals } from '../../engine/teams';
import { speak } from '../../services/speech';
import { CenterCard } from '../components/CenterCard';
import { CoopPanel } from '../components/CoopPanel';
import { coopMessage } from '../coopText';
import { SoloHud } from '../components/SoloHud';
import { Hud } from '../components/Hud';
import { PatternBackdrop } from '../components/PatternBackdrop';
import { SkyScene } from '../components/SkyScene';
import { skyCenter, skyPhase } from '../../engine/sky';
import { TURTLE_MOUTH, VillainTurtle, type TurtleMood } from '../components/VillainTurtle';
import { extrasRect, SeatView } from '../components/SeatView';

const FLASH_MS = 400;
/** 협동 상황 문구를 보여 주는 시간 */
const MESSAGE_MS = 3200;
/** 불을 뿜지 않을 때 거북이가 고개를 돌리는 간격 */
const LOOK_MS = 2400;
const GRADE_MS = 800;
/** 정답 때 화면 가장자리가 반짝이는 시간 */
const EDGE_MS = 600;
const HURT_MS = 450;
const SEAT_SEED_STEP = 101;
const CENTER_SEAT = 99;

interface Props {
  config: GameConfig;
  symbols: SymbolDef[];
  onOver: (s: GameState) => void;
  /** 서바이벌 최고 점수 (고스트) */
  best?: number | null;
  /** 게임 중 나가기 */
  onExit?: () => void;
}

/** 정답 직후 잠깐 이전 라운드를 보여주며 정답 글자를 강조한다 */
interface Freeze { round: RoundState; player: number; symbol: string }

/** 중앙에서 자리 쪽으로 가다가 처음 자리 영역에 닿는 점 (불이 닿는 곳) */
function hitPoint(center: Ellipse, seat: SeatGeom): { x: number; y: number } {
  const e = seat.region.ellipse;
  const tx = Math.min(Math.max(e.cx, 0), seat.region.clip.w), ty = Math.min(Math.max(e.cy, 0), seat.region.clip.h);
  for (let f = 0; f <= 1; f += 0.01) {
    const x = center.cx + (tx - center.cx) * f, y = center.cy + (ty - center.cy) * f;
    if (pointInRegion(x, y, seat.region)) return { x, y };
  }
  return { x: tx, y: ty };
}

/** 넓게 퍼지는 불길의 테두리: 입(폭 w0)에서 끝(폭 w1)까지 물결치는 원뿔 (x축 방향) */
function breathCone(len: number, w0: number, w1: number, wobble: number, phase: number): string {
  const steps = 14;
  const top: string[] = [], bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = len * t;
    const w = w0 + (w1 - w0) * Math.pow(t, 0.7);
    const wave = wobble * w * Math.sin(t * Math.PI * 5 + phase);
    top.push(`${x.toFixed(1)} ${(-w - wave).toFixed(1)}`);
    bottom.unshift(`${x.toFixed(1)} ${(w - wave * 0.6).toFixed(1)}`);
  }
  // 끝은 둥글게 부풀린다
  return `M0 ${(-w0).toFixed(1)} L${top.join(' L')} Q${(len + w1 * 0.9).toFixed(1)} 0 ${bottom[0]} L${bottom.slice(1).join(' L')} Z`;
}

/** 거북이 입에서 뿜어져 나오는 드래곤 브레스: 넓게 퍼지는 세 겹 불길과 끝의 불덩이, 튀는 불티 */
function FireBeam({ from, to, r }: { from: { x: number; y: number }; to: { x: number; y: number }; r: number }) {
  const dx = to.x - from.x, dy = to.y - from.y;
  // 자리 안쪽까지 조금 더 파고들게 늘린다
  const len = Math.hypot(dx, dy) + 0.35 * r;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const sparks = [[0.35, -0.7], [0.55, 0.85], [0.8, -1.1], [0.95, 0.6], [0.7, 0.1]];
  return (
    <svg className="fire-beam" data-testid="fire-beam" aria-hidden="true">
      <g transform={`translate(${from.x.toFixed(1)} ${from.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <g className="fire-beam__flame">
          <path d={breathCone(len, 0.12 * r, 0.75 * r, 0.18, 0)} fill="#b8361f" />
          <path d={breathCone(len * 0.97, 0.09 * r, 0.56 * r, 0.2, 1.3)} fill="#e0602e" />
          <path d={breathCone(len * 0.9, 0.06 * r, 0.36 * r, 0.22, 2.4)} fill="#f2a34a" />
          <path d={breathCone(len * 0.78, 0.03 * r, 0.18 * r, 0.25, 3.1)} fill="#fbe08a" />
        </g>
        <g className="fire-beam__sparks">
          {sparks.map(([t, side], i) => (
            <circle key={i} cx={(len * t).toFixed(1)} cy={(side * 0.75 * r * t).toFixed(1)} r={(0.05 * r).toFixed(1)} fill={i % 2 ? '#fbe08a' : '#f2a34a'} />
          ))}
        </g>
      </g>
    </svg>
  );
}

function useViewport() {
  const [size, setSize] = useState({ W: window.innerWidth, H: window.innerHeight });
  useEffect(() => {
    const onResize = () => setSize({ W: window.innerWidth, H: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

export function Game({ config, symbols, onOver, best = null, onExit }: Props) {
  const byId = useMemo(() => new Map(symbols.map(s => [s.id, s])), [symbols]);
  const controllerRef = useRef<GameController | null>(null);
  if (!controllerRef.current) {
    controllerRef.current = new GameController(createGame(config, symbols.map(s => s.id), MODES, symbols), MODES);
  }
  const controller = controllerRef.current;
  const [state, setState] = useState(controller.getState());
  const [freeze, setFreeze] = useState<Freeze | null>(null);
  const [wrongFlash, setWrongFlash] = useState<Set<number>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  // 악당 거북이 머리 방향 (도)
  const [look, setLook] = useState(0);
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);
  // 정답 때 가장자리 반짝임. key를 바꿔 연달아 맞혀도 애니메이션을 다시 시작한다
  const [edge, setEdge] = useState<{ player: number; key: number } | null>(null);
  const [hurt, setHurt] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  // 지금까지 나온 정답 수 (배경 무늬를 바꾸는 데 쓴다)
  const [hitCount, setHitCount] = useState(0);
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
          setHitCount(c => c + 1);
          const flash = { player: e.player, key: performance.now() + Math.random() };
          setEdge(flash);
          timers.push(setTimeout(() => setEdge(cur => (cur === flash ? null : cur)), EDGE_MS));
        }
        if (e.type === 'damage') {
          setHurt(true);
          timers.push(setTimeout(() => setHurt(false), HURT_MS));
        }
        if (e.type === 'wrong') {
          setWrongFlash(prev => new Set(prev).add(e.player));
          timers.push(setTimeout(() => setWrongFlash(prev => { const n = new Set(prev); n.delete(e.player); return n; }), FLASH_MS));
        }
        // 혼자 하기 판정을 잠깐 보여준다
        if (e.type === 'grade') {
          const g = e.grade;
          setLastGrade(g);
          timers.push(setTimeout(() => setLastGrade(cur => (cur === g ? null : cur)), GRADE_MS));
        }
        // 협동: 불 공격·구출·미션 같은 일을 문장으로 알려 준다
        if (config.mode === 'coop') {
          const text = coopMessage(e, config.players.map(p => p.name));
          if (text) {
            setMessage(text);
            timers.push(setTimeout(() => setMessage(m => (m === text ? null : m)), MESSAGE_MS));
          }
        }
        // 마지막 정답 강조를 보여준 뒤에 결과 화면으로 넘어간다
        if (e.type === 'over') timers.push(setTimeout(() => onOverRef.current(s), FLASH_MS));
      }
    });
    controller.start();
    return () => { off(); controller.stop(); timers.forEach(clearTimeout); };
  }, [controller, byId, config.speech, config.mode, config.players]);

  useEffect(() => {
    // 가로 고정을 시도한다. 지원하지 않거나 전체 화면이 아니면 조용히 넘어간다
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation?.lock?.('landscape').catch(() => {});
  }, []);

  const isCoop = config.mode === 'coop';
  // 불을 뿜지 않을 때 악당 거북이가 이리저리 고개를 돌린다
  useEffect(() => {
    if (!isCoop) return;
    const id = setInterval(() => setLook(Math.round(Math.random() * 360)), LOOK_MS);
    return () => clearInterval(id);
  }, [isCoop]);

  const { W, H } = useViewport();
  const isSolo = config.mode === 'soloSurvival' || config.mode === 'soloStage';
  const table = useMemo(
    () => computeTable(config.players.length as 1 | 2 | 3 | 4, W, H, { tallHud: isCoop || isSolo, sky: isSolo, coop: isCoop }),
    [config.players.length, W, H, isCoop, isSolo],
  );
  const round = freeze?.round ?? state.round;
  // 혼자 하기: 정답 수만큼 해(달)가 움직인다. 정답 강조 중에는 이전 자리에 둔다
  const phase = isSolo ? skyPhase(state.mode.correct - (freeze ? 1 : 0)) : null;
  const skyT = phase?.t ?? null;
  const centerCircle = useMemo(() => (skyT === null ? table.center : skyCenter(table, W, H, skyT)), [skyT, table, W, H]);

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
    const c = centerCircle;
    const center = layoutWithFallback({
      region: { ellipse: c, clip: { x: c.cx - c.rx, y: c.cy - c.ry, w: 2 * c.rx, h: 2 * c.ry } },
      exclusions: [floorBand(c)], count: round.center.length, rotate: config.symbolRotation,
      rng: createRng(seed + CENTER_SEAT * SEAT_SEED_STEP),
    });
    return { seats, center };
  }, [round, table, centerCircle, config.seed, config.symbolRotation, needExtras]);

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
  const burning = (i: number) => coop?.fire?.target === i;
  // 협동: 이번 라운드에 이미 맞힌 자리는 흐리게
  const dimSeat = (i: number) => !!coop && coop.answered[i] && !burning(i);
  const namePaths = useMemo(
    () => table.seats.map(seat => nameArc(seat, W, H, [...table.hud.map(h => h.rect), table.exit]).d),
    [table, W, H],
  );
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

  const openExit = () => { controller.stop(); setConfirmExit(true); };
  const resume = () => { setConfirmExit(false); controller.start(); };
  const leave = () => { controller.stop(); onExit?.(); };
  const mood: TurtleMood = hurt ? 'hurt' : coop?.fire ? 'angry' : 'idle';
  // 불을 뿜을 때는 맞는 사람 쪽을 본다
  const fireTo = coop?.fire ? hitPoint(table.center, table.seats[coop.fire.target]) : null;
  const heading = fireTo ? (Math.atan2(fireTo.y - table.center.cy, fireTo.x - table.center.cx) * 180) / Math.PI : look;
  const mouth = {
    x: table.center.cx + TURTLE_MOUTH * table.center.rx * Math.cos((heading * Math.PI) / 180),
    y: table.center.cy + TURTLE_MOUTH * table.center.rx * Math.sin((heading * Math.PI) / 180),
  };

  return (
    <div className={isSolo && state.now < (state.mode.feverUntil ?? 0) ? "table is-fever" : "table"}>
      {phase ? <SkyScene phase={phase} circle={centerCircle} /> : <PatternBackdrop index={hitCount} />}
      {coop && <VillainTurtle stage={coop.stage} circle={table.center} heading={heading} mood={mood} />}
      <CenterCard
        key={phase?.body ?? 'card'}
        circle={centerCircle}
        variant={phase?.body ?? (isCoop ? 'shell' : undefined)}
        symbols={round.center.map(id => byId.get(id)!)} placements={layouts.center} rotation={round.rotation} />
      {table.seats.map((seat, i) => (
        <SeatView
          key={i}
          index={i}
          geom={seat}
          color={config.players[i].color}
          symbols={round.cards[i].map(id => byId.get(id)!)}
          placements={layouts.seats[i]}
          score={isSolo ? state.mode.correct : state.players[i].score}
          name={config.players[i].name}
          showName
          namePath={namePaths[i]}
          burning={burning(i)}
          turtle={isSolo}
          locked={state.now < state.players[i].lockedUntil}
          flash={freeze?.player === i || hits.has(i) ? 'correct' : wrongFlash.has(i) ? 'wrong' : null}
          correctSymbol={freeze?.player === i ? freeze.symbol : hits.get(i) ?? null}
          onTap={symbol => tap(i, symbol)}
          streak={rules.combo ? state.players[i].streak : 0}
          item={rules.items ? state.players[i].item : null}
          onUseItem={() => controller.dispatch({ type: 'USE_ITEM', player: i })}
          team={config.teams?.[i] ?? null}
          hintSymbol={state.players[i].hintRound === round.index ? round.answers[i] : null}
          spinning={state.now < state.players[i].spinUntil}
          targets={pending?.from === i
            ? opponentsOf(state, i).map(o => ({ index: o, name: config.players[o].name, color: config.players[o].color }))
            : null}
          onPickTarget={target => controller.dispatch({ type: 'CHOOSE_TARGET', player: i, target })}
          dim={dimSeat(i)}
          hideScore={isCoop}
        />
      ))}
      {table.hud.map((h, i) => (
        <Hud key={i} rect={h.rect} facing={h.facing} tall={isCoop}>
          {coop ? (
            <CoopPanel coop={coop} names={config.players.map(p => p.name)} message={message} bannerBelow={h.facing === 0 && h.rect.y + h.rect.h / 2 < H / 2} />
          ) : isSolo ? (
            <SoloHud mode={state.mode} kind={config.mode as 'soloSurvival' | 'soloStage'} now={state.now} best={best} lastGrade={lastGrade} />
          ) : (
            hudContent
          )}
        </Hud>
      ))}
      {fireTo && <FireBeam from={mouth} to={fireTo} r={table.center.rx} />}
      {edge && (
        <div
          key={edge.key}
          className="edge-flash"
          data-testid="edge-flash"
          data-player={edge.player}
          style={{ '--flash': SEAT_COLORS[config.players[edge.player].color] } as CSSProperties}
        />
      )}
      <button
        className="exit-btn"
        style={{ left: table.exit.x, top: table.exit.y, width: table.exit.w, height: table.exit.h }}
        onClick={openExit}
      >
        나가기
      </button>
      {confirmExit && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title">
            <h2 id="exit-title">게임을 그만할까요?</h2>
            <p>지금 게임은 기록되지 않아요</p>
            <div className="actions">
              <button className="btn" onClick={leave}>그만하기</button>
              <button className="btn btn--primary" onClick={resume}>계속하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
