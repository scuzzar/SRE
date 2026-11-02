import { describe, expect, it } from 'vitest';
import { discardWorld, DomainError, hexAt, hexFromRolls, nameWorld, stepOf, tradeCodesOf, uwpCode, validateHexes, type Hex } from '..';
import { fixedRandom } from '../testing';
import { rollOccurrence, rollWorld, type WorldRoll } from './world-roll';

/** Würfelt so oft, wie es Zahlen gibt: erst das Vorkommen, dann jeder Wurf mit seinen Würfeln. */
function rollAll(dice: number[], hexes: readonly Hex[] = [], column = 3, row = 4): { hexes: readonly Hex[]; rolls: WorldRoll[] } {
  const random = fixedRandom(...dice);
  const first = rollOccurrence(hexes, column, row, random);
  hexes = first.hexes;
  const rolls = [first.roll];
  while (random.calls < dice.length) {
    const next = rollWorld(hexes, column, row, random);
    hexes = next.hexes;
    rolls.push(next.roll);
  }
  return { hexes, rolls };
}

// Vorkommen 5; Raumhafen 8 → C (keine Marinebasis möglich); Scoutbasis 8 − 1 → ja; Gasriese 6 → ja;
// Größe 9 − 2 = 7; Atmosphäre 8 − 7 + 7 = 8; Temperatur 6 + 1 = 7, gemäßigt; Hydrographie 8 − 7 + 7 = 8; Bevölkerung 7 − 2 = 5;
// Regierung 6 − 7 + 5 = 4; Gesetz 8 − 7 + 4 = 5; TL 4 + 2 (C) + 1 (Bevölkerung 5) = 7.
const regina = [5, 4, 4, 4, 4, 3, 3, 4, 5, 4, 4, 3, 3, 4, 4, 3, 4, 3, 3, 4, 4, 4];

describe('Weltenerschaffung', () => {
  it('würfelt eine Welt nach der Checklist, speichert nur die Werte und gibt ihr zum Schluss einen Namen', () => {
    const result = rollAll(regina);
    let hexes = result.hexes;
    expect(result.rolls.map((r) => r.kind)).toEqual(['occurrence', 'starport', 'scoutBase', 'gasGiant', 'size', 'atmosphere', 'temperature', 'hydrographics', 'population', 'government', 'law', 'tech']);
    expect(result.rolls[0]).toMatchObject({ kind: 'occurrence', dice: [5], dm: 0, target: 4, success: true });
    expect(result.rolls.find((r) => r.kind === 'scoutBase')).toMatchObject({ dm: -1, parts: [{ label: 'Raumhafen C', dm: -1 }] });
    expect(result.rolls.find((r) => r.kind === 'tech')).toMatchObject({ dice: [4], dm: 3, value: 7 });
    const hex = hexAt(hexes, 3, 4)!;
    // Gespeichert sind die Werte, keine Würfe.
    expect(hex).toEqual({
      column: 3,
      row: 4,
      empty: false,
      navalBase: false,
      scoutBase: true,
      gasGiant: true,
      uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
      temperature: 'temperate',
    });
    expect(result.rolls.find((r) => r.kind === 'temperature')).toMatchObject({ dice: [3, 3], dm: 1, parts: [{ label: 'Atmosphäre 8', dm: 1 }], temperature: { id: 'temperate' } });
    expect(stepOf(hex)).toBe('name');
    expect(uwpCode(hex.uwp)).toBe('C788545-7');
    expect(tradeCodesOf(hex).map((t) => t.id)).toEqual(['Ag', 'Ni']);

    expect(() => nameWorld(hexes, 3, 4, '  ')).toThrow(/braucht einen Namen/);
    hexes = nameWorld(hexes, 3, 4, ' Regina ');
    expect(hexAt(hexes, 3, 4)?.name).toBe('Regina');
    expect(stepOf(hexAt(hexes, 3, 4)!)).toBe('done');
    expect(() => rollWorld(hexes, 3, 4, fixedRandom())).toThrow(/nichts mehr zu würfeln/);
  });

  it('lässt das Feld leer, wenn das Vorkommen unter 4 bleibt', () => {
    const { hexes, rolls } = rollAll([3]);
    expect(rolls[0]).toMatchObject({ success: false });
    expect(hexAt(hexes, 3, 4)).toEqual({ column: 3, row: 4, empty: true, uwp: {} });
    expect(() => rollWorld(hexes, 3, 4, fixedRandom())).toThrow(DomainError);
    expect(() => discardWorld(hexes, 3, 4)).toThrow(/nicht verwerfen/);
  });

  it('würfelt bei Größe 0 weder Atmosphäre noch Hydrographie: ein Asteroidengürtel', () => {
    // Raumhafen 2 → A; Marinebasis 2 → nein; Scoutbasis 12 − 3 → ja; Gasriese; Größe 2 − 2 = 0.
    const before = rollAll([6, 1, 1, 1, 1, 6, 6, 2, 2, 1, 1]);
    // Die Temperatur wird auch hier gewürfelt; die Hydrographie steht erst danach fest.
    expect(stepOf(hexAt(before.hexes, 3, 4)!)).toBe('temperature');
    expect(hexAt(before.hexes, 3, 4)!.uwp).toEqual({ starport: 10, size: 0, atmosphere: 0 });
    // Temperatur 6 + 6 ohne DM (Atmosphäre 0): kochend.
    const { hexes, rolls } = rollAll([6, 1, 1, 1, 1, 6, 6, 2, 2, 1, 1, 6, 6]);
    const hex = hexAt(hexes, 3, 4)!;
    expect(stepOf(hex)).toBe('population');
    expect(hex.temperature).toBe('boiling');
    expect(rolls.at(-1)).toMatchObject({ kind: 'temperature', dm: 0, parts: [] });
    expect(hex.uwp).toEqual({ starport: 10, size: 0, atmosphere: 0, hydrographics: 0 });
    expect(hex).toMatchObject({ navalBase: false, scoutBase: true });
    expect(rolls.some((r) => r.kind === 'atmosphere' || r.kind === 'hydrographics')).toBe(false);
  });

  it('würfelt die Marinebasis nur bei Raumhafen A oder B und die Scoutbasis nicht bei E oder X', () => {
    const { hexes } = rollAll([4, 6, 6]);
    const hex = hexAt(hexes, 3, 4)!;
    expect(stepOf(hex)).toBe('gasGiant');
    expect(hex).toMatchObject({ navalBase: false, scoutBase: false });
  });

  it('gibt der Hydrographie DM −4 bei dünner oder fremder Atmosphäre und begrenzt sie auf A', () => {
    // Raumhafen X ohne Basen; Größe 12 − 2 = A; Atmosphäre 2 − 7 + 10 = 5; Temperatur 6 − 1 = 5, gemäßigt;
    // Hydrographie 12 − 7 + 10 = 15 → A.
    expect(hexAt(rollAll([4, 6, 6, 6, 6, 6, 6, 1, 1, 3, 3, 6, 6]).hexes, 3, 4)!.uwp).toMatchObject({ size: 10, atmosphere: 5, hydrographics: 10 });
    // Atmosphäre 12 − 7 + 10 = F; Temperatur 2 + 2 = 4, kalt; Hydrographie 2 − 7 + 10 − 4 = 1.
    const { hexes, rolls } = rollAll([4, 6, 6, 6, 6, 6, 6, 6, 6, 1, 1, 1, 1]);
    expect(hexAt(hexes, 3, 4)!.uwp).toMatchObject({ atmosphere: 15, hydrographics: 1 });
    expect(rolls.at(-1)?.dm).toBe(-1);
  });

  it('würfelt die Temperatur mit dem DM der Atmosphäre und gibt heißen Welten weniger Wasser', () => {
    // Raumhafen X ohne Basen; Größe 12 − 2 = A; Atmosphäre 8 − 7 + 10 = B (DM +6); Temperatur 2 + 6 = 8, gemäßigt.
    const mild = rollAll([4, 6, 6, 6, 6, 6, 6, 4, 4, 1, 1]);
    expect(mild.rolls.at(-1)).toMatchObject({ kind: 'temperature', dm: 6, temperature: { id: 'temperate' } });
    // Temperatur 6 + 6 + 6 = 18, kochend; Hydrographie 6 − 7 + 10 − 4 − 6 = −1 → 0.
    const { hexes, rolls } = rollAll([4, 6, 6, 6, 6, 6, 6, 4, 4, 6, 6, 3, 3]);
    expect(hexAt(hexes, 3, 4)).toMatchObject({ temperature: 'boiling', uwp: { atmosphere: 11, hydrographics: 0 } });
    expect(rolls.at(-1)?.parts).toEqual([
      { label: '', dm: -7 },
      { label: 'Größe A', dm: 10 },
      { label: 'Atmosphäre B', dm: -4 },
      { label: 'Kochend', dm: -6 },
    ]);
    // Heiß: Größe 9 − 2 = 7; Atmosphäre 8 (DM +1); Temperatur 5 + 5 + 1 = 11; Hydrographie 8 − 7 + 7 − 2 = 6.
    const hot = rollAll([4, 6, 6, 6, 6, 4, 5, 4, 4, 5, 5, 4, 4]);
    expect(hexAt(hot.hexes, 3, 4)).toMatchObject({ temperature: 'hot', uwp: { size: 7, atmosphere: 8, hydrographics: 6 } });
    expect(hot.rolls.at(-1)?.dm).toBe(-2);
  });

  it('gibt bei Atmosphäre D keinen Wasser-DM für die Temperatur', () => {
    // Größe A; Atmosphäre 10 − 7 + 10 = D (DM +2); Temperatur 6 + 6 + 2 = 14, kochend; Hydrographie 4 − 7 + 10 − 4 = 3.
    const { hexes, rolls } = rollAll([4, 6, 6, 6, 6, 6, 6, 5, 5, 6, 6, 2, 2]);
    expect(hexAt(hexes, 3, 4)).toMatchObject({ temperature: 'boiling', uwp: { atmosphere: 13, hydrographics: 3 } });
    expect(rolls.at(-1)?.parts.map((p) => p.label)).toEqual(['', 'Größe A', 'Atmosphäre D']);
  });

  it('lässt eine fertige Welt ohne Temperatur sie nachwürfeln; das Wasser bleibt', () => {
    const old: Hex = { column: 3, row: 4, empty: false, name: 'Alt', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };
    expect(stepOf(old)).toBe('done');
    expect(() => validateHexes([old])).not.toThrow();
    const { hexes, roll } = rollWorld([old], 3, 4, fixedRandom(6, 6));
    expect(roll).toMatchObject({ kind: 'temperature', dm: 1, temperature: { id: 'boiling' } });
    expect(hexAt(hexes, 3, 4)).toEqual({ ...old, temperature: 'boiling' });
    expect(() => rollWorld(hexes, 3, 4, fixedRandom())).toThrow(/nichts mehr zu würfeln/);
  });

  it('verwirft eine Welt in Erschaffung: Das Feld ist wieder nicht erzeugt', () => {
    const { hexes } = rollAll([5, 4, 4], rollAll([3], [], 1, 1).hexes);
    expect(discardWorld(hexes, 3, 4).map((h) => [h.column, h.row])).toEqual([[1, 1]]);
  });

  it('kennt nur die Felder des Subsektors', () => {
    expect(() => rollOccurrence([], 9, 1, fixedRandom())).toThrow(/nicht im Subsektor/);
    expect(() => rollOccurrence([], 1, 11, fixedRandom())).toThrow(/nicht im Subsektor/);
  });

  it('würfelt das Vorkommen nur für ein nicht erzeugtes Feld, alles andere nur danach', () => {
    expect(() => rollWorld([], 1, 1, fixedRandom())).toThrow(/erst das Vorkommen/);
    expect(() => rollOccurrence(rollAll([5]).hexes, 3, 4, fixedRandom())).toThrow(/schon erzeugt/);
  });
});

describe('Hexfelder prüfen', () => {
  const base: Hex = { column: 1, row: 1, empty: false, navalBase: true, scoutBase: false, gasGiant: true, uwp: { starport: 10, size: 5 } };

  it('lässt gültige Hexfelder durch', () => {
    expect(() => validateHexes([base, { column: 2, row: 1, empty: true, uwp: {} }, hexAt(rollAll(regina).hexes, 3, 4)!])).not.toThrow();
  });

  it('weist Werte außer der Reihe, außerhalb ihres Bereichs oder gegen die Regeln zurück', () => {
    expect(() => validateHexes([{ ...base, gasGiant: undefined } as unknown as Hex])).toThrow(/Es fehlt gasGiant/);
    expect(() => validateHexes([{ ...base, uwp: { starport: 10, size: 11 } }])).toThrow(/Größe 11/);
    expect(() => validateHexes([{ ...base, uwp: { starport: 12 } }])).toThrow(/keine Marinebasis/);
    expect(() => validateHexes([{ ...base, uwp: { starport: 10, size: 0, atmosphere: 3 } }])).toThrow(/Größe 0 hat keine Atmosphäre/);
    expect(() => validateHexes([{ ...base, uwp: { starport: 10, size: 0 } }])).toThrow(/ohne Wurf feststeht/);
    expect(() => validateHexes([{ column: 1, row: 1, empty: true, uwp: { starport: 10 } }])).toThrow(/leeres Feld/);
    expect(() => validateHexes([base, base])).toThrow(/doppelt/);
    expect(() => validateHexes([{ ...base, temperature: 'hot' }])).toThrow(/Atmosphäre fehlt/);
    expect(() => validateHexes([{ ...base, uwp: { starport: 10, size: 5, atmosphere: 5 }, temperature: 'warm' } as unknown as Hex])).toThrow(/Temperatur gibt es nicht/);
    expect(() => validateHexes([{ ...base, uwp: { starport: 10, size: 1, atmosphere: 0 }, temperature: 'cold' }])).toThrow(/ohne Wurf feststeht/);
    expect(() => validateHexes([{ column: 1, row: 1, empty: true, uwp: {}, temperature: 'cold' }])).toThrow(/leeres Feld/);
    expect(() => validateHexes([{ ...base, column: 9 }])).toThrow(/nicht im Subsektor/);
  });

  it('übernimmt Hexfelder mit gespeicherten Würfen als Werte', () => {
    const rolls = [
      { kind: 'occurrence' as const, dice: [5], dm: 0, target: 4 },
      { kind: 'starport' as const, dice: [4, 4], dm: 0 },
      { kind: 'scoutBase' as const, dice: [4, 4], dm: -1 },
    ];
    expect(hexFromRolls({ column: 3, row: 4, rolls })).toEqual({ column: 3, row: 4, empty: false, navalBase: false, scoutBase: true, uwp: { starport: 12 } });
    expect(() => hexFromRolls({ column: 3, row: 4, rolls: rolls.slice(1) })).toThrow(/Vorkommen/);
    // Damals folgte auf die Atmosphäre gleich die Hydrographie, ohne Temperatur.
    const regina = [
      ...rolls,
      { kind: 'gasGiant' as const, dice: [3, 3], dm: 0 },
      { kind: 'size' as const, dice: [4, 5], dm: -2 },
      { kind: 'atmosphere' as const, dice: [4, 4], dm: 0 },
      { kind: 'hydrographics' as const, dice: [4, 4], dm: 0 },
      { kind: 'population' as const, dice: [4, 3], dm: -2 },
    ];
    expect(hexFromRolls({ column: 3, row: 4, rolls: regina })).toMatchObject({ uwp: { size: 7, atmosphere: 8, hydrographics: 8, population: 5 } });
    expect(hexFromRolls({ column: 3, row: 4, rolls: regina }).temperature).toBeUndefined();
    // Eine kleine Welt bekam die Hydrographie damals ohne Wurf.
    const small = [...regina.slice(0, 4), { kind: 'size' as const, dice: [1, 2], dm: -2 }, { kind: 'atmosphere' as const, dice: [4, 4], dm: -6 }, { kind: 'population' as const, dice: [4, 3], dm: -2 }];
    expect(hexFromRolls({ column: 3, row: 4, rolls: small }).uwp).toMatchObject({ size: 1, atmosphere: 2, hydrographics: 0, population: 5 });
    expect(() => hexFromRolls({ column: 3, row: 4, name: 'Zu früh', rolls })).toThrow(/fertig gewürfelte Welt/);
  });
});
