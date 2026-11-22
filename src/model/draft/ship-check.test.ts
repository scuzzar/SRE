import { describe, expect, it } from 'vitest';
import {
  book,
  createDemoCampaign,
  departFromFlight,
  departureBlocker,
  encounterColumnAt,
  fromCampaignFile,
  isSystemDestination,
  jumpLimitDm,
  needsLanding,
  sceneOf,
  shipOnSums,
  startFlight,
  systemJourneyBlocker,
  toCampaignFile,
  travelInSystem,
  type Campaign,
} from '..';
import { answerSighting, openShipCheck, rollShipCheck, skipShipCheck } from '.';
import { fixedClock, fixedRandom } from '../testing';

const clock = fixedClock();

/** Die Demo auf Kessra (Raumhafen A) mit Geld in der Kasse und einer Welt desselben Systems als Ziel. */
function demo(): { campaign: Campaign; to: string; from: string } {
  const campaign = book(createDemoCampaign(clock), 'income', 5_000_000, clock);
  const from = campaign.location!.world;
  const to = campaign.hexes[0]!.worlds.find((w) => w.id !== from && isSystemDestination(w) && systemJourneyBlocker(campaign, w.id, 'ship') === undefined)!.id;
  return { campaign, to, from };
}

/** Würfe für ein Schiff, das angreift: Begegnung 3 + (3 − DM) = 6 (Scout), Reaktion 1 + 1, dann Abstand und Richtung. */
function attacking(c: Campaign, world: string, ...after: number[]) {
  const { dm } = encounterColumnAt(c.hexes, world);
  return fixedRandom(3, 3 - dm, 1, 1, ...after);
}

describe('Schiffsbegegnungen bei Abreise und Ankunft (2026-11-22b)', () => {
  it('Zielwert: die Summen, bei denen ein Schiff kommt, je Spalte und DM', () => {
    expect(shipOnSums({ column: 'A', dm: 0 })).toEqual([6, 7, 8, 9, 10, 11, 12]);
    expect(shipOnSums({ column: 'A', dm: 2 })).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(shipOnSums({ column: 'E', dm: 0 })).toEqual([4, 9, 10, 11, 12]);
  });

  it('Start ohne Schiff: Die Reise im System findet statt, der Wurf steht an ihr; bei der Ankunft ebenso', () => {
    const { campaign, to, from } = demo();
    const step = rollShipCheck(campaign, openShipCheck(from, { occasion: 'departure', travelTo: to }), fixedRandom(1, 1), clock);
    expect(step).toMatchObject({ travelled: true, flight: false });
    expect(step.check?.result?.code).toBeUndefined();
    expect(step.campaign.log.at(-1)).toMatchObject({ kind: 'systemJourney', to, departureRoll: [1, 1] });
    const arrival = rollShipCheck(step.campaign, openShipCheck(to, { occasion: 'arrival' }), fixedRandom(1, 2), clock);
    expect(arrival.campaign.log.at(-1)).toMatchObject({ kind: 'systemJourney', departureRoll: [1, 1], arrivalRoll: [1, 2] });
  });

  it('Abbrechen lässt den Wurf aus: Die Reise findet ohne Wurf statt, nichts sonst im Log', () => {
    const { campaign, to, from } = demo();
    const step = skipShipCheck(campaign, openShipCheck(from, { occasion: 'departure', travelTo: to }), fixedRandom(), clock);
    expect(step.check).toBeUndefined();
    expect(step.campaign.log.at(-1)).toMatchObject({ kind: 'systemJourney', to });
    expect(step.campaign.log.at(-1)).not.toHaveProperty('departureRoll');
    expect(step.campaign.log.filter((e) => e.kind === 'spaceBattle')).toHaveLength(0);
  });

  it('Angriff beim Start: Systemflug an der Startwelt mit dem fremden Schiff, die Reise wartet; „Reisen nach …“ setzt sie fort', () => {
    const { campaign, to, from } = demo();
    const step = rollShipCheck(campaign, openShipCheck(from, { occasion: 'departure', travelTo: to }), attacking(campaign, from, 2, 3, 1), clock);
    expect(step).toMatchObject({ travelled: false, flight: true });
    const c = step.campaign;
    expect(c.flight).toMatchObject({ world: from, departure: { travelTo: to } });
    expect(c.flight!.units[1]).toMatchObject({ design: 'S', intent: 'attack' });
    expect(c.log.at(-1)).toMatchObject({ kind: 'spaceBattle', design: 'S', occasion: 'departure', travelTo: to, reaction: [1, 1] });
    expect(c.log.some((e) => e.kind === 'systemJourney')).toBe(false);
    // Übersteht die Kampagnendatei.
    const loaded = fromCampaignFile(toCampaignFile(c), 'x');
    expect(loaded.flight?.departure).toEqual({ travelTo: to });
    expect(loaded.log.at(-1)).toMatchObject({ occasion: 'departure', travelTo: to });
    // Weiterreisen: ohne neuen Wurf beim Start; das fremde Schiff bleibt zurück.
    expect(departureBlocker(c)).toBeUndefined();
    const gone = departFromFlight(c, fixedRandom(), clock);
    expect(gone.flight).toBeUndefined();
    expect(gone.location?.world).toBe(to);
    const tail = gone.log.slice(c.log.length);
    expect(tail.map((e) => e.kind)).toEqual(['spaceBattleEnd', 'systemJourney']);
    expect(tail[0]).toMatchObject({ outcome: 'departed', foe: 'Scout/Courier' });
  });

  it('Angriff bei der Ankunft: Systemflug an der Zielwelt, das Schiff an der Sprunggrenze (100 Durchmesser), ruhend', () => {
    const { campaign, to } = demo();
    const arrived = travelInSystem(campaign, to, 'ship', clock);
    const step = rollShipCheck(arrived, openShipCheck(to, { occasion: 'arrival' }), attacking(arrived, to, 2, 3, 1, 2), clock);
    const flight = step.campaign.flight!;
    expect(flight.world).toBe(to);
    expect(flight.departure).toBeUndefined();
    expect(step.campaign.log.at(-1)).toMatchObject({ kind: 'spaceBattle', occasion: 'arrival' });
    // Der Landeplatz wartet, bis der Flug vorbei ist (die Regel steht im Snapshot); gebraucht wird er weiter.
    expect(needsLanding(step.campaign) || step.campaign.location?.cell === undefined).toBe(true);
    const own = flight.units[0]!;
    const scene = sceneOf(step.campaign.hexes, to);
    const moon = scene.moons.find((m) => m.world === to);
    const radius = moon ? moon.body?.radius : scene.body?.radius;
    if (radius !== undefined && !moon) expect(Math.hypot(own.position.x, own.position.y)).toBeCloseTo(200 * radius, 0);
    if (!moon) expect(own.velocity).toEqual({ x: 0, y: 0 });
  });

  it('Sichtung: Ein Schiff, das ignoriert, fragt; „Weiter“ schreibt nur den Logeintrag, „Zur Raumkarte“ öffnet den Flug', () => {
    const { campaign, to, from } = demo();
    const { dm } = encounterColumnAt(campaign.hexes, from);
    // Begegnung 6 (Scout), Reaktion 3 + 4 = 7: ignoriert.
    const check = openShipCheck(from, { occasion: 'departure', travelTo: to });
    const step = rollShipCheck(campaign, check, fixedRandom(3, 3 - dm, 3, 4), clock);
    expect(step.campaign).toBe(campaign);
    expect(step.check?.sighting).toMatchObject({ kind: 'spaceBattle', intent: 'ignore', occasion: 'departure', travelTo: to });
    const pass = answerSighting(step.campaign, step.check!, false, fixedRandom(), clock);
    expect(pass.travelled).toBe(true);
    expect(pass.campaign.log.slice(-2).map((e) => e.kind)).toEqual(['spaceBattle', 'systemJourney']);
    const map = answerSighting(step.campaign, step.check!, true, fixedRandom(2, 3, 1), clock);
    expect(map.flight).toBe(true);
    expect(map.campaign.flight!.units[1]).toMatchObject({ intent: 'ignore' });
    expect(map.campaign.flight!.departure).toEqual({ travelTo: to });
  });

  it('Sprung aus dem Systemflug: DM +15 innerhalb 10 Durchmesser, +5 innerhalb 100, sonst keiner', () => {
    const { campaign, from } = demo();
    const c = startFlight(campaign, from, clock);
    const scene = sceneOf(c.hexes, from);
    const r = scene.body!.radius;
    expect(jumpLimitDm(scene, { x: 0, y: 2 * r }, 0)).toBe(15);
    expect(jumpLimitDm(scene, { x: 0, y: 50 * r }, 0)).toBe(5);
    if (scene.moons.length === 0) expect(jumpLimitDm(scene, { x: 0, y: 500 * r }, 0)).toBe(0);
    // Ohne unterbrochene Reise gibt es keinen Knopf.
    expect(departureBlocker(c)).toMatch(/keine Reise/);
  });
});
