import { SEAT_COLORS } from '../../engine/seats';
import type { GameState } from '../../engine/state';

interface Props { state: GameState; onRetry: () => void; onHome: () => void }

export function Result({ state, onRetry, onHome }: Props) {
  const { config } = state;
  const solo = config.mode === 'soloSurvival';
  const ranking = config.players
    .map((p, i) => ({ ...p, index: i, score: state.players[i].score }))
    .sort((a, b) => b.score - a.score);
  const best = ranking[0]?.score ?? 0;

  return (
    <main className="screen screen--center">
      <h1 className="title">결과</h1>
      {solo ? (
        <p className="big-result">{state.mode.correct}개 찾았어요</p>
      ) : (
        <ol className="ranking">
          {ranking.map(p => (
            <li key={p.index} className="rank">
              <span className="dot" style={{ background: SEAT_COLORS[p.color] }} />
              <span className="rank__name">{p.name}</span>
              <b>{p.score}점</b>
              {p.score === best && <span className="crown">우승</span>}
            </li>
          ))}
        </ol>
      )}
      <div className="actions">
        <button className="btn" onClick={onHome}>처음으로</button>
        <button className="btn btn--primary" onClick={onRetry}>다시 하기</button>
      </div>
    </main>
  );
}
