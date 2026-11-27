import { describe, expect, it } from 'vitest';
import {
  attemptRepair,
  atShipyard,
  book,
  createDemoCampaign,
  fromCampaignFile,
  fundsOf,
  maxGOf,
  passTime,
  repairBlocker,
  repairSelected,
  shipOf,
  toCampaignFile,
  withoutHits,
  type Campaign,
  type Random,
  type ShipDamage,
} from '.';
import { fixedClock } from './testing';

// Reparatur außerhalb des Kampfs (Domänenmodell 2026-11-27d).

const clock = fixedClock();
const always = (n: number): Random => ({ int: (min, max) => Math.max(min, Math.min(max, n)) });

/** Die Demo auf Kessra (Raumhafen A, also an einer Werft), Geld in der Kasse, die Yacht beschädigt. */
function damaged(damage: ShipDamage): Campaign {
  const c = book(createDemoCampaign(clock), 'income', 5_000_000, clock);
  const ship = shipOf(c)!;
  return { ...c, ships: c.ships.map((s) => (s.id === ship.id ? { ...s, damage } : s)) };
}
/** Dieselbe Welt, aber nur mit Raumhafen C: keine Werft. */
const noYard = (c: Campaign): Campaign => ({ ...c, hexes: c.hexes.map((h) => ({ ...h, worlds: h.worlds.map((w) => ({ ...w, uwp: { ...w.uwp, starport: 12 } })) })) });
const person = (c: Campaign, name: string) => c.characters.find((p) => p.name === name)!.id;
const withEngineering = (c: Campaign, name: string, level: number): Campaign => ({ ...c, characters: c.characters.map((p) => (p.name === name ? { ...p, skills: [...p.skills, { of: 'engineering', level, retired: false }] } : p)) });

describe('Reparatur außerhalb des Kampfs (2026-11-27d)', () => {
  it('nimmt Treffer heraus und zieht geflickte Stellen und ausgefallene Turrets mit', () => {
    const damage: ShipDamage = { hits: ['turret', 'hull', 'turret', 'maneuver'], patched: [3], turretsOut: [0, 1] };
    expect(withoutHits(damage, [0])).toEqual({ hits: ['hull', 'turret', 'maneuver'], patched: [2], turretsOut: [1] });
    expect(withoutHits(damage, [3])).toEqual({ hits: ['turret', 'hull', 'turret'], turretsOut: [0, 1] });
    expect(withoutHits(damage, [0, 1, 2, 3])).toBeUndefined();
  });

  it('unterwegs flickt ein Charakter einmal je Woche, 10+; kritische Treffer nicht', () => {
    const c = noYard(damaged({ hits: ['maneuver', 'criticalJump'], turretsOut: [] }));
    expect(atShipyard(c)).toBe(false);
    const kira = person(c, 'Kira Vant');
    const ship = shipOf(c)!.id;
    expect(repairBlocker(c, kira, { ship, at: 1 })).toMatch(/Kritische/);
    const failed = attemptRepair(c, kira, { ship, at: 0 }, always(4), clock); // 8 + 0 < 10
    expect(failed.log.at(-1)).toMatchObject({ kind: 'shipRepair', ship, by: kira, zone: 'maneuver', yard: false, dm: 0 });
    expect(shipOf(failed)!.damage!.patched).toBeUndefined();
    expect(repairBlocker(failed, kira, { ship, at: 0 })).toMatch(/diese Woche schon/);
    // Nächste Woche wieder; 5 + 5 = 10 flickt.
    const later = passTime(failed, 'week', clock);
    const fixed = attemptRepair(later, kira, { ship, at: 0 }, always(5), clock);
    expect(shipOf(fixed)!.damage!.patched).toEqual([0]);
    expect(maxGOf(fixed, { ship, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, crashed: false, track: [] })).toBe(1);
    expect(fundsOf(fixed)).toBe(fundsOf(later));
  });

  it('in der Werft repariert ein Engineer selbst ganz, 8+, gegen Material; misslingt es, kostet es die Gebühr', () => {
    let c = damaged({ hits: ['maneuver', 'criticalJump', 'hull'], turretsOut: [] });
    expect(atShipyard(c)).toBe(true);
    const kira = person(c, 'Kira Vant');
    const ship = shipOf(c)!.id;
    expect(repairBlocker(c, kira, { ship, at: 0 })).toMatch(/Engineering-1/);
    c = withEngineering(c, 'Kira Vant', 1);
    const funds = fundsOf(c);
    const failed = attemptRepair(c, kira, { ship, at: 0 }, always(3), clock); // 6 + 1 < 8
    expect(fundsOf(failed)).toBe(funds - 10_000);
    expect(shipOf(failed)!.damage!.hits).toHaveLength(3);
    expect(repairBlocker(failed, kira, { ship, at: 0 })).toMatch(/heute schon/);
    const tomorrow = passTime(failed, { days: 1 }, clock);
    const fixed = attemptRepair(tomorrow, kira, { ship, at: 1 }, always(4), clock); // kritisch, 8 + 1
    expect(shipOf(fixed)!.damage!.hits).toEqual(['maneuver', 'hull']);
    expect(fundsOf(fixed)).toBe(fundsOf(tomorrow) - 500_000);
    expect(fromCampaignFile(toCampaignFile(fixed), 'x').log.at(-1)).toMatchObject({ kind: 'shipRepair', yard: true, zone: 'criticalJump' });
    // Ein kritischer je Woche; ein normaler Treffer geht am nächsten Tag wieder.
    const next = passTime(fixed, { days: 1 }, clock);
    expect(repairBlocker(next, kira, { ship, at: 0 })).toBeUndefined();
  });

  it('die Werft repariert, was ausgewählt ist, eine Buchung für alle', () => {
    const c = damaged({ hits: ['turret', 'criticalJump', 'hull'], turretsOut: [0] });
    const ship = shipOf(c)!.id;
    const fixed = repairSelected(c, [{ ship, at: 0 }, { ship, at: 1 }], clock);
    expect(shipOf(fixed)!.damage).toEqual({ hits: ['hull'], turretsOut: [] });
    expect(fundsOf(fixed)).toBe(fundsOf(c) - 1_100_000);
    expect(fixed.bookings.at(-1)).toMatchObject({ shipCost: 'repair', amount: -1_100_000 });
    expect(() => repairSelected(noYard(c), [{ ship, at: 0 }], clock)).toThrow(/Werft/);
  });
});
