import type { SkillLevel, Upp } from './campaign';
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

/** Jack-of-all-Trades zählt in jeder Probe als Stufe 0 und ersetzt „ohne Fertigkeit“. */
export const JACK_OF_ALL_TRADES = 'jack-of-all-trades';

/** DM einer Fertigkeitsstufe in der Probe: ihre Stufe, bei Jack-of-all-Trades immer ±0. */
export function skillDm(skill: SkillLevel): number {
  return skill.of === JACK_OF_ALL_TRADES ? 0 : skill.level;
}

/** Ob „ohne Fertigkeit“ geht: nur ohne Jack-of-all-Trades unter den eingeblendeten Fertigkeiten. */
export function canGoUnskilled(skills: readonly SkillLevel[]): boolean {
  return !skills.some((s) => s.of === JACK_OF_ALL_TRADES && !s.retired);
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
