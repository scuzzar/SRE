import { describe, expect, it } from 'vitest';
import {
  addShip,
  battleRunning,
  book,
  createDemoCampaign,
  encounterBlocker,
  encounterColumn,
  fromCampaignFile,
  fundsOf,
  jumpAfter,
  maneuverAfter,
  maxGOf,
  placeFoe,
  repairCostOf,
  repairShip,
  rollShipEncounter,
  runRound,
  fireAt,
  fireBlocker,
  dmPartsOf,
  firePreview,
  startFlight,
  toCampaignFile,
  type Campaign,
  type Random,
} from '.';
import { fixedClock, fixedRandom } from './testing';

const clock = fixedClock();
/** Immer dieselbe Zahl (auf den Bereich begrenzt). */
const always = (n: number): Random => ({ int: (min, max) => Math.max(min, Math.min(max, n)) });

/** Die Demo auf Kessra (Raumhafen A), Scout mit seinem Beam Laser, Geld in der Kasse, Systemflug läuft. */
function flying(): Campaign {
  const c = book(createDemoCampaign(clock), 'income', 5_000_000, clock);
  return startFlight(c, c.location!.world, clock);
}

describe('Raumkampf: ein fremdes Schiff (2026-11-21h)', () => {
  it('taucht von Hand auf: eine Einheit ohne Schiff, mit Entwurf, Namen und Absicht, und ein Logeintrag', () => {
    const c = placeFoe(flying(), 'A', 'ignore', clock);
    const foe = c.flight!.units[1]!;
    expect(foe).toMatchObject({ design: 'A', name: 'Free Trader', intent: 'ignore', crashed: false });
    expect(foe.ship).toBeUndefined();
    expect(foe.track).toHaveLength(c.flight!.units[0]!.track.length);
    expect(c.log.at(-1)).toMatchObject({ kind: 'spaceBattle', foe: 'Free Trader', design: 'A', intent: 'ignore' });
    expect(battleRunning(c)).toBe(true);
    expect(encounterBlocker(c)).toMatch(/schon ein fremdes Schiff/);
    // Übersteht die Kampagnendatei.
    expect(fromCampaignFile(toCampaignFile(c), 'x').flight!.units[1]).toMatchObject({ design: 'A', intent: 'ignore' });
  });

  it('gewürfelt nach SE 13: Spalte A, 6 ist ein Scout; die Reaktion 2 greift an', () => {
    const c = flying();
    const { column, dm } = encounterColumn(c);
    expect(column).toBe('A');
    // Begegnung 3 + (3 − DM) = 6, Reaktion 1 + 1, Abstand 2 + 3 Raumbänder, Richtung 1 × 60°.
    const rolled = rollShipEncounter(c, fixedRandom(3, 3 - dm, 1, 1, 2, 3, 1), clock);
    expect(rolled.code).toBe('S');
    expect(rolled.campaign.flight!.units[1]).toMatchObject({ design: 'S', intent: 'attack' });
    expect(rolled.campaign.log.at(-1)).toMatchObject({ kind: 'spaceBattle', encounter: [3, 3 - dm], reaction: [1, 1] });
    // 2 + 2 ist in Spalte A keine Begegnung.
    const none = rollShipEncounter(flying(), fixedRandom(1, 1), clock);
    expect(none.code).toBeUndefined();
    expect(none.campaign.flight!.units).toHaveLength(1);
  });

  it('Feuer auf ein Ziel: 12 trifft, 12 auf die Trefferzone ist kritisch, 6 ist Explode – das fremde Schiff ist zerstört', () => {
    const c = placeFoe(flying(), 'A', 'ignore', clock);
    // Sofort, ohne die Raumrunde auszuführen (2026-11-21i).
    const run = fireAt(c, 0, 1, always(6), clock);
    const log = run.campaign.log;
    expect(log.find((e) => e.kind === 'spaceAttack')).toMatchObject({ attacker: c.ships[0]!.name, target: 'Free Trader', weapon: 'beam-laser', dice: [6, 6], hits: ['explode'] });
    expect(log.at(-1)).toMatchObject({ kind: 'spaceBattleEnd', foe: 'Free Trader', outcome: 'destroyed' });
    expect(run.campaign.flight!.units).toHaveLength(1);
    expect(run.campaign.flight!.units[0]!.fired).toBe(true);
    expect(run.campaign.flight!.round).toBe(1);
  });

  it('jede Einheit feuert einmal je Raumrunde; das Ziel feuert zurück und greift dann an (2026-11-21i)', () => {
    let c = placeFoe(flying(), 'T', 'ignore', clock);
    // Alle Würfe 2: 2 + 2 = 4 verfehlt immer.
    const shot = fireAt(c, 0, 1, always(2), clock);
    c = shot.campaign;
    const attackers = c.log.filter((e) => e.kind === 'spaceAttack').map((e) => (e.kind === 'spaceAttack' ? e.attacker : ''));
    expect(attackers).toEqual([c.ships[0]!.name, 'Patrol Cruiser', 'Patrol Cruiser', 'Patrol Cruiser', 'Patrol Cruiser']);
    expect(c.flight!.units[1]).toMatchObject({ fired: true, intent: 'attack' });
    expect(fireBlocker(c, 0, 1)).toMatch(/schon gefeuert/);
    expect(() => fireAt(c, 0, 1, always(2), clock)).toThrow(/schon gefeuert/);
    // Die nächste Raumrunde: Der Kreuzer feuert nach der Bewegung von selbst, das eigene Schiff darf wieder.
    const next = runRound(c, clock, always(2)).campaign;
    expect(next.flight!.units[0]!.fired).toBe(false);
    expect(next.flight!.units[1]!.fired).toBe(true);
    expect(fireBlocker(next, 0, 1)).toBeUndefined();
  });

  it('ohne Laser kein Ziel', () => {
    const demo = createDemoCampaign(clock);
    const unarmed = { ...demo, ships: demo.ships.map((s) => (s.mother === undefined ? { ...s, turrets: [{ type: 'double', weapons: [] }] } : s)) };
    const bare = startFlight(unarmed, demo.location!.world, clock);
    expect(fireBlocker(placeFoe(bare, 'A', 'ignore', clock), 0, 1)).toMatch(/keinen Laser/);
  });

  it('ein angreifendes Schiff feuert von selbst; Treffer bleiben am eigenen Schiff', () => {
    let c = placeFoe(flying(), 'T', 'attack', clock);
    // Alle Würfe 4: 4 + 4 = 8 trifft (bis 25 Raumbänder ohne DM), Trefferzone 8 ist Hold.
    const run = runRound(c, clock, always(4));
    c = run.campaign;
    const shots = c.log.filter((e) => e.kind === 'spaceAttack');
    expect(shots.every((s) => s.kind === 'spaceAttack' && s.attacker === 'Patrol Cruiser')).toBe(true);
    expect(shots).toHaveLength(4);
    const ship = c.ships.find((s) => !s.retired)!;
    expect(ship.damage!.hits).toEqual(['hold', 'hold', 'hold', 'hold']);
    // Das eigene Schiff feuert nicht von selbst zurück; es kann es jetzt auslösen.
    expect(fireBlocker(c, 0, 1)).toBeUndefined();
  });

  it('Schaden senkt Antrieb und Sprung; zu viel Schaden springt nicht', () => {
    expect(maneuverAfter('S', { hits: ['maneuver'], turretsOut: [] })).toBe(1);
    expect(maneuverAfter('S', { hits: ['maneuver', 'powerPlant', 'maneuver'], turretsOut: [] })).toBe(0);
    expect(maneuverAfter('S', { hits: ['crew'], turretsOut: [] })).toBe(0);
    expect(jumpAfter('S', { hits: ['criticalJump'], turretsOut: [] })).toBe(0);
    const c = flying();
    const { flight: _f, ...grounded } = c;
    void _f;
    const damaged: Campaign = { ...grounded, ships: c.ships.map((s) => ({ ...s, damage: { hits: ['jump' as const, 'jump' as const], turretsOut: [] } })) };
    expect(jumpAfter('S', damaged.ships[0]!.damage)).toBe(0);
    // Treffer auf den Jump Drive senken den Antrieb nicht (die Yacht der Demo hat 1 G).
    expect(maxGOf({ ...c, ships: damaged.ships }, c.flight!.units[0]!)).toBe(1);
  });

  it('Reparatur in der Werft: je Treffer Cr 100.000, je kritischem Cr 1.000.000', () => {
    const c = flying();
    const { flight: _g, ...landed } = c;
    void _g;
    const hurt: Campaign = { ...landed, ships: c.ships.map((s, i) => (i === 0 ? { ...s, damage: { hits: ['hull' as const, 'criticalManeuver' as const], turretsOut: [0] } } : s)) };
    expect(repairCostOf(hurt, hurt.ships[0]!)).toBe(1_100_000);
    const fixed = repairShip(hurt, clock);
    expect(fixed.ships[0]!.damage).toBeUndefined();
    expect(fundsOf(fixed)).toBe(fundsOf(hurt) - 1_100_000);
    expect(fixed.bookings.at(-1)).toMatchObject({ shipCost: 'repair', amount: -1_100_000 });
    expect(() => repairShip({ ...hurt, flight: c.flight! }, clock)).toThrow(/Systemflug/);
  });

  it('wird das eigene Schiff zerstört, endet der Systemflug und das Schiff ist ausgeblendet', () => {
    const c = placeFoe(flying(), 'T', 'attack', clock);
    const run = runRound(c, clock, always(6));
    expect(run.lost).toBe(true);
    expect(run.campaign.flight).toBeUndefined();
    expect(run.campaign.ships.every((s) => s.retired)).toBe(true);
    expect(run.campaign.log.at(-1)).toMatchObject({ kind: 'spaceBattleEnd', outcome: 'lost' });
  });

  it('beenden mitten im Raumkampf bricht ihn ab', async () => {
    const { endFlight } = await import('.');
    const c = placeFoe(flying(), 'A', 'attack', clock);
    expect(endFlight(c, clock).log.at(-1)).toMatchObject({ kind: 'spaceBattleEnd', outcome: 'broken' });
    expect(addShip).toBeDefined();
  });

  it('erklärt die DMs: Entfernung, Pulse Laser, Computer-Treffer; der Zielwert ist 8 − DM (2026-11-21i)', () => {
    expect(dmPartsOf('beam-laser', 20, 0)).toEqual([]);
    expect(dmPartsOf('pulse-laser', 31, 2)).toEqual([
      { reason: 'range', dm: -2 },
      { reason: 'pulse', dm: -1 },
      { reason: 'computer', dm: -2 },
    ]);
    expect(dmPartsOf('beam-laser', 51, 0)).toEqual([{ reason: 'range', dm: -5 }]);
    const c = placeFoe(flying(), 'A', 'ignore', clock);
    expect(firePreview(c, 0, 1)).toEqual({ bands: 7, computerHits: 0, weapons: [{ weapon: 'beam-laser', count: 1, parts: [], dm: 0, need: 8 }] });
    // Der Schuss hält fest, woraus sein DM kam.
    const shot = fireAt(c, 0, 1, always(2), clock).campaign.log.find((e) => e.kind === 'spaceAttack');
    expect(shot).toMatchObject({ bands: 7, computerHits: 0, dm: 0 });
  });
});
