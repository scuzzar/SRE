import { describe, expect, it } from 'vitest';
import { skillOf } from './reference';
import { canGoUnskilled, chance2d6, characteristicDm, JACK_OF_ALL_TRADES, roll2d6, skillDm, sum } from './rules';
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

describe('Jack-of-all-Trades', () => {
  it('steht in der Liste der Fertigkeiten', () => {
    expect(skillOf(JACK_OF_ALL_TRADES).short).toBe('JoT');
  });

  it('gibt in der Probe ±0, egal welche Stufe; andere Fertigkeiten ihre Stufe', () => {
    expect(skillDm({ of: JACK_OF_ALL_TRADES, level: 3, retired: false })).toBe(0);
    expect(skillDm({ of: 'pilot', level: 2, retired: false })).toBe(2);
  });

  it('ersetzt „ohne Fertigkeit“, solange es nicht ausgeblendet ist', () => {
    expect(canGoUnskilled([{ of: 'pilot', level: 2, retired: false }])).toBe(true);
    expect(canGoUnskilled([{ of: JACK_OF_ALL_TRADES, level: 1, retired: false }])).toBe(false);
    expect(canGoUnskilled([{ of: JACK_OF_ALL_TRADES, level: 1, retired: true }])).toBe(true);
  });
});
