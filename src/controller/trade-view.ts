import {
  actualPercent,
  amountLabel,
  amountOfLot,
  boughtOf,
  cabinsOf,
  cargoOf,
  focusOf,
  freeCargoOf,
  fundsOf,
  goodsOf,
  holdTonsOf,
  livingCharacters,
  leftOf,
  lotTons,
  marketOf,
  maxPurchase,
  messageAvailable,
  messageFee,
  orderBlocker,
  percentOf,
  priceOf,
  purchaseCost,
  purchaseOf,
  quantityOf,
  saleBlocker,
  saleOf,
  shipDesignOf,
  shipOf,
  tonsOf,
  tradeBlocker,
  tradeDmOf,
  tradeGoodOf,
  willingOf,
  worldOf,
  hexById,
  isWorld,
  FARES,
  FREIGHT_RATE,
  BROKER_SHARE,
  MAIL_TONS,
  type Campaign,
  type GoodsRoll,
  type OrderKind,
  type PriceRoll,
  type TradeGood,
} from '../model';

/** Was der Controller auf Markt- und Auftragsseiten flüchtig hält: Auswahl, Menge, Makler, Häkchen. */
export type TradePage =
  | { readonly page: 'market'; readonly selected: { readonly buy: number } | { readonly sell: string } | undefined; readonly amount: number; readonly broker: number; readonly error: string | undefined }
  | { readonly page: 'orders'; readonly to: string; readonly kind: OrderKind; readonly lots: readonly number[]; readonly high: number; readonly middle: number; readonly low: number; readonly take: boolean; readonly error: string | undefined };

/** Eine Kachel des Kapazitätskopfs: was frei ist, vorher und nach der Auswahl. */
export interface CapacityTile {
  readonly label: string;
  readonly before: string;
  readonly after: string | undefined;
  readonly short: boolean;
}

export interface MarketBuyItem {
  readonly index: number;
  readonly name: string;
  readonly by: string;
  readonly basePrice: number;
  readonly quantity: string;
  readonly unit: string;
  readonly purchaseDm: number;
  readonly resale: string;
  /** Erst nach dem Antippen: die gewürfelte Menge, was noch zu haben ist, der Preis. */
  readonly revealed: { readonly quantity: number; readonly left: number; readonly percent: number; readonly price: number; readonly roll: string } | undefined;
  readonly selected: boolean;
}

export interface MarketSellItem {
  readonly id: string;
  readonly name: string;
  readonly amount: string;
  readonly paid: number | undefined;
  readonly resaleDm: number;
  readonly blocker: string | undefined;
  readonly rolled: { readonly percent: number; readonly price: number; readonly total: number; readonly roll: string } | undefined;
  readonly selected: boolean;
}

export interface MarketView {
  readonly page: 'market';
  readonly world: string;
  readonly capacity: readonly CapacityTile[];
  readonly buy: readonly MarketBuyItem[];
  readonly sell: readonly MarketSellItem[];
  /** Die gewählte Zeile mit Menge und was der Knopf tut. */
  readonly action: { readonly kind: 'buy' | 'sell'; readonly amount: number; readonly max: number; readonly unit: string; readonly label: string; readonly blocker: string | undefined; readonly total: number } | undefined;
  /** Vor dem Verkaufswurf: der gewählte Makler (0–4) und die Provision in Prozent. */
  readonly broker: number;
  readonly brokerOpen: boolean;
  readonly helper: string | undefined;
  readonly error: string | undefined;
}

export interface OrderLine {
  readonly key: string;
  readonly group: string;
  readonly label: string;
  readonly pay: number;
  readonly checked: boolean;
}

export interface OrdersView {
  readonly page: 'orders';
  readonly kind: OrderKind;
  readonly to: string;
  readonly toName: string;
  readonly capacity: readonly CapacityTile[];
  readonly lines: readonly OrderLine[];
  readonly empty: string | undefined;
  readonly blocker: string | undefined;
  readonly count: number;
  /** Was nicht passt, solange die Häkchen mehr verlangen, als frei ist. */
  readonly short: string | undefined;
  readonly mailContract: boolean;
  readonly error: string | undefined;
}

export type TradeView = MarketView | OrdersView;

const n = (x: number) => x.toLocaleString('de-DE');
const dm = (x: number) => (x === 0 ? '±0' : x > 0 ? `+${x}` : `−${-x}`);

function exprText(good: TradeGood): string {
  const q = good.quantity;
  return `${q.dice}W6${q.times ? `×${q.times}` : ''}`;
}

function resaleText(good: TradeGood): string {
  return good.resale.map((d) => `${d.code} ${dm(d.dm)}`).join(', ') || '±0';
}

function tile(label: string, before: number, after: number | undefined, unit: string): CapacityTile {
  return { label, before: `${n(before)}${unit}`, after: after === undefined || after === before ? undefined : `${n(after)}${unit}`, short: after !== undefined && after < 0 };
}

/** Die Ansicht der Markt- bzw. Auftragsseite für den Snapshot. */
export function tradeView(campaign: Campaign, page: TradePage | undefined): TradeView | undefined {
  if (page === undefined) return undefined;
  return page.page === 'market' ? marketView(campaign, page) : ordersView(campaign, page);
}

function marketView(campaign: Campaign, page: Extract<TradePage, { page: 'market' }>): MarketView | undefined {
  const world = campaign.location?.world;
  const ship = shipOf(campaign);
  if (world === undefined || ship === undefined) return undefined;
  const here = worldOf(campaign.hexes, world);
  const market = marketOf(campaign, world);
  const helper = focusOf(campaign);
  const funds = fundsOf(campaign);
  const free = freeCargoOf(campaign, ship);
  const buy: MarketBuyItem[] = (market?.goods ?? []).map((index) => {
    const entry = campaign.log[index] as GoodsRoll;
    const good = goodsOf(entry);
    const p = purchaseOf(campaign, market!, index);
    const price = p === undefined ? undefined : (campaign.log[p] as PriceRoll);
    return {
      index,
      name: good.name,
      by: campaign.characters.find((c) => c.id === entry.by)?.name ?? '',
      basePrice: good.basePrice,
      quantity: exprText(good),
      unit: good.tonsPerItem === undefined ? 't' : 'Stück',
      purchaseDm: tradeDmOf(good, here, false),
      resale: resaleText(good),
      revealed: price === undefined ? undefined : { quantity: quantityOf(entry), left: leftOf(campaign, market!, index), percent: percentOf(price), price: priceOf(price), roll: rollText(price) },
      selected: page.selected !== undefined && 'buy' in page.selected && page.selected.buy === index,
    };
  });
  const sell: MarketSellItem[] = (ship.hold ?? [])
    .filter((c) => !c.retired && c.kind === 'goods')
    .map((c) => {
      const good = tradeGoodOf(c.goods!);
      const s = market === undefined ? undefined : saleOf(campaign, market, c.id);
      const roll = s === undefined ? undefined : (campaign.log[s] as PriceRoll);
      return {
        id: c.id,
        name: good.name,
        amount: amountLabel(good, amountOfLot(good, c)),
        paid: c.paid,
        resaleDm: tradeDmOf(good, here, true),
        blocker: saleBlocker(campaign, c),
        rolled: roll === undefined ? undefined : { percent: percentOf(roll), price: priceOf(roll), total: priceOf(roll) * amountOfLot(good, c), roll: rollText(roll) },
        selected: page.selected !== undefined && 'sell' in page.selected && page.selected.sell === c.id,
      };
    });
  let action: MarketView['action'];
  let afterFunds: number | undefined;
  let afterFree: number | undefined;
  const sel = page.selected;
  if (sel !== undefined && 'buy' in sel && market !== undefined && purchaseOf(campaign, market, sel.buy) !== undefined) {
    const entry = campaign.log[sel.buy] as GoodsRoll;
    const good = goodsOf(entry);
    const price = priceOf(campaign.log[purchaseOf(campaign, market, sel.buy)!] as PriceRoll);
    const left = leftOf(campaign, market, sel.buy);
    const max = maxPurchase(campaign, sel.buy);
    const amount = Math.min(Math.max(page.amount, 0), left);
    const cost = purchaseCost(price, amount, amount < left);
    afterFunds = funds - cost.goods - cost.handling;
    afterFree = free - tonsOf(good, amount);
    action = { kind: 'buy', amount, max, unit: good.tonsPerItem === undefined ? 't' : 'Stück', label: 'Kaufen', blocker: left === 0 ? 'Alles gekauft' : amount < 1 ? 'Erst eine Menge wählen' : amount > max ? 'Zu viel für Kasse oder Laderaum' : undefined, total: cost.goods + cost.handling };
    void boughtOf;
  }
  if (sel !== undefined && 'sell' in sel && market !== undefined) {
    const lot = (ship.hold ?? []).find((c) => c.id === sel.sell && !c.retired);
    const s = lot === undefined ? undefined : saleOf(campaign, market, lot.id);
    if (lot !== undefined && s !== undefined) {
      const good = tradeGoodOf(lot.goods!);
      const have = amountOfLot(good, lot);
      const amount = Math.min(Math.max(page.amount, 0), have);
      const total = priceOf(campaign.log[s] as PriceRoll) * amount;
      afterFunds = funds + total;
      afterFree = free + tonsOf(good, amount);
      action = { kind: 'sell', amount, max: have, unit: good.tonsPerItem === undefined ? 't' : 'Stück', label: 'Verkaufen', blocker: amount < 1 ? 'Erst eine Menge wählen' : undefined, total };
    }
  }
  const brokerOpen = sel !== undefined && 'sell' in sel && (market === undefined || saleOf(campaign, market, sel.sell) === undefined);
  return {
    page: 'market',
    world: here.name,
    capacity: [tile('Kasse', funds, afterFunds, ' Cr'), tile('Laderaum frei', free, afterFree, ' t')],
    buy,
    sell,
    action,
    broker: page.broker,
    brokerOpen,
    helper: helper?.name,
    error: page.error ?? tradeBlocker(campaign),
  };
}

function rollText(roll: PriceRoll): string {
  const parts = [`${roll.dice[0]} + ${roll.dice[1]}`];
  if (roll.tradeDm) parts.push(`${dm(roll.tradeDm)} Handelscodes`);
  if (roll.skillDm) parts.push(`${dm(roll.skillDm)} Fertigkeit`);
  if (roll.brokerDm) parts.push(`${dm(roll.brokerDm)} Makler`);
  const total = roll.dice[0] + roll.dice[1] + roll.tradeDm + roll.skillDm + roll.brokerDm;
  return `${parts.join(' ')} = ${total} → ${actualPercent(total)} %`;
}

function ordersView(campaign: Campaign, page: Extract<TradePage, { page: 'orders' }>): OrdersView | undefined {
  const view = ordersBase(campaign, page);
  if (view === undefined) return undefined;
  const tight = view.capacity.find((t) => t.short);
  return { ...view, short: tight === undefined ? undefined : `${tight.label}: zu wenig für die Auswahl` };
}

function ordersBase(campaign: Campaign, page: Extract<TradePage, { page: 'orders' }>): Omit<OrdersView, 'short'> | undefined {
  const ship = shipOf(campaign);
  const world = campaign.location?.world;
  const hex = hexById(campaign.hexes, page.to);
  if (ship === undefined || world === undefined || !isWorld(hex)) return undefined;
  const toName = worldOf(campaign.hexes, hex.main!).name;
  const market = marketOf(campaign, world);
  const free = freeCargoOf(campaign, ship);
  const cabins = cabinsOf(campaign, ship);
  const base = { page: 'orders' as const, kind: page.kind, to: page.to, toName, blocker: orderBlocker(campaign, page.to), mailContract: ship.mailContract === true, error: page.error };
  if (page.kind === 'freight') {
    const offer = market?.freight.find((f) => f.to === page.to);
    const lots = offer?.lots ?? [];
    const groups = { major: 'Hauptladungen', minor: 'Nebenladungen', incidental: 'Gelegenheitsladungen' } as const;
    const chosen = new Set(page.lots);
    const now = lots.reduce((a, l, i) => a + (chosen.has(i) ? lotTons(l) : 0), 0);
    // Angenommene Lose stehen nicht mehr zur Wahl; sie sind an Bord (Laderaum).
    const open = lots.flatMap((l, i) => (l.taken ? [] : [{ l, i }]));
    return {
      ...base,
      capacity: [tile('Laderaum frei', free, free - now, ' t')],
      lines: open.map(({ l, i }) => ({ key: String(i), group: groups[l.size], label: `${lotTons(l)} t`, pay: lotTons(l) * FREIGHT_RATE, checked: chosen.has(i) })),
      empty: offer === undefined ? 'Noch nicht gewürfelt.' : open.length === 0 ? (lots.length === 0 ? `Diese Woche wartet keine Fracht nach ${toName}.` : 'Alle Fracht dorthin ist angenommen.') : undefined,
      count: page.lots.length,
    };
  }
  if (page.kind === 'passengers') {
    const offer = market?.passengers.find((p) => p.to === page.to);
    const willing = offer === undefined ? { high: 0, middle: 0, low: 0 } : willingOf(campaign, offer);
    const lines: OrderLine[] = [];
    // Wer schon mitfliegt, steht nicht mehr zur Wahl.
    for (const [cls, name] of [['high', 'High Passage'], ['middle', 'Middle Passage'], ['low', 'Low Passage']] as const) {
      const left = willing[cls] - (offer?.[cls] ?? 0);
      for (let i = 0; i < left; i++) lines.push({ key: `${cls}-${i}`, group: name, label: `Passagier ${i + 1}`, pay: FARES[cls], checked: i < page[cls] });
    }
    const freeS = cabins.freeForFares;
    const freeL = cabins.lowBerths - cabins.usedLowBerths;
    const anyone = willing.high + willing.middle + willing.low > 0;
    return {
      ...base,
      capacity: [tile('Kabinen frei', freeS, freeS - page.high - page.middle, ''), tile('Niedrigbetten frei', freeL, freeL - page.low, '')],
      lines,
      empty: offer === undefined ? 'Noch nicht gewürfelt.' : lines.length === 0 ? (anyone ? 'Alle Passagiere dorthin sind an Bord.' : `Diese Woche will niemand nach ${toName}.`) : undefined,
      count: page.high + page.middle + page.low,
    };
  }
  const offer = market?.messages.find((x) => x.to === page.to);
  const available = offer !== undefined && messageAvailable(offer);
  return {
    ...base,
    capacity: [tile('Laderaum frei', free, undefined, ' t')],
    lines: available && !offer.taken ? [{ key: 'm', group: 'Private Botschaft', label: `Botschaft nach ${toName}`, pay: messageFee(offer), checked: page.take }] : [],
    empty: offer === undefined ? 'Noch nicht gefragt.' : !available ? 'Keine Botschaft diese Woche.' : offer.taken ? 'Die Botschaft ist an Bord.' : undefined,
    count: page.take ? 1 : 0,
  };
}

/** Der Laderaum im Bereich Schiff: Ladungen, Fahrgäste und Postvertrag. */
export interface HoldView {
  readonly capacity: number;
  readonly used: number;
  readonly lots: readonly { readonly id: string; readonly label: string; readonly detail: string }[];
  readonly fares: readonly { readonly id: string; readonly label: string; readonly detail: string }[];
  readonly mailContract: boolean;
  readonly mailBlocker: string | undefined;
  /** Die Kabinen und Niedrigbetten (2026-11-27): wer drin ist und wohin er will. */
  readonly cabins: { readonly staterooms: number; readonly used: number; readonly lowBerths: number; readonly usedLow: number; readonly group: readonly string[]; readonly groupCabins: number };
}

export function holdView(campaign: Campaign): HoldView | undefined {
  const ship = shipOf(campaign);
  if (ship === undefined) return undefined;
  const plan = shipDesignOf(ship.design);
  const place = (id: string) => {
    const h = hexById(campaign.hexes, id.split('-')[0]!);
    return isWorld(h) ? worldOf(campaign.hexes, h.main!).name : id;
  };
  const lots = (ship.hold ?? [])
    .filter((c) => !c.retired)
    .map((c) => {
      if (c.kind === 'goods') {
        const good = tradeGoodOf(c.goods!);
        return { id: c.id, label: `${good.name} · ${amountLabel(good, amountOfLot(good, c))}`, detail: `aus ${place(c.from)}${c.paid ? `, gekauft für Cr ${n(c.paid)}` : ''}` };
      }
      if (c.kind === 'message') return { id: c.id, label: `Botschaft nach ${place(c.to!)}`, detail: `Honorar Cr ${n(c.fee ?? 0)} bei Ankunft` };
      return { id: c.id, label: `Fracht ${n(c.tons)} t${c.to ? ` nach ${place(c.to)}` : ' ohne Ziel'}`, detail: c.to ? `Cr ${n(c.tons * FREIGHT_RATE)} bei Ankunft, aus ${place(c.from)}` : `aus einem alten Stand, bringt kein Geld` };
    });
  const fares = (ship.fares ?? [])
    .filter((f) => !f.retired)
    .map((f) => ({ id: f.id, label: `Fahrgäste nach ${place(f.to)}`, detail: [f.high ? `${f.high} High` : '', f.middle ? `${f.middle} Middle` : '', f.low ? `${f.low} Low` : ''].filter(Boolean).join(', ') }));
  const mailBlocker = ship.mailContract ? undefined : freeCargoOf(campaign, ship) < MAIL_TONS ? `Der Postvertrag braucht ${MAIL_TONS} t freien Laderaum.` : undefined;
  const cabins = cabinsOf(campaign, ship);
  const group = livingCharacters(campaign).map((c) => c.name);
  return {
    capacity: plan.cargo - holdTonsOf(campaign, ship),
    used: cargoOf(ship),
    lots,
    fares,
    mailContract: ship.mailContract === true,
    mailBlocker,
    cabins: { staterooms: cabins.staterooms, used: cabins.usedStaterooms, lowBerths: cabins.lowBerths, usedLow: cabins.usedLowBerths, group, groupCabins: cabins.groupCabins },
  };
}

export const BROKER_PERCENT = BROKER_SHARE * 100;

/** Der Dialog Abrechnung nach der Landung (2026-11-27): was die Landung an Einnahmen brachte. */
export interface SettlementView {
  readonly world: string;
  readonly lines: readonly { readonly text: string; readonly amount: number }[];
  readonly total: number;
}

export function settlementView(campaign: Campaign, range: { readonly from: number; readonly to: number }): SettlementView | undefined {
  const here = campaign.location?.world;
  if (here === undefined) return undefined;
  const hex = here.split('-')[0]!;
  const lines = campaign.bookings.slice(range.from, range.to).flatMap((b) => (b.shipIncome !== undefined || b.shipCost === 'lottery' ? [{ text: b.text ?? '', amount: b.amount }] : []));
  const journey = campaign.log.findLast((e) => e.kind === 'journey' && e.ship !== undefined && e.to === hex);
  if (journey?.kind === 'journey') {
    if (journey.mail) lines.unshift({ text: 'Postvertrag (beim Abflug bezahlt)', amount: 25_000 });
    const lost = journey.berths.filter((b) => b.for === undefined && b.revive[0] + b.revive[1] + b.dm < 5).length;
    if (lost > 0) lines.push({ text: `${lost} Low-Fahrgast${lost === 1 ? '' : 'gäste'} nicht aufgewacht, zahlt nicht`, amount: 0 });
  }
  if (lines.length === 0) return undefined;
  return { world: worldOf(campaign.hexes, here).name, lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}
