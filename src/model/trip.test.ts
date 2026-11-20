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
  isTravelEntry,
  travelTrace,
  travelDay,
  travelCheckKind,
  groundToday,
  leftBehind,
  livingCharacters,
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
  terrainOfPlace,
  type Campaign,
  hexFromFlat,
  type Hex,
  type Landform,
  type SurfaceMap,
} from '.';
import { fixedClock, fixedRandom } from './testing';

const grid = surfaceGrid(2);
const clock = fixedClock();

/** Eine Karte der Größe 2: überall offenes Land, mit Ausnahmen. */
function mapWith(landform: Readonly<Record<number, Landform>> = {}, extra: Partial<SurfaceMap> = {}): SurfaceMap {
  let landforms = '';
  for (let c = 0; c < grid.cells; c++) landforms += LANDFORM_CODES[landform[c] ?? 'open'];
  return { landforms, ...extra };
}

function world(map: SurfaceMap, tech = 8, atmosphere = 6): Hex {
  return hexFromFlat({
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
  });
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

describe('Gelände aus dem Aufenthaltsort (2026-11-15b)', () => {
  it('folgt der Geländeart des Feldes, in der Stadt City; von Hand ändern geht bis zum nächsten Ort', () => {
    const map = mapWith({ [line[1]!]: 'mountain', [line[2]!]: 'water' }, { cities: [{ cell: line[3]!, name: 'Ora', population: 5, multiplier: 2, rank: 'primary', port: 'C' }] });
    let c = campaignOn(map, line[1]!);
    expect(c.terrain).toBe('mountain');
    expect(terrainOfPlace(c.hexes, { world: '0101', cell: line[2]! })).toBe('maritime-surface');
    expect(terrainOfPlace(c.hexes, { world: '0101', cell: line[3]! })).toBe('city');
    expect(terrainOfPlace(c.hexes, { world: '0101', city: 0 })).toBe('city');
    expect(terrainOfPlace(c.hexes, { world: '0101' })).toBeUndefined();
    c = { ...c, terrain: 'ruins' };
    c = moveParty(c, { world: '0101', cell: line[0]! });
    expect(c.terrain).toBe('forest');
    // Unterwegs folgt das Gelände dem erreichten Feld.
    let t = startTrip(c, planTrip(c, line[1]!, { rent: false }));
    while (t.trip) t = driveDay(t, clock);
    expect(t.terrain).toBe('mountain');
  });
});

describe('Gemischte Varianten', () => {
  it('mietet nacheinander Auto, Boot und wieder Auto, wo das schneller ist als zu Fuß', () => {
    // Straße bis zum Hafen, sonst überall Wasser, drüben ein Hafen und eine Straße zum Ziel.
    const land = new Set([line[0]!, line[1]!, line[4]!, line[5]!]);
    const water = Object.fromEntries([...Array(grid.cells).keys()].filter((q) => !land.has(q)).map((q) => [q, 'water' as Landform]));
    const map = mapWith(water, { towns: [[line[0]!, 1], [line[1]!, 1], [line[4]!, 1]].sort((p, q) => p[0]! - q[0]!) as [number, number][], roads: [[line[0]!, line[1]!], [line[4]!, line[5]!]] });
    // TL 5: kein Hubschrauber, nur Auto, Boot und (ohne Flugplatz) kein Flugzeug.
    const c = campaignOn(map, line[0]!, { tech: 5, funds: 1_000_000 });
    const options = planOptions(c, line[5]!);
    // Mit TL 6 lohnt das teure Boot nie: gemischt heißt dann Auto, Hubschrauber, Auto.
    const air = planOptions(campaignOn(map, line[0]!, { tech: 6, funds: 1_000_000 }), line[5]!).map((t) => t.legs.filter((l) => l.rented).map((l) => l.by).join(' '));
    expect(air).toContain('ground-car helicopter ground-car');
    const kinds = options.map((t) => t.legs.filter((l) => l.rented).map((l) => l.by));
    expect(kinds.some((k) => k.includes('ground-car') && k.includes('motor-boat'))).toBe(true);
    // Ohne Boot oder Fluggerät kommt man nicht übers Wasser; das Boot fährt nicht über Land von Ort zu Ort.
    expect(kinds.every((k) => k.some((v) => ['motor-boat', 'submersible', 'hovercraft', 'helicopter', 'primitive-biplane', 'fixed-wing-aircraft'].includes(v)))).toBe(true);
    for (const t of options) for (const l of t.legs.filter((leg) => leg.by === 'motor-boat')) expect(l.cells.slice(1, -1).every((q) => !land.has(q))).toBe(true);
  });
});

describe('Linienflug (2026-11-15c)', () => {
  const far = grid.cells - 1;
  const city = (cell: number, name: string, port: 'A' | 'C' | 'D' | 'F') => ({ cell, name, population: 6, multiplier: 2, rank: 'primary' as const, port });

  it('fliegt zwischen zwei Städten mit Hafen A–C oder F; der Fahrpreis gilt je SC und Flugstunde', () => {
    const map = mapWith({}, { cities: [city(line[0]!, 'Ora', 'C'), city(far, 'Bel', 'F')].sort((a, b) => a.cell - b.cell) });
    const c0 = campaignOn(map, line[0]!, { tech: 8, funds: 100_000 });
    const trip = planOptions(c0, far).find((t) => t.legs.some((l) => l.by === 'airline'))!;
    expect(trip.legs).toEqual([{ by: 'airline', rented: false, cells: [line[0], far] }]);
    const surface = tripSurface(c0)!;
    const persons = livingCharacters(c0).length;
    const fare = Math.round(100 * persons * legHours(surface, trip.legs[0]!));
    const c = driveDay(startTrip(c0, trip), clock);
    expect(c.log.at(-1)).toMatchObject({ kind: 'tripDay', fare, rent: 0 });
    expect(c.bookings.at(-1)).toMatchObject({ kind: 'fare', amount: -fare, rentFor: c.log.length - 1 });
    const read = fromCampaignFile(toCampaignFile(c), c.id);
    expect(read.bookings.at(-1)).toEqual(c.bookings.at(-1));
  });

  it('nicht bei Hafen D, nicht unter TL 6 und nicht bei dünner Atmosphäre', () => {
    const uses = (port: 'C' | 'D', options: { tech?: number; atmosphere?: number }) => {
      const map = mapWith({}, { cities: [city(line[0]!, 'Ora', 'C'), city(far, 'Bel', port)].sort((a, b) => a.cell - b.cell) });
      return planOptions(campaignOn(map, line[0]!, { funds: 100_000, ...options }), far).some((t) => t.legs.some((l) => l.by === 'airline'));
    };
    expect(uses('C', { tech: 8 })).toBe(true);
    expect(uses('D', { tech: 8 })).toBe(false);
    expect(uses('C', { tech: 5 })).toBe(false);
    expect(uses('C', { tech: 8, atmosphere: 3 })).toBe(false);
  });
});

describe('Eigene Fahrzeuge in der Planung', () => {
  it('Varianten mit eigenem Fahrzeug zuerst; eine Variante sagt, welches Fahrzeug wo stehen bleibt', () => {
    const road = line.slice(0, 5);
    const c = { ...campaignOn(mapWith({}, { towns: [[line[0]!, 1]], roads: [road] }), line[0]!, { funds: 1_000_000 }), stash: [{ of: 'vehicle-ground-car', count: 1 }] };
    const options = planOptions(c, line[4]!);
    expect(options[0]!.legs.map((l) => `${l.by}${l.rented ? '*' : ''}`)).toEqual(['ground-car']);
    expect(leftBehind(c, options[0]!)).toEqual([]);
    const flight = options.find((t) => t.legs.some((l) => l.by === 'helicopter'))!;
    expect(leftBehind(c, flight)).toEqual([{ item: 'vehicle-ground-car', count: 1, place: { world: '0101', cell: line[0] } }]);
    // Wer nur rechnet, ändert nichts: Das Auto ist noch bei der Gruppe.
    expect(c.stash).toEqual([{ of: 'vehicle-ground-car', count: 1 }]);
  });
});

describe('Begegnungen am Boden', () => {
  it('jeder Reisetag am Boden würfelt den Test; in der Wildnis Tiere, im besiedelten Land die Zufallsbegegnung', () => {
    const c0 = campaignOn(mapWith({ [line[0]!]: 'settled' }), line[0]!);
    const trip = startTrip(c0, planTrip(c0, line[1]!, { rent: false }));
    expect(groundToday(trip)).toBe(true);
    // Test 1 (5+ nötig): keine Begegnung.
    const day = travelDay(trip, fixedRandom(1), clock);
    expect(day.check?.result.passed).toBe(false);
    expect(day.campaign.log.at(-1)).toMatchObject({ kind: 'check', dice: [1] });
    expect(day.campaign.log.at(-2)).toMatchObject({ kind: 'tripDay' });
    // Noch am Start, besiedelt: Zufallsbegegnung. Offenes Land ist Wildnis (Forest hat Tiere).
    expect(travelCheckKind(day.campaign)).toBe('random');
    expect(travelCheckKind(moveParty(c0, { world: '0101', cell: line[2]! }))).toBe('animal');
  });

  it('besteht der Test, folgt gleich die Begegnung; ein Tag nur in der Luft würfelt nichts', () => {
    const c0 = campaignOn(mapWith({ [line[0]!]: 'settled' }, { towns: [[line[0]!, 1]] }), line[0]!, { funds: 100_000 });
    const walk = startTrip(c0, planTrip(c0, line[1]!, { rent: false }));
    const met = travelDay(walk, fixedRandom(6), clock);
    expect(met.check?.result.passed).toBe(true);
    expect(met.encounter !== undefined || met.roll !== undefined).toBe(true);
    const flight = startTrip(c0, planTrip(c0, grid.cells - 1, { rent: true }));
    expect(flight.trip!.legs.map((l) => l.by)).not.toContain('walk');
    expect(groundToday(flight)).toBe(false);
    expect(travelDay(flight, fixedRandom(), clock).check).toBeUndefined();
  });
});

describe('Wo ich war', () => {
  it('erkennt Reisetage und ihre Tests und zeichnet die Strecken aus dem Log nach', () => {
    let c = campaignOn(mapWith({ [line[0]!]: 'settled' }), line[0]!);
    c = { ...c, log: [{ kind: 'dice', at: '2026-01-01T00:00:00.000Z', dice: [1, 2], place: { world: '0101', cell: line[0]! } }] };
    let t = startTrip(c, planTrip(c, line[2]!, { rent: false }));
    while (t.trip) t = travelDay(t, fixedRandom(), clock).campaign;
    const travel = t.log.map((_, i) => isTravelEntry(t.log, i));
    expect(travel[0]).toBe(false);
    expect(travel.slice(1).every(Boolean)).toBe(true);
    const trace = travelTrace(t, '0101');
    expect(trace[0]![0]).toBe(line[0]);
    expect(trace.at(-1)![1]).toBe(line[2]);
  });
});

