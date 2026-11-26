import type { GlobeView, LandingView } from '../../controller';
import { useGame } from '../game-context';
import { PinIcon } from '../icons';

/**
 * Der Dialog Landeplatz (2026-11-21): Kommt die Gruppe auf eine Welt mit Globus, wählt sie zuerst ein
 * Feld, eine Stadt mit Hafen oder, mit eigenem Schiff, „Anderer Ort“ auf dem Globus. Ohne Schließen:
 * Vorher geht nichts anderes.
 */
export function LandingSheet({ landing }: { landing: LandingView }) {
  const game = useGame();
  return (
    <div className="modal">
      <section className="result journey-sheet" role="dialog" aria-modal="true" aria-labelledby="landing-title">
        <h2 id="landing-title" className="journey-title">
          Landeplatz auf {landing.name}
        </h2>
        <p className="journey-facts">Wo landet die Gruppe? {landing.free ? 'An einem Hafen oder, mit dem eigenen Schiff, an einem beliebigen Ort.' : 'Ein fremdes Schiff landet an einem Hafen.'}</p>
        <div className="landing-ports" role="group" aria-label="Häfen">
          {landing.ports.map((p) => (
            <button key={p.city} type="button" className="ghost landing-port" onClick={() => game.landAtPort(p.city)}>
              <span>{p.name}</span>
              <span className="mono">Hafen {p.port}</span>
            </button>
          ))}
        </div>
        {landing.free && (
          <button type="button" className="primary" onClick={() => game.startFreeLanding()}>
            <PinIcon />
            Anderer Ort …
          </button>
        )}
      </section>
    </div>
  );
}

/** Die Aktionsleiste unten, solange der Landeplatz auf dem Globus angetippt wird. */
export function LandingDock({ globe }: { globe: GlobeView }) {
  const game = useGame();
  const picked = globe.picked;
  return (
    <section className="dock" aria-label="Landeplatz">
      <p className="npc-placing">
        <PinIcon /> {picked ? `Landen ${picked.cities[0] ? `in ${picked.cities[0].name}` : `auf ${picked.landform}`}?` : 'Landeplatz: ein Feld auf dem Globus antippen.'}
      </p>
      <div className="actions oracle-actions field-actions trip-plan-actions">
        <button type="button" className="action note" onClick={() => game.cancelFreeLanding()}>
          Zurück
        </button>
        <button type="button" className="action draw" disabled={!picked} onClick={() => game.landHere()}>
          Hier landen
        </button>
      </div>
    </section>
  );
}
