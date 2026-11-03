import { characterOf, livingCharacters, type Campaign, type CharacterId, type Possession } from './campaign';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { itemOf, ref, weaponOf, type Item } from './reference';
import { hexById, worldOf, type Hex } from './sector';

/** Einnahme, Ausgabe, Einzahlung eines Charakters, Auszahlung an einen Charakter, Kauf, Verkauf. */
export const bookingKinds = ['income', 'expense', 'deposit', 'payout', 'purchase', 'sale'] as const;
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
  /** Beim Kauf bzw. Verkauf: der Gegenstand, die Anzahl und die Welt, als Spalte und Zeile (0304). */
  readonly bought?: string;
  readonly sold?: string;
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
export function book(campaign: Campaign, kind: Exclude<BookingKind, 'purchase' | 'sale'>, amount: number, clock: Clock, text?: string, character?: CharacterId): Campaign {
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

/** Der vorgeschlagene Erlös je Stück: der halbe Preis der Charts, abgerundet; ohne Preis oder bei Schiffen und Mitgliedschaften nicht verkäuflich. */
export function salePrice(item: Item): number | undefined {
  if (item.price === undefined || notSold.has(item.kind)) return undefined;
  return Math.max(1, Math.floor(item.price / 2));
}

/**
 * Verkauft auf dem Aufenthaltsort aus dem Besitz eines Lebenden; der Erlös geht in die Gruppenkasse.
 * Geht die Waffe in der Hand ganz weg, hat er wieder die Hände.
 */
export function sell(campaign: Campaign, itemId: string, count: number, price: number, character: CharacterId, clock: Clock): Campaign {
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  const item = itemOf(itemId);
  if (salePrice(item) === undefined) throw new DomainError(`${item.name} lässt sich nicht verkaufen.`);
  checkAmount(price);
  const who = characterOf(campaign, character);
  if (!livingCharacters(campaign).some((c) => c.id === character)) throw new DomainError(`${who.name} kann nichts verkaufen.`);
  const had = who.possessions.find((p) => p.of === itemId);
  if (!had) throw new DomainError(`${who.name} hat kein ${item.name}.`);
  if (!Number.isInteger(count) || count < 1 || count > had.count) throw new DomainError(`${who.name} hat ${had.count} × ${item.name}.`);
  const booked = withBooking(campaign, { at: clock.now(), kind: 'sale', amount: price * count, for: character, sold: itemId, count, in: campaign.location });
  const possessions = who.possessions.flatMap((p) => (p.of !== itemId ? [p] : p.count > count ? [{ ...p, count: p.count - count }] : []));
  // Geht der Gegenstand ganz weg, fällt er auch aus der Hand bzw. wird ausgezogen.
  const gone = !possessions.some((p) => p.of === itemId);
  const rest = Object.fromEntries(Object.entries(who).filter(([key]) => !(gone && ((key === 'wields' && item.weapon === who.wields) || (key === 'wears' && itemId === who.wears))))) as typeof who;
  return { ...booked, characters: booked.characters.map((c) => (c.id === character ? { ...rest, possessions } : c)) };
}

/** Prüft die Buchungen einer Kampagnendatei: jede passt zu ihrer Art, und die Kasse ist nach keiner negativ. */
export function validateBookings(campaign: Campaign): void {
  let funds = 0;
  for (const b of campaign.bookings) {
    if (!Number.isInteger(b.amount) || b.amount === 0) throw new DomainError('Eine Buchung hat einen Betrag in ganzen Cr.');
    const inward = b.kind === 'income' || b.kind === 'deposit' || b.kind === 'sale';
    if (inward !== b.amount > 0) throw new DomainError(`Eine Buchung der Art ${b.kind} geht in die falsche Richtung.`);
    const needs = b.kind === 'deposit' || b.kind === 'payout' || b.kind === 'purchase' || b.kind === 'sale';
    if (needs !== (b.for !== undefined)) throw new DomainError(`Eine Buchung der Art ${b.kind} hat ${needs ? 'keinen' : 'einen'} Charakter.`);
    if (b.for !== undefined) characterOf(campaign, b.for);
    if ((b.kind === 'purchase') !== (b.bought !== undefined)) throw new DomainError('Nur ein Kauf hat einen gekauften Gegenstand.');
    if ((b.kind === 'sale') !== (b.sold !== undefined)) throw new DomainError('Nur ein Verkauf hat einen verkauften Gegenstand.');
    const trade = b.kind === 'purchase' || b.kind === 'sale';
    if (trade !== (b.count !== undefined && b.in !== undefined)) throw new DomainError('Nur Kauf und Verkauf haben Anzahl und Welt.');
    if (b.bought !== undefined) itemOf(b.bought);
    if (b.sold !== undefined) itemOf(b.sold);
    if (b.in !== undefined && !hexById(campaign.hexes, b.in)) throw new DomainError(`Ein Kauf verweist auf das Feld ${b.in}, das es nicht gibt.`);
    funds += b.amount;
    if (funds < 0) throw new DomainError('Die Gruppenkasse wird negativ.');
  }
}
