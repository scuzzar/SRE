import type { Campaign } from './campaign';
import { DomainError } from './errors';
import type { LogEntry, TimePassed } from './log';
import type { Clock } from './ports';

/**
 * Die Spielzeit im Imperialen Kalender: 365 Tage im Jahr, `day` = Jahr × 365 + Tag des Jahres − 1.
 * Tag 001 jedes Jahres ist der Feiertag ohne Wochentag; ab Tag 002 folgen 52 Wochen von Montag bis
 * Sonntag (Hausregel nach dem Imperialen Kalender, siehe domain-model.md, *Spielzeit*).
 */
export const DAYS_PER_YEAR = 365;

/** Eine neue Kampagne beginnt am 001-1105. */
export const START_DAY = 1105 * DAYS_PER_YEAR;

/** Wie viele Tage man mit „Tage“ höchstens auf einmal vergehen lässt. */
export const MAX_DAYS = 6;

/** Eine Reise dauert immer eine Woche (SE S. 8). */
export const JOURNEY_DAYS = 7;

export const weekdayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;

/** Der heutige Tag der Kampagne. */
export function dayOf(campaign: Campaign): number {
  return campaign.day;
}

/** Tag des Jahres (1–365) und Jahr. */
export function dateParts(day: number): { readonly dayOfYear: number; readonly year: number } {
  return { dayOfYear: (day % DAYS_PER_YEAR) + 1, year: Math.floor(day / DAYS_PER_YEAR) };
}

/** `/date`: „Tag-Jahr“ mit drei Stellen für den Tag, z. B. 123-1105. */
export function dateOf(day: number): string {
  const { dayOfYear, year } = dateParts(day);
  return `${String(dayOfYear).padStart(3, '0')}-${year}`;
}

/** `/weekday`: 1 (Montag) bis 7 (Sonntag); am Feiertag (Tag 001) keiner. */
export function weekdayOf(day: number): number | undefined {
  const { dayOfYear } = dateParts(day);
  return dayOfYear === 1 ? undefined : ((dayOfYear - 2) % 7) + 1;
}

/** Der Name des Wochentags, am Feiertag „Feiertag“. */
export function weekdayName(day: number): string {
  const weekday = weekdayOf(day);
  return weekday === undefined ? 'Feiertag' : weekdayNames[weekday - 1]!;
}

/** Das Datum mit Wochentag, z. B. „Sonntag, 008-1105“. */
export function dateLabel(day: number): string {
  return `${weekdayName(day)}, ${dateOf(day)}`;
}

/** Wie viele Tage bis zum nächsten Sonntag; am Sonntag 7. */
export function daysToSunday(day: number): number {
  const weekday = weekdayOf(day);
  // Der Feiertag gehört zur ersten Woche: Bis zum ersten Sonntag (Tag 008) sind es 7 Tage.
  return weekday === undefined || weekday === 7 ? 7 : 7 - weekday;
}

/**
 * Der erste Tag der Woche, zu der `day` gehört. Eine Woche beginnt mit dem Sonntag, auf den „Woche
 * beenden“ springt, und reicht bis Samstag; die erste Woche des Jahres beginnt mit dem Feiertag.
 */
export function weekStart(day: number): number {
  const weekday = weekdayOf(day);
  if (weekday === undefined || weekday === 7) return day;
  // Montag bis Samstag: zurück zum Sonntag davor; in der ersten Woche ist das der Feiertag.
  return day - weekday;
}

/** Lässt 1 bis 6 Tage vergehen (`week` = false) oder beendet die Woche: bis zum nächsten Sonntag. */
export function passTime(campaign: Campaign, how: { readonly days: number } | 'week', clock: Clock): Campaign {
  const today = dayOf(campaign);
  const week = how === 'week';
  const days = week ? daysToSunday(today) : how.days;
  if (!week && (!Number.isInteger(days) || days < 1 || days > MAX_DAYS)) throw new DomainError(`Es vergehen 1 bis ${MAX_DAYS} Tage.`);
  if (campaign.encounters.some((e) => !e.ended)) throw new DomainError('Während einer laufenden Begegnung vergeht keine Zeit.');
  const entry: TimePassed = { kind: 'time', at: clock.now(), day: today, days, week };
  return { ...campaign, day: today + days, log: [...campaign.log, entry] };
}

/**
 * Setzt das Startdatum (Tag des Jahres und Jahr); das geht nur, solange kein Logeintrag einen Tag
 * hat. Danach vergeht die Zeit nur vorwärts.
 */
export function setStartDate(campaign: Campaign, dayOfYear: number, year: number): Campaign {
  if (campaign.log.some((e) => e.day !== undefined)) throw new DomainError('Das Datum lässt sich nur ändern, solange der Log keinen Tag hat.');
  if (!Number.isInteger(dayOfYear) || dayOfYear < 1 || dayOfYear > DAYS_PER_YEAR) throw new DomainError(`Der Tag des Jahres ist 1 bis ${DAYS_PER_YEAR}.`);
  if (!Number.isInteger(year) || year < 0 || year > 9999) throw new DomainError('Das Jahr ist 0 bis 9999.');
  return { ...campaign, day: year * DAYS_PER_YEAR + dayOfYear - 1 };
}

/** Ob sich das Startdatum noch ändern lässt. */
export function canSetStartDate(campaign: Campaign): boolean {
  return !campaign.log.some((e) => e.day !== undefined);
}

/**
 * Neue Logeinträge bekommen den heutigen Spieltag, wenn sie noch keinen haben. Neu ist, was nicht
 * schon im Log von vorher stand.
 */
export function stampDays(before: readonly LogEntry[] | undefined, campaign: Campaign): Campaign {
  const old = new Set(before ?? []);
  if (campaign.log.every((e) => old.has(e) || e.day !== undefined)) return campaign;
  const today = dayOf(campaign);
  return { ...campaign, log: campaign.log.map((e) => (old.has(e) || e.day !== undefined ? e : { ...e, day: today })) };
}
