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
          {leg.fare > 0 ? ` · Fahrpreis ${cr(leg.fare)}` : ''}
        </li>
      ))}
    </ol>
  );
}

/** Ein Symbol je Fahrzeug, wie die Verkehrsmittel einer Karten-App. */
const VEHICLE_ICONS: Readonly<Record<string, string>> = {
  walk: '🚶',
  'ground-car': '🚗',
  'wheeled-atv': '🚙',
  'tracked-atv': '🚜',
  'motor-boat': '🚤',
  submersible: '🛥️',
  hovercraft: '🛶',
  'primitive-biplane': '🛩️',
  'fixed-wing-aircraft': '✈️',
  helicopter: '🚁',
  'air-raft': '🛸',
  gcarrier: '🛸',
  speeder: '🛸',
  'grav-belt': '🛸',
  airline: '✈️',
};

/** Die Dauer groß: unter einem Reisetag in Stunden, sonst in Tagen. */
function duration(trip: TripView): { readonly big: string; readonly small: string } {
  return trip.days <= 1 ? { big: hoursText(trip.totalHours), small: '1 Reisetag' } : { big: daysText(trip.days), small: `${hoursText(trip.totalHours)} Fahrt` };
}

/** Die Planung im angetippten Feld: die Varianten wie bei einer Karten-App, die gewählte mit ihren Abschnitten, „Losfahren“. */
export function TripPlanCard({ plan }: { plan: TripPlanView }) {
  const game = useGame();
  const chosen = plan.options[plan.chosen];
  return (
    <div className="trip-plan" role="region" aria-label="Route">
      <h4>Route nach {plan.target}</h4>
      {plan.options.length > 0 && (
        <ul className="trip-options" role="listbox" aria-label="Varianten der Route">
          {plan.options.map((option, i) => {
            const time = duration(option.trip);
            return (
              <li key={i}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === plan.chosen}
                  className={i === plan.chosen ? 'trip-option on' : 'trip-option'}
                  onClick={() => game.chooseTripOption(i)}
                >
                  <span className="trip-option-icon" aria-hidden>
                    {VEHICLE_ICONS[option.vehicle] ?? '➜'}
                  </span>
                  <span className="trip-option-main">
                    <span className="trip-option-title">{option.title}</span>
                    {option.chain.length > 1 && (
                      <span className="trip-option-chain">
                        {option.chain.map((c, k) => (
                          <span key={k}>
                            {k > 0 && ' › '}
                            <span aria-hidden>{VEHICLE_ICONS[c.vehicle] ?? ''}</span> {c.name}
                          </span>
                        ))}
                      </span>
                    )}
                    {option.tags.length > 0 && (
                      <span className="trip-option-tags">
                        {option.tags.map((t) => (
                          <span key={t} className="trip-tag">
                            {t}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="trip-option-side">
                    <strong className="trip-option-time">{time.big}</strong>
                    <small>{time.small}</small>
                    <small className="trip-option-cost">{option.trip.cost > 0 ? cr(option.trip.cost) : 'kostenlos'}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {chosen && (
        <>
          <Legs trip={chosen.trip} />
          {chosen.short !== undefined && <p className="combat-hint">In der Kasse sind nur {cr(chosen.short)}; unterwegs geht es nur weiter, solange das Geld für den Tag reicht.</p>}
        </>
      )}
      {plan.error && (
        <p className="error" role="alert">
          {plan.error}
        </p>
      )}
      <div className="globe-actions">
        {chosen && (
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
