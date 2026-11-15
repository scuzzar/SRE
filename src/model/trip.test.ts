import { describe, expect, it } from 'vitest';
import {
  book,
  cancelTrip,
  createCampaign,
  distanceKm,
  driveDay,
  fromCampaignFile,
  fundsOf,
  LANDFORM_CODES,
  legHours,
  moveParty,
  parkVehicles,
  planOptions,
  planTrip,
  positionAt,
  removeLogEntry,
  setHexes,
  setLocation,
  startTrip,
  surfaceGrid,
  toCampaignFile,
  totalHours,
  tripSurface,
  type Campaign,
  type Hex,
  type Landform,
  type SurfaceMap,
} from '.';
import { fixedClock } from './testing';

const grid = surfaceGrid(2);
const clock = fixedClock();

/** Eine Karte der Größe 2: überall offenes Land, mit Ausnahmen. */
function mapWith(landform: Readonly<Record<number, Landform>> = {}, extra: Partial<SurfaceMap> = {}): SurfaceMap {
  let landforms = '';
  for (let c = 0; c < grid.cells; c++) landforms += LANDFORM_CODES[landform[c] ?? 'open'];
  return { landforms, ...extra };
}

function world(map: SurfaceMap, tech = 8, atmosphere = 6): Hex {
  return {
    column: 1,
    row: 1,
    empty: false,
    name: 'Mora',
    navalBase: false,
    scoutBase: false,
    gasGiant: false,
    uwp: { starport: 12, size: 2, atmosphere, hydrographics: 7, population: 6, government: 4, law: 3, tech },
    temperature: 'temperate',
    surface: { water: 70, plates: 5, majorContinents: 3, minorContinents: 3, majorIslands: 4, archipelagos: 6, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true },
    populationMultiplier: 2,
    map,
  };
}

/** Eine Kette benachbarter Felder ab `from`, `length` lang, immer weiter weg. */
function chain(from: number, length: number): number[] {
  const cells = [from];
  while (cells.length < length) {
    const last = cells.at(-1)!;
    const next = grid.neighbors[last]!.filter((q) => !cells.includes(q)).sort((a, b) => distanceKm(grid, 2, from, b) - distanceKm(grid, 2, from, a))[0]!;
    cells.push(next);
  }
  return cells;
}

function campaignOn(map: SurfaceMap, cell: number, options: { tech?: number; atmosphere?: number; funds?: number } = {}): Campaign {
  let c = setLocation(setHexes(createCampaign(), [world(map, options.tech, options.atmosphere)]), '0101');
  c = moveParty(c, { world: '0101', cell });
  if (options.funds) c = book(c, 'income', options.funds, clock);
  return c;
}

const line = chain(0, 6);

describe('Route', () => {
  it('geht zu Fuß, wenn nichts anderes da ist', () => {
    const c = campaignOn(mapWith(), line[0]!);
    const trip = planTrip(c, line[2]!, { rent: false });
    expect(trip.legs.map((l) => l.by)).toEqual(['walk']);
    expect(trip.legs[0]!.cells[0]).toBe(line[0]);
    expect(trip.legs[0]!.cells.at(-1)).toBe(line[2]);
    const surface = tripSurface(c)!;
    // Offenes Land: 4 km/h.
    expect(totalHours(surface, trip)).toBeCloseTo((distanceKm(grid, 2, line[0]!, line[1]!) + distanceKm(grid, 2, line[1]!, line[2]!)) / 4, 1);
  });

  it('findet keinen Weg über Wasser zu Fuß', () => {
    const water = Object.fromEntries([...Array(grid.cells).keys()].filter((c) => c !== line[0]).map((c) => [c, 'water' as Landform]));
    const c = campaignOn(mapWith(water), line[0]!);
    expect(() => planTrip(c, line[3]!, { rent: false })).toThrow(/keinen Weg/);
  });

  it('nimmt das eigene Auto auf der Straße', () => {
    const road = line.slice(0, 5);
    const c0 = campaignOn(mapWith({}, { roads: [road] }), line[0]!);
    const c = { ...c0, stash: [{ of: 'vehicle-ground-car', count: 1 }] };
    const trip = planTrip(c, line[4]!, { rent: false });
    expect(trip.legs.map((l) => l.by)).toEqual(['ground-car']);
    expect(trip.legs[0]!.rented).toBe(false);
  });

  it('fährt mit dem Auto nicht ins offene Land: das letzte Stück zu Fuß', () => {
    const road = line.slice(0, 4);
    const c = { ...campaignOn(mapWith({}, { roads: [road] }), line[0]!), stash: [{ of: 'vehicle-ground-car', count: 1 }] };
    const trip = planTrip(c, line[4]!, { rent: false });
    expect(trip.legs.map((l) => l.by)).toEqual(['ground-car', 'walk']);
    expect(trip.legs[1]!.cells[0]).toBe(line[3]);
  });

  it('mietet in einer Siedlung einen Hubschrauber und fliegt gerade hin', () => {
    const c = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { funds: 100000 });
    const far = grid.cells - 1;
    const trip = planTrip(c, far, { rent: true });
    expect(trip.legs).toHaveLength(1);
    expect(trip.legs[0]!.rented).toBe(true);
    expect(trip.legs[0]!.cells).toEqual([line[0], far]);
    // Ohne Miete geht es nur zu Fuß.
    expect(planTrip(c, far, { rent: false }).legs.map((l) => l.by)).toEqual(['walk']);
  });

  it('mietet nur, was der TL der Welt und ihre Atmosphäre erlauben', () => {
    const far = grid.cells - 1;
    const low = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { tech: 5, funds: 100000 });
    expect(planTrip(low, far, { rent: true }).legs.every((l) => l.by !== 'helicopter' && l.by !== 'air-raft')).toBe(true);
    const thin = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { tech: 8, atmosphere: 2, funds: 100000 });
    expect(planTrip(thin, far, { rent: true }).legs.map((l) => l.by)).not.toContain('helicopter');
  });

  it('mietet nur, was die Kasse wenigstens für einen Tag hergibt', () => {
    const far = grid.cells - 1;
    // Cr1 500: der Hubschrauber (Cr1 000 je Tag) ja, Air/Raft und Speeder nicht.
    const c = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { funds: 1500 });
    expect(planTrip(c, far, { rent: true }).legs.map((l) => l.by)).toEqual(['helicopter']);
    const broke = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!);
    expect(planTrip(broke, far, { rent: true }).legs.map((l) => l.by)).toEqual(['walk']);
  });
});

describe('Varianten der Route', () => {
  it('bietet zu Fuß und je Mietfahrzeug eine Variante, die schnellste zuerst', () => {
    const road = line.slice(0, 5);
    const c = campaignOn(mapWith({}, { towns: [[line[0]!, 1]], roads: [road] }), line[0]!, { funds: 1_000_000 });
    const options = planOptions(c, line[4]!);
    const main = options.map((t) => t.legs.map((l) => `${l.by}${l.rented ? '*' : ''}`).join(' '));
    expect(main.at(-1)).toBe('walk');
    expect(main).toContain('ground-car*');
    expect(main.some((m) => m.includes('speeder*'))).toBe(true);
    expect(main.some((m) => m.includes('wheeled-atv*'))).toBe(true);
    expect(new Set(main).size).toBe(main.length);
    const surface = tripSurface(c)!;
    const hours = options.map((t) => totalHours(surface, t));
    expect([...hours].sort((a, b) => a - b)).toEqual(hours);
  });
});

describe('Fahrt Tag für Tag', () => {
  it('fährt 8 Stunden je Tag, setzt den Aufenthaltsort und kommt an', () => {
    const c0 = campaignOn(mapWith(), line[0]!);
    const trip = planTrip(c0, line[1]!, { rent: false });
    let c = startTrip(c0, trip);
    const surface = tripSurface(c)!;
    const days = Math.ceil(totalHours(surface, trip) / 8);
    expect(days).toBeGreaterThan(1);
    c = driveDay(c, clock);
    expect(c.trip?.hours).toBe(8);
    expect(c.day).toBe(c0.day + 1);
    expect(c.log.at(-1)).toMatchObject({ kind: 'tripDay', hours: 8, rent: 0, arrived: false });
    // Das Feld ist noch nicht erreicht: die Gruppe steht noch am Start.
    expect(c.location).toEqual({ world: '0101', cell: line[0] });
    for (let d = 1; d < days; d++) c = driveDay(c, clock);
    expect(c.trip).toBeUndefined();
    expect(c.location).toEqual({ world: '0101', cell: line[1] });
    expect(c.log.at(-1)).toMatchObject({ kind: 'tripDay', arrived: true });
    expect(c.day).toBe(c0.day + days);
  });

  it('bucht die Miete je Reisetag mit gemietetem Abschnitt', () => {
    const c0 = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { funds: 100000 });
    const trip = planTrip(c0, grid.cells - 1, { rent: true });
    const c = driveDay(startTrip(c0, trip), clock);
    const rent = c.bookings.at(-1)!;
    expect(rent.kind).toBe('rent');
    expect(rent.rentFor).toBe(c.log.length - 1);
    // 1 % des Kaufpreises je Tag.
    expect(-rent.amount).toBe(Math.round(({ helicopter: 100000, 'air-raft': 600000, gcarrier: 1000000, speeder: 1000000, 'grav-belt': 100000 } as Record<string, number>)[trip.legs[0]!.by]! / 100));
    expect(fundsOf(c)).toBe(100000 + rent.amount);
  });

  it('fährt nicht ohne Geld für die Miete', () => {
    const c0 = campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { funds: 100000 });
    const trip = planTrip(c0, grid.cells - 1, { rent: true });
    const broke = { ...startTrip(c0, trip), bookings: [] };
    expect(() => driveDay(broke, clock)).toThrow(/Miete/);
  });

  it('stellt das eigene Auto ab, wenn die Gruppe fliegt, und hält es beim Import', () => {
    const c0 = { ...campaignOn(mapWith({}, { towns: [[line[0]!, 1]] }), line[0]!, { funds: 100000 }), stash: [{ of: 'vehicle-ground-car', count: 1 }] };
    const trip = planTrip(c0, grid.cells - 1, { rent: true });
    expect(trip.legs[0]!.rented).toBe(true);
    const c = driveDay(startTrip(c0, trip), clock);
    expect(c.stash).toEqual([{ of: 'vehicle-ground-car', count: 1, parked: { world: '0101', cell: line[0] } }]);
    const read = fromCampaignFile(toCampaignFile(c), c.id);
    expect(read.stash).toEqual(c.stash);
    expect(read.trip).toEqual(c.trip);
  });

  it('holt ein abgestelltes Auto wieder ab', () => {
    const road = line.slice(0, 5);
    const c0 = { ...campaignOn(mapWith({}, { roads: [road] }), line[0]!), stash: [{ of: 'vehicle-ground-car', count: 1, parked: { world: '0101', cell: line[0]! } }] };
    const trip = planTrip(c0, line[4]!, { rent: false });
    expect(trip.legs.map((l) => l.by)).toEqual(['ground-car']);
    const c = driveDay(startTrip(c0, trip), clock);
    expect(c.stash).toEqual([{ of: 'vehicle-ground-car', count: 1 }]);
  });

  it('weiß, wo die Gruppe unterwegs ist, und bricht ab, wo sie ist', () => {
    const c0 = campaignOn(mapWith(), line[0]!);
    const trip = planTrip(c0, line[4]!, { rent: false });
    const surface = tripSurface(c0)!;
    const first = legHours(surface, { ...trip.legs[0]!, cells: trip.legs[0]!.cells.slice(0, 2) });
    expect(positionAt(surface, trip, first + 0.01).cell).toBe(trip.legs[0]!.cells[1]);
    let c = startTrip(c0, trip);
    while (c.trip && c.trip.hours < first) c = driveDay(c, clock);
    c = cancelTrip(c);
    expect(c.trip).toBeUndefined();
    expect(c.location?.cell).toBe(trip.legs[0]!.cells[1]);
  });

  it('lässt Reisetage nicht löschen; von Hand versetzen beendet die Fahrt', () => {
    const c0 = campaignOn(mapWith(), line[0]!);
    const c = driveDay(startTrip(c0, planTrip(c0, line[3]!, { rent: false })), clock);
    expect(() => removeLogEntry(c, c.log.length - 1)).toThrow(/Reisetag/);
    expect(moveParty(c, { world: '0101', cell: line[5]! }).trip).toBeUndefined();
  });

  it('vor einer Reise zu einer anderen Welt bleiben die Fahrzeuge am Aufenthaltsort', () => {
    const c0 = { ...campaignOn(mapWith(), line[0]!), stash: [{ of: 'vehicle-ground-car', count: 2 }] };
    expect(parkVehicles(c0).stash).toEqual([{ of: 'vehicle-ground-car', count: 2, parked: { world: '0101', cell: line[0] } }]);
  });
});
