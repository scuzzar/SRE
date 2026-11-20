import type { SpaceView } from '../../controller';
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
          {unit.crashed && <p className="combat-hint space-warn">{unit.name} ist aufgeschlagen; in Stufe 1 ohne Folgen. Der Systemflug lässt sich beenden.</p>}
          <dl className="space-stats">
            <dt>Schiff</dt>
            <dd>
              {unit.name} · {unit.designName} · {unit.maxG} G
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
          <p className="globe-sheet-sub">Im Schubkreis tippen oder ziehen: vom Schiff zum Finger, der Rand ist der höchste Schub. Jede Raumrunde beginnt ohne Schub.</p>
          <button type="button" className="ghost compact" onClick={() => game.endFlight()}>
            Systemflug beenden
          </button>
        </>
      )}
    </section>
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
