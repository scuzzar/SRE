import { describe, expect, it } from 'vitest';
import { addShip, armamentBlocker, book, createDemoCampaign, fromCampaignFile, fundsOf, installTurret, installWeapon, removeTurret, removeWeapon, replaceTurret, startFlight, toCampaignFile, type Campaign } from '.';
import { fixedClock } from './testing';

const clock = fixedClock();

/** Die Demo auf Kessra (Raumhafen A) mit dem Scout, sein Double Turret geleert (die Demo bringt einen Beam Laser mit), und Geld in der Kasse. */
function demo(): Campaign {
  const c = book(createDemoCampaign(clock), 'income', 5_000_000, clock);
  return { ...c, ships: c.ships.map((s) => ({ ...s, turrets: [{ type: 'double', weapons: [] }] })) };
}

describe('Bewaffnung in der Werft (2026-11-21c)', () => {
  it('ein neues Schiff kommt mit den Turrets seines Entwurfs', () => {
    expect(demo().ships[0]!.turrets).toEqual([{ type: 'double', weapons: [] }]);
    const patrol = addShip(demo(), 'T', undefined).ship;
    expect(patrol.turrets).toEqual([
      { type: 'triple', weapons: ['beam-laser', 'beam-laser', 'missile-rack'] },
      { type: 'triple', weapons: ['beam-laser', 'beam-laser', 'missile-rack'] },
    ]);
    expect(addShip(demo(), 'A', undefined).ship.turrets).toEqual([]);
  });

  it('bestückt freie Plätze gegen Bezahlung und bucht die Bewaffnung', () => {
    const before = demo();
    const armed = installWeapon(installWeapon(before, 0, 'beam-laser', clock), 0, 'sandcaster', clock);
    expect(armed.ships[0]!.turrets[0]!.weapons).toEqual(['beam-laser', 'sandcaster']);
    expect(fundsOf(armed)).toBe(fundsOf(before) - 1_250_000);
    expect(armed.bookings.at(-1)).toMatchObject({ kind: 'ship', shipCost: 'armament', amount: -250_000, forShip: 's1', text: 'Sandcaster in Turret 1' });
    expect(() => installWeapon(armed, 0, 'pulse-laser', clock)).toThrow(/keinen freien Platz/);
  });

  it('kein Turret über die Hardpoints hinaus, und nichts über die Kasse hinaus', () => {
    expect(() => installTurret(demo(), 'single', clock)).toThrow(/keinen freien Hardpoint/);
    const poor = { ...createDemoCampaign(clock), ships: demo().ships };
    expect(() => installWeapon(poor, 0, 'beam-laser', clock)).toThrow(/kostet/);
  });

  it('eine andere Turmart nimmt die Waffen mit, soweit Plätze da sind', () => {
    const armed = installWeapon(installWeapon(demo(), 0, 'beam-laser', clock), 0, 'pulse-laser', clock);
    const single = replaceTurret(armed, 0, 'single', clock);
    expect(single.ships[0]!.turrets).toEqual([{ type: 'single', weapons: ['beam-laser'] }]);
    expect(single.bookings.at(-1)).toMatchObject({ shipCost: 'armament', amount: -200_000 });
  });

  it('ausbauen bringt nichts zurück', () => {
    const armed = installWeapon(demo(), 0, 'beam-laser', clock);
    const empty = removeWeapon(armed, 0, 0);
    expect(empty.ships[0]!.turrets[0]!.weapons).toEqual([]);
    expect(fundsOf(empty)).toBe(fundsOf(armed));
    const bare = removeTurret(empty, 0);
    expect(bare.ships[0]!.turrets).toEqual([]);
    expect(installTurret(bare, 'triple', clock).ships[0]!.turrets).toEqual([{ type: 'triple', weapons: [] }]);
  });

  it('nur an einem Raumhafen A oder B und nicht im Systemflug', () => {
    const c = demo();
    expect(armamentBlocker(c)).toBeUndefined();
    expect(armamentBlocker(startFlight(c, c.location!.world, clock))).toMatch(/Systemflug/);
    const hexes = c.hexes.map((h) => ({ ...h, worlds: h.worlds.map((w) => (w.id === c.location!.world ? { ...w, uwp: { ...w.uwp, starport: 12 } } : w)) }));
    const atC = { ...c, hexes };
    expect(armamentBlocker(atC)).toMatch(/Raumhafen A oder B/);
    expect(() => installWeapon(atC, 0, 'beam-laser', clock)).toThrow(/Raumhafen A oder B/);
  });

  it('übersteht die Kampagnendatei; alte Dateien bekommen die Turrets des Entwurfs', () => {
    const armed = installWeapon(demo(), 0, 'beam-laser', clock);
    expect(fromCampaignFile(toCampaignFile(armed), 'x').ships[0]!.turrets).toEqual([{ type: 'double', weapons: ['beam-laser'] }]);
    const file = JSON.parse(toCampaignFile(demo()));
    delete file.campaign.ships[0].turrets;
    expect(fromCampaignFile(JSON.stringify(file), 'x').ships[0]!.turrets).toEqual([{ type: 'double', weapons: [] }]);
  });
});
