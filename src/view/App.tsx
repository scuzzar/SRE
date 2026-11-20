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
import { FundsScreen } from './characters/FundsScreen';
import { GenerationSheet } from './characters/GenerationSheet';
import { ResultDialog } from './characters/ResultDialog';
import { useGame, useSnapshot } from './game-context';
import { useEscapeCloses, useShortcuts } from './keyboard';
import { useIsDesktop } from './media';
import { CloseIcon, EncounterIcon, LogIcon, MenuIcon, MissionsIcon, PeopleIcon, ShipIcon } from './icons';
import { MissionEditor, MissionsScreen } from './missions/MissionsScreen';
import { Menu } from './Menu';
import { ElsewhereDialog, NoticeToast } from './Notices';
import { CardSheet } from './oracle/CardSheet';
import { DiceRoll } from './oracle/DiceRoll';
import { OracleScreen } from './oracle/OracleScreen';
import { OracleDock } from './oracle/OracleDock';
import { SectorPicker, SectorScreen } from './sector/SectorScreen';
import { useWorldDock } from './sector/WorldSheet';
import { JourneySheet } from './sector/JourneySheet';
import { SystemJourneySheet } from './sector/SystemJourneySheet';
import { FieldCard, GlobeScreen } from './sector/GlobeScreen';
import { TripRollDialog } from './sector/TripPanels';
import { FieldDock } from './sector/FieldDock';
import { SpaceScreen } from './space/SpaceScreen';
import { SpaceCard, SpaceDock } from './space/SpacePanel';
import { LoadingOverlay } from './loading';
import { Tray } from './Tray';

/**
 * Die fünf Reiter im Ziehblatt bzw. oben in der Seitenspalte des Desktops, in dieser Reihenfolge. Im
 * Reiter Begegnung schaltet man oben zwischen Begegnung und Kampf um, im Reiter Charaktere zwischen
 * SC, Kasse und NSC (`also`); den Shop öffnet „Einkaufen“ am Feld bzw. an der Weltkarte des
 * Aufenthaltsorts.
 */
const areas: readonly { readonly id: Screen; readonly label: string; readonly Icon: () => ReactElement; readonly also?: readonly Screen[] }[] = [
  { id: 'oracle', label: 'Log', Icon: LogIcon },
  { id: 'encounter', label: 'Begegnung', Icon: EncounterIcon, also: ['combat'] },
  { id: 'characters', label: 'Charaktere', Icon: PeopleIcon, also: ['funds', 'npcs'] },
  { id: 'ship', label: 'Schiff', Icon: ShipIcon },
  { id: 'missions', label: 'Missionen', Icon: MissionsIcon },
];

/** Der Reiter, zu dem ein Screen gehört; der Shop und „Über die App“ gehören zu keinem. */
const areaOf = (screen: Screen) => areas.find((a) => a.id === screen || a.also?.includes(screen));

export function App() {
  const game = useGame();
  const view = useSnapshot();
  // Desktop-Modus (ab 1024 px): links eine Spalte mit den Reitern und darunter dem Log oder dem
  // gewählten Bereich bzw. Feld, rechts die Grundkarte. Auf dem Smartphone liegt die Grundkarte unter
  // dem Ziehblatt.
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
  // Esc schließt das oberste Popup; die Ziffern wählen den Reiter an dieser Stelle.
  useEscapeCloses(menu);
  useShortcuts(Object.fromEntries(areas.map((a, i) => [String(i + 1), () => game.showScreen(a.id)])));
  // Die Weltkarte eines gewählten Feldes, als Feld und als Reihe unten, wie beim Globus; ohne Globus,
  // sonst zeigt der seine eigene (`panel === 'world'`).
  const worldDock = useWorldDock(view.world && !view.globe ? view.world : undefined, view.world !== undefined && view.location === view.world.id, view.travel, view.log, view.logDays);

  if (!view.ready) return <div className="app" aria-busy="true" />;
  const closeResult = () => game.closeResult();

  // Den Sektor gibt es nicht mehr als Reiter: Er ist die Grundkarte ohne Globus. Wer dort noch steht,
  // sieht das Log.
  const screen: Screen = view.screen === 'sector' ? 'oracle' : view.screen;
  // Ein angetipptes Feld des Globus steht an der Stelle des Bereichs, ebenso eine gewählte Weltkarte
  // und ein gewähltes Feld des Subsektors (das zeichnet der Subsektor selbst in den Platz, den
  // `.field-slot` freihält). Für die Heimatwelt- bzw. Welt-eines-Terms-Wahl (`picking`) steht der
  // Subsektor schon selbst in einem Blatt; die neue Welt bekommt dort ein eigenes, obendrauf.
  const globeField = view.globe?.picked ? <FieldCard globe={view.globe} error={view.world?.error} log={view.log} logDays={view.logDays} tripPlan={view.tripPlan} /> : undefined;
  // Auf der Raumkarte steht ihr Blatt an der Stelle des Bereichs (2026-11-18c).
  const spaceField = view.space ? <SpaceCard space={view.space} /> : undefined;
  const field = spaceField ?? globeField ?? (view.picking ? undefined : worldDock.field) ?? (!view.globe && view.selected ? <div ref={setFieldSlot} className="field-slot" /> : undefined);
  const area = (
    <>
      {screen === 'encounter' && <EncounterScreen view={view} options={encounterOptions} onOptions={setEncounterOptions} />}
      {screen === 'combat' && <CombatScreen view={view} patient={patient} onPatient={setPatient} />}
      {screen === 'shop' && <ShopScreen view={view} onClose={desktop ? undefined : () => game.closeShop()} />}
      {screen === 'ship' && <ShipScreen view={view} />}
      {screen === 'characters' && <CharactersScreen view={view} />}
      {screen === 'npcs' && <NpcScreen view={view} />}
      {screen === 'funds' && <FundsScreen view={view} />}
      {screen === 'missions' && <MissionsScreen view={view} />}
      {screen === 'about' && <AboutScreen persistent={view.persistent} durable={view.durable} />}
    </>
  );

  const nav = (
    <nav className="nav" aria-label="Bereiche">
      {areas.map(({ id, label, Icon, also }, i) => {
        const open = (screen === id || also?.includes(screen) === true) && !field;
        return (
        <button
          key={id}
          type="button"
          aria-current={open ? 'page' : undefined}
          title={`${label} (${i + 1})`}
          aria-keyshortcuts={String(i + 1)}
          // Im Desktop-Modus führt ein zweiter Klick auf den offenen Reiter zurück zum Log; sonst
          // bleibt ein offener Reiter, wie er ist (im Reiter Charaktere etwa bei NSC oder Kasse).
          onClick={() => game.showScreen(open ? (desktop ? 'oracle' : screen) : id)}
        >
          <Icon />
          {label}
        </button>
        );
      })}
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

  // Die Reihe Notiz, Deuten, Würfeln, Karte: im Ziehblatt nur im Log, die übrigen Reiter haben unten
  // Platz für ihre eigenen Knöpfe; in der Seitenspalte des Desktops unter jedem Bereich, der keine
  // eigene Reihe hat. Beim angetippten Feld des Globus steht dort stattdessen die Reihe des Felds.
  const dock = <OracleDock view={view} shortcuts />;
  const fieldDock = view.globe?.picked ? <FieldDock globe={view.globe} trip={view.trip} tripPlan={view.tripPlan} npcs={view.npcs} missionPicking={view.missions.picking} /> : undefined;
  // Im Reiter Begegnung: die Würfe der Begegnungen und die Zeit bzw. Weiterfahren.
  const encounterDock = screen === 'encounter' && field === undefined ? <EncounterDock view={view} options={encounterOptions} /> : undefined;
  const spaceDock = view.space ? <SpaceDock space={view.space} /> : undefined;
  const own = spaceDock ?? fieldDock ?? (view.picking ? undefined : worldDock.foot) ?? encounterDock;
  const foot = own ?? ((desktop || screen === 'oracle') && field === undefined ? dock : undefined);

  // Die Grundkarte: der Globus der offenen Welt, sonst der Subsektor. Oben rechts das Menü.
  const base = (
    <div className="base">
      {view.space ? (
        <SpaceScreen key={`space-${view.space.world.id}`} space={view.space} />
      ) : view.globe ? (
        <GlobeScreen key={`globe-${view.globe.id}`} globe={view.globe} world={view.world} here={view.location === view.globe.id} travel={view.travel} log={view.log} logDays={view.logDays} trip={view.trip} focus={view.globeFocus} />
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

  // Was unter den Reitern steht: das angetippte Feld, sonst das Log oder der gewählte Bereich.
  const body = <div className="screen-host">{field ?? (screen === 'oracle' ? <OracleScreen view={view} dock={false} /> : area)}</div>;
  const areaTitle = screen === 'shop' ? 'Shop' : screen === 'about' ? 'Über die App' : (areaOf(screen)?.label ?? '');

  return (
    <div className={desktop ? 'app map-app desktop' : 'app map-app'}>
      {desktop ? (
        <>
          {/* Eine Spalte: oben die Reiter, darunter das Log oder an seiner Stelle der gewählte Bereich
              bzw. das angetippte Feld; ✕ oder ein zweiter Klick auf den Reiter führt zum Log zurück. */}
          <aside className="side-panel" aria-label="Seitenspalte">
            {banners}
            {nav}
            {!field && screen !== 'oracle' && (
              <div className="area-head">
                <h2 className="section-title">{areaTitle}</h2>
                <button type="button" className="icon-button" aria-label={`${areaTitle} schließen`} onClick={() => (screen === 'shop' ? game.closeShop() : game.showScreen('oracle'))}>
                  <CloseIcon />
                </button>
              </div>
            )}
            {body}
            {foot}
          </aside>
          {base}
        </>
      ) : (
        <>
          {base}
          <Tray
            stop={view.trayStop}
            raise={view.space ? `space-${view.space.world.id}` : view.globe?.picked?.cell ?? view.selected?.id ?? (view.world && !view.globe ? view.world.id : undefined)}
            head={banners}
            body={body}
            foot={foot}
            bar={nav}
          />
        </>
      )}

      {menu && <Menu view={view} onClose={() => setMenu(false)} />}
      {view.generation && <GenerationSheet generation={view.generation} log={view.log} />}
      {view.picking && <SectorPicker view={view} title={view.picking.title} />}
      {/* Eine neue Welt aus der Heimatwelt- bzw. Welt-eines-Terms-Wahl: Der Subsektor steht schon in
          einem Blatt, darüber kommt ein eigenes, aus denselben Teilen wie sonst im Ziehblatt. */}
      {view.picking && view.world && !view.globe && (
        <div className="overlay">
          <section className="sheet generation" role="dialog" aria-modal="true" aria-label={worldDock.title}>
            {worldDock.field}
            {worldDock.foot}
          </section>
        </div>
      )}
      {view.missions.editor && screen === 'missions' && <MissionEditor key={view.missions.editor.rev} missions={view.missions} />}
      {view.editor && <CharacterEditor key={view.editor.id ?? 'new'} editor={view.editor} skills={view.skills} items={view.items} />}
      {view.journey && <JourneySheet journey={view.journey} />}
      {view.systemJourney && <SystemJourneySheet journey={view.systemJourney} />}
      {view.card && !view.card.forNote && <CardSheet card={view.card} />}
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
      {view.notice && <NoticeToast text={view.notice} />}
      {view.elsewhere && <ElsewhereDialog />}
    </div>
  );
}
