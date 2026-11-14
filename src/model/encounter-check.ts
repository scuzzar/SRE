import type { Campaign } from './campaign';
import { DomainError } from './errors';
import { reactionOf, veteranDm } from './encounter';
import type { CheckKind, CheckRoll } from './log';
import type { Clock, Random } from './ports';
import { locationOf } from './shop';
import { dayOf, weekStart } from './time';

/**
 * Der Test, ob es überhaupt zu einer Begegnung kommt (Encounter Checklist, SE Charts S. 20):
 * Zufallsbegegnung täglich 5+ auf 1W6, Patron wöchentlich 5+ auf 1W6, Gerücht wöchentlich 7+ auf 2W6,
 * Tiere zweimal täglich (beim Reisen und beim Rasten) 5+ auf 1W6 (SR 47). Die Polizei einmal je
 * Woche (Wunsch des Owners; die SE sagt täglich): 2W6, gleich oder über der Gesetzesstufe heißt Ruhe.
 * `times` ist, wie oft die Regel den Test in ihrem Zeitraum (`per`) verlangt.
 */
export const encounterChecks = {
  random: { dice: 1, target: 5, period: 'täglich', per: 'day', times: 1 },
  patron: { dice: 1, target: 5, period: 'wöchentlich', per: 'week', times: 1 },
  rumor: { dice: 2, target: 7, period: 'wöchentlich', per: 'week', times: 1 },
  animal: { dice: 1, target: 5, period: 'zweimal täglich', per: 'day', times: 2 },
  legal: { dice: 2, target: 0, period: 'wöchentlich', per: 'week', times: 1 },
} as const satisfies Record<CheckKind, { dice: 1 | 2; target: number; period: string; per: 'day' | 'week'; times: number }>;
export type EncounterCheckKind = CheckKind;

/** Ein gewürfelter Test: die Würfel, ihre Summe, der Zielwert und ob er bestanden ist. */
export interface EncounterCheck {
  readonly dice: readonly number[];
  readonly total: number;
  readonly target: number;
  readonly passed: boolean;
}

/** `/passed`: Summe ≥ Zielwert; bei der Polizei heißt das Ruhe. */
export function checkOf(entry: CheckRoll): EncounterCheck {
  const total = entry.dice.reduce((s, d) => s + d, 0);
  return { dice: entry.dice, total, target: entry.target, passed: total >= entry.target };
}

/** `/reaction` des Polizisten, wenn die Gruppe den Test nicht schaffte. */
export function legalReaction(entry: CheckRoll): number | undefined {
  return entry.reactionDice === undefined ? undefined : reactionOf(entry.reactionDice, entry.reactionDm ?? 0);
}

/** Die Gesetzesstufe des Aufenthaltsorts; ohne Aufenthaltsort keine. */
export function lawHere(campaign: Campaign): number | undefined {
  return locationOf(campaign)?.uwp.law;
}

/** Ob es auf dem Aufenthaltsort eine Polizei-Begegnung geben kann: mit Aufenthaltsort und Gesetz 1 oder mehr. */
export function hasPolice(campaign: Campaign): boolean {
  return (lawHere(campaign) ?? 0) >= 1;
}

/**
 * Würfelt den Test einer Art als Logeintrag, am heutigen Tag. Bei der Polizei ist der Zielwert die
 * Gesetzesstufe; schafft die Gruppe ihn nicht, würfelt die App gleich die Reaktion des Polizisten.
 */
export function rollCheck(campaign: Campaign, kind: CheckKind, random: Random, clock: Clock): CheckRoll {
  const rule = encounterChecks[kind];
  let target: number = rule.target;
  if (kind === 'legal') {
    const law = lawHere(campaign);
    if (law === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst den Aufenthaltsort wählen.');
    if (law < 1) throw new DomainError('Bei Gesetz 0 gibt es keine Polizei-Begegnung.');
    target = law;
  }
  const dice = Array.from({ length: rule.dice }, () => random.int(1, 6));
  const entry: CheckRoll = { kind: 'check', at: clock.now(), day: dayOf(campaign), check: kind, dice, target };
  if (kind !== 'legal' || checkOf(entry).passed) return entry;
  const world = locationOf(campaign);
  const reactionDm = ((world?.uwp.population ?? 0) >= 9 ? -1 : 0) + veteranDm(campaign);
  return { ...entry, reactionDice: [random.int(1, 6), random.int(1, 6)], reactionDm };
}

/** Der erste Tag des Zeitraums, in dem ein Test zählt: heute bzw. diese Woche. */
function periodStart(campaign: Campaign, kind: CheckKind): number {
  const today = dayOf(campaign);
  return encounterChecks[kind].per === 'day' ? today : weekStart(today);
}

/** Wie oft der Test dieser Art in seinem Zeitraum schon gewürfelt ist. */
export function checksDone(campaign: Campaign, kind: CheckKind): number {
  const from = periodStart(campaign, kind);
  const today = dayOf(campaign);
  return campaign.log.filter((e) => e.kind === 'check' && e.check === kind && e.day !== undefined && e.day >= from && e.day <= today).length;
}

/** Ob die Regel für diesen Zeitraum schon erfüllt ist; dann würfelt der Knopf nur auf langes Drücken. */
export function checksMet(campaign: Campaign, kind: CheckKind): boolean {
  return checksDone(campaign, kind) >= encounterChecks[kind].times;
}

/** „heute 1×“ bzw. „diese Woche 1×“. */
export function checksLabel(campaign: Campaign, kind: CheckKind): string {
  return `${encounterChecks[kind].per === 'day' ? 'heute' : 'diese Woche'} ${checksDone(campaign, kind)}×`;
}

/** Ob das Gelände der Kampagne Tiere hat (dann gehören die Tiere zu den täglichen Tests). */
function hasAnimals(campaign: Campaign, animals: boolean): boolean {
  return animals && campaign.terrain !== undefined;
}

/** Wie oft der Test dieser Art in der laufenden Woche gewürfelt ist, egal ob er täglich oder wöchentlich gilt. */
export function checksThisWeek(campaign: Campaign, kind: CheckKind): number {
  const today = dayOf(campaign);
  const from = weekStart(today);
  return campaign.log.filter((e) => e.kind === 'check' && e.check === kind && e.day !== undefined && e.day >= from && e.day <= today).length;
}

/**
 * Die Tests, an die die Zeit erinnert, ehe sie weiterläuft (Wunsch des Owners): Tage vergehen lassen
 * erinnert nie; Woche beenden erinnert an Patron, Gerücht und Polizei, die diese Woche fehlen, und an
 * Zufallsbegegnung und Tiere, wenn sie diese Woche gar nicht getestet sind. Ohne Aufenthaltsort gibt
 * es keine Begegnungen und also nichts zu erinnern.
 */
export function missingChecks(campaign: Campaign, week: boolean, animals: boolean): readonly CheckKind[] {
  if (!week || campaign.location === undefined) return [];
  const kinds: CheckKind[] = ['random'];
  if (hasAnimals(campaign, animals)) kinds.push('animal');
  kinds.push('patron', 'rumor', ...(hasPolice(campaign) ? (['legal'] as const) : []));
  return kinds.filter((k) => checksThisWeek(campaign, k) === 0);
}

/** Die Namen der Tests, wie Knopf und Erinnerung sie nennen. */
export const checkNames: Record<CheckKind, string> = {
  random: 'Zufallsbegegnung',
  animal: 'Tiere',
  patron: 'Patron',
  rumor: 'Gerücht',
  legal: 'Polizei',
};

/** Die Liste des Patrons, zufällig (Hausregel; die Regeln lassen die Spielleitung wählen): 1W6, 1–3 Liste eins, 4–6 Liste zwei. */
export function rollPatronList(random: Random): 1 | 2 {
  return random.int(1, 6) <= 3 ? 1 : 2;
}
