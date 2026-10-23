import { useState } from 'react';
import { AboutScreen } from './AboutScreen';
import { CharacterEditor } from './characters/CharacterEditor';
import { CharactersScreen } from './characters/CharactersScreen';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { InfoIcon, OracleIcon, PersonIcon } from './icons';
import { CardSheet } from './oracle/CardSheet';
import { OracleScreen } from './oracle/OracleScreen';

const titles = { oracle: 'Orakel', characters: 'Charaktere', about: 'Über' } as const;

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Der Text im Fragefeld gilt für Orakel und Karte; nach dem Bestätigen der Karte ist er verbraucht.
  const [question, setQuestion] = useState('');

  if (!view.ready) return <div className="app" aria-busy="true" />;

  return (
    <div className="app">
      <header className="header">
        <span className="brand">SOLO RPG ENGINE</span>
        <span className="header-right">
          {titles[view.screen]}
          <button
            type="button"
            className="icon-button"
            aria-label="Über die App"
            aria-current={view.screen === 'about' ? 'page' : undefined}
            onClick={() => game.showScreen(view.screen === 'about' ? 'oracle' : 'about')}
          >
            <InfoIcon />
          </button>
        </span>
      </header>
      {view.storageError && (
        <p className="banner" role="alert">
          {view.storageError}
        </p>
      )}

      {view.screen === 'oracle' && <OracleScreen view={view} question={question} onQuestion={setQuestion} />}
      {view.screen === 'characters' && <CharactersScreen view={view} />}
      {view.screen === 'about' && <AboutScreen persistent={view.persistent} />}

      <nav className="nav" aria-label="Bereiche">
        <button type="button" aria-current={view.screen === 'oracle' ? 'page' : undefined} onClick={() => game.showScreen('oracle')}>
          <OracleIcon />
          Orakel
        </button>
        <button type="button" aria-current={view.screen === 'characters' ? 'page' : undefined} onClick={() => game.showScreen('characters')}>
          <PersonIcon />
          Charaktere
        </button>
      </nav>

      {view.card && <CardSheet card={view.card} onConfirmed={() => setQuestion('')} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} />}
      {view.result && <ResultDialog result={view.result} />}
    </div>
  );
}
