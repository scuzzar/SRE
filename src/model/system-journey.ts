import { keepFocus, type Campaign } from './campaign';
import { leaveShipBehind, portDepartureBlocker, shipArrives, shipDepartureBlocker } from './landing';
import { DomainError } from './errors';
import type { SystemJourney } from './log';
import { worldPlace } from './place';
import type { Clock } from './ports';
import { shipDesignOf } from './reference';
import { hexById, hexIdOfWorld, worldById, type Hex, type World } from './sector';
import { activeShip, craftOf, shipById, shipOf, whereIs, type Ship } from './ship';
import { fundsOf } from './shop';
import { orbitMillionKm, radiusOf } from './star-system';
import { dayOf } from './time';
import { travellersOf } from './travel';
import { parkVehicles } from './trip';
import { afterTime, arrive } from './upkeep';

// Die Reise im System (Domänenmodell 2026-11-20d): von Welt zu Welt desselben Systems, mit Ticket
// oder mit dem eigenen Schiff; Dauer nach den Charts S. 8, T = 2·√(D/A).

/** Wie die Gruppe reist: mit Ticket auf einem fremden Schiff, mit dem eigenen oder mit einem seiner Small Craft (2026-11-21b). */
export type SystemJourneyMode = 'ticket' | 'ship' | 'craft';

/** Mit Ticket fliegt das Schiff mit 1 G (Hausregel, Owner). */
export const TICKET_G = 1;
/** Ein Ticket kostet Cr 25 je Stunde Flugzeit und Reisendem (der Satz der Middle Passage je Tag; Hausregel, Owner). */
export const TICKET_RATE = 25;

/** Die Welt, deren Bahn um den Stern für eine Welt zählt: ihre eigene, bei einem Mond die seiner Welt. */
function aroundStar(hex: Hex, world: World): World {
  return (world.moonOf === undefined ? undefined : hex.worlds.find((w) => w.id === world.moonOf)) ?? world;
}

/** Der Bahnabstand eines Mondes von der Mitte seiner Welt in km. */
function moonKm(hex: Hex, moon: World): number {
  const host = hex.worlds.find((w) => w.id === moon.moonOf);
  return (moon.orbit ?? 0) * (host ? (radiusOf(host) ?? 0) : 0);
}

/**
 * `/distance` in km (Owner: Abstand der Bahnen): zwischen zwei Welten um den Stern der Unterschied
 * ihrer Abstände vom Stern, für einen Mond der seiner Welt; zwischen einem Mond und seiner Welt sein
 * Bahnabstand; zwischen zwei Monden derselben Welt der Unterschied ihrer Bahnabstände.
 */
export function systemDistance(hexes: readonly Hex[], from: string, to: string): number {
  const hex = hexById(hexes, hexIdOfWorld(from));
  const a = worldById(hexes, from);
  const b = worldById(hexes, to);
  if (!hex || !a || !b || hexIdOfWorld(from) !== hexIdOfWorld(to)) throw new DomainError('Eine Reise im System führt zu einer Welt desselben Systems.');
  if (a.moonOf !== undefined && a.moonOf === b.id) return moonKm(hex, a);
  if (b.moonOf !== undefined && b.moonOf === a.id) return moonKm(hex, b);
  if (a.moonOf !== undefined && a.moonOf === b.moonOf) return Math.abs(moonKm(hex, a) - moonKm(hex, b));
  const ra = aroundStar(hex, a).orbit;
  const rb = aroundStar(hex, b).orbit;
  if (ra === undefined || rb === undefined) throw new DomainError('Ohne Sternsystem gibt es keine Reise im System.');
  return Math.abs(orbitMillionKm(ra) - orbitMillionKm(rb)) * 1_000_000;
}

/** Die Flugzeit in Stunden, aufgerundet: T = 2·√(D/A), D in m, A in m/s² (1 G = 10 m/s²; Charts S. 8). */
export function flightHours(km: number, g: number): number {
  return Math.max(1, Math.ceil((2 * Math.sqrt((km * 1000) / (g * 10))) / 3600));
}

/** `/days`: so viele Tage vergehen, die Stunden auf volle Tage aufgerundet, mindestens einer (Owner). */
export function journeyDays(hours: number): number {
  return Math.max(1, Math.ceil(hours / 24));
}

/** Mit wie vielen G die Gruppe reist: mit Ticket 1 G, mit dem eigenen Schiff oder Small Craft sein Manöverantrieb. */
export function journeyG(campaign: Campaign, mode: SystemJourneyMode, craft?: string): number {
  if (mode === 'ticket') return TICKET_G;
  return shipDesignOf((mode === 'craft' && craft !== undefined ? shipById(campaign, craft) : activeShip(campaign)).design).maneuver;
}

/**
 * Die Small Craft, mit denen die Gruppe jetzt im System reisen kann (2026-11-21b): gelandet an ihrem
 * Ort oder an Bord des Mutterschiffs, bei dem sie steht.
 */
export function journeyCraft(campaign: Campaign): readonly Ship[] {
  const ship = shipOf(campaign);
  if (ship === undefined || campaign.location === undefined) return [];
  return craftOf(campaign, ship.id).filter((c) => !whereIs(campaign, c)?.inOrbit && (c.aboard || c.place !== undefined) && shipDepartureBlocker(campaign, c) === undefined);
}

/** Hat die Welt einen Raumhafen: die Hauptwelt einen Starport A–E, eine Nebenwelt einen Spaceport F–H? */
function hasPort(hexes: readonly Hex[], id: string): boolean {
  const hex = hexById(hexes, hexIdOfWorld(id));
  const world = worldById(hexes, id);
  if (!hex || !world) return false;
  if (world.id === hex.main) return world.uwp.starport !== undefined && world.uwp.starport >= 10 && world.uwp.starport <= 14;
  return world.spaceport !== undefined && world.spaceport !== 'Y';
}

/** Der Preis der Tickets für alle Reisenden. */
export function ticketCost(campaign: Campaign, to: string): number {
  const from = campaign.location?.world;
  if (from === undefined) return 0;
  return flightHours(systemDistance(campaign.hexes, from, to), TICKET_G) * TICKET_RATE * travellersOf(campaign).length;
}

/** Kann die Welt Ziel einer Reise im System sein? Welten, kleine Welten, Gürtel und Monde, keine Gasriesen und Ringe. */
export function isSystemDestination(world: World): boolean {
  return world.kind !== 'giant' && world.kind !== 'ring';
}

/** Warum die Gruppe nicht so nach `to` reisen kann; `undefined`, wenn sie kann. */
export function systemJourneyBlocker(campaign: Campaign, to: string, mode: SystemJourneyMode, craft?: string): string | undefined {
  const from = campaign.location?.world;
  if (from === undefined) return 'Die Gruppe ist auf keiner Welt; erst den Aufenthaltsort wählen.';
  if (from === to) return 'Die Gruppe ist schon hier.';
  const target = worldById(campaign.hexes, to);
  if (!target || hexIdOfWorld(from) !== hexIdOfWorld(to)) return 'Eine Reise im System führt zu einer Welt desselben Systems.';
  if (!isSystemDestination(target)) return 'Auf einem Gasriesen oder Ring kann man nicht ankommen.';
  if (!hexById(campaign.hexes, hexIdOfWorld(to))?.system) return 'Ohne Sternsystem gibt es keine Reise im System.';
  if (campaign.encounters.some((e) => !e.ended)) return 'Während einer laufenden Begegnung reist man nicht.';
  if (campaign.trip) return 'Erst die Fahrt beenden, dann reisen.';
  if (campaign.flight) return 'Erst den Systemflug beenden, dann reisen.';
  if (travellersOf(campaign).length === 0) return 'Es gibt keinen lebenden Charakter, der reisen könnte.';
  if (mode === 'ship') return shipOf(campaign) === undefined ? 'Die Gruppe hat kein Schiff.' : shipDepartureBlocker(campaign);
  if (mode === 'craft') return journeyCraft(campaign).some((c) => c.id === craft) ? undefined : 'Mit diesem Beiboot kann die Gruppe von hier nicht reisen.';
  const port = portDepartureBlocker(campaign);
  if (port) return port;
  if (!hasPort(campaign.hexes, from) && !hasPort(campaign.hexes, to)) return 'Ein Ticket gibt es nur, wenn Start oder Ziel einen Raumhafen hat.';
  const cost = ticketCost(campaign, to);
  if (cost > fundsOf(campaign)) return `Die Tickets kosten Cr ${cost.toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`;
  return undefined;
}

/**
 * Die Gruppe reist zu einer anderen Welt desselben Systems (2026-11-20d): mit Ticket (eine Buchung
 * `ticket`) oder mit dem eigenen Schiff. Danach sind `/days` Tage vergangen, ohne
 * Pflicht-Begegnungen, und die Gruppe ist auf der Zielwelt (ohne Stadt und Feld).
 */
export function travelInSystem(campaign: Campaign, to: string, mode: SystemJourneyMode, clock: Clock, craft?: string): Campaign {
  const blocker = systemJourneyBlocker(campaign, to, mode, craft);
  if (blocker) throw new DomainError(blocker);
  // Mit Ticket oder Beiboot bleibt das eigene Schiff, wo es steht (2026-11-21, 2026-11-21b).
  campaign = mode === 'ship' ? parkVehicles(campaign) : leaveShipBehind(parkVehicles(campaign));
  const from = campaign.location!.world;
  const travellers = travellersOf(campaign).map((c) => c.id);
  const hours = flightHours(systemDistance(campaign.hexes, from, to), journeyG(campaign, mode, craft));
  const today = dayOf(campaign);
  const ship = mode === 'ship' ? shipOf(campaign)! : mode === 'craft' ? shipById(campaign, craft!) : undefined;
  const journey: SystemJourney = { kind: 'systemJourney', at: clock.now(), day: today, from, to, hours, travellers, ...(ship ? { ship: ship.id } : {}) };
  const index = campaign.log.length;
  const days = journeyDays(hours);
  const cost = mode === 'ticket' ? hours * TICKET_RATE * travellers.length : 0;
  const after: Campaign = {
    ...campaign,
    bookings: cost > 0 ? [...campaign.bookings, { at: clock.now(), kind: 'ticket', amount: -cost, text: `Ticket, ${travellers.length} Reisende`, ticketFor: index }] : campaign.bookings,
    log: [...campaign.log, journey],
    day: today + days,
    location: worldPlace(to),
  };
  // Mit dem eigenen Schiff oder Beiboot steht es danach auf der Zielwelt; das Feld wählt der Landeplatz.
  return keepFocus(campaign, arrive(afterTime(ship ? shipArrives(after, to, ship.id) : after, today, clock), clock, ship?.id));
}

/** Prüft eine Reise im System aus der Kampagnendatei: Welten im selben System, Stunden, Reisende, Schiff. */
export function checkSystemJourney(campaign: Campaign, journey: SystemJourney): void {
  if (!worldById(campaign.hexes, journey.from) || !worldById(campaign.hexes, journey.to)) throw new DomainError('Eine Reise im System verweist auf eine Welt, die es nicht gibt.');
  if (hexIdOfWorld(journey.from) !== hexIdOfWorld(journey.to) || journey.from === journey.to) throw new DomainError('Eine Reise im System führt zu einer anderen Welt desselben Systems.');
  if (!Number.isInteger(journey.hours) || journey.hours < 1) throw new DomainError('Eine Reise im System dauert mindestens eine Stunde.');
  for (const id of journey.travellers) if (!campaign.characters.some((c) => c.id === id)) throw new DomainError(`Eine Reise im System verweist auf ${id}, der kein Charakter der Kampagne ist.`);
  if (journey.ship !== undefined && !campaign.ships.some((s) => s.id === journey.ship)) throw new DomainError('Eine Reise im System verweist auf ein Schiff, das es nicht gibt.');
}
