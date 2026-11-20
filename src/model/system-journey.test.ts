import { describe, expect, it } from 'vitest';
import { createDemoCampaign, fromCampaignFile, fundsOf, mapLocked, mapPossible, removeLogEntry, renameCity, renameWorld, noteWorld, rollWorldSurface, surfaceDue, toCampaignFile, withSurfaceMapOf, worldById, type Campaign } from '.';
import { flightHours, journeyDays, systemDistance, systemJourneyBlocker, ticketCost, travelInSystem, TICKET_RATE } from './system-journey';
import { fixedClock, seededRandom } from './testing';

const clock = fixedClock();
const demo = (): Campaign => createDemoCampaign(clock);
/** Eine Nebenwelt der Demo, die Ziel sein kann (kein Gasriese, kein Ring). */
function target(c: Campaign, filter: (k: string) => boolean = (k) => k === 'world') {
  return c.hexes[0]!.worlds.find((w) => w.id !== c.hexes[0]!.main && filter(w.kind))!;
}

describe('Reise im System (2026-11-20d)', () => {
  it('rechnet die Flugzeit nach T = 2·√(D/A) wie die Charts S. 8 und rundet auf volle Tage', () => {
    // Charts S. 8: 45.000.000 km bei 1 G 37,3 h, bei 2 G 26,4 h; 1.000.000 km bei 1 G 333 min.
    expect(flightHours(45_000_000, 1)).toBe(38);
    expect(flightHours(45_000_000, 2)).toBe(27);
    expect(flightHours(1_000_000, 1)).toBe(6);
    expect(journeyDays(1)).toBe(1);
    expect(journeyDays(24)).toBe(1);
    expect(journeyDays(38)).toBe(2);
  });

  it('nimmt den Abstand der Bahnen: um den Stern, zwischen Mond und Welt, zwischen Monden derselben Welt', () => {
    const c = demo();
    const hex = c.hexes[0]!;
    const main = worldById(c.hexes, hex.main!)!;
    const giant = hex.worlds.find((w) => w.id === main.moonOf)!;
    // Kessra kreist um den Gasriesen: 40 Radien.
    expect(systemDistance(c.hexes, main.id, giant.id)).toBe(main.orbit! * giant.radius!);
    const sibling = hex.worlds.find((w) => w.moonOf === giant.id && w.id !== main.id)!;
    expect(systemDistance(c.hexes, main.id, sibling.id)).toBe(Math.abs(main.orbit! - sibling.orbit!) * giant.radius!);
    const planet = target(c);
    expect(systemDistance(c.hexes, main.id, planet.id)).toBeGreaterThan(100_000_000);
  });

  it('mit Ticket: Cr 25 je Stunde und Reisendem, gebucht und verwiesen; Tage vergehen, die Gruppe ist am Ziel', () => {
    let c = demo();
    const to = target(c);
    const cost = ticketCost(c, to.id);
    const hours = flightHours(systemDistance(c.hexes, c.location!.world, to.id), 1);
    expect(cost).toBe(hours * TICKET_RATE * 2);
    c = { ...c, bookings: [...c.bookings, { at: clock.now(), kind: 'income', amount: cost }] };
    const day = c.day;
    const before = fundsOf(c);
    const after = travelInSystem(c, to.id, 'ticket', clock);
    const entry = after.log.at(-1)!;
    expect(entry).toMatchObject({ kind: 'systemJourney', from: c.location!.world, to: to.id, hours });
    expect(after.bookings.find((b) => b.kind === 'ticket')).toMatchObject({ amount: -cost, ticketFor: after.log.indexOf(entry) });
    expect(fundsOf(after)).toBeLessThanOrEqual(before - cost);
    expect(after.day).toBe(day + journeyDays(hours));
    expect(after.location).toEqual({ world: to.id });
    expect(() => removeLogEntry(after, after.log.indexOf(entry))).toThrow(/Reise/);
    expect(fromCampaignFile(toCampaignFile(after), after.id).log.at(-1)).toEqual(entry);
  });

  it('mit eigenem Schiff: kein Preis, Flug mit dem Manöverantrieb', () => {
    const c = demo();
    const to = target(c);
    const after = travelInSystem(c, to.id, 'ship', clock);
    expect(after.log.at(-1)).toMatchObject({ kind: 'systemJourney', ship: c.ships[0]!.id, hours: flightHours(systemDistance(c.hexes, c.location!.world, to.id), 2) });
    expect(after.bookings.some((b) => b.kind === 'ticket')).toBe(false);
  });

  it('geht nicht zu Gasriesen und Ringen, nicht ohne Schiff oder Geld, nicht in andere Systeme', () => {
    const c = demo();
    const giant = target(c, (k) => k === 'giant');
    expect(systemJourneyBlocker(c, giant.id, 'ship')).toMatch(/Gasriesen/);
    expect(systemJourneyBlocker({ ...c, ships: [] }, target(c).id, 'ship')).toMatch(/kein Schiff/);
    expect(systemJourneyBlocker({ ...c, bookings: [] }, target(c).id, 'ticket')).toMatch(/Tickets kosten|Raumhafen/);
    expect(systemJourneyBlocker(c, c.location!.world, 'ship')).toMatch(/schon hier/);
    expect(systemJourneyBlocker(c, '0101', 'ship')).toMatch(/desselben Systems/);
  });
});

describe('Nebenwelten mit Namen, Oberfläche und Globus (2026-11-20d)', () => {
  it('Name und Notiz; Oberfläche mit der Temperatur der Zone; Globus nur auf Befehl, mit Städten', () => {
    const c = demo();
    const world = c.hexes[0]!.worlds.find((w) => w.kind === 'world' && w.id !== c.hexes[0]!.main && (w.uwp.size ?? 0) >= 1)!;
    let hexes = renameWorld(c.hexes, world.id, '  Kessra Prime ');
    hexes = noteWorld(hexes, world.id, 'Bergbaukolonie');
    expect(worldById(hexes, world.id)).toMatchObject({ name: 'Kessra Prime', note: 'Bergbaukolonie' });
    expect(() => renameWorld(hexes, c.hexes[0]!.main!, 'X')).toThrow(/behält ihren Namen/);
    expect(surfaceDue(hexes[0]!, worldById(hexes, world.id)!)).toBe(true);
    expect(mapPossible(hexes[0]!, worldById(hexes, world.id)!)).toBe(false);
    hexes = rollWorldSurface(hexes, world.id, seededRandom(4));
    const rolled = worldById(hexes, world.id)!;
    expect(rolled.surface).toBeDefined();
    expect(rolled.temperature).toBeDefined();
    expect(() => rollWorldSurface(hexes, world.id, seededRandom(4))).toThrow();
    hexes = withSurfaceMapOf(hexes, world.id, seededRandom(5));
    const mapped = worldById(hexes, world.id)!;
    expect(mapped.map).toBeDefined();
    hexes = mapped.map!.cities?.length ? renameCity(hexes, world.id, 0, 'Neustadt') : hexes;
    const back = fromCampaignFile(toCampaignFile({ ...c, hexes }), c.id);
    expect(worldById(back.hexes, world.id)).toEqual(worldById(hexes, world.id));
    expect(mapLocked({ ...c, hexes }, world.id)).toBe(false);
  });

  it('kleine Welten, Gürtel und Ringe bekommen keine Oberfläche', () => {
    const c = demo();
    for (const w of c.hexes[0]!.worlds.filter((x) => x.kind === 'small' || x.kind === 'belt' || x.kind === 'ring')) {
      expect(surfaceDue(c.hexes[0]!, w)).toBe(false);
    }
  });
});
