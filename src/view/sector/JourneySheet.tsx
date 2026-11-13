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
 * Die Reise mit Passagen (SE S. 8–9): je Reisendem High, Middle oder Low Passage, für die
 * Low-Passagiere ihr Tipp für die Lotterie. Was es kostet, wie viele NSC mitreisen und welcher DM
 * beim Aufwachen gilt, sagt der Controller. Nach der Reise zeigt der Dialog das Ergebnis.
 */
export function JourneySheet({ journey }: { journey: JourneyView }) {
  const game = useGame();
  const result = journey.result;
  return (
    <div className="modal">
      <section className="result journey-sheet" role="dialog" aria-modal="true" aria-labelledby="journey-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="journey-title" className="journey-title">
            {result ? 'Angekommen' : 'Reise'}: {journey.fromName} → {journey.toName}
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
              Reisen
            </button>
          </>
        )}
      </section>
    </div>
  );
}
