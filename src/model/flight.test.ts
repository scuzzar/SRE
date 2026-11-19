import { describe, expect, it } from 'vitest';
import {
  addShip,
  bodyOf,
  createDemoCampaign,
  elapsedOf,
  endFlight,
  fromCampaignFile,
  jumpLimitsOf,
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
} from '.';
import { fixedClock } from './testing';

const clock = fixedClock();

/** Die Demo-Kampagne auf Kessra (Größe 7), mit Scout. */
function demo(): Campaign {
  return createDemoCampaign(clock);
}
const world = (c: Campaign) => c.location!.world;

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
    expect(lengthOf(unit.position)).toBeCloseTo(2 * body.radius, 6);
    expect(lengthOf(unit.velocity)).toBeCloseTo(Math.sqrt(body.gm / (2 * body.radius)), 9);
    expect(unit.ship).toBe(c.ships[0]!.id);
    expect(endFlight(c).flight).toBeUndefined();
  });

  it('geht nur auf der Welt der Gruppe und nur mit Schiff', () => {
    const c = demo();
    expect(() => startFlight(c, '0101', clock)).toThrow(/Welt, auf der die Gruppe ist/);
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
    const r0 = lengthOf(c.flight!.units[0]!.position);
    for (let i = 0; i < 30; i++) c = runRound(c, clock).campaign;
    expect(Math.abs(lengthOf(c.flight!.units[0]!.position) - r0) / r0).toBeLessThan(1e-3);
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
    const preview = previewOf(bodyOf(worldOf(c.hexes, world(c))), c.flight!.units[0]!, c.flight!.units[0]!.thrust);
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
