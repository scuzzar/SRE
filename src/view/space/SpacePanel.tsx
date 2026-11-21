import { useState } from 'react';
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
  const unit = flight?.units[0];
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
            <dt>Schiff</dt>
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
          <SpaceBattlePanel space={space} own={unit} />
          <p className="globe-sheet-sub">Im Schubkreis tippen oder ziehen: vom Schiff zum Finger, der Rand ist der höchste Schub. Jede Raumrunde beginnt ohne Schub. Mit höchstens {num(space.landingKms)} km/s aufsetzen heißt landen; führt die Bahn auf die Oberfläche und reicht der Schub, bremst die Landeautomatik im letzten Stück selbst.</p>
          <button type="button" className="ghost compact" onClick={() => game.endFlight()}>
            Systemflug beenden
          </button>
        </>
      )}
    </section>
  );
}

/**
 * Der Raumkampf im Blatt (2026-11-21d): das fremde Schiff mit Absicht, Entfernung und Schaden, „Feuer auf“
 * für diese Raumrunde, und ohne fremdes Schiff die Schiffsbegegnung (gewürfelt oder von Hand).
 */
function SpaceBattlePanel({ space, own }: { space: SpaceView; own: SpaceUnitView }) {
  const game = useGame();
  const [choosing, setChoosing] = useState(false);
  const [design, setDesign] = useState('A');
  const [intent, setIntent] = useState<'attack' | 'flee' | 'ignore'>('attack');
  const foes = space.flight?.units.filter((u) => u.foe) ?? [];
  return (
    <div className="space-battle">
      <h4 className="section-title">{space.battle ? 'Raumkampf' : 'Fremde Schiffe'}</h4>
      {foes.map((foe) => (
        <div key={foe.index} className={`space-foe${foe.wreck ? ' wreck' : ''}`}>
          <p>
            <b>{foe.name}</b> <span className="muted">({foe.designName})</span> · {foe.wreck ? 'kampfunfähig, treibt' : foe.intent}
          </p>
          <p className="muted">
            {foe.bands} Raumbänder{foe.rangeDm !== 0 ? ` (DM ${foe.rangeDm})` : ''} · {foe.sight ? 'freie Sicht' : 'verdeckt'} · {foe.maxG} G · {foe.lasers} Laser
            {foe.damage.length > 0 ? ` · Schaden: ${foe.damage.join(', ')}` : ''}
          </p>
          {!foe.wreck && (
            <button
              type="button"
              className="ghost compact"
              aria-pressed={own.aim === foe.index}
              disabled={own.lasers === 0 || own.crashed}
              title={own.lasers === 0 ? `${own.name} hat keinen Laser; Laser gibt es in der Werft.` : undefined}
              onClick={() => game.setAim(own.aim === foe.index ? undefined : foe.index)}
            >
              {own.aim === foe.index ? `Feuer auf ${foe.name} (${own.lasers} Laser) ✓` : `Feuer auf ${foe.name}`}
            </button>
          )}
        </div>
      ))}
      {own.lasers === 0 && foes.length > 0 && <p className="combat-hint">{own.name} hat keinen Laser, der feuern kann; Laser gibt es in der Werft (Raumhafen A oder B).</p>}
      {space.encounterBlocker === undefined && (
        <>
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
        </>
      )}
    </div>
  );
}

/** Die Reihe unten auf der Raumkarte: beginnen, Runde ausführen, kein Schub, beenden. */
export function SpaceDock({ space }: { space: SpaceView }) {
  const game = useGame();
  const flight = space.flight;
  const unit = flight?.units[0];
  if (!flight) {
    return (
      <div className="actions oracle-actions space-actions">
        <button type="button" className="action draw" disabled={space.startBlocker !== undefined} title={space.startBlocker} onClick={() => game.startFlight()}>
          Systemflug beginnen
        </button>
      </div>
    );
  }
  return (
    <div className="actions oracle-actions space-actions">
      <button type="button" className="action draw" onClick={() => game.runRound()}>
        Runde ausführen
      </button>
      <button type="button" className="action note" disabled={!unit || unit.thrustG === 0} onClick={() => game.setThrust(0, undefined)}>
        Kein Schub
      </button>
    </div>
  );
}
