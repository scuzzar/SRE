import type { OddsChoice } from '../controller';
import { useGame } from './game-context';

/** Die eine Auswahl für Orakel und Proben. Im Orakel mit Namen und Chance, bei Proben mit dem Zielwert. */
export function OddsBar({ odds, variant }: { odds: readonly OddsChoice[]; variant: 'oracle' | 'task' }) {
  const game = useGame();
  return (
    <div className="odds" role="radiogroup" aria-label={variant === 'oracle' ? 'Wahrscheinlichkeit für Ja' : 'Schwierigkeit'}>
      {odds.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.selected} onClick={() => game.setOdds(o.id)}>
          {variant === 'oracle' ? (
            <>
              <span className="odds-name">{o.name}</span>
              <span className="odds-sub">{o.chance} %</span>
            </>
          ) : (
            <span className="odds-target">{o.target}+</span>
          )}
        </button>
      ))}
    </div>
  );
}
