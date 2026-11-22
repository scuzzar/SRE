import { keepFocus, type Campaign } from './campaign';
import { DomainError } from './errors';
import type { Journey, SystemJourney } from './log';
import { worldPlace } from './place';
import type { Clock } from './ports';
import { shipArrives } from './landing';
import { journeyDays } from './system-journey';
import { lotteryPaid, potOf, survived, winnerOf } from './travel';
import { passTime } from './time';
import { arrive } from './upkeep';

// Unterwegs: die Reise Tag für Tag (Domänenmodell 2026-11-22c).

/**
 * Eine Reise unterwegs (Domänenmodell: `Voyage`): `entry` ist die Stelle ihres Logeintrags (im
 * Domänenmodell die Verweise `jump` bzw. `inSystem`), `days` die schon vergangenen Reisetage.
 */
export interface Voyage {
  readonly entry: number;
  readonly days: number;
}

/** Der Logeintrag der Reise unterwegs. */
export function voyageEntry(campaign: Campaign, voyage: Voyage = activeVoyage(campaign)): Journey | SystemJourney {
  const entry = campaign.log[voyage.entry];
  if (entry?.kind !== 'journey' && entry?.kind !== 'systemJourney') throw new DomainError('Die Reise unterwegs verweist auf keine Reise.');
  return entry;
}

/** Die laufende Reise; ohne sagt die Regel, dass keine läuft. */
export function activeVoyage(campaign: Campaign): Voyage {
  if (campaign.voyage === undefined) throw new DomainError('Die Gruppe ist nicht unterwegs.');
  return campaign.voyage;
}

/** Wie viele Tage die Reise dauert: 7 bei einem Sprung, `/days` bei einer Reise im System. */
export function voyageDuration(entry: Journey | SystemJourney): number {
  return entry.kind === 'journey' ? entry.days : journeyDays(entry.hours);
}

/** `/left`: die Reisetage, die noch fehlen. */
export function voyageDaysLeft(campaign: Campaign): number {
  const voyage = activeVoyage(campaign);
  return voyageDuration(voyageEntry(campaign, voyage)) - voyage.days;
}

/** Die Reise beginnt (2026-11-22c): Die Gruppe ist an keinem Ort, bis sie ankommt; der Tag bleibt. */
export function startVoyage(campaign: Campaign, entry: number): Campaign {
  if (campaign.voyage !== undefined) throw new DomainError('Die Gruppe ist schon unterwegs.');
  const { location: _l, ...rest } = campaign;
  void _l;
  return { ...rest, voyage: { entry, days: 0 } };
}

/** Warum gerade kein Reisetag vergehen kann; `undefined`, wenn er kann. */
export function voyageDayBlocker(campaign: Campaign): string | undefined {
  if (campaign.voyage === undefined) return 'Die Gruppe ist nicht unterwegs.';
  if (campaign.encounters.some((e) => !e.ended)) return 'Während einer laufenden Begegnung vergeht keine Zeit.';
  return undefined;
}

/**
 * „Weiterreisen“ (2026-11-22c): Ein Tag vergeht wie mit „1 Tag vergehen“, die Reise zählt ihn. Ist ihre
 * Dauer erreicht, kommt die Gruppe an (`arrived`).
 */
export function voyageDay(campaign: Campaign, clock: Clock): { readonly campaign: Campaign; readonly arrived: boolean } {
  const blocker = voyageDayBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const voyage = activeVoyage(campaign);
  const passed = passTime(campaign, { days: 1 }, clock, true);
  const next = { ...voyage, days: voyage.days + 1 };
  if (next.days < voyageDuration(voyageEntry(campaign, voyage))) return { campaign: { ...passed, voyage: next }, arrived: false };
  return { campaign: arriveVoyage(passed, next, clock), arrived: true };
}

/**
 * Die Ankunft: Die Gruppe ist auf der Zielwelt (ohne Feld, also Landeplatz), das eigene Schiff kommt
 * dort an. Erst jetzt wirkt der Kälteschlaf: Wer nicht aufwacht, ist tot, und die Lotterie zahlt aus.
 */
function arriveVoyage(campaign: Campaign, voyage: Voyage, clock: Clock): Campaign {
  const entry = voyageEntry(campaign, voyage);
  const { voyage: _v, ...rest } = campaign;
  void _v;
  let after: Campaign = { ...rest, location: worldPlace(entry.to) };
  if (entry.ship !== undefined) after = arrive(shipArrives(after, entry.to, entry.ship), clock, entry.ship);
  if (entry.kind === 'journey' && entry.berths.length > 0) {
    const dead = new Set(entry.berths.filter((b) => b.for !== undefined && !survived(b)).map((b) => b.for!));
    const winner = winnerOf(entry);
    const pc = winner === undefined ? undefined : entry.berths[winner]!.for;
    after = {
      ...after,
      characters: after.characters.map((c) => (dead.has(c.id) ? { ...c, dead: true } : c)),
      bookings: pc !== undefined && lotteryPaid(entry) ? [...after.bookings, { at: clock.now(), kind: 'lottery', amount: potOf(entry), for: pc, won: voyage.entry }] : after.bookings,
    };
  }
  return keepFocus(campaign, after);
}

/** Prüft eine geladene Reise unterwegs. */
export function checkVoyage(campaign: Campaign, voyage: Voyage): void {
  if (!Number.isInteger(voyage.days) || voyage.days < 0) throw new DomainError('Die Reisetage einer Reise unterwegs sind eine ganze Zahl ab 0.');
  const entry = voyageEntry(campaign, voyage);
  if (voyage.days >= voyageDuration(entry)) throw new DomainError('Die Reise unterwegs ist schon angekommen.');
  if (campaign.location !== undefined) throw new DomainError('Unterwegs ist die Gruppe an keinem Ort.');
}
