import { actualPercent, goodsOf, priceOf, quantityOf, tradeGoodOf, worldOf, type Campaign, type GoodsRoll, type PriceRoll } from '../model';

/** Ein Waren- oder Preiswurf im Log (2026-11-27): Kopf und Zeile darunter. */
export interface TradeLogItem {
  readonly kind: 'trade';
  readonly at: string;
  readonly head: string;
  readonly detail: string;
}

const dm = (x: number) => (x === 0 ? '' : x > 0 ? ` + ${x}` : ` − ${-x}`);

export function tradeLogItem(campaign: Campaign, entry: GoodsRoll | PriceRoll): TradeLogItem {
  const where = worldOf(campaign.hexes, entry.world).name;
  if (entry.kind === 'goodsRoll') {
    const good = goodsOf(entry);
    const by = campaign.characters.find((c) => c.id === entry.by)?.name ?? '';
    const revealed = campaign.log.some((e) => e.kind === 'priceRoll' && !e.sale && e.offer !== undefined && campaign.log[e.offer] === entry);
    return { kind: 'trade', at: entry.at, head: `Ware gefunden: ${good.name}`, detail: `${by} in ${where} · ${entry.dice[0]}${dm(entry.dm)} und ${entry.dice[1]}${revealed ? ` · Menge ${quantityOf(entry)}${good.tonsPerItem === undefined ? ' t' : ' Stück'}` : ''}` };
  }
  const good = tradeGoodOf(entry.good);
  const total = entry.dice[0] + entry.dice[1] + entry.tradeDm + entry.skillDm + entry.brokerDm;
  const parts = `${entry.dice[0]} + ${entry.dice[1]}${dm(entry.tradeDm)}${dm(entry.skillDm)}${dm(entry.brokerDm)} = ${total}`;
  return { kind: 'trade', at: entry.at, head: `${entry.sale ? 'Verkaufspreis' : 'Kaufpreis'} ${good.name}: ${actualPercent(total)} %`, detail: `${where} · ${parts} · Cr ${priceOf(entry).toLocaleString('de-DE')} je ${good.tonsPerItem === undefined ? 'Tonne' : 'Stück'}` };
}
