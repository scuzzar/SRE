import { describe, expect, it } from 'vitest';
import {
  endFirePhase,
  fireHardpoint,
  hardpointBlocker,
  hardpointsOf,
  gunnerSkillOf,
  shipById,
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
  controlDamage,
  damageControlBlocker,
  driveLettersAfter,
  engineerOf,
  patchableHits,
  postsOf,
  seat,
  turretsDown,
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
    expect(run.campaign.flight!.units[0]!.firedTurrets).toContain(0);
    expect(run.campaign.flight!.round).toBe(1);
  });

  it('jeder Hardpoint feuert einmal je Raumrunde; das Ziel feuert zurück und greift dann an (2026-11-21i)', () => {
    let c = placeFoe(flying(), 'T', 'ignore', clock);
    // Alle Würfe 2: 2 + 2 = 4 verfehlt immer.
    const shot = fireAt(c, 0, 1, always(2), clock);
    c = shot.campaign;
    const attackers = c.log.filter((e) => e.kind === 'spaceAttack').map((e) => (e.kind === 'spaceAttack' ? e.attacker : ''));
    expect(attackers).toEqual([c.ships[0]!.name, 'Patrol Cruiser', 'Patrol Cruiser', 'Patrol Cruiser', 'Patrol Cruiser']);
    expect((c.flight!.units[1]!.firedTurrets ?? []).length).toBeGreaterThan(0);
    expect(fireBlocker(c, 0, 1)).toMatch(/schon gefeuert/);
    expect(() => fireAt(c, 0, 1, always(2), clock)).toThrow(/schon gefeuert/);
    // Die Bewegung (2026-11-23): die Raumrunde bleibt, das Feuer folgt, jede Einheit darf wieder.
    const moved = runRound(c, clock, always(2)).campaign;
    expect(moved.flight!.round).toBe(1);
    expect(moved.flight!.phase).toBe('fire');
    expect(moved.flight!.units[0]!.firedTurrets).toEqual([]);
    expect(fireBlocker(moved, 0, 1)).toBeUndefined();
    // „End Turn“: der Kreuzer feuert von selbst, dann rückt die Raumrunde weiter.
    const end = endFirePhase(moved, clock, always(2)).campaign;
    expect(end.flight!.units[1]!.firedTurrets!.length).toBeGreaterThan(0);
    expect(end.flight!.round).toBe(2);
    expect(end.flight!.phase).toBe('thrust');
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
    // 2026-11-23: Die Bewegung lässt die Raumrunde stehen; die Fremden feuern am Ende der Runde.
    c = endFirePhase(runRound(c, clock, always(4)).campaign, clock, always(4)).campaign;
    const shots = c.log.filter((e) => e.kind === 'spaceAttack');
    expect(shots.every((s) => s.kind === 'spaceAttack' && s.attacker === 'Patrol Cruiser')).toBe(true);
    expect(shots).toHaveLength(4);
    const ship = c.ships.find((s) => !s.retired)!;
    expect(ship.damage!.hits).toEqual(['hold', 'hold', 'hold', 'hold']);
    // Das eigene Schiff feuert nicht von selbst zurück; es kann es jetzt auslösen.
    expect(fireBlocker(c, 0, 1)).toBeUndefined();
  });

  it('Schaden senkt Antrieb und Sprung; zu viel Schaden springt nicht', () => {
    // Der Scout hat A-Antriebe: ein Treffer, und der Buchstabe fällt unter A (2026-11-22d).
    expect(maneuverAfter('S', { hits: ['maneuver'], turretsOut: [] })).toBe(0);
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
    const run = endFirePhase(runRound(c, clock, always(6)).campaign, clock, always(6));
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
    expect(firePreview(c, 0, 1)).toEqual({ bands: 7, computerHits: 0, predict: 0, gunner: 0, evade: 0, weapons: [{ weapon: 'beam-laser', count: 1, parts: [], dm: 0, need: 8 }] });
    // Der Schuss hält fest, woraus sein DM kam.
    const shot = fireAt(c, 0, 1, always(2), clock).campaign.log.find((e) => e.kind === 'spaceAttack');
    expect(shot).toMatchObject({ bands: 7, computerHits: 0, dm: 0 });
  });
});

describe('Das Raumkampf-Interface: Phasen, Hardpoints und Programme (2026-11-23)', () => {
  // Der Kreuzer T feuert mit vier Lasern; der Free Trader A hat keine Bewaffnung.
  const withFoe = (intent: 'attack' | 'ignore' = 'attack', design = 'T'): Campaign => placeFoe(flying(), design, intent, clock);
  /** Das eigene Schiff mit anderem Programmstand (die Prüfung der CPU-Größe liegt beim Umstecken). */
  const cpu = (c: Campaign, ...programs: string[]): Campaign => ({
    ...c,
    ships: c.ships.map((s) => (s.id === c.flight!.party ? { ...s, software: [...(s.software ?? []).filter((p) => p.slot !== 'cpu'), ...programs.map((program) => ({ program, slot: 'cpu' as const }))] } : s)),
  });
  const shots = (c: Campaign) => c.log.filter((e) => e.kind === 'spaceAttack');

  it('die Bewegung lässt die Raumrunde stehen, „End Turn“ feuert die Fremden und rückt weiter', () => {
    const moved = runRound(withFoe(), clock, always(2));
    expect(moved.campaign.flight!.round).toBe(1);
    expect(moved.campaign.flight!.phase).toBe('fire');
    expect(shots(moved.campaign)).toHaveLength(0);
    const end = endFirePhase(moved.campaign, clock, always(2));
    expect(shots(end.campaign).length).toBeGreaterThan(0);
    expect(end.campaign.flight!.round).toBe(2);
    expect(end.campaign.flight!.phase).toBe('thrust');
  });

  it('ein Stand in der Feuerphase übersteht die Kampagnendatei (die Spur ist dann eine Runde länger)', () => {
    const moved = runRound(withFoe('ignore'), clock, always(2)).campaign;
    expect(fromCampaignFile(toCampaignFile(moved), 'x').flight).toMatchObject({ round: 1, phase: 'fire' });
  });

  it('keine zweite Bewegung in der Feuerphase und kein „End Turn“ vor der Bewegung', () => {
    expect(() => endFirePhase(withFoe(), clock, always(2))).toThrow('Erst die Bewegung');
    const moved = runRound(withFoe(), clock, always(2)).campaign;
    expect(() => runRound(moved, clock, always(2))).toThrow('schon gelaufen');
  });

  it('ein Tipp auf den Hardpoint feuert nur diesen, der andere darf noch', () => {
    let c = withFoe('ignore');
    c = { ...c, ships: c.ships.map((s) => (s.id === c.flight!.party ? { ...s, turrets: [{ type: 'double', weapons: ['pulse-laser'] }, { type: 'single', weapons: ['beam-laser'] }] } : s)) };
    expect(hardpointsOf(c, 0).map((h) => h.turret)).toEqual([0, 1]);
    const first = fireHardpoint(c, 0, 1, 1, always(2), clock).campaign;
    expect(shots(first).filter((e) => e.attacker === c.ships[0]!.name).map((e) => (e.kind === 'spaceAttack' ? e.turret : 0))).toEqual([1]);
    expect(first.flight!.units[0]!.firedTurrets).toEqual([1]);
    expect(hardpointBlocker(first, 0, 1, 1)).toMatch(/schon gefeuert/);
    expect(hardpointBlocker(first, 0, 1, 0)).toBeUndefined();
    // Die Salve des ganzen Schiffs nimmt nur den noch freien Hardpoint (2026-11-23).
    const rest = fireAt(first, 0, 1, always(2), clock).campaign;
    expect(shots(rest).filter((e) => e.kind === 'spaceAttack' && e.attacker === rest.ships[0]!.name && e.turret === 1)).toHaveLength(1);
  });

  it('ohne Target in der CPU feuert kein Turret, ohne Maneuver steht das Schiff still', () => {
    const c = cpu(withFoe('ignore')); // nur Speicher, keine Pflichtprogramme in der CPU
    expect(hardpointBlocker(c, 0, 1, 0)).toMatch(/Target/);
    expect(fireBlocker(c, 0, 1)).toMatch(/Target/);
    expect(maxGOf(c, c.flight!.units[0]!)).toBe(0);
    expect(() => fireHardpoint(c, 0, 1, 0, always(6), clock)).toThrow(/Target/);
  });

  it('Predict und der Gunner werden DM des Schusses und stehen im Log', () => {
    let c = cpu(withFoe('ignore'), 'maneuver', 'target', 'predict-1', 'gunner-interact');
    // Jonas Reyl hat keine Gunnery-Fertigkeit; für den Versuch des Gunner-DMs gibt sie ihm der Test.
    expect(gunnerSkillOf(c, shipById(c, c.flight!.party), 0)).toBe(0);
    c = { ...c, characters: c.characters.map((p) => (p.name === 'Jonas Reyl' ? { ...p, skills: [...p.skills, { of: 'gunnery', level: 2, retired: false }] } : p)) };
    const preview = firePreview(c, 0, 1, 0)!;
    expect(preview.predict).toBe(1);
    expect(preview.gunner).toBe(2);
    expect(preview.weapons[0]!.parts.map((p) => p.reason)).toEqual(expect.arrayContaining(['predict', 'gunnery']));
    const after = fireHardpoint(c, 0, 1, 0, always(2), clock).campaign;
    expect(shots(after)[0]).toMatchObject({ predict: 1, gunnery: 2, dm: 3 });
  });

  it('ein Ausweichprogramm gibt dem Ziel DM − und kostet 1 G Schub', () => {
    const c = cpu(withFoe(), 'maneuver', 'target', 'auto-evade');
    expect(maxGOf(c, c.flight!.units[0]!)).toBe(maxGOf(withFoe(), withFoe().flight!.units[0]!) - 1);
    const end = endFirePhase(runRound(c, clock, always(2)).campaign, clock, always(2)).campaign;
    const atUs = shots(end).find((e) => e.kind === 'spaceAttack' && e.target === end.ships[0]!.name);
    expect(atUs).toMatchObject({ evade: -2 });
  });

  it('mit Return Fire feuert das eigene Schiff am Ende der Runde von selbst zurück', () => {
    const c = cpu(withFoe('ignore'), 'maneuver', 'target', 'return-fire');
    const first = fireHardpoint(c, 0, 1, 0, always(2), clock).campaign;
    // Das Ziel feuert wie bisher zurück; das eigene Schiff hat noch nicht zurückgefeuert.
    expect(first.flight!.units[0]!.returned).toBeUndefined();
    // Am Ende der Raumrunde schießt der Kreuzer, und die Yacht antwortet von selbst – einmal.
    const end = endFirePhase(runRound(first, clock, always(2)).campaign, clock, always(2)).campaign;
    const mine = shots(end).filter((e) => e.kind === 'spaceAttack' && e.attacker === end.ships[0]!.name);
    expect(mine.some((e) => e.kind === 'spaceAttack' && e.returnFire === true)).toBe(true);
    expect(end.flight!.units.find((u) => u.ship !== undefined)!.returned).toBe(true);
  });

  it('ohne Return Fire bleibt das eigene Schiff stumm, auch wenn es beschossen wird', () => {
    const c = withFoe('ignore');
    const first = fireHardpoint(c, 0, 1, 0, always(2), clock).campaign;
    const end = endFirePhase(runRound(first, clock, always(2)).campaign, clock, always(2)).campaign;
    expect(shots(end).some((e) => e.kind === 'spaceAttack' && e.attacker === end.ships[0]!.name && e.returnFire === true)).toBe(false);
  });
});

describe('Antriebsbuchstaben und Schadenskontrolle (Stufe 2b, 2026-11-22d)', () => {
  it('ein Treffer senkt den Buchstaben; die Leistung kommt aus dem Drive Potential, Power Plant begrenzt beide', () => {
    // Patrol Cruiser: 400 t, Jump F, Maneuver H, Power Plant H → Sprung 3, 4 G.
    const none = { hits: [], turretsOut: [] };
    expect([jumpAfter('T', none), maneuverAfter('T', none)]).toEqual([3, 4]);
    expect(maneuverAfter('T', { hits: ['maneuver'], turretsOut: [] })).toBe(3); // H → G: 3 G
    expect(driveLettersAfter('T', { hits: ['maneuver'], turretsOut: [] })).toEqual({ jump: 'F', maneuver: 'G', powerPlant: 'H' });
    // Drei Treffer aufs Power Plant: H → E, Leistung 2; Antrieb und Sprung höchstens 2.
    const plant = { hits: ['powerPlant', 'powerPlant', 'powerPlant'] as const, turretsOut: [] };
    expect([jumpAfter('T', { ...plant, hits: [...plant.hits] }), maneuverAfter('T', { ...plant, hits: [...plant.hits] })]).toEqual([2, 2]);
    // Subsidized Liner: 600 t, Jump J → H: Sprung 2 statt 3.
    expect(jumpAfter('M', { hits: ['jump'], turretsOut: [] })).toBe(2);
    // Kritisch: 0, der Buchstabe ist weg.
    expect(driveLettersAfter('T', { hits: ['criticalJump'], turretsOut: [] })?.jump).toBe('–');
    // Ohne Buchstaben (Corsair, Small Craft) wie in Stufe 2: je Treffer 1 G.
    expect(maneuverAfter('P', { hits: ['maneuver'], turretsOut: [] })).toBe(2);
    expect(driveLettersAfter('P', none)).toBeUndefined();
  });

  it('ein geflickter Treffer wirkt nicht mehr, auch nicht auf Turrets; die Werft berechnet ihn trotzdem', () => {
    expect(maneuverAfter('T', { hits: ['maneuver'], patched: [0], turretsOut: [] })).toBe(4);
    // Zwei Turret-Treffer auf Turret 1 und 0; der erste ist geflickt, also ist nur Turret 0 aus.
    expect(turretsDown({ hits: ['turret', 'hull', 'turret'], patched: [0], turretsOut: [1, 0] })).toEqual([0]);
    expect(patchableHits({ hits: ['turret', 'hull', 'criticalJump'], patched: [0], turretsOut: [1] })).toEqual([1]);
    const c = flying();
    const damaged: Campaign = { ...c, ships: c.ships.map((s) => (s.id === c.flight!.party ? { ...s, damage: { hits: ['maneuver', 'criticalJump'], patched: [0], turretsOut: [] } } : s)) };
    expect(repairCostOf(damaged, shipById(damaged, c.flight!.party))).toBe(1_100_000);
  });

  /** Kampf gegen einen Free Trader, der nichts tut; die Yacht hat einen Maneuver-Treffer und einen kritischen. */
  const battle = (): Campaign => {
    const c = placeFoe(flying(), 'A', 'ignore', clock);
    return { ...c, ships: c.ships.map((s) => (s.id === c.flight!.party ? { ...s, damage: { hits: ['maneuver', 'criticalComputer'], turretsOut: [] } } : s)) };
  };
  /** Jonas Reyl auf den Posten Engineer, mit Engineering-2 (zwei Posten: zählt 1). */
  const withEngineer = (c: Campaign): Campaign => {
    const ship = shipById(c, c.flight!.party);
    const jonas = c.characters.find((p) => p.name === 'Jonas Reyl')!;
    const trained = { ...c, characters: c.characters.map((p) => (p.id === jonas.id ? { ...p, skills: [...p.skills, { of: 'engineering', level: 2, retired: false }] } : p)) };
    return seat(trained, ship.id, postsOf(ship).findIndex((p) => p.post === 'engineer'), jonas.id);
  };

  it('nur im Raumkampf, nach der Bewegung, mit einem Engineer; kritische Treffer lassen sich nicht flicken', () => {
    expect(damageControlBlocker(battle(), 0)).toMatch(/Bewegung/);
    const moved = runRound(battle(), clock, always(2)).campaign;
    expect(damageControlBlocker(moved, 0)).toMatch(/keinen Engineer/);
    const ready = withEngineer(moved);
    expect(engineerOf(ready, shipById(ready, ready.flight!.party))).toMatchObject({ skill: 1 });
    expect(damageControlBlocker(ready, 0, 0)).toBeUndefined();
    expect(damageControlBlocker(ready, 0, 1)).toMatch(/kritisch/);
    expect(damageControlBlocker(ready, 1)).toMatch(/fremdes Schiff/);
  });

  it('9+ auf 2W6 + Engineering flickt; einmal je Raumrunde, in der nächsten wieder', () => {
    const ready = withEngineer(runRound(battle(), clock, always(2)).campaign);
    const own = ready.flight!.party;
    const failed = controlDamage(ready, 0, 0, always(3), clock); // 3 + 3 + 1 = 7
    expect(failed.log.at(-1)).toMatchObject({ kind: 'damageControl', round: 1, zone: 'maneuver', dice: [3, 3], dm: 1, by: ready.characters.find((p) => p.name === 'Jonas Reyl')!.id });
    expect(shipById(failed, own).damage!.patched).toBeUndefined();
    expect(damageControlBlocker(failed, 0, 0)).toMatch(/schon geflickt/);
    const later = runRound(endFirePhase(failed, clock, always(2)).campaign, clock, always(2)).campaign;
    const patched = controlDamage(later, 0, 0, always(4), clock); // 4 + 4 + 1 = 9
    expect(shipById(patched, own).damage!.patched).toEqual([0]);
    expect(maxGOf(patched, patched.flight!.units[0]!)).toBe(1);
    // Übersteht die Kampagnendatei: geflickt am Schiff, der Logeintrag.
    const loaded = fromCampaignFile(toCampaignFile(patched), 'x');
    expect(shipById(loaded, own).damage!.patched).toEqual([0]);
    expect(loaded.log.at(-1)).toMatchObject({ kind: 'damageControl', zone: 'maneuver' });
  });

  it('ein fremdes Schiff flickt am Ende der Raumrunde von selbst, zuerst den Antrieb, mit Engineering 1', () => {
    const c = placeFoe(flying(), 'T', 'ignore', clock);
    const hurt: Campaign = { ...c, flight: { ...c.flight!, units: c.flight!.units.map((u, i) => (i === 1 ? { ...u, damage: { hits: ['hull', 'maneuver'], turretsOut: [] } } : u)) } };
    const end = endFirePhase(runRound(hurt, clock, always(2)).campaign, clock, always(4)).campaign; // 4 + 4 + 1 = 9
    expect(end.flight!.units[1]!.damage!.patched).toEqual([1]);
    expect(end.log.filter((e) => e.kind === 'damageControl')).toEqual([expect.objectContaining({ unit: 'Patrol Cruiser', zone: 'maneuver', dm: 1 })]);
    expect(end.log.at(-1)).toMatchObject({ kind: 'damageControl' });
  });
});
