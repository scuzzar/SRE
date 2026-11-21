import { describe, expect, it } from 'vitest';
import { createDemoCampaign, fromCampaignFile, readyForParty, toCampaignFile, type Campaign } from '.';
import { cameByShip, freeLanding, needsLanding, portCities, portDepartureBlocker, shipDepartureBlocker } from './landing';
import { worldById } from './sector';
import { activeShip } from './ship';
import { startFlight } from './flight';
import { fixedClock, seededRandom } from './testing';
import { landAt } from './upkeep';
import { fundsOf } from './shop';

const clock = fixedClock();
/** Die Demo mit Globus auf Kessra; die Gruppe ist dort noch ohne Feld. */
function onKessra(): Campaign {
  const c = createDemoCampaign(clock);
  return { ...c, hexes: readyForParty(c.hexes, '0405', seededRandom(5)) };
}

describe('Landeplatz (2026-11-21)', () => {
  it('auf einer Welt mit Globus ohne Feld muss die Gruppe landen; Häfen und, mit eigenem Schiff, ein beliebiger Ort', () => {
    const c = onKessra();
    expect(needsLanding(c)).toBe(true);
    expect(cameByShip(c)).toBe(true);
    expect(freeLanding(c)).toBe(true);
    const ports = portCities(worldById(c.hexes, '0405'));
    expect(ports.length).toBeGreaterThan(0);
    const landed = landAt(c, { city: ports[0]!.city }, clock);
    expect(landed.location).toEqual({ world: '0405', city: ports[0]!.city });
    expect(activeShip(landed).place).toEqual(landed.location);
    expect(needsLanding(landed)).toBe(false);
    expect(() => landAt(landed, { city: ports[0]!.city }, clock)).toThrow(/schon einen Landeplatz/);
    expect(fromCampaignFile(toCampaignFile(landed), landed.id).ships[0]!.place).toEqual(landed.location);
  });

  it('ohne eigenes Schiff nur an einem Hafen', () => {
    const c = onKessra();
    const away = { ...c, ships: c.ships.map((s) => ({ ...s, place: { world: '0101' } })) };
    expect(cameByShip(away)).toBe(false);
    expect(freeLanding(away)).toBe(false);
    expect(() => landAt(away, { cell: 5 }, clock)).toThrow(/nur an einem Hafen/);
  });

  it('abfliegen nur beim Schiff; Passagen nur aus einer Stadt mit Hafen', () => {
    const c = onKessra();
    const map = worldById(c.hexes, '0405')!.map!;
    const pampa = map.landforms.split('').findIndex((_, i) => !(map.cities ?? []).some((x) => x.cell === i));
    const landed = landAt(c, { cell: pampa }, clock);
    expect(activeShip(landed).place).toEqual({ world: '0405', cell: pampa });
    expect(portDepartureBlocker(landed)).toMatch(/Hafen/);
    expect(shipDepartureBlocker(landed)).toBeUndefined();
    const port = portCities(worldById(c.hexes, '0405'))[0]!;
    const walked = { ...landed, location: { world: '0405', city: port.city } };
    expect(portDepartureBlocker(walked)).toBeUndefined();
    expect(shipDepartureBlocker(walked)).toMatch(/Erst zum Schiff/);
    expect(() => startFlight(walked, '0405', clock)).toThrow(/Erst zum Schiff/);
  });

  it('die Liegegebühr nur nach einer Ankunft: wer schon da war, zahlt beim Landeplatz nicht noch einmal', () => {
    const c = onKessra();
    const port = portCities(worldById(c.hexes, '0405'))[0]!;
    expect(fundsOf(landAt(c, { city: port.city }, clock))).toBe(fundsOf(c));
    const arrived = { ...c, ships: c.ships.map((s) => ({ ...s, place: { world: '0405' } })) };
    expect(fundsOf(landAt(arrived, { city: port.city }, clock))).toBe(fundsOf(c) - 100);
  });
});
