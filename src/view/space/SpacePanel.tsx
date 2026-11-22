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
        <h3>{flight ? `Systemflug · Raumrunde ${flight.round}` : 'Raumkarte'}</h3>
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
          <SpaceBattlePanel space={space} own={unit} />
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
          {flight.dockHint && <p className="combat-hint">Andocken an das Mutterschiff: {flight.dockHint}</p>}
          {(flight.launchable.length > 0 || flight.dockable.length > 0) && (
            <div className="chips space-craft" role="group" aria-label="Beiboote">
              {flight.launchable.map((c) => (
                <button key={c.id} type="button" onClick={() => game.launchCraft(c.id)}>
                  {c.name} aussetzen
                </button>
              ))}
              {flight.dockable.map((c) => (
                <button key={c.id} type="button" onClick={() => game.dockCraft(c.id)}>
                  {c.name} andocken
                </button>
              ))}
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

/** Das fremde Schiff, auf das das eigene Schiff gerade feuern würde: das erste, das kein Wrack ist. */
function targetOf(space: SpaceView): SpaceUnitView | undefined {
  return space.flight?.units.find((u) => u.foe && !u.wreck && !u.crashed);
}

/**
 * Der Raumkampf oben im Blatt (2026-11-21h/i): je fremdes Schiff Absicht, Entfernung, Sicht, Antrieb,
 * Laser und Schaden, dazu der Stand des eigenen Schiffs. Gefeuert wird mit dem roten Knopf unten.
 */
function SpaceBattlePanel({ space, own }: { space: SpaceView; own: SpaceUnitView }) {
  const foes = space.flight?.units.filter((u) => u.foe) ?? [];
  const box = useRef<HTMLDivElement>(null);
  // Taucht ein fremdes Schiff auf, rückt das Blatt nach oben, damit man es sieht.
  useEffect(() => {
    const card = box.current?.closest('.space-card');
    if (card) card.scrollTop = 0;
  }, [foes.length]);
  if (foes.length === 0) return null;
  const target = targetOf(space);
  return (
    <div className="space-battle" aria-label="Raumkampf" ref={box}>
      {foes.map((foe) => (
        <div key={foe.index} className={`space-foe${foe.wreck ? ' wreck' : ''}`}>
          <p className="space-foe-head">
            <b>{foe.name}</b>
            <span className={`space-intent intent-${foe.wreck ? 'wreck' : (foe.intent ?? '').split(' ')[0]}`}>{foe.wreck ? 'Wrack' : foe.intent}</span>
          </p>
          <p className="space-foe-stats mono">
            {foe.bands} RB{foe.rangeDm !== 0 ? ` (DM ${foe.rangeDm})` : ''} · {foe.sight ? 'freie Sicht' : 'verdeckt'} · {foe.maxG} G · {foe.lasers} Laser{foe.fired ? ' · hat gefeuert' : ''}
          </p>
          {foe.damage.length > 0 && <p className="space-foe-damage">Treffer: {foe.damage.join(', ')}</p>}
        </div>
      ))}
      {target && target.fire.length > 0 && (
        <div className="space-dms">
          <p>
            Treffer mit <b>2W6 + DM ≥ 8</b>, je Laser ein Wurf:
          </p>
          <ul>
            {target.fire.map((w) => (
              <li key={w.weapon}>
                {w.count}× {w.weapon}: {w.parts.length === 0 ? '' : `8 ${w.parts.map((p) => `${p.dm < 0 ? '−' : '+'} ${Math.abs(p.dm)} ${p.label}`).join(' ')} → `}
                <b>{w.need}+</b> auf 2W6
              </li>
            ))}
          </ul>
          {target.fire.every((w) => w.parts.length === 0) && <p className="muted">Keine DMs: bis 25 Raumbänder ohne Abzug.</p>}
        </div>
      )}
      <p className="space-own">
        <b>{own.name}</b> · {own.maxG} G · {own.lasers} Laser · {own.fired ? 'hat in dieser Raumrunde gefeuert' : target?.fireBlocker === undefined && target ? 'feuerbereit' : (target?.fireBlocker ?? 'kein Ziel')}
        {own.damage.length > 0 && <span className="negative"> · Treffer: {own.damage.join(', ')}</span>}
      </p>
    </div>
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

/** Die Reihe unten auf der Raumkarte: beginnen, Runde ausführen, kein Schub, beenden. */
export function SpaceDock({ space }: { space: SpaceView }) {
  const game = useGame();
  const flight = space.flight;
  const unit = flight?.units[flight.party];
  if (!flight) {
    return (
      <div className="actions oracle-actions space-actions">
        <button type="button" className="action draw" disabled={space.startBlocker !== undefined} title={space.startBlocker} onClick={() => game.startFlight()}>
          Systemflug beginnen
        </button>
      </div>
    );
  }
  // Raumkampf (2026-11-21i): Feuer wird ausgelöst, sofort, mit den Würfen im Vordergrund.
  const target = targetOf(space);
  return (
    <div className="actions oracle-actions space-actions">
      {target && (
        <button type="button" className="action fire" disabled={target.fireBlocker !== undefined} title={target.fireBlocker} onClick={() => game.fireAt(target.index)}>
          <span>Feuer auf {target.name}</span>
          {target.fire.length > 0 && <small className="fire-need">{target.fire.map((w) => `${w.weapon} ${w.need}+`).join(' · ')}</small>}
        </button>
      )}
      <button type="button" className={target ? 'action soft' : 'action draw'} onClick={() => game.runRound()}>
        Runde ausführen
      </button>
      <button type="button" className="action note" disabled={!unit || unit.thrustG === 0} onClick={() => unit && game.setThrust(unit.index, undefined)}>
        Kein Schub
      </button>
    </div>
  );
}
