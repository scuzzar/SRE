// Fahrzeuge auf der Oberflächenkarte (Domänenmodell: Vehicle, VehicleSpeed, Way; siehe
// docs/domain-model.md, *Fahrzeuge*). Ob und wie schnell ein Fahrzeug von Feld zu Feld kommt und wo
// ein Fluggerät landet; die Fahrt selbst steht in `trip.ts`.

import type { Vehicle } from '../data';
import { ref } from './reference';
import { cosAngle, type SurfaceGrid } from './surface-grid';
import { landformAt, type SurfaceMap } from './surface-map';
import { DomainError } from './errors';

export type { Vehicle } from '../data';

/** Die Fahrzeuge in der Reihenfolge der Referenzdaten; zu Fuß zuerst. */
export const vehicles: readonly Vehicle[] = ref.vehicles;

const byId = new Map(vehicles.map((v) => [v.id, v]));
const byItem = new Map(vehicles.flatMap((v) => (v.item === undefined ? [] : [[v.item, v] as const])));

/** Zu Fuß: das Fahrzeug ohne Gegenstand, das die Gruppe immer hat. */
export const WALK: Vehicle = vehicles.find((v) => v.item === undefined)!;

export function vehicleOf(id: string): Vehicle {
  const v = byId.get(id);
  if (!v) throw new DomainError(`Das Fahrzeug ${id} gibt es nicht.`);
  return v;
}

/** `Item.vehicle`: das Fahrzeug eines Gegenstands, wenn er eins ist. */
export function vehicleOfItem(item: string): Vehicle | undefined {
  return byItem.get(item);
}

/** Ob ein Fahrzeug auf einer Welt mit dieser Atmosphäre geht. */
export function worksIn(vehicle: Vehicle, atmosphere: number): boolean {
  return vehicle.atmosphere === undefined || atmosphere >= vehicle.atmosphere;
}

/** Ein Fluggerät: Es hat eine Fluggeschwindigkeit. */
export function flies(vehicle: Vehicle): boolean {
  return vehicle.flight !== undefined;
}

/** Was eine Karte für die Wege braucht: Felder mit Siedlung, Paare benachbarter Straßen- und Flussfelder. */
export interface Ways {
  readonly town: ReadonlySet<number>;
  readonly road: ReadonlySet<string>;
  readonly river: ReadonlySet<string>;
  /** Die Stadt je Feld (Stelle in der Liste). */
  readonly cityAt: ReadonlyMap<number, number>;
}

const pair = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

const waysCache = new WeakMap<SurfaceMap, Ways>();

/** Die Wege einer Karte; einmal gerechnet, dann aus dem Speicher. */
export function waysOf(map: SurfaceMap): Ways {
  const known = waysCache.get(map);
  if (known) return known;
  const town = new Set<number>((map.towns ?? []).filter(([, n]) => n > 0).map(([cell]) => cell));
  const cityAt = new Map<number, number>();
  (map.cities ?? []).forEach((c, i) => {
    if (c.cell !== undefined) {
      town.add(c.cell);
      cityAt.set(c.cell, i);
    }
  });
  const pairs = (lines: readonly (readonly number[])[] | undefined) => {
    const set = new Set<string>();
    for (const line of lines ?? []) for (let i = 1; i < line.length; i++) set.add(pair(line[i - 1]!, line[i]!));
    return set;
  };
  const ways: Ways = { town, road: pairs(map.roads), river: pairs(map.rivers), cityAt };
  waysCache.set(map, ways);
  return ways;
}

/** Die schnellste Zeile für ein Feld (Geländeart oder Siedlung); 0 heißt: fährt dort nicht. */
export function cellSpeed(vehicle: Vehicle, map: SurfaceMap, ways: Ways, cell: number): number {
  const landform = landformAt(map, cell);
  let best = 0;
  for (const s of vehicle.speeds) {
    if (s.on === landform || (s.along === 'town' && ways.town.has(cell))) best = Math.max(best, s.kmh);
  }
  return best;
}

function alongSpeed(vehicle: Vehicle, way: 'road' | 'river'): number {
  return vehicle.speeds.reduce((best, s) => (s.along === way ? Math.max(best, s.kmh) : best), 0);
}

/**
 * Die Geschwindigkeit für einen Schritt zum Nachbarfeld: entlang Straße bzw. Fluss deren Zeile, sonst
 * die langsamere der beiden Felder; das Schnellste gilt. 0 heißt: dieser Schritt geht nicht.
 */
export function stepSpeed(vehicle: Vehicle, map: SurfaceMap, ways: Ways, a: number, b: number): number {
  const key = pair(a, b);
  let best = Math.min(cellSpeed(vehicle, map, ways, a), cellSpeed(vehicle, map, ways, b));
  if (ways.road.has(key)) best = Math.max(best, alongSpeed(vehicle, 'road'));
  if (ways.river.has(key)) best = Math.max(best, alongSpeed(vehicle, 'river'));
  return best;
}

/** Ob ein Fluggerät auf einem Feld landen kann: auf seiner Geländeart oder in einer Stadt mit passendem Hafen. */
export function landsAt(vehicle: Vehicle, map: SurfaceMap, ways: Ways, cell: number): boolean {
  if (!flies(vehicle)) return false;
  if (vehicle.landsOn.includes(landformAt(map, cell))) return true;
  const city = ways.cityAt.get(cell);
  const port = city === undefined ? undefined : map.cities?.[city]?.port;
  return port !== undefined && vehicle.landsAt.includes(port);
}

/** Der Radius einer Welt in km: Größe × 1600 km Durchmesser. */
export function radiusKm(size: number): number {
  return size * 800;
}

/** Die Entfernung zweier Felder über die Kugel, in km. */
export function distanceKm(grid: SurfaceGrid, size: number, a: number, b: number): number {
  return radiusKm(size) * Math.acos(Math.max(-1, Math.min(1, cosAngle(grid, a, b))));
}
