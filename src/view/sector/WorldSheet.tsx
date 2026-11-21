import { Fragment, useEffect, useState, type ReactNode } from 'react';
import type { WorldDmPart } from '../../model';
import type { LogItem, SystemBodyView, SystemView, WorldAction, WorldLine, WorldView } from '../../controller';
import { HappenedList } from './HappenedList';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { signed } from '../format';
import { useGame } from '../game-context';
import { WorldIcon } from './WorldIcon';
import { animated, haptic, stopHaptics } from '../haptics';
import { HoldButton } from '../HoldButton';
import { CloseIcon, DiceIcon, GlobeIcon, PinIcon, RouteIcon, ShipIcon } from '../icons';
import { NameFromCard } from '../NameFromCard';
import { Form } from '../Form';
import { withLoading } from '../loading';

/** Wie lange das Ergebnis nach dem Landen braucht, bis es feststeht und die Knöpfe wieder gehen. */
const SETTLE_MS = 350;

/** Der DM in Teilen: der feste Teil der Formel ohne Namen („−7“), dann die Stellen mit Namen („Größe 7 +7“). */
function partsText(parts: readonly WorldDmPart[]): string {
  return parts.map((p) => (p.label ? ` ${p.label} ${signed(p.dm)}` : ` ${signed(p.dm)}`)).join('');
}

/** Der DM eines Wurfs; passen die Teile nicht zur festgehaltenen Summe, nur die Summe. */
function dmText(line: WorldLine): string {
  if (line.parts.length === 0 && line.dm === 0) return '';
  const fits = line.parts.reduce((sum, p) => sum + p.dm, 0) === line.dm;
  return fits ? partsText(line.parts) : ` ${signed(line.dm)}`;
}

/**
 * Die Weltkarte an der Stelle des Bereichs, schiebbar wie jedes angetippte Feld (Hexfeld im
 * Subsektor, Feld auf dem Globus): oben die Welt, wie sie gerade steht (UWP im Klartext, Basen,
 * Handelscodes); wieder geöffnet zeigt sie nur die Werte. Unten, wie die Reihe Notiz, Deuten, 2W6,
 * Karte im Orakel: Solange sie entsteht, die Würfelbühne und der Knopf für den nächsten Wurf, wie in
 * der Charaktererschaffung; danach Hierher reisen, Gruppe platzieren und Öffnen
 * (`WorldActions`). Eingetragen ist ein Wurf schon, bevor die Würfel rollen; die Karte zeigt den
 * neuen Stand erst, wenn das Ergebnis unten feststeht. Ein Tippen irgendwo beendet die Animation.
 *
 * Eine andere Welt (oder keine mehr) fängt frisch an, wie neu geöffnet; das gleicht einem Neustart
 * über `key`, ohne dass dafür eine eigene Stelle im Baum nötig wäre, denn Feld und Reihe unten
 * stehen an zwei verschiedenen Stellen (`App.tsx`), aus demselben Aufruf. Für eine neue Welt aus der
 * Heimatwelt- bzw. Welt-eines-Terms-Wahl (`picking`), wo der Subsektor selbst schon ein Blatt ist,
 * baut `App.tsx` aus Feld und Reihe unten stattdessen ein eigenes Blatt obendrauf (`title` nennt es).
 */
export function useWorldDock(
  world: WorldView | undefined,
  here: boolean,
  travel: { readonly blocker: string | undefined } | undefined,
  log: readonly LogItem[],
  logDays: readonly (string | undefined)[],
): { field: ReactNode; foot: ReactNode; title: string | undefined } {
  const game = useGame();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  // Was schon da war, als die Weltkarte aufging, rollt nicht noch einmal.
  const [seen, setSeen] = useState(world?.lines.length ?? 0);
  const [settled, setSettled] = useState(-1);
  const [shown, setShown] = useState(world);
  const [skips, setSkips] = useState(0);
  const [seenId, setSeenId] = useState(world?.id);
  if (world?.id !== seenId) {
    setSeenId(world?.id);
    setConfirmDiscard(false);
    setSeen(world?.lines.length ?? 0);
    setSettled(-1);
    setShown(world);
    setSkips(0);
  }
  if (!world) return { field: undefined, foot: undefined, title: undefined };

  const latest = world.lines.at(-1);
  // Ein Wurf aus dieser Sitzung der Weltkarte; ältere rollen nicht noch einmal.
  const fresh = latest !== undefined && latest.index >= seen;
  const animate = fresh && animated();
  const rolling = animate && settled < latest.index;
  if (!rolling && shown !== world) setShown(world);
  const view = rolling ? (shown ?? world) : world;
  // In Erschaffung; eine fertige Welt ohne Temperatur würfelt sie nur nach.
  const running = world.step !== 'done';
  const hasRoll = world.action.kind !== 'done';
  const title = running ? `Weltenerschaffung ${world.id}` : `${world.name ?? 'Leer'} · ${world.id}`;

  const skipTap = (e: React.MouseEvent) => {
    if (!rolling) return;
    e.stopPropagation();
    e.preventDefault();
    stopHaptics();
    setSkips((n) => n + 1);
  };

  const field = (
    // Eine andere Welt (etwa aus der Systemübersicht, 2026-11-20d) ist ein neues Blatt und beginnt oben.
    <section key={world.id} className="field-card scroll" aria-label={title} onClickCapture={skipTap}>
      <div className="globe-sheet-head" data-tray-peek>
        <h3>{running ? 'Weltenerschaffung' : (world.name ?? 'Leer')}</h3>
        <span className="header-right">
          {running &&
            (confirmDiscard ? (
              <button type="button" className="ghost danger compact" onClick={() => game.discardWorld()}>
                Wirklich verwerfen?
              </button>
            ) : (
              <button type="button" className="ghost compact" onClick={() => setConfirmDiscard(true)}>
                Verwerfen
              </button>
            ))}
          <button type="button" className="icon-button" aria-label={running ? 'Später weiter' : 'Schließen'} onClick={() => game.closeWorld()}>
            <CloseIcon />
          </button>
        </span>
      </div>
      <WorldTabs key={world.id} system={view.system}>
        {!view.empty && <WorldCard world={view} plain here={here} />}
        {view.surface && <SurfaceSection lines={view.surface} />}
        {world.subordinate && <RenameSection key={world.id} name={world.name} />}
        {world.canNote && <NoteSection key={`note-${world.id}`} note={world.note} />}
        {world.happened.length > 0 && <HappenedList title="Was hier geschah" indices={world.happened} log={log} logDays={logDays} />}
      </WorldTabs>
    </section>
  );

  // Eine ältere Welt ohne Temperatur ist schon fertig (canNote), würfelt aber noch nach: dann stehen
  // Würfelbühne und die Reihe Hierher reisen/Gruppe platzieren/Öffnen zusammen unten.
  const rollDock = hasRoll || fresh ? (
    <section className="generation-dock" aria-label="Weltenerschaffung" onClickCapture={skipTap}>
      {latest && <RollStage key={latest.index} line={latest} animate={animate} onSettled={setSettled} skips={skips} />}
      {view.prompt && (
        <p className="generation-prompt" aria-live="polite">
          {view.prompt}
        </p>
      )}
      {view.error && (
        <p className="error" role="alert">
          {view.error}
        </p>
      )}
      <Actions
        action={view.action}
        disabled={rolling}
        onRun={() => {
          game.runWorld();
          setSeen(game.snapshot().world?.lines.length ?? 0);
        }}
      />
    </section>
  ) : undefined;
  const actionsDock =
    world.canGlobe || world.canNote ? (
      <section className="dock" aria-label="An der Welt">
        <WorldActions world={view} here={here} travel={travel} />
      </section>
    ) : undefined;
  const foot = rollDock || actionsDock ? (
    <>
      {rollDock}
      {actionsDock}
    </>
  ) : undefined;

  return { field, foot, title };
}

/**
 * Die Welt, wie sie gerade steht: UWP, jede Stelle im Klartext, Temperatur, Basen, Gasriese,
 * Handelscodes. Auf der Weltkarte schlicht wie das angetippte Feld des Globus (`plain`): ohne Kasten
 * und ohne Weltsymbol, das steht schon auf der Karte. Oben auf dem Globus als Kasten mit Weltsymbol.
 */
export function WorldCard({ world, plain = false, here = false }: { world: WorldView; plain?: boolean; here?: boolean }) {
  const yes = (value: boolean | undefined) => (value === undefined ? '–' : value ? 'ja' : 'nein');
  const head = (
    <div className="pc-head static">
      <span className="pc-name">{world.name ?? 'Neue Welt'}</span>
      <span className="pc-sub mono">
        {world.id} · {world.uwp}
      </span>
    </div>
  );
  const extras = (
    <>
      <p className="world-extras">
        <span>Marinebasis {yes(world.navalBase)}</span>
        <span>Scoutbasis {yes(world.scoutBase)}</span>
        <span>Gasriese {yes(world.gasGiant)}</span>
      </p>
      {world.trade.length > 0 && (
        <ul className="chips static" aria-label="Handelscodes" lang="en">
          {world.trade.map((t) => (
            <li key={t.code} title={t.name}>
              {t.code} · {t.name}
            </li>
          ))}
        </ul>
      )}
    </>
  );
  const profile = (
    <dl className="facts world-profile" lang="en">
      {world.profile.map((p) => (
        <Fragment key={p.kind}>
          <div className={p.code === undefined ? 'pending' : undefined}>
            <dt lang="de">{p.label}</dt>
            <dd>
              <span className="mono world-digit">{p.code ?? '–'}</span>
              {p.text && <span className="world-text">{p.text}</span>}
            </dd>
          </div>
          {p.kind === 'atmosphere' && <TemperatureRow temperature={world.temperature} />}
        </Fragment>
      ))}
    </dl>
  );
  // Wie am angetippten Feld des Globus: Steht die Gruppe hier, sagt es eine Zeile.
  const hereLine = here && (
    <ul className="globe-facts">
      <li>Die Gruppe ist hier</li>
    </ul>
  );
  if (plain) {
    return (
      <article className="world-plain" aria-label="Welt">
        <p className="globe-sheet-sub mono">
          {world.id} · {world.uwp}
        </p>
        {hereLine}
        {extras}
        {profile}
      </article>
    );
  }
  // Oben steht das Weltsymbol, halb so breit wie der Block, die Tabelle darunter.
  if (world.look) {
    return (
      <article className="pc generation-card world-card" aria-label="Welt">
        <div className="world-top">
          <div className="world-top-text">
            {head}
            {hereLine}
            {extras}
          </div>
          <WorldIcon look={world.look} className="world-top-icon" label={`Weltsymbol von ${world.name ?? world.id}`} />
        </div>
        {profile}
      </article>
    );
  }
  return (
    <article className="pc generation-card world-card" aria-label="Welt">
      {head}
      {hereLine}
      {profile}
      {extras}
    </article>
  );
}

/** Die Temperatur nach Mongoose Traveller, zwischen Atmosphäre und Hydrographie wie in der Erschaffung. */
function TemperatureRow({ temperature }: { temperature: WorldView['temperature'] }) {
  const swings = temperature?.swings ? ' Schwankt stark: glühend am Tag, gefroren in der Nacht.' : '';
  return (
    <div className={temperature === undefined ? 'pending' : 'world-temperature'} lang="de">
      <dt>Temperatur</dt>
      <dd>
        {temperature === undefined ? (
          <span className="mono world-digit">–</span>
        ) : (
          <>
            <span className="world-word">{temperature.name}</span>
            <span className="world-text">
              {temperature.average} · {temperature.text}
              {swings}
            </span>
          </>
        )}
      </dd>
    </div>
  );
}

/** Die Oberfläche nach dem World Builder's Handbook, an der Stelle der früheren Liste der Würfe. */
export function SurfaceSection({ lines }: { lines: readonly string[] }) {
  return (
    <section className="career world-surface" aria-label="Oberfläche">
      <div className="career-term">
        <h4 className="world-surface-head">Oberfläche</h4>
        <ul>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Ein Körper der Systemübersicht: Symbol (oder Punkt), Art, Ziffern und Werte; ein Tipp öffnet seine Weltkarte. */
function SystemBody({ body }: { body: SystemBodyView }) {
  const game = useGame();
  const label = (
    <span className="system-label">
      {body.label}
      {body.globe && (
        <span className="system-globe" title="Hat einen Globus" aria-label="hat einen Globus">
          {' '}●
        </span>
      )}
      {body.code && <span className="system-code"> {body.code}</span>}
    </span>
  );
  if (body.openable && body.id !== undefined) {
    const id = body.id;
    return (
      <button type="button" className="system-body system-open" onClick={() => game.openWorld(id)}>
        {body.look ? <WorldIcon look={body.look} size={24} className="system-icon" /> : <span className="system-dot" aria-hidden="true" />}
        <span className="system-text">
          {label}
          {body.detail && <span className="system-detail">{body.detail}</span>}
        </span>
      </button>
    );
  }
  return (
    <span className="system-body">
      {body.look ? <WorldIcon look={body.look} size={24} className="system-icon" /> : <span className="system-dot" aria-hidden="true" />}
      <span className="system-text">
        <span className="system-label">
          {body.label}
          {body.code && <span className="system-code"> {body.code}</span>}
        </span>
        {body.detail && <span className="system-detail">{body.detail}</span>}
      </span>
    </span>
  );
}

/**
 * Das Sternsystem nach Book 6 (2026-11-20b): die Sterne, dann jede Bahn um den Hauptstern von innen
 * nach außen mit Abstand und Zone, darunter die Monde. Die Ziffern sind Größe, Atmosphäre,
 * Hydrographie und Bevölkerung.
 */
export function SystemSection({ system }: { system: SystemView }) {
  return (
    <section className="career world-system" aria-label="Sternsystem">
      <div className="career-term">
        <h4 className="world-surface-head">Sternsystem</h4>
        <p className="system-stars">
          {system.stars.map((s, i) => (
            <Fragment key={i}>
              {i > 0 && ' · '}
              <strong>{s.name}</strong> {s.where}
            </Fragment>
          ))}
        </p>
        <ol className="system-orbits">
          {system.orbits.map((o) => (
            <li key={o.orbit} className={o.body.main ? 'system-orbit system-main' : 'system-orbit'}>
              <div className="system-row">
                <span className="system-no" title="Bahn">
                  {o.orbit}
                </span>
                <SystemBody body={o.body} />
                <span className="system-where">
                  {o.distance}
                  <br />
                  {o.zone}
                </span>
              </div>
              {o.moons.length > 0 && (
                <ul className="system-moons" aria-label="Monde">
                  {o.moons.map((m) => (
                    <li key={m.id} className={m.main ? 'system-main' : undefined}>
                      <SystemBody body={m} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Die Reihe an der Welt, wie die Reihe am angetippten Feld des Globus (`FieldDock`) und im Stil von
 * Notiz, Deuten, 2W6, Karte im Orakel: Hierher reisen (eine Woche im Sprung; was nicht geht, ist
 * ausgegraut, der Grund steht darüber), Gruppe platzieren (ohne Reise und ohne Zeit, wie „Gruppe
 * setzen“ am Feld; ist die Gruppe schon hier, ausgegraut) und Öffnen (die Hexkarte der Welt, nicht
 * auf dem Globus selbst).
 */
export function WorldActions({ world, here, travel, onGlobe = false }: { world: WorldView; here: boolean; travel: { readonly blocker: string | undefined; readonly inSystem?: boolean } | undefined; onGlobe?: boolean }) {
  const game = useGame();
  // Den Globus gibt es erst auf ausdrücklichen Knopfdruck (2026-11-20d): „Globus erzeugen“, danach „Öffnen“.
  const showGlobe = !onGlobe && world.canGlobe;
  if (!showGlobe && !world.canNote) return null;
  const travelBlocker = here ? 'Die Gruppe ist schon hier' : travel?.blocker;
  return (
    <>
      {world.canNote && !here && travel?.blocker && <p className="combat-hint">{travel.blocker}</p>}
      <div className="actions oracle-actions world-actions">
        {world.canNote && travel && (
          <button type="button" className="action draw" title={travelBlocker ?? (travel.inSystem ? 'Reise im System, mit Ticket oder eigenem Schiff' : 'Eine Woche im Sprung')} disabled={travelBlocker !== undefined} onClick={() => game.openJourney()}>
            <RouteIcon />
            Hierher reisen
          </button>
        )}
        {world.canNote && (
          <button type="button" className="action note" title={here ? 'Die Gruppe ist schon hier' : 'Gruppe hierher setzen, ohne Reise und ohne Zeit'} disabled={here} onClick={() => game.stayHere()}>
            <PinIcon />
            Gruppe platzieren
          </button>
        )}
        {showGlobe && world.hasMap && (
          <button type="button" className="action note" title="Die Hexkarte der Welt" onClick={() => withLoading('Welt wird aufgebaut …', () => game.openGlobe())}>
            <GlobeIcon />
            Öffnen
          </button>
        )}
        {showGlobe && !world.hasMap && (
          <button type="button" className="action note" title="Die Oberflächenkarte der Welt würfeln: Gelände, Städte, Straßen" onClick={() => withLoading('Globus wird erzeugt …', () => game.createGlobe())}>
            <GlobeIcon />
            Globus erzeugen
          </button>
        )}
        {world.canNote && (
          <button type="button" className="action note" title="Die Raumkarte um die Welt: Systemflug" onClick={() => game.openSpace()}>
            <ShipIcon />
            Raum
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Die Notiz zur Welt: freier Text, den man jederzeit ändert. Was getippt wird, ist reine Darstellung;
 * gespeichert wird beim Verlassen des Feldes, also auch, wenn man die Weltkarte schließt.
 */
/**
 * Welt und System als Reiter der Weltkarte (Owner, 21. November 2026): „Welt“ zeigt Werte,
 * Oberfläche, Name, Notiz und Verlauf, „System“ die Übersicht des Sternsystems. Ohne System nur die
 * Welt. Eine andere Welt beginnt wieder bei „Welt“ (der Aufrufer gibt die Welt als `key`).
 */
export function WorldTabs({ system, children }: { system: SystemView | undefined; children: ReactNode }) {
  const [tab, setTab] = useState<'world' | 'system'>('world');
  if (!system) return <>{children}</>;
  return (
    <>
      <div className="segmented two world-tabs" role="tablist" aria-label="Weltkarte">
        <button type="button" role="tab" aria-selected={tab === 'world'} onClick={() => setTab('world')}>
          Welt
        </button>
        <button type="button" role="tab" aria-selected={tab === 'system'} onClick={() => setTab('system')}>
          System
        </button>
      </div>
      {tab === 'world' ? children : <SystemSection system={system} />}
    </>
  );
}

/** Der Name einer Nebenwelt (2026-11-20d): jederzeit änderbar, leer nimmt ihn weg. */
export function RenameSection({ name }: { name: string | undefined }) {
  const game = useGame();
  const [text, setText] = useState(name ?? '');
  return (
    <label className="field world-note">
      <span>Name der Welt</span>
      <input
        value={text}
        placeholder="Noch ohne Namen"
        autoComplete="off"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() !== (name ?? '')) game.nameWorld(text);
        }}
      />
    </label>
  );
}

export function NoteSection({ note }: { note: string | undefined }) {
  const game = useGame();
  const [text, setText] = useState(note ?? '');
  return (
    <label className="field world-note">
      <span>Notiz zur Welt</span>
      <textarea
        value={text}
        placeholder="Was man über die Welt weiß: Orte, Leute, Gerüchte …"
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text.trim() !== (note ?? '')) game.noteWorld(text);
        }}
      />
    </label>
  );
}

/** Der letzte Wurf auf der Bühne: Würfel rollen, landen, dann steht das Ergebnis da. Auch im Subsektor für das Vorkommen. */
export function RollStage({ line, animate, onSettled, skips }: { line: WorldLine; animate: boolean; onSettled: (index: number) => void; skips: number }) {
  const [phase, skip] = useTimeline(animate ? [THROW_MS, SETTLE_MS] : []);
  const LANDED = animate ? 1 : 0;
  const DONE = animate ? 2 : 0;

  const [skipsAtStart] = useState(skips);
  useEffect(() => {
    if (skips > skipsAtStart) skip(DONE);
  }, [skips, skipsAtStart, skip, DONE]);

  useEffect(() => {
    if (!animate) return;
    if (phase >= DONE) onSettled(line.index);
    if (phase === 0) haptic(line.dice.length === 1 ? 'land' : 'shake');
    if (phase === DONE) haptic(line.success === undefined ? 'add' : line.success ? 'success' : 'failure');
  }, [phase, DONE, animate, line.index, line.dice.length, line.success, onSettled]);

  const verdict = line.success === undefined ? '' : line.success ? ' success' : ' failure';
  const sum = line.dice.reduce((a, b) => a + b, 0);
  return (
    <div
      className={`generation-roll${phase >= DONE ? ` judged${verdict}` : ''}`}
      onClick={() => {
        if (phase >= DONE) return;
        stopHaptics();
        skip(DONE);
      }}
    >
      <div className="generation-roll-head">
        <span className="kicker">{line.label}</span>
        {line.target !== undefined && <span className="generation-target mono">{line.target}+</span>}
      </div>
      <DiceView dice={line.dice} seed={line.index + 1} landed={phase >= LANDED} size="small" />
      <div className="generation-roll-result" aria-live="polite">
        {phase >= LANDED && line.dm !== 0 && (
          <span className="mono generation-total">
            {sum}
            {dmText(line)} = {line.total}
          </span>
        )}
        {phase >= DONE && <strong lang="en">{line.result}</strong>}
      </div>
    </div>
  );
}

/** Ein Tippen während des Wurfs überspringt die Animation; lange drücken lässt die Welt bis zum Namen durchlaufen. */
function Actions({ action, disabled, onRun }: { action: WorldAction; disabled: boolean; onRun: () => void }) {
  const game = useGame();
  const [name, setName] = useState('');
  switch (action.kind) {
    case 'roll':
      return (
        <HoldButton className="roll generation-main" busy={disabled} onPress={() => game.rollWorld()} onHold={onRun}>
          <DiceIcon />
          <span>
            {action.label}
            <span className="small-label">
              {action.dice === 1 ? '1W6' : '2W6'}
              {partsText(action.parts)}
              {action.target !== undefined ? ` · ${action.target}+` : ''}
            </span>
          </span>
        </HoldButton>
      );
    case 'surface':
    case 'system':
      return (
        <button type="button" className="roll generation-main" aria-disabled={disabled || undefined} onClick={() => game.rollWorld()}>
          <DiceIcon />
          <span>{action.label}</span>
        </button>
      );
    case 'name':
      return (
        <Form
          className="inline-form generation-name"
          onSend={() => {
            game.nameWorld(name);
          }}
        >
          <label className="field">
            <span>Name der Welt</span>
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" readOnly={disabled} />
          </label>
          <NameFromCard onPick={setName} disabled={disabled} />
          <button type="submit" className="primary" aria-disabled={disabled || undefined}>
            Übernehmen
          </button>
        </Form>
      );
    case 'done':
      return (
        <button type="button" className="primary" aria-disabled={disabled || undefined} onClick={() => game.closeWorld()}>
          Schließen
        </button>
      );
  }
}
