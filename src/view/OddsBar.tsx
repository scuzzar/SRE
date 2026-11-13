import type { OddsChoice } from '../controller';
import { useGame } from './game-context';

/** Die eine Auswahl für Orakel und Proben: Name, Chance für Ja und Zielwert der Probe. */
export function OddsBar({ odds }: { odds: readonly OddsChoice[] }) {
  const game = useGame();
  return (
    <div className="odds" role="radiogroup" aria-label="Stufe: Chance für Ja und Zielwert der Probe">
      {odds.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.selected} aria-label={`${o.name}, ${o.chance} %, ${o.target}+`} onClick={() => game.setOdds(o.id)}>
          <span className="odds-name">{o.name}</span>
          <span className="odds-sub">
            <span>{o.chance} %</span>
            <span className="odds-dot"> · </span>
            <span>{o.target}+</span>
          </span>
        </button>
      ))}
    </div>
  );
}
