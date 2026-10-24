import { useEffect } from 'react';
import type { DiceItem } from '../../controller';
import { DicePairView, THROW_MS, useTimeline } from '../Dice';
import { haptic, stopHaptics } from '../haptics';

/**
 * Der Wurf mit 2W6 im Vordergrund, kurz nach dem Tippen auf „2W6“: Die Würfel fliegen, schlagen auf,
 * die Summe leuchtet, dann gibt der Wurf den Blick auf den Log frei. Im Log steht er schon; das hier
 * ist nur Anzeige. Ein Tippen überspringt.
 */
export function DiceRoll({ item, seed, onDone }: { item: DiceItem; seed: number; onDone: () => void }) {
  // Werfen, liegen (Summe zeigen), ausblenden.
  const [phase, skip] = useTimeline([THROW_MS, 800, 200]);

  useEffect(() => {
    if (phase === 3) onDone();
  }, [phase, onDone]);

  return (
    <div
      className={`dice-roll${phase >= 2 ? ' leaving' : ''}`}
      aria-hidden="true"
      onClick={() => {
        if (phase === 0) {
          stopHaptics();
          haptic('land');
        }
        skip(phase === 0 ? 1 : 2);
      }}
    >
      <span className="dice-roll-kicker">2W6</span>
      <DicePairView dice={item.dice} seed={seed} landed={phase >= 1} />
      <div className={phase >= 1 ? 'dice-sum shown' : 'dice-sum'}>
        <strong>{item.total}</strong>
        <span>
          {item.dice[0]} + {item.dice[1]}
        </span>
      </div>
    </div>
  );
}
