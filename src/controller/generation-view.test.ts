import { describe, expect, it } from 'vitest';
import { addShip, chooseShipGain, createCampaign, enlist, muster, reenlist, rollNext, rollSkill, serviceOf, type Generation } from '../model';
import { fixedRandom } from '../model/testing';
import { careerLines, commissionTitle, generationView } from './generation-view';

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

/** Der Belterer gibt auf Tabelle 1 in Reihe 6 den Seeker (Supplement 4 S. 6 und 14). */
function belterMitSeeker(): Generation {
  let g = enlist(kira(), 'belter', fixedRandom(6, 6)); // Musterung 8+ mit +3
  g = rollNext(g, fixedRandom(6, 6)); // Überleben 9+ mit +1 aus dem ersten Term
  g = rollSkill(g, 'belter.personal', fixedRandom(3)); // +1 END
  g = rollSkill(g, 'belter.service', fixedRandom(3)); // Prospecting
  g = reenlist(g, false, fixedRandom(4, 4)); // Weiterverpflichtung 7+ gelingt, aber keine 12: mustert ab
  return muster(g, 'benefit', fixedRandom(6)); // Reihe 6: Seeker
}

describe('der Ship-Vorteil im Lebenslauf', () => {
  it('nennt den Entwurf, auch solange die Wahl offen ist', () => {
    const line = careerLines(belterMitSeeker().career).find((l) => l.kind === 'benefit')!;
    expect(line.result).toBe('Seeker');
  });

  it('nennt die Wahl der Kampagne: genommen oder ausgeschlagen', () => {
    // Die Frage stellt sich nur, wenn die Kampagne schon ein Schiff hat.
    const withTrader = addShip(createCampaign(), 'A', undefined).campaign;
    const taken = chooseShipGain({ ...withTrader, generation: belterMitSeeker() }, 'switch');
    expect(careerLines(taken.generation!.career).find((l) => l.kind === 'benefit')!.result).toBe('Seeker genommen');
    const kept = chooseShipGain({ ...withTrader, generation: belterMitSeeker() }, 'keep');
    expect(careerLines(kept.generation!.career).find((l) => l.kind === 'benefit')!.result).toBe('Seeker ausgeschlagen');
  });
});

describe('die Weiterverpflichtung in der Oberfläche', () => {
  it('lässt den Barbaren abmustern wie jeden anderen, nur ohne Bezüge (2026-11-24e)', () => {
    let g = enlist(kira(), 'barbarian', fixedRandom(3, 3)); // Musterung 5+
    g = rollNext(g, fixedRandom(6, 6)); // Überleben 6+
    g = rollNext(g, fixedRandom(1, 1)); // Rangwurf 6+ misslingt
    g = rollSkill(g, 'barbarian.personal', fixedRandom(1));
    g = rollSkill(g, 'barbarian.personal', fixedRandom(2));
    const view = generationView(g, [], undefined);
    expect(view.action).toEqual(expect.objectContaining({ kind: 'reenlist', last: false, freeExit: true }));
    expect(view.prompt).toMatch(/keine Ruhestandsbezüge/);
  });

  it('sagt dem Bürokraten vor dem Ruhestand, dass nur der gelungene Wurf ihn gehen lässt', () => {
    let g = enlist(kira(), 'bureaucrat', fixedRandom(2, 2));
    g = rollNext(g, fixedRandom(6, 6));
    g = rollNext(g, fixedRandom(1, 1));
    g = rollSkill(g, 'bureaucrat.personal', fixedRandom(1));
    g = rollSkill(g, 'bureaucrat.personal', fixedRandom(2));
    const view = generationView(g, [], undefined);
    expect(view.action).toEqual(expect.objectContaining({ kind: 'reenlist', freeExit: false }));
    expect(view.prompt).toMatch(/nur der gelungene Wurf/);
  });
});
