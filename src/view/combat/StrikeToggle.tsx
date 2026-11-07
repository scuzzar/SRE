import type { MeleeView } from '../../controller';
import { signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

/**
 * Schlag oder Hieb am Zug (SR 22): wie er zählt, wie viele Combat-Schläge noch da sind, und für einen
 * SC die Wahl, ihn freiwillig zu schwächen. Gerechnet wird im Model; hier steht nur, was der Snapshot sagt.
 */
export function StrikeToggle({ melee }: { melee: MeleeView }) {
  const game = useGame();
  const choose = (weakened: boolean) => {
    if (weakened === melee.weakened) return;
    haptic('pick');
    game.chooseWeakened(weakened);
  };
  return (
    <div className="fire-toggle compact">
      {melee.canWeaken && (
        <div className="chips fire-chips" role="group" aria-label="Schlag">
          <button type="button" aria-pressed={!melee.weakened} onClick={() => choose(false)}>
            Voll
          </button>
          <button type="button" aria-pressed={melee.weakened} onClick={() => choose(true)}>
            Geschwächt {signed(melee.weakenedDm)}
          </button>
        </div>
      )}
      <p className="fire-text">{strikeText(melee)}</p>
    </div>
  );
}

/** Was der Schlag kostet, in einer Zeile: „Combat-Schlag, noch 6 von 8“. */
export function strikeText(melee: MeleeView): string {
  const left = melee.blows === undefined ? 'Ausdauer unbegrenzt (Battle Dress)' : `noch ${melee.blows} von ${melee.end} Combat-Schlägen`;
  switch (melee.strike) {
    case 'surprise':
      return `Mit Überraschung: kostet keine Ausdauer · ${left}`;
    case 'special':
      return `Gegen Wehrlose (Special): kostet keine Ausdauer · ${left}`;
    case 'weakened':
      return `Geschwächt ${signed(melee.weakenedDm)}: kostet keine Ausdauer · ${left}`;
    case 'combat':
      return `Combat-Schlag: kostet 1 · ${left}`;
    default:
      return left;
  }
}
