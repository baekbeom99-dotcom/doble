import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { INITIALS } from '../../content/hangul';
import { createSymbolSet, maxCardSize, MIN_CARD_SIZE } from '../../content/registry';
import type { SetConfig, SymbolDef } from '../../content/types';
import { SURVIVAL_DEFAULT_S } from '../../engine/modes/soloSurvival';
import { SEAT_COLORS, type SeatColor } from '../../engine/seats';
import { EMPTY_RECORDS, type Records } from '../../services/records';
import { FullscreenButton } from '../components/FullscreenButton';
import { ALL_RULES, NO_RULES, type BombConfig, type GameConfig, type ModeId, type Rules } from '../../engine/state';

export type SetupKind = 'solo' | 'versus' | 'team' | 'coop';
type Method = Extract<ModeId, 'score' | 'bomb'>;

const TITLES: Record<SetupKind, string> = { solo: '혼자 하기', versus: '같이 하기', team: '팀 대결', coop: '협동' };
const COUNTS: Record<SetupKind, number[]> = { solo: [1], versus: [2, 3, 4], team: [3, 4], coop: [1, 2, 3, 4] };
const DEFAULT_COUNT: Record<SetupKind, number> = { solo: 1, versus: 2, team: 4, coop: 2 };
const COLOR_NAMES: Record<SeatColor, string> = { pink: '핑크', sky: '하늘', yellow: '노랑', lime: '연두', purple: '보라' };
const METHOD_NAMES: Record<Method, string> = { score: '점수제', bomb: '폭탄 돌리기' };
const RULE_NAMES: Record<keyof Rules, string> = { combo: '콤보', finalRound: '막판 3배', items: '아이템' };
const DEFAULT_COLORS: SeatColor[] = ['pink', 'sky', 'yellow', 'lime'];
/** 3인 팀전에서 혼자인 쪽의 심볼 수를 이만큼 낮춘다 */
const LONE_HANDICAP = 2;
const ROUND_OPTIONS = [10, 20, 30];
const HAND_OPTIONS = [3, 5, 7];
/** 서바이벌 제한 시간 (초) */
const TIME_OPTIONS = [20, 40, 60];
const CASE_LABELS = { upper: '대문자', lower: '소문자', mixed: '대소문자' } as const;

type SetKind = SetConfig['kind'];
type LetterCase = keyof typeof CASE_LABELS;

/** 설정 화면 확대 비율: 고를 것이 적은 화면일수록 요소를 키워 빈 곳을 줄인다 */
export function setupScale(kind: SetupKind, count: number, bomb: boolean): number {
  if (kind === 'solo') return 1.3;
  if (kind === 'coop') return [1.3, 1.25, 1.12, 1][count - 1];
  if (bomb || count === 4) return 1;
  return 1.05;
}

/** 설정 화면을 그리는 기준 크기. 이보다 작은 기기에서는 통째로 줄여서 상자가 화면 밖으로 나가지 않게 한다 */
export const SETUP_W = 1024;
export const SETUP_H = 768;

/** 기기 화면(w×h)에 맞춘 확대 비율과, 그 비율로 그렸을 때의 안쪽 크기 */
export function fitSetup(w: number, h: number): { zoom: number; width: number; height: number } {
  if (w <= 0 || h <= 0) return { zoom: 1, width: SETUP_W, height: SETUP_H };
  const zoom = Math.min(w / SETUP_W, h / SETUP_H);
  return { zoom, width: w / zoom, height: h / zoom };
}

function useFitSetup() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return fitSetup(size.w, size.h);
}

const NAME_MAX = 10;
/** 이름 입력칸 너비(em): 한글 등 넓은 글자는 1em, 나머지는 0.6em으로 어림하고 여유를 더한다 */
export function nameWidthEm(name: string): number {
  const text = [...name].reduce((w, ch) => w + (/[ᄀ-ￜ]/.test(ch) ? 1 : 0.6), 0);
  return Math.max(3, text) + 1.4;
}

/** 팀 번호: 4인 [0,0,1,1], 3인 [0,0,1] */
export function teamsFor(count: number): number[] {
  return count === 4 ? [0, 0, 1, 1] : [0, 0, 1];
}

interface Props {
  kind: SetupKind;
  onStart: (config: GameConfig, symbols: SymbolDef[]) => void;
  onBack: () => void;
  /** 저장된 기록 (스테이지 도전의 열린 단계) */
  records?: Records;
}

type SoloMethod = 'survival' | 'stage' | 'hunt';
const SOLO_METHODS: Record<SoloMethod, string> = { survival: '서바이벌', stage: '스테이지 도전', hunt: '몬스터 사냥' };
const SOLO_ICONS: Record<SoloMethod, 'versus' | 'flag' | 'monster'> = { survival: 'versus', stage: 'flag', hunt: 'monster' };
const METHOD_ICONS: Record<Method, 'star' | 'bomb'> = { score: 'star', bomb: 'bomb' };
/** 혼자 하기 서바이벌·스테이지에는 아이템만 켠다 */
const SOLO_RULES = { combo: false, finalRound: false, items: true };

/** 글자 수 기본값: 고를 수 있는 범위의 가운데 */
export function midCardSize(limit: number): number {
  return Math.round((MIN_CARD_SIZE + Math.max(MIN_CARD_SIZE, limit)) / 2);
}

type IconName = 'home' | 'play' | 'mode' | 'people' | 'player' | 'letters' | 'versus' | 'gear' | 'clock' | 'rotate' | 'star' | 'flag' | 'monster' | 'bomb' | 'cards' | 'target' | 'plus' | 'rounds';
const ICON_PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" fill="currentColor" stroke="none" />,
  play: <path d="M7 4v16l13-8Z" fill="currentColor" stroke="none" />,
  mode: <path d="M7 8h10a4 4 0 0 1 4 4v3a2.5 2.5 0 0 1-4.6 1.4L15.5 15h-7l-.9 1.4A2.5 2.5 0 0 1 3 15v-3a4 4 0 0 1 4-4ZM7.5 10.5v3M6 12h3M16 11.2v.1M18 13v.1" />,
  people: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M17 14.3a6 6 0 0 1 4 5.7" />,
  player: <path d="M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5 20a7 7 0 0 1 14 0Z" fill="currentColor" stroke="none" />,
  letters: <path d="M5 19 11 5h2l6 14M7.6 14h8.8" />,
  versus: <path d="M5 4l10 10M15 4 5 14M13 16l3 3M19 13l-6 6M8 16l-3 3M2 13l6 6" />,
  gear: <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2" />,
  rotate: <path d="M20 11a8 8 0 0 0-14.6-3.5M4 4v4h4M4 13a8 8 0 0 0 14.6 3.5M20 20v-4h-4" />,
  star: <path d="m12 3 2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 16.9l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8Z" />,
  flag: <path d="M6 21V4M6 5h11l-2.5 4L17 13H6" />,
  monster: <path d="M5 10 4 4l4.5 3a8 8 0 0 1 7 0L20 4l-1 6a7 7 0 1 1-14 0ZM9 12.5v.1M15 12.5v.1M9 16.5q3 2 6 0" />,
  bomb: <path d="M10.5 21a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15 9.5 17.5 7M17.5 7l.8-3M17.5 7l3 .8" />,
  cards: <path d="M5 7h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM8 4h10a1 1 0 0 1 1 1v12" />,
  target: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  plus: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 8v8M8 12h8" />,
  rounds: <path d="M4 6h16M4 12h16M4 18h10" />,
};

function Icon({ name }: { name: IconName }) {
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{ICON_PATHS[name]}</svg>;
}

/** 상자 왼쪽 위에 붙는 이름표 */
function Tab({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <span className="setup__tab"><Icon name={icon} />{children}</span>;
}

/** 제목 양옆의 종이 잎 장식 */
function Laurel({ flip = false }: { flip?: boolean }) {
  return (
    <svg className={flip ? 'setup__laurel setup__laurel--flip' : 'setup__laurel'} viewBox="0 0 40 60" aria-hidden="true">
      <path d="M30 56 Q14 40 16 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 14q-10-2-10-12 9 2 10 12ZM17 26q-12 0-14-10 11 0 14 10ZM20 38q-12 2-16-8 11-2 16 8ZM18 20q8-6 4-15-7 6-4 15ZM20 32q9-5 6-15-8 6-6 15ZM24 44q9-3 8-14-9 5-8 14Z" fill="currentColor" />
    </svg>
  );
}

function Radio(props: { name: string; label: string; checked: boolean; onChange: () => void; icon?: IconName }) {
  const className = ['chip', props.checked && 'chip--on', props.icon && 'chip--tile'].filter(Boolean).join(' ');
  return (
    <label className={className}>
      <input type="radio" name={props.name} checked={props.checked} onChange={props.onChange} />
      {props.icon && <Icon name={props.icon} />}
      {props.label}
    </label>
  );
}

/** 켜고 끄는 스위치 */
function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={props.checked ? 'switch switch--on' : 'switch'}>
      <input type="checkbox" role="switch" checked={props.checked} onChange={e => props.onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true"><i /></span>
      {props.label}
    </label>
  );
}

export function Setup({ kind, onStart, onBack, records = EMPTY_RECORDS }: Props) {
  const solo = kind === 'solo';
  const [soloMethod, setSoloMethod] = useState<SoloMethod>('survival');
  const [stagePick, setStagePick] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState(SURVIVAL_DEFAULT_S);
  const coopKind = kind === 'coop';
  // 대결 방식·덧붙는 요소·라운드 수는 같이 하기와 팀 대결에만 있다
  const versusLike = kind === 'versus' || kind === 'team';
  const team = kind === 'team';
  const [count, setCount] = useState(DEFAULT_COUNT[kind]);
  const [names, setNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4']);
  const [colors, setColors] = useState<SeatColor[]>(DEFAULT_COLORS);
  // null이면 아직 손대지 않은 것: 고를 수 있는 범위의 가운데 값을 쓴다
  const [sizes, setSizes] = useState<(number | null)[]>([null, null, null, null]);
  const [setKind, setSetKind] = useState<SetKind>('consonant');
  const [includeDouble, setIncludeDouble] = useState(false);
  const [initial, setInitial] = useState('ㄱ');
  const [pickingInitial, setPickingInitial] = useState(false);
  const [batchim, setBatchim] = useState(false);
  const [letterCase, setLetterCase] = useState<LetterCase>('upper');
  const [method, setMethod] = useState<Method>('score');
  const [rules, setRules] = useState<Rules>(ALL_RULES);
  const [bomb, setBomb] = useState<BombConfig>({ startHand: 5, target: 'random' });
  const [rounds, setRounds] = useState(20);
  // 혼자 하기는 마주 앉은 사람이 없으니 기본으로 돌리지 않는다
  const [rotationStep, setRotationStep] = useState<0 | 90 | 180>(solo ? 0 : 90);
  const [symbolRotation, setSymbolRotation] = useState(false);
  const [speech, setSpeech] = useState(true);
  const [symbols, setSymbols] = useState<SymbolDef[] | null>(null);

  const setConfig: SetConfig = useMemo(() => {
    if (setKind === 'consonant') return { kind: setKind, includeDouble };
    if (setKind === 'syllable') return { kind: setKind, initial, batchim };
    return { kind: setKind, letterCase };
  }, [setKind, includeDouble, initial, batchim, letterCase]);

  useEffect(() => {
    let alive = true;
    createSymbolSet(setConfig).loadSymbols().then(s => { if (alive) setSymbols(s); });
    return () => { alive = false; };
  }, [setConfig]);

  const max = symbols ? maxCardSize(symbols.length) : 0;
  const sliderMax = Math.max(MIN_CARD_SIZE, max);
  const clampSize = (n: number | null, limit: number) => Math.max(MIN_CARD_SIZE, Math.min(n ?? midCardSize(limit), limit));

  const changeCount = (n: number) => {
    setCount(n);
    if (!team) return;
    // 3인 팀전이면 혼자인 사람(3번)의 심볼 수를 낮추고, 4인으로 돌아가면 1번과 같게 되돌린다.
    // 기준은 화면에 보이는(세트 크기로 제한된) 1번의 심볼 수다
    setSizes(ss => {
      const third = n === 3 ? Math.max(MIN_CARD_SIZE, clampSize(ss[0], sliderMax) - LONE_HANDICAP) : ss[0];
      return ss.map((v, i) => (i === 2 ? third : v));
    });
  };

  const starting = useRef(false);

  // 스테이지 도전: 세트마다 열린 단계까지 고를 수 있다 (기본은 열린 최고 단계)
  const unlocked = records.unlocked[createSymbolSet(setConfig).id] ?? 1;
  const stage = Math.min(stagePick ?? unlocked, unlocked);
  const stageMode = solo && soloMethod === 'stage';
  const survivalMode = solo && soloMethod === 'survival';

  const start = async () => {
    // 빠르게 두 번 눌러도 한 번만 시작한다
    if (starting.current) return;
    starting.current = true;
    // 세트를 아직 불러오는 중이면 기다렸다가 시작한다
    const syms = symbols ?? (await createSymbolSet(setConfig).loadSymbols());
    const limit = maxCardSize(syms.length);
    if (limit === 0) { starting.current = false; return; }
    const players = Array.from({ length: count }, (_, i) => ({
      name: names[i].trim() || `플레이어 ${i + 1}`,
      color: colors[i],
      cardSize: clampSize(sizes[i], limit),
    }));
    onStart({
      mode: solo ? (soloMethod === 'survival' ? 'soloSurvival' : soloMethod === 'stage' ? 'soloStage' : 'coop') : coopKind ? 'coop' : method,
      players,
      set: setConfig,
      rotationStep,
      symbolRotation,
      speech,
      scoreRounds: rounds,
      seed: Date.now(),
      rules: versusLike ? rules : solo && soloMethod !== 'hunt' ? SOLO_RULES : NO_RULES,
      ...(stageMode ? { stage } : {}),
      ...(survivalMode ? { timeLimit } : {}),
      teams: team ? teamsFor(count) : null,
      bomb,
    }, syms);
  };

  const teams = team ? teamsFor(count) : null;

  const startButton = symbols && max === 0
    ? <p className="note">이 세트는 글자가 너무 적어요</p>
    : <button className="btn btn--primary setup__start" onClick={start}><Icon name="play" />시작</button>;

  const scale = setupScale(kind, count, versusLike && method === 'bomb');
  const fit = useFitSetup();
  // 스크롤 없이 한 화면: 위 막대(처음으로·제목·시작) + 왼쪽(사람) / 오른쪽(규칙) 두 칸. 고를 것이 많은 화면은 촘촘하게 그린다
  return (
    <main className={['setup', scale === 1 && 'setup--dense', solo && 'setup--solo'].filter(Boolean).join(' ')} style={{ '--setup-scale': scale, zoom: fit.zoom, width: fit.width, height: fit.height } as CSSProperties}>
      <header className="setup__bar">
        <div className="setup__bar-side">
          <button className="btn setup__back" onClick={onBack}><Icon name="home" />처음으로</button>
          <FullscreenButton />
        </div>
        <h1 className="setup__title"><Laurel />{TITLES[kind]}<Laurel flip /></h1>
        <div className="setup__bar-side setup__bar-side--end">{startButton}</div>
      </header>

      <div className="setup__body">
        <section className="setup__col" aria-label="사람">
          {solo && (
            <fieldset className="field field--tab" aria-label="방식">
              <legend><Tab icon="mode">방식</Tab></legend>
              <div className="setup__choices">
                {(Object.keys(SOLO_METHODS) as SoloMethod[]).map(m => (
                  <Radio key={m} name="solo-method" icon={SOLO_ICONS[m]} label={SOLO_METHODS[m]} checked={soloMethod === m} onChange={() => setSoloMethod(m)} />
                ))}
              </div>
              {survivalMode && (
                <fieldset className="toggles setup__line" aria-label="제한 시간">
                  <span className="setup__label"><Icon name="clock" />제한 시간</span>
                  {TIME_OPTIONS.map(n => (
                    <Radio key={n} name="time-limit" label={`${n}초`} checked={timeLimit === n} onChange={() => setTimeLimit(n)} />
                  ))}
                </fieldset>
              )}
              {stageMode && (
                <fieldset className="toggles setup__line" aria-label="단계">
                  <span className="setup__label"><Icon name="flag" />단계</span>
                  {Array.from({ length: unlocked }, (_, i) => i + 1).map(n => (
                    <Radio key={n} name="stage" label={String(n)} checked={stage === n} onChange={() => setStagePick(n)} />
                  ))}
                </fieldset>
              )}
            </fieldset>
          )}

          {COUNTS[kind].length > 1 && (
            <fieldset className="field field--tab" aria-label="인원">
              <legend><Tab icon="people">인원</Tab></legend>
              <div className="setup__choices">
                {COUNTS[kind].map(n => <Radio key={n} name="count" label={`${n}명`} checked={count === n} onChange={() => changeCount(n)} />)}
              </div>
            </fieldset>
          )}

          {Array.from({ length: count }, (_, i) => (
            <div className={count === 1 ? 'field field--tab player player--single' : 'field player'} key={i}>
              {count === 1 && <Tab icon="player">플레이어</Tab>}
              {teams && <span className="team-tag">{teams[i] === 0 ? 'A' : 'B'}</span>}
              <input
                className="input"
                aria-label={`플레이어 ${i + 1} 이름`}
                maxLength={NAME_MAX}
                style={{ width: `${nameWidthEm(names[i])}em` }}
                value={names[i]}
                onChange={e => setNames(ns => ns.map((n, j) => (j === i ? e.target.value : n)))}
              />
              <fieldset className="colors" aria-label={`플레이어 ${i + 1} 색`}>
                {(Object.keys(SEAT_COLORS) as SeatColor[]).map(c => (
                  <label key={c} className={colors[i] === c ? 'swatch swatch--on' : 'swatch'} style={{ background: SEAT_COLORS[c] }}>
                    <input
                      type="radio"
                      name={`color-${i}`}
                      aria-label={COLOR_NAMES[c]}
                      checked={colors[i] === c}
                      disabled={colors.some((other, j) => j !== i && other === c)}
                      onChange={() => setColors(cs => cs.map((x, j) => (j === i ? c : x)))}
                    />
                  </label>
                ))}
              </fieldset>
              {!stageMode && (
                <label className="range" style={{ '--fill': `${((clampSize(sizes[i], sliderMax) - MIN_CARD_SIZE) / Math.max(1, sliderMax - MIN_CARD_SIZE)) * 100}%` } as CSSProperties}>
                  <Icon name="star" />글자 수 <b>{clampSize(sizes[i], sliderMax)}</b>
                  <input
                    type="range"
                    aria-label={`플레이어 ${i + 1} 글자 수`}
                    min={MIN_CARD_SIZE}
                    max={sliderMax}
                    step={1}
                    value={clampSize(sizes[i], sliderMax)}
                    onChange={e => setSizes(ss => ss.map((v, j) => (j === i ? Number(e.target.value) : v)))}
                  />
                </label>
              )}
            </div>
          ))}
        </section>

        <section className="setup__col" aria-label="규칙">
          <fieldset className="field field--tab" aria-label="세트">
            <legend><Tab icon="letters">글자</Tab></legend>
            <div className="setup__choices">
              <Radio name="kind" label="자음" checked={setKind === 'consonant'} onChange={() => setSetKind('consonant')} />
              <Radio name="kind" label="글자" checked={setKind === 'syllable'} onChange={() => { setSetKind('syllable'); setPickingInitial(true); }} />
              <Radio name="kind" label="알파벳" checked={setKind === 'alphabet'} onChange={() => setSetKind('alphabet')} />
            </div>
            <div className="sub">
              {setKind === 'consonant' && <Check label="쌍자음 포함" checked={includeDouble} onChange={setIncludeDouble} />}
              {setKind === 'syllable' && (
                <>
                  <button type="button" className="chip setup__initial" aria-label="초성 고르기" onClick={() => setPickingInitial(true)}>
                    초성 <b>{initial}</b> <span aria-hidden="true">바꾸기</span>
                  </button>
                  <Check label="받침 있는 글자" checked={batchim} onChange={setBatchim} />
                </>
              )}
              {setKind === 'alphabet' &&
                (Object.keys(CASE_LABELS) as LetterCase[]).map(c => (
                  <Radio key={c} name="case" label={CASE_LABELS[c]} checked={letterCase === c} onChange={() => setLetterCase(c)} />
                ))}
            </div>
          </fieldset>

          {versusLike && (
            <fieldset className="field field--tab" aria-label="대결 방식">
              <legend><Tab icon="versus">대결 방식</Tab></legend>
              <div className="setup__choices">
                {(Object.keys(METHOD_NAMES) as Method[]).map(m => (
                  <Radio key={m} name="method" icon={METHOD_ICONS[m]} label={METHOD_NAMES[m]} checked={method === m} onChange={() => setMethod(m)} />
                ))}
              </div>
              <fieldset className="toggles setup__line" aria-label="라운드 수">
                <span className="setup__label"><Icon name="rounds" />라운드 수</span>
                {ROUND_OPTIONS.map(n => <Radio key={n} name="rounds" label={`${n}`} checked={rounds === n} onChange={() => setRounds(n)} />)}
              </fieldset>
              {method === 'bomb' && (
                <>
                  <p className="note setup__note">맞히면 내 카드를 친구에게 넘겨요. 카드가 먼저 0장이 되면 이겨요.</p>
                  <fieldset className="toggles setup__line" aria-label="시작 카드">
                    <span className="setup__label"><Icon name="cards" />시작 카드</span>
                    {HAND_OPTIONS.map(n => (
                      <Radio key={n} name="hand" label={`${n}장`} checked={bomb.startHand === n} onChange={() => setBomb(b => ({ ...b, startHand: n }))} />
                    ))}
                  </fieldset>
                  <fieldset className="toggles setup__line" aria-label="넘길 사람">
                    <span className="setup__label"><Icon name="target" />넘길 사람</span>
                    <Radio name="target" label="무작위" checked={bomb.target === 'random'} onChange={() => setBomb(b => ({ ...b, target: 'random' }))} />
                    <Radio name="target" label="직접 고르기" checked={bomb.target === 'choose'} onChange={() => setBomb(b => ({ ...b, target: 'choose' }))} />
                  </fieldset>
                </>
              )}
              <fieldset className="toggles setup__line setup__line--rules" aria-label="덧붙는 요소">
                <span className="setup__label"><Icon name="plus" />덧붙는 요소</span>
                {(Object.keys(RULE_NAMES) as (keyof Rules)[]).map(r => (
                  <Check key={r} label={RULE_NAMES[r]} checked={rules[r]} onChange={v => setRules(rs => ({ ...rs, [r]: v }))} />
                ))}
              </fieldset>
            </fieldset>
          )}

          <fieldset className="field field--tab" aria-label="그 밖의 설정">
            <legend><Tab icon="gear">그 밖의 설정</Tab></legend>
            <fieldset className="toggles setup__line setup__line--rot" aria-label="중앙 회전">
              <span className="setup__label"><Icon name="rotate" />중앙 카드 회전</span>
              <Radio name="rot" label="안 돌림" checked={rotationStep === 0} onChange={() => setRotationStep(0)} />
              <Radio name="rot" label="90°" checked={rotationStep === 90} onChange={() => setRotationStep(90)} />
              <Radio name="rot" label="180°" checked={rotationStep === 180} onChange={() => setRotationStep(180)} />
            </fieldset>
            <div className="setup__line">
              <Check label="글자 회전" checked={symbolRotation} onChange={setSymbolRotation} />
              <Check label="읽어주기" checked={speech} onChange={setSpeech} />
            </div>
          </fieldset>
        </section>
      </div>

      {pickingInitial && setKind === 'syllable' && (
        <div className="dialog-backdrop" onClick={() => setPickingInitial(false)}>
          <div className="dialog setup__picker" role="dialog" aria-modal="true" aria-label="초성 고르기" onClick={e => e.stopPropagation()}>
            <h2>어떤 글자로 할까요?</h2>
            <fieldset className="toggles" aria-label="초성">
              {INITIALS.map(c => (
                <Radio key={c} name="initial" label={c} checked={initial === c} onChange={() => { setInitial(c); setPickingInitial(false); }} />
              ))}
            </fieldset>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setPickingInitial(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
