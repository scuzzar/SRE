import { describe, expect, it } from 'vitest';
import { DomainError } from './errors';
import { discardWorld, hexAt, nameWorld, replayHex, rollOccurrence, rollWorld, tradeCodesOf, uwpCode, validateHexes, type Hex } from './sector';
import { fixedRandom } from './testing';

/** Würfelt so oft, wie es Zahlen gibt; jeder Wurf nimmt sich seine Würfel der Reihe nach. */
function rollAll(dice: number[], hexes: readonly Hex[] = [], column = 3, row = 4): readonly Hex[] {
  const random = fixedRandom(...dice);
  hexes = rollOccurrence(hexes, column, row, random);
  while (random.calls < dice.length) hexes = rollWorld(hexes, column, row, random);
  return hexes;
}

// Vorkommen 5; Raumhafen 8 → C (keine Marinebasis möglich); Scoutbasis 8 − 1 → ja; Gasriese 6 → ja;
// Größe 9 − 2 = 7; Atmosphäre 8 − 7 + 7 = 8; Hydrographie 8 − 7 + 7 = 8; Bevölkerung 7 − 2 = 5;
// Regierung 6 − 7 + 5 = 4; Gesetz 8 − 7 + 4 = 5; TL 4 + 2 (C) + 1 (Bevölkerung 5) = 7.
const regina = [5, 4, 4, 4, 4, 3, 3, 4, 5, 4, 4, 4, 4, 3, 4, 3, 3, 4, 4, 4];

describe('Weltenerschaffung', () => {
  it('würfelt eine Welt nach der Checklist und gibt ihr zum Schluss einen Namen', () => {
    let hexes = rollAll(regina);
    const hex = hexAt(hexes, 3, 4)!;
    expect(hex.rolls.map((r) => r.kind)).toEqual(['occurrence', 'starport', 'scoutBase', 'gasGiant', 'size', 'atmosphere', 'hydrographics', 'population', 'government', 'law', 'tech']);
    expect(hex.rolls[0]).toEqual({ kind: 'occurrence', dice: [5], dm: 0, target: 4 });
    expect(hex.rolls.find((r) => r.kind === 'scoutBase')?.dm).toBe(-1);
    expect(hex.rolls.find((r) => r.kind === 'tech')).toEqual({ kind: 'tech', dice: [4], dm: 3 });
    const state = replayHex(hex);
    expect(state.step).toBe('name');
    expect(uwpCode(state)).toBe('C788545-7');
    expect(state).toMatchObject({ navalBase: false, scoutBase: true, gasGiant: true, empty: false });
    expect(tradeCodesOf(state).map((t) => t.id)).toEqual(['Ag', 'Ni']);

    expect(() => nameWorld(hexes, 3, 4, '  ')).toThrow(/braucht einen Namen/);
    hexes = nameWorld(hexes, 3, 4, ' Regina ');
    expect(hexAt(hexes, 3, 4)?.name).toBe('Regina');
    expect(replayHex(hexAt(hexes, 3, 4)!).step).toBe('done');
    expect(() => rollWorld(hexes, 3, 4, fixedRandom())).toThrow(/nichts mehr zu würfeln/);
  });

  it('lässt das Feld leer, wenn das Vorkommen unter 4 bleibt', () => {
    const hexes = rollAll([3]);
    const state = replayHex(hexAt(hexes, 3, 4)!);
    expect(state).toMatchObject({ step: 'done', empty: true });
    expect(() => rollWorld(hexes, 3, 4, fixedRandom())).toThrow(DomainError);
    expect(() => discardWorld(hexes, 3, 4)).toThrow(/nicht verwerfen/);
  });

  it('würfelt bei Größe 0 weder Atmosphäre noch Hydrographie: ein Asteroidengürtel', () => {
    // Raumhafen 2 → A; Marinebasis 2 → nein; Scoutbasis 12 − 3 → ja; Gasriese; Größe 2 − 2 = 0.
    const hexes = rollAll([6, 1, 1, 1, 1, 6, 6, 2, 2, 1, 1]);
    const state = replayHex(hexAt(hexes, 3, 4)!);
    expect(state.step).toBe('population');
    expect(state.uwp).toMatchObject({ starport: 10, size: 0, atmosphere: 0, hydrographics: 0 });
    expect(state).toMatchObject({ navalBase: false, scoutBase: true });
    expect(hexAt(hexes, 3, 4)!.rolls.some((r) => r.kind === 'atmosphere' || r.kind === 'hydrographics')).toBe(false);
  });

  it('würfelt die Marinebasis nur bei Raumhafen A oder B und die Scoutbasis nicht bei E oder X', () => {
    // Raumhafen 12 → X: keine Basis, weiter mit dem Gasriesen.
    const hexes = rollAll([4, 6, 6]);
    expect(replayHex(hexAt(hexes, 3, 4)!)).toMatchObject({ step: 'gasGiant', navalBase: false, scoutBase: false });
  });

  it('gibt der Hydrographie DM −4 bei dünner oder fremder Atmosphäre und begrenzt sie auf A', () => {
    // Raumhafen X ohne Basen; Größe 12 − 2 = A; Atmosphäre 2 − 7 + 10 = 5; Hydrographie 12 − 7 + 10 = 15 → A.
    let hexes = rollAll([4, 6, 6, 6, 6, 6, 6, 1, 1, 6, 6]);
    let state = replayHex(hexAt(hexes, 3, 4)!);
    expect(state.uwp).toMatchObject({ size: 10, atmosphere: 5, hydrographics: 10 });
    // Atmosphäre 12 − 7 + 10 = F: Hydrographie 2 − 7 + 10 − 4 = 1.
    hexes = rollAll([4, 6, 6, 6, 6, 6, 6, 6, 6, 1, 1], [], 1, 1);
    state = replayHex(hexAt(hexes, 1, 1)!);
    expect(state.uwp).toMatchObject({ atmosphere: 15, hydrographics: 1 });
    expect(hexAt(hexes, 1, 1)!.rolls.at(-1)?.dm).toBe(-1);
  });

  it('verwirft eine Welt in Erschaffung: Das Feld ist wieder nicht erzeugt', () => {
    const hexes = rollAll([5, 4, 4], rollAll([3], [], 1, 1));
    expect(discardWorld(hexes, 3, 4).map((h) => [h.column, h.row])).toEqual([[1, 1]]);
  });

  it('kennt nur die Felder des Subsektors', () => {
    expect(() => rollOccurrence([], 9, 1, fixedRandom())).toThrow(/nicht im Subsektor/);
    expect(() => rollOccurrence([], 1, 11, fixedRandom())).toThrow(/nicht im Subsektor/);
  });

  it('würfelt das Vorkommen nur für ein nicht erzeugtes Feld, alles andere nur danach', () => {
    expect(() => rollWorld([], 1, 1, fixedRandom())).toThrow(/erst das Vorkommen/);
    expect(() => rollOccurrence(rollAll([5]), 3, 4, fixedRandom())).toThrow(/schon erzeugt/);
  });

  it('prüft beim Nachspielen Reihenfolge, Würfel und Namen', () => {
    expect(() => replayHex({ rolls: [{ kind: 'tech', dice: [3], dm: 0 }] })).toThrow(/passt nicht zum Schritt/);
    expect(() => replayHex({ rolls: [{ kind: 'occurrence', dice: [3, 3], dm: 0, target: 4 }] })).toThrow(/einen Würfel/);
    expect(() => replayHex({ name: 'Zu früh', rolls: [{ kind: 'occurrence', dice: [5], dm: 0, target: 4 }] })).toThrow(/fertig gewürfelte Welt/);
    const hexes = rollAll([3]);
    expect(() => validateHexes([...hexes, ...hexes])).toThrow(/doppelt/);
    expect(() => validateHexes([{ column: 1, row: 1, rolls: [] }])).toThrow(/keinen Wurf/);
  });
});
