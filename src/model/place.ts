// Ein Ort (Domänenmodell: Place, siehe docs/domain-model.md, *Orte*): immer eine Welt, wahlweise
// genauer ein Oberflächenfeld oder eine Stadt auf ihrer Oberflächenkarte, nie beides.

import { DomainError } from './errors';
import type { Campaign } from './campaign';
import { ref } from './reference';
import { worldOf, worldById, type Hex } from './sector';
import { landformAt } from './surface-map';

export interface Place {
  /** Das Hexfeld der Welt, als Spalte und Zeile (0304). */
  readonly world: string;
  /** Ein Oberflächenfeld der Karte dieser Welt. */
  readonly cell?: number;
  /** Eine Stadt der Karte dieser Welt (Stelle in ihrer Liste). */
  readonly city?: number;
}

/** Ein Ort, der nur die Welt nennt. */
export function worldPlace(world: string): Place {
  return { world };
}

/** Die Welt eines Ortes; ohne Ort keine. */
export function placeWorld(place: Place | undefined): string | undefined {
  return place?.world;
}

/** Das Oberflächenfeld eines Ortes: das genannte Feld oder das Feld der Stadt (eine Orbitalstadt hat keins). */
export function placeCell(hexes: readonly Hex[], place: Place | undefined): number | undefined {
  if (!place) return undefined;
  if (place.cell !== undefined) return place.cell;
  if (place.city === undefined) return undefined;
  return worldById(hexes, place.world)?.map?.cities?.[place.city]?.cell;
}

/** Ob zwei Orte gleich sind. */
export function samePlace(a: Place | undefined, b: Place | undefined): boolean {
  return a?.world === b?.world && a?.cell === b?.cell && a?.city === b?.city;
}

/** Prüft einen Ort: eine fertige Welt; Feld bzw. Stadt gibt es auf ihrer Oberflächenkarte; nicht beides. */
export function checkPlace(hexes: readonly Hex[], place: Place): void {
  const world = worldOf(hexes, place.world);
  if (place.cell !== undefined && place.city !== undefined) throw new DomainError('Ein Ort ist ein Feld oder eine Stadt, nicht beides.');
  if (place.cell === undefined && place.city === undefined) return;
  const map = world.map;
  if (!map) throw new DomainError(`Die Welt ${world.name} hat keine Oberflächenkarte für diesen Ort.`);
  if (place.cell !== undefined && (!Number.isInteger(place.cell) || place.cell < 0 || place.cell >= map.landforms.length)) throw new DomainError(`Das Feld ${place.cell} gibt es auf ${world.name} nicht.`);
  if (place.city !== undefined && map.cities?.[place.city] === undefined) throw new DomainError(`Die Stadt ${place.city + 1} gibt es auf ${world.name} nicht.`);
}

/** Ob ein Ort auf ein Feld oder eine Stadt der Oberflächenkarte dieser Welt zeigt. */
export function pointsIntoMap(place: Place | undefined, world: string): boolean {
  return place !== undefined && place.world === world && (place.cell !== undefined || place.city !== undefined);
}

/** Ob die Oberflächenkarte dieser Welt gesperrt ist: Gruppe, ein NSC, ein Fahrzeug, ein Logeintrag oder eine Mission zeigt auf ein Feld oder eine Stadt darauf. */
export function mapLocked(campaign: Campaign, world: string): boolean {
  return (
    pointsIntoMap(campaign.location, world) ||
    campaign.characters.some((c) => pointsIntoMap(c.place, world)) ||
    campaign.stash.some((p) => pointsIntoMap(p.parked, world)) ||
    campaign.log.some((e) => pointsIntoMap(e.place, world)) ||
    campaign.missions.some((m) => m.places.some((p) => pointsIntoMap(p.place, world)))
  );
}

/** Versetzt die Gruppe auf der Welt, auf der sie ist, auf ein Feld oder in eine Stadt. */
export function moveParty(campaign: Campaign, place: Place): Campaign {
  if (campaign.location?.world !== place.world) throw new DomainError('Die Gruppe ist nicht auf dieser Welt; erst hinreisen.');
  checkPlace(campaign.hexes, place);
  // Von Hand versetzt: Eine Fahrt fällt weg (siehe domain-model.md, *Fahrt*).
  const rest = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'trip')) as Omit<Campaign, 'trip'>;
  return withPlaceTerrain({ ...rest, location: place });
}

/** Versetzt einen dauerhaften NSC an einen Ort; er lebt dann dort. */
export function moveNpc(campaign: Campaign, id: string, place: Place): Campaign {
  const npc = campaign.characters.find((c) => c.id === id);
  if (!npc?.npc) throw new DomainError('Nur einen dauerhaften NSC kann man versetzen.');
  checkPlace(campaign.hexes, place);
  return { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? { ...c, place } : c)) };
}

/** Die Stellen der Logeinträge, die auf dieser Welt geschahen, und, mit `cell`, auf diesem Feld (auch in einer Stadt darauf). */
export function happenedAt(campaign: Campaign, world: string, cell?: number): readonly number[] {
  const result: number[] = [];
  campaign.log.forEach((e, i) => {
    if (e.place?.world !== world) return;
    if (cell === undefined || placeCell(campaign.hexes, e.place) === cell) result.push(i);
  });
  return result;
}

/** Das Gelände der Begegnungen in einer Stadt. */
export const CITY_TERRAIN = 'city';

/**
 * Das Gelände der Begegnungen, mit dem ein Ort vorbelegt (2026-11-15b, *Gelände*): auf einem Feld mit
 * Haupt- oder Nebenstadt City, sonst das Gelände seiner Geländeart (`Landform.terrain`). Ohne Feld
 * (nur die Welt, eine Orbitalstadt) keins.
 */
export function terrainOfPlace(hexes: readonly Hex[], place: Place | undefined): string | undefined {
  const map = place === undefined ? undefined : worldById(hexes, place.world)?.map;
  const cell = placeCell(hexes, place);
  if (!map || cell === undefined) return undefined;
  if ((map.cities ?? []).some((c) => c.cell === cell)) return CITY_TERRAIN;
  return ref.encounters.landformTerrains[landformAt(map, cell)];
}

/** Belegt das Gelände der Begegnungen aus dem Aufenthaltsort vor; ohne Feld bleibt es, wie es ist. */
export function withPlaceTerrain(campaign: Campaign): Campaign {
  const terrain = terrainOfPlace(campaign.hexes, campaign.location);
  return terrain === undefined || terrain === campaign.terrain ? campaign : { ...campaign, terrain };
}
