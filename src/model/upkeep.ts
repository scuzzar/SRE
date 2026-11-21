import type { Campaign } from './campaign';
import type { MonthEnd } from './log';
import type { Clock } from './ports';
import { worldOf } from './sector';
import { monthlyPaymentOf, shipOf, without, type Ship } from './ship';
import { bookShip, fundsOf, isRunningCost, setLocation } from './shop';
import { monthStartsIn, nextMonthStart } from './time';
import { cameByShip, chooseLanding, leaveShipBehind } from './landing';

/**
 * Die laufenden Kosten der Schiffe (2026-11-17b, siehe domain-model.md, *Laufende Kosten und
 * Monatsabrechnung*; RAW in regeln-schiffe.md): Monatsraten, Liegegebühren und Lebenserhaltung, und
 * an jedem Monatsende die Monatsabrechnung im Log. Ein Monat sind vier Wochen (`time.ts`).
 */

/** Liegegebühr: Cr100 bei der Ankunft für die ersten sechs Tage, danach Cr100 je weiteren Tag (SR 31). */
export const BERTH_FEE = 100;
export const BERTH_DAYS = 6;

/** Lebenserhaltung je Reisendem und Sprung mit dem eigenen Schiff (SR 30, Cr2.000 je Kabine und Reise). */
export const LIFE_SUPPORT = 2_000;

/** Wie viele Reisende der Gruppe sich eine Kabine teilen dürfen: zur Not zwei (Doppelbelegung, Hausregel). */
export const PER_STATEROOM = 2;

/**
 * Ob das Schiff in einem Hafen liegt; nur dort kostet das Liegen etwas (2026-11-21): in einer Stadt mit
 * Hafen ja, auf einem beliebigen Feld nein, noch ohne Feld (Welt ohne Globus) wie bisher nach dem
 * Raumhafen A bis E der Welt. Ohne eigenen Ort liegt das Schiff, wo die Gruppe ist.
 */
function inPort(campaign: Campaign): boolean {
  const place = shipOf(campaign)?.place ?? campaign.location;
  if (place === undefined) return false;
  const world = worldOf(campaign.hexes, place.world);
  if (place.city !== undefined) return world.map?.cities?.[place.city]?.port !== undefined;
  if (place.cell !== undefined) return false;
  // Steht noch ein Landeplatz aus, entscheidet erst er über die Gebühr.
  if (world.map !== undefined) return false;
  const port = world.uwp.starport;
  return port !== undefined && port >= 10 && port <= 14;
}

function withShip(campaign: Campaign, id: string, change: (ship: Ship) => Ship): Campaign {
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === id ? change(s) : s)) };
}

/** Bucht eine Gebühr, die man nicht ablehnen kann: reicht die Kasse nicht, bleibt sie mit Hinweis offen (0 Cr). */
function charge(campaign: Campaign, amount: number, ship: Ship, cost: 'rate' | 'berthing', paidText: string | undefined, unpaidText: string, clock: Clock): { campaign: Campaign; paid: boolean } {
  const paid = fundsOf(campaign) >= amount;
  return { campaign: bookShip(campaign, paid ? -amount : 0, ship.id, cost, clock, paid ? paidText : unpaidText), paid };
}

/**
 * Das aktive Schiff kommt mit der Gruppe an einem neuen Ort an (Reise, „Gruppe platzieren“): Es liegt
 * von heute an dort. Mit Raumhafen kostet das Cr100 für die ersten sechs Tage.
 */
export function arrive(campaign: Campaign, clock: Clock): Campaign {
  const ship = shipOf(campaign);
  if (ship === undefined) return campaign;
  // Ein Schiff mit eigenem Ort auf einer anderen Welt ist nicht mitgekommen (2026-11-21).
  if (ship.place !== undefined && ship.place.world !== campaign.location?.world) return campaign;
  const docked = withShip(campaign, ship.id, (s) => ({ ...s, berthedSince: campaign.day }));
  if (!inPort(docked)) return docked;
  return charge(docked, BERTH_FEE, ship, 'berthing', 'Liegegebühr bei der Ankunft', 'Liegegebühr nicht bezahlt', clock).campaign;
}

/**
 * Die Gruppe wählt ihren Landeplatz (2026-11-21); kam sie mit dem eigenen Schiff, liegt es von heute
 * an dort, und in einer Stadt mit Hafen kostet das die Liegegebühr bei der Ankunft.
 */
export function landAt(campaign: Campaign, place: { readonly city: number } | { readonly cell: number }, clock: Clock): Campaign {
  // Gerade angekommen ist das Schiff, wenn es schon auf dieser Welt steht, noch ohne Feld; eines ohne
  // eigenen Ort (ältere Stände) lag schon vorher bei der Gruppe und zahlt nicht noch einmal.
  const justArrived = cameByShip(campaign) && shipOf(campaign)?.place !== undefined;
  const landed = chooseLanding(campaign, place);
  return justArrived ? arrive(landed, clock) : landed;
}

/**
 * „Gruppe platzieren“: setzt den Aufenthaltsort ohne Reise und ohne Zeit. Das Schiff bleibt, wo es
 * steht (2026-11-21); eines ohne eigenen Ort bleibt am bisherigen Aufenthaltsort.
 */
export function placeGroup(campaign: Campaign, id: string | undefined, clock: Clock): Campaign {
  if (id === undefined || id === campaign.location?.world) return setLocation(campaign, id);
  return arrive(setLocation(leaveShipBehind(campaign), id), clock);
}

/** Die Liegegebühr für die Tage in (from, to], die nach den ersten sechs im Hafen liegen. */
function chargeBerthing(campaign: Campaign, from: number, to: number, clock: Clock): Campaign {
  const ship = shipOf(campaign);
  if (ship?.berthedSince === undefined || !inPort(campaign)) return campaign;
  const days = to - Math.max(from, ship.berthedSince + BERTH_DAYS - 1);
  if (days <= 0) return campaign;
  return charge(campaign, days * BERTH_FEE, ship, 'berthing', `Liegegebühr, ${days} ${days === 1 ? 'Tag' : 'Tage'}`, 'Liegegebühr nicht bezahlt', clock).campaign;
}

/**
 * Am Monatsende `day` die fälligen Raten: je Schiff mit Restschuld, dessen nächste Rate an diesem
 * Monatsende oder früher fällig ist. Reicht die Kasse nicht, bleibt die Rate als Hinweis stehen
 * (Hausregel: ohne weitere Folge); der nächste Termin rückt trotzdem zum nächsten Monatsende.
 */
function payRates(campaign: Campaign, day: number, clock: Clock): Campaign {
  let after = campaign;
  for (const due of campaign.ships) {
    if (due.retired || due.loanBalance === undefined || due.loanBalance <= 0 || due.nextPaymentDay === undefined || due.nextPaymentDay > day) continue;
    const rate = monthlyPaymentOf(due)!;
    const booked = charge(after, rate, due, 'rate', undefined, 'Rate nicht bezahlt', clock);
    const balance = due.loanBalance - rate;
    after = withShip(booked.campaign, due.id, (s) =>
      booked.paid && balance <= 0 ? without(s, 'loanBalance', 'nextPaymentDay') : { ...s, ...(booked.paid ? { loanBalance: balance } : {}), nextPaymentDay: nextMonthStart(day) },
    );
  }
  return after;
}

/** Wo die Buchungen der nächsten Monatsabrechnung beginnen: hinter denen der letzten. */
function costsStart(campaign: Campaign): number {
  for (let i = campaign.log.length - 1; i >= 0; i--) {
    const entry = campaign.log[i]!;
    if (entry.kind === 'monthEnd') return entry.costsTo;
  }
  return 0;
}

/** Die Buchungen mit laufenden Kosten, auf die eine Monatsabrechnung verweist (`costs`). */
export function costsOf(campaign: Campaign, entry: MonthEnd): readonly { readonly index: number; readonly booking: Campaign['bookings'][number] }[] {
  return campaign.bookings.slice(entry.costsFrom, entry.costsTo).flatMap((booking, i) => (isRunningCost(booking) ? [{ index: entry.costsFrom + i, booking }] : []));
}

/** Die Monatsabrechnung am Monatsende `day`, wenn es ein Schiff oder laufende Kosten gibt. */
function closeMonth(campaign: Campaign, day: number, clock: Clock): Campaign {
  const entry: MonthEnd = { kind: 'monthEnd', at: clock.now(), day, costsFrom: costsStart(campaign), costsTo: campaign.bookings.length };
  if (shipOf(campaign) === undefined && costsOf(campaign, entry).length === 0) return campaign;
  return { ...campaign, log: [...campaign.log, entry] };
}

/**
 * Spielzeit ist vergangen, vom Tag `from` bis heute (`campaign.day`): Tage, Woche beenden, Reise
 * oder Fahrt. Die Liegegebühr läuft je Tag, und an jedem erreichten Monatsende werden erst die Raten
 * gebucht, dann kommt die Monatsabrechnung in den Log. Ein Schiff aus der Zeit vor den
 * Liegegebühren liegt ab `from` im Hafen.
 */
export function afterTime(campaign: Campaign, from: number, clock: Clock): Campaign {
  const ship = shipOf(campaign);
  let after = ship !== undefined && ship.berthedSince === undefined ? withShip(campaign, ship.id, (s) => ({ ...s, berthedSince: from })) : campaign;
  let since = from;
  for (const month of monthStartsIn(from, campaign.day)) {
    after = chargeBerthing(after, since, month - 1, clock);
    after = payRates(after, month, clock);
    after = closeMonth(after, month, clock);
    since = month - 1;
  }
  return chargeBerthing(after, since, campaign.day, clock);
}
