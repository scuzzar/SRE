import type { Screen } from '../controller';
import { useGame } from './game-context';

type Part = { readonly id: Screen; readonly name: string };

/** Die Teile des Bereichs Begegnung, in dieser Reihenfolge. */
export const encounterParts: readonly Part[] = [
  { id: 'encounter', name: 'Begegnung' },
  { id: 'combat', name: 'Kampf' },
];

/** Die Teile des Bereichs Charaktere, in dieser Reihenfolge. */
export const peopleParts: readonly Part[] = [
  { id: 'characters', name: 'SC' },
  { id: 'funds', name: 'Kasse' },
  { id: 'npcs', name: 'NSC' },
];

/**
 * Der Unterreiter oben in einem Bereich mit mehreren Teilen: im Bereich Begegnung Begegnung und Kampf, im
 * Bereich Charaktere SC, Kasse und NSC. Reine Darstellung; was ein Tipp bewirkt, entscheidet der
 * Controller (`showScreen`).
 */
export function SubTabs({ label, parts, screen }: { label: string; parts: readonly Part[]; screen: Screen }) {
  const game = useGame();
  return (
    <div className="sub-tabs" role="tablist" aria-label={label}>
      {parts.map((p) => (
        <button key={p.id} type="button" role="tab" aria-selected={screen === p.id} onClick={() => screen !== p.id && game.showScreen(p.id)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}
