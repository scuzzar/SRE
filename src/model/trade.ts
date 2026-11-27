import { livingCharacters, type Campaign, type Character, type CharacterId } from './campaign';
import { activeSkills } from './campaign';
import { DomainError } from './errors';
import type { GoodsRoll, Journey, LowBerth, PriceRoll } from './log';
import type { Clock, Random } from './ports';
import { referenceData as ref, type TradeGood } from '../data';
import { sum, type Dice } from './rules';
import { diceExprValue, hexById, hexIdOfWorld, isWorld, tradeCodesOf, worldOf, type DiceExpr, type Hex, type NamedWorld } from './sector';
import { bookShip, bookShipIncome, fundsOf } from './shop';
import { cargoOf, freeCargoOf, shipOf, type Ship } from './ship';
import { holderOf, postsAt, postSkill } from './crew';
import { shipDesignOf } from './reference';
import { dayOf, weekStart } from './time';
import { parsecs, hasStarport, survived, lotteryPaid, potOf } from './travel';
import { shipDepartureBlocker } from './landing';
import { jumpAfter } from './space-combat';

// Handel (Domänenmodell 2026-11-27, 2026-11-27b, 2026-11-27c; Regeln in docs/modell/handel.md).

/** Die Arten einer Ladung: eigene Ware, fremde Fracht, private Botschaft. */
export const cargoKinds = ['goods', 'freight', 'message'] as const;
export type CargoKind = (typeof cargoKinds)[number];

/**
 * Eine Ladung im Laderaum (`Cargo`). `goods`: die Ware (Wurf 11–66); `count` bei Stückwaren;
 * `paid` der bezahlte Preis der eigenen Ware; `fee` das Honorar einer Botschaft; `from` die Welt,
 * an der sie an Bord kam; `to` das Zielsystem (Fracht, Botschaft). Ausgeblendet statt gelöscht,
 * sobald eine Buchung auf sie verweist.
 */
export interface Cargo {
  readonly id: string;
  readonly kind: CargoKind;
  readonly tons: number;
  readonly count?: number;
  readonly paid?: number;
  readonly fee?: number;
  readonly goods?: number;
  readonly from: string;
  readonly to?: string;
  readonly retired: boolean;
}

/** Zahlende Fahrgäste an Bord (`Fare`, 2026-11-27c): je Klasse, von `from` (Welt) nach `to` (System). */
export interface Fare {
  readonly id: string;
  readonly high: number;
  readonly middle: number;
  readonly low: number;
  readonly from: string;
  readonly to: string;
  readonly retired: boolean;
}

/** Die Größen der Frachtladungen (SE 9). */
export const freightSizes = ['major', 'minor', 'incidental'] as const;
export type FreightSize = (typeof freightSizes)[number];
const FREIGHT_TONS: Record<FreightSize, number> = { major: 10, minor: 5, incidental: 1 };

/** Ein Los der Fracht: Größe, Größenwürfel, angenommen. */
export interface FreightLot {
  readonly size: FreightSize;
  readonly die: number;
  readonly taken: boolean;
}

/** Das Frachtangebot zu einem Ziel (`FreightOffer`): die Würfel der Zahlen je Größe (fehlt: gibt es nicht), DM der Zielwelt, Lose. */
export interface FreightOffer {
  readonly to: string;
  readonly dice: readonly (readonly number[] | null)[];
  readonly dm: number;
  readonly lots: readonly FreightLot[];
}

/** Das Passagierangebot zu einem Ziel (`PassengerOffer`): Würfel je Klasse, DM, und wie viele mitfliegen. */
export interface PassengerOffer {
  readonly to: string;
  readonly highDice: readonly number[];
  readonly middleDice: readonly number[];
  readonly lowDice: readonly number[];
  readonly dm: number;
  readonly high: number;
  readonly middle: number;
  readonly low: number;
}

/** Die private Botschaft zu einem Ziel (`MessageOffer`): 9+ auf 2W6, Honorar 1W6 × Cr20 (E11). */
export interface MessageOffer {
  readonly to: string;
  readonly dice: Dice;
  readonly die: number;
  readonly taken: boolean;
}

/**
 * Der Markt einer Welt in einer Woche (`Market`). Die Würfe stehen im Log; der Markt verweist auf sie
 * mit ihren Stellen (`goods`, `purchases`, `sales`). `bought`: die Ladungen, die an diesem Markt
 * gekauft wurden (für die Sperre „Verkauf am Kaufort“; im Code statt aus den Buchungen gefolgert).
 */
export interface Market {
  readonly world: string;
  readonly week: number;
  readonly goods: readonly number[];
  readonly purchases: readonly number[];
  readonly sales: readonly number[];
  readonly bought: readonly { readonly lot: string; readonly goods: number }[];
  readonly freight: readonly FreightOffer[];
  readonly passengers: readonly PassengerOffer[];
  readonly messages: readonly MessageOffer[];
}

export const FREIGHT_RATE = 1000;
export const FARES = { high: 10_000, middle: 8_000, low: 1_000 } as const;
export const MAIL_PAY = 25_000;
export const MESSAGE_TARGET = 9;
export const MESSAGE_FEE = 20;
export const HANDLING = 0.01;
export const BROKER_SHARE = 0.05;
export const LOW_LIFE_SUPPORT = 100;
const FARE_LIFE_SUPPORT = 2000;

const d6 = (random: Random) => random.int(1, 6);
const roll2 = (random: Random): Dice => [d6(random), d6(random)];
const rollN = (n: number, random: Random) => Array.from({ length: n }, () => d6(random));

// ——— Referenzdaten ———

export function tradeGoodOf(roll: number): TradeGood {
  const good = ref.trade.goods.find((g) => g.roll === roll);
  if (good === undefined) throw new DomainError(`Die Ware ${roll} gibt es nicht.`);
  return good;
}

/** `/percent`: Prozent des Grundpreises aus dem modifizierten Wurf, begrenzt auf 2 bis 15. */
export function actualPercent(total: number): number {
  const roll = Math.min(15, Math.max(2, total));
  return ref.trade.actualValue.find((r) => r.roll === roll)!.percent;
}

/** Die Summe der DMs einer Ware für die Handelscodes einer Welt (alle zutreffenden zusammen). */
export function tradeDmOf(good: TradeGood, world: NamedWorld, sale: boolean): number {
  const codes = new Set(tradeCodesOf(world).map((c) => c.id));
  return (sale ? good.resale : good.purchase).filter((d) => codes.has(d.code)).reduce((a, d) => a + d.dm, 0);
}

/** Admin oder Bribery (die höhere Stufe), für den Preis (E1). */
export function priceSkillOf(character: Character): number {
  const level = (id: string) => activeSkills(character).find((s) => s.of === id)?.level ?? 0;
  return Math.max(level('admin'), level('bribery'));
}

/** Wie viele Warenwürfe ein Charakter je Markt hat: 1 + Admin oder Streetwise (E14). */
export function goodsRollsOf(character: Character): number {
  const level = (id: string) => activeSkills(character).find((s) => s.of === id)?.level ?? 0;
  return 1 + Math.max(level('admin'), level('streetwise'));
}

// ——— Markt ———

/** Der Markt der Welt in dieser Woche, wenn es ihn schon gibt. */
export function marketOf(campaign: Campaign, world: string): Market | undefined {
  const week = weekStart(dayOf(campaign));
  return (campaign.markets ?? []).find((m) => m.world === world && m.week === week);
}

/** Die Welt, an der gehandelt wird: der Aufenthaltsort, wenn die Gruppe mit ihrem Schiff dort ist. */
export function tradeBlocker(campaign: Campaign): string | undefined {
  const ship = shipOf(campaign);
  if (ship === undefined) return 'Die Gruppe hat kein Schiff.';
  if (campaign.voyage !== undefined) return 'Unterwegs wird nicht gehandelt.';
  const world = campaign.location?.world;
  if (world === undefined) return 'Die Gruppe ist auf keiner Welt.';
  if (!hasStarport(worldOf(campaign.hexes, world))) return 'Gehandelt wird nur an einem Raumhafen A bis E.';
  const away = shipDepartureBlocker(campaign);
  if (away) return away.replace('Abfliegen', 'Handeln');
  return undefined;
}

function tradeWorld(campaign: Campaign): NamedWorld {
  const blocker = tradeBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  return worldOf(campaign.hexes, campaign.location!.world);
}

/** Der Markt hier, neu angelegt, wenn es ihn in dieser Woche noch nicht gibt; vergangene Wochen fallen weg. */
function withMarket(campaign: Campaign, world: string, change: (market: Market) => Market): Campaign {
  const week = weekStart(dayOf(campaign));
  const current = (campaign.markets ?? []).filter((m) => m.week === week);
  const market = current.find((m) => m.world === world) ?? { world, week, goods: [], purchases: [], sales: [], bought: [], freight: [], passengers: [], messages: [] };
  return { ...campaign, markets: [...current.filter((m) => m.world !== world), change(market)] };
}

function withActiveShip(campaign: Campaign, change: (ship: Ship) => Ship): Campaign {
  const ship = shipOf(campaign)!;
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id ? change(s) : s)) };
}

function nextId(campaign: Campaign, prefix: string, of: (s: Ship) => readonly { readonly id: string }[]): string {
  const used = new Set(campaign.ships.flatMap((s) => of(s).map((x) => x.id)));
  let n = 1;
  while (used.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

/**
 * Öffnet den Markt hier (Owner, 27. November 2026): Beim ersten Öffnen in der Woche würfelt die App
 * alle Warenwürfe der Gruppe: je lebendem SC 1 + Admin oder Streetwise (E14), zwei W6 nacheinander
 * mit DM auf den ersten nach der Bevölkerung (+1 bei 9+, −1 bei 5−), die Würfel der Menge gleich mit.
 */
export function openMarket(campaign: Campaign, random: Random, clock: Clock): Campaign {
  const world = tradeWorld(campaign);
  const market = marketOf(campaign, world.id);
  if (market !== undefined && market.goods.length > 0) return campaign;
  const population = world.uwp.population ?? 0;
  const dm = population >= 9 ? 1 : population <= 5 ? -1 : 0;
  const entries: GoodsRoll[] = [];
  for (const c of livingCharacters(campaign)) {
    for (let i = 0; i < goodsRollsOf(c); i++) {
      const dice = roll2(random);
      const good = tradeGoodOf(goodsRollOf(dice, dm));
      entries.push({ kind: 'goodsRoll', at: clock.now(), day: dayOf(campaign), world: world.id, by: c.id, dice, dm, quantityDice: rollN(good.quantity.dice + (good.quantity.less ?? 0), random) });
    }
  }
  if (entries.length === 0) throw new DomainError('Es gibt keinen lebenden Charakter, der Ware suchen könnte.');
  const start = campaign.log.length;
  const logged: Campaign = { ...campaign, log: [...campaign.log, ...entries] };
  return withMarket(logged, world.id, (m) => ({ ...m, goods: entries.map((_, i) => start + i) }));
}

/** Der Wurf der Ware: erster Würfel mit DM, auf 1–6 begrenzt, als Zehner; der zweite als Einer. */
export function goodsRollOf(dice: Dice, dm: number): number {
  return Math.min(6, Math.max(1, dice[0] + dm)) * 10 + dice[1];
}

export function goodsOf(entry: GoodsRoll): TradeGood {
  return tradeGoodOf(goodsRollOf(entry.dice, entry.dm));
}

/** `/quantity`: die Menge der Partie, in Tonnen bzw. Stück, nicht unter 1. */
export function quantityOf(entry: GoodsRoll): number {
  return Math.max(1, diceExprValue(goodsOf(entry).quantity, entry.quantityDice));
}

/** `/price`: Prozent × Grundpreis je Tonne bzw. Stück. */
export function priceOf(entry: PriceRoll): number {
  return Math.round((tradeGoodOf(entry.good).basePrice * percentOf(entry)) / 100);
}

export function percentOf(entry: PriceRoll): number {
  return actualPercent(sum(entry.dice) + entry.tradeDm + entry.skillDm + entry.brokerDm);
}

function goodsEntry(campaign: Campaign, index: number): GoodsRoll {
  const entry = campaign.log[index];
  if (entry?.kind !== 'goodsRoll') throw new DomainError('Dieser Warenwurf ist nicht da.');
  return entry;
}

function priceEntry(campaign: Campaign, index: number): PriceRoll {
  const entry = campaign.log[index];
  if (entry?.kind !== 'priceRoll') throw new DomainError('Dieser Preiswurf ist nicht da.');
  return entry;
}

/** Der Kaufpreis eines Warenwurfs an diesem Markt, wenn er schon gewürfelt ist (Stelle im Log). */
export function purchaseOf(campaign: Campaign, market: Market, goods: number): number | undefined {
  return market.purchases.find((p) => priceEntry(campaign, p).offer === goods);
}

/** Wie viel von einem Warenwurf schon gekauft ist: die Summe der Ladungen dieser Ware, die an diesem Markt gekauft wurden. */
export function boughtOf(campaign: Campaign, market: Market, goods: number): number {
  const good = goodsOf(goodsEntry(campaign, goods));
  const ids = new Set(market.bought.filter((b) => b.goods === goods).map((b) => b.lot));
  const lots = campaign.ships.flatMap((s) => s.hold ?? []).filter((c) => ids.has(c.id));
  return lots.reduce((a, c) => a + amountOfLot(good, c), 0);
}

/**
 * Antippen einer Ware: Die Menge ist schon gewürfelt (sie wird jetzt gezeigt), jetzt der Kaufpreis:
 * 2W6 mit den Purchase DMs der Handelscodes der Welt, minus Admin oder Bribery des Helfers (E1).
 * Einmal je Warenwurf.
 */
export function rollPurchase(campaign: Campaign, goods: number, helper: CharacterId | undefined, random: Random, clock: Clock): Campaign {
  const world = tradeWorld(campaign);
  const market = marketOf(campaign, world.id);
  if (market === undefined || !market.goods.includes(goods)) throw new DomainError('Diese Ware ist auf diesem Markt nicht zu haben.');
  if (purchaseOf(campaign, market, goods) !== undefined) throw new DomainError('Der Preis dieser Ware ist schon gewürfelt.');
  const good = goodsOf(goodsEntry(campaign, goods));
  const person = helper === undefined ? undefined : livingCharacters(campaign).find((c) => c.id === helper);
  if (helper !== undefined && person === undefined) throw new DomainError('Wer hilft, muss ein lebender Charakter der Gruppe sein.');
  const entry: PriceRoll = { kind: 'priceRoll', at: clock.now(), day: dayOf(campaign), world: world.id, sale: false, dice: roll2(random), tradeDm: tradeDmOf(good, world, false), skillDm: person ? -priceSkillOf(person) : 0, brokerDm: 0, offer: goods, good: good.roll, ...(person ? { helper: person.id } : {}) };
  const index = campaign.log.length;
  return withMarket({ ...campaign, log: [...campaign.log, entry] }, world.id, (m) => ({ ...m, purchases: [...m.purchases, index] }));
}

/** Tonnen einer Menge: bei Stückwaren Stück × Tonnen je Stück. */
export function tonsOf(good: TradeGood, amount: number): number {
  return good.tonsPerItem === undefined ? amount : amount * good.tonsPerItem;
}

/** Was ein Kauf kostet: Preis × Menge, bei einem Teilkauf 1 % dazu (E5). */
export function purchaseCost(price: number, amount: number, partial: boolean): { readonly goods: number; readonly handling: number } {
  const goods = price * amount;
  return { goods, handling: partial ? Math.ceil(goods * HANDLING) : 0 };
}

/** Wie viel von einem Warenwurf noch zu haben ist. */
export function leftOf(campaign: Campaign, market: Market, goods: number): number {
  return quantityOf(goodsEntry(campaign, goods)) - boughtOf(campaign, market, goods);
}

/** Die größte Menge, die Kasse und Laderaum für diesen Warenwurf hergeben. */
export function maxPurchase(campaign: Campaign, goods: number): number {
  const world = campaign.location?.world;
  const market = world === undefined ? undefined : marketOf(campaign, world);
  const ship = shipOf(campaign);
  if (market === undefined || ship === undefined) return 0;
  const p = purchaseOf(campaign, market, goods);
  if (p === undefined) return 0;
  const good = goodsOf(goodsEntry(campaign, goods));
  const price = priceOf(priceEntry(campaign, p));
  const left = leftOf(campaign, market, goods);
  const space = freeCargoOf(campaign, ship);
  const byHold = good.tonsPerItem === undefined ? space : good.tonsPerItem === 0 ? left : Math.floor(space / good.tonsPerItem);
  let n = Math.max(0, Math.min(left, byHold));
  while (n > 0) {
    const cost = purchaseCost(price, n, n < left);
    if (cost.goods + cost.handling <= fundsOf(campaign)) break;
    n--;
  }
  return n;
}

/** Kauft `amount` Tonnen bzw. Stück eines Warenwurfs (E3, E5): ganz oder teilweise, mit Laderaum und Kasse. */
export function buyGoods(campaign: Campaign, goods: number, amount: number, clock: Clock): Campaign {
  const world = tradeWorld(campaign);
  const market = marketOf(campaign, world.id);
  if (market === undefined || !market.goods.includes(goods)) throw new DomainError('Diese Ware ist auf diesem Markt nicht zu haben.');
  const p = purchaseOf(campaign, market, goods);
  if (p === undefined) throw new DomainError('Erst den Preis würfeln.');
  if (!Number.isInteger(amount) || amount < 1) throw new DomainError('Gekauft wird eine ganze Menge ab 1.');
  const left = leftOf(campaign, market, goods);
  if (amount > left) throw new DomainError(`Von dieser Partie sind noch ${left} zu haben.`);
  const good = goodsOf(goodsEntry(campaign, goods));
  const tons = tonsOf(good, amount);
  const ship = shipOf(campaign)!;
  if (tons > freeCargoOf(campaign, ship)) throw new DomainError(`Im Laderaum sind noch ${freeCargoOf(campaign, ship)} t frei.`);
  const price = priceOf(priceEntry(campaign, p));
  const cost = purchaseCost(price, amount, amount < left);
  if (cost.goods + cost.handling > fundsOf(campaign)) throw new DomainError(`Das kostet Cr ${(cost.goods + cost.handling).toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`);
  const id = nextId(campaign, 'l', (s) => s.hold ?? []);
  const lot: Cargo = { id, kind: 'goods', tons, ...(good.tonsPerItem === undefined ? {} : { count: amount }), paid: cost.goods, goods: good.roll, from: world.id, retired: false };
  let after = withActiveShip(campaign, (s) => ({ ...s, hold: [...(s.hold ?? []), lot] }));
  after = bookShip(after, -cost.goods, ship.id, 'goods', clock, `${good.name}, ${amountLabel(good, amount)}`);
  if (cost.handling > 0) after = bookShip(after, -cost.handling, ship.id, 'handling', clock, `Teilkauf ${good.name}`);
  after = { ...after, bookings: after.bookings.map((b, i) => (i >= campaign.bookings.length ? { ...b, forCargo: id } : b)) };
  return withMarket(after, world.id, (m) => ({ ...m, bought: [...m.bought, { lot: id, goods }] }));
}

export function amountLabel(good: TradeGood, amount: number): string {
  return good.tonsPerItem === undefined ? `${amount.toLocaleString('de-DE')} t` : `${amount} Stück`;
}

/** Die Ladung mit der Id an Bord des aktiven Schiffs (nicht ausgeblendet). */
export function lotOf(campaign: Campaign, id: string): Cargo {
  const lot = (shipOf(campaign)?.hold ?? []).find((c) => c.id === id && !c.retired);
  if (lot === undefined) throw new DomainError('Diese Ladung ist nicht an Bord.');
  return lot;
}

/** Der Verkaufspreis einer Ladung an diesem Markt, wenn er schon gewürfelt ist (Stelle im Log). */
export function saleOf(campaign: Campaign, market: Market, lot: string): number | undefined {
  return market.sales.find((p) => priceEntry(campaign, p).lot === lot);
}

/** Warum diese Ladung hier nicht verkauft werden kann. */
export function saleBlocker(campaign: Campaign, lot: Cargo): string | undefined {
  if (lot.kind !== 'goods') return 'Nur eigene Ware wird verkauft.';
  const market = campaign.location?.world === undefined ? undefined : marketOf(campaign, campaign.location.world);
  // Nicht in derselben Woche dort, wo sie gekauft wurde (Owner, 27. November 2026).
  if (market?.bought.some((b) => b.lot === lot.id)) return 'Hier gekauft – verkaufen erst in einer anderen Woche oder anderswo.';
  return undefined;
}

/**
 * Verkaufspreis würfeln: 2W6 mit den Resale DMs der Handelscodes der Welt, plus Admin oder Bribery
 * des Helfers und plus Makler (E2). Die Provision des Maklers (5 % je +1 vom gewürfelten Erlös) wird
 * gleich gebucht, ob verkauft wird oder nicht (E4). Einmal je Ladung und Markt.
 */
export function rollSale(campaign: Campaign, id: string, helper: CharacterId | undefined, broker: number, random: Random, clock: Clock): Campaign {
  const world = tradeWorld(campaign);
  const lot = lotOf(campaign, id);
  const blocker = saleBlocker(campaign, lot);
  if (blocker) throw new DomainError(blocker);
  if (!Number.isInteger(broker) || broker < 0 || broker > 4) throw new DomainError('Ein Makler gibt +1 bis +4.');
  const market = marketOf(campaign, world.id);
  if (market !== undefined && saleOf(campaign, market, id) !== undefined) throw new DomainError('Der Verkaufspreis dieser Ladung ist hier schon gewürfelt.');
  const good = tradeGoodOf(lot.goods!);
  const person = helper === undefined ? undefined : livingCharacters(campaign).find((c) => c.id === helper);
  if (helper !== undefined && person === undefined) throw new DomainError('Wer hilft, muss ein lebender Charakter der Gruppe sein.');
  const entry: PriceRoll = { kind: 'priceRoll', at: clock.now(), day: dayOf(campaign), world: world.id, sale: true, dice: roll2(random), tradeDm: tradeDmOf(good, world, true), skillDm: person ? priceSkillOf(person) : 0, brokerDm: broker, lot: id, good: good.roll, ...(person ? { helper: person.id } : {}) };
  const index = campaign.log.length;
  let after: Campaign = { ...campaign, log: [...campaign.log, entry] };
  if (broker > 0) {
    const fee = Math.ceil(priceOf(entry) * amountOfLot(good, lot) * broker * BROKER_SHARE);
    if (fee > 0) after = bookShip(after, -Math.min(fee, fundsOf(after)) || 0, shipOf(campaign)!.id, 'broker', clock, fee > fundsOf(after) ? 'Makler nicht bezahlt' : `Makler +${broker}, ${good.name}`);
    after = { ...after, bookings: after.bookings.map((b, i) => (i >= campaign.bookings.length ? { ...b, forCargo: id } : b)) };
  }
  return withMarket(after, world.id, (m) => ({ ...m, sales: [...m.sales, index] }));
}

/** Die Menge einer Ladung: Stück bei Stückwaren, sonst Tonnen. */
export function amountOfLot(good: TradeGood, lot: Cargo): number {
  return good.tonsPerItem === undefined ? lot.tons : (lot.count ?? 0);
}

/** Verkauft `amount` Tonnen bzw. Stück einer Ladung zum gewürfelten Preis. Bleibt nichts, wird sie ausgeblendet. */
export function sellGoods(campaign: Campaign, id: string, amount: number, clock: Clock): Campaign {
  const world = tradeWorld(campaign);
  const lot = lotOf(campaign, id);
  const market = marketOf(campaign, world.id);
  const p = market === undefined ? undefined : saleOf(campaign, market, id);
  if (p === undefined) throw new DomainError('Erst den Verkaufspreis würfeln.');
  const good = tradeGoodOf(lot.goods!);
  const have = amountOfLot(good, lot);
  if (!Number.isInteger(amount) || amount < 1 || amount > have) throw new DomainError(`Verkauft wird eine ganze Menge von 1 bis ${have}.`);
  const price = priceOf(priceEntry(campaign, p));
  const rest = have - amount;
  const ship = shipOf(campaign)!;
  const after = withActiveShip(campaign, (s) => ({
    ...s,
    hold: (s.hold ?? []).map((c) => (c.id !== id ? c : rest === 0 ? { ...c, retired: true } : { ...c, tons: tonsOf(good, rest), ...(c.count === undefined ? {} : { count: rest }), ...(c.paid === undefined ? {} : { paid: Math.round((c.paid * rest) / have) }) })),
  }));
  return bookShipIncome(after, price * amount, ship.id, 'goods', clock, `${good.name}, ${amountLabel(good, amount)}`, { forCargo: id });
}

/** Gibt eine Ladung über Bord (ohne Geld). Fracht mit Ziel ist dann verloren. */
export function jettison(campaign: Campaign, id: string): Campaign {
  lotOf(campaign, id);
  if (shipOf(campaign) === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  return withActiveShip(campaign, (s) => ({ ...s, hold: (s.hold ?? []).map((c) => (c.id === id ? { ...c, retired: true } : c)) }));
}

// ——— Aufträge zu einem Ziel ———

export type OrderKind = 'freight' | 'passengers' | 'message';

/** Die Ziele in Sprungweite: jedes andere System mit fertiger Welt. */
export function orderTargetsOf(campaign: Campaign): readonly string[] {
  const ship = shipOf(campaign);
  const here = campaign.location?.world;
  if (ship === undefined || here === undefined) return [];
  const from = hexById(campaign.hexes, hexIdOfWorld(here))!;
  const jump = jumpAfter(ship.design, ship.damage);
  return campaign.hexes.filter((h) => isWorld(h) && h !== from && parsecs(from, h) <= jump).map((h) => hexKey(h));
}

function hexKey(h: Hex): string {
  return `${String(h.column).padStart(2, '0')}${String(h.row).padStart(2, '0')}`;
}

/** Warum es zu diesem Ziel keine Aufträge gibt. */
export function orderBlocker(campaign: Campaign, to: string): string | undefined {
  const blocker = tradeBlocker(campaign);
  if (blocker) return blocker;
  const ship = shipOf(campaign)!;
  if (shipDesignOf(ship.design).jump === 0) return `${ship.name} springt nicht.`;
  if (hexIdOfWorld(campaign.location!.world) === to) return 'Aufträge gibt es zu anderen Systemen.';
  if (!orderTargetsOf(campaign).includes(to)) return `Zu weit: ${ship.name} springt höchstens ${jumpAfter(ship.design, ship.damage)} Parsec.`;
  return undefined;
}

function targetWorld(campaign: Campaign, to: string): NamedWorld {
  const hex = hexById(campaign.hexes, to);
  if (!isWorld(hex)) throw new DomainError('Dort gibt es keine Welt.');
  return worldOf(campaign.hexes, hex.main!);
}

/** Der DM der Zielwelt nach Bevölkerung (4−: `low`, 8+: `high`) und TL Ursprung − TL Ziel (SE 9). */
function destinationDm(origin: NamedWorld, target: NamedWorld, low: number, high: number): number {
  const pop = target.uwp.population ?? 0;
  return (pop <= 4 ? low : pop >= 8 ? high : 0) + ((origin.uwp.tech ?? 0) - (target.uwp.tech ?? 0));
}

function rollExprDice(expr: DiceExpr | undefined, random: Random): number[] | null {
  return expr === undefined ? null : rollN(expr.dice + (expr.less ?? 0), random);
}

/** Wie viele aus Würfeln und DM: nicht unter 0; fehlt die Art, keine. */
function countOf(expr: DiceExpr | undefined, dice: readonly number[] | null, dm: number): number {
  return expr === undefined || dice === null ? 0 : Math.max(0, diceExprValue(expr, dice) + dm);
}

/**
 * Öffnet die Aufträge einer Art zu einem Ziel: Beim ersten Blick in der Woche würfelt die App alle
 * Lose dieses Ziels (Owner, 27. November 2026).
 */
export function openOrders(campaign: Campaign, to: string, kind: OrderKind, random: Random): Campaign {
  const blocker = orderBlocker(campaign, to);
  if (blocker) throw new DomainError(blocker);
  const origin = worldOf(campaign.hexes, campaign.location!.world);
  const target = targetWorld(campaign, to);
  const zone = hexById(campaign.hexes, to)!.travelZone;
  const market = marketOf(campaign, origin.id);
  const pop = Math.min(10, origin.uwp.population ?? 0);
  if (kind === 'freight') {
    if (market?.freight.some((f) => f.to === to)) return campaign;
    const row = ref.trade.cargo[pop]!;
    const dm = destinationDm(origin, target, -4, 1);
    const exprs = [zone === 'red' || zone === 'amber' ? undefined : row.major, zone === 'red' ? undefined : row.minor, zone === 'red' ? undefined : row.incidental];
    const dice = exprs.map((e) => rollExprDice(e, random));
    const lots: FreightLot[] = [];
    freightSizes.forEach((size, i) => {
      for (let n = 0; n < countOf(exprs[i], dice[i]!, dm); n++) lots.push({ size, die: d6(random), taken: false });
    });
    return withMarket(campaign, origin.id, (m) => ({ ...m, freight: [...m.freight, { to, dice, dm, lots }] }));
  }
  if (kind === 'passengers') {
    if (market?.passengers.some((p) => p.to === to)) return campaign;
    const row = ref.trade.passengers[pop]!;
    const dm = destinationDm(origin, target, -3, 3) + (zone === 'red' ? -12 : zone === 'amber' ? -6 : 0);
    const offer: PassengerOffer = {
      to,
      highDice: rollExprDice(row.high, random) ?? [],
      middleDice: zone === 'red' ? [] : (rollExprDice(row.middle, random) ?? []),
      lowDice: zone === 'red' ? [] : (rollExprDice(row.low, random) ?? []),
      dm,
      high: 0,
      middle: 0,
      low: 0,
    };
    return withMarket(campaign, origin.id, (m) => ({ ...m, passengers: [...m.passengers, offer] }));
  }
  if (market?.messages.some((x) => x.to === to)) return campaign;
  return withMarket(campaign, origin.id, (m) => ({ ...m, messages: [...m.messages, { to, dice: roll2(random), die: d6(random), taken: false }] }));
}

/** `/tons` eines Frachtloses. */
export function lotTons(lot: FreightLot): number {
  return lot.die * FREIGHT_TONS[lot.size];
}

/** `/high`, `/middle`, `/low`: die Reisewilligen je Klasse (E9: der DM auf jede Klasse). */
export function willingOf(campaign: Campaign, offer: PassengerOffer): { readonly high: number; readonly middle: number; readonly low: number } {
  const origin = worldOf(campaign.hexes, campaign.location?.world ?? offer.to);
  const row = ref.trade.passengers[Math.min(10, origin.uwp.population ?? 0)]!;
  return {
    high: countOf(row.high, offer.highDice.length ? offer.highDice : null, offer.dm),
    middle: countOf(row.middle, offer.middleDice.length ? offer.middleDice : null, offer.dm),
    low: countOf(row.low, offer.lowDice.length ? offer.lowDice : null, offer.dm),
  };
}

/** `/available`: Wartet eine Botschaft (9+)? */
export function messageAvailable(offer: MessageOffer): boolean {
  return sum(offer.dice) >= MESSAGE_TARGET;
}

/** `/fee`: das Honorar der Botschaft. */
export function messageFee(offer: MessageOffer): number {
  return offer.die * MESSAGE_FEE;
}

/**
 * Was an Bord des Schiffs Platz braucht: Kabinen für Gruppe und Fahrgäste, Niedrigbetten. Jeder der
 * Gruppe hat eine eigene Kabine, solange es reicht; zur Not teilt sie zu zweit (2026-11-17b), Fahrgäste
 * nie. `freeForFares`: wie viele Fahrgäste in Kabinen noch dazukönnen, wenn die Gruppe zusammenrückt.
 */
export function cabinsOf(campaign: Campaign, ship: Ship): { readonly staterooms: number; readonly usedStaterooms: number; readonly groupCabins: number; readonly freeForFares: number; readonly lowBerths: number; readonly usedLowBerths: number } {
  const plan = shipDesignOf(ship.design);
  const fares = (ship.fares ?? []).filter((f) => !f.retired);
  const fareCabins = fares.reduce((a, f) => a + f.high + f.middle, 0);
  const group = livingCharacters(campaign).length;
  const groupCabins = Math.min(group, Math.max(Math.ceil(group / 2), plan.staterooms - fareCabins));
  return {
    staterooms: plan.staterooms,
    usedStaterooms: fareCabins + groupCabins,
    groupCabins,
    freeForFares: Math.max(0, plan.staterooms - fareCabins - Math.ceil(group / 2)),
    lowBerths: plan.lowBerths,
    usedLowBerths: fares.reduce((a, f) => a + f.low, 0),
  };
}

/** Die Wahl auf einer Auftragsseite: welche Frachtlose, wie viele je Klasse, ob die Botschaft. */
export type OrderChoice = { readonly kind: 'freight'; readonly lots: readonly number[] } | { readonly kind: 'passengers'; readonly high: number; readonly middle: number; readonly low: number } | { readonly kind: 'message'; readonly take: boolean };

/**
 * Übernimmt die Wahl einer Auftragsseite: Neu Angekreuztes kommt an Bord, Abgewähltes geht wieder
 * von Bord (solange das Schiff noch hier ist, also immer, weil der Markt nur hier gilt).
 */
export function acceptOrders(campaign: Campaign, to: string, choice: OrderChoice): Campaign {
  const blocker = orderBlocker(campaign, to);
  if (blocker) throw new DomainError(blocker);
  const origin = campaign.location!.world;
  const market = marketOf(campaign, origin);
  const ship = shipOf(campaign)!;
  if (choice.kind === 'freight') {
    const offer = market?.freight.find((f) => f.to === to);
    if (offer === undefined) throw new DomainError('Erst die Fracht ansehen.');
    if (choice.lots.some((i) => !Number.isInteger(i) || i < 0 || i >= offer.lots.length)) throw new DomainError('Dieses Los gibt es nicht.');
    const want = new Set(choice.lots);
    let hold = [...(ship.hold ?? [])];
    const lots = offer.lots.map((lot, i) => {
      if (want.has(i) === lot.taken) return lot;
      if (want.has(i)) {
        const id = nextId({ ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id ? { ...s, hold } : s)) }, 'l', (s) => s.hold ?? []);
        hold = [...hold, { id, kind: 'freight', tons: lotTons(lot), from: origin, to, retired: false }];
      } else {
        // Abgewählt: eine gleich große Fracht von hier dorthin geht wieder von Bord (gleiche Lose sind gleichwertig).
        const at = hold.findIndex((c) => !c.retired && c.kind === 'freight' && c.from === origin && c.to === to && c.tons === lotTons(lot));
        if (at >= 0) hold = hold.filter((_, k) => k !== at);
      }
      return { ...lot, taken: want.has(i) };
    });
    if (holdTons({ ...ship, hold }) + boatsInHold(campaign, ship) > shipDesignOf(ship.design).cargo) throw new DomainError('So viel Fracht passt nicht in den Laderaum.');
    const after = withActiveShip(campaign, (s) => ({ ...s, hold }));
    return withMarket(after, origin, (m) => ({ ...m, freight: m.freight.map((f) => (f.to === to ? { ...f, lots } : f)) }));
  }
  if (choice.kind === 'passengers') {
    const offer = market?.passengers.find((p) => p.to === to);
    if (offer === undefined) throw new DomainError('Erst die Passagiere ansehen.');
    const willing = willingOf(campaign, offer);
    for (const k of ['high', 'middle', 'low'] as const) {
      if (!Number.isInteger(choice[k]) || choice[k] < 0 || choice[k] > willing[k]) throw new DomainError(`Es wollen nur ${willing[k]} in dieser Klasse mit.`);
    }
    const others = (ship.fares ?? []).filter((f) => !f.retired && !(f.from === origin && f.to === to));
    const cabins = cabinsOf(campaign, { ...ship, fares: others });
    if (choice.high + choice.middle > cabins.freeForFares) throw new DomainError(`Es sind nur ${cabins.freeForFares} Kabinen frei.`);
    if (cabins.usedLowBerths + choice.low > cabins.lowBerths) throw new DomainError(`Es sind nur ${cabins.lowBerths - cabins.usedLowBerths} Niedrigbetten frei.`);
    const existing = (ship.fares ?? []).find((f) => !f.retired && f.from === origin && f.to === to);
    const none = choice.high + choice.middle + choice.low === 0;
    const id = existing?.id ?? nextId(campaign, 'f', (s) => s.fares ?? []);
    const fares = [...(ship.fares ?? []).filter((f) => f.id !== id), ...(none ? [] : [{ id, high: choice.high, middle: choice.middle, low: choice.low, from: origin, to, retired: false }])];
    const after = withActiveShip(campaign, (s) => ({ ...s, fares }));
    return withMarket(after, origin, (m) => ({ ...m, passengers: m.passengers.map((p) => (p.to === to ? { ...p, high: choice.high, middle: choice.middle, low: choice.low } : p)) }));
  }
  const offer = market?.messages.find((x) => x.to === to);
  if (offer === undefined) throw new DomainError('Erst nach einer Botschaft fragen.');
  if (choice.take && !messageAvailable(offer)) throw new DomainError('Diese Woche wartet keine Botschaft dorthin.');
  if (choice.take === offer.taken) return campaign;
  let hold = [...(ship.hold ?? [])];
  if (choice.take) {
    const id = nextId(campaign, 'l', (s) => s.hold ?? []);
    hold = [...hold, { id, kind: 'message', tons: 0, fee: messageFee(offer), from: origin, to, retired: false }];
  } else hold = hold.filter((c) => !(!c.retired && c.kind === 'message' && c.from === origin && c.to === to));
  const after = withActiveShip(campaign, (s) => ({ ...s, hold }));
  return withMarket(after, origin, (m) => ({ ...m, messages: m.messages.map((x) => (x.to === to ? { ...x, taken: choice.take } : x)) }));
}

/** Die Tonnen der Ladungen samt Postvertrag (wie `cargoOf`). */
function holdTons(ship: Ship): number {
  return cargoOf(ship);
}

/** Die Rümpfe der Beiboote im Laderaum. */
function boatsInHold(campaign: Campaign, ship: Ship): number {
  return shipDesignOf(ship.design).cargo - freeCargoOf(campaign, ship) - cargoOf(ship);
}

// ——— Abflug und Ankunft ———

/** Ob das Schiff für den Postvertrag bewaffnet ist und ein Gunner auf Posten steht (E12). */
export function mailPaid(campaign: Campaign, ship: Ship): boolean {
  const armed = ship.turrets.some((t) => t.weapons.length > 0);
  const gunner = postsAt(ship).some((p) => p.post.post === 'gunner' && holderOf(campaign, ship, p.at) !== undefined);
  return armed && gunner;
}

/** Die Fahrgäste an Bord, je Klasse zusammen. */
export function faresAboard(ship: Ship): { readonly high: number; readonly middle: number; readonly low: number } {
  const fares = (ship.fares ?? []).filter((f) => !f.retired);
  return { high: fares.reduce((a, f) => a + f.high, 0), middle: fares.reduce((a, f) => a + f.middle, 0), low: fares.reduce((a, f) => a + f.low, 0) };
}

/** Die Lebenserhaltung der Fahrgäste je Sprung: Cr2.000 je High und Middle, Cr100 je Low. */
export function fareLifeSupport(ship: Ship): number {
  const f = faresAboard(ship);
  return (f.high + f.middle) * FARE_LIFE_SUPPORT + f.low * LOW_LIFE_SUPPORT;
}

/** DM +1 auf das Aufwachen, wenn ein Medic mit Medic-2 oder besser auf Posten steht (SR 28). */
function medicDm(campaign: Campaign, ship: Ship): number {
  return postsAt(ship).some((p) => p.post.post === 'medic' && postSkill(campaign, ship, p.at) >= 2) ? 1 : 0;
}

/**
 * Was beim Abflug mit eigenem Schiff zum Handel gehört (an `travelShip`): Fahrgäste je Klasse an der
 * Reise, die Kojen der Low-Fahrgäste, deren Ziel diese Reise erreicht (mit Aufwachwurf und Tipp),
 * das Los bei Gleichstand, und ob der Postvertrag bezahlt ist.
 */
export function journeyTrade(campaign: Campaign, ship: Ship, to: string, random: Random, closest: (berths: readonly LowBerth[]) => readonly number[]): Pick<Journey, 'high' | 'middle' | 'low' | 'mail' | 'berths' | 'lot'> {
  const aboard = faresAboard(ship);
  const arriving = (ship.fares ?? []).filter((f) => !f.retired && f.to === to).reduce((a, f) => a + f.low, 0);
  const dm = medicDm(campaign, ship);
  const berths: LowBerth[] = [];
  for (let i = 0; i < arriving; i++) berths.push({ revive: roll2(random), dm, guess: random.int(0, arriving) });
  const ties = berths.length === 0 ? [] : closest(berths);
  return {
    ...(aboard.high ? { high: aboard.high } : {}),
    ...(aboard.middle ? { middle: aboard.middle } : {}),
    ...(aboard.low ? { low: aboard.low } : {}),
    ...(ship.mailContract && mailPaid(campaign, ship) ? { mail: true } : {}),
    berths,
    ...(ties.length > 1 ? { lot: ties[random.int(0, ties.length - 1)]! } : {}),
  };
}

/**
 * Die Ankunft am Ziel `to` (System): Fracht und Botschaften dorthin werden bezahlt und ausgeblendet,
 * die Fahrgäste dorthin zahlen und steigen aus (Low nur, wer aufwacht), und gewinnt ein NSC die
 * Lotterie, zahlt der Kapitän den Topf aus.
 */
export function deliverAt(campaign: Campaign, shipId: string, journey: Journey, entryIndex: number, clock: Clock): Campaign {
  const to = journey.to;
  let after = campaign;
  const ship = after.ships.find((s) => s.id === shipId);
  if (ship === undefined) return after;
  for (const c of (ship.hold ?? []).filter((x) => !x.retired && x.to === to)) {
    if (c.kind === 'freight') after = bookShipIncome(after, c.tons * FREIGHT_RATE, shipId, 'freight', clock, `Fracht ${c.tons} t geliefert`, { forCargo: c.id });
    if (c.kind === 'message' && (c.fee ?? 0) > 0) after = bookShipIncome(after, c.fee!, shipId, 'message', clock, 'Private Botschaft überbracht', { forCargo: c.id });
  }
  const alive = journey.berths.filter((b) => b.for === undefined && survived(b)).length;
  let lowLeft = alive;
  for (const f of (ship.fares ?? []).filter((x) => !x.retired && x.to === to)) {
    const low = Math.min(f.low, lowLeft);
    lowLeft -= low;
    for (const [cls, n] of [['high', f.high], ['middle', f.middle], ['low', low]] as const) {
      if (n > 0) after = bookShipIncome(after, n * FARES[cls], shipId, 'passage', clock, `${n} × ${cls === 'high' ? 'High' : cls === 'middle' ? 'Middle' : 'Low'} Passage`, { forFare: f.id });
    }
  }
  after = { ...after, ships: after.ships.map((s) => (s.id !== shipId ? s : { ...s, hold: (s.hold ?? []).map((c) => (!c.retired && c.to === to ? { ...c, retired: true } : c)), fares: (s.fares ?? []).map((f) => (!f.retired && f.to === to ? { ...f, retired: true } : f)) })) };
  // Gewinnt ein NSC die Lotterie und wacht auf, zahlt der Kapitän den Topf aus; sonst behält er ihn (E10).
  if (journey.berths.length > 0 && lotteryPaid(journey)) after = bookShip(after, -Math.min(potOf(journey), fundsOf(after)), shipId, 'lottery', clock, potOf(journey) > fundsOf(after) ? 'Topf der Low Lottery nicht bezahlt' : 'Topf der Low Lottery an einen Fahrgast');
  void entryIndex;
  return after;
}


// ——— Laden und Prüfen ———

/** Die erste fertige Welt des Subsektors (für alte Fracht eines Schiffs ohne Ort). */
export function firstWorldOf(hexes: readonly Hex[]): string | undefined {
  return hexes.find((h) => isWorld(h))?.main;
}

/**
 * Fracht von vor den Ladungen (Owner, 27. November 2026): eine frei eingetragene Zahl über 0 wird
 * eine Ladung `freight` ohne Ziel und ohne Geld, von der Welt, an der das Schiff steht. Ohne Welt
 * entfällt sie.
 */
export function legacyHold(tons: number | undefined, from: string | undefined): Cargo[] {
  return tons === undefined || tons <= 0 || from === undefined ? [] : [{ id: 'l1', kind: 'freight', tons, from, retired: false }];
}

/** Prüft Ladungen, Fahrgäste, Märkte und ihre Verweise. */
export function checkTrade(campaign: Campaign): void {
  const lots = new Set<string>();
  const fares = new Set<string>();
  for (const ship of campaign.ships) {
    for (const c of ship.hold ?? []) {
      if (lots.has(c.id)) throw new DomainError(`Die Ladung ${c.id} kommt doppelt vor.`);
      lots.add(c.id);
      if (!campaign.hexes.some((h) => h.worlds.some((w) => w.id === c.from))) throw new DomainError(`Eine Ladung kommt von ${c.from}, das es nicht gibt.`);
      if (c.to !== undefined && !hexById(campaign.hexes, c.to)) throw new DomainError(`Eine Ladung will nach ${c.to}, das es nicht gibt.`);
      if ((c.kind === 'goods') !== (c.goods !== undefined)) throw new DomainError('Nur eigene Ware hat eine Ware.');
      if (c.goods !== undefined) tradeGoodOf(c.goods);
      if (c.kind === 'message' && c.to === undefined) throw new DomainError('Eine Botschaft hat ein Ziel.');
    }
    for (const f of ship.fares ?? []) {
      if (fares.has(f.id)) throw new DomainError(`Die Fahrgäste ${f.id} kommen doppelt vor.`);
      fares.add(f.id);
      if (!hexById(campaign.hexes, f.to)) throw new DomainError(`Fahrgäste wollen nach ${f.to}, das es nicht gibt.`);
    }
  }
  for (const b of campaign.bookings) {
    if (b.forCargo !== undefined && !lots.has(b.forCargo)) throw new DomainError(`Eine Buchung verweist auf die Ladung ${b.forCargo}, die es nicht gibt.`);
    if (b.forFare !== undefined && !fares.has(b.forFare)) throw new DomainError(`Eine Buchung verweist auf die Fahrgäste ${b.forFare}, die es nicht gibt.`);
  }
  const kindAt = (i: number) => campaign.log[i]?.kind;
  for (const entry of campaign.log) {
    if (entry.kind === 'goodsRoll') {
      goodsOf(entry);
      if (!campaign.characters.some((c) => c.id === entry.by)) throw new DomainError('Ein Warenwurf verweist auf einen Charakter, den es nicht gibt.');
    }
    if (entry.kind === 'priceRoll') {
      tradeGoodOf(entry.good);
      if (entry.sale ? entry.lot === undefined || !lots.has(entry.lot) : entry.offer === undefined || kindAt(entry.offer) !== 'goodsRoll') throw new DomainError('Ein Preiswurf verweist auf keine Ware.');
    }
  }
  for (const m of campaign.markets ?? []) {
    if (m.goods.some((i) => kindAt(i) !== 'goodsRoll') || [...m.purchases, ...m.sales].some((i) => kindAt(i) !== 'priceRoll')) throw new DomainError('Ein Markt verweist auf einen Eintrag, der kein Waren- oder Preiswurf ist.');
    if (m.bought.some((b) => !lots.has(b.lot))) throw new DomainError('Ein Markt verweist auf eine Ladung, die es nicht gibt.');
  }
}

// ——— Postvertrag und Reisezone ———

/** Schließt oder kündigt den Postvertrag (E12): an einer Welt mit Raumhafen A bis E, mit 5 t frei. */
export function setMailContract(campaign: Campaign, on: boolean): Campaign {
  const ship = shipOf(campaign);
  if (ship === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  if ((ship.mailContract === true) === on) return campaign;
  const world = campaign.location?.world;
  if (world === undefined || !hasStarport(worldOf(campaign.hexes, world))) throw new DomainError('Den Postvertrag schließt und kündigt man an einem Raumhafen A bis E.');
  if (on && freeCargoOf(campaign, ship) < 5) throw new DomainError('Der Postvertrag braucht 5 t freien Laderaum.');
  return withActiveShip(campaign, (s) => {
    if (on) return { ...s, mailContract: true };
    const { mailContract: _m, ...rest } = s;
    void _m;
    return rest;
  });
}

/** Setzt die Reisezone eines Systems von Hand (2026-11-27); `undefined` heißt grün. */
export function setTravelZone(campaign: Campaign, hex: string, zone: 'amber' | 'red' | undefined): Campaign {
  const target = hexById(campaign.hexes, hex);
  if (!isWorld(target)) throw new DomainError('Eine Reisezone gibt es nur für ein System mit Welt.');
  return {
    ...campaign,
    hexes: campaign.hexes.map((h) => {
      if (h !== target) return h;
      if (zone !== undefined) return { ...h, travelZone: zone };
      const { travelZone: _z, ...rest } = h;
      void _z;
      return rest;
    }),
  };
}
export type { TradeGood } from '../data';
