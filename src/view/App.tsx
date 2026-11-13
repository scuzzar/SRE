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
import { OracleScreen } from './oracle/OracleScreen';
import { SectorPicker, SectorScreen } from './sector/SectorScreen';
import { WorldSheet } from './sector/WorldSheet';

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Desktop-Modus (ab 1024 px): Reiterzeile unter der Kopfzeile, das Orakel rechts auf jedem Screen.
  const desktop = useIsDesktop();
  // Der Text im Fragefeld gilt für Orakel und Karte; nach dem Bestätigen der Karte ist er verbraucht.
  const [question, setQuestion] = useState('');
  // Ob das Menü offen ist, ist reine Darstellung; was man darin wählt, entscheidet der Controller.
  const [menu, setMenu] = useState(false);
  // Das Ziel der Deutung: das angetippte Ergebnis, solange der Log gleich lang ist. Die App hält es
  // zusammen mit dem Fragefeld, damit es den Wechsel zwischen den Bereichen übersteht.
  const [chosen, setChosen] = useState<{ index: number; length: number } | undefined>(undefined);

  if (!view.ready) return <div className="app" aria-busy="true" />;
  const closeResult = () => game.closeResult();
  const picked = chosen !== undefined && chosen.length === view.log.length && view.log[chosen.index]?.kind !== 'note' ? chosen.index : undefined;
  const newest = view.log.findLastIndex((item) => item.kind !== 'note');
  const target = picked ?? (newest < 0 ? undefined : newest);
  const marked = question.trim() !== '';
  const onPick = (index: number) => setChosen({ index, length: view.log.length });
  const onClearTarget = () => setChosen(undefined);

  // Im Desktop-Modus ist das Orakel kein eigener Bereich, sondern die Spalte rechts; wer dort noch
  // auf „Orakel“ steht (frisch gestartet oder das Fenster breit gezogen), sieht die Charaktere.
  const screen = desktop && view.screen === 'oracle' ? 'characters' : view.screen;
  const oracle = <OracleScreen view={view} question={question} onQuestion={setQuestion} target={target} picked={picked} marked={marked} onPick={onPick} onClearTarget={onClearTarget} />;

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
        {!desktop && (
          <button type="button" aria-current={screen === 'oracle' ? 'page' : undefined} onClick={() => game.showScreen('oracle')}>
            <OracleIcon />
            Orakel
          </button>
        )}
        <button type="button" aria-current={screen === 'encounter' ? 'page' : undefined} onClick={() => game.showScreen('encounter')}>
          <EncounterIcon />
          Begegnung
        </button>
        <button type="button" aria-current={screen === 'combat' ? 'page' : undefined} onClick={() => game.showScreen('combat')}>
          <CombatIcon />
          Kampf
        </button>
        <button type="button" aria-current={screen === 'shop' ? 'page' : undefined} onClick={() => game.showScreen('shop')}>
          <ShopIcon />
          Shop
        </button>
        <button type="button" aria-current={screen === 'characters' ? 'page' : undefined} onClick={() => game.showScreen('characters')}>
          <PersonIcon />
          Charaktere
        </button>
        <button type="button" aria-current={screen === 'sector' ? 'page' : undefined} onClick={() => game.showScreen('sector')}>
          <SectorIcon />
          Sektor
        </button>
      </nav>

      <div className="stage">
        <div className="screen-host">
          {screen === 'oracle' && oracle}
          {screen === 'encounter' && <EncounterScreen view={view} />}
          {screen === 'combat' && <CombatScreen view={view} />}
          {screen === 'shop' && <ShopScreen view={view} />}
          {screen === 'characters' && <CharactersScreen view={view} />}
          {screen === 'sector' && <SectorScreen view={view} />}
          {screen === 'about' && <AboutScreen persistent={view.persistent} durable={view.durable} />}
        </div>
        {desktop && (
          <aside className="oracle-panel" aria-label="Orakel">
            {oracle}
          </aside>
        )}
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
