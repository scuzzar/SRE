import { describe, expect, it } from 'vitest';
import { enlist, rollNext, serviceOf, type Generation } from '../model';
import { fixedRandom } from '../model/testing';
import { careerLines, commissionTitle } from './generation-view';

/**
 * Der Rangwurf heißt nach der Laufbahn (Kennzeichen 2026-11-24b): der Bürokrat steigt in den
 * gehobenen Dienst, nicht in ein Offizierspatent.
 */

/** Ein Lebenslauf ohne Welten, wie es sie vor den Welten gab: nach den Attributen kommt die Laufbahn. */
function kira(): Generation {
  let g: Generation = { career: { rolls: [] } };
  // UPP 7A8975 wie Kira: STR 7, DEX 10, END 8, INT 9, EDU 7, SOC 5.
  for (const [a, b] of [[3, 4], [5, 5], [4, 4], [4, 5], [3, 4], [2, 3]] as [number, number][]) g = rollNext(g, fixedRandom(a, b));
  return g;
}

describe('der Name des Rangwurfs', () => {
  it('steht in der Laufbahn, sonst „Offizierspatent“', () => {
    expect(commissionTitle(serviceOf('bureaucrat'))).toBe('Gehobener Dienst');
    // Navy und Marines sind militarisch, die Merchants führen Schiffsoffiziere – es passt.
    expect(commissionTitle(serviceOf('navy'))).toBe('Offizierspatent');
    expect(commissionTitle(serviceOf('merchants'))).toBe('Offizierspatent');
    expect(commissionTitle(undefined)).toBe('Offizierspatent');
  });

  it('steht in der Zeile des Lebenslaufs beim Bürokraten', () => {
    let g = enlist(kira(), 'bureaucrat', fixedRandom(2, 2)); // Musterung 5+ mit +2
    g = rollNext(g, fixedRandom(6, 6)); // Überleben 4+
    g = rollNext(g, fixedRandom(1, 1)); // Rangwurf misslingt
    const line = careerLines(g.career).find((l) => l.kind === 'commission')!;
    expect(line.label).toBe('Gehobener Dienst');
    expect(line.result).toBe('kein Gehobener Dienst');
  });

  it('heißt beim Piraten Offizierspatent', () => {
    let g = enlist(kira(), 'pirate', fixedRandom(3, 4)); // Musterung 7+ mit +1
    g = rollNext(g, fixedRandom(6, 6)); // Überleben 5+
    g = rollNext(g, fixedRandom(1, 1)); // Rangwurf 9+ misslingt
    const line = careerLines(g.career).find((l) => l.kind === 'commission')!;
    expect(line.label).toBe('Offizierspatent');
    expect(line.result).toBe('kein Offizierspatent');
  });
});
