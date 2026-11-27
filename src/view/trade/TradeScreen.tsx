import type { CapacityTile, DmChip, MarketView, OrdersView, Snapshot } from '../../controller';
import { DetailPage } from '../DetailPage';
import { credits } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, ShopIcon } from '../icons';

/**
 * Handel (2026-11-27, GUI-Handbuch *Handel: Markt und Aufträge*): die Markt-Detailseite für den
 * spekulativen Handel und die Auftragsseiten Fracht, Passagiere und Post. Oben der Kapazitätskopf,
 * darunter die Listen, unten die Aktionsleiste. Reine Darstellung: Was gilt und was es kostet, kommt
 * aus dem Snapshot.
 */
export function TradeScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const trade = view.trade;
  if (trade === undefined) return null;
  return trade.page === 'market' ? <MarketPage market={trade} onClose={() => game.closeTrade()} /> : <OrdersPage orders={trade} onClose={() => game.closeTrade()} />;
}

function Capacity({ tiles }: { tiles: readonly CapacityTile[] }) {
  return (
    <div className="card-grid cols-2 trade-capacity" aria-label="Kapazität">
      {tiles.map((t) => (
        <div key={t.label} className="tile">
          <span className="tile-label">{t.label}</span>
          <span className={`tile-text mono${t.short ? ' negative' : ''}`}>
            {t.after === undefined ? (
              t.before
            ) : (
              <>
                <span className="muted">{t.before} →</span> {t.after}
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

const dm = (x: number) => (x === 0 ? '±0' : x > 0 ? `+${x}` : `−${-x}`);

function MarketPage({ market, onClose }: { market: MarketView; onClose: () => void }) {
  const game = useGame();
  const action = market.action;
  const selling = market.sell.find((s) => s.selected);
  const cancel = (
    <button type="button" className="action note" onClick={() => game.cancelTradeSelection()}>
      <CloseIcon />
      Abbrechen
    </button>
  );
  const foot = action ? (
    <div className="actions oracle-actions trade-actions">
      {cancel}
      <button type="button" className="action note" aria-label="Weniger" disabled={action.amount <= 1} onClick={() => game.setTradeAmount(action.amount - 1)}>
        <MinusIcon />
        Weniger
      </button>
      <span className="trade-amount mono" aria-live="polite">
        {action.amount.toLocaleString('de-DE')} {action.unit}
        <small>{credits(action.total)}</small>
      </span>
      <button type="button" className="action note" aria-label="Mehr" disabled={action.amount >= action.max} onClick={() => game.setTradeAmount(action.amount + 1)}>
        <PlusIcon />
        Mehr
      </button>
      <button
        type="button"
        className="action draw"
        disabled={action.blocker !== undefined}
        title={action.blocker}
        onClick={() => {
          haptic('pick');
          game.confirmTrade();
        }}
      >
        <ShopIcon />
        {action.label}
      </button>
    </div>
  ) : market.brokerOpen && selling ? (
    <div className="actions oracle-actions trade-actions">
      {cancel}
      {/* Der Makler als eine Wahl mit − und + (eine Wahl, ein Bedienelement; höchstens fünf Knöpfe). */}
      <button type="button" className="action note" aria-label="Makler weniger" disabled={market.broker <= 0} onClick={() => game.setBroker(market.broker - 1)}>
        <MinusIcon />
        Weniger
      </button>
      <span className="trade-amount mono" aria-live="polite">
        {market.broker === 0 ? 'Ohne Makler' : `Makler +${market.broker}`}
        <small>{market.broker === 0 ? 'keine Provision' : `${market.broker * 5} % Provision`}</small>
      </span>
      <button type="button" className="action note" aria-label="Makler mehr" disabled={market.broker >= 4} onClick={() => game.setBroker(market.broker + 1)}>
        <PlusIcon />
        Mehr
      </button>
      <button type="button" className="action gold" onClick={() => game.rollSalePrice()}>
        <CheckIcon />
        Würfeln
      </button>
    </div>
  ) : undefined;
  return (
    <DetailPage title={`Markt · ${market.world}`} onClose={onClose} foot={foot}>
      <Capacity tiles={market.capacity} />
      {market.error && (
        <p className="error" role="alert">
          {market.error}
        </p>
      )}
      {market.codes.length > 0 && (
        <p className="trade-codes">
          <span className="muted">Hier gelten</span>
          {market.codes.map((c) => (
            <span key={c.code} className="dm-chip active" title={c.name}>
              {c.code}
            </span>
          ))}
        </p>
      )}
      <p className="muted trade-note">
        Antippen würfelt Menge und Preis{market.helper ? `; ${market.helper} hilft mit Admin oder Bribery` : ''}. Wer hilft, wählt man in der Charakterleiste.
      </p>
      <h2 className="section-title">Zu kaufen</h2>
      {market.buy.length === 0 && <p className="log-empty">Keine Ware diese Woche.</p>}
      <ul className="trade-list">
        {market.buy.map((item) => {
          const per = item.unit === 't' ? 'Tonne' : 'Stück';
          return (
            <li key={item.index}>
              <button type="button" className={`goods-card${item.selected ? ' selected' : ''}${item.revealed ? ' revealed' : ''}`} aria-pressed={item.selected} onClick={() => game.tapGoods(item.index)}>
                <span className="goods-head">
                  <span className="goods-name">{item.name}</span>
                  <span className="goods-base mono">
                    {credits(item.basePrice)}
                    <small>je {per}</small>
                  </span>
                </span>
                <span className="goods-sub muted">
                  gefunden von {item.by} · Menge {item.quantity.replace('W6', ' W6')} {item.unit}
                </span>
                <DmRow label="Kauf hier" chips={item.purchaseDms} total={item.purchaseDm} />
                <DmRow label="Verkauf" chips={item.resaleDms} />
                {item.revealed ? (
                  <span className="goods-price">
                    <span className="goods-percent mono">{item.revealed.percent} %</span>
                    <span className="goods-amount">
                      <span>
                        <b className="mono">{credits(item.revealed.price)}</b> je {per}
                      </span>
                      <small className="muted">
                        {item.revealed.left.toLocaleString('de-DE')} von {item.revealed.quantity.toLocaleString('de-DE')} {item.unit} zu haben
                      </small>
                    </span>
                    <small className="goods-roll mono muted">{item.revealed.roll}</small>
                  </span>
                ) : (
                  <span className="goods-hint muted">Antippen: Menge und Preis würfeln</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <h2 className="section-title">Zu verkaufen</h2>
      {market.sell.length === 0 && <p className="log-empty">Keine eigene Ware an Bord.</p>}
      <ul className="trade-list">
        {market.sell.map((item) => (
          <li key={item.id}>
            <button type="button" className={`goods-card${item.selected ? ' selected' : ''}${item.rolled ? ' revealed' : ''}`} aria-pressed={item.selected} disabled={item.blocker !== undefined} title={item.blocker} onClick={() => game.tapLot(item.id)}>
              <span className="goods-head">
                <span className="goods-name">{item.name}</span>
                <span className="goods-base mono">{item.amount}</span>
              </span>
              {item.paid !== undefined && <span className="goods-sub muted">gekauft für {credits(item.paid)}</span>}
              <DmRow label="Verkauf hier" chips={item.resaleDms} total={item.resaleDm} sale />
              {item.blocker && <span className="goods-hint muted">{item.blocker}</span>}
              {item.rolled && (
                <span className="goods-price">
                  <span className="goods-percent mono">{item.rolled.percent} %</span>
                  <span className="goods-amount">
                    <span>
                      <b className="mono">{credits(item.rolled.total)}</b> für alles
                    </span>
                    <small className="muted">
                      {credits(item.rolled.price)} je Einheit
                      {item.paid !== undefined ? ` · ${item.rolled.total - item.paid >= 0 ? 'Gewinn' : 'Verlust'} ${credits(Math.abs(item.rolled.total - item.paid))}` : ''}
                    </small>
                  </span>
                  <small className="goods-roll mono muted">{item.rolled.roll}</small>
                </span>
              )}
              {item.selected && !item.rolled && <span className="goods-hint">Makler unten wählen, dann würfeln.</span>}
            </button>
          </li>
        ))}
      </ul>
    </DetailPage>
  );
}

/** Die DMs einer Ware je Handelscode als Chips; die hier gültigen sind markiert, dahinter die Summe. */
function DmRow({ label, chips, total, sale = false }: { label: string; chips: readonly DmChip[]; total?: number; /** Beim Verkauf ist ein Plus gut, beim Kauf ein Minus. */ sale?: boolean }) {
  const good = total !== undefined && (sale ? total > 0 : total < 0);
  const bad = total !== undefined && (sale ? total < 0 : total > 0);
  return (
    <span className="dm-row">
      <span className="dm-label muted">{label}</span>
      {chips.length === 0 && <span className="dm-chip">keine</span>}
      {chips.map((c) => (
        <span key={c.code} className={`dm-chip${c.active ? ' active' : ''}`} title={`${c.name}${c.active ? ' – gilt hier' : ''}`}>
          {c.code} {dm(c.dm)}
        </span>
      ))}
      {total !== undefined && <span className={`dm-total mono${good ? ' good' : bad ? ' bad' : ''}`}>= {dm(total)}</span>}
    </span>
  );
}

const kindTitle = { freight: 'Fracht', passengers: 'Passagiere', message: 'Post' } as const;

function OrdersPage({ orders, onClose }: { orders: OrdersView; onClose: () => void }) {
  const game = useGame();
  const groups = [...new Set(orders.lines.map((l) => l.group))];
  const foot = (
    <div className="actions oracle-actions trade-actions">
      <button
        type="button"
        className="action draw"
        disabled={orders.blocker !== undefined || orders.short !== undefined}
        title={orders.blocker ?? orders.short}
        onClick={() => {
          haptic('pick');
          game.acceptTrade();
        }}
      >
        <CheckIcon />
        Annehmen {orders.count}
      </button>
    </div>
  );
  return (
    <DetailPage title={`${kindTitle[orders.kind]} nach ${orders.toName}`} onClose={onClose} foot={foot}>
      <Capacity tiles={orders.capacity} />
      {(orders.error ?? orders.blocker) && (
        <p className="error" role="alert">
          {orders.error ?? orders.blocker}
        </p>
      )}
      {orders.empty && <p className="log-empty">{orders.empty}</p>}
      {groups.map((g) => (
        <section key={g}>
          <h2 className="section-title">{g}</h2>
          <ul className="trade-list">
            {orders.lines
              .filter((l) => l.group === g)
              .map((l) => (
                <li key={l.key}>
                  <label className="trade-row trade-check">
                    <input type="checkbox" checked={l.checked} onChange={() => game.toggleOrder(l.key)} />
                    <span className="trade-row-main">
                      <b>{l.label}</b>
                    </span>
                    <span className="mono">{credits(l.pay)}</span>
                  </label>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <p className="muted trade-note">Bezahlt wird bei Ankunft am Ziel.{orders.kind === 'message' ? ` Den Postvertrag (${orders.mailContract ? 'läuft' : 'keiner'}) schließt man im Bereich Schiff unter Laderaum.` : ''}</p>
    </DetailPage>
  );
}
