// Die Fahrt über die Oberfläche einer Welt (Domänenmodell: Trip, Leg, TripDay; siehe
// docs/modell/logistik.md, *Fahrt*): die schnellste Route suchen, sie Tag für Tag abfahren, abbrechen.
// Eigene Fahrzeuge, die nicht mitfahren, bleiben stehen (Possession.parked).

import type { Campaign, Possession } from './campaign';
import { livingCharacters, possessionKey } from './campaign';
import { DomainError } from './errors';
import type { TripDay } from './log';
import { placeCell, withPlaceTerrain, type Place } from './place';
import type { Clock } from './ports';
import { itemOf, ref } from './reference';
import { gridSize, worldOf, type NamedWorld } from './sector';
import type { Booking } from './shop';
import { surfaceGrid, type SurfaceGrid } from './surface-grid';
import type { SurfaceMap } from './surface-map';
import { dayOf } from './time';
import { afterTime } from './upkeep';
import { distanceKm, flies, landsAt, orbitOnly, radiusKm, stepSpeed, vehicleOf, vehicleOfItem, vehicles, WALK, waysOf, worksIn, scheduled, type Vehicle, type Ways } from './vehicle';
import { shipDesignOf } from './reference';
import { gravityOf } from './star-system';

/** Ein Abschnitt der Fahrt: ein Fahrzeug, gemietet oder nicht, über Felder in Reihenfolge (ein Flug nur Start und Landepunkt). */
export interface Leg {
  /** Verweis auf das Fahrzeug. */
  readonly by: string;
  readonly rented: boolean;
  readonly cells: readonly number[];
  /**
   * Der Abschnitt beginnt (`start`) bzw. endet (`end`) am Highport (2026-11-28b); sein einziges Feld
   * ist das Feld, an dem er vom Boden abhebt bzw. aufsetzt.
   */
  readonly highport?: 'start' | 'end';
}

/** Die Fahrt der Gruppe auf der Welt ihres Aufenthaltsorts; `hours` sind die schon gefahrenen Stunden. */
export interface Trip {
  readonly hours: number;
  readonly legs: readonly Leg[];
}

/** Fahrstunden je Reisetag (Hausregel). */
export const TRIP_HOURS_PER_DAY = ref.houseRules.tripHoursPerDay;
/** Miete je Tag in Prozent des Kaufpreises (Hausregel). */
export const RENT_PERCENT = ref.houseRules.rentPercent;

const EPS = 1e-9;
/** Ein Fahrzeugwechsel kostet in der Suche ein wenig, damit sie nicht grundlos wechselt. */
const SWITCH_HOURS = 0.01;
/** Wie viele Siedlungen nahe am Ziel als Landepunkte zählen. */
const LANDING_TOWNS = 30;

/** Die Oberfläche, auf der die Gruppe fährt: die Welt ihres Aufenthaltsorts mit Karte. */
export interface TripSurface {
  readonly world: string;
  readonly hex: NamedWorld;
  readonly map: SurfaceMap;
  readonly grid: SurfaceGrid;
  readonly size: number;
  readonly ways: Ways;
  readonly atmosphere: number;
  readonly tech: number;
}

/** Die Oberfläche des Aufenthaltsorts; ohne Welt mit Karte keine. */
export function tripSurface(campaign: Campaign): TripSurface | undefined {
  const world = campaign.location?.world;
  if (world === undefined) return undefined;
  const hex = worldOf(campaign.hexes, world);
  const size = gridSize(hex) ?? 0;
  if (!hex.map || size < 1) return undefined;
  return { world, hex, map: hex.map, grid: surfaceGrid(size), size, ways: waysOf(hex.map), atmosphere: hex.uwp.atmosphere ?? 0, tech: hex.uwp.tech ?? 0 };
}

function surfaceFor(campaign: Campaign): TripSurface {
  const surface = tripSurface(campaign);
  if (!surface) throw new DomainError('Die Gruppe ist auf keiner Welt mit Oberflächenkarte.');
  return surface;
}

/** Der Ort eines Feldes: die Stadt darauf, sonst das Feld. */
export function placeAtCell(surface: TripSurface, cell: number): Place {
  const city = surface.ways.cityAt.get(cell);
  return city === undefined ? { world: surface.world, cell } : { world: surface.world, city };
}

/** Die Dauer eines Schritts bzw. Flugs in Stunden; Infinity, wenn er nicht geht. */
function hoursBetween(surface: TripSurface, vehicle: Vehicle, a: number, b: number): number {
  const km = distanceKm(surface.grid, surface.size, a, b);
  if (flies(vehicle)) return km / vehicle.flight!;
  const speed = stepSpeed(vehicle, surface.map, surface.ways, a, b);
  return speed > 0 ? km / speed : Infinity;
}

/** Ein Welttag in Sekunden (Hausregel 2026-11-28b: jede Welt dreht sich in 24 Stunden). */
const WORLD_DAY_S = 24 * 3600;

/**
 * Die Höhe des Highports über dem Boden in km (2026-11-28b): die geostationäre Bahn
 * `∛(g × R² × T² / 4π²)` weniger den Weltradius, mit der Schwerkraft der Welt und einem Tag von 24 Stunden.
 */
export function highportAltitudeKm(surface: TripSurface): number {
  const r = radiusKm(surface.size) * 1000;
  const g = gravityOf(surface.hex) * 9.81;
  const orbit = Math.cbrt((g * r * r * WORLD_DAY_S * WORLD_DAY_S) / (4 * Math.PI * Math.PI));
  return Math.max(0, orbit - r) / 1000;
}

/**
 * Die Flugzeit zwischen Boden und Highport in Stunden (2026-11-28b): mit dem Schub eines Small Craft
 * die halbe Strecke beschleunigen und die andere bremsen, `2 × √(Strecke / Beschleunigung)`, ohne
 * Schwerkraft gerechnet; sonst Strecke durch die Fluggeschwindigkeit.
 */
export function orbitHours(surface: TripSurface, vehicle: Vehicle): number {
  const km = highportAltitudeKm(surface);
  if (vehicle.craft !== undefined) return (2 * Math.sqrt((km * 1000) / (shipDesignOf(vehicle.craft).maneuver * 9.81))) / 3600;
  return vehicle.flight === undefined ? Infinity : km / vehicle.flight;
}

/** Der Ort des Highports der Welt, auf der gefahren wird; ohne Highport keiner. */
export function highportPlace(surface: TripSurface): Place | undefined {
  return surface.map.highport === undefined ? undefined : { world: surface.world, city: surface.map.highport };
}

/** Steht die Gruppe am Highport ihrer Welt? */
export function atHighport(campaign: Campaign): boolean {
  const surface = tripSurface(campaign);
  return surface?.map.highport !== undefined && campaign.location?.city === surface.map.highport;
}

/** `Leg./hours`: die Fahrstunden eines Abschnitts. */
export function legHours(surface: TripSurface, leg: Leg): number {
  const vehicle = vehicleOf(leg.by);
  if (leg.highport !== undefined) return orbitHours(surface, vehicle);
  if (flies(vehicle)) return hoursBetween(surface, vehicle, leg.cells[0]!, leg.cells.at(-1)!);
  let total = 0;
  for (let i = 1; i < leg.cells.length; i++) total += hoursBetween(surface, vehicle, leg.cells[i - 1]!, leg.cells[i]!);
  return total;
}

/** `Trip./totalHours`. */
export function totalHours(surface: TripSurface, trip: Trip): number {
  return trip.legs.reduce((sum, leg) => sum + legHours(surface, leg), 0);
}

/** `Trip./days`: wie viele Reisetage die ganze Fahrt braucht. */
export function tripDays(surface: TripSurface, trip: Trip): number {
  return Math.ceil(totalHours(surface, trip) / TRIP_HOURS_PER_DAY - EPS);
}

/** Die Reisetage, die noch fehlen. */
export function daysLeft(surface: TripSurface, trip: Trip): number {
  return Math.ceil((totalHours(surface, trip) - trip.hours) / TRIP_HOURS_PER_DAY - EPS);
}

/** `Leg./rent`: die Miete je Tag; nur gemietete Abschnitte kosten etwas. */
export function legRent(leg: Leg): number {
  if (!leg.rented) return 0;
  const item = vehicleOf(leg.by).item;
  return Math.round(((item === undefined ? 0 : (itemOf(item).price ?? 0)) * RENT_PERCENT) / 100);
}

/** Wie viele Personen den Fahrpreis zahlen: alle lebenden SC. */
export function farePayers(campaign: Campaign): number {
  return livingCharacters(campaign).length;
}

/** `Leg./fare`: der Fahrpreis eines Abschnitts im Linienverkehr, je Person und Fahrstunde; sonst 0. */
export function legFare(surface: TripSurface, leg: Leg, persons: number): number {
  const fare = vehicleOf(leg.by).fare;
  return fare === undefined ? 0 : Math.round(fare * persons * legHours(surface, leg));
}

/** Der Fahrpreis der Abschnitte im Linienverkehr, die in den Fahrstunden von `from` bis `to` beginnen. */
export function fareBetween(surface: TripSurface, trip: Trip, from: number, to: number, persons: number): number {
  const times = legTimes(surface, trip);
  return trip.legs.reduce((sum, leg, i) => {
    const start = times[i]![0];
    return start >= from - EPS && start < to - EPS ? sum + legFare(surface, leg, persons) : sum;
  }, 0);
}

/** Der Fahrpreis der ganzen (restlichen) Fahrt. */
export function totalFare(surface: TripSurface, trip: Trip, persons: number): number {
  return fareBetween(surface, trip, trip.hours, totalHours(surface, trip), persons);
}

/** Wann jeder Abschnitt beginnt und endet, in Fahrstunden ab dem Start. */
function legTimes(surface: TripSurface, trip: Trip): readonly (readonly [number, number])[] {
  let t = 0;
  return trip.legs.map((leg) => {
    const start = t;
    t += legHours(surface, leg);
    return [start, t] as const;
  });
}

/** Die Miete für die Fahrstunden von `from` bis `to`: je gemietetem Abschnitt, der darin gefahren wird, eine Tagesmiete. */
export function rentBetween(surface: TripSurface, trip: Trip, from: number, to: number): number {
  const times = legTimes(surface, trip);
  return trip.legs.reduce((sum, leg, i) => {
    const [start, end] = times[i]!;
    return Math.min(end, to) - Math.max(start, from) > EPS ? sum + legRent(leg) : sum;
  }, 0);
}

/** Was die ganze Fahrt an Miete kostet, Tag für Tag gerechnet. */
export function totalRent(surface: TripSurface, trip: Trip): number {
  const total = totalHours(surface, trip);
  let sum = 0;
  for (let h = trip.hours; h < total - EPS; h += TRIP_HOURS_PER_DAY) sum += rentBetween(surface, trip, h, Math.min(h + TRIP_HOURS_PER_DAY, total));
  return sum;
}

/** `Trip./at`: das letzte ganz erreichte Feld nach `hours` Fahrstunden, mit dem Abschnitt, in dem die Gruppe ist. */
export function positionAt(surface: TripSurface, trip: Trip, hours = trip.hours): { readonly cell: number; readonly leg: number } {
  let t = 0;
  let at = { cell: trip.legs[0]!.cells[0]!, leg: 0 };
  for (let l = 0; l < trip.legs.length; l++) {
    const leg = trip.legs[l]!;
    const vehicle = vehicleOf(leg.by);
    if (leg.highport !== undefined) {
      // Unterwegs zum oder vom Highport bleibt der Standort das Feld des Abschnitts (2026-11-28b).
      t += orbitHours(surface, vehicle);
      if (t > hours + EPS) return { cell: leg.cells[0]!, leg: l };
      at = { cell: leg.cells[0]!, leg: l };
      continue;
    }
    const steps = flies(vehicle) ? [leg.cells[0]!, leg.cells.at(-1)!] : leg.cells;
    for (let i = 1; i < steps.length; i++) {
      t += hoursBetween(surface, vehicle, steps[i - 1]!, steps[i]!);
      if (t > hours + EPS) return at;
      at = { cell: steps[i]!, leg: l };
    }
  }
  return at;
}

/** Die eigenen Fahrzeuge im Gruppengepäck: unterwegs mit der Gruppe oder abgestellt. */
function ownVehicles(campaign: Campaign): readonly Possession[] {
  return campaign.stash.filter((p) => vehicleOfItem(p.of) !== undefined);
}

interface Mode {
  readonly vehicle: Vehicle;
  readonly rented: boolean;
  /** Wo man das Fahrzeug bekommt: ein Feld (eigenes) oder jede Siedlung (gemietet); zu Fuß überall. */
  readonly source: number | 'town' | 'anywhere';
}

/** Die Wahl beim Planen: ob die App Fahrzeuge mieten darf. */
export interface PlanOptions {
  readonly rent: boolean;
  /** Nur dieses Fahrzeug mieten (für die Varianten der Planung); fehlt: jedes, das geht. */
  readonly only?: string;
  /**
   * Wägt Zeit gegen Miete ab: so viele Cr ist eine Fahrstunde wert. Eine Stunde in einem gemieteten
   * Fahrzeug zählt dann 1 + (Miete je Stunde / `hourValue`) Stunden; fehlt der Wert, zählt nur die Zeit.
   */
  readonly hourValue?: number;
  /** Ob der Linienverkehr mitfahren darf. */
  readonly scheduled?: boolean;
}

/** Die Gewichte für die gemischten Varianten: wie viele Cr eine Fahrstunde wert ist. */
const HOUR_VALUES = [3, 30, 300, 3000] as const;

/** Der Linienverkehr auf dieser Welt: ab seinem TL, wo die Atmosphäre reicht. */
export function scheduledVehicles(surface: TripSurface): readonly Vehicle[] {
  return vehicles.filter((v) => scheduled(v) && !orbitOnly(v) && (v.tl ?? 0) <= surface.tech && worksIn(v, surface.atmosphere));
}

/** Der Linienverkehr zum Highport (das Shuttle): nur, wo die Welt einen hat. */
export function shuttles(surface: TripSurface): readonly Vehicle[] {
  return surface.map.highport === undefined ? [] : vehicles.filter((v) => scheduled(v) && orbitOnly(v));
}

/** Die Fahrzeuge, die man auf dieser Welt mieten kann: in Siedlungen, bis zum TL der Welt, wo die Atmosphäre reicht. */
export function rentableVehicles(surface: TripSurface): readonly Vehicle[] {
  return vehicles.filter((v) => v.item !== undefined && (itemOf(v.item).tl ?? 0) <= surface.tech && worksIn(v, surface.atmosphere));
}

/** Was man mieten kann und die Kasse wenigstens für einen Tag hergibt. */
function affordableRentals(campaign: Campaign, surface: TripSurface): readonly Vehicle[] {
  const funds = campaign.bookings.reduce((sum, b) => sum + b.amount, 0);
  return rentableVehicles(surface).filter((v) => legRent({ by: v.id, rented: true, cells: [] }) <= funds);
}

/**
 * Die Varianten einer Route, wie bei einer Karten-App (siehe modell/logistik.md, *Fahrt*, Planen): ohne
 * Miete (zu Fuß und eigene Fahrzeuge), je mietbarem Fahrzeug die schnellste Route damit und gemischte,
 * die Zeit gegen Miete abwägen. Je Fahrzeugfolge bleibt die schnellste; die schnellste zuerst.
 */
export function planOptions(campaign: Campaign, target: number | 'highport'): readonly Trip[] {
  if (target === 'highport' || atHighport(campaign)) return orbitOptions(campaign, target);
  return groundOptions(campaign, target);
}

/** Wie viele Häfen das Shuttle beim Planen höchstens prüft: die nächsten. */
const SHUTTLE_PORTS = 3;

/**
 * Die Varianten zum oder vom Highport (2026-11-28b): mit einem eigenen Grav-Fahrzeug, das den Orbit
 * erreicht, direkt; mit dem Shuttle über eine der nächsten Städte mit passendem Hafen, dazu die
 * Route am Boden wie sonst.
 */
function orbitOptions(campaign: Campaign, target: number | 'highport'): readonly Trip[] {
  const surface = surfaceFor(campaign);
  const hp = surface.map.highport;
  if (hp === undefined) throw new DomainError('Diese Welt hat keinen Highport.');
  const up = target === 'highport';
  const here = atHighport(campaign);
  if (up && here) throw new DomainError('Die Gruppe ist schon am Highport.');
  if (campaign.encounters.some((e) => !e.ended)) throw new DomainError('Während einer laufenden Begegnung fährt man nicht.');
  const start = startCell(campaign);
  if (up && start === undefined) throw new DomainError('Erst die Gruppe auf ein Feld oder in eine Stadt setzen.');
  const found: Trip[] = [];
  // Eigene Fahrzeuge, die den Orbit erreichen: dabei oder dort abgestellt, wo die Gruppe steht.
  for (const p of ownVehicles(campaign)) {
    const vehicle = vehicleOfItem(p.of)!;
    if (vehicle.orbit !== true || !worksIn(vehicle, surface.atmosphere)) continue;
    const there = p.parked === undefined || (p.parked.world === surface.world && (here ? p.parked.city === hp : placeCell(campaign.hexes, p.parked) === start));
    if (!there) continue;
    if (up) found.push({ hours: 0, legs: [{ by: vehicle.id, rented: false, cells: [start!], highport: 'end' }] });
    else if (landsAt(vehicle, surface.map, surface.ways, target)) found.push({ hours: 0, legs: [{ by: vehicle.id, rented: false, cells: [target], highport: 'start' }] });
  }
  // Das Shuttle über die nächsten Häfen, an denen es landet.
  const near = up ? start! : target;
  for (const shuttle of shuttles(surface)) {
    const ports = [...surface.ways.cityAt.keys()].filter((c) => landsAt(shuttle, surface.map, surface.ways, c));
    ports.sort((a, b) => distanceKm(surface.grid, surface.size, a, near) - distanceKm(surface.grid, surface.size, b, near));
    for (const port of ports.slice(0, SHUTTLE_PORTS)) {
      const flight: Leg = { by: shuttle.id, rented: false, cells: [port], highport: up ? 'end' : 'start' };
      if (port === near) {
        found.push({ hours: 0, legs: [flight] });
        continue;
      }
      try {
        for (const ground of groundOptions(campaign, up ? port : target, up ? undefined : port)) found.push({ hours: 0, legs: up ? [...ground.legs, flight] : [flight, ...ground.legs] });
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
      }
    }
  }
  if (found.length === 0) throw new DomainError(up ? 'Zum Highport gibt es von hier keinen Weg.' : 'Vom Highport gibt es dorthin keinen Weg.');
  return bestOptions(campaign, surface, found);
}

/** Die Varianten am Boden; `from` ist der Start, wenn er nicht das Feld der Gruppe ist (nach dem Shuttle). */
function groundOptions(campaign: Campaign, target: number, from?: number): readonly Trip[] {
  const surface = surfaceFor(campaign);
  const found: Trip[] = [];
  let firstError: unknown;
  const attempt = (options: PlanOptions) => {
    try {
      found.push(planTrip(campaign, target, options, from));
    } catch (error) {
      if (!(error instanceof DomainError)) throw error;
      firstError ??= error;
    }
  };
  attempt({ rent: false });
  for (const vehicle of affordableRentals(campaign, surface)) attempt({ rent: true, only: vehicle.id });
  // Linienverkehr: zu Fuß und mit eigenen Fahrzeugen zum Flughafen, Linienflug, weiter.
  if (scheduledVehicles(surface).length > 0) attempt({ rent: false, scheduled: true });
  // Gemischte Varianten: mehrere Fahrzeuge nacheinander, wo es sich lohnt (Auto bis zum Fluss, dann Boot).
  for (const hourValue of HOUR_VALUES) attempt({ rent: true, scheduled: true, hourValue });
  if (found.length === 0) throw firstError instanceof DomainError ? firstError : new DomainError('Dorthin gibt es keinen Weg.');
  return bestOptions(campaign, surface, found);
}

/** Je Fahrzeugfolge nur die schnellste Variante; eigene Fahrzeuge zuerst, sonst die schnellste. */
function bestOptions(campaign: Campaign, surface: TripSurface, found: readonly Trip[]): readonly Trip[] {
  // Je Fahrzeugfolge (z. B. Ground Car › Helicopter) nur die schnellste Variante.
  const key = (t: Trip) => t.legs.map((l) => `${l.by}${l.rented ? '*' : ''}`).filter((k, i, all) => i === 0 || all[i - 1] !== k).join('>');
  const persons = farePayers(campaign);
  const scored = found.map((trip) => ({ trip, hours: totalHours(surface, trip), rent: totalRent(surface, trip) + totalFare(surface, trip, persons) }));
  const best = new Map<string, (typeof scored)[number]>();
  for (const s of scored) {
    const had = best.get(key(s.trip));
    if (!had || s.hours < had.hours - EPS || (Math.abs(s.hours - had.hours) <= EPS && s.rent < had.rent)) best.set(key(s.trip), s);
  }
  // Varianten mit eigenen Fahrzeugen zuerst (Owner, 15. November 2026), sonst die schnellste zuerst.
  const own = (t: Trip) => (t.legs.some((l) => usesOwnVehicle(l)) ? 0 : 1);
  return [...best.values()].sort((a, b) => own(a.trip) - own(b.trip) || a.hours - b.hours || a.rent - b.rent).map((s) => s.trip);
}

/** Ob ein Abschnitt ein eigenes Fahrzeug fährt (nicht zu Fuß, nicht gemietet, kein Linienverkehr). */
export function usesOwnVehicle(leg: Leg): boolean {
  return !leg.rented && leg.by !== WALK.id && !scheduled(vehicleOf(leg.by));
}

/** Ein eigenes Fahrzeug, das auf einer Fahrt stehen bleibt: der Gegenstand, wie viele und wo. */
export interface LeftBehind {
  readonly item: string;
  readonly count: number;
  readonly place: Place;
}

/**
 * Welche eigenen Fahrzeuge die Gruppe auf dieser Fahrt zurücklässt: Was nicht mitfährt, bleibt am
 * Anfang des Abschnitts stehen, in dem die Gruppe wechselt (siehe *Eigene Fahrzeuge bleiben stehen*).
 * Gerechnet wird ab den schon gefahrenen Stunden; ein Fahrzeug, das unterwegs wieder abgeholt wird, zählt nicht.
 */
export function leftBehind(campaign: Campaign, trip: Trip): readonly LeftBehind[] {
  const surface = surfaceFor(campaign);
  const times = legTimes(surface, trip);
  let after = campaign;
  trip.legs.forEach((leg, i) => {
    if (times[i]![0] >= trip.hours - EPS) after = settleVehiclesAt(after, surface, leg);
  });
  const before = new Map(campaign.stash.map((p) => [possessionKey(p), p.count]));
  return after.stash.flatMap((p) => {
    if (p.parked === undefined) return [];
    const count = p.count - (before.get(possessionKey(p)) ?? 0);
    return count > 0 ? [{ item: p.of, count, place: p.parked }] : [];
  });
}

/** Das Feld, auf dem die Gruppe steht; ohne Feld (nur die Welt oder eine Orbitalstadt) keins. */
export function startCell(campaign: Campaign): number | undefined {
  return placeCell(campaign.hexes, campaign.location);
}

/** Ein kleiner Binärheap nach Kosten. */
class Heap {
  private readonly ids: number[] = [];
  private readonly costs: number[] = [];
  get size(): number {
    return this.ids.length;
  }
  push(id: number, cost: number): void {
    const ids = this.ids;
    const costs = this.costs;
    let i = ids.length;
    ids.push(id);
    costs.push(cost);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (costs[parent]! <= cost) break;
      ids[i] = ids[parent]!;
      costs[i] = costs[parent]!;
      i = parent;
    }
    ids[i] = id;
    costs[i] = cost;
  }
  pop(): number {
    const ids = this.ids;
    const costs = this.costs;
    const top = ids[0]!;
    const lastId = ids.pop()!;
    const lastCost = costs.pop()!;
    if (ids.length > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= ids.length) break;
        const r = l + 1;
        const c = r < ids.length && costs[r]! < costs[l]! ? r : l;
        if (costs[c]! >= lastCost) break;
        ids[i] = ids[c]!;
        costs[i] = costs[c]!;
        i = c;
      }
      ids[i] = lastId;
      costs[i] = lastCost;
    }
    return top;
  }
}

/**
 * Sucht die schnellste Route vom Feld der Gruppe zu `target` auf derselben Welt (siehe
 * modell/logistik.md, *Fahrt*, Planen): zu Fuß, mit eigenen Fahrzeugen dort, wo sie sind, und, wenn
 * erlaubt, mit gemieteten aus Siedlungen. Fluggeräte fliegen gerade von Landepunkt zu Landepunkt.
 * Ergebnis ist eine Fahrt mit null gefahrenen Stunden.
 */
export function planTrip(campaign: Campaign, target: number, options: PlanOptions, from?: number): Trip {
  const surface = surfaceFor(campaign);
  const start = from ?? startCell(campaign);
  if (start === undefined) throw new DomainError('Erst die Gruppe auf ein Feld oder in eine Stadt setzen.');
  if (!Number.isInteger(target) || target < 0 || target >= surface.grid.cells) throw new DomainError('Dieses Feld gibt es nicht.');
  if (target === start) throw new DomainError('Die Gruppe ist schon hier.');
  if (campaign.encounters.some((e) => !e.ended)) throw new DomainError('Während einer laufenden Begegnung fährt man nicht.');

  const modes: Mode[] = [{ vehicle: WALK, rented: false, source: 'anywhere' }];
  for (const p of ownVehicles(campaign)) {
    const vehicle = vehicleOfItem(p.of)!;
    if (!worksIn(vehicle, surface.atmosphere)) continue;
    const cell = p.parked === undefined ? start : p.parked.world === surface.world ? placeCell(campaign.hexes, p.parked) : undefined;
    if (cell !== undefined) modes.push({ vehicle, rented: false, source: cell });
  }
  if (options.rent) for (const vehicle of affordableRentals(campaign, surface)) if (options.only === undefined || vehicle.id === options.only) modes.push({ vehicle, rented: true, source: 'town' });
  // Den Linienflug nimmt man, wo er abfliegt: in einer Stadt mit passendem Hafen (das prüft der Flug).
  if (options.scheduled) for (const vehicle of scheduledVehicles(surface)) modes.push({ vehicle, rented: false, source: 'anywhere' });

  const n = surface.grid.cells;
  // Je Fahrzeug, wie schwer eine Stunde in der Suche wiegt: gemietet mit der Miete je Stunde abgewogen.
  const persons = farePayers(campaign);
  const costPerHour = (m: Mode) => (m.rented ? legRent({ by: m.vehicle.id, rented: true, cells: [] }) / TRIP_HOURS_PER_DAY : (m.vehicle.fare ?? 0) * persons);
  const weight = modes.map((m) => (options.hourValue !== undefined ? 1 + costPerHour(m) / options.hourValue : 1));
  const towns = surface.ways.town;
  // Landepunkte: das Ziel, die Siedlungen nahe am Ziel (zum Umsteigen auf das letzte Stück), Start und abgestellte eigene Fahrzeuge.
  const nearTarget = [...towns].sort((a, b) => distanceKm(surface.grid, surface.size, a, target) - distanceKm(surface.grid, surface.size, b, target)).slice(0, LANDING_TOWNS);
  const landing = [...new Set([target, ...nearTarget, start, ...modes.flatMap((m) => (typeof m.source === 'number' ? [m.source] : []))])];
  // Zustand: Feld, Fahrzeug und ob schon geflogen wurde; höchstens ein Flug je Route.
  const M = modes.length;
  const cost = new Float64Array(n * M * 2).fill(Infinity);
  const prev = new Int32Array(n * M * 2).fill(-1);
  const heap = new Heap();
  const reach = (state: number, c: number, from: number) => {
    if (c < cost[state]! - EPS) {
      cost[state] = c;
      prev[state] = from;
      heap.push(state, c);
    }
  };
  const available = (m: Mode, cell: number) => m.source === 'anywhere' || (m.source === 'town' ? towns.has(cell) : m.source === cell);
  cost[start] = 0;
  heap.push(start, 0);
  let found = -1;
  while (heap.size > 0) {
    const state = heap.pop();
    const c = cost[state]!;
    const cell = state % n;
    const layer = Math.floor(state / n);
    const m = layer % M;
    const flown = layer >= M ? M : 0;
    if (cell === target) {
      found = state;
      break;
    }
    const mode = modes[m]!;
    // Wechseln: auf ein anderes Fahrzeug, das es hier gibt.
    modes.forEach((other, o) => {
      if (o !== m && available(other, cell) && !(flown && flies(other.vehicle))) reach((flown + o) * n + cell, c + SWITCH_HOURS, state);
    });
    if (flies(mode.vehicle)) {
      // Fliegen: nur von einem Landepunkt, und nur dort, wo man das Fluggerät bekommen hat.
      if (!available(mode, cell) || !landsAt(mode.vehicle, surface.map, surface.ways, cell)) continue;
      for (const d of landing) {
        if (d !== cell && landsAt(mode.vehicle, surface.map, surface.ways, d)) reach(M * n + d, c + hoursBetween(surface, mode.vehicle, cell, d) * weight[m]!, state);
      }
    } else {
      for (const q of surface.grid.neighbors[cell]!) {
        const h = hoursBetween(surface, mode.vehicle, cell, q);
        if (h < Infinity) reach(layer * n + q, c + h * weight[m]!, state);
      }
    }
  }
  if (found < 0) throw new DomainError('Dorthin gibt es mit diesen Fahrzeugen keinen Weg.');

  const path: number[] = [];
  for (let s = found; s >= 0; s = prev[s]!) path.push(s);
  path.reverse();
  const legs: { mode: number; cells: number[] }[] = [];
  let current = { mode: 0, cells: [start] };
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1]!, path[i]!];
    const [am, bm, bc] = [Math.floor(a / n) % M, Math.floor(b / n) % M, b % n];
    if (am === bm) current.cells.push(bc);
    else if (a % n === bc) {
      legs.push(current);
      current = { mode: bm, cells: [bc] };
    } else {
      // Gelandet: Der Flug endet hier, weiter geht es zu Fuß oder mit einem Wechsel.
      current.cells.push(bc);
      legs.push(current);
      current = { mode: bm, cells: [bc] };
    }
  }
  legs.push(current);
  const merged: Leg[] = [];
  for (const { mode, cells } of legs) {
    if (cells.length < 2) continue;
    const leg: Leg = { by: modes[mode]!.vehicle.id, rented: modes[mode]!.rented, cells };
    const last = merged.at(-1);
    if (last && last.by === leg.by && last.rented === leg.rented && !flies(vehicleOf(leg.by)) && last.cells.at(-1) === cells[0]) merged[merged.length - 1] = { ...last, cells: [...last.cells, ...cells.slice(1)] };
    else merged.push(leg);
  }
  return { hours: 0, legs: merged };
}

/** Prüft eine Fahrt gegen die Karte: Abschnitte schließen aneinander an, jeder Schritt geht, Flüge landen auf Landepunkten. */
export function checkTrip(campaign: Campaign, trip: Trip): void {
  const surface = surfaceFor(campaign);
  if (trip.legs.length === 0) throw new DomainError('Eine Fahrt hat mindestens einen Abschnitt.');
  trip.legs.forEach((leg, i) => {
    const vehicle = vehicleOf(leg.by);
    if (leg.highport !== undefined) {
      // Zum oder vom Highport (2026-11-28b): ein Feld, nur am Anfang bzw. Ende, nur mit einem Fahrzeug, das den Orbit erreicht.
      if (surface.map.highport === undefined) throw new DomainError('Diese Welt hat keinen Highport.');
      if (vehicle.orbit !== true) throw new DomainError(`${vehicle.name} erreicht den Orbit nicht.`);
      if (leg.cells.length !== 1 || !Number.isInteger(leg.cells[0]) || leg.cells[0]! < 0 || leg.cells[0]! >= surface.grid.cells) throw new DomainError('Ein Abschnitt zum Highport hat genau ein Feld.');
      if ((leg.highport === 'start' && i !== 0) || (leg.highport === 'end' && i !== trip.legs.length - 1)) throw new DomainError('Zum Highport geht es nur am Anfang oder Ende einer Fahrt.');
      if (i > 0 && trip.legs[i - 1]!.cells.at(-1) !== leg.cells[0]) throw new DomainError('Die Abschnitte der Fahrt schließen nicht aneinander an.');
      if (orbitOnly(vehicle) && !landsAt(vehicle, surface.map, surface.ways, leg.cells[0]!)) throw new DomainError(`${vehicle.name} landet nur an seinen Häfen.`);
      return;
    }
    if (leg.cells.length < 2 || leg.cells.some((c) => !Number.isInteger(c) || c < 0 || c >= surface.grid.cells)) throw new DomainError('Ein Abschnitt der Fahrt hat ungültige Felder.');
    if (i > 0 && trip.legs[i - 1]!.cells.at(-1) !== leg.cells[0]) throw new DomainError('Die Abschnitte der Fahrt schließen nicht aneinander an.');
    if (leg.rented && vehicle.item === undefined) throw new DomainError('Zu Fuß mietet man nicht.');
    if (flies(vehicle)) {
      if (leg.cells.length !== 2 || !landsAt(vehicle, surface.map, surface.ways, leg.cells[0]!) || !landsAt(vehicle, surface.map, surface.ways, leg.cells[1]!)) throw new DomainError(`${vehicle.name} fliegt nur von Landepunkt zu Landepunkt.`);
    } else if (legHours(surface, leg) === Infinity) throw new DomainError(`${vehicle.name} kommt auf diesem Abschnitt nicht durch.`);
  });
  if (!Number.isFinite(trip.hours) || trip.hours < 0 || trip.hours >= totalHours(surface, trip) - EPS) throw new DomainError('Die gefahrenen Stunden passen nicht zur Fahrt.');
}

/** Beginnt eine geplante Fahrt; sie beginnt am Feld der Gruppe. */
export function startTrip(campaign: Campaign, trip: Trip): Campaign {
  if (campaign.trip) throw new DomainError('Die Gruppe ist schon unterwegs.');
  const fromHighport = trip.legs[0]?.highport === 'start';
  if (trip.hours !== 0 || (fromHighport ? !atHighport(campaign) : trip.legs[0]?.cells[0] !== startCell(campaign))) throw new DomainError('Die Fahrt beginnt nicht hier.');
  checkTrip(campaign, trip);
  return { ...campaign, trip };
}

/** Bricht die Fahrt ab; die Gruppe bleibt, wo sie ist. */
export function cancelTrip(campaign: Campaign): Campaign {
  return withoutTrip(campaign);
}

/** Die Kampagne ohne Fahrt. */
export function withoutTrip(campaign: Campaign): Campaign {
  if (!campaign.trip) return campaign;
  return Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'trip')) as Omit<Campaign, 'trip'>;
}

/** Legt einen Besitz ins Gepäck zu gleichen (gleicher Gegenstand, gleicher Ort). */
function addParked(stash: readonly Possession[], possession: Possession): readonly Possession[] {
  const key = possessionKey(possession);
  const had = stash.find((p) => possessionKey(p) === key);
  return had ? stash.map((p) => (p === had ? { ...p, count: p.count + possession.count } : p)) : [...stash, possession];
}

/** Nimmt ein Stück von `from` weg und legt es als `to` ab. */
function moveOne(stash: readonly Possession[], from: Possession, to: Possession): readonly Possession[] {
  const rest = stash.flatMap((p) => (p !== from ? [p] : p.count > 1 ? [{ ...p, count: p.count - 1 }] : []));
  return addParked(rest, { ...to, count: 1 });
}

function unparked(p: Possession): Possession {
  return Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'parked')) as unknown as Possession;
}

/**
 * Am Anfang eines Abschnitts: Das eigene Fahrzeug des Abschnitts fährt mit (ein abgestelltes hier
 * wird abgeholt), alle anderen eigenen Fahrzeuge, die mit der Gruppe unterwegs sind, bleiben hier stehen.
 */
function settleVehiclesAt(campaign: Campaign, surface: TripSurface, leg: Leg): Campaign {
  // Ein Abschnitt vom Highport beginnt dort (2026-11-28b), nicht am Feld, an dem er aufsetzt.
  const fromHighport = leg.highport === 'start' ? highportPlace(surface) : undefined;
  const here = fromHighport ?? placeAtCell(surface, leg.cells[0]!);
  const cell = leg.cells[0]!;
  const isHere = (p: Possession) => p.parked !== undefined && p.parked.world === surface.world && (fromHighport ? p.parked.city === fromHighport.city : placeCell(campaign.hexes, p.parked) === cell);
  let stash = campaign.stash;
  let used: Possession | undefined;
  if (!leg.rented && leg.by !== WALK.id && !scheduled(vehicleOf(leg.by))) {
    const item = vehicleOf(leg.by).item!;
    const parkedHere = stash.find((p) => p.of === item && isHere(p));
    const withGroup = stash.find((p) => p.of === item && p.parked === undefined);
    if (parkedHere && !withGroup) {
      stash = moveOne(stash, parkedHere, unparked(parkedHere));
      used = stash.find((p) => p.of === item && p.parked === undefined);
    } else used = withGroup;
  }
  for (const p of stash.filter((q) => q.parked === undefined && vehicleOfItem(q.of) !== undefined)) {
    const keep = p === used ? 1 : 0;
    if (p.count <= keep) continue;
    const rest = stash.flatMap((q) => (q !== p ? [q] : keep > 0 ? [{ ...q, count: keep }] : []));
    stash = addParked(rest, { ...p, count: p.count - keep, parked: here });
  }
  return { ...campaign, stash };
}

/** Vor einer Reise zu einer anderen Welt: Alle eigenen Fahrzeuge, die mit der Gruppe unterwegs sind, bleiben am Aufenthaltsort. */
export function parkVehicles(campaign: Campaign): Campaign {
  const here = campaign.location;
  if (!here) return campaign;
  let stash = campaign.stash;
  for (const p of stash.filter((q) => q.parked === undefined && vehicleOfItem(q.of) !== undefined)) {
    stash = addParked(
      stash.filter((q) => q !== p),
      { ...p, parked: here },
    );
  }
  return { ...withoutTrip(campaign), stash };
}

/**
 * „Einen Tag fahren“: die Fahrstunden eines Tages oder der Rest bis zur Ankunft. Ein Reisetag im
 * Log, ein Tag weiter, der Aufenthaltsort auf dem erreichten Feld, die Miete aus der Kasse.
 */
export function driveDay(campaign: Campaign, clock: Clock): Campaign {
  const trip = campaign.trip;
  if (!trip) throw new DomainError('Die Gruppe ist nicht unterwegs.');
  if (campaign.encounters.some((e) => !e.ended)) throw new DomainError('Während einer laufenden Begegnung fährt man nicht.');
  const surface = surfaceFor(campaign);
  const total = totalHours(surface, trip);
  const from = trip.hours;
  const to = Math.min(from + TRIP_HOURS_PER_DAY, total);
  const rent = rentBetween(surface, trip, from, to);
  const fare = fareBetween(surface, trip, from, to, farePayers(campaign));
  const funds = campaign.bookings.reduce((sum, b) => sum + b.amount, 0);
  if (rent + fare > funds) throw new DomainError(`Für ${fare > 0 ? (rent > 0 ? 'Miete und Fahrpreis' : 'den Fahrpreis') : 'die Miete'} von heute (Cr${(rent + fare).toLocaleString('de-DE')}) reicht die Kasse nicht.`);

  // Eigene Fahrzeuge an jedem Abschnitt, der heute beginnt.
  let after = campaign;
  const times = legTimes(surface, trip);
  trip.legs.forEach((leg, i) => {
    const start = times[i]![0];
    if ((i === 0 && from === 0) || (start > from + EPS && start <= to + EPS)) after = settleVehiclesAt(after, surface, leg);
  });

  const arrived = to >= total - EPS;
  const cell = arrived ? trip.legs.at(-1)!.cells.at(-1)! : positionAt(surface, trip, to).cell;
  // Am Ende eines Abschnitts zum Highport ist die Gruppe dort (2026-11-28b).
  const location = (arrived && trip.legs.at(-1)!.highport === 'end' ? highportPlace(surface) : undefined) ?? placeAtCell(surface, cell);
  const today = dayOf(campaign);
  const index = after.log.length;
  const entry: TripDay = { kind: 'tripDay', at: clock.now(), day: today, place: location, hours: Math.round((to - from) * 100) / 100, rent, fare, arrived };
  const bookings: Booking[] = [
    ...(rent > 0 ? [{ at: clock.now(), kind: 'rent', amount: -rent, rentFor: index } as const] : []),
    ...(fare > 0 ? [{ at: clock.now(), kind: 'fare', amount: -fare, rentFor: index } as const] : []),
  ];
  const moved: Campaign = {
    ...after,
    location,
    day: today + 1,
    log: [...after.log, entry],
    bookings: [...after.bookings, ...bookings],
  };
  // Das Gelände der Begegnungen folgt dem erreichten Feld (2026-11-15b).
  // Und mit dem neuen Tag fallen die laufenden Kosten der Schiffe an (siehe `upkeep.ts`).
  return afterTime(withPlaceTerrain(arrived ? withoutTrip(moved) : { ...moved, trip: { ...trip, hours: to } }), today, clock);
}
