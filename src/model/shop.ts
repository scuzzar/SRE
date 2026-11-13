import { characterOf, livingCharacters, possessionKey, withArms, type Campaign, type CharacterId, type Possession } from './campaign';
import { addToStash, equipNew, isPc, type EquipSlot } from './stash';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { itemOf, ref, weaponOf, type Item } from './reference';
import { hexById, worldOf, type Hex } from './sector';

/** Einnahme, Ausgabe, Einzahlung eines Charakters, Auszahlung an einen Charakter, Kauf, Verkauf, Gewinn der Low Lottery. */
export const bookingKinds = ['income', 'expense', 'deposit', 'payout', 'purchase', 'sale', 'lottery'] as const;
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
  /** Bei Einzahlung und Auszahlung der Charakter; bei Kauf und Verkauf der SC, der es ausrüstet bzw. ausgerüstet hatte (fehlt beim Gruppengepäck). */
  readonly for?: CharacterId;
  /** Beim Kauf bzw. Verkauf: der Gegenstand, die Anzahl und die Welt, als Spalte und Zeile (0304). */
  readonly bought?: string;
  readonly sold?: string;
  readonly count?: number;
  readonly in?: string;
  /** Beim Lotteriegewinn: die Reise, im Code ihre Stelle im Log. */
  readonly won?: number;
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
export function book(campaign: Campaign, kind: Exclude<BookingKind, 'purchase' | 'sale' | 'lottery'>, amount: number, clock: Clock, text?: string, character?: CharacterId): Campaign {
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

/** Ob die Gruppe den Gegenstand schon hat: im Gepäck oder an einem SC. */
function groupOwns(campaign: Campaign, itemId: string): boolean {
  return campaign.stash.some((p) => p.of === itemId) || campaign.characters.some((c) => isPc(c) && c.possessions.some((p) => p.of === itemId));
}

/** Wohin ein gekaufter Gegenstand am SC kommt: eine Waffe wird Primärwaffe, eine Rüstung getragen; sonst ins Gepäck. */
export function equipSlotOf(itemId: string): EquipSlot | undefined {
  const item = itemOf(itemId);
  return item.weapon !== undefined ? 'primary' : item.armor !== undefined ? 'wears' : undefined;
}

/**
 * Kauft auf dem Aufenthaltsort aus der Gruppenkasse. Eine Waffe oder Rüstung rüstet der SC
 * `character` gleich aus (Primärwaffe in der Hand bzw. getragen), was er vorher dort hatte, kommt
 * ins Gepäck; hat er sie schon ausgerüstet, und alle weiteren Stück, kommen ins Gepäck. Alles andere
 * kommt ins Gepäck, ohne Charakter. Eine Schusswaffe, die die Gruppe noch nicht hatte, kommt leer.
 */
export function buy(campaign: Campaign, itemId: string, count: number, character: CharacterId | undefined, clock: Clock): Campaign {
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  const offer = offerOf(world).find((o) => o.item.id === itemId);
  if (!offer) throw new DomainError(`${itemOf(itemId).name} gibt es auf ${world.name} nicht zu kaufen.`);
  if (!Number.isInteger(count) || count < 1) throw new DomainError('Die Anzahl ist 1 oder mehr.');
  const had = groupOwns(campaign, itemId);
  if (offer.item.once && (count > 1 || had)) throw new DomainError(`${offer.item.name} kann man nur einmal haben.`);
  const slot = equipSlotOf(itemId);
  const who = slot === undefined || character === undefined ? undefined : characterOf(campaign, character);
  if (who && (!isPc(who) || !livingCharacters(campaign).some((c) => c.id === who.id))) throw new DomainError(`${who.name} kann nichts ausrüsten.`);
  if (slot !== undefined && !who) throw new DomainError(`Für ${offer.item.name} fehlt der SC, der es ausrüstet.`);
  const booked = withBooking(campaign, { at: clock.now(), kind: 'purchase', amount: -offer.price * count, ...(who ? { for: who.id } : {}), bought: itemId, count, in: campaign.location });
  const empty = offer.item.weapon !== undefined && weaponOf(offer.item.weapon).rounds !== undefined && !had;
  const piece: Possession = { of: itemId, count: 1, ...(empty ? { rounds: 0 } : {}) };
  // Hat er sie schon ausgerüstet (als Primär- oder Sekundärwaffe bzw. getragen), geht alles ins Gepäck.
  const already = who !== undefined && who.possessions.some((p) => p.of === itemId);
  if (!who || slot === undefined || already) return { ...booked, stash: addToStash(booked.stash, { ...piece, count }) };
  const equipped = equipNew(booked, who.id, slot, piece);
  return count > 1 ? { ...equipped, stash: addToStash(equipped.stash, { ...piece, count: count - 1 }) } : equipped;
}

/** Der vorgeschlagene Erlös je Stück: der halbe Preis der Charts, abgerundet; ohne Preis oder bei Schiffen und Mitgliedschaften nicht verkäuflich. */
export function salePrice(item: Item): number | undefined {
  if (item.price === undefined || notSold.has(item.kind)) return undefined;
  return Math.max(1, Math.floor(item.price / 2));
}

/**
 * Verkauft auf dem Aufenthaltsort aus dem Gruppengepäck (`character` fehlt) oder was ein lebender SC
 * ausgerüstet hat; der Erlös geht in die Gruppenkasse. Geht eine Waffe weg, entfällt sie als Primär-
 * bzw. Sekundärwaffe.
 */
export function sell(campaign: Campaign, itemId: string, count: number, price: number, character: CharacterId | undefined, clock: Clock): Campaign {
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  const item = itemOf(itemId);
  if (salePrice(item) === undefined) throw new DomainError(`${item.name} lässt sich nicht verkaufen.`);
  checkAmount(price);
  if (character === undefined) {
    const inStash = campaign.stash.find((p) => p.of === itemId && p.from === undefined);
    if (!inStash) throw new DomainError(`Im Gepäck ist kein ${item.name}.`);
    if (!Number.isInteger(count) || count < 1 || count > inStash.count) throw new DomainError(`Im Gepäck sind ${inStash.count} × ${item.name}.`);
    const booked = withBooking(campaign, { at: clock.now(), kind: 'sale', amount: price * count, sold: itemId, count, in: campaign.location });
    return { ...booked, stash: booked.stash.flatMap((p) => (p !== inStash ? [p] : p.count > count ? [{ ...p, count: p.count - count }] : [])) };
  }
  const who = characterOf(campaign, character);
  if (!livingCharacters(campaign).some((c) => c.id === character)) throw new DomainError(`${who.name} kann nichts verkaufen.`);
  const had = who.possessions.find((p) => p.of === itemId);
  if (!had) throw new DomainError(`${who.name} hat kein ${item.name}.`);
  if (!Number.isInteger(count) || count < 1 || count > had.count) throw new DomainError(`${who.name} hat ${had.count} × ${item.name}.`);
  const booked = withBooking(campaign, { at: clock.now(), kind: 'sale', amount: price * count, for: character, sold: itemId, count, in: campaign.location });
  const possessions = who.possessions.flatMap((p) => (p.of !== itemId ? [p] : p.count > count ? [{ ...p, count: p.count - count }] : []));
  // Geht der Gegenstand ganz weg, wird er ausgezogen; als Waffe entfällt er als Primär- bzw.
  // Sekundärwaffe, und war er in der Hand, nimmt der Charakter seine Primärwaffe (siehe `withArms`).
  const gone = !possessions.some((p) => p.of === itemId);
  const rest = Object.fromEntries(Object.entries(who).filter(([key]) => !(gone && key === 'wears' && itemId === who.wears))) as typeof who;
  return { ...booked, characters: booked.characters.map((c) => (c.id === character ? withArms({ ...rest, possessions }) : c)) };
}

/**
 * Verkauft Jagdbeute (Fleisch, Fell) aus dem Gruppengepäck: so viele kg der Beute mit dieser
 * Herkunft (`key`, siehe `possessionKey`) zum Erlös `total` für alle zusammen; er geht in die Kasse.
 */
export function sellGame(campaign: Campaign, key: string, kg: number, total: number, clock: Clock): Campaign {
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  checkAmount(total);
  const had = campaign.stash.find((p) => possessionKey(p) === key);
  if (!had || itemOf(had.of).kind !== 'game') throw new DomainError('Diese Jagdbeute ist nicht im Gepäck.');
  if (!Number.isInteger(kg) || kg < 1 || kg > had.count) throw new DomainError(`Im Gepäck sind ${had.count} kg.`);
  const booked = withBooking(campaign, { at: clock.now(), kind: 'sale', amount: total, sold: had.of, count: kg, in: campaign.location });
  return { ...booked, stash: booked.stash.flatMap((p) => (p !== had ? [p] : p.count > kg ? [{ ...p, count: p.count - kg }] : [])) };
}

/** Prüft die Buchungen einer Kampagnendatei: jede passt zu ihrer Art, und die Kasse ist nach keiner negativ. */
export function validateBookings(campaign: Campaign): void {
  let funds = 0;
  for (const b of campaign.bookings) {
    if (!Number.isInteger(b.amount) || b.amount === 0) throw new DomainError('Eine Buchung hat einen Betrag in ganzen Cr.');
    const inward = b.kind === 'income' || b.kind === 'deposit' || b.kind === 'sale' || b.kind === 'lottery';
    if (inward !== b.amount > 0) throw new DomainError(`Eine Buchung der Art ${b.kind} geht in die falsche Richtung.`);
    // Kauf und Verkauf haben einen Charakter, wenn es um Ausgerüstetes geht; sonst das Gruppengepäck.
    const needs = b.kind === 'deposit' || b.kind === 'payout' || b.kind === 'lottery';
    const never = b.kind === 'income' || b.kind === 'expense';
    if ((needs && b.for === undefined) || (never && b.for !== undefined)) throw new DomainError(`Eine Buchung der Art ${b.kind} hat ${needs ? 'keinen' : 'einen'} Charakter.`);
    if (b.for !== undefined) characterOf(campaign, b.for);
    if ((b.kind === 'purchase') !== (b.bought !== undefined)) throw new DomainError('Nur ein Kauf hat einen gekauften Gegenstand.');
    if ((b.kind === 'sale') !== (b.sold !== undefined)) throw new DomainError('Nur ein Verkauf hat einen verkauften Gegenstand.');
    const trade = b.kind === 'purchase' || b.kind === 'sale';
    if (trade !== (b.count !== undefined && b.in !== undefined)) throw new DomainError('Nur Kauf und Verkauf haben Anzahl und Welt.');
    if (b.bought !== undefined) itemOf(b.bought);
    if (b.sold !== undefined) itemOf(b.sold);
    if ((b.kind === 'lottery') !== (b.won !== undefined)) throw new DomainError('Nur ein Lotteriegewinn verweist auf eine Reise.');
    if (b.won !== undefined && campaign.log[b.won]?.kind !== 'journey') throw new DomainError('Ein Lotteriegewinn verweist auf einen Eintrag, der keine Reise ist.');
    if (b.in !== undefined && !hexById(campaign.hexes, b.in)) throw new DomainError(`Ein Kauf verweist auf das Feld ${b.in}, das es nicht gibt.`);
    funds += b.amount;
    if (funds < 0) throw new DomainError('Die Gruppenkasse wird negativ.');
  }
}
