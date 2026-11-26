import { describe, expect, it } from 'vitest';
import { countingKeys, fixedClock, fixedRandom, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';

/** Ein Controller mit der Demo-Kampagne (Kessra, Yacht „Kestrel“ mit Beiboot), die Weltkarte von Kessra offen. */
async function started() {
  const repository = memoryRepository();
  const game = new GameController({ repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
  await game.init();
  await game.whenSaved();
  const here = game.snapshot().location!;
  game.chooseHex(Number(here.slice(0, 2)), Number(here.slice(2)));
  return { game, repository, here };
}

describe('Raumkarte und Systemflug', () => {
  it('öffnet die Raumkarte der offenen Welt und beginnt dort den Systemflug', async () => {
    const { game, repository, here } = await started();
    game.openSpace();
    let space = game.snapshot().space!;
    expect(space.world.id).toBe(here);
    expect(space.here).toBe(true);
    expect(space.startBlocker).toBeUndefined();
    expect(space.flight).toBeUndefined();
    expect(space.jumpLimits.map((j) => j.dm)).toEqual([15, 5]);
    game.startFlight();
    await game.whenSaved();
    space = game.snapshot().space!;
    expect(space.flight).toMatchObject({ round: 1, elapsed: '0 min' });
    expect(space.flight!.units[0]).toMatchObject({ name: 'Kestrel', maxG: 1, crashed: false, thrust: undefined });
    expect(space.flight!.units[0]!.marks.map((m) => m.name)).toEqual(['prograd', 'retrograd']);
    expect(repository.saved!.flight?.round).toBe(1);
  });

  it('„Starten“ im Bereich Schiff öffnet die Raumkarte um die Welt des Schiffs und beginnt den Flug; die Bedienung steht im Bereich Schiff (Owner, 21. November 2026)', async () => {
    const repository = memoryRepository();
    const game = new GameController({ repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await game.init();
    expect(game.snapshot().ship).toMatchObject({ launchBlocker: undefined, flying: false });
    game.launch();
    const view = game.snapshot();
    expect(view.screen).toBe('ship');
    expect(view.space?.world.id).toBe(view.location);
    expect(view.space?.flight?.round).toBe(1);
    expect(view.ship?.flying).toBe(true);
    // Raumkarte zu: „Zum Flug“ holt sie wieder.
    game.closeSpace();
    expect(game.snapshot().space).toBeUndefined();
    game.showFlight();
    expect(game.snapshot().space?.flight?.round).toBe(1);
    game.endFlight();
    expect(game.snapshot().ship?.flying).toBe(false);
  });

  it('Landeautomatik: ein halbes G gegen die Bahn, dann landet das Schiff; erst nach dem Landeplatz geht die Raumkarte zu (Owner, 21. November 2026)', async () => {
    const repository = memoryRepository();
    const game = new GameController({ repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await game.init();
    game.launch();
    // Das Schiff startet über der Welt gegen den Uhrzeigersinn, also nach links; nach rechts ist gegen die Bahn.
    game.setThrust(0, { x: 0.5, y: 0 });
    expect(game.snapshot().space?.flight?.units[0]?.preview.landing).toBeDefined();
    for (let i = 0; i < 6 && game.snapshot().space?.flight; i++) game.runRound();
    const view = game.snapshot();
    expect(view.space?.flight).toBeUndefined();
    expect(view.space).toBeDefined();
    expect(view.landing?.ports.length).toBeGreaterThan(0);
    game.landAtPort(view.landing!.ports[0]!.city);
    expect(game.snapshot().space).toBeUndefined();
    expect(game.snapshot().globe?.touchdown).toBe(1);
  });

  it('ein gezogener Schub zeigt sich in der Vorschau, gesetzt wird er erst beim Loslassen', async () => {
    const { game, repository } = await started();
    game.openSpace();
    game.startFlight();
    await game.whenSaved();
    const before = game.snapshot().space!.flight!.units[0]!;
    game.aimThrust(0, { x: 0, y: 5 });
    const aimed = game.snapshot().space!.flight!.units[0]!;
    expect(aimed.thrustG).toBe(1);
    expect(aimed.preview.now.at(-1)).not.toEqual(before.preview.now.at(-1));
    expect(repository.saved!.flight!.units[0]!.thrust).toBeUndefined();
    game.setThrust(0, { x: 0, y: 5 });
    await game.whenSaved();
    expect(repository.saved!.flight!.units[0]!.thrust).toEqual({ x: 0, y: 1 });
  });

  it('rastet in Flugrichtung ein', async () => {
    const { game } = await started();
    game.openSpace();
    game.startFlight();
    // Das Schiff startet oberhalb der Welt und fliegt gegen den Uhrzeigersinn nach −x: prograd zeigt nach −x.
    game.aimThrust(0, { x: -1, y: 0.05 });
    const unit = game.snapshot().space!.flight!.units[0]!;
    expect(unit.snap).toBe('prograd');
    expect(unit.thrust!.y).toBeCloseTo(0, 12);
  });

  it('führt die Raumrunde aus, gibt die Wiedergabe und leert den Schub', async () => {
    const { game } = await started();
    game.openSpace();
    game.startFlight();
    game.setThrust(0, { x: 1, y: 0 });
    game.runRound();
    const flight = game.snapshot().space!.flight!;
    expect(flight.round).toBe(2);
    expect(flight.elapsed).toBe('17 min');
    expect(flight.run?.round).toBe(2);
    expect(flight.run?.frames.length).toBe(51);
    expect(flight.units[0]!.thrust).toBeUndefined();
    expect(flight.units[0]!.track).toHaveLength(1);
  });

  it('beendet den Systemflug und schließt die Raumkarte', async () => {
    const { game, repository } = await started();
    game.openSpace();
    game.startFlight();
    game.endFlight();
    await game.whenSaved();
    expect(game.snapshot().space!.flight).toBeUndefined();
    expect(repository.saved!.flight).toBeUndefined();
    game.closeSpace();
    expect(game.snapshot().space).toBeUndefined();
  });

  it('beginnt nicht auf einer fremden Welt', async () => {
    const { game } = await started();
    game.createCampaign('Ohne Schiff');
    expect(() => game.openSpace()).toThrow(/keine Welt offen/);
  });

  it('setzt das Beiboot aus, die Gruppe steigt um, und dockt es wieder an (2026-11-21b)', async () => {
    const { game, repository } = await started();
    game.openSpace();
    game.startFlight();
    let flight = game.snapshot().space!.flight!;
    expect(flight.launchable.map((c) => c.name)).toEqual(['Beiboot 1']);
    game.launchCraft(flight.launchable[0]!.id);
    await game.whenSaved();
    flight = game.snapshot().space!.flight!;
    expect(flight.units.map((u) => [u.name, u.party, u.craft])).toEqual([
      ['Kestrel', false, false],
      ['Beiboot 1', true, true],
    ]);
    expect(flight.party).toBe(1);
    expect(flight.units[1]!.maxG).toBe(6);
    expect(flight.dockable.map((c) => c.name)).toEqual(['Beiboot 1']);
    expect(repository.saved!.flight!.party).toBe(repository.saved!.ships[1]!.id);
    game.dockCraft(flight.dockable[0]!.id);
    flight = game.snapshot().space!.flight!;
    expect(flight.units).toHaveLength(1);
    expect(flight.launchable).toHaveLength(1);
  });
});
