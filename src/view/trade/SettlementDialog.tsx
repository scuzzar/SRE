import type { SettlementView } from '../../controller';
import { credits } from '../format';
import { useGame } from '../game-context';

/**
 * Die Abrechnung nach der Landung (Owner, 27. November 2026): was Fracht, Fahrgäste, Botschaften und
 * der Postvertrag am Ziel gebracht haben, mit der Summe. Ein Dialog, den man nur bestätigt.
 */
export function SettlementDialog({ settlement }: { settlement: SettlementView }) {
  const game = useGame();
  return (
    <div className="modal">
      <section className="result journey-sheet" role="dialog" aria-modal="true" aria-labelledby="settlement-title">
        <div className="sheet-head centered">
          <h2 id="settlement-title" className="journey-title">Abrechnung in {settlement.world}</h2>
        </div>
        <ul className="trade-list">
          {settlement.lines.map((l, i) => (
            <li key={i} className="trade-row">
              <span className="trade-row-main">{l.text}</span>
              <span className={`mono${l.amount < 0 ? ' negative' : ''}`}>{l.amount === 0 ? '–' : credits(l.amount)}</span>
            </li>
          ))}
          <li className="trade-row trade-income-total">
            <span className="trade-row-main">
              <b>Zusammen</b>
            </span>
            <b className="mono">{credits(settlement.total)}</b>
          </li>
        </ul>
        <button data-escape type="button" className="primary" onClick={() => game.closeSettlement()}>
          Weiter
        </button>
      </section>
    </div>
  );
}
