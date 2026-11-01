import { useState } from 'react';
import { AboutScreen } from './AboutScreen';
import { CampaignSheet } from './CampaignSheet';
import { CharacterEditor } from './characters/CharacterEditor';
import { CharactersScreen } from './characters/CharactersScreen';
import { GenerationSheet } from './characters/GenerationSheet';
import { FullscreenButton } from './FullscreenButton';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { ChevronDownIcon, InfoIcon, OracleIcon, PersonIcon, SectorIcon } from './icons';
import { CardSheet } from './oracle/CardSheet';
import { OracleScreen } from './oracle/OracleScreen';
import { SectorScreen } from './sector/SectorScreen';
import { WorldSheet } from './sector/WorldSheet';

const titles = { oracle: 'Orakel', characters: 'Charaktere', sector: 'Sektor', about: 'Über' } as const;

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Der Text im Fragefeld gilt für Orakel und Karte; nach dem Bestätigen der Karte ist er verbraucht.
  const [question, setQuestion] = useState('');

  if (!view.ready) return <div className="app" aria-busy="true" />;

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="brand campaign-switch" aria-label={`Kampagne ${view.campaign.name}, wechseln oder verwalten`} onClick={() => game.showCampaigns()}>
          <span className="campaign-name">{view.campaign.name}</span>
          <ChevronDownIcon />
        </button>
        <span className="header-right">
          {titles[view.screen]}
          <FullscreenButton />
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
      {!view.persistent && !view.storageError && (
        <p className="banner" role="status">
          Dieser Browser speichert hier nichts dauerhaft: Kampagnen, Charaktere und Sektor sind beim Schließen weg. Zum Sichern über die Kampagnenwahl exportieren.
        </p>
      )}

      {view.screen === 'oracle' && <OracleScreen view={view} question={question} onQuestion={setQuestion} />}
      {view.screen === 'characters' && <CharactersScreen view={view} />}
      {view.screen === 'sector' && <SectorScreen view={view} />}
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
        <button type="button" aria-current={view.screen === 'sector' ? 'page' : undefined} onClick={() => game.showScreen('sector')}>
          <SectorIcon />
          Sektor
        </button>
      </nav>

      {view.card && <CardSheet card={view.card} onConfirmed={() => setQuestion('')} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} items={view.items} />}
      {view.generation && <GenerationSheet generation={view.generation} />}
      {view.world && <WorldSheet key={view.world.id} world={view.world} />}
      {view.result && <ResultDialog result={view.result} />}
      {view.campaignSheet && <CampaignSheet key={view.campaign.id} sheet={view.campaignSheet} campaigns={view.campaigns} open={view.campaign} />}
    </div>
  );
}
