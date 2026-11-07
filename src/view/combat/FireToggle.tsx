import type { FireView } from '../../controller';
import { signed } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';

/**
 * Feuerstoß oder Schrot der Waffe: beim Automatic Rifle die Wahl zwischen Einzelschuss und Feuerstoß,
 * darunter knapp, was der Angriff bringt. Gerechnet wird im Model; hier steht nur, was der Snapshot sagt.
 */
export function FireToggle({ fire, compact = false }: { fire: FireView; compact?: boolean }) {
  const game = useGame();
  const choose = (burst: boolean) => {
    if (burst === fire.burst) return;
    haptic('pick');
    game.chooseFire(burst);
  };
  return (
    <div className={compact ? 'fire-toggle compact' : 'fire-toggle'}>
      {fire.choosable && (
        <div className="chips fire-chips" role="group" aria-label="Feuerart">
          <button type="button" aria-pressed={!fire.burst} onClick={() => choose(false)}>
            Einzelschuss
          </button>
          <button type="button" aria-pressed={fire.burst} onClick={() => choose(true)}>
            Feuerstoß
          </button>
        </div>
      )}
      <p className="fire-text">{fireText(fire)}</p>
    </div>
  );
}

/** Was der Angriff bringt, in einer Zeile: „Feuerstoß, 4 Schuss: 2 Würfe aufs Ziel, dazu darüber und darunter (−3)“. */
export function fireText(fire: FireView): string {
  if (fire.burst) {
    return `Feuerstoß, ${fire.rounds} Schuss: ${fire.rolls} Würfe aufs Ziel, dazu je einer auf den darüber und darunter in der Liste (${signed(fire.neighbourDm)})`;
  }
  if (fire.neighbours > 0) return `Schrot: trifft bis zu ${fire.neighbours} ausgeloste Nachbarn des Ziels mit, ohne Abzug`;
  return `Einzelschuss: 1 Schuss, ein Wurf${fire.single ? `, DMs aus der Zeile des ${fire.single}` : ''}`;
}
