import { useEffect, useMemo, useState } from 'react';
import { INITIALS } from '../../content/hangul';
import { createSymbolSet, maxCardSize, MAX_CARD_SIZE, MIN_CARD_SIZE } from '../../content/registry';
import type { SetConfig, SymbolDef } from '../../content/types';
import { SEAT_COLORS, type SeatColor } from '../../engine/seats';
import { ALL_RULES, NO_RULES, type BombConfig, type GameConfig, type ModeId, type Rules } from '../../engine/state';

export type SetupKind = 'solo' | 'versus' | 'team';
type Method = Exclude<ModeId, 'soloSurvival'>;

const TITLES: Record<SetupKind, string> = { solo: '혼자 하기', versus: '같이 하기', team: '팀 대결' };
const COUNTS: Record<SetupKind, number[]> = { solo: [1], versus: [2, 3, 4], team: [3, 4] };
const DEFAULT_COUNT: Record<SetupKind, number> = { solo: 1, versus: 2, team: 4 };
const COLOR_NAMES: Record<SeatColor, string> = { pink: '핑크', sky: '하늘', yellow: '노랑', lime: '연두', purple: '보라' };
const METHOD_NAMES: Record<Method, string> = { score: '점수제', tower: '탑 쌓기', bomb: '폭탄 돌리기' };
const RULE_NAMES: Record<keyof Rules, string> = { combo: '콤보', finalRound: '막판 3배', items: '아이템' };
const DEFAULT_COLORS: SeatColor[] = ['pink', 'sky', 'yellow', 'lime'];
const DEFAULT_CARD_SIZE = 5;
/** 3인 팀전에서 혼자인 쪽의 심볼 수를 이만큼 낮춘다 */
const LONE_HANDICAP = 2;
const ROUND_OPTIONS = [10, 20, 30];
const HAND_OPTIONS = [3, 5, 7];
const CASE_LABELS = { upper: '대문자', lower: '소문자', mixed: '대소문자' } as const;

type SetKind = SetConfig['kind'];
type LetterCase = keyof typeof CASE_LABELS;

/** 팀 번호: 4인 [0,0,1,1], 3인 [0,0,1] */
export function teamsFor(count: number): number[] {
  return count === 4 ? [0, 0, 1, 1] : [0, 0, 1];
}

interface Props {
  kind: SetupKind;
  onStart: (config: GameConfig, symbols: SymbolDef[]) => void;
  onBack: () => void;
}

function Radio(props: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className={props.checked ? 'chip chip--on' : 'chip'}>
      <input type="radio" name={props.name} checked={props.checked} onChange={props.onChange} />
      {props.label}
    </label>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={props.checked} onChange={e => props.onChange(e.target.checked)} />
      {props.label}
    </label>
  );
}

export function Setup({ kind, onStart, onBack }: Props) {
  const solo = kind === 'solo';
  const team = kind === 'team';
  const [count, setCount] = useState(DEFAULT_COUNT[kind]);
  const [names, setNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4']);
  const [colors, setColors] = useState<SeatColor[]>(DEFAULT_COLORS);
  const [sizes, setSizes] = useState([DEFAULT_CARD_SIZE, DEFAULT_CARD_SIZE, DEFAULT_CARD_SIZE, DEFAULT_CARD_SIZE]);
  const [setKind, setSetKind] = useState<SetKind>('syllable');
  const [includeDouble, setIncludeDouble] = useState(false);
  const [initial, setInitial] = useState('ㄱ');
  const [batchim, setBatchim] = useState(false);
  const [letterCase, setLetterCase] = useState<LetterCase>('upper');
  const [method, setMethod] = useState<Method>('score');
  const [rules, setRules] = useState<Rules>(ALL_RULES);
  const [bomb, setBomb] = useState<BombConfig>({ startHand: 5, target: 'random' });
  const [rounds, setRounds] = useState(20);
  const [rotationStep, setRotationStep] = useState<90 | 180>(90);
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
    // 3인 팀전으로 바뀌면 혼자인 사람(3번)의 심볼 수를 낮춘다
    if (team && n === 3) setSizes(ss => ss.map((v, i) => (i === 2 ? Math.max(MIN_CARD_SIZE, ss[0] - LONE_HANDICAP) : v)));
  };

  const start = async () => {
    // 세트를 아직 불러오는 중이면 기다렸다가 시작한다
    const syms = symbols ?? (await createSymbolSet(setConfig).loadSymbols());
    const limit = maxCardSize(syms.length);
    if (limit === 0) return;
    const players = Array.from({ length: count }, (_, i) => ({
      name: names[i].trim() || `플레이어 ${i + 1}`,
      color: colors[i],
      cardSize: clampSize(sizes[i], limit),
    }));
    onStart({
      mode: solo ? 'soloSurvival' : method,
      players,
      set: setConfig,
      rotationStep,
      symbolRotation,
      speech,
      scoreRounds: rounds,
      seed: Date.now(),
      rules: solo ? NO_RULES : rules,
      teams: team ? teamsFor(count) : null,
      bomb,
    }, syms);
  };

  const teams = team ? teamsFor(count) : null;
  const roundsLabel = method === 'tower' ? '카드 수' : '라운드 수';

  return (
    <main className="screen">
      <h1 className="title">{TITLES[kind]}</h1>

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
        </div>
      ))}
      {max > 0 && max < MAX_CARD_SIZE && <p className="note">심볼이 부족해서 카드당 최대 {max}개까지 쓸 수 있어요</p>}

      <fieldset className="field" aria-label="세트">
        <legend>글자</legend>
        <Radio name="kind" label="자음" checked={setKind === 'consonant'} onChange={() => setSetKind('consonant')} />
        <Radio name="kind" label="글자" checked={setKind === 'syllable'} onChange={() => setSetKind('syllable')} />
        <Radio name="kind" label="알파벳" checked={setKind === 'alphabet'} onChange={() => setSetKind('alphabet')} />
        <div className="sub">
          {setKind === 'consonant' && <Check label="쌍자음 포함" checked={includeDouble} onChange={setIncludeDouble} />}
          {setKind === 'syllable' && (
            <>
              <select className="input" aria-label="초성" value={initial} onChange={e => setInitial(e.target.value)}>
                {INITIALS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Check label="받침 있는 글자" checked={batchim} onChange={setBatchim} />
            </>
          )}
          {setKind === 'alphabet' &&
            (Object.keys(CASE_LABELS) as LetterCase[]).map(c => (
              <Radio key={c} name="case" label={CASE_LABELS[c]} checked={letterCase === c} onChange={() => setLetterCase(c)} />
            ))}
        </div>
      </fieldset>

      {!solo && (
        <>
          <fieldset className="field" aria-label="대결 방식">
            <legend>대결 방식</legend>
            {(Object.keys(METHOD_NAMES) as Method[]).map(m => (
              <Radio key={m} name="method" label={METHOD_NAMES[m]} checked={method === m} onChange={() => setMethod(m)} />
            ))}
          </fieldset>

          {method === 'bomb' && (
            <>
              <fieldset className="field" aria-label="시작 카드">
                <legend>시작 카드</legend>
                {HAND_OPTIONS.map(n => (
                  <Radio key={n} name="hand" label={`${n}장`} checked={bomb.startHand === n} onChange={() => setBomb(b => ({ ...b, startHand: n }))} />
                ))}
              </fieldset>
              <fieldset className="field" aria-label="넘길 사람">
                <legend>넘길 사람</legend>
                <Radio name="target" label="무작위" checked={bomb.target === 'random'} onChange={() => setBomb(b => ({ ...b, target: 'random' }))} />
                <Radio name="target" label="직접 고르기" checked={bomb.target === 'choose'} onChange={() => setBomb(b => ({ ...b, target: 'choose' }))} />
              </fieldset>
            </>
          )}

          <fieldset className="field" aria-label={roundsLabel}>
            <legend>{roundsLabel}</legend>
            {ROUND_OPTIONS.map(n => <Radio key={n} name="rounds" label={`${n}`} checked={rounds === n} onChange={() => setRounds(n)} />)}
          </fieldset>

          <fieldset className="field" aria-label="덧붙는 요소">
            <legend>덧붙는 요소</legend>
            {(Object.keys(RULE_NAMES) as (keyof Rules)[]).map(r => (
              <Check key={r} label={RULE_NAMES[r]} checked={rules[r]} onChange={v => setRules(rs => ({ ...rs, [r]: v }))} />
            ))}
          </fieldset>
        </>
      )}

      <fieldset className="field" aria-label="중앙 회전">
        <legend>중앙 카드 회전</legend>
        <Radio name="rot" label="90°" checked={rotationStep === 90} onChange={() => setRotationStep(90)} />
        <Radio name="rot" label="180°" checked={rotationStep === 180} onChange={() => setRotationStep(180)} />
      </fieldset>

      <div className="field">
        <Check label="심볼 회전" checked={symbolRotation} onChange={setSymbolRotation} />
        <Check label="읽어주기" checked={speech} onChange={setSpeech} />
      </div>

      <div className="actions">
        <button className="btn" onClick={onBack}>처음으로</button>
        {symbols && max === 0 ? (
          <p className="note">이 세트는 심볼이 너무 적어요</p>
        ) : (
          <button className="btn btn--primary" onClick={start}>시작</button>
        )}
      </div>
    </main>
  );
}
