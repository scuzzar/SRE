import { useEffect, useRef, useState } from 'react';
import type { SpaceUnitView, SpaceView } from '../../controller';
import { useGame } from '../game-context';
import { CloseIcon } from '../icons';

const num = (n: number, digits = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Was der Schub zeigt: Stärke und, wenn eingerastet, wohin. */
function thrustText(g: number, snap: string | undefined): string {
  if (g === 0) return 'kein Schub';
  return `${num(g, 1)} G${snap ? ` · ${snap}` : ''}`;
}

/** Das Blatt der Raumkarte (Ziehblatt bzw. Seitenspalte): Raumrunde, Schiff, Schub, Warnungen. */
export function SpaceCard({ space }: { space: SpaceView }) {
  const game = useGame();
  const flight = space.flight;
  const unit = flight?.units[flight.party];
  return (
    <section className="field-card scroll space-card" aria-label="Systemflug">
      <div className="globe-sheet-head" data-tray-peek>
        <h3>{flight ? `Systemflug · Raumrunde ${flight.round}${space.battle && flight.phase === 'fire' ? ' · Feuer' : ''}` : 'Raumkarte'}</h3>
        <button type="button" className="icon-button" aria-label="Raumkarte schließen" onClick={() => game.closeSpace()}>
          <CloseIcon />
        </button>
      </div>
      <p className="globe-sheet-sub">{flight ? `${space.world.name} · seit ${flight.elapsed}` : space.world.name}</p>
      {!flight && space.choices.length > 1 && (
        <div className="chips space-choices" role="group" aria-label="Raumkarte von">
          {space.choices.map((c) => (
            <button key={c.id} type="button" aria-pressed={c.id === space.world.id} onClick={() => game.openSpace(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}
      {!flight && space.elsewhere && <p className="combat-hint">Ein Systemflug läuft an einer anderen Welt ({space.elsewhere}).</p>}
      {!flight && !space.elsewhere && space.startBlocker && <p className="combat-hint">{space.startBlocker}</p>}
      {!flight && !space.startBlocker && <p className="combat-hint">Das Schiff startet auf einer Kreisbahn mit doppeltem Radius um {space.world.name}.</p>}
      {unit && (
        <>
          {flight && <SpaceBattlePanel space={space} />}
          {unit.preview.impact !== undefined && !unit.crashed && (
            <p className="combat-hint space-warn" role="alert">
              {unit.preview.impact === 0 ? 'Aufschlag in dieser Runde!' : `Ohne Schub Aufschlag in ${unit.preview.impact} Raumrunde${unit.preview.impact === 1 ? '' : 'n'}!`}
            </p>
          )}
          {unit.preview.landing !== undefined && !unit.crashed && (
            <p className="combat-hint space-land" role="status">
              {unit.preview.landing.skims
                ? `${unit.preview.landing.round === 0 ? 'In dieser Runde' : `Ohne Schub in ${unit.preview.landing.round} Raumrunde${unit.preview.landing.round === 1 ? '' : 'n'}`} taucht ${unit.name} in ${unit.preview.landing.name} ein und schöpft Treibstoff (gut 6 Stunden); die Automatik bremst zuletzt selbst.`
                : `${unit.preview.landing.round === 0 ? `Landung auf ${unit.preview.landing.name} in dieser Runde` : `Ohne Schub Landung auf ${unit.preview.landing.name} in ${unit.preview.landing.round} Raumrunde${unit.preview.landing.round === 1 ? '' : 'n'}`}; die Landeautomatik bremst zuletzt selbst.`}
            </p>
          )}
          {space.world.giant && (
            <p className="combat-hint">
              {unit.streamlined ? `Langsam in die Wolken von ${space.world.name} eintauchen (höchstens ${num(space.landingKms)} km/s) füllt den Tank mit unraffiniertem Treibstoff.` : `${unit.designName} ist nicht stromlinienförmig und kann hier keinen Treibstoff schöpfen; in die Wolken fliegen ist ein Aufschlag.`}
            </p>
          )}
          {unit.crashed && <p className="combat-hint space-warn">{unit.name} ist aufgeschlagen; in Stufe 1 ohne Folgen. Der Systemflug lässt sich beenden.</p>}
          <dl className="space-stats">
            <dt>{unit.craft ? 'Beiboot' : 'Schiff'}</dt>
            <dd>
              {unit.name} · {unit.designName} · {unit.maxG} G
            </dd>
            {unit.damage.length > 0 && (
              <>
                <dt>Schaden</dt>
                <dd className="negative">{unit.damage.join(', ')}</dd>
              </>
            )}
            <dt>Tank</dt>
            <dd>
              {unit.fuel} / {unit.fuelMax} t{unit.unrefined > 0 ? ` (${unit.unrefined} t unraffiniert)` : ''}
            </dd>
            <dt>Schub</dt>
            <dd>{thrustText(unit.thrustG, unit.snap)}</dd>
            <dt>Geschwindigkeit</dt>
            <dd>{num(unit.speed, 2)} km/s</dd>
            <dt>{space.world.radius === undefined ? 'Abstand' : 'Höhe'}</dt>
            <dd>{num(unit.altitude)} km</dd>
            <dt>Schwerkraft hier</dt>
            <dd>{num(unit.gravity, 3)} G</dd>
          </dl>
          {flight.units.filter((u) => !u.foe).length > 1 && (
            <p className="globe-sheet-sub">
              {`Die Gruppe ist an Bord von ${unit.name}; nur sie landet. ${flight.units
                .filter((u) => !u.party && !u.foe)
                .map((u) => `${u.name} fliegt ${u.crashed ? 'nicht mehr (Aufschlag)' : 'ohne die Gruppe'}`)
                .join(', ')}. Was ohne die Gruppe fliegt, bleibt beim Beenden in der Umlaufbahn.`}
            </p>
          )}
          {flight.phase === 'thrust' && unit.thrustG > 0 && (
            <p className="space-craft">
              <button type="button" className="ghost compact" onClick={() => game.setThrust(unit.index, undefined)}>
                Kein Schub
              </button>
            </p>
          )}
          {flight.dockHint && <p className="combat-hint">{flight.dockHint}</p>}
          {flight.highport && (
            // Andocken am Highport (2026-11-28b): wie ein Beiboot am Mutterschiff, ein Chip mit Grund.
            <div className="chips space-craft" role="group" aria-label="Highport">
              <button
                type="button"
                disabled={!flight.highport.armed && flight.highport.blocker !== undefined}
                title={flight.highport.armed ? 'Andockflug aufheben' : flight.highport.blocker ?? (flight.highport.now ? `Am ${flight.highport.name} andocken` : `Andockflug: mit der nächsten Bewegung am ${flight.highport.name} andocken`)}
                onClick={() => (flight.highport!.armed ? game.cancelHighportDock() : game.dockAtHighport())}
              >
                {flight.highport.armed ? `Andockflug zum ${flight.highport.name} ✓` : `Am ${flight.highport.name} andocken`}
              </button>
            </div>
          )}
          {flight.highport && !flight.highport.armed && flight.highport.blocker && <p className="combat-hint">{flight.highport.blocker}</p>}
          {(flight.launchable.length > 0 || flight.dockable.some((c) => c.id !== flight.dock?.id)) && (
            <div className="chips space-craft" role="group" aria-label="Beiboote">
              {flight.launchable.map((c) => (
                <button key={c.id} type="button" onClick={() => game.launchCraft(c.id)}>
                  {c.name} aussetzen
                </button>
              ))}
              {flight.dockable
                .filter((c) => c.id !== flight.dock?.id)
                .map((c) => (
                  <button key={c.id} type="button" onClick={() => (c.armed ? game.undockCraft(c.id) : game.dockCraft(c.id))} title={c.armed ? 'Andockflug aufheben' : undefined}>
                    {c.armed ? `${c.name} Andockflug ✓` : `${c.name} andocken`}
                  </button>
                ))}
            </div>
          )}
          {space.departure && (
            // Die Reise, die eine Begegnung beim Start unterbrach, geht weiter (2026-11-22b).
            <div className="space-departure">
              <button type="button" className="primary compact" title={space.departure.blocker} disabled={space.departure.blocker !== undefined} onClick={() => game.departFlight()}>
                {space.departure.label}
              </button>
              <p className="muted small">
                {space.departure.blocker ??
                  (space.departure.jumpDm === undefined ? 'Ohne neuen Wurf beim Start; bei der Ankunft wird gewürfelt.' : `Fehlsprung bei 13+ auf 2W6${space.departure.jumpDm ? `, hier DM +${space.departure.jumpDm} (innerhalb ${space.departure.jumpDm === 15 ? '10' : '100'} Durchmessern)` : ', außerhalb der Sprunggrenzen ohne DM'}.`)}
              </p>
            </div>
          )}
          <EncounterChoice space={space} />
          <p className="globe-sheet-sub">Vom weißen Punkt „ohne Schub“ aus ziehen oder in seinen Kreis tippen: Wohin der Finger zeigt, dort steht das Schiff nach der Runde; der Kreis ist der höchste Schub (5.000 km je G). Jede Raumrunde beginnt ohne Schub. Mit höchstens {num(space.landingKms)} km/s aufsetzen heißt landen; führt die Bahn auf die Oberfläche und reicht der Schub, bremst die Landeautomatik im letzten Stück selbst.</p>
          <button type="button" className="ghost compact" onClick={() => game.endFlight()}>
            Systemflug beenden
          </button>
        </>
      )}
    </section>
  );
}

/** Das fremde Schiff, auf das die Hardpoints zielen: das gewählte, sonst das erste, das kämpft. */
function targetOf(space: SpaceView): SpaceUnitView | undefined {
  const flight = space.flight;
  if (!flight) return undefined;
  return flight.units[flight.target ?? -1] ?? flight.units.find((u) => u.foe && !u.wreck && !u.crashed);
}

/**
 * Der Raumkampf im Blatt (2026-11-23, Modell: docs/konzept-raumkampf.md, Entwurf: docs/mock/
 * raumkampf-ui.html): links die eigene Schiffskarte mit ▲/▼ durch die eigenen Schiffe, rechts das
 * Ziel mit ▲/▼ durch die fremden, darunter die Hardpoints über alle eigenen Schiffe – ein Tipp feuert
 * sofort. Die Knöpfe unten führt der `SpaceDock`.
 */
function SpaceBattlePanel({ space }: { space: SpaceView }) {
  const game = useGame();
  const flight = space.flight!;
  const box = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const mine = flight.units.filter((u) => !u.foe);
  const foes = flight.units.filter((u) => u.foe);
  // Taucht ein fremdes Schiff auf, rückt das Blatt nach oben, damit man es sieht.
  useEffect(() => {
    const card = box.current?.closest('.space-card');
    if (card) card.scrollTop = 0;
  }, [foes.length]);
  if (foes.length === 0) return null;
  const own = mine[Math.min(shown, mine.length - 1)]!;
  const target = targetOf(space);
  const page = (list: number, at: number, set: (n: number) => void) => (list < 2 ? undefined : () => set((at + list - 1) % list));
  const next = (list: number, at: number, set: (n: number) => void) => (list < 2 ? undefined : () => set((at + 1) % list));
  const up = page(mine.length, Math.min(shown, mine.length - 1), setShown);
  const down = next(mine.length, Math.min(shown, mine.length - 1), setShown);
  const foeUp = target === undefined ? undefined : () => game.spaceTarget(foes[(foes.findIndex((f) => f.index === target.index) + foes.length - 1) % foes.length]!.index);
  const foeDown = target === undefined ? undefined : () => game.spaceTarget(foes[(foes.findIndex((f) => f.index === target.index) + 1) % foes.length]!.index);
  return (
    <div className="space-battle" aria-label="Raumkampf" ref={box}>
      <div className="rk-cards">
        <div className="space-foe rk-card rk-own">
          <p className="kicker">Mein Schiff</p>
          <p className="space-foe-head">
            <b>
              {own.mark} {own.name}
            </b>
          </p>
          <p className="space-foe-stats mono">
            {own.designName} · {own.maxG} G · {own.lasers} Laser · {num(own.speed, 2)} km/s
          </p>
          {own.damage.length > 0 ? <p className="space-foe-damage">Treffer: {own.damage.join(', ')}</p> : <p className="space-foe-damage muted">keine Treffer</p>}
          <Pager up={up} down={down} label="eigenes Schiff" />
        </div>
        {target ? (
          <div className={`space-foe rk-card${target.wreck ? ' wreck' : ''}`}>
            <p className="kicker">Ziel</p>
            <div className="space-foe-head">
              <b>
                {target.mark} {target.name}
              </b>
              <span className={`space-intent intent-${target.wreck ? 'wreck' : (target.intent ?? '').split(' ')[0]}`}>{target.wreck ? 'Wrack' : target.intent}</span>
            </div>
            <p className="space-foe-stats mono">
              {target.designName} · {target.maxG} G · {target.lasers} Laser · {target.bands} RB{target.rangeDm !== 0 ? ` (DM ${target.rangeDm})` : ''} · {target.sight ? 'freie Sicht' : 'verdeckt'}
            </p>
            {target.damage.length > 0 ? <p className="space-foe-damage">Treffer: {target.damage.join(', ')}</p> : <p className="space-foe-damage muted">keine Treffer</p>}
            <Pager up={foeUp} down={foeDown} label="fremdes Schiff" />
          </div>
        ) : (
          <p className="combat-hint">Kein fremdes Schiff mehr im Ziel.</p>
        )}
      </div>

      <h4 className="section-title">Hardpoints · alle meine Schiffe</h4>
      <div className="chips rk-hardpoints" role="group" aria-label="Hardpoints">
        {mine.flatMap((ship) =>
          ship.hardpoints.map((h) => (
            <button
              key={`${ship.index}-${h.turret}`}
              type="button"
              disabled={h.blocker !== undefined || flight.phase !== 'fire'}
              title={flight.phase !== 'fire' ? 'Erst die Bewegung abwarten' : (h.blocker ?? `Feuert auf ${target?.name ?? 'kein Ziel'}`)}
              onClick={() => game.fireHardpoint(ship.index, h.turret)}
            >
              <span className="rk-hp-no mono">{ship.mark.slice(1)}</span>
              <span>{h.label}</span>
              <span className="rk-hp-need mono">{h.need}</span>
              {h.fired && <span className="muted">· gefeuert</span>}
            </button>
          )),
        )}
      </div>

      {mine.flatMap((ship) =>
        ship.repair === undefined
          ? []
          : [
              <div key={`repair-${ship.index}`} className="rk-repair">
                <h4 className="section-title">
                  Schadenskontrolle · {mine.length > 1 ? `${ship.name} · ` : ''}
                  {ship.repair.engineer === undefined ? 'kein Engineer' : `${ship.repair.engineer} (Engineering ${ship.repair.skill})`}
                </h4>
                <div className="chips rk-hardpoints" role="group" aria-label={`Schadenskontrolle ${ship.name}`}>
                  {ship.repair.hits.map((h) => (
                    <button key={h.at} type="button" disabled={ship.repair!.blocker !== undefined} title={ship.repair!.blocker ?? `${h.label} flicken`} onClick={() => game.controlDamage(ship.index, h.at)}>
                      <span>{h.label}</span>
                      <span className="rk-hp-need mono">{ship.repair!.need}+</span>
                    </button>
                  ))}
                </div>
                <p className="combat-hint">{ship.repair.blocker ?? `Einmal je Raumrunde: 2W6 + Engineering, 9+ flickt den Treffer; er wirkt dann nicht mehr, die Werft berechnet ihn trotzdem.`}</p>
              </div>,
            ],
      )}

      {target && own.fire.length > 0 && (
        <div className="space-dms">
          <p>
            Treffer mit <b>2W6 + DM ≥ 8</b>, je Laser ein Wurf auf {target.name}:
          </p>
          <ul>
            {own.fire.map((w) => (
              <li key={w.weapon}>
                {w.count}× {w.weapon}: {w.parts.length === 0 ? '' : `8 ${w.parts.map((p) => `${p.dm < 0 ? '−' : '+'} ${Math.abs(p.dm)} ${p.label}`).join(' ')} → `}
                <b>{w.need}+</b> auf 2W6
              </li>
            ))}
          </ul>
          {own.fire.every((w) => w.parts.length === 0) && <p className="muted">Keine DMs: bis 25 Raumbänder ohne Abzug.</p>}
        </div>
      )}
      {mine.some((s) => s.hardpoints.length === 0) && <p className="combat-hint">{mine.filter((s) => s.hardpoints.length === 0).map((s) => s.name).join(', ')} hat keinen Hardpoint mit Laser.</p>}
    </div>
  );
}

/** ▲/▼ an der rechten Kartenseite: blättert durch die Schiffe dieser Seite. */
function Pager({ up, down, label }: { up: (() => void) | undefined; down: (() => void) | undefined; label: string }) {
  if (up === undefined || down === undefined) return null;
  return (
    <>
      <button type="button" className="rk-page" aria-label={`Vorheriges ${label}`} onClick={up}>
        ▲
      </button>
      <button type="button" className="rk-page down" aria-label={`Nächstes ${label}`} onClick={down}>
        ▼
      </button>
    </>
  );
}

/** Ohne fremdes Schiff: eine Schiffsbegegnung würfeln oder eins von Hand auftauchen lassen. */
function EncounterChoice({ space }: { space: SpaceView }) {
  const game = useGame();
  const [choosing, setChoosing] = useState(false);
  const [design, setDesign] = useState('A');
  const [intent, setIntent] = useState<'attack' | 'flee' | 'ignore'>('attack');
  if (space.encounterBlocker !== undefined) return null;
  return (
    <div className="space-battle">
      <h4 className="section-title">Fremde Schiffe</h4>
      <div className="space-encounter">
        <button type="button" className="ghost compact" onClick={() => game.rollShipEncounter()}>
          Schiffsbegegnung würfeln
        </button>
        <button type="button" className="ghost compact" aria-pressed={choosing} onClick={() => setChoosing(!choosing)}>
          Von Hand …
        </button>
      </div>
      <p className="muted small">Starship Encounter Table (SE 13), {space.encounterColumn}.</p>
      {choosing && (
        <div className="space-encounter">
          <select aria-label="Entwurf des fremden Schiffs" value={design} onChange={(e) => setDesign(e.target.value)}>
            {space.designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <select aria-label="Absicht" value={intent} onChange={(e) => setIntent(e.target.value as typeof intent)}>
            <option value="attack">greift an</option>
            <option value="flee">flieht</option>
            <option value="ignore">beachtet die Gruppe nicht</option>
          </select>
          <button
            type="button"
            className="ghost compact"
            onClick={() => {
              setChoosing(false);
              game.placeFoe(design, intent);
            }}
          >
            Auftauchen lassen
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Die Aktionsleiste unten auf der Raumkarte (2026-11-23, Entwurf: docs/mock/raumkampf-ui.html): Launch, Anlanden
 * und Entern links, rechts der eine Knopf durch die Phasen – „Bewegen“ führt den Schub aus, im Raumkampf
 * folgt „End Turn“ mit dem Feuer der fremden Schiffe. Ohne Systemflug: der Start.
 */
/** G so gerundet, wie die App Schub anzeigt (0,1 G). */
const gLabel = (g: number): string => (Math.round(g * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });

export function SpaceDock({ space }: { space: SpaceView }) {
  const game = useGame();
  const flight = space.flight;
  if (!flight) {
    return (
      <div className="actions oracle-actions space-actions">
        <button type="button" className="action draw" disabled={space.startBlocker !== undefined} title={space.startBlocker} onClick={() => game.startFlight()}>
          Systemflug beginnen
        </button>
      </div>
    );
  }
  const thrust = flight.phase === 'thrust';
  const launchable = flight.launchable;
  const dock = flight.dock;
  // Der eine Platz in der Aktionsleiste: „Andocken“ zurück zum Mutterschiff, sobald die Gruppe in einem Small
  // Craft sitzt, sonst „Launch“ aus dem Stapel (2026-11-23). Auf der Welt aufsetzen heißt im Modell
  // „Landen“ und bleibt die Landeautomatik. Der Knopf ist in beiden Phasen zu haben: Wer heimfliegt,
  // dockt auch nach dem Feuer noch an. Weiter als 100 km weg ist kein Grund: „Andocken“ setzt dann
  // den Andockflug und dockt mit der nächsten Bewegung an (2026-11-23c).
  return (
    <div className="actions oracle-actions space-actions">
      {dock === undefined ? (
        <button
          type="button"
          className="action dice"
          disabled={launchable.length === 0 || !thrust}
          title={launchable.length === 0 ? 'Kein Beiboot am Mutterschiff' : thrust ? 'Nächstes Beiboot aus dem Stapel frei' : 'Beiboote startet man vor der Bewegung'}
          onClick={() => launchable[0] !== undefined && game.launchCraft(launchable[0].id)}
        >
          Launch{launchable.length > 0 ? ` (${launchable.length})` : ''}
        </button>
      ) : (
        <button
          type="button"
          className="action draw"
          disabled={dock.blocker !== undefined}
          title={
            dock.armed
              ? `Andockflug: dockt mit der nächsten Bewegung an ${dock.mother} an – nochmal tippen hebt ihn auf`
              : dock.blocker ?? (dock.now ? `${dock.name} an ${dock.mother} andocken` : `Heimflug: ${gLabel(dock.g)} G bis ${dock.mother}, ${dock.name} hat ${gLabel(dock.maxG)} G`)
          }
          onClick={() => (dock.armed ? game.undockCraft(dock.id) : game.dockCraft(dock.id))}
        >
          {dock.armed ? 'Andocken ✓' : 'Andocken'}
        </button>
      )}
      <button type="button" className="action dice" disabled title="Stufe 4b: ein Small Craft landet an Bord">
        Anlanden
      </button>
      <button type="button" className="action dice" disabled title="Stufe 4b: Entern">
        Entern
      </button>
      <button type="button" className="action draw" title={thrust ? 'Schub der Runde ausführen' : 'Salve schließen: die fremden Schiffe feuern, dann die nächste Raumrunde'} onClick={() => (thrust ? game.runRound() : game.endTurn())}>
        {thrust ? 'Bewegen' : 'End Turn'}
      </button>
    </div>
  );
}
