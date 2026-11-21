import { describe, expect, it } from 'vitest';
import {
  addShip,
  bodyOf,
  buyShip,
  craftOf,
  freeCargoOf,
  updateShip,
  book,
  createDemoCampaign,
  dockBlocker,
  dockCraft,
  endFlight,
  flightStartBlocker,
  flightTime,
  fromCampaignFile,
  hexFromFlat,
  hexId,
  journeyCraft,
  launchableCraft,
  launchCraft,
  originAt,
  runRound,
  sceneOf,
  shipJourneyBlocker,
  shipOf,
  startFlight,
  systemJourneyBlocker,
  toCampaignFile,
  travelInSystem,
  worldOf,
  type Campaign,
  type Vec,
} from '.';
import { landAt } from './upkeep';
import { fixedClock } from './testing';

// Small Craft ohne Kampf (Domänenmodell 2026-11-21b).

const clock = fixedClock();
const demo = (): Campaign => createDemoCampaign(clock);
const world = (c: Campaign) => c.location!.world;
const boatOf = (c: Campaign) => craftOf(c, shipOf(c)!.id)[0]!;
const worldAt = (c: Campaign): { position: Vec; velocity: Vec } => originAt(sceneOf(c.hexes, c.flight!.world), c.flight!.world, flightTime(c, c.flight!));
const roundTrip = (c: Campaign): Campaign => fromCampaignFile(toCampaignFile(c), c.id);

/** Die Demo mit einer Nachbarwelt einen Parsec weiter, als Sprungziel. */
function withNeighbour(c: Campaign): { campaign: Campaign; to: string } {
  const home = c.hexes[0]!;
  const column = home.column + 1;
  const hex = hexFromFlat({ column, row: home.row, empty: false, name: 'Nahe', navalBase: false, scoutBase: false, gasGiant: false, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } });
  return { campaign: { ...c, hexes: [...c.hexes, hex] }, to: hexId(column, home.row) };
}

/** Die Demo im Systemflug, das Beiboot ausgesetzt. */
function launched(): Campaign {
  const c = startFlight(demo(), world(demo()), clock);
  return launchCraft(c, boatOf(c).id);
}

/** Die Einheit des Schiffs `id` knapp über der Oberfläche, mitbewegt mit der Welt, `kms` auf sie zu. */
function above(c: Campaign, id: string, km: number, kms: number): Campaign {
  const at = worldAt(c);
  const r = bodyOf(worldOf(c.hexes, c.flight!.world))!.radius;
  const units = c.flight!.units.map((u) => (u.ship === id ? { ...u, position: { x: at.position.x, y: at.position.y + r + km }, velocity: { x: at.velocity.x, y: at.velocity.y - kms } } : u));
  return { ...c, flight: { ...c.flight!, units } };
}

describe('Small Craft (2026-11-21b)', () => {
  it('ein neues Schiff bringt die Beiboote seines Entwurfs an Bord mit; das aktive Schiff ist das ohne Mutterschiff', () => {
    const c = demo();
    const ship = shipOf(c)!;
    expect(ship.design).toBe('Y');
    const craft = craftOf(c, ship.id);
    expect(craft).toHaveLength(1);
    expect(craft[0]).toMatchObject({ design: 'boat', name: 'Beiboot 1', mother: ship.id, aboard: true, price: 0, fuel: 1.8, software: [] });
    expect(craft[0]!.place).toBeUndefined();
    // Der Mercenary Cruiser trägt zwei Modular Cutter; das alte Schiff wird samt Beiboot ausgeblendet.
    const { campaign: cruiser, ship: next } = addShip(c, 'C', undefined);
    expect(craftOf(cruiser, next.id).map((s) => s.design)).toEqual(['cutter', 'cutter']);
    expect(cruiser.ships.filter((s) => s.mother === ship.id).every((s) => s.retired)).toBe(true);
    expect(shipOf(cruiser)!.id).toBe(next.id);
    expect(roundTrip(cruiser).ships).toEqual(cruiser.ships);
  });

  it('aussetzen: eine eigene Einheit an Ort und Geschwindigkeit des Mutterschiffs, die Gruppe steigt um; eins je Raumrunde', () => {
    const before = startFlight(demo(), world(demo()), clock);
    const boat = boatOf(before);
    expect(before.flight!.party).toBe(shipOf(before)!.id);
    expect(launchableCraft(before).map((s) => s.id)).toEqual([boat.id]);
    const c = launchCraft(before, boat.id);
    const [mother, unit] = c.flight!.units;
    expect(unit).toMatchObject({ ship: boat.id, position: mother!.position, velocity: mother!.velocity, track: mother!.track });
    expect(c.flight!.party).toBe(boat.id);
    expect(c.ships.find((s) => s.id === boat.id)!.aboard).toBeUndefined();
    expect(launchableCraft(c)).toEqual([]);
    expect(roundTrip(c).flight).toEqual(c.flight);
  });

  it('andocken: nah genug und mit angeglichenem Kurs; die Einheit entfällt, die Gruppe sitzt wieder im Mutterschiff', () => {
    const c = launched();
    const boat = boatOf(c).id;
    expect(dockBlocker(c, boat)).toBeUndefined();
    const docked = dockCraft(c, boat);
    expect(docked.flight!.units).toHaveLength(1);
    expect(docked.flight!.party).toBe(shipOf(c)!.id);
    expect(boatOf(docked).aboard).toBe(true);
    // Weit weg oder zu schnell geht es nicht.
    const far = { ...c, flight: { ...c.flight!, units: c.flight!.units.map((u) => (u.ship === boat ? { ...u, position: { x: u.position.x + 500, y: u.position.y } } : u)) } };
    expect(dockBlocker(far, boat)).toMatch(/näher als 100 km/);
    const fast = { ...c, flight: { ...c.flight!, units: c.flight!.units.map((u) => (u.ship === boat ? { ...u, velocity: { x: u.velocity.x + 1, y: u.velocity.y } } : u)) } };
    expect(dockBlocker(fast, boat)).toMatch(/angleichen/);
  });

  it('nur die Einheit der Gruppe landet; das Mutterschiff bleibt danach in der Umlaufbahn', () => {
    const c = launched();
    const boat = boatOf(c).id;
    const mother = shipOf(c)!.id;
    const run = runRound(above(c, boat, 5, 0.3), clock);
    expect(run.landed).toBe(world(c));
    expect(run.campaign.flight).toBeUndefined();
    const after = run.campaign;
    expect(after.ships.find((s) => s.id === boat)!.place).toEqual({ world: world(c) });
    expect(after.ships.find((s) => s.id === mother)).toMatchObject({ inOrbit: true, place: { world: c.flight!.world } });
    expect(roundTrip(after).ships).toEqual(after.ships);
    // Langsam auf die Oberfläche ohne die Gruppe ist ein Aufschlag.
    const empty = runRound(above(c, mother, 5, 0.3), clock);
    expect(empty.landed).toBeUndefined();
    expect(empty.campaign.flight!.units.find((u) => u.ship === mother)!.crashed).toBe(true);
  });

  it('aus der Umlaufbahn: mit dem Beiboot vom Landeplatz starten, das Mutterschiff fliegt mit, andocken', () => {
    const landed = runRound(above(launched(), boatOf(launched()).id, 5, 0.3), clock).campaign;
    // Hat die Welt einen Globus, wählt die Gruppe zuerst den Landeplatz.
    const cities = worldOf(landed.hexes, world(landed)).map?.cities;
    const ready = cities ? landAt(landed, { city: cities.findIndex((x) => x.port !== undefined) }, clock) : landed;
    // Mit dem Schiff in der Umlaufbahn springt man nicht; die Gruppe ist beim Beiboot.
    const jump = withNeighbour(ready);
    expect(shipJourneyBlocker(jump.campaign, jump.to)).toMatch(/Umlaufbahn/);
    expect(flightStartBlocker(ready, world(ready))).toBeUndefined();
    const flying = startFlight(ready, world(ready), clock);
    expect(flying.flight!.party).toBe(boatOf(ready).id);
    expect(flying.flight!.units.map((u) => u.ship)).toEqual([boatOf(ready).id, shipOf(ready)!.id]);
    // Beide nebeneinander gelegt: andocken, die Gruppe ist an Bord, beenden lässt das Schiff wieder in der Umlaufbahn.
    const [b, m] = flying.flight!.units;
    const together = { ...flying, flight: { ...flying.flight!, units: [{ ...b!, position: m!.position, velocity: m!.velocity }, m!] } };
    const docked = dockCraft(together, b!.ship!);
    const ended = endFlight(docked);
    expect(boatOf(ended)).toMatchObject({ aboard: true });
    expect(boatOf(ended).place).toBeUndefined();
    expect(shipOf(ended)!.place).toEqual(shipOf(ready)!.place);
  });

  it('Systemflug beenden: das ausgesetzte Beiboot der Gruppe steht bei ihr, das Mutterschiff ist in der Umlaufbahn', () => {
    const c = launched();
    const ended = endFlight(c);
    expect(boatOf(ended).place).toEqual(c.location);
    expect(shipOf(ended)).toMatchObject({ inOrbit: true, place: { world: c.flight!.world } });
  });

  it('Reise im System mit dem Beiboot: mit seinen G, das Schiff bleibt; gesprungen wird nur mit allen Beibooten an Bord', () => {
    const c = demo();
    const boat = boatOf(c);
    expect(journeyCraft(c).map((s) => s.id)).toEqual([boat.id]);
    const to = c.hexes[0]!.worlds.find((w) => w.id !== c.hexes[0]!.main && w.kind === 'world')!;
    expect(systemJourneyBlocker(c, to.id, 'craft', boat.id)).toBeUndefined();
    const after = travelInSystem(c, to.id, 'craft', clock, boat.id);
    expect(after.log.at(-1)).toMatchObject({ kind: 'systemJourney', ship: boat.id });
    expect(boatOf(after)).toMatchObject({ place: { world: to.id } });
    expect(boatOf(after).aboard).toBeUndefined();
    expect(shipOf(after)!.place).toEqual(c.location);
    expect(roundTrip(after).ships).toEqual(after.ships);
    // Zurück auf der Startwelt (ohne Reise platziert): Das Schiff springt ohne sein Beiboot nicht.
    const jump = withNeighbour({ ...after, location: shipOf(after)!.place! });
    expect(shipJourneyBlocker(jump.campaign, jump.to)).toMatch(/Beiboot 1 an Bord/);
  });

  it('einzeln gekauft (2026-11-21c): mit Schiff ein Beiboot im Laderaum, bar oder über die Bank; der Laderaum wird knapper', () => {
    const c = book(demo(), 'income', 40_000_000, clock, 'Erbe');
    const bought = buyShip(c, 'fighter', 'bank', clock);
    const fighter = craftOf(bought, shipOf(bought)!.id).find((s) => s.design === 'fighter')!;
    expect(fighter).toMatchObject({ name: 'Beiboot 2', mother: shipOf(c)!.id, aboard: true, inHold: true, price: 18_000_000, initialLoan: 36_000_000 });
    expect(freeCargoOf(bought, shipOf(bought)!)).toBe(1);
    expect(() => updateShip(bought, shipOf(bought)!.id, { name: 'Kestrel', fuel: 50, cargo: 2 })).toThrow(/neben den Beibooten noch 1 t/);
    expect(() => buyShip(bought, 'fighter', 'cash', clock)).toThrow(/frei sind 1 t/);
    expect(roundTrip(bought).ships).toEqual(bought.ships);
  });

  it('ohne Schiff eigenständig: das aktive Schiff, fliegt und reist im System, springt nicht; ein späteres Schiff nimmt es in den Laderaum', () => {
    // Die Demo ohne ihre Yacht: Kessra, aber kein Schiff.
    const empty = book({ ...demo(), ships: [] }, 'income', 200_000_000, clock, 'Erbe');
    const alone = buyShip(empty, 'shuttle', 'cash', clock);
    const shuttle = shipOf(alone)!;
    expect(shuttle).toMatchObject({ design: 'shuttle', name: 'Shuttle' });
    expect(shuttle.mother).toBeUndefined();
    expect(roundTrip(alone).ships).toEqual(alone.ships);
    expect(flightStartBlocker(alone, world(alone))).toBeUndefined();
    const jump = withNeighbour(alone);
    expect(shipJourneyBlocker(jump.campaign, jump.to)).toMatch(/springt nicht/);
    // Der Free Trader hat 82 t Laderaum: das Shuttle (95 t) passt nicht und wird ausgeblendet; ein Launch (20 t) würde Beiboot.
    const trader = buyShip(alone, 'A', 'cash', clock);
    expect(trader.ships.find((s) => s.id === shuttle.id)!.retired).toBe(true);
    const launch = buyShip(empty, 'launch', 'cash', clock);
    const withTrader = buyShip(launch, 'A', 'cash', clock);
    expect(craftOf(withTrader, shipOf(withTrader)!.id)).toMatchObject([{ design: 'launch', aboard: true, inHold: true, retired: false }]);
    expect(freeCargoOf(withTrader, shipOf(withTrader)!)).toBe(62);
  });
});
