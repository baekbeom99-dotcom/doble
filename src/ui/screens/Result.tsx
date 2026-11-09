import { SEAT_COLORS } from '../../engine/seats';
import type { GameState, ModeId } from '../../engine/state';
import { standings } from '../../engine/teams';

interface Props { state: GameState; onRetry: () => void; onHome: () => void }

const valueText = (mode: ModeId, n: number) => (mode === 'tower' ? `탑 ${n}층` : mode === 'bomb' ? `${n}장` : `${n}점`);

export function Result({ state, onRetry, onHome }: Props) {
  const { config } = state;
  const solo = config.mode === 'soloSurvival';

  return (
    <main className="screen screen--center">
      <h1 className="title">결과</h1>
      {solo ? (
        <p className="big-result">{state.mode.correct}개 찾았어요</p>
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
      <div className="actions">
        <button className="btn" onClick={onHome}>처음으로</button>
        <button className="btn btn--primary" onClick={onRetry}>다시 하기</button>
      </div>
    </main>
  );
}
