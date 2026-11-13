import type { Random } from './ports';

/**
 * Der Test, ob es überhaupt zu einer Begegnung kommt (Encounter Checklist, SE Charts S. 20):
 * Zufallsbegegnung täglich 5+ auf 1W6, Patron wöchentlich 5+ auf 1W6, Gerücht wöchentlich 7+ auf 2W6,
 * Tiere zweimal täglich (beim Reisen und beim Rasten) 5+ auf 1W6 (SR 47).
 */
export const encounterChecks = {
  random: { dice: 1, target: 5, period: 'täglich' },
  patron: { dice: 1, target: 5, period: 'wöchentlich' },
  rumor: { dice: 2, target: 7, period: 'wöchentlich' },
  animal: { dice: 1, target: 5, period: 'zweimal täglich' },
} as const;
export type EncounterCheckKind = keyof typeof encounterChecks;

/** Ein gewürfelter Test: die Würfel, ihre Summe, der Zielwert und ob er bestanden ist. Er wird nicht gespeichert. */
export interface EncounterCheck {
  readonly dice: readonly number[];
  readonly total: number;
  readonly target: number;
  readonly passed: boolean;
}

export function rollEncounterCheck(kind: EncounterCheckKind, random: Random): EncounterCheck {
  const { dice: count, target } = encounterChecks[kind];
  const dice = Array.from({ length: count }, () => random.int(1, 6));
  const total = dice.reduce((sum, die) => sum + die, 0);
  return { dice, total, target, passed: total >= target };
}

/** Die Liste des Patrons, zufällig (Hausregel; die Regeln lassen die Spielleitung wählen): 1W6, 1–3 Liste eins, 4–6 Liste zwei. */
export function rollPatronList(random: Random): 1 | 2 {
  return random.int(1, 6) <= 3 ? 1 : 2;
}
