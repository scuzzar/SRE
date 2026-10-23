import { describe, expect, it } from 'vitest';
import { chance2d6, characteristicDm, roll2d6, sum } from './rules';
import { fixedRandom } from './testing';

describe('characteristicDm (Hausregeln: +1 ab 9, −1 bis 5)', () => {
  it.each([
    [0, -1],
    [5, -1],
    [6, 0],
    [8, 0],
    [9, 1],
    [15, 1],
  ])('Wert %i gibt DM %i', (value, dm) => {
    expect(characteristicDm(value)).toBe(dm);
  });
});

describe('chance2d6', () => {
  it('zählt exakt aus den 36 Kombinationen', () => {
    expect(chance2d6(7)).toBeCloseTo((21 / 36) * 100);
    expect(chance2d6(8)).toBeCloseTo((15 / 36) * 100);
    expect(chance2d6(12)).toBeCloseTo((1 / 36) * 100);
  });

  it('ist bis 2 sicher und über 12 unmöglich', () => {
    expect(chance2d6(-4)).toBe(100);
    expect(chance2d6(2)).toBe(100);
    expect(chance2d6(13)).toBe(0);
  });
});

describe('roll2d6', () => {
  it('würfelt zwei einzelne Würfel', () => {
    const dice = roll2d6(fixedRandom(4, 5));
    expect(dice).toEqual([4, 5]);
    expect(sum(dice)).toBe(9);
  });
});
