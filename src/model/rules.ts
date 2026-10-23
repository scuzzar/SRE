import type { Upp } from './campaign';
import type { Random } from './ports';
import { ref, type HouseRules } from './reference';

/** Die sechs Attribute in der Reihenfolge der UPP. */
export const characteristics = ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC'] as const;
export type Characteristic = (typeof characteristics)[number];

const uppKey = { STR: 'str', DEX: 'dex', END: 'end', INT: 'int', EDU: 'edu', SOC: 'soc' } as const;

export function valueOf(upp: Upp, characteristic: Characteristic): number {
  return upp[uppKey[characteristic]];
}

/** DM eines gewählten Attributs, allein aus dem Wert: +1 ab `bonusFrom`, −1 bis `malusUpTo`, sonst ±0. */
export function characteristicDm(value: number, rules: HouseRules = ref.houseRules): -1 | 0 | 1 {
  if (value >= rules.bonusFrom) return 1;
  if (value <= rules.malusUpTo) return -1;
  return 0;
}

/** Wahrscheinlichkeit in Prozent, mit 2W6 mindestens `need` zu werfen, exakt aus den 36 Kombinationen. */
export function chance2d6(need: number): number {
  let hits = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= need) hits++;
  return (hits / 36) * 100;
}

/** Zwei Würfel. Gespeichert werden die einzelnen Würfel, nicht nur die Summe. */
export type Dice = readonly [number, number];

export function roll2d6(random: Random): Dice {
  return [random.int(1, 6), random.int(1, 6)];
}

export function sum(dice: Dice): number {
  return dice[0] + dice[1];
}
