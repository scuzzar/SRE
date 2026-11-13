import { useState } from 'react';
import { AboutScreen } from './AboutScreen';
import { CampaignSheet } from './CampaignSheet';
import { CharacterEditor } from './characters/CharacterEditor';
import { CombatScreen } from './combat/CombatScreen';
import { EncounterScreen } from './combat/EncounterScreen';
import { ShopScreen } from './shop/ShopScreen';
import { CharactersScreen } from './characters/CharactersScreen';
import { GenerationSheet } from './characters/GenerationSheet';
import { FullscreenButton } from './FullscreenButton';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { useIsDesktop } from './media';
import { CombatIcon, EncounterIcon, MenuIcon, OracleIcon, PersonIcon, SectorIcon, ShopIcon } from './icons';
import { Menu } from './Menu';
import { CardSheet } from './oracle/CardSheet';
import { DiceRoll } from './oracle/DiceRoll';
import { LogList } from './oracle/LogList';
import { OracleScreen } from './oracle/OracleScreen';
import { SectorPicker, SectorScreen } from './sector/SectorScreen';
import { WorldSheet } from './sector/WorldSheet';

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Desktop-Modus (ab 1024 px): Reiterzeile unter der Kopfzeile, der Log links auf jedem Screen.
  const desktop = useIsDesktop();
  // Der Text im Fragefeld gilt für Orakel und Karte; nach dem Bestätigen der Karte ist er verbraucht.
  const [question, setQuestion] = useState('');
  // Ob das Menü offen ist, ist reine Darstellung; was man darin wählt, entscheidet der Controller.
  const [menu, setMenu] = useState(false);
  // Das Ziel der Deutung: das angetippte Ergebnis, solange der Log gleich lang ist. Hält es die App
  // und nicht der Orakel-Screen, kann im Desktop-Modus auch der Log links ein Ziel wählen.
  const [chosen, setChosen] = useState<{ index: number; length: number } | undefined>(undefined);

  if (!view.ready) return <div className="app" aria-busy="true" />;
  const closeResult = () => game.closeResult();
  const picked = chosen !== undefined && chosen.length === view.log.length && view.log[chosen.index]?.kind !== 'note' ? chosen.index : undefined;
  const newest = view.log.findLastIndex((item) => item.kind !== 'note');
  const target = picked ?? (newest < 0 ? undefined : newest);
  const marked = question.trim() !== '';
  const onPick = (index: number) => setChosen({ index, length: view.log.length });
  const onClearTarget = () => setChosen(undefined);

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

      <nav className="nav" aria-label="Bereiche">
        <button type="button" aria-current={view.screen === 'oracle' ? 'page' : undefined} onClick={() => game.showScreen('oracle')}>
          <OracleIcon />
          Orakel
        </button>
        <button type="button" aria-current={view.screen === 'encounter' ? 'page' : undefined} onClick={() => game.showScreen('encounter')}>
          <EncounterIcon />
          Begegnung
        </button>
        <button type="button" aria-current={view.screen === 'combat' ? 'page' : undefined} onClick={() => game.showScreen('combat')}>
          <CombatIcon />
          Kampf
        </button>
        <button type="button" aria-current={view.screen === 'shop' ? 'page' : undefined} onClick={() => game.showScreen('shop')}>
          <ShopIcon />
          Shop
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

      <div className="stage">
        {desktop && (
          <aside className={view.screen === 'oracle' ? 'log-panel pickable' : 'log-panel'} aria-label="Log">
            <LogList
              log={view.log}
              target={view.screen === 'oracle' ? target : undefined}
              marked={view.screen === 'oracle' && marked}
              onPick={view.screen === 'oracle' ? onPick : () => undefined}
            />
          </aside>
        )}
        <div className="screen-host">
          {view.screen === 'oracle' && (
            <OracleScreen view={view} question={question} onQuestion={setQuestion} inlineLog={!desktop} target={target} picked={picked} marked={marked} onPick={onPick} onClearTarget={onClearTarget} />
          )}
          {view.screen === 'encounter' && <EncounterScreen view={view} />}
          {view.screen === 'combat' && <CombatScreen view={view} />}
          {view.screen === 'shop' && <ShopScreen view={view} />}
          {view.screen === 'characters' && <CharactersScreen view={view} />}
          {view.screen === 'sector' && <SectorScreen view={view} />}
          {view.screen === 'about' && <AboutScreen persistent={view.persistent} durable={view.durable} />}
        </div>
      </div>

      {menu && <Menu view={view} onClose={() => setMenu(false)} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} items={view.items} />}
      {view.generation && <GenerationSheet generation={view.generation} odds={view.odds} log={view.log} />}
      {view.picking && <SectorPicker view={view} title={view.picking.title} />}
      {view.world && <WorldSheet key={view.world.id} world={view.world} here={view.location === view.world.id} />}
      {view.card && <CardSheet card={view.card} onConfirmed={() => setQuestion('')} />}
      {view.result?.kind === 'damage' ? (
        <DiceRoll key={view.result.at} item={view.result} seed={view.result.of} onDone={closeResult} />
      ) : (
        view.result && <ResultDialog result={view.result} />
      )}
      {view.campaignSheet && <CampaignSheet key={view.campaign.id} sheet={view.campaignSheet} campaigns={view.campaigns} open={view.campaign} />}
    </div>
  );
}
