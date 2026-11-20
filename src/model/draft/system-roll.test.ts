import { describe, expect, it } from 'vitest';
import { hexAt, hexFromFlat, mainWorld, stepOf, type Hex } from '..';
import { seededRandom } from '../testing';
import { rollOccurrence, rollSystemAt, runWorld } from './world-roll';

/** Eine fertig gewürfelte Welt mit Oberfläche, aber ohne Namen und Sternsystem. */
const regina: Hex = hexFromFlat({
  column: 2,
  row: 7,
  empty: false,
  navalBase: false,
  scoutBase: true,
  gasGiant: true,
  uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
  temperature: 'temperate',
  surface: { water: 80, plates: 8, majorContinents: 1, minorContinents: 4, majorIslands: 5, archipelagos: 7, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true },
});

describe('Sternsystem in der Weltenerschaffung (2026-11-20)', () => {
  it('ist ein eigener Schritt nach der Oberfläche und vor dem Namen', () => {
    expect(stepOf(regina)).toBe('system');
    const hexes = rollSystemAt([regina], 2, 7, seededRandom(1));
    expect(stepOf(hexAt(hexes, 2, 7)!)).toBe('name');
    expect(hexAt(hexes, 2, 7)!.system).toBeDefined();
    expect(() => rollSystemAt(hexes, 2, 7, seededRandom(1))).toThrow(/nicht dran/);
  });

  it('würfelt beim Durchlaufen bis zum Namen auch das Sternsystem', () => {
    let worlds = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const random = seededRandom(seed);
      const { hexes } = runWorld(rollOccurrence([], 2, 7, random).hexes, 2, 7, random);
      const hex = hexAt(hexes, 2, 7)!;
      if (hex.empty) continue;
      worlds++;
      expect(stepOf(hex)).toBe('name');
      expect(mainWorld(hex).orbit ?? mainWorld(hex).moonOf).toBeDefined();
    }
    expect(worlds).toBeGreaterThan(5);
  });
});
