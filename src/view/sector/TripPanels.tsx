import type { TripPlanView, TripView } from '../../controller';
import { useGame } from '../game-context';

const hoursText = (h: number) => `${String(h).replace('.', ',')} h`;
const cr = (n: number) => `Cr${n.toLocaleString('de-DE')}`;
const daysText = (n: number) => `${n} ${n === 1 ? 'Tag' : 'Tage'}`;

/** Die Abschnitte einer Fahrt, je eine Zeile. */
function Legs({ trip }: { trip: TripView }) {
  return (
    <ol className="trip-legs">
      {trip.legs.map((leg, i) => (
        <li key={i} className={leg.done ? 'done' : undefined}>
          <strong>
            {leg.vehicle}
            {leg.rented ? ' (gemietet)' : ''}
          </strong>{' '}
          {leg.flight ? 'fliegt' : 'fährt'} von {leg.from} nach {leg.to} · {hoursText(leg.hours)}
          {leg.rentPerDay > 0 ? ` · ${cr(leg.rentPerDay)} je Tag` : ''}
        </li>
      ))}
    </ol>
  );
}

/** Die Planung im angetippten Feld: der Vorschlag mit Dauer und Miete, „Losfahren“. */
export function TripPlanCard({ plan }: { plan: TripPlanView }) {
  const game = useGame();
  return (
    <div className="trip-plan" role="region" aria-label="Route">
      <h4>Route nach {plan.target}</h4>
      <label className="globe-check">
        <input type="checkbox" checked={plan.rent} onChange={(e) => game.planTrip(e.target.checked)} /> Fahrzeuge mieten
      </label>
      {plan.plan && (
        <>
          <Legs trip={plan.plan} />
          <p className="trip-sum">
            {daysText(plan.plan.days)} ({hoursText(plan.plan.totalHours)} Fahrt, 8 h je Tag){plan.plan.rent > 0 ? ` · Miete ${cr(plan.plan.rent)}` : ''}
          </p>
          {plan.short !== undefined && <p className="combat-hint">In der Kasse sind nur {cr(plan.short)}; unterwegs geht es nur weiter, solange die Miete für den Tag reicht.</p>}
        </>
      )}
      {plan.error && (
        <p className="error" role="alert">
          {plan.error}
        </p>
      )}
      <div className="globe-actions">
        {plan.plan && (
          <button type="button" className="primary compact" onClick={() => game.startTrip()}>
            Losfahren
          </button>
        )}
        <button type="button" className="ghost compact" onClick={() => game.closeTripPlan()}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

/** Die laufende Fahrt: wohin, wie lange noch, „Einen Tag fahren“ und abbrechen. */
export function TripBar({ trip, note, blocked }: { trip: TripView; note: string | undefined; blocked?: string | undefined }) {
  const game = useGame();
  return (
    <section className="trip-bar" aria-label="Fahrt">
      <p className="trip-head">
        Unterwegs nach <strong>{trip.to}</strong> · noch {daysText(trip.daysLeft)} · bei {trip.at}
      </p>
      <details>
        <summary>Abschnitte</summary>
        <Legs trip={trip} />
      </details>
      <div className="globe-actions">
        <button type="button" className="primary compact" disabled={blocked !== undefined} onClick={() => game.driveDay()}>
          Einen Tag fahren
        </button>
        <button type="button" className="ghost compact" onClick={() => game.cancelTrip()}>
          Fahrt abbrechen
        </button>
      </div>
      {blocked && <p className="combat-hint">{blocked}</p>}
      {note && (
        <p className="error" role="alert">
          {note}
        </p>
      )}
    </section>
  );
}
