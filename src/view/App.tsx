import { useState } from 'react';
import { AboutScreen } from './AboutScreen';
import { CampaignSheet } from './CampaignSheet';
import { CharacterEditor } from './characters/CharacterEditor';
import { CharactersScreen } from './characters/CharactersScreen';
import { GenerationSheet } from './characters/GenerationSheet';
import { FullscreenButton } from './FullscreenButton';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { MenuIcon, OracleIcon, PersonIcon, SectorIcon } from './icons';
import { Menu } from './Menu';
import { CardSheet } from './oracle/CardSheet';
import { OracleScreen } from './oracle/OracleScreen';
import { SectorPicker, SectorScreen } from './sector/SectorScreen';
import { WorldSheet } from './sector/WorldSheet';

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Der Text im Fragefeld gilt für Orakel und Karte; nach dem Bestätigen der Karte ist er verbraucht.
  const [question, setQuestion] = useState('');
  // Ob das Menü offen ist, ist reine Darstellung; was man darin wählt, entscheidet der Controller.
  const [menu, setMenu] = useState(false);

  if (!view.ready) return <div className="app" aria-busy="true" />;

  return (
    <div className="app">
      <header className="header">
        <button type="button" className="brand campaign-switch" aria-label={`Kampagne ${view.campaign.name}, Menü öffnen`} onClick={() => setMenu(true)}>
          <span className="campaign-name">{view.campaign.name}</span>
        </button>
        <span className="header-right">
          <FullscreenButton />
          <button type="button" className="icon-button menu-button" aria-label="Menü" aria-expanded={menu} onClick={() => setMenu(true)}>
            <MenuIcon />
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
      {view.screen === 'about' && <AboutScreen persistent={view.persistent} durable={view.durable} />}

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

      {menu && <Menu view={view} onClose={() => setMenu(false)} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} items={view.items} />}
      {view.generation && <GenerationSheet generation={view.generation} odds={view.odds} log={view.log} />}
      {view.picking && <SectorPicker view={view} title={view.picking.title} />}
      {view.world && <WorldSheet key={view.world.id} world={view.world} />}
      {view.card && <CardSheet card={view.card} onConfirmed={() => setQuestion('')} />}
      {view.result && <ResultDialog result={view.result} />}
      {view.campaignSheet && <CampaignSheet key={view.campaign.id} sheet={view.campaignSheet} campaigns={view.campaigns} open={view.campaign} />}
    </div>
  );
}
