import { describe, expect, it } from 'vitest';
import type { Random } from '../model';
import { countingKeys, fixedClock, fixedRandom, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';

async function started(random: Random = fixedRandom(), repository = memoryRepository(), download = memoryDownload()) {
  const game = new GameController({ repository, random, clock: fixedClock(), download, keys: countingKeys() });
  await game.init();
  await game.whenSaved();
  return { game, repository, download };
}

/** Geld in die Gruppenkasse, das eine Schiff kostet. */
const fund = (game: GameController, cr: number) => game.book('income', cr, 'Testgeld');

/** Der Tag vergeht um 30: fünf Kurzurlaube zu je 6 Tagen. */
/** Wartet, bis geladene Deckpläne angekommen sind. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const passMonth = (game: GameController) => {
  for (let i = 0; i < 5; i++) game.passDays(6);
};

describe('Reiter Schiff', () => {
  it('zeigt das gekaufte Schiff mit seinen Ständen und macht die alte Kasse klein', async () => {
    const { game } = await started();
    game.showScreen('ship');
    fund(game, 40_000_000);
    const before = game.snapshot().ship!.funds;
    game.buyShipDesign('S', 'cash');
    await game.whenSaved();
    const view = game.snapshot();
    expect(view.screen).toBe('ship');
    expect(view.ship?.funds).toBe(before - 29_430_000);
    expect(view.ship?.ship).toMatchObject({ designCode: 'S', designName: 'Scout/Courier', name: 'Scout/Courier', fuel: 40, fuelMax: 40, cabins: 2, thruster: 'Jump-2 · 2G', computerName: 'Modell/1bis' });
    expect(view.ship?.ship?.software.map((s) => s.name)).toEqual(['Maneuver', 'Jump-2', 'Navigation', 'Generate', 'Anti-Hijack', 'Library']);
    expect(view.ship?.yard.find((d) => d.designId === 'S')?.owned).toBe(true);
  });

  it('ohne Schiff zeigt der Reiter den Hinweis und die Werft offen', async () => {
    const { game } = await started();
    // Die Demo-Kampagne hat einen Scout (2026-11-18); eine neue Kampagne beginnt ohne Schiff.
    game.createCampaign('Ohne Schiff');
    game.showScreen('ship');
    const view = game.snapshot();
    expect(view.ship?.ship).toBeUndefined();
    expect(view.ship?.yard).toHaveLength(9);
  });

  it('bei der Bank entstehen Kreditsumme, Restschuld und Rate', async () => {
    const { game } = await started();
    fund(game, 10_000_000);
    const before = game.snapshot().ship!.funds;
    game.buyShipDesign('A', 'bank');
    await game.whenSaved();
    const ship = game.snapshot().ship!.ship!;
    expect(ship).toMatchObject({ initialLoan: 74_160_000, monthlyPayment: 154_500 });
    expect(ship.loanBalance).toBe(74_160_000);
    expect(game.snapshot().ship!.funds).toBe(before - 7_416_000);
  });

  it('ein neues Schiff mustert das alte aus', async () => {
    const { game, repository } = await started();
    fund(game, 80_000_000);
    game.buyShipDesign('S', 'cash');
    game.buyShipDesign('A', 'cash');
    await game.whenSaved();
    expect(game.snapshot().ship!.ship?.designId).toBe('A');
    const ships = repository.saved!.ships;
    // Vorne der Scout der Demo-Kampagne (2026-11-18), dann die beiden gekauften.
    expect(ships).toHaveLength(3);
    expect(ships[0]).toMatchObject({ name: 'Kestrel', retired: true });
    expect(ships[1]).toMatchObject({ design: 'S', retired: true });
  });

  it('Bearbeiten, Umbenennen und Treibstoff gehen durch den Reiter', async () => {
    const { game } = await started();
    fund(game, 45_000_000);
    const before = game.snapshot().ship!.funds;
    game.buyShipDesign('A', 'cash');
    game.editShip({ name: 'Eiserne Meridian', fuel: 18, cargo: 5 });
    game.buyFuelTons(10);
    game.renameShip('Eiserne Meridian II');
    await game.whenSaved();
    const ship = game.snapshot().ship!.ship!;
    expect(ship).toMatchObject({ name: 'Eiserne Meridian II', fuel: 28, fuelMax: 30, cargo: 5 });
    expect(game.snapshot().ship!.funds).toBe(before - 37_080_000 - 5_000);
    // Was die Regeln nicht zulassen, steht im Reiter statt im Spielstand.
    game.buyFuelTons(20);
    expect(game.snapshot().ship!.error).toMatch(/fasst noch 2/);
    expect(game.snapshot().ship!.ship!.fuel).toBe(28);
  });

  it('die Bank hebt die Rate von selbst ein, sobald die Zeit fällig ist', async () => {
    const { game } = await started();
    fund(game, 10_000_000);
    game.buyShipDesign('A', 'bank');
    passMonth(game);
    await game.whenSaved();
    const ship = game.snapshot().ship!.ship!;
    expect(ship.loanBalance).toBe(74_160_000 - 154_500);
    const paid = game.snapshot().shop!.bookings.find((b) => b.kind === 'ship' && b.amount === -154_500);
    expect(paid).toBeDefined();
  });

  it('ohne Deckung bleibt die Rate als Hinweis in der Kasse', async () => {
    const { game } = await started();
    fund(game, 7_416_000);
    game.buyShipDesign('A', 'bank');
    passMonth(game);
    await game.whenSaved();
    const booking = game.snapshot().shop!.bookings.find((b) => b.text === 'Rate nicht bezahlt');
    expect(booking).toMatchObject({ kind: 'ship', amount: 0, ship: 'Free Trader' });
    // Die Restschuld sinkt nur mit jeder bezahlten Rate (domain-model.md, *Erwerb*).
    expect(game.snapshot().ship!.ship!.loanBalance).toBe(74_160_000);
  });
});

describe('Deckpläne im Reiter Schiff', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';

  it('legen Bilder auf die freien Plätze und bleiben auf dem Gerät', async () => {
    const { game, repository } = await started();
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    await game.whenSaved();
    await game.addDeckPlan(png);
    await game.addDeckPlan(png.replace('=', 'A'));
    expect(game.snapshot().ship!.deckPlans.map((p) => p.name)).toEqual(['Deck A', 'Deck B']);
    expect(game.snapshot().ship!.freeDeckSlots).toBe(1);
    expect(repository.deckPlans).toHaveLength(2);
    expect(repository.deckPlans[0]).toMatchObject({ design: 'A', name: 'Deck A' });
    // Ins Kampagnenarchiv reisen die Pläne nicht.
    expect(JSON.stringify(repository.saved)).not.toContain('deckPlans');
  });

  it('sind drei belegt, sagt der Reiter warum', async () => {
    const { game } = await started();
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    for (let i = 0; i < 3; i++) await game.addDeckPlan(`${png}${i}`);
    expect(game.snapshot().ship!.freeDeckSlots).toBe(0);
    await game.addDeckPlan(`${png}x`);
    expect(game.snapshot().ship!.error).toMatch(/Mehr als 3/);
    expect(game.snapshot().ship!.deckPlans).toHaveLength(3);
  });

  it('ein entfernter Plan ist auch auf dem Gerät weg', async () => {
    const { game, repository } = await started();
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    await game.addDeckPlan(png);
    expect(game.snapshot().ship!.deckPlans).toHaveLength(1);
    await game.removeDeckPlan('Deck A');
    expect(game.snapshot().ship!.deckPlans).toHaveLength(0);
    expect(repository.deckPlans).toHaveLength(0);
  });

  it('ein Bild von der alten Werft bleibt, wenn die Gruppe denselben Entwurf kauft', async () => {
    const repository = memoryRepository();
    repository.deckPlans.push({ key: 'k-alt', design: 'A', name: 'Deck A', image: png });
    const { game } = await started(fixedRandom(), repository);
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    // Der Entwurf ist jetzt aktiv; der Plan des Geräts kommt beim nächsten Blick in den Reiter.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(game.snapshot().ship!.deckPlans.map((p) => p.name)).toEqual(['Deck A']);
  });

  it('bleiben beim Wechsel zwischen Kampagnen mit demselben Entwurf zu sehen', async () => {
    const { game, repository } = await started();
    const first = game.snapshot().campaign.id;
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    await game.addDeckPlan(png);
    game.createCampaign('Zweite');
    const second = game.snapshot().campaign.id;
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    await tick();
    expect(game.snapshot().ship!.deckPlans.map((p) => p.name)).toEqual(['Deck A']);
    game.openCampaign(first);
    await tick();
    expect(game.snapshot().ship!.deckPlans.map((p) => p.name)).toEqual(['Deck A']);
    game.openCampaign(second);
    await tick();
    expect(game.snapshot().ship!.deckPlans.map((p) => p.name)).toEqual(['Deck A']);
    expect(repository.deckPlans).toHaveLength(1);
  });

  it('ein neues Bild überschreibt nie einen Plan, der noch lädt', async () => {
    const repository = memoryRepository();
    repository.deckPlans.push({ key: 'k-alt', design: 'A', name: 'Deck A', image: png });
    const { game } = await started(fixedRandom(), repository);
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    // Noch bevor die Pläne des Entwurfs geladen sind, kommt ein Bild dazu.
    await game.addDeckPlan(`${png}neu`);
    await tick();
    expect(repository.deckPlans.map((p) => [p.name, p.image])).toEqual([
      ['Deck A', png],
      ['Deck B', `${png}neu`],
    ]);
    expect(game.snapshot().ship!.deckPlans.map((p) => p.name)).toEqual(['Deck A', 'Deck B']);
  });

  it('Nichtbilder weist der Reiter ab', async () => {
    const { game } = await started();
    fund(game, 45_000_000);
    game.buyShipDesign('A', 'cash');
    await game.addDeckPlan('data:text/plain,hallo');
    expect(game.snapshot().ship!.error).toMatch(/Bild/);
  });
});
