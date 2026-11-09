import type { SetupKind } from './Setup';

export function Home({ onPick }: { onPick: (kind: SetupKind) => void }) {
  return (
    <main className="screen screen--center">
      <h1 className="title">도블 놀이</h1>
      <div className="stack">
        <button className="btn btn--big" style={{ background: '#FFE14D' }} onClick={() => onPick('solo')}>혼자 하기</button>
        <button className="btn btn--big" style={{ background: '#FF8FB8' }} onClick={() => onPick('versus')}>같이 하기</button>
        <button className="btn btn--big" style={{ background: '#7FDBFF' }} onClick={() => onPick('team')}>팀 대결</button>
      </div>
    </main>
  );
}
