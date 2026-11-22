import { describe, expect, it } from 'vitest';
import {
  addShip,
  armamentBlocker,
  book,
  checkTurrets,
  craftOf,
  createDemoCampaign,
  fireAt,
  firePreview,
  fromCampaignFile,
  launchCraft,
  maneuverAfter,
  placeFoe,
  repairCostOf,
  repairShip,
  shipOf,
  startFlight,
  toCampaignFile,
  type Campaign,
  type Random,
} from '.';
import { fixedClock, fixedRandom } from './testing';

// Bewaffnung der Small Craft (Domänenmodell 2026-11-22).

const clock = fixedClock();
const always = (n: number): Random => ({ int: (min, max) => Math.max(min, Math.min(max, n)) });
const demo = (): Campaign => book(createDemoCampaign(clock), 'income', 5_000_000, clock);
const boatOf = (c: Campaign) => craftOf(c, shipOf(c)!.id)[0]!;

/** Die Demo im Systemflug, die Gruppe im ausgesetzten Ship's Boat, ein Free Trader daneben. */
function inBoat(design = 'A'): { campaign: Campaign; boat: number; foe: number } {
  const c = startFlight(demo(), demo().location!.world, clock);
  const launched = placeFoe(launchCraft(c, boatOf(c).id), design, 'ignore', clock);
  const units = launched.flight!.units;
  return { campaign: launched, boat: units.findIndex((u) => u.ship === boatOf(c).id), foe: units.findIndex((u) => u.design === design) };
}

describe('Bewaffnung der Small Craft (2026-11-22)', () => {
  it('Small Craft kommen ab Werft mit so vielen Beam Lasern, wie ihr Typ erlaubt; die Launch ohne', () => {
    expect(boatOf(demo()).turrets).toEqual([{ type: 'weaponry', weapons: ['beam-laser'] }]);
    const merc = addShip(demo(), 'C', undefined).campaign;
    expect(craftOf(merc, shipOf(merc)!.id).map((c) => c.turrets)).toEqual([
      [{ type: 'weaponry', weapons: ['beam-laser', 'beam-laser'] }],
      [{ type: 'weaponry', weapons: ['beam-laser', 'beam-laser'] }],
    ]);
    const lab = addShip(demo(), 'K', undefined).campaign;
    expect(craftOf(lab, shipOf(lab)!.id)[0]!.turrets).toEqual([]);
  });

  it('ein Small Craft trägt höchstens seine Laser und keine Turrets der Schiffe', () => {
    const boat = boatOf(demo());
    expect(() => checkTurrets({ ...boat, turrets: [{ type: 'weaponry', weapons: ['beam-laser', 'beam-laser'] }] })).toThrow(/mehr Laser/);
    expect(() => checkTurrets({ ...boat, turrets: [{ type: 'double', weapons: [] }] })).toThrow(/passt nicht/);
    expect(() => checkTurrets({ ...shipOf(demo())!, turrets: [{ type: 'weaponry', weapons: [] }] })).toThrow(/passt nicht/);
  });

  it('Spielstände von vorher: ein unbewaffnetes Small Craft bekommt die Laser seines Entwurfs', () => {
    const c = demo();
    const file = toCampaignFile({ ...c, ships: c.ships.map((s) => (s.mother !== undefined ? { ...s, turrets: [] } : s)) });
    expect(boatOf(fromCampaignFile(file, c.id)).turrets).toEqual([{ type: 'weaponry', weapons: ['beam-laser'] }]);
  });

  it('feuert aus dem Small Craft: ohne Computer DM −1, der Log hält es fest', () => {
    const { campaign, boat, foe } = inBoat();
    expect(firePreview(campaign, boat, foe)!.weapons[0]).toMatchObject({ weapon: 'beam-laser', count: 1, dm: -1, need: 9 });
    const run = fireAt(campaign, boat, foe, always(6), clock);
    expect(run.campaign.log.find((e) => e.kind === 'spaceAttack')).toMatchObject({ weapon: 'beam-laser', dm: -1, noComputer: true });
    expect(fromCampaignFile(toCampaignFile(run.campaign), 'x').log.find((e) => e.kind === 'spaceAttack')).toMatchObject({ noComputer: true });
  });

  it('ohne Computer feuert nur ein Laser je Raumrunde', () => {
    const { campaign, boat, foe } = inBoat();
    const pinnace = { ...campaign, ships: campaign.ships.map((s) => (s.id === boatOf(campaign).id ? { ...s, design: 'pinnace', turrets: [{ type: 'weaponry', weapons: ['beam-laser', 'beam-laser'] }] } : s)) };
    expect(firePreview(pinnace, boat, foe)!.weapons[0]!.count).toBe(1);
    // Daneben: 1 + 1 trifft nicht.
    const run = fireAt(pinnace, boat, foe, fixedRandom(1, 1, 1, 1, 1, 1), clock);
    expect(run.campaign.log.filter((e) => e.kind === 'spaceAttack' && e.attacker === boatOf(campaign).name)).toHaveLength(1);
  });

  it('Treffer auf ein Small Craft gehen auf seine Spalte: Drive legt es still, Weapons zerstört die Bewaffnung', () => {
    // Ein Patrol Cruiser (vier Beam Laser) feuert: der erste trifft (6 + 6), die übrigen nicht (1 + 1).
    const { campaign, boat } = inBoat('T');
    const foe = campaign.flight!.units.findIndex((u) => u.design === 'T');
    const misses = [1, 1, 1, 1, 1, 1];
    // Trefferzone 2 + 3 = 5: Drive – das Boot bewegt sich nicht mehr und feuert nicht zurück.
    const drive = fireAt(campaign, foe, boat, fixedRandom(6, 6, 2, 3, ...misses), clock).campaign;
    expect(boatOf(drive).damage!.hits).toEqual(['drive']);
    expect(maneuverAfter('boat', boatOf(drive).damage)).toBe(0);
    // 5 + 5 = 10: Weapons, die Bewaffnung fällt aus.
    const weapons = fireAt(campaign, foe, boat, fixedRandom(6, 6, 5, 5, ...misses), clock).campaign;
    expect(boatOf(weapons).damage).toMatchObject({ hits: ['weapons'], turretsOut: [0] });
    // 3 + 4 = 7: Computer, ohne Computer ein Drive-Treffer.
    const computer = fireAt(campaign, foe, boat, fixedRandom(6, 6, 3, 4, ...misses), clock).campaign;
    expect(boatOf(computer).damage!.hits).toEqual(['drive']);
  });

  it('umrüsten gibt es für Small Craft nicht; repariert wird mit dem Mutterschiff', () => {
    const own = addShip({ ...demo(), ships: [] }, 'fighter', undefined).campaign;
    expect(armamentBlocker(own)).toMatch(/Small Craft/);
    const c = demo();
    const hurt: Campaign = { ...c, ships: c.ships.map((s) => (s.mother !== undefined ? { ...s, damage: { hits: ['drive' as const], turretsOut: [] } } : s)) };
    expect(repairCostOf(hurt, shipOf(hurt)!)).toBe(100_000);
    expect(boatOf(repairShip(hurt, clock)).damage).toBeUndefined();
  });
});
