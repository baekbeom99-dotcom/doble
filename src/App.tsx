import { useState } from 'react';
import { createSymbolSet } from './content/registry';
import type { SymbolDef } from './content/types';
import type { GameConfig, GameState } from './engine/state';
import { applyGame, bestFor, loadRecords, saveRecords, summarize } from './services/records';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { Collection } from './ui/screens/Collection';
import { Game } from './ui/screens/Game';
import { Home } from './ui/screens/Home';
import { Result, type Outcome } from './ui/screens/Result';
import { Setup, type SetupKind } from './ui/screens/Setup';

type Screen =
  | { name: 'home' }
  | { name: 'collection' }
  | { name: 'setup'; kind: SetupKind }
  | { name: 'game'; config: GameConfig; symbols: SymbolDef[] }
  | { name: 'result'; config: GameConfig; symbols: SymbolDef[]; state: GameState; outcome: Outcome | null };

/** 혼자 하기 결과를 기록에 반영하고 저장한다. 혼자 하기가 아니면 null */
export function recordGame(state: GameState, setId: string, setName: string): Outcome | null {
  // 결과 화면으로 넘어가는 길목이라, 기록 처리에 실패해도 예외를 밖으로 내보내지 않는다
  try {
    const summary = summarize(state, setId, setName);
    if (!summary) return null;
    const { records, newBest, newBadges } = applyGame(loadRecords(), summary);
    saveRecords(records);
    const best = summary.mode === 'soloSurvival' || summary.mode === 'coop' ? bestFor(records, summary.mode, setId) : null;
    return { newBest, newBadges, best };
  } catch {
    return null;
  }
}

const setInfo = (config: GameConfig) => {
  const set = createSymbolSet(config.set);
  return { setId: set.id, setName: set.name };
};

export default function App() {
  const [resets, setResets] = useState(0);
  return (
    <>
      <ErrorBoundary onReset={() => setResets(n => n + 1)}>
        <Screens key={resets} />
      </ErrorBoundary>
      <div className="rotate-notice" aria-hidden="true">태블릿을 가로로 돌려 주세요</div>
    </>
  );
}

function Screens() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const startGame = (config: GameConfig, symbols: SymbolDef[]) => setScreen({ name: 'game', config, symbols });

  switch (screen.name) {
    case 'home':
      return <Home onPick={kind => setScreen({ name: 'setup', kind })} onCollection={() => setScreen({ name: 'collection' })} />;
    case 'collection':
      return <Collection records={loadRecords()} onBack={() => setScreen({ name: 'home' })} />;
    case 'setup':
      return (
        <Setup
          kind={screen.kind}
          records={loadRecords()}
          onBack={() => setScreen({ name: 'home' })}
          onStart={startGame}
        />
      );
    case 'game': {
      const { config, symbols } = screen;
      const { setId, setName } = setInfo(config);
      const best = config.mode === 'soloSurvival' ? bestFor(loadRecords(), 'soloSurvival', setId) : null;
      return (
        <Game
          key={config.seed}
          config={config}
          symbols={symbols}
          best={best}
          onExit={() => setScreen({ name: 'home' })}
          onOver={state => setScreen({ name: 'result', config, symbols, state, outcome: recordGame(state, setId, setName) })}
        />
      );
    }
    case 'result': {
      const { config, symbols } = screen;
      return (
        <Result
          state={screen.state}
          outcome={screen.outcome}
          onHome={() => setScreen({ name: 'home' })}
          onRetry={() => startGame({ ...config, seed: Date.now() }, symbols)}
          onNextStage={() => startGame({ ...config, stage: (config.stage ?? 1) + 1, seed: Date.now() }, symbols)}
        />
      );
    }
  }
}
