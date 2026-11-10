import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { INITIALS } from '../../content/hangul';
import { createSymbolSet, maxCardSize, MAX_CARD_SIZE, MIN_CARD_SIZE } from '../../content/registry';
import type { SetConfig, SymbolDef } from '../../content/types';
import { SURVIVAL_DEFAULT_S } from '../../engine/modes/soloSurvival';
import { SEAT_COLORS, type SeatColor } from '../../engine/seats';
import { EMPTY_RECORDS, type Records } from '../../services/records';
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
const DEFAULT_CARD_SIZE = 5;
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
  return count === 2 ? 1.12 : 1.05;
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
/** 혼자 하기 서바이벌·스테이지에는 아이템만 켠다 */
const SOLO_RULES = { combo: false, finalRound: false, items: true };

function Radio(props: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={props.checked ? 'chip chip--on' : 'chip'}>
      <input type="radio" name={props.name} checked={props.checked} onChange={props.onChange} />
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
  const [sizes, setSizes] = useState([DEFAULT_CARD_SIZE, DEFAULT_CARD_SIZE, DEFAULT_CARD_SIZE, DEFAULT_CARD_SIZE]);
  const [setKind, setSetKind] = useState<SetKind>('syllable');
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
  const clampSize = (n: number, limit: number) => Math.max(MIN_CARD_SIZE, Math.min(n, limit));

  const changeCount = (n: number) => {
    setCount(n);
    if (!team) return;
    // 3인 팀전이면 혼자인 사람(3번)의 심볼 수를 낮추고, 4인으로 돌아가면 1번과 같게 되돌린다.
    // 기준은 화면에 보이는(세트 크기로 제한된) 1번의 심볼 수다
    setSizes(ss => {
      const base = clampSize(ss[0], sliderMax);
      const third = n === 3 ? Math.max(MIN_CARD_SIZE, base - LONE_HANDICAP) : base;
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
    ? <p className="note">이 세트는 심볼이 너무 적어요</p>
    : <button className="btn btn--primary setup__start" onClick={start}>시작</button>;

  // 스크롤 없이 한 화면: 위 막대(처음으로·제목·시작) + 왼쪽(사람) / 오른쪽(규칙) 두 칸
  return (
    <main className="setup" style={{ '--setup-scale': setupScale(kind, count, versusLike && method === 'bomb') } as CSSProperties}>
      <header className="setup__bar">
        <button className="btn setup__back" onClick={onBack}>처음으로</button>
        <h1 className="setup__title">{TITLES[kind]}</h1>
        {startButton}
      </header>

      <div className="setup__body">
        <section className="setup__col" aria-label="사람">
          {solo && (
            <fieldset className="field" aria-label="방식">
              <legend>방식</legend>
              {(Object.keys(SOLO_METHODS) as SoloMethod[]).map(m => (
                <Radio key={m} name="solo-method" label={SOLO_METHODS[m]} checked={soloMethod === m} onChange={() => setSoloMethod(m)} />
              ))}
              {survivalMode && (
                <fieldset className="toggles setup__line" aria-label="제한 시간">
                  <span className="setup__label">제한 시간</span>
                  {TIME_OPTIONS.map(n => (
                    <Radio key={n} name="time-limit" label={`${n}초`} checked={timeLimit === n} onChange={() => setTimeLimit(n)} />
                  ))}
                </fieldset>
              )}
              {stageMode && (
                <fieldset className="toggles setup__line" aria-label="단계">
                  <span className="setup__label">단계</span>
                  {Array.from({ length: unlocked }, (_, i) => i + 1).map(n => (
                    <Radio key={n} name="stage" label={String(n)} checked={stage === n} onChange={() => setStagePick(n)} />
                  ))}
                </fieldset>
              )}
            </fieldset>
          )}

          {COUNTS[kind].length > 1 && (
            <fieldset className="field" aria-label="인원">
              <legend>인원</legend>
              {COUNTS[kind].map(n => <Radio key={n} name="count" label={`${n}명`} checked={count === n} onChange={() => changeCount(n)} />)}
            </fieldset>
          )}

          {Array.from({ length: count }, (_, i) => (
            <div className="field player" key={i}>
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
                <label className="range">
                  심볼 <b>{clampSize(sizes[i], sliderMax)}</b>
                  <input
                    type="range"
                    aria-label={`플레이어 ${i + 1} 심볼 수`}
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
          {max > 0 && max < MAX_CARD_SIZE && <p className="note">심볼이 부족해서 카드당 최대 {max}개까지 쓸 수 있어요</p>}
        </section>

        <section className="setup__col" aria-label="규칙">
          <fieldset className="field" aria-label="세트">
            <legend>글자</legend>
            <Radio name="kind" label="자음" checked={setKind === 'consonant'} onChange={() => setSetKind('consonant')} />
            <Radio name="kind" label="글자" checked={setKind === 'syllable'} onChange={() => { setSetKind('syllable'); setPickingInitial(true); }} />
            <Radio name="kind" label="알파벳" checked={setKind === 'alphabet'} onChange={() => setSetKind('alphabet')} />
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
            <fieldset className="field" aria-label="대결 방식">
              <legend>대결 방식</legend>
              {(Object.keys(METHOD_NAMES) as Method[]).map(m => (
                <Radio key={m} name="method" label={METHOD_NAMES[m]} checked={method === m} onChange={() => setMethod(m)} />
              ))}
              <fieldset className="toggles setup__line" aria-label="라운드 수">
                <span className="setup__label">라운드 수</span>
                {ROUND_OPTIONS.map(n => <Radio key={n} name="rounds" label={`${n}`} checked={rounds === n} onChange={() => setRounds(n)} />)}
              </fieldset>
              {method === 'bomb' && (
                <>
                  <p className="note setup__note">맞히면 내 카드를 친구에게 넘겨요. 카드가 먼저 0장이 되면 이겨요.</p>
                  <fieldset className="toggles setup__line" aria-label="시작 카드">
                    <span className="setup__label">시작 카드</span>
                    {HAND_OPTIONS.map(n => (
                      <Radio key={n} name="hand" label={`${n}장`} checked={bomb.startHand === n} onChange={() => setBomb(b => ({ ...b, startHand: n }))} />
                    ))}
                  </fieldset>
                  <fieldset className="toggles setup__line" aria-label="넘길 사람">
                    <span className="setup__label">넘길 사람</span>
                    <Radio name="target" label="무작위" checked={bomb.target === 'random'} onChange={() => setBomb(b => ({ ...b, target: 'random' }))} />
                    <Radio name="target" label="직접 고르기" checked={bomb.target === 'choose'} onChange={() => setBomb(b => ({ ...b, target: 'choose' }))} />
                  </fieldset>
                </>
              )}
              <fieldset className="toggles setup__line" aria-label="덧붙는 요소">
                <span className="setup__label">덧붙는 요소</span>
                {(Object.keys(RULE_NAMES) as (keyof Rules)[]).map(r => (
                  <Check key={r} label={RULE_NAMES[r]} checked={rules[r]} onChange={v => setRules(rs => ({ ...rs, [r]: v }))} />
                ))}
              </fieldset>
            </fieldset>
          )}

          <fieldset className="field" aria-label="그 밖의 설정">
            <legend>그 밖의 설정</legend>
            <fieldset className="toggles setup__line" aria-label="중앙 회전">
              <span className="setup__label">중앙 카드 회전</span>
              <Radio name="rot" label="안 돌림" checked={rotationStep === 0} onChange={() => setRotationStep(0)} />
              <Radio name="rot" label="90°" checked={rotationStep === 90} onChange={() => setRotationStep(90)} />
              <Radio name="rot" label="180°" checked={rotationStep === 180} onChange={() => setRotationStep(180)} />
            </fieldset>
            <div className="setup__line">
              <Check label="심볼 회전" checked={symbolRotation} onChange={setSymbolRotation} />
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
