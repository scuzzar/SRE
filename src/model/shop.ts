import { characterOf, livingCharacters, type Campaign, type CharacterId, type Possession } from './campaign';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { itemOf, ref, weaponOf, type Item } from './reference';
import { hexById, worldOf, type Hex } from './sector';

/** Einnahme, Ausgabe, Einzahlung eines Charakters, Auszahlung an einen Charakter, Kauf. */
export const bookingKinds = ['income', 'expense', 'deposit', 'payout', 'purchase'] as const;
export type BookingKind = (typeof bookingKinds)[number];

/**
 * Eine Bewegung der Gruppenkasse. `amount` in ganzen Cr, positiv in die Kasse, negativ hinaus.
 * Buchungen werden nur angehängt, nie geändert oder gelöscht; einen Fehler bucht man zurück.
 */
export interface Booking {
  /** Zeitpunkt als ISO-8601-Zeitstempel. */
  readonly at: string;
  readonly kind: BookingKind;
  readonly amount: number;
  readonly text?: string;
  /** Bei Einzahlung, Auszahlung und Kauf: der Charakter. */
  readonly for?: CharacterId;
  /** Beim Kauf: der Gegenstand, die Anzahl und die Welt, als Spalte und Zeile (0304). */
  readonly bought?: string;
  readonly count?: number;
  readonly in?: string;
}

/** `/funds`: der Stand der Gruppenkasse, die Summe aller Buchungen. */
export function fundsOf(campaign: Campaign): number {
  return campaign.bookings.reduce((sum, b) => sum + b.amount, 0);
}

/** Der Aufenthaltsort der Gruppe, wenn sie auf einer fertigen Welt ist. */
export function locationOf(campaign: Campaign): (Hex & { readonly name: string }) | undefined {
  return campaign.location === undefined ? undefined : worldOf(campaign.hexes, campaign.location);
}

/** Setzt den Aufenthaltsort auf eine fertige Welt des Subsektors; `undefined` heißt: nirgends. */
export function setLocation(campaign: Campaign, id: string | undefined): Campaign {
  const rest = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'location')) as Omit<Campaign, 'location'>;
  if (id === undefined) return rest;
  worldOf(campaign.hexes, id);
  return { ...rest, location: id };
}

/** Ab welcher Gesetzesstufe ein Gegenstand verboten ist: eine Waffe nach S. 14, ein Magazin wie seine Waffe. */
export function bannedFrom(item: Item): number | undefined {
  if (item.weapon !== undefined) return weaponOf(item.weapon).law;
  return ref.weapons.find((w) => w.ammo === item.id)?.law;
}

/** Ein Gegenstand im Angebot einer Welt, mit Preis und, wenn das Gesetz der Welt ihn verbietet, ab welcher Stufe. */
export interface Offer {
  readonly item: Item;
  readonly price: number;
  readonly banned: number | undefined;
}

/** Nicht im Shop: Schiffe und Mitgliedschaften. */
const notSold = new Set<Item['kind']>(['ship', 'membership']);

/** `/offer`: jeder Gegenstand mit Preis bis zum TL der Welt, ohne Schiffe und Mitgliedschaften. Verbotene mit Warnung. */
export function offerOf(world: Hex): readonly Offer[] {
  const tech = world.uwp.tech ?? 0;
  const law = world.uwp.law ?? 0;
  return ref.items.flatMap((item) => {
    if (item.price === undefined || notSold.has(item.kind) || (item.tl ?? 0) > tech) return [];
    const from = bannedFrom(item);
    return [{ item, price: item.price, banned: from !== undefined && law >= from ? from : undefined }];
  });
}

function checkAmount(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) throw new DomainError('Ein Betrag ist eine ganze Zahl über 0 Cr.');
}

function withBooking(campaign: Campaign, booking: Booking): Campaign {
  const after = { ...campaign, bookings: [...campaign.bookings, booking] };
  if (fundsOf(after) < 0) throw new DomainError(`So viel ist nicht in der Gruppenkasse (Cr ${fundsOf(campaign).toLocaleString('de-DE')}).`);
  return after;
}

function withText<T extends object>(value: T, text: string | undefined): T & { text?: string } {
  const trimmed = text?.trim();
  return trimmed ? { ...value, text: trimmed } : value;
}

/**
 * Bucht Geld in die Kasse oder hinaus. `amount` ist immer positiv; die Art sagt die Richtung.
 * Einzahlung und Auszahlung ändern die Credits des Charakters um denselben Betrag.
 */
export function book(campaign: Campaign, kind: Exclude<BookingKind, 'purchase'>, amount: number, clock: Clock, text?: string, character?: CharacterId): Campaign {
  checkAmount(amount);
  const signed = kind === 'income' || kind === 'deposit' ? amount : -amount;
  if (kind === 'income' || kind === 'expense') {
    if (character !== undefined) throw new DomainError('Einnahme und Ausgabe gehören zu keinem Charakter.');
    return withBooking(campaign, withText({ at: clock.now(), kind, amount: signed }, text));
  }
  if (character === undefined) throw new DomainError('Für Einzahlung und Auszahlung fehlt der Charakter.');
  const who = characterOf(campaign, character);
  if (kind === 'deposit' && who.credits < amount) throw new DomainError(`${who.name} hat nur Cr ${who.credits.toLocaleString('de-DE')}.`);
  const booked = withBooking(campaign, withText({ at: clock.now(), kind, amount: signed, for: character }, text));
  return { ...booked, characters: booked.characters.map((c) => (c.id === character ? { ...c, credits: c.credits - signed } : c)) };
}

/**
 * Kauft auf dem Aufenthaltsort aus der Gruppenkasse: der Gegenstand kommt in den Besitz des
 * Charakters. Eine Schusswaffe, die er noch nicht hatte, kommt leer.
 */
export function buy(campaign: Campaign, itemId: string, count: number, character: CharacterId, clock: Clock): Campaign {
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  const offer = offerOf(world).find((o) => o.item.id === itemId);
  if (!offer) throw new DomainError(`${itemOf(itemId).name} gibt es auf ${world.name} nicht zu kaufen.`);
  if (!Number.isInteger(count) || count < 1) throw new DomainError('Die Anzahl ist 1 oder mehr.');
  const who = characterOf(campaign, character);
  if (!livingCharacters(campaign).some((c) => c.id === character)) throw new DomainError(`${who.name} kann nichts kaufen.`);
  const had = who.possessions.find((p) => p.of === itemId);
  if (offer.item.once && (count > 1 || had)) throw new DomainError(`${offer.item.name} kann man nur einmal haben.`);
  const booked = withBooking(campaign, { at: clock.now(), kind: 'purchase', amount: -offer.price * count, for: character, bought: itemId, count, in: campaign.location });
  const empty = offer.item.weapon !== undefined && weaponOf(offer.item.weapon).rounds !== undefined;
  const added: Possession = { of: itemId, count, ...(empty ? { rounds: 0 } : {}) };
  const possessions = had ? who.possessions.map((p) => (p.of === itemId ? { ...p, count: p.count + count } : p)) : [...who.possessions, added];
  return { ...booked, characters: booked.characters.map((c) => (c.id === character ? { ...c, possessions } : c)) };
}

/** Prüft die Buchungen einer Kampagnendatei: jede passt zu ihrer Art, und die Kasse ist nach keiner negativ. */
export function validateBookings(campaign: Campaign): void {
  let funds = 0;
  for (const b of campaign.bookings) {
    if (!Number.isInteger(b.amount) || b.amount === 0) throw new DomainError('Eine Buchung hat einen Betrag in ganzen Cr.');
    const inward = b.kind === 'income' || b.kind === 'deposit';
    if (inward !== b.amount > 0) throw new DomainError(`Eine Buchung der Art ${b.kind} geht in die falsche Richtung.`);
    const needs = b.kind === 'deposit' || b.kind === 'payout' || b.kind === 'purchase';
    if (needs !== (b.for !== undefined)) throw new DomainError(`Eine Buchung der Art ${b.kind} hat ${needs ? 'keinen' : 'einen'} Charakter.`);
    if (b.for !== undefined) characterOf(campaign, b.for);
    if ((b.kind === 'purchase') !== (b.bought !== undefined && b.count !== undefined && b.in !== undefined)) throw new DomainError('Nur ein Kauf hat Gegenstand, Anzahl und Welt.');
    if (b.bought !== undefined) itemOf(b.bought);
    if (b.in !== undefined && !hexById(campaign.hexes, b.in)) throw new DomainError(`Ein Kauf verweist auf das Feld ${b.in}, das es nicht gibt.`);
    funds += b.amount;
    if (funds < 0) throw new DomainError('Die Gruppenkasse wird negativ.');
  }
}
