import { describe, expect, it } from 'vitest';
import type { Random } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { confirmCard, drawCard, toggleOdds } from './card';

const clock = fixedClock();

// Handlungsfäden (2026-11-18, siehe modell/mission.md, *Missionen*): Bei einem Fadenfokus lost die Karte
// eine offene Mission aus.
describe('Handlungsfaden auf der Karte', () => {
  /** Alle Würfe vor dem Orakelwurf liefern ihr Minimum, danach die angegebenen Zahlen (Orakel, Fokus, Faden). */
  function afterOracle(...tail: number[]): Random {
    const plain = fixedRandom();
    drawCard(plain);
    const before = plain.calls - 1;
    let calls = 0;
    return { int: (min) => (++calls <= before ? min : (tail[calls - before - 1] ?? min)) };
  }

  it('lost bei einem Fadenfokus eine offene Mission aus und hält sie beim Bestätigen fest', () => {
    const card = drawCard(afterOracle(11, 52, 1), 'Unbemerkt?', ['m1', 'm2']);
    expect(card.eventFocus).toBe(52);
    expect(card.thread).toBe('m2');
    expect(confirmCard(toggleOdds(card, 'medium'), clock).thread).toBe('m2');
  });

  it('lost nichts aus ohne offene Mission oder bei einem anderen Fokus', () => {
    expect(drawCard(afterOracle(11, 52), undefined, []).thread).toBeUndefined();
    expect(drawCard(afterOracle(11, 30), undefined, ['m1']).thread).toBeUndefined();
  });
});
