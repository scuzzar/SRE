import type { SystemJourneyView } from '../../controller';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';

/** Cr mit Tausenderpunkt. */
function cr(value: number): string {
  return `Cr ${value.toLocaleString('de-DE')}`;
}

/**
 * Die Reise im System (2026-11-20d), wie der Sprung als Dialog: mit Ticket (Cr 25 je Stunde und
 * Reisendem, 1 G) oder mit dem eigenen Schiff. Entfernung, Flugzeit nach T = 2·√(D/A), Tage und
 * Preis rechnet der Controller; nach der Reise zeigt der Dialog das Ergebnis.
 */
export function SystemJourneySheet({ journey }: { journey: SystemJourneyView }) {
  const game = useGame();
  const result = journey.result;
  const chosen = journey.options.find((o) => o.mode === journey.mode);
  return (
    <div className="modal">
      <section className="result journey-sheet" role="dialog" aria-modal="true" aria-labelledby="system-journey-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="system-journey-title" className="journey-title">
            {result ? 'Angekommen' : 'Reise im System'}: {journey.fromName} → {journey.toName}
          </h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={() => game.closeSystemJourney()}>
            <CloseIcon />
          </button>
        </div>
        {result ? (
          <>
            <span className="verdict small">
              {result.from} → {result.to}
            </span>
            <p className="journey-facts">
              {result.fromDate} → {result.toDate} · {result.flight} · {result.how}
            </p>
            <button type="button" className="primary" onClick={() => game.closeSystemJourney()}>
              Weiter
            </button>
          </>
        ) : (
          <>
            <p className="journey-facts">{journey.distance} · beschleunigen bis zur Mitte, dann abbremsen (T = 2·√(D/A))</p>
            <div className="segmented" role="radiogroup" aria-label="Art zu reisen">
              {journey.options.map((o) => (
                <button key={o.mode} type="button" role="radio" aria-checked={journey.mode === o.mode} disabled={o.blocker !== undefined} title={o.blocker} onClick={() => game.chooseSystemJourneyMode(o.mode)}>
                  {o.mode === 'ticket' ? 'Ticket' : 'Eigenes Schiff'}
                </button>
              ))}
            </div>
            {chosen && (
              <dl className="profile">
                <div>
                  <dt>Flug</dt>
                  <dd>
                    {chosen.mode === 'ticket' ? 'Fremdes Schiff' : chosen.label} mit {chosen.g} G: {chosen.hours} h
                  </dd>
                </div>
                <div>
                  <dt>Ankunft</dt>
                  <dd>
                    {chosen.arrival} ({chosen.days} {chosen.days === 1 ? 'Tag' : 'Tage'})
                  </dd>
                </div>
                <div>
                  <dt>Reisende</dt>
                  <dd>{journey.travellers.join(', ')}</dd>
                </div>
                <div>
                  <dt>Kosten</dt>
                  <dd>{chosen.cost === 0 ? 'keine' : `${cr(chosen.cost)} (Cr 25 je Stunde und Reisendem)`}</dd>
                </div>
              </dl>
            )}
            {chosen?.blocker && <p className="combat-hint">{chosen.blocker}</p>}
            <p className="journey-facts">Kasse {cr(journey.funds)}</p>
            {journey.error && (
              <p className="error" role="alert">
                {journey.error}
              </p>
            )}
            <button
              type="button"
              className="primary"
              disabled={chosen?.blocker !== undefined}
              onClick={() => {
                haptic('shake');
                game.travelInSystem();
              }}
            >
              Reisen
            </button>
          </>
        )}
      </section>
    </div>
  );
}
