import { useState, type ReactElement } from 'react';
import type { Screen } from '../controller';
import { AboutScreen } from './AboutScreen';
import { CampaignSheet } from './CampaignSheet';
import { CharacterEditor } from './characters/CharacterEditor';
import { CombatScreen, type Patient } from './combat/CombatScreen';
import { EncounterScreen, type EncounterOptions } from './combat/EncounterScreen';
import { EncounterChoiceDialog, EncounterRollDialog } from './combat/EncounterRollDialog';
import { EncounterDock } from './combat/EncounterDock';
import { ShopScreen } from './shop/ShopScreen';
import { ShipScreen } from './ship/ShipScreen';
import { CharactersScreen } from './characters/CharactersScreen';
import { NpcScreen } from './characters/NpcScreen';
import { GenerationSheet } from './characters/GenerationSheet';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { useEscapeCloses, useShortcuts } from './keyboard';
import { useIsDesktop } from './media';
import { CloseIcon, CombatIcon, EncounterIcon, LogIcon, MenuIcon, PeopleIcon, PersonIcon, ShipIcon, ShopIcon } from './icons';
import { Menu } from './Menu';
import { CardSheet } from './oracle/CardSheet';
import { DiceRoll } from './oracle/DiceRoll';
import { OracleScreen } from './oracle/OracleScreen';
import { OracleDock } from './oracle/OracleDock';
import { SectorPicker, SectorScreen } from './sector/SectorScreen';
import { WorldSheet } from './sector/WorldSheet';
import { JourneySheet } from './sector/JourneySheet';
import { FieldCard, GlobeScreen } from './sector/GlobeScreen';
import { TripRollDialog } from './sector/TripPanels';
import { FieldDock } from './sector/FieldDock';
import { LoadingOverlay } from './loading';
import { Tray } from './Tray';

/** Die Reiter im Ziehblatt bzw. im Log-Panel, in dieser Reihenfolge. */
const areas: readonly { readonly id: Screen; readonly label: string; readonly Icon: () => ReactElement }[] = [
  { id: 'oracle', label: 'Log', Icon: LogIcon },
  { id: 'encounter', label: 'Begegnung', Icon: EncounterIcon },
  { id: 'combat', label: 'Kampf', Icon: CombatIcon },
  { id: 'shop', label: 'Shop', Icon: ShopIcon },
  { id: 'ship', label: 'Schiff', Icon: ShipIcon },
  { id: 'characters', label: 'Charaktere', Icon: PersonIcon },
  { id: 'npcs', label: 'NSC', Icon: PeopleIcon },
];

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Desktop-Modus (ab 1024 px): links fest das Log-Panel, daneben der gewählte Bereich, rechts die
  // Grundkarte. Auf dem Smartphone liegt die Grundkarte unter dem Ziehblatt.
  const desktop = useIsDesktop();
  // Ob das Menü offen ist, ist reine Darstellung; was man darin wählt, entscheidet der Controller.
  const [menu, setMenu] = useState(false);
  // Wen der Heilen-Dialog im Kampf zeigt.
  const [patient, setPatient] = useState<Patient | undefined>(undefined);
  // Was im Reiter Begegnung eingestellt ist (wie viele Tage, Manuell wählen, NSC dazunehmen): reine
  // Darstellung, auf dem Blatt gewählt, von der Reihe unten benutzt.
  const [encounterOptions, setEncounterOptions] = useState<EncounterOptions>({ days: 1, manual: false, withNpcs: false });
  // Ob der Hinweis „OneDrive hat dich abgemeldet“ weggeklickt ist; reine Darstellung, beim nächsten
  // Start kommt er wieder, solange die Anmeldung fehlt.
  const [syncHintClosed, setSyncHintClosed] = useState(false);
  // Der Platz im Ziehblatt bzw. Panel, in den der Subsektor sein gewähltes Feld zeichnet.
  const [fieldSlot, setFieldSlot] = useState<HTMLDivElement | null>(null);
  // Die Reiter; im Desktop-Modus ohne Log, das links fest steht.
  const shown = desktop ? areas.filter((a) => a.id !== 'oracle') : areas;
  // Esc schließt das oberste Popup; die Ziffern wählen den Reiter an dieser Stelle.
  useEscapeCloses(menu);
  useShortcuts(Object.fromEntries(shown.map((a, i) => [String(i + 1), () => game.showScreen(a.id)])));

  if (!view.ready) return <div className="app" aria-busy="true" />;
  const closeResult = () => game.closeResult();

  // Den Sektor gibt es nicht mehr als Reiter: Er ist die Grundkarte ohne Globus. Wer dort noch steht,
  // sieht das Log.
  const screen: Screen = view.screen === 'sector' ? 'oracle' : view.screen;
  // Ein angetipptes Feld des Globus steht an der Stelle des Bereichs, ebenso ein gewähltes Feld des
  // Subsektors (das zeichnet der Subsektor selbst in den Platz, den `.field-slot` freihält).
  const globeField = view.globe?.picked ? <FieldCard globe={view.globe} error={view.world?.error} log={view.log} logDays={view.logDays} tripPlan={view.tripPlan} /> : undefined;
  const field = globeField ?? (!view.globe && view.selected ? <div ref={setFieldSlot} className="field-slot" /> : undefined);
  const area = (
    <>
      {screen === 'encounter' && <EncounterScreen view={view} options={encounterOptions} onOptions={setEncounterOptions} />}
      {screen === 'combat' && <CombatScreen view={view} patient={patient} onPatient={setPatient} />}
      {screen === 'shop' && <ShopScreen view={view} />}
      {screen === 'ship' && <ShipScreen view={view} />}
      {screen === 'characters' && <CharactersScreen view={view} />}
      {screen === 'npcs' && <NpcScreen view={view} />}
      {screen === 'about' && <AboutScreen persistent={view.persistent} durable={view.durable} />}
    </>
  );

  const nav = (
    <nav className="nav" aria-label="Bereiche">
      {shown.map(({ id, label, Icon }, i) => (
        <button
          key={id}
          type="button"
          aria-current={screen === id && !field ? 'page' : undefined}
          title={`${label} (${i + 1})`}
          aria-keyshortcuts={String(i + 1)}
          // Im Desktop-Modus schließt ein zweiter Klick auf den offenen Reiter das Panel.
          onClick={() => game.showScreen(desktop && screen === id && !field ? 'oracle' : id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  );

  const banners = (
    <>
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
      {view.sync.status === 'expired' && !syncHintClosed && (
        <div className="banner sync-hint" role="alert">
          <span>OneDrive hat dich abgemeldet, es wird nicht mehr abgeglichen.</span>
          <button type="button" className="ghost compact" onClick={() => void game.signIn()}>
            Wieder anmelden
          </button>
          <button type="button" className="icon-button" aria-label="Hinweis schließen" onClick={() => setSyncHintClosed(true)}>
            <CloseIcon />
          </button>
        </div>
      )}
    </>
  );

  // Die Reihe Notiz, Deuten, Würfeln, Karte: im Log-Panel des Desktops immer, im Ziehblatt nur im Log;
  // die übrigen Reiter haben unten Platz für ihre eigenen Knöpfe. Beim angetippten Feld des Globus
  // steht dort (und im Desktop-Modus unter dem Feld) stattdessen die Reihe des Felds.
  const dock = <OracleDock view={view} shortcuts />;
  const fieldDock = view.globe?.picked ? <FieldDock globe={view.globe} trip={view.trip} tripPlan={view.tripPlan} npcTotal={view.npcs.total} /> : undefined;
  // Im Reiter Begegnung: die Würfe der Begegnungen und die Zeit bzw. Weiterfahren.
  const encounterDock = screen === 'encounter' && field === undefined ? <EncounterDock view={view} options={encounterOptions} /> : undefined;
  const foot = fieldDock ?? encounterDock ?? (screen === 'oracle' && field === undefined ? dock : undefined);

  // Die Grundkarte: der Globus der offenen Welt, sonst der Subsektor. Oben rechts das Menü.
  const base = (
    <div className="base">
      {view.globe ? (
        <GlobeScreen key={`globe-${view.globe.id}`} globe={view.globe} world={view.world} here={view.location === view.globe.id} travel={view.travel} log={view.log} logDays={view.logDays} trip={view.trip} />
      ) : (
        <div className="base-sector">
          <SectorScreen view={view} fill dockTo={fieldSlot} />
        </div>
      )}
      <header className="map-menu">
        <button type="button" className="globe-round" aria-label="Menü" aria-expanded={menu} onClick={() => setMenu(true)}>
          <MenuIcon />
        </button>
      </header>
    </div>
  );

  const areaTitle = areas.find((a) => a.id === screen)?.label ?? (screen === 'about' ? 'Über die App' : '');

  return (
    <div className={desktop ? 'app map-app desktop' : 'app map-app'}>
      {desktop ? (
        <>
          <aside className="oracle-panel" aria-label="Log">
            {banners}
            {nav}
            <OracleScreen view={view} dock={false} />
            {dock}
          </aside>
          {(field || screen !== 'oracle') && (
            <section className="area-panel" aria-label={field ? 'Feld' : areaTitle}>
              {!field && (
                <div className="area-head">
                  <h2 className="section-title">{areaTitle}</h2>
                  <button type="button" className="icon-button" aria-label={`${areaTitle} schließen`} onClick={() => game.showScreen('oracle')}>
                    <CloseIcon />
                  </button>
                </div>
              )}
              <div className="screen-host">{field ?? area}</div>
              {fieldDock ?? encounterDock}
            </section>
          )}
          {base}
        </>
      ) : (
        <>
          {base}
          <Tray
            stop={view.trayStop}
            raise={view.globe?.picked?.cell ?? view.selected?.id}
            head={banners}
            body={<div className="screen-host">{field ?? (screen === 'oracle' ? <OracleScreen view={view} dock={false} /> : area)}</div>}
            foot={foot}
            bar={nav}
          />
        </>
      )}

      {menu && <Menu view={view} onClose={() => setMenu(false)} />}
      {view.generation && <GenerationSheet generation={view.generation} log={view.log} />}
      {view.picking && <SectorPicker view={view} title={view.picking.title} />}
      {/* Eine Welt ohne Globus (in Erschaffung, ohne Oberfläche) zeigt ihre Weltkarte als Blatt. */}
      {view.world && !view.globe && <WorldSheet key={view.world.id} world={view.world} here={view.location === view.world.id} travel={view.travel} log={view.log} logDays={view.logDays} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} items={view.items} />}
      {view.journey && <JourneySheet journey={view.journey} />}
      {view.card && <CardSheet card={view.card} />}
      {view.tripRoll && <TripRollDialog roll={view.tripRoll} />}
      {view.encounterChoice && <EncounterChoiceDialog kind={view.encounterChoice} view={view} />}
      {view.encounterRoll && <EncounterRollDialog key={`${view.encounterRoll.kind}-${view.log.length}`} roll={view.encounterRoll} view={view} />}
      {view.result?.kind === 'damage' ? (
        <DiceRoll key={view.result.at} item={view.result} seed={view.result.of} onDone={closeResult} />
      ) : (
        view.result && <ResultDialog result={view.result} />
      )}
      <LoadingOverlay />
      {view.campaignSheet && <CampaignSheet key={view.campaign.id} sheet={view.campaignSheet} campaigns={view.campaigns} open={view.campaign} sync={view.sync} conflicts={view.conflicts} />}
    </div>
  );
}
