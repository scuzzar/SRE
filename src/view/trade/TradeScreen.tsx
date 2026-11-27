import type { CapacityTile, MarketView, OrdersView, Snapshot } from '../../controller';
import { DetailPage } from '../DetailPage';
import { credits } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CheckIcon, MinusIcon, PlusIcon, ShopIcon } from '../icons';

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
  const foot = action ? (
    <div className="actions oracle-actions trade-actions">
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
      {[0, 1, 2, 3, 4].map((b) => (
        <button key={b} type="button" className={`action ${market.broker === b ? 'draw' : 'note'}`} aria-pressed={market.broker === b} onClick={() => game.setBroker(b)}>
          {b === 0 ? 'Ohne' : `+${b}`}
          <small>{b === 0 ? 'Makler' : `${b * 5} %`}</small>
        </button>
      ))}
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
      <p className="muted trade-note">
        Antippen würfelt Menge und Preis{market.helper ? `; ${market.helper} hilft mit Admin oder Bribery` : ''}. Wer hilft, wählt man in der Charakterleiste.
      </p>
      <h2 className="section-title">Zu kaufen</h2>
      {market.buy.length === 0 && <p className="log-empty">Keine Ware diese Woche.</p>}
      <ul className="trade-list">
        {market.buy.map((item) => (
          <li key={item.index}>
            <button type="button" className={`trade-row trade-pick${item.selected ? ' selected' : ''}`} aria-pressed={item.selected} onClick={() => game.tapGoods(item.index)}>
              <span className="trade-row-main">
                <b>{item.name}</b>
                <span className="muted">
                  {item.by} · Grundpreis {credits(item.basePrice)} je {item.unit === 't' ? 'Tonne' : 'Stück'} · Menge {item.quantity}
                </span>
                <span className="muted">
                  Kauf hier {dm(item.purchaseDm)} · Verkauf {item.resale}
                </span>
                {item.revealed && (
                  <span className="trade-revealed">
                    <span>
                      {item.revealed.left.toLocaleString('de-DE')} von {item.revealed.quantity.toLocaleString('de-DE')} {item.unit} · {item.revealed.percent} % = <b>{credits(item.revealed.price)}</b> je {item.unit === 't' ? 'Tonne' : 'Stück'}
                    </span>
                    <small className="mono muted">{item.revealed.roll}</small>
                  </span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <h2 className="section-title">Zu verkaufen</h2>
      {market.sell.length === 0 && <p className="log-empty">Keine eigene Ware an Bord.</p>}
      <ul className="trade-list">
        {market.sell.map((item) => (
          <li key={item.id}>
            <button type="button" className={`trade-row trade-pick${item.selected ? ' selected' : ''}`} aria-pressed={item.selected} disabled={item.blocker !== undefined} title={item.blocker} onClick={() => game.tapLot(item.id)}>
              <span className="trade-row-main">
                <b>
                  {item.name} · {item.amount}
                </b>
                <span className="muted">
                  {item.paid !== undefined ? `gekauft für ${credits(item.paid)} · ` : ''}Verkauf hier {dm(item.resaleDm)}
                </span>
                {item.blocker && <span className="muted">{item.blocker}</span>}
                {item.rolled && (
                  <span className="trade-revealed">
                    <span>
                      {item.rolled.percent} % = <b>{credits(item.rolled.price)}</b> je Einheit, alles {credits(item.rolled.total)}
                    </span>
                    <small className="mono muted">{item.rolled.roll}</small>
                  </span>
                )}
                {item.selected && !item.rolled && <span className="trade-revealed">Makler unten wählen, dann würfeln.</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </DetailPage>
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
        disabled={orders.blocker !== undefined}
        title={orders.blocker}
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
