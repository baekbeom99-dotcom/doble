import { useState } from 'react';
import type { SymbolDef } from './content/types';
import type { GameConfig, GameState } from './engine/state';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import { Game } from './ui/screens/Game';
import { Home } from './ui/screens/Home';
import { Result } from './ui/screens/Result';
import { Setup, type SetupKind } from './ui/screens/Setup';

type Screen =
  | { name: 'home' }
  | { name: 'setup'; kind: SetupKind }
  | { name: 'game'; config: GameConfig; symbols: SymbolDef[] }
  | { name: 'result'; config: GameConfig; symbols: SymbolDef[]; state: GameState };

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

  switch (screen.name) {
    case 'home':
      return <Home onPick={kind => setScreen({ name: 'setup', kind })} />;
    case 'setup':
      return (
        <Setup
          kind={screen.kind}
          onBack={() => setScreen({ name: 'home' })}
          onStart={(config, symbols) => setScreen({ name: 'game', config, symbols })}
        />
      );
    case 'game':
      return (
        <Game
          key={screen.config.seed}
          config={screen.config}
          symbols={screen.symbols}
          onOver={state => setScreen({ name: 'result', config: screen.config, symbols: screen.symbols, state })}
        />
      );
    case 'result':
      return (
        <Result
          state={screen.state}
          onHome={() => setScreen({ name: 'home' })}
          onRetry={() => setScreen({ name: 'game', config: { ...screen.config, seed: Date.now() }, symbols: screen.symbols })}
        />
      );
  }
}
