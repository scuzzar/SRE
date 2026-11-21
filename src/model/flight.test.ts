import { describe, expect, it } from 'vitest';
import {
  addShip,
  bodyOf,
  createDemoCampaign,
  elapsedOf,
  endFlight,
  flightTime,
  fromCampaignFile,
  hexFromFlat,
  jumpLimitsOf,
  moonAt,
  originAt,
  sceneOf,
  setHexes,
  setLocation,
  lengthOf,
  maxGOf,
  normalThrust,
  previewOf,
  ROUND_SECONDS,
  runRound,
  setThrust,
  startFlight,
  toCampaignFile,
  worldOf,
  type Campaign,
  type Hex,
  type Vec,
} from '.';
import { fixedClock } from './testing';

const clock = fixedClock();

/** Die Demo-Kampagne auf Kessra (Größe 7), mit Scout. */
function demo(): Campaign {
  return createDemoCampaign(clock);
}
const world = (c: Campaign) => c.location!.world;
/** Wo die Welt des Flugs jetzt steht (Kessra ist in der Demo Mond eines Gasriesen). */
const worldAt = (c: Campaign): { position: Vec; velocity: Vec } => originAt(sceneOf(c.hexes, c.flight!.world), c.flight!.world, flightTime(c, c.flight!));
/** Der Ort der ersten Einheit von der Welt aus gesehen. */
const relative = (c: Campaign): Vec => {
  const at = worldAt(c).position;
  const p = c.flight!.units[0]!.position;
  return { x: p.x - at.x, y: p.y - at.y };
};

describe('Systemflug: Körper der Welt', () => {
  it('rechnet Radius und Masse aus der Größe (SR 22, K = 1)', () => {
    const c = demo();
    const hex = worldOf(c.hexes, world(c));
    const body = bodyOf(hex)!;
    const size = hex.uwp.size!;
    expect(body.radius).toBe(size * 800);
    // Schwerkraft an der Oberfläche g = Größe ÷ 8 G
    expect(body.gm / body.radius ** 2 / 0.01).toBeCloseTo(size / 8, 10);
    expect(jumpLimitsOf(hex)).toEqual([20 * body.radius, 200 * body.radius]);
  });

  it('kennt bei Größe 0 keinen Körper', () => {
    const c = demo();
    const hex = worldOf(c.hexes, world(c));
    expect(bodyOf({ ...hex, uwp: { ...hex.uwp, size: 0 } })).toBeUndefined();
  });
});

describe('Systemflug: beginnen und beenden', () => {
  it('startet das Schiff auf einer Kreisbahn mit doppeltem Weltradius', () => {
    const c = startFlight(demo(), world(demo()), clock);
    const body = bodyOf(worldOf(c.hexes, world(c)))!;
    const unit = c.flight!.units[0]!;
    expect(c.flight!.round).toBe(1);
    expect(lengthOf(relative(c))).toBeCloseTo(2 * body.radius, 6);
    const v = worldAt(c).velocity;
    expect(lengthOf({ x: unit.velocity.x - v.x, y: unit.velocity.y - v.y })).toBeCloseTo(Math.sqrt(body.gm / (2 * body.radius)), 9);
    expect(unit.ship).toBe(c.ships[0]!.id);
    expect(endFlight(c).flight).toBeUndefined();
  });

  it('geht nur auf der Welt der Gruppe und nur mit Schiff', () => {
    const c = demo();
    expect(() => startFlight(c, '0101', clock)).toThrow(/System, in dem die Gruppe ist/);
    expect(() => startFlight({ ...c, ships: [] }, world(c), clock)).toThrow(/kein Schiff/);
    const flying = startFlight(c, world(c), clock);
    expect(() => startFlight(flying, world(c), clock)).toThrow(/schon/);
  });
});

describe('Systemflug: Schub und Runde', () => {
  it('kappt den Schub beim höchsten Schub und rundet auf 0,1 G', () => {
    expect(normalThrust({ x: 3, y: 4 }, 2)).toEqual({ x: 1.2000000000000002, y: 1.6 });
    expect(lengthOf(normalThrust({ x: 0.123, y: 0 }, 2)!)).toBeCloseTo(0.1, 12);
    expect(normalThrust({ x: 0.02, y: 0 }, 2)).toBeUndefined();
    const c = startFlight(demo(), world(demo()), clock);
    expect(maxGOf(c, c.flight!.units[0]!)).toBe(2);
    const set = setThrust(c, 0, { x: 10, y: 0 });
    expect(lengthOf(set.flight!.units[0]!.thrust!)).toBeCloseTo(2, 12);
    expect(setThrust(set, 0, undefined).flight!.units[0]!.thrust).toBeUndefined();
  });

  it('hält eine Kreisbahn ohne Schub über viele Runden stabil', () => {
    let c = startFlight(demo(), world(demo()), clock);
    const r0 = lengthOf(relative(c));
    for (let i = 0; i < 30; i++) c = runRound(c, clock).campaign;
    expect(Math.abs(lengthOf(relative(c)) - r0) / r0).toBeLessThan(1e-3);
    expect(c.flight!.round).toBe(31);
    expect(c.flight!.units[0]!.track).toHaveLength(30);
  });

  it('leert den Schub nach der Runde und gibt Bilder für die Wiedergabe', () => {
    const c = setThrust(startFlight(demo(), world(demo()), clock), 0, { x: 1, y: 0 });
    const { campaign, frames } = runRound(c, clock);
    expect(campaign.flight!.units[0]!.thrust).toBeUndefined();
    expect(frames).toHaveLength(51);
    expect(frames[0]![0]).toEqual(c.flight!.units[0]!.position);
    expect(frames.at(-1)![0]).toEqual(campaign.flight!.units[0]!.position);
  });

  it('lässt mit vollem Schub zur Welt hin aufschlagen, danach bewegt sich nichts mehr', () => {
    let c = startFlight(demo(), world(demo()), clock);
    // Das Schiff steht oberhalb der Welt; Schub nach unten zeigt auf ihre Mitte.
    c = setThrust(c, 0, { x: 0, y: -2 });
    const preview = previewOf(sceneOf(c.hexes, world(c)), c.flight!.units[0]!, c.flight!.units[0]!.thrust, flightTime(c, c.flight!));
    expect(preview.impact).toBeDefined();
    for (let i = 0; i < 3 && !c.flight!.units[0]!.crashed; i++) c = runRound(c, clock).campaign;
    const unit = c.flight!.units[0]!;
    expect(unit.crashed).toBe(true);
    expect(() => setThrust(c, 0, { x: 1, y: 0 })).toThrow(/aufgeschlagen/);
    expect(runRound(c, clock).campaign.flight!.units[0]!.position).toEqual(unit.position);
  });

  it('lässt nach vollen 24 Stunden einen Tag vergehen', () => {
    let c = startFlight(demo(), world(demo()), clock);
    const day = c.day;
    for (let i = 0; i < 86; i++) c = runRound(c, clock).campaign;
    expect(elapsedOf(c.flight!)).toBe(86 * ROUND_SECONDS);
    expect(c.day).toBe(day);
    c = runRound(c, clock).campaign;
    expect(c.day).toBe(day + 1);
    expect(c.log.at(-1)).toMatchObject({ kind: 'time', days: 1 });
  });
});

describe('Systemflug: Kampagnendatei', () => {
  it('übersteht Export und Import', () => {
    let c = setThrust(startFlight(demo(), world(demo()), clock), 0, { x: 0, y: 1 });
    c = runRound(setThrust(c, 0, { x: 1, y: 0 }), clock).campaign;
    c = setThrust(c, 0, { x: 0, y: 0.5 });
    const read = fromCampaignFile(toCampaignFile(c), c.id, { key: c.key, changedAt: c.changedAt });
    expect(read.flight).toEqual(c.flight);
  });

  it('weist eine Spur zurück, die nicht zur Raumrunde passt', () => {
    const c = startFlight(demo(), world(demo()), clock);
    const broken = { ...c, flight: { ...c.flight!, round: 3 } };
    expect(() => fromCampaignFile(toCampaignFile(broken), c.id)).toThrow(/Spur/);
  });

  it('weist einen Schub über dem höchsten Schub zurück', () => {
    const c = startFlight(addShip(demo(), 'A', undefined).campaign, world(demo()), clock);
    const unit = c.flight!.units[0]!;
    const broken = { ...c, flight: { ...c.flight!, units: [{ ...unit, thrust: { x: 2, y: 0 } }] } };
    expect(() => fromCampaignFile(toCampaignFile(broken), c.id)).toThrow(/höchster Schub/);
  });
});

describe('Systemflug mit Monden (2026-11-18d)', () => {
  const uwp = { starport: 10, size: 8, atmosphere: 6, hydrographics: 5, population: 5, government: 4, law: 3, tech: 9 };
  /** Eine Welt der Größe 8 mit einem Mond (Größe 2, 10 Radien, am Tag 0 bei 90°) und einem Ring bei 2 Radien. */
  function withMoon(): Campaign {
    const flat = hexFromFlat({ column: 1, row: 1, empty: false, name: 'Terra', navalBase: false, scoutBase: false, gasGiant: false, uwp, temperature: 'temperate' });
    const hex: Hex = {
      ...flat,
      system: { stars: [{ type: 'G', decimal: 0, size: 'V', close: false }], maxOrbits: 5, emptyOrbits: [] },
      worlds: [
        { ...flat.worlds[0]!, orbit: 3 },
        { id: '0101-1', kind: 'world', uwp: { size: 2, atmosphere: 0, hydrographics: 0, population: 0 }, moonOf: '0101', orbit: 10, angle: 90 },
        { id: '0101-2', kind: 'ring', uwp: { population: 0 }, moonOf: '0101', orbit: 2 },
      ],
    };
    return setLocation(setHexes(demo(), [hex]), '0101');
  }

  it('baut die Szene: die Welt in der Mitte, Monde auf Kreisbahnen, Ringe ohne Schwerkraft', () => {
    const scene = sceneOf(withMoon().hexes, '0101');
    expect(scene.center).toBe('0101');
    expect(scene.moons).toHaveLength(1);
    expect(scene.rings).toEqual([{ world: '0101-2', inner: 2.2 * 6400, outer: 2.8 * 6400 }]);
    const moon = scene.moons[0]!;
    expect(moon.distance).toBe(64_000);
    expect(moonAt(moon, 0).position.x).toBeCloseTo(0, 6);
    expect(moonAt(moon, 0).position.y).toBeCloseTo(64_000, 6);
    // Gegen den Uhrzeigersinn, nach einer Umlaufzeit wieder am selben Ort.
    const period = (2 * Math.PI) / moon.omega;
    expect(moonAt(moon, period / 4).position.x).toBeLessThan(-63_000);
    expect(moonAt(moon, period).position.y).toBeCloseTo(64_000, 3);
  });

  it('lässt das Schiff auf einem Mond aufschlagen', () => {
    let c = startFlight(withMoon(), '0101', clock);
    // Das Schiff mitten in den Mond setzen und eine Runde laufen lassen.
    const scene = sceneOf(c.hexes, '0101');
    const at = moonAt(scene.moons[0]!, flightTime(c, c.flight!));
    c = { ...c, flight: { ...c.flight!, units: [{ ...c.flight!.units[0]!, position: { x: at.position.x, y: at.position.y + 2000 }, velocity: at.velocity }] } };
    expect(runRound(c, clock).campaign.flight!.units[0]!.crashed).toBe(true);
  });

  it('beginnt an der Hauptwelt als Mond eines Gasriesen mitbewegt; am Gasriesen von der Welt der Gruppe aus', () => {
    const base = withMoon();
    const hex = base.hexes[0]!;
    const giant: Hex = {
      ...hex,
      gasGiant: true,
      worlds: [
        { ...hex.worlds[0]!, orbit: 30, moonOf: '0101-3', angle: 0 },
        { id: '0101-3', kind: 'giant', uwp: {}, orbit: 3, large: true, radius: 70_000 },
      ],
    };
    const c = setHexes(base, [giant]);
    expect(sceneOf(c.hexes, '0101').center).toBe('0101-3');
    const flying = startFlight(c, '0101', clock);
    const at = originAt(sceneOf(c.hexes, '0101'), '0101', flightTime(flying, flying.flight!));
    expect(at.position.x).toBeCloseTo(2_100_000, 3);
    const unit = flying.flight!.units[0]!;
    expect(unit.position.x - at.position.x).toBeCloseTo(0, 6);
    expect(unit.position.y - at.position.y).toBeCloseTo(2 * 6400, 6);
    // Der Gasriese hat seine eigene Raumkarte; der Flug darf dort von der Hauptwelt aus beginnen.
    const there = startFlight(c, '0101-3', clock);
    expect(lengthOf(there.flight!.units[0]!.position)).toBeCloseTo(140_000, 6);
    expect(() => startFlight(c, '0101-9', clock)).toThrow();
  });
});

describe('Landen (Owner, 21. November 2026)', () => {
  /** Das Schiff knapp über der Oberfläche der Welt des Flugs, mit ihr mitbewegt, `kms` auf sie zu. */
  function above(c: Campaign, km: number, kms: number): Campaign {
    const at = worldAt(c);
    const r = bodyOf(worldOf(c.hexes, c.flight!.world))!.radius;
    const unit = { ...c.flight!.units[0]!, position: { x: at.position.x, y: at.position.y + r + km }, velocity: { x: at.velocity.x, y: at.velocity.y - kms } };
    return { ...c, flight: { ...c.flight!, units: [unit] } };
  }

  it('langsam aufsetzen ist landen: der Systemflug endet, die Gruppe ist auf der Welt', () => {
    const c = above(startFlight(demo(), world(demo()), clock), 5, 0.3);
    const preview = previewOf(sceneOf(c.hexes, c.flight!.world), c.flight!.units[0]!, undefined, flightTime(c, c.flight!), 2, c.flight!.world);
    expect(preview.landing).toEqual({ round: 0, world: c.flight!.world });
    expect(preview.impact).toBeUndefined();
    const run = runRound(c, clock);
    expect(run.landed).toBe(c.flight!.world);
    expect(run.campaign.flight).toBeUndefined();
    expect(run.campaign.location).toEqual({ world: c.flight!.world });
  });

  it('schnell auftreffen bleibt ein Aufschlag', () => {
    const c = above(startFlight(demo(), world(demo()), clock), 5, 3);
    const run = runRound(c, clock);
    expect(run.landed).toBeUndefined();
    expect(run.campaign.flight!.units[0]!.crashed).toBe(true);
  });
});
