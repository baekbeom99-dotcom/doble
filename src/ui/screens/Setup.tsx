import { useEffect, useMemo, useState } from 'react';
import { INITIALS } from '../../content/hangul';
import { createSymbolSet, maxCardSize, MIN_CARD_SIZE, MAX_CARD_SIZE } from '../../content/registry';
import type { SetConfig, SymbolDef } from '../../content/types';
import { SEAT_COLORS, type SeatColor } from '../../engine/seats';
import { DEFAULT_BOMB, NO_RULES, type GameConfig, type ModeId } from '../../engine/state';

const COLOR_NAMES: Record<SeatColor, string> = { pink: '핑크', sky: '하늘', yellow: '노랑', lime: '연두', purple: '보라' };
const DEFAULT_COLORS: SeatColor[] = ['pink', 'sky', 'yellow', 'lime'];
const DEFAULT_CARD_SIZE = 5;
const ROUND_OPTIONS = [10, 20, 30];
const CASE_LABELS = { upper: '대문자', lower: '소문자', mixed: '대소문자' } as const;

type SetKind = SetConfig['kind'];
type LetterCase = keyof typeof CASE_LABELS;

interface Props {
  mode: ModeId;
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

export function Setup({ mode, onStart, onBack }: Props) {
  const solo = mode === 'soloSurvival';
  const [count, setCount] = useState(solo ? 1 : 2);
  const [names, setNames] = useState(['플레이어 1', '플레이어 2', '플레이어 3', '플레이어 4']);
  const [colors, setColors] = useState<SeatColor[]>(DEFAULT_COLORS);
  const [kind, setKind] = useState<SetKind>('syllable');
  const [includeDouble, setIncludeDouble] = useState(false);
  const [initial, setInitial] = useState('ㄱ');
  const [batchim, setBatchim] = useState(false);
  const [letterCase, setLetterCase] = useState<LetterCase>('upper');
  const [cardSize, setCardSize] = useState(DEFAULT_CARD_SIZE);
  const [rounds, setRounds] = useState(20);
  const [rotationStep, setRotationStep] = useState<90 | 180>(90);
  const [symbolRotation, setSymbolRotation] = useState(false);
  const [speech, setSpeech] = useState(true);
  const [symbols, setSymbols] = useState<SymbolDef[] | null>(null);

  const setConfig: SetConfig = useMemo(() => {
    if (kind === 'consonant') return { kind, includeDouble };
    if (kind === 'syllable') return { kind, initial, batchim };
    return { kind, letterCase };
  }, [kind, includeDouble, initial, batchim, letterCase]);

  useEffect(() => {
    let alive = true;
    createSymbolSet(setConfig).loadSymbols().then(s => { if (alive) setSymbols(s); });
    return () => { alive = false; };
  }, [setConfig]);

  const max = symbols ? maxCardSize(symbols.length) : 0;
  const size = Math.max(MIN_CARD_SIZE, Math.min(cardSize, max));

  const start = async () => {
    // 세트를 아직 불러오는 중이면 기다렸다가 시작한다
    const syms = symbols ?? (await createSymbolSet(setConfig).loadSymbols());
    const limit = maxCardSize(syms.length);
    if (limit === 0) return;
    const cardSizeNow = Math.max(MIN_CARD_SIZE, Math.min(cardSize, limit));
    const players = Array.from({ length: count }, (_, i) => ({
      name: names[i].trim() || `플레이어 ${i + 1}`,
      color: colors[i],
      cardSize: cardSizeNow,
    }));
    onStart({ mode, players, set: setConfig, rotationStep, symbolRotation, speech, scoreRounds: rounds, seed: Date.now(), rules: NO_RULES, teams: null, bomb: DEFAULT_BOMB }, syms);
  };

  return (
    <main className="screen">
      <h1 className="title">{solo ? '혼자 하기' : '같이 하기'}</h1>

      {!solo && (
        <fieldset className="field" aria-label="인원">
          <legend>인원</legend>
          {[2, 3, 4].map(n => <Radio key={n} name="count" label={`${n}명`} checked={count === n} onChange={() => setCount(n)} />)}
        </fieldset>
      )}

      {Array.from({ length: count }, (_, i) => (
        <div className="field player" key={i}>
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
        </div>
      ))}

      <fieldset className="field" aria-label="세트">
        <legend>글자</legend>
        <Radio name="kind" label="자음" checked={kind === 'consonant'} onChange={() => setKind('consonant')} />
        <Radio name="kind" label="글자" checked={kind === 'syllable'} onChange={() => setKind('syllable')} />
        <Radio name="kind" label="알파벳" checked={kind === 'alphabet'} onChange={() => setKind('alphabet')} />
        <div className="sub">
          {kind === 'consonant' && (
            <label className="check">
              <input type="checkbox" checked={includeDouble} onChange={e => setIncludeDouble(e.target.checked)} />
              쌍자음 포함
            </label>
          )}
          {kind === 'syllable' && (
            <>
              <select className="input" aria-label="초성" value={initial} onChange={e => setInitial(e.target.value)}>
                {INITIALS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label className="check">
                <input type="checkbox" checked={batchim} onChange={e => setBatchim(e.target.checked)} />
                받침 있는 글자
              </label>
            </>
          )}
          {kind === 'alphabet' &&
            (Object.keys(CASE_LABELS) as LetterCase[]).map(c => (
              <Radio key={c} name="case" label={CASE_LABELS[c]} checked={letterCase === c} onChange={() => setLetterCase(c)} />
            ))}
        </div>
      </fieldset>

      <div className="field">
        <label className="range">
          카드당 심볼 수 <b>{size}</b>
          <input
            type="range"
            aria-label="카드당 심볼 수"
            min={MIN_CARD_SIZE}
            max={Math.max(MIN_CARD_SIZE, max)}
            step={1}
            value={size}
            onChange={e => setCardSize(Number(e.target.value))}
          />
        </label>
        {max > 0 && max < MAX_CARD_SIZE && <p className="note">심볼이 부족해서 카드당 최대 {max}개까지 쓸 수 있어요</p>}
      </div>

      {!solo && (
        <fieldset className="field" aria-label="라운드 수">
          <legend>라운드 수</legend>
          {ROUND_OPTIONS.map(n => <Radio key={n} name="rounds" label={`${n}`} checked={rounds === n} onChange={() => setRounds(n)} />)}
        </fieldset>
      )}

      <fieldset className="field" aria-label="중앙 회전">
        <legend>중앙 카드 회전</legend>
        <Radio name="rot" label="90°" checked={rotationStep === 90} onChange={() => setRotationStep(90)} />
        <Radio name="rot" label="180°" checked={rotationStep === 180} onChange={() => setRotationStep(180)} />
      </fieldset>

      <div className="field">
        <label className="check">
          <input type="checkbox" checked={symbolRotation} onChange={e => setSymbolRotation(e.target.checked)} />
          심볼 회전
        </label>
        <label className="check">
          <input type="checkbox" checked={speech} onChange={e => setSpeech(e.target.checked)} />
          읽어주기
        </label>
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
