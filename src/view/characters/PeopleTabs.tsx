import type { Screen } from '../../controller';
import { useGame } from '../game-context';

/** Die drei Teile des Reiters Charaktere, in dieser Reihenfolge. */
export const peopleScreens: readonly { readonly id: Screen; readonly name: string }[] = [
  { id: 'characters', name: 'SC' },
  { id: 'npcs', name: 'NSC' },
  { id: 'funds', name: 'Kasse' },
];

/**
 * Der Umschalter oben im Reiter Charaktere: SC, NSC und Kasse. Reine Darstellung; was ein Tipp
 * bewirkt, entscheidet der Controller (`showScreen`).
 */
export function PeopleTabs({ screen }: { screen: Screen }) {
  const game = useGame();
  return (
    <div className="people-tabs" role="tablist" aria-label="Charaktere">
      {peopleScreens.map((p) => (
        <button key={p.id} type="button" role="tab" aria-selected={screen === p.id} onClick={() => screen !== p.id && game.showScreen(p.id)}>
          {p.name}
        </button>
      ))}
    </div>
  );
}
