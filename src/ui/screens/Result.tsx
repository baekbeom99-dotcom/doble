import type { Badge } from '../../content/badges';
import { STAGE_COUNT } from '../../engine/modes/soloStage';
import { SEAT_COLORS } from '../../engine/seats';
import type { GameState, ModeId } from '../../engine/state';
import { standings } from '../../engine/teams';

/** 혼자 하기 기록 저장 결과 */
export interface Outcome { newBest: boolean; newBadges: Badge[]; best: number | null }

interface Props {
  state: GameState;
  onRetry: () => void;
  onHome: () => void;
  outcome?: Outcome | null;
  /** 스테이지를 클리어했을 때 다음 단계로 */
  onNextStage?: () => void;
}

const valueText = (mode: ModeId, n: number) => (mode === 'bomb' ? `${n}장` : `${n}점`);

function SoloSummary({ state }: { state: GameState }) {
  const { mode, config } = state;
  if (config.mode === 'soloStage') {
    const stage = config.stage ?? 1;
    if (mode.cleared !== 1) return <p className="big-result">{stage}단계 실패</p>;
    return (
      <>
        <p className="big-result">{stage}단계 클리어!</p>
        <p className="stars" aria-label={`별 ${mode.stars}개`}>{'★'.repeat(mode.stars) + '☆'.repeat(3 - mode.stars)}</p>
      </>
    );
  }
  return (
    <>
      <p className="big-result">{mode.correct}개 찾았어요</p>
      <p className="sub-result">{mode.score}점</p>
      <p className="grades">{`Perfect ${mode.perfect} · Great ${mode.great} · Good ${mode.good}`}</p>
    </>
  );
}

export function Result({ state, onRetry, onHome, outcome = null, onNextStage }: Props) {
  const { config } = state;
  const solo = config.mode === 'soloSurvival' || config.mode === 'soloStage';
  const canGoNext = config.mode === 'soloStage' && state.mode.cleared === 1 && (config.stage ?? 1) < STAGE_COUNT && !!onNextStage;

  return (
    <main className="screen screen--center">
      <h1 className="title">결과</h1>
      {solo ? (
        <SoloSummary state={state} />
      ) : state.coop ? (
        <>
          <p className="big-result">{state.coop.stage - 1}마리 물리쳤어요</p>
          <p className="sub-result">{state.coop.stage}단계까지 갔어요</p>
        </>
      ) : (
        <ul className="ranking">
          {standings(state).map(st => (
            <li key={st.players.join('-')} className="rank">
              <span className="rank__number" data-testid="rank-number">{st.rank}</span>
              <span className="dots">
                {st.players.map(i => <span key={i} className="dot" style={{ background: SEAT_COLORS[config.players[i].color] }} />)}
              </span>
              <span className="rank__name">
                {st.label}
                {config.teams && <small className="rank__members">{st.players.map(i => config.players[i].name).join(', ')}</small>}
              </span>
              <b>{valueText(config.mode, st.value)}</b>
              {st.winner && <span className="crown">우승</span>}
              {st.bomb && <span className="crown crown--bomb">폭탄!</span>}
            </li>
          ))}
        </ul>
      )}
      {outcome?.newBest && <p className="crown">새 기록!</p>}
      {outcome && outcome.newBadges.length > 0 && (
        <ul className="new-badges">
          {outcome.newBadges.map(b => <li key={b.id}>{`새 배지: ${b.name}`}</li>)}
        </ul>
      )}
      <div className="actions">
        <button className="btn" onClick={onHome}>처음으로</button>
        <button className="btn" onClick={onRetry}>다시 하기</button>
        {canGoNext && <button className="btn btn--primary" onClick={onNextStage}>다음 단계</button>}
      </div>
    </main>
  );
}
