import { useState, type ReactElement } from 'react';
import type { Screen } from '../controller';
import { AboutScreen } from './AboutScreen';
import { CampaignSheet } from './CampaignSheet';
import { CharacterEditor } from './characters/CharacterEditor';
import { CombatScreen, pcHeal, type Patient } from './combat/CombatScreen';
import { CharacterColumn } from './characters/CharacterColumn';
import { EncounterScreen } from './combat/EncounterScreen';
import { ShopScreen } from './shop/ShopScreen';
import { CharactersScreen } from './characters/CharactersScreen';
import { GenerationSheet } from './characters/GenerationSheet';
import { FullscreenButton } from './FullscreenButton';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { useEscapeCloses, useShortcuts } from './keyboard';
import { useIsDesktop } from './media';
import { CombatIcon, EncounterIcon, MenuIcon, OracleIcon, PersonIcon, SectorIcon, ShopIcon } from './icons';
import { Menu } from './Menu';
import { CardSheet } from './oracle/CardSheet';
import { DiceRoll } from './oracle/DiceRoll';
import { OracleScreen } from './oracle/OracleScreen';
import { SectorPicker, SectorScreen } from './sector/SectorScreen';
import { WorldSheet } from './sector/WorldSheet';
import { JourneySheet } from './sector/JourneySheet';

/** Die Bereiche der Leiste unten bzw. der Reiterzeile oben, in dieser Reihenfolge. */
const areas: readonly { readonly id: Screen; readonly label: string; readonly Icon: () => ReactElement }[] = [
  { id: 'oracle', label: 'Orakel', Icon: OracleIcon },
  { id: 'encounter', label: 'Begegnung', Icon: EncounterIcon },
  { id: 'combat', label: 'Kampf', Icon: CombatIcon },
  { id: 'shop', label: 'Shop', Icon: ShopIcon },
  { id: 'characters', label: 'Charaktere', Icon: PersonIcon },
  { id: 'sector', label: 'Sektor', Icon: SectorIcon },
];

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Desktop-Modus (ab 1024 px): Reiterzeile unter der Kopfzeile, darunter drei Spalten: Orakel mit
  // Log, die Charaktere, der gewählte Bereich.
  const desktop = useIsDesktop();
  // Der Text im Fragefeld gilt für Orakel und Karte; nach dem Bestätigen der Karte ist er verbraucht.
  const [question, setQuestion] = useState('');
  // Ob das Menü offen ist, ist reine Darstellung; was man darin wählt, entscheidet der Controller.
  const [menu, setMenu] = useState(false);
  // Das Ziel der Deutung: das angetippte Ergebnis, solange der Log gleich lang ist. Die App hält es
  // zusammen mit dem Fragefeld, damit es den Wechsel zwischen den Bereichen übersteht.
  const [chosen, setChosen] = useState<{ index: number; length: number } | undefined>(undefined);
  // Wen der Heilen-Dialog im Kampf zeigt; die App hält es, weil ihn im Desktop-Modus auch die
  // Charakterspalte öffnet.
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  // Die Bereiche in der Reihenfolge der Leiste; im Desktop-Modus ohne das Orakel, das rechts steht.
  const shown = desktop ? areas.filter((a) => a.id !== 'oracle') : areas;
  // Esc schließt das oberste Popup; die Ziffern wählen den Bereich an dieser Stelle der Leiste.
  useEscapeCloses(menu);
  useShortcuts(Object.fromEntries(shown.map((a, i) => [String(i + 1), () => game.showScreen(a.id)])));

  if (!view.ready) return <div className="app" aria-busy="true" />;
  const closeResult = () => game.closeResult();
  const picked = chosen !== undefined && chosen.length === view.log.length && view.log[chosen.index]?.kind !== 'note' ? chosen.index : undefined;
  const newest = view.log.findLastIndex((item) => item.kind !== 'note');
  const target = picked ?? (newest < 0 ? undefined : newest);
  const marked = question.trim() !== '';
  const onPick = (index: number) => setChosen({ index, length: view.log.length });
  const onClearTarget = () => setChosen(undefined);

  // Im Desktop-Modus ist das Orakel kein eigener Bereich, sondern die Spalte links; wer dort noch
  // auf „Orakel“ steht (frisch gestartet oder das Fenster breit gezogen), sieht den Sektor.
  const screen = desktop && view.screen === 'oracle' ? 'sector' : view.screen;
  const oracle = <OracleScreen view={view} question={question} onQuestion={setQuestion} target={target} picked={picked} marked={marked} onPick={onPick} onClearTarget={onClearTarget} strip={!desktop} />;
  const heal = screen === 'combat' && view.combat && !view.combat.sim ? pcHeal(view.combat, setPatient) : undefined;
  // Die Charakterspalte entfällt, wo der Bereich die SC selbst zeigt: im Bereich Charaktere und in der
  // Kampfsimulation, deren Arena die SC mit Wunden, Waffen und Zug führt.
  const characterColumn = desktop && screen !== 'characters' && !(screen === 'combat' && view.combat?.sim);

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
        {shown.map(({ id, label, Icon }, i) => (
          <button key={id} type="button" aria-current={screen === id ? 'page' : undefined} title={`${label} (${i + 1})`} aria-keyshortcuts={String(i + 1)} onClick={() => game.showScreen(id)}>
            <Icon />
            {label}
          </button>
        ))}
      </nav>

      <div className={desktop && !characterColumn ? 'stage without-characters' : 'stage'}>
        {desktop && (
          <aside className="oracle-panel" aria-label="Orakel">
            {oracle}
          </aside>
        )}
        {characterColumn && (
          <aside className="character-panel" aria-label="Charakterspalte">
            <CharacterColumn view={view} screen={screen} heal={heal} />
          </aside>
        )}
        <div className="screen-host">
          {screen === 'oracle' && oracle}
          {screen === 'encounter' && <EncounterScreen view={view} />}
          {screen === 'combat' && <CombatScreen view={view} patient={patient} onPatient={setPatient} />}
          {screen === 'shop' && <ShopScreen view={view} />}
          {screen === 'characters' && <CharactersScreen view={view} />}
          {screen === 'sector' && <SectorScreen view={view} />}
          {screen === 'about' && <AboutScreen persistent={view.persistent} durable={view.durable} />}
        </div>
      </div>

      {menu && <Menu view={view} onClose={() => setMenu(false)} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} items={view.items} />}
      {view.generation && <GenerationSheet generation={view.generation} odds={view.odds} log={view.log} />}
      {view.picking && <SectorPicker view={view} title={view.picking.title} />}
      {view.world && <WorldSheet key={view.world.id} world={view.world} here={view.location === view.world.id} travel={view.travel} />}
      {view.journey && <JourneySheet journey={view.journey} />}
      {view.card && <CardSheet card={view.card} onConfirmed={() => setQuestion('')} />}
      {view.result?.kind === 'damage' ? (
        <DiceRoll key={view.result.at} item={view.result} seed={view.result.of} onDone={closeResult} />
      ) : (
        view.result && <ResultDialog result={view.result} />
      )}
      {view.campaignSheet && <CampaignSheet key={view.campaign.id} sheet={view.campaignSheet} campaigns={view.campaigns} open={view.campaign} sync={view.sync} conflicts={view.conflicts} />}
    </div>
  );
}
