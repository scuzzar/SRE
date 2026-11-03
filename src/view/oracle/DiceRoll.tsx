import { useEffect } from 'react';
import type { DamageItem, DiceItem } from '../../controller';
import { DiceView, THROW_MS, useTimeline } from '../Dice';
import { haptic, stopHaptics } from '../haptics';

/**
 * Der Wurf mit 2W6 im Vordergrund, kurz nach dem Tippen auf „2W6“: Die Würfel fliegen, schlagen auf,
 * die Summe leuchtet, dann gibt der Wurf den Blick auf den Log frei. Im Log steht er schon; das hier
 * ist nur Anzeige. Ein Tippen überspringt. Ebenso der Schadenswurf nach einem Treffer, mit so vielen
 * W6, wie die Waffe macht; die Summe bleibt dort länger stehen.
 */
export function DiceRoll({ item, seed, onDone }: { item: DiceItem | DamageItem; seed: number; onDone: () => void }) {
  const damage = item.kind === 'damage';
  // Werfen, liegen (Summe zeigen), ausblenden.
  const [phase, skip] = useTimeline([THROW_MS, damage ? 2200 : 800, 200]);
  const total = damage ? item.damage : item.total;

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
      <span className="dice-roll-kicker">{damage ? `SCHADEN · ${item.weapon} · ${item.dice.length}W6` : '2W6'}</span>
      <DiceView dice={item.dice} seed={seed} landed={phase >= 1} />
      <div className={phase >= 1 ? 'dice-sum shown' : 'dice-sum'}>
        <strong>{total}</strong>
        <span>{item.dice.join(' + ')}</span>
      </div>
    </div>
  );
}
