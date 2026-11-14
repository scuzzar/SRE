import type { OddsChoice } from '../controller';
import { useGame } from './game-context';

/** Die Stufe der Probe: Name und Zielwert. Steht nur da, solange eine Probe vorbereitet ist. */
export function OddsBar({ odds }: { odds: readonly OddsChoice[] }) {
  const game = useGame();
  return (
    <div className="odds" role="radiogroup" aria-label="Stufe der Probe">
      {odds.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={o.selected} aria-label={`${o.name}, ${o.target}+`} onClick={() => game.setOdds(o.id)}>
          <span className="odds-name">{o.name}</span>
          <span className="odds-sub">{o.target}+</span>
        </button>
      ))}
    </div>
  );
}
