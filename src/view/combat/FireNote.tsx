import type { FireView } from '../../controller';
import { signed } from '../format';

/**
 * Was Feuerstoß oder Schrot der Waffe bringt, knapp in einer Zeile unter dem Waffenkopf der
 * Waffentabelle. Eine Wahl gibt es hier nicht mehr: Feuerstoß und Einzelschuss sind zwei Angriffe
 * (2026-11-26). Gerechnet wird im Model; hier steht nur, was der Snapshot sagt.
 */
export function FireNote({ fire }: { fire: FireView }) {
  return <p className="fire-text">{fireText(fire)}</p>;
}

/** Was der Angriff bringt, in einer Zeile: „Feuerstoß, 4 Schuss: 2 Würfe aufs Ziel, dazu darüber und darunter (−3)“. */
export function fireText(fire: FireView): string {
  if (fire.choosable) return `Feuerstoß, ${fire.rounds} Schuss: ${fire.rolls} Würfe aufs Ziel und je einer auf die Nachbarn (${signed(fire.neighbourDm)}); oder ein Einzelschuss`;
  if (fire.burst) {
    return `Feuerstoß, ${fire.rounds} Schuss: ${fire.rolls} Würfe aufs Ziel, dazu je einer auf den darüber und darunter in der Liste (${signed(fire.neighbourDm)})`;
  }
  if (fire.neighbours > 0) return `Schrot: trifft bis zu ${fire.neighbours} ausgeloste Nachbarn des Ziels mit, ohne Abzug`;
  return `Einzelschuss: 1 Schuss, ein Wurf${fire.single ? `, DMs aus der Zeile des ${fire.single}` : ''}`;
}
