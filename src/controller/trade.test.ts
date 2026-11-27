import { describe, expect, it } from 'vitest';
import { acceptOrders, book, createDemoCampaign, marketOf, openOrders, travelShip, type Campaign, type Hex } from '../model';
import { countingKeys, fixedClock, fixedRandom, memoryDownload, memoryRepository, seededRandom } from '../model/testing';
import { GameController } from './game';

const clock = fixedClock();

/** Die Demo mit einer Nachbarwelt in Sprungweite (0406) und Cr 200.000 in der Kasse. */
function withNeighbour(): Campaign {
  const demo = createDemoCampaign(clock);
  const kessra = demo.hexes.find((h) => h.main === '0405')!;
  const { system: _s, ...hex } = kessra;
  void _s;
  const main = kessra.worlds.find((w) => w.id === '0405')!;
  const { map: _m, moonOf: _o, orbit: _r, angle: _a, ...world } = main as typeof main & { moonOf?: string };
  void [_m, _o, _r, _a];
  const neighbour: Hex = { ...hex, row: kessra.row + 1, main: '0406', worlds: [{ ...world, id: '0406', name: 'Nachbar', uwp: { ...main.uwp, population: 9, tech: 5 } }] };
  return book({ ...demo, hexes: [...demo.hexes, neighbour] }, 'income', 200_000, clock, 'Testgeld');
}

async function started(campaign: Campaign) {
  const repository = memoryRepository(campaign);
  repository.open = campaign.id;
  const game = new GameController({ repository, random: seededRandom(11), clock, download: memoryDownload(), keys: countingKeys() });
  await game.init();
  return game;
}

describe('Handel im Controller', () => {
  it('Auftragsseite: Häkchen beginnen leer, Annehmen führt zur Welt zurück, Angenommenes steht nicht mehr zur Wahl', async () => {
    const game = await started(withNeighbour());
    game.chooseHex(4, 6);
    expect(game.snapshot().orders).toEqual({ blocker: undefined });
    game.openOrders('freight');
    let view = game.snapshot().trade!;
    expect(view.page).toBe('orders');
    if (view.page !== 'orders') return;
    expect(view.lines.every((l) => !l.checked)).toBe(true);
    const small = view.lines.find((l) => l.group === 'Gelegenheitsladungen')!;
    game.toggleOrder(small.key);
    expect((game.snapshot().trade as { count: number }).count).toBe(1);
    game.acceptTrade();
    expect(game.snapshot().trade).toBeUndefined();
    expect(game.snapshot().hold?.lots).toHaveLength(1);
    game.openOrders('freight');
    view = game.snapshot().trade!;
    if (view.page !== 'orders') return;
    expect(view.lines.some((l) => l.key === small.key)).toBe(false);
  });

  it('zu viel Fracht: Annehmen gesperrt, und was nicht geht, steht als Meldung', async () => {
    const game = await started(withNeighbour());
    game.chooseHex(4, 6);
    game.openOrders('freight');
    const view = game.snapshot().trade!;
    if (view.page !== 'orders') return;
    for (const l of view.lines.filter((x) => x.group === 'Hauptladungen')) game.toggleOrder(l.key);
    const after = game.snapshot().trade as { short: string | undefined };
    expect(after.short).toMatch(/Laderaum frei/);
    game.acceptTrade();
    expect(game.snapshot().notice).toMatch(/passt nicht/);
  });

  it('Markt: Abbrechen lässt die Ware los, ohne zu kaufen', async () => {
    const game = await started(withNeighbour());
    game.openGlobeAt(4, 5);
    if (!game.snapshot().globe) game.createGlobe();
    const capital = game.snapshot().globe!.cities.find((c) => c.cell !== undefined)!;
    game.pickCell(capital.cell);
    game.openMarket();
    const market = game.snapshot().trade!;
    expect(market.page).toBe('market');
    if (market.page !== 'market') return;
    const funds = game.snapshot().ship!.funds;
    game.tapGoods(market.buy[0]!.index);
    expect((game.snapshot().trade as { action: unknown }).action).toBeTruthy();
    game.cancelTradeSelection();
    expect((game.snapshot().trade as { action: unknown }).action).toBeUndefined();
    expect(game.snapshot().ship!.funds).toBe(funds);
  });

  it('die Abrechnung kommt nach der Landung als Dialog, nicht schon bei der Ankunft', async () => {
    let campaign = openOrders(withNeighbour(), '0406', 'freight', seededRandom(8));
    const lot = marketOf(campaign, '0405')!.freight[0]!.lots.findIndex((l) => l.size === 'incidental');
    campaign = acceptOrders(campaign, '0406', { kind: 'freight', lots: [lot] });
    campaign = travelShip(campaign, '0406', fixedRandom(), clock);
    const game = await started(campaign);
    for (let i = 0; i < 10 && game.snapshot().location === undefined; i++) game.travelOn();
    expect(game.snapshot().location).toBe('0406');
    expect(game.snapshot().settlement).toBeUndefined();
    const landing = game.snapshot().landing;
    expect(landing).toBeDefined();
    game.landAtPort(landing!.ports[0]!.city);
    expect(game.snapshot().settlement).toMatchObject({ world: 'Nachbar', lines: [expect.objectContaining({ text: expect.stringMatching(/Fracht/) })] });
    game.closeSettlement();
    expect(game.snapshot().settlement).toBeUndefined();
  });
});
