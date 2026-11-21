import type { Campaign } from './campaign';
import { DomainError } from './errors';
import { samePlace, worldPlace, type Place } from './place';
import { worldById, type World } from './sector';
import { shipOf, type Ship } from './ship';

// Der Landeplatz (Domänenmodell 2026-11-21): Kommt die Gruppe auf eine Welt mit Globus, wählt sie
// zuerst ein Feld: eine Stadt mit Hafen oder, mit eigenem Schiff, einen beliebigen Ort. Das Schiff hat
// einen eigenen Ort; abfliegen kann es nur, wenn die Gruppe bei ihm ist. Passagen gehen nur von einem
// Hafen aus.

/** Eine Stadt mit Hafen (A–E Starport, F–H Spaceport). */
export interface PortCity {
  readonly city: number;
  readonly name: string;
  readonly port: string;
}

/** Die Städte einer Welt mit Hafen, in der Reihenfolge der Karte. */
export function portCities(world: World | undefined): readonly PortCity[] {
  return (world?.map?.cities ?? []).flatMap((c, i) => (c.port === undefined ? [] : [{ city: i, name: c.name, port: c.port }]));
}

/** Das Schiff der Gruppe und wo es steht; ohne Ort steht es bei der Gruppe. */
function groupShip(campaign: Campaign): Ship | undefined {
  return shipOf(campaign);
}

/** Kam die Gruppe mit dem eigenen Schiff hierher? Dann steht es auf dieser Welt noch ohne Feld (oder hat keinen Ort). */
export function cameByShip(campaign: Campaign): boolean {
  const ship = groupShip(campaign);
  const at = campaign.location?.world;
  if (!ship || at === undefined) return false;
  return ship.place === undefined || (ship.place.world === at && ship.place.cell === undefined && ship.place.city === undefined);
}

/** Muss die Gruppe einen Landeplatz wählen? Auf einer Welt mit Globus, ohne Feld und ohne Stadt. */
export function needsLanding(campaign: Campaign): boolean {
  const at = campaign.location;
  if (at === undefined || at.cell !== undefined || at.city !== undefined) return false;
  return worldById(campaign.hexes, at.world)?.map !== undefined;
}

/** Darf der Dialog „Anderer Ort“ anbieten? Mit eigenem Schiff, oder wenn die Welt keine Stadt mit Hafen hat. */
export function freeLanding(campaign: Campaign): boolean {
  const at = campaign.location?.world;
  return at !== undefined && (cameByShip(campaign) || portCities(worldById(campaign.hexes, at)).length === 0);
}

/**
 * Die Gruppe landet: in einer Stadt mit Hafen (`city`) oder auf einem beliebigen Feld (`cell`, nur mit
 * eigenem Schiff oder ohne Hafen). Kam sie mit dem eigenen Schiff, steht es danach dort.
 */
export function chooseLanding(campaign: Campaign, place: { readonly city: number } | { readonly cell: number }): Campaign {
  if (!needsLanding(campaign)) throw new DomainError('Die Gruppe hat schon einen Landeplatz.');
  const world = campaign.location!.world;
  const target = worldById(campaign.hexes, world)!;
  let landed: Place;
  if ('city' in place) {
    if (!portCities(target).some((p) => p.city === place.city)) throw new DomainError('Dort ist kein Hafen.');
    landed = { world, city: place.city };
  } else {
    if (!freeLanding(campaign)) throw new DomainError('Ein fremdes Schiff landet nur an einem Hafen.');
    if (!Number.isInteger(place.cell) || place.cell < 0 || place.cell >= target.map!.landforms.length) throw new DomainError('Dieses Feld gibt es nicht.');
    // Liegt das Feld in einer Stadt, ist der Landeplatz die Stadt.
    const city = target.map!.cities?.findIndex((c) => c.cell === place.cell) ?? -1;
    landed = city >= 0 ? { world, city } : { world, cell: place.cell };
  }
  const ship = cameByShip(campaign) ? groupShip(campaign) : undefined;
  return {
    ...campaign,
    location: landed,
    ships: ship ? campaign.ships.map((s) => (s.id === ship.id ? { ...s, place: landed } : s)) : campaign.ships,
  };
}

/** Warum das eigene Schiff nicht abfliegen kann: die Gruppe ist nicht bei ihm; `undefined`, wenn sie es ist. */
export function shipDepartureBlocker(campaign: Campaign): string | undefined {
  const ship = groupShip(campaign);
  const at = campaign.location;
  if (!ship || at === undefined || ship.place === undefined) return undefined;
  if (ship.place.world !== at.world) return `${ship.name} steht auf einer anderen Welt.`;
  if (ship.place.cell === undefined && ship.place.city === undefined) return undefined;
  if (samePlace(ship.place, at)) return undefined;
  // Eine Stadt und ihr Feld sind derselbe Ort.
  const map = worldById(campaign.hexes, at.world)?.map;
  const cellOf = (p: Place) => (p.city !== undefined ? map?.cities?.[p.city]?.cell : p.cell);
  const shipCell = cellOf(ship.place);
  return shipCell !== undefined && shipCell === cellOf(at) ? undefined : `Erst zum Schiff: ${ship.name} steht an einem anderen Ort dieser Welt.`;
}

/** Warum eine Passage oder ein Ticket hier nicht abfliegt: nur aus einer Stadt mit Hafen (auf Welten mit Globus). */
export function portDepartureBlocker(campaign: Campaign): string | undefined {
  const at = campaign.location;
  if (at === undefined) return undefined;
  const world = worldById(campaign.hexes, at.world);
  if (!world?.map) return undefined;
  if (at.city !== undefined && world.map.cities?.[at.city]?.port !== undefined) return undefined;
  return 'Passagen fliegen nur von einem Hafen ab; erst in eine Stadt mit Hafen.';
}

/** Vor einer Reise ohne eigenes Schiff: Hat es keinen Ort, bleibt es, wo die Gruppe ist. */
export function leaveShipBehind(campaign: Campaign): Campaign {
  const ship = groupShip(campaign);
  if (!ship || ship.place !== undefined || campaign.location === undefined) return campaign;
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id ? { ...s, place: campaign.location! } : s)) };
}

/** Mit dem eigenen Schiff angekommen: Es steht auf der Zielwelt, das Feld wählt der Landeplatz. */
export function shipArrives(campaign: Campaign, world: string): Campaign {
  const ship = groupShip(campaign);
  if (!ship) return campaign;
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id ? { ...s, place: worldPlace(world) } : s)) };
}
