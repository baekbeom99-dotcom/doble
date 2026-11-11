import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { SymbolDef } from '../../content/types';
import { GameController } from '../../engine/controller';
import { pointInRegion, type Ellipse } from '../../engine/geometry';
import { layoutWithFallback, type Placement } from '../../engine/layout';
import { MODES } from '../../engine/modes';
import { createGame } from '../../engine/reducer';
import { createRng } from '../../engine/rng';
import { computeTable, floorBand, nameArc, SEAT_COLORS, type SeatGeom } from '../../engine/seats';
import { pendingChoice } from '../../engine/modes/bomb';
import { ROUND_SEED_STEP, type GameConfig, type GameState, type Grade, type RoundState } from '../../engine/state';
import { opponentsOf, teamTotals } from '../../engine/teams';
import { speak } from '../../services/speech';
import { CenterCard } from '../components/CenterCard';
import { CoopPanel } from '../components/CoopPanel';
import { FireGauge } from '../components/FireGauge';
import { FullscreenButton } from '../components/FullscreenButton';
import { nextRoam, roamInterval } from '../../engine/coop/roam';
import { coopMessage } from '../coopText';
import { SoloHud } from '../components/SoloHud';
import { Hud } from '../components/Hud';
import { PatternBackdrop } from '../components/PatternBackdrop';
import { SkyScene } from '../components/SkyScene';
import { skyCenter, skyPhase } from '../../engine/sky';
import { TURTLE_EXTENT, TURTLE_MOUTH, VillainTurtle, type TurtleMood } from '../components/VillainTurtle';
import { extrasRect, SeatView } from '../components/SeatView';

const FLASH_MS = 400;
/** 협동 상황 문구를 보여 주는 시간 */
const MESSAGE_MS = 3200;
/** 불을 뿜지 않을 때 거북이가 고개를 돌리는 간격 */
const LOOK_MS = 2400;
/** 불을 뿜기 전에 고개를 돌리는 시간 (.villain transition과 같다) */
const TURN_MS = 700;
const GRADE_MS = 800;
/** 정답 때 화면 가장자리가 반짝이는 시간 */
const EDGE_MS = 600;
const HURT_MS = 450;
/** 거북이를 물리친 뒤 새 거북이가 자리 잡을 때까지 쉬어 가는 시간. 앞 절반은 쓰러지고 뒤 절반은 새로 나온다 */
const DEFEAT_MS = 3000;
/** 폭탄 돌리기: 넘긴 카드가 날아가는 시간 (.give-card 애니메이션 + 장마다 늦추는 시간) */
const GIVE_MS = 1300;
const GIVE_STAGGER_MS = 90;
const GIVE_MAX = 5;
/** 물리친 순간 사방으로 튀는 종이 조각 */
const SPARKS = 24;
const SPARK_COLORS = ['#f5c542', '#e0602e', '#fbe08a', '#8fb86a', '#6fb6d9', '#e58fb0'];
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
/** 물리친 거북이가 쓰러지고(down) 다음 거북이가 나오는(enter) 연출 */
interface Defeat { stage: number; phase: 'down' | 'enter' }
interface Give { key: number; from: number; to: number; count: number }

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
  const len = Math.hypot(dx, dy) + 0.7 * r;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const sparks = [[0.35, -0.7], [0.55, 0.85], [0.8, -1.1], [0.95, 0.6], [0.7, 0.1]];
  return (
    <svg className="fire-beam" data-testid="fire-beam" aria-hidden="true">
      <g transform={`translate(${from.x.toFixed(1)} ${from.y.toFixed(1)}) rotate(${angle.toFixed(1)})`}>
        <g className="fire-beam__flame">
          <path d={breathCone(len, 0.2 * r, 1.2 * r, 0.18, 0)} fill="#b8361f" />
          <path d={breathCone(len * 0.97, 0.15 * r, 0.9 * r, 0.2, 1.3)} fill="#e0602e" />
          <path d={breathCone(len * 0.9, 0.1 * r, 0.6 * r, 0.22, 2.4)} fill="#f2a34a" />
          <path d={breathCone(len * 0.78, 0.05 * r, 0.3 * r, 0.25, 3.1)} fill="#fbe08a" />
        </g>
        <g className="fire-beam__sparks">
          {sparks.map(([t, side], i) => (
            <circle key={i} cx={(len * t).toFixed(1)} cy={(side * 1.1 * r * t).toFixed(1)} r={(0.08 * r).toFixed(1)} fill={i % 2 ? '#fbe08a' : '#f2a34a'} />
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
  const [defeat, setDefeat] = useState<Defeat | null>(null);
  // 연출 중의 터치를 막는다 (state는 다음 그리기까지 늦으므로 ref로도 둔다)
  const defeatRef = useRef(false);
  // 혼자 하는 몬스터 사냥에서 거북이가 서 있는 가로 칸 (-1 ~ 1)
  const [roam, setRoam] = useState(0);
  const [gives, setGives] = useState<Give[]>([]);
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
        // 폭탄 돌리기: 넘긴 카드가 받는 사람에게 날아간다
        if (e.type === 'give') {
          const give: Give = { key: performance.now() + Math.random(), from: e.from, to: e.to, count: e.count };
          setGives(prev => [...prev, give]);
          timers.push(setTimeout(() => setGives(prev => prev.filter(g => g !== give)), GIVE_MS));
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
  // 불 공격이 시작되면 고개를 다 돌린 뒤에 불을 내보낸다
  const fireKey = state.coop?.fire ? `${state.coop.attackCount}-${state.coop.fire.target}` : null;
  const [aimed, setAimed] = useState<string | null>(null);
  useEffect(() => {
    if (!fireKey) return;
    const t = setTimeout(() => setAimed(fireKey), TURN_MS);
    return () => clearTimeout(t);
  }, [fireKey]);
  // 불을 뿜지 않을 때 악당 거북이가 이리저리 고개를 돌린다
  useEffect(() => {
    if (!isCoop) return;
    const id = setInterval(() => setLook(Math.round(Math.random() * 360)), LOOK_MS);
    return () => clearInterval(id);
  }, [isCoop]);

  // 혼자 하는 몬스터 사냥: 세 번째 거북이부터 가끔 자리를 옮긴다. 불을 뿜거나 쓰러지는 동안에는 멈춘다
  const soloCoop = isCoop && config.players.length === 1;
  const stage = state.coop?.stage ?? 0;
  const roamPaused = !!state.coop?.fire || !!defeat || confirmExit;
  useEffect(() => { setRoam(0); }, [stage]);
  useEffect(() => {
    const every = soloCoop ? roamInterval(stage) : null;
    if (every === null || roamPaused) return;
    const id = setInterval(() => setRoam(r => nextRoam(r)), every);
    return () => clearInterval(id);
  }, [soloCoop, stage, roamPaused]);

  const { W, H } = useViewport();
  const isSolo = config.mode === 'soloSurvival' || config.mode === 'soloStage';
  const isBomb = config.mode === 'bomb';
  const isTeam = !!config.teams;
  // 대결 정보 칸: 팀 점수 아래에 진행 줄, 폭탄 돌리기는 규칙 두 줄이 더 들어가는 만큼만 잡는다
  const hudBox = useMemo(
    () => (isCoop || isSolo ? undefined
      : isBomb ? { w: 0.17, h: isTeam ? 0.15 : 0.115 }
      : isTeam ? { w: 0.13, h: 0.1 } : undefined),
    [isCoop, isSolo, isBomb, isTeam],
  );
  const table = useMemo(
    () => computeTable(config.players.length as 1 | 2 | 3 | 4, W, H, { tallHud: isCoop || isSolo, sky: isSolo, coop: isCoop, hudBox }),
    [config.players.length, W, H, isCoop, isSolo, hudBox],
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
    // 거북이가 쓰러지고 새 거북이가 나오는 동안에는 쉬어 간다
    if (defeatRef.current) return;
    const before = controller.getState();
    // 화면에 보이는 라운드 번호로 보낸다. 이전 카드가 보이는 동안의 터치는 엔진이 무시한다
    const events = controller.dispatch({ type: 'TAP', player, symbol, round: round.index });
    const downed = events.some(e => e.type === 'monsterDown');
    if (downed) {
      const fallen = before.coop!.stage;
      defeatRef.current = true;
      setDefeat({ stage: fallen, phase: 'down' });
      hitTimers.current.push(
        setTimeout(() => setDefeat({ stage: fallen, phase: 'enter' }), DEFEAT_MS / 2),
        setTimeout(() => { defeatRef.current = false; setDefeat(null); }, DEFEAT_MS),
      );
    }
    if (events.some(e => e.type === 'round')) {
      setFreeze({ round: before.round, player, symbol });
      // 정답 강조를 보여주는 동안 게임 시간을 멈춘다 (서바이벌 +1초가 줄지 않게). 거북이를 물리치면 연출이 끝날 때까지 멈춘다
      controller.hold(downed ? DEFEAT_MS : FLASH_MS);
      if (freezeTimer.current) clearTimeout(freezeTimer.current);
      // 물리친 카드는 거북이가 쓰러지는 동안 그대로 두고, 새 거북이와 함께 새 카드를 보여 준다
      freezeTimer.current = setTimeout(() => { freezeTimer.current = null; setFreeze(null); }, downed ? DEFEAT_MS / 2 : FLASH_MS);
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

  const coop = state.coop;
  const burning = (i: number) => coop?.fire?.target === i;
  // 협동: 이번 라운드에 이미 맞힌 자리는 흐리게
  const dimSeat = (i: number) => !!coop && coop.answered[i] && !burning(i);
  const namePaths = useMemo(
    () => table.seats.map(seat => nameArc(seat, W, H, [...table.hud.map(h => h.rect), ...table.gauges.map(g => g.rect), table.exit]).d),
    [table, W, H],
  );
  const totals = teamTotals(state);
  const lastRound = rules.finalRound && state.round.index === config.scoreRounds - 1;
  const pending = pendingChoice(state);
  // 팀 점수가 윗줄, 진행(스테이지)이 아랫줄. 폭탄 돌리기는 규칙을 맨 아래에 적는다
  const hudContent = (
    <div className="hud__col">
      {totals && <span className="hud__teams">{`A ${totals[0]} : ${totals[1]} B`}</span>}
      <span className="hud__row">
        <span>{Math.min(state.round.index + 1, config.scoreRounds)}/{config.scoreRounds}</span>
        {isBomb && <span aria-hidden="true">💣</span>}
        {lastRound && <span className="hud__final">×3</span>}
        {!totals && <span className="hud__bar"><i style={{ width: `${(state.round.index / config.scoreRounds) * 100}%` }} /></span>}
      </span>
      {isBomb && <span className="hud__rule">맞히면 카드를 넘겨요<br />먼저 0장이면 이겨요</span>}
    </div>
  );

  const openExit = () => { controller.stop(); setConfirmExit(true); };
  const resume = () => { setConfirmExit(false); controller.start(); };
  const leave = () => { controller.stop(); onExit?.(); };
  const mood: TurtleMood = defeat ? defeat.phase : hurt ? 'hurt' : coop?.fire ? 'angry' : 'idle';
  // 거북이가 옆으로 옮겨 가면 등껍질 카드와 글자도 함께 옮긴다. 머리까지 화면 안에 남는 만큼만 간다
  const roamDx = soloCoop ? roam * Math.max(0, W / 2 - TURTLE_EXTENT * table.center.rx - 8) : 0;
  const turtleCircle = roamDx ? { ...table.center, cx: table.center.cx + roamDx } : table.center;
  const cardCircle = isCoop ? turtleCircle : centerCircle;
  const centerPlacements = roamDx ? layouts.center.map(p => ({ ...p, x: p.x + roamDx })) : layouts.center;
  // 불을 뿜을 때는 맞는 사람 쪽을 본다
  const fireTo = coop?.fire ? hitPoint(turtleCircle, table.seats[coop.fire.target]) : null;
  const showBeam = !!fireTo && aimed === fireKey;
  const heading = fireTo ? (Math.atan2(fireTo.y - turtleCircle.cy, fireTo.x - turtleCircle.cx) * 180) / Math.PI : look;
  const mouth = {
    x: turtleCircle.cx + TURTLE_MOUTH * turtleCircle.rx * Math.cos((heading * Math.PI) / 180),
    y: turtleCircle.cy + TURTLE_MOUTH * turtleCircle.rx * Math.sin((heading * Math.PI) / 180),
  };
  const names = config.players.map(p => p.name);
  /** 정보 칸 위에 불 게이지가 있으면 문구 띠를 그 위로 올린다 */
  const bannerLift = (i: number) => {
    const h = table.hud[i], g = table.gauges[i];
    if (!g) return 0;
    return Math.max(0, h.facing === 0 ? h.rect.y - g.rect.y : g.rect.y + g.rect.h - (h.rect.y + h.rect.h));
  };
  const tableClass = ['table', isSolo && state.now < (state.mode.feverUntil ?? 0) && 'is-fever', defeat && `is-defeat-${defeat.phase}`]
    .filter(Boolean).join(' ');

  return (
    <div className={tableClass}>
      {phase ? <SkyScene phase={phase} circle={centerCircle} /> : <PatternBackdrop index={hitCount} />}
      {coop && (
        <VillainTurtle stage={defeat?.phase === 'down' ? defeat.stage : coop.stage} circle={turtleCircle} heading={heading} mood={mood} />
      )}
      <CenterCard
        key={phase?.body ?? 'card'}
        circle={cardCircle}
        variant={phase?.body ?? (isCoop ? 'shell' : undefined)}
        symbols={round.center.map(id => byId.get(id)!)} placements={centerPlacements} rotation={round.rotation} />
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
          item={rules.items && !isSolo ? state.players[i].item : null}
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
          cards={isBomb ? state.players[i].score : undefined}
        />
      ))}
      {coop && table.gauges.map((g, i) => (
        <FireGauge key={i} coop={coop} names={names} rect={g.rect} facing={g.facing} solo={soloCoop} />
      ))}
      {table.hud.map((h, i) => (
        <Hud key={i} rect={h.rect} facing={h.facing} tall={isCoop}>
          {coop ? (
            <CoopPanel coop={coop} message={message} solo={soloCoop} bannerLift={bannerLift(i)} />
          ) : isSolo ? (
            <SoloHud
              mode={state.mode}
              kind={config.mode as 'soloSurvival' | 'soloStage'}
              now={state.now}
              best={best}
              lastGrade={lastGrade}
              item={rules.items ? state.players[0].item : undefined}
              onUseItem={() => controller.dispatch({ type: 'USE_ITEM', player: 0 })}
            />
          ) : (
            hudContent
          )}
        </Hud>
      ))}
      {showBeam && fireTo && <FireBeam from={mouth} to={fireTo} r={table.center.rx} />}
      {defeat && coop && (
        <div
          key={defeat.phase}
          className={`defeat defeat--${defeat.phase}`}
          data-testid="defeat"
          aria-hidden="true"
          style={{ left: turtleCircle.cx, top: turtleCircle.cy, '--r': `${turtleCircle.rx}px` } as CSSProperties}
        >
          <span className="defeat__flash" />
          <span className="defeat__ring" />
          <span className="defeat__ring defeat__ring--late" />
          {Array.from({ length: SPARKS }, (_, k) => (
            <i
              key={k}
              style={{
                '--a': `${(360 / SPARKS) * k + (k % 2) * 7}deg`, '--d': 2.2 + (k % 3) * 0.7,
                background: SPARK_COLORS[k % SPARK_COLORS.length], animationDelay: `${(k % 4) * 70}ms`,
              } as CSSProperties}
            />
          ))}
          <b className="defeat__text">{defeat.phase === 'down' ? '물리쳤다!' : `${coop.stage}단계 거북이 등장!`}</b>
        </div>
      )}
      {gives.map(g => {
        const a = table.seats[g.from].badge, b = table.seats[g.to].badge;
        const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
        return Array.from({ length: Math.min(g.count, GIVE_MAX) }, (_, k) => (
          <i
            key={`${g.key}-${k}`}
            className="give-card"
            data-testid="give-card"
            style={{
              left: ax, top: ay, '--dx': `${b.x + b.w / 2 - ax}px`, '--dy': `${b.y + b.h / 2 - ay}px`,
              animationDelay: `${k * GIVE_STAGGER_MS}ms`,
            } as CSSProperties}
          />
        ));
      })}
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
      <div className="game__fullscreen" style={{ left: table.exit.x - table.exit.h - 14, top: table.exit.y, width: table.exit.h, height: table.exit.h }}>
        <FullscreenButton />
      </div>
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
