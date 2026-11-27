import { describe, expect, it } from 'vitest';
import {
  acceptOrders,
  actualPercent,
  book,
  buyGoods,
  cabinsOf,
  cargoOf,
  createDemoCampaign,
  fromCampaignFile,
  fundsOf,
  goodsOf,
  goodsRollOf,
  goodsRollsOf,
  jettison,
  leftOf,
  marketOf,
  openMarket,
  openOrders,
  orderTargetsOf,
  priceOf,
  purchaseOf,
  quantityOf,
  removeLogEntry,
  rollPurchase,
  rollSale,
  saleBlocker,
  saleOf,
  sellGoods,
  setMailContract,
  setTravelZone,
  settleOnLanding,
  shipOf,
  toCampaignFile,
  tradeGoodOf,
  travelShip,
  willingOf,
  type Campaign,
  type GoodsRoll,
  type Hex,
  type PriceRoll,
} from '.';
import { arriveNow, fixedClock, fixedRandom, seededRandom } from './testing';

const clock = fixedClock();

/** Die Demo mit Kessra (0405), einer Nachbarwelt (0406, Bevölkerung 9, TL 5) und Cr 200.000 in der Kasse. */
function withNeighbour(population = 9): Campaign {
  const demo = createDemoCampaign(clock);
  const kessra = demo.hexes.find((h) => h.main === '0405')!;
  const { system: _s, ...hex } = kessra;
  void _s;
  const main = kessra.worlds.find((w) => w.id === '0405')!;
  // Nur die Werte der Hauptwelt, ohne Karte und ohne Bahn im fremden System.
  const { map: _m, moonOf: _o, orbit: _r, angle: _a, ...world } = main as typeof main & { moonOf?: string };
  void _m;
  void _o;
  void _r;
  void _a;
  const neighbour: Hex = { ...hex, row: kessra.row + 1, main: '0406', worlds: [{ ...world, id: '0406', name: 'Nachbar', uwp: { ...main.uwp, population, tech: 5 } }] };
  return book({ ...demo, hexes: [...demo.hexes, neighbour] }, 'income', 200_000, clock, 'Testgeld');
}

/** Der Markt hier mit den Warenwürfen. */
function market(campaign: Campaign) {
  return marketOf(campaign, campaign.location!.world)!;
}

describe('Handel: Tabellen (SE 22)', () => {
  it('hat 36 Waren, die Actual Value Table von 2 bis 15 und den Warenwurf mit DM auf den ersten Würfel', () => {
    expect(tradeGoodOf(11).name).toBe('Textiles');
    expect(tradeGoodOf(66).name).toBe('Vacc Suits');
    expect(tradeGoodOf(52)).toMatchObject({ name: 'Air/raft', basePrice: 600_000, tonsPerItem: 4 });
    expect(actualPercent(1)).toBe(40);
    expect(actualPercent(7)).toBe(100);
    expect(actualPercent(16)).toBe(400);
    expect(goodsRollOf([6, 5], 1)).toBe(65);
    expect(goodsRollOf([1, 3], -1)).toBe(13);
    expect(goodsRollOf([3, 2], 1)).toBe(42);
  });
});

describe('Handel: Markt', () => {
  it('würfelt beim Öffnen je SC 1 + Admin oder Streetwise Warenwürfe (E14), nur einmal je Woche', () => {
    const c = openMarket(withNeighbour(), seededRandom(3), clock);
    const rolls = c.characters.filter((p) => !p.npc && !p.dead).reduce((a, p) => a + goodsRollsOf(p), 0);
    expect(rolls).toBe(3);
    expect(market(c).goods).toHaveLength(3);
    // Kessra hat Bevölkerung 7: kein DM auf den ersten Würfel.
    expect((c.log[market(c).goods[0]!] as GoodsRoll).dm).toBe(0);
    expect(openMarket(c, seededRandom(4), clock)).toBe(c);
  });

  it('Kaufpreis: 2W6 mit den Purchase DMs der Handelscodes, minus Admin oder Bribery des Helfers (E1)', () => {
    let c = openMarket(withNeighbour(), seededRandom(3), clock);
    const goods = market(c).goods[0]!;
    const good = goodsOf(c.log[goods] as GoodsRoll);
    c = rollPurchase(c, goods, 'c2', fixedRandom(4, 3), clock);
    const roll = c.log.at(-1) as PriceRoll;
    expect(roll).toMatchObject({ kind: 'priceRoll', sale: false, dice: [4, 3], skillDm: -1, brokerDm: 0, offer: goods, helper: 'c2' });
    expect(priceOf(roll)).toBe(Math.round((good.basePrice * actualPercent(7 + roll.tradeDm - 1)) / 100));
    expect(purchaseOf(c, market(c), goods)).toBe(c.log.length - 1);
    expect(() => rollPurchase(c, goods, undefined, fixedRandom(), clock)).toThrow(/schon gewürfelt/);
  });

  it('kauft ganz oder teilweise; ein Teilkauf kostet 1 % dazu (E5), der Rest bleibt zu haben', () => {
    let c = openMarket(withNeighbour(), seededRandom(3), clock);
    const goods = market(c).goods.find((g) => goodsOf(c.log[g] as GoodsRoll).tonsPerItem === undefined && quantityOf(c.log[g] as GoodsRoll) >= 2)!;
    c = rollPurchase(c, goods, undefined, fixedRandom(1, 1), clock);
    const price = priceOf(c.log.at(-1) as PriceRoll);
    const before = fundsOf(c);
    const total = quantityOf(c.log[goods] as GoodsRoll);
    c = buyGoods(c, goods, 1, clock);
    expect(before - fundsOf(c)).toBe(price + Math.ceil(price * 0.01));
    expect(c.bookings.slice(-2).map((b) => b.shipCost)).toEqual(['goods', 'handling']);
    expect(leftOf(c, market(c), goods)).toBe(total - 1);
    expect(cargoOf(shipOf(c)!)).toBe(1);
    expect(() => buyGoods(c, goods, total, clock)).toThrow(/noch/);
  });

  it('verkauft nicht am Kaufort in derselben Woche; anderswo mit Makler, dessen Provision gleich gebucht wird (E4)', () => {
    let c = openMarket(withNeighbour(), seededRandom(3), clock);
    const goods = market(c).goods.find((g) => goodsOf(c.log[g] as GoodsRoll).tonsPerItem === undefined)!;
    c = rollPurchase(c, goods, undefined, fixedRandom(1, 1), clock);
    c = buyGoods(c, goods, 1, clock);
    const lot = shipOf(c)!.hold![0]!;
    expect(saleBlocker(c, lot)).toMatch(/Hier gekauft/);
    // Mit dem Schiff nach Nachbar, dort verkaufen.
    c = arriveNow(travelShip(c, '0406', seededRandom(5), clock));
    expect(saleBlocker(c, lot)).toBeUndefined();
    c = rollSale(c, lot.id, undefined, 2, fixedRandom(5, 5), clock);
    const roll = c.log.at(-1) as PriceRoll;
    expect(roll).toMatchObject({ sale: true, brokerDm: 2, lot: lot.id });
    expect(c.bookings.at(-1)).toMatchObject({ shipCost: 'broker', amount: -Math.ceil(priceOf(roll) * 0.1), forCargo: lot.id });
    expect(saleOf(c, market(c), lot.id)).toBe(c.log.length - 1);
    const before = fundsOf(c);
    c = sellGoods(c, lot.id, 1, clock);
    expect(fundsOf(c) - before).toBe(priceOf(roll));
    expect(c.bookings.at(-1)).toMatchObject({ shipIncome: 'goods', forCargo: lot.id });
    expect(shipOf(c)!.hold![0]!.retired).toBe(true);
  });

  it('Waren- und Preiswürfe lassen sich nicht löschen', () => {
    const c = openMarket(withNeighbour(), seededRandom(3), clock);
    expect(() => removeLogEntry(c, market(c).goods[0]!)).toThrow(/nicht löschen/);
  });
});

describe('Handel: Aufträge zu einem Ziel', () => {
  it('kennt die Ziele in Sprungweite und würfelt alle Lose eines Ziels einmal je Woche', () => {
    let c = withNeighbour();
    expect(orderTargetsOf(c)).toEqual(['0406']);
    c = openOrders(c, '0406', 'freight', seededRandom(8));
    const offer = market(c).freight[0]!;
    // DM der Zielwelt: Bevölkerung 9 (+1) und TL 10 − 5 (+5).
    expect(offer.dm).toBe(6);
    expect(offer.lots.length).toBeGreaterThan(0);
    expect(openOrders(c, '0406', 'freight', seededRandom(9))).toBe(c);
  });

  it('Red Zone: keine Fracht; Amber Zone: keine Hauptladungen', () => {
    const red = openOrders(setTravelZone(withNeighbour(), '0406', 'red'), '0406', 'freight', seededRandom(8));
    expect(market(red).freight[0]!.lots).toEqual([]);
    const amber = openOrders(setTravelZone(withNeighbour(), '0406', 'amber'), '0406', 'freight', seededRandom(8));
    expect(market(amber).freight[0]!.lots.some((l) => l.size === 'major')).toBe(false);
  });

  it('nimmt Fracht an, so viel in den Laderaum passt, und gibt sie abgewählt wieder von Bord', () => {
    let c = openOrders(withNeighbour(), '0406', 'freight', seededRandom(8));
    const lots = market(c).freight[0]!.lots;
    const big = lots.findIndex((l) => l.die * (l.size === 'major' ? 10 : l.size === 'minor' ? 5 : 1) > 11);
    expect(() => acceptOrders(c, '0406', { kind: 'freight', lots: [big] })).toThrow(/passt nicht/);
    const small = lots.findIndex((l) => l.size === 'incidental');
    c = acceptOrders(c, '0406', { kind: 'freight', lots: [small] });
    expect(shipOf(c)!.hold).toEqual([expect.objectContaining({ kind: 'freight', to: '0406', from: '0405' })]);
    c = acceptOrders(c, '0406', { kind: 'freight', lots: [] });
    expect(shipOf(c)!.hold ?? []).toEqual([]);
  });

  it('Fahrgäste bekommen Kabinen, die die Gruppe zur Not freigibt; Low nur mit Niedrigbetten', () => {
    let c = openOrders(withNeighbour(), '0406', 'passengers', seededRandom(8));
    const offer = market(c).passengers[0]!;
    const willing = willingOf(c, offer);
    const ship = shipOf(c)!;
    // Die Yacht hat 14 Kabinen; die zwei SC rücken zur Not in eine.
    expect(cabinsOf(c, ship)).toMatchObject({ staterooms: 14, groupCabins: 2, freeForFares: 13, lowBerths: 0 });
    expect(() => acceptOrders(c, '0406', { kind: 'passengers', high: 0, middle: 0, low: 1 })).toThrow(/Niedrigbetten/);
    c = acceptOrders(c, '0406', { kind: 'passengers', high: Math.min(1, willing.high), middle: 0, low: 0 });
    expect(shipOf(c)!.fares).toEqual([expect.objectContaining({ high: Math.min(1, willing.high), to: '0406' })]);
  });

  it('bezahlt bei der Landung, nicht schon bei der Ankunft; die Reise hält Fahrgäste und Post fest', () => {
    let c = openOrders(withNeighbour(), '0406', 'freight', seededRandom(8));
    const small = market(c).freight[0]!.lots.findIndex((l) => l.size === 'incidental');
    const tons = market(c).freight[0]!.lots[small]!.die;
    c = acceptOrders(c, '0406', { kind: 'freight', lots: [small] });
    c = openOrders(c, '0406', 'passengers', seededRandom(8));
    c = acceptOrders(c, '0406', { kind: 'passengers', high: 1, middle: 0, low: 0 });
    c = setMailContract(c, true);
    const before = fundsOf(c);
    c = travelShip(c, '0406', seededRandom(5), clock);
    const journey = c.log.at(-1)!;
    expect(journey).toMatchObject({ kind: 'journey', high: 1 });
    // Lebenserhaltung: zwei SC und ein Fahrgast; die Post zahlt nur bewaffnet und mit Gunner (E12).
    const mail = journey.kind === 'journey' && journey.mail === true ? 25_000 : 0;
    expect(fundsOf(c) - before).toBe(-6000 + mail);
    c = arriveNow(c);
    const arrived = fundsOf(c);
    expect(c.bookings.some((b) => b.shipIncome === 'freight' || b.shipIncome === 'passage')).toBe(false);
    c = settleOnLanding(c, shipOf(c)!.id, clock);
    const paid = fundsOf(c) - arrived;
    expect(paid).toBe(tons * 1000 + 10_000);
    expect(shipOf(c)!.hold!.every((l) => l.retired)).toBe(true);
    expect(shipOf(c)!.fares!.every((f) => f.retired)).toBe(true);
    // Ein zweites Mal gibt es nichts mehr.
    expect(settleOnLanding(c, shipOf(c)!.id, clock)).toBe(c);
  });

  it('Postvertrag: braucht 5 t frei und reserviert sie im Laderaum', () => {
    const c = setMailContract(withNeighbour(), true);
    expect(cargoOf(shipOf(c)!)).toBe(5);
    expect(setMailContract(c, false).ships.find((s) => s.id === shipOf(c)!.id)!.mailContract).toBeUndefined();
  });

  it('eine Ladung über Bord bringt kein Geld', () => {
    let c = openOrders(withNeighbour(), '0406', 'freight', seededRandom(8));
    const small = market(c).freight[0]!.lots.findIndex((l) => l.size === 'incidental');
    c = acceptOrders(c, '0406', { kind: 'freight', lots: [small] });
    const before = fundsOf(c);
    c = jettison(c, shipOf(c)!.hold![0]!.id);
    expect(fundsOf(c)).toBe(before);
    expect(cargoOf(shipOf(c)!)).toBe(0);
  });
});

describe('Handel: Kampagnendatei', () => {
  it('liest und schreibt Märkte, Ladungen, Fahrgäste, Postvertrag und Reisezonen', () => {
    let c = openMarket(withNeighbour(), seededRandom(3), clock);
    c = openOrders(c, '0406', 'freight', seededRandom(8));
    const small = market(c).freight[0]!.lots.findIndex((l) => l.size === 'incidental');
    c = acceptOrders(c, '0406', { kind: 'freight', lots: [small] });
    c = setTravelZone(setMailContract(c, true), '0406', 'amber');
    const back = fromCampaignFile(toCampaignFile(c), c.id);
    expect(back.markets).toEqual(c.markets);
    expect(shipOf(back)!.hold).toEqual(shipOf(c)!.hold);
    expect(shipOf(back)!.mailContract).toBe(true);
    expect(back.hexes.find((h) => h.main === '0406')!.travelZone).toBe('amber');
  });

  it('macht aus frei eingetragener Fracht von vorher eine Ladung ohne Ziel', () => {
    const c = withNeighbour();
    const file = JSON.parse(toCampaignFile(c)) as { campaign: { ships: { cargo?: number; hold?: unknown }[] } };
    file.campaign.ships[0]!.cargo = 7;
    delete file.campaign.ships[0]!.hold;
    const back = fromCampaignFile(JSON.stringify(file), c.id);
    expect(back.ships[0]!.hold).toEqual([{ id: 'l1', kind: 'freight', tons: 7, from: '0405', retired: false }]);
  });
});
