import type { ModeId } from '../../engine/state';

export function Home({ onPick }: { onPick: (mode: ModeId) => void }) {
  return (
    <main className="screen screen--center">
      <h1 className="title">도블 놀이</h1>
      <div className="stack">
        <button className="btn btn--big" style={{ background: '#FFE14D' }} onClick={() => onPick('soloSurvival')}>혼자 하기</button>
        <button className="btn btn--big" style={{ background: '#FF8FB8' }} onClick={() => onPick('score')}>같이 하기</button>
      </div>
    </main>
  );
}
