import type { JourneyView } from '../../controller';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';
import { JourneyBody } from '../oracle/LogList';

/** Cr mit Tausenderpunkt. */
function cr(value: number): string {
  return `Cr ${value.toLocaleString('de-DE')}`;
}

/**
 * Die Reise (SE S. 8–9): mit Passagen – je Reisendem High, Middle oder Low Passage, für die
 * Low-Passagiere ihr Tipp für die Lotterie – oder mit dem eigenen Schiff (2026-11-16d) über
 * einen Sprung, mit Treibstoffverbrauch und dem Wurf auf den Fehlsprung. Was es kostet, wie
 * viele NSC mitreisen und welcher DM beim Aufwachen gilt, sagt der Controller. Nach der Reise
 * zeigt der Dialog das Ergebnis.
 */
export function JourneySheet({ journey }: { journey: JourneyView }) {
  const game = useGame();
  const result = journey.result;
  const ship = journey.ship;
  return (
    <div className="modal">
      <section className="result journey-sheet" role="dialog" aria-modal="true" aria-labelledby="journey-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="journey-title" className="journey-title">
            {result ? (result.arrived ? 'Angekommen' : 'Unterwegs') : journey.mode === 'ship' ? 'Sprung' : 'Reise'}: {journey.fromName} → {journey.toName}
          </h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={() => game.closeJourney()}>
            <CloseIcon />
          </button>
        </div>
        {result ? (
          <>
            <JourneyBody item={result} />
            <button type="button" className="primary" onClick={() => game.closeJourney()}>
              Weiter
            </button>
          </>
        ) : (
          <>
            <p className="journey-facts">
              {journey.parsecs} Parsec · {journey.days} Tage im Sprung · Ankunft {journey.arrival}
            </p>
            {ship !== undefined && (
              <div className="segmented" role="radiogroup" aria-label="Art zu reisen">
                <button type="button" role="radio" aria-checked={journey.mode === 'passage'} disabled={journey.passageBlocker !== undefined} title={journey.passageBlocker ?? 'Mit gebuchten Passagen (SE S. 8)'} onClick={() => game.chooseJourneyMode('passage')}>
                  Passage
                </button>
                <button type="button" role="radio" aria-checked={journey.mode === 'ship'} disabled={ship.blocker !== undefined} title={ship.blocker ?? `Mit ${ship.name}: Sprung ${ship.jump}, ohne Passagen`} onClick={() => game.chooseJourneyMode('ship')}>
                  Eigenes Schiff
                </button>
              </div>
            )}
            {journey.mode === 'ship' && ship !== undefined ? (
              <>
                <dl className="profile">
                  <div>
                    <dt>Schiff</dt>
                    <dd>
                      {ship.name} ({ship.design}), Sprung {ship.jump}
                    </dd>
                  </div>
                  <div>
                    <dt>Treibstoff</dt>
                    <dd>
                      {ship.fuel} t → {ship.after} t ({ship.perJump} t je Sprung)
                    </dd>
                  </div>
                  <div>
                    <dt>Kabinen</dt>
                    <dd>
                      {ship.travellers} Reisende, {ship.staterooms} Kabinen{ship.travellers > ship.staterooms && ship.travellers <= ship.staterooms * 2 ? ' (Doppelbelegung)' : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>Lebenserhaltung</dt>
                    <dd>{cr(ship.lifeSupport)}</dd>
                  </div>
                </dl>
                <p className="journey-facts">
                  Es reisen alle mit; niemand braucht eine Passage. Fehlsprung bei 13+ auf 2W6 (SR 28; ohne DMs nie) – der Wurf steht an der Reise im Log, was daraus folgt, entscheidest du.
                </p>
              </>
            ) : (
              <>
                <ul className="journey-travellers">
                  {journey.travellers.map((t) => (
                    <li key={t.id}>
                      <span className="journey-name">{t.name}</span>
                      <select aria-label={`Passage für ${t.name}`} value={t.passage} onChange={(e) => game.choosePassage(t.id, e.target.value as typeof t.passage)}>
                        {journey.passages.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.tickets > 0 ? `${p.tickets} im Gepäck` : cr(p.price)})
                          </option>
                        ))}
                      </select>
                      {t.guess !== undefined && (
                        <label className="journey-guess">
                          <span>
                            Tipp: wie viele wachen auf? {t.dm ? `(DM ${t.dm > 0 ? '+' : '−'}${Math.abs(t.dm)} beim Aufwachen)` : ''}
                          </span>
                          <select aria-label={`Tipp von ${t.name}`} value={t.guess} onChange={(e) => game.guessSurvivors(t.id, Number(e.target.value))}>
                            {Array.from({ length: journey.lowTotal + 1 }, (_, n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </li>
                  ))}
                </ul>
                {journey.lowTotal > 0 && (
                  <p className="journey-facts">
                    Low Passage: aufwachen mit 5+ auf 2W6, sonst tot. Mit euch reisen {journey.npcs} NSC im Kälteschlaf; die Low Lottery hat {cr(journey.pot)} im Topf.
                  </p>
                )}
                <p className="journey-facts">
                  Kosten: {journey.cost === 0 ? 'alles aus dem Gepäck' : cr(journey.cost)} · Kasse {cr(journey.funds)}
                </p>
              </>
            )}
            {journey.error && (
              <p className="error" role="alert">
                {journey.error}
              </p>
            )}
            <button
              type="button"
              className="primary"
              onClick={() => {
                haptic('shake');
                game.travel();
              }}
            >
              {journey.mode === 'ship' ? 'Springen' : 'Reisen'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
