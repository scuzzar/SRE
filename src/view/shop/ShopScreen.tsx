import { useState } from 'react';
import type { ShopItem, ShopView, Snapshot } from '../../controller';
import { bookingText, clockTime, credits, kindNames } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';

type FreeKind = 'income' | 'expense' | 'deposit' | 'payout';
const freeKinds: readonly FreeKind[] = ['income', 'expense', 'deposit', 'payout'];

/**
 * Der Reiter Shop: oben die Gruppenkasse und der Aufenthaltsort, darunter Buchen (Einnahme, Ausgabe,
 * Einzahlung, Auszahlung), das Angebot der Welt und das Kassenbuch. Gerechnet und geprüft wird im
 * Model; was man gerade eintippt und welcher Kauf offen ist, hält nur die View.
 */
export function ShopScreen({ view }: { view: Snapshot }) {
  const shop = view.shop;
  const [buying, setBuying] = useState<ShopItem | undefined>(undefined);
  const [selling, setSelling] = useState<Selling | undefined>(undefined);
  if (!shop) return null;
  return (
    <div className="screen">
      <section className="scroll shop-scroll" aria-label="Shop">
        <div className="shop-head">
          <div className="shop-funds">
            <span className="section-title">Gruppenkasse</span>
            <strong className="mono">{credits(shop.funds)}</strong>
          </div>
          {shop.world ? (
            <p className="shop-world">
              <b>{shop.world.name}</b> <span className="mono muted">{shop.world.id}</span> <span className="mono">{shop.world.uwp}</span>
              <span className="muted">
                {' '}
                · TL {shop.world.tech} · Gesetz {shop.world.law}
              </span>
            </p>
          ) : (
            <p className="shop-world muted">Die Gruppe ist auf keiner Welt. Auf der Sektorkarte eine fertige Welt öffnen und „Gruppe ist hier“ wählen.</p>
          )}
        </div>
        {shop.error && (
          <p className="error" role="alert">
            {shop.error}
          </p>
        )}
        <BookingForm shop={shop} />
        {shop.world && <Offer shop={shop} onBuy={setBuying} />}
        {shop.world && <Sale shop={shop} onSell={setSelling} />}
        <Ledger shop={shop} />
      </section>
      {buying && <BuyDialog key={buying.id} item={buying} shop={shop} onClose={() => setBuying(undefined)} />}
      {selling && <SellDialog key={`${selling.member}-${selling.item.id}`} selling={selling} shop={shop} onClose={() => setSelling(undefined)} />}
    </div>
  );
}

function BookingForm({ shop }: { shop: ShopView }) {
  const game = useGame();
  const [kind, setKind] = useState<FreeKind>('income');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [member, setMember] = useState(shop.members[0]?.id ?? '');
  const withMember = kind === 'deposit' || kind === 'payout';
  const value = Number(amount);
  return (
    <form
      className="shop-book"
      onSubmit={(e) => {
        e.preventDefault();
        haptic('pick');
        game.book(kind, value, text, withMember ? member : undefined);
        setAmount('');
        setText('');
      }}
    >
      <div className="segmented" role="radiogroup" aria-label="Art der Buchung">
        {freeKinds.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
            {bookingText[k]}
          </button>
        ))}
      </div>
      <div className="shop-book-row">
        <label className="field shop-amount">
          <span>Cr</span>
          <input type="number" inputMode="numeric" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        {withMember ? (
          <label className="field">
            <span>{kind === 'deposit' ? 'Von' : 'An'}</span>
            <select value={member} onChange={(e) => setMember(e.target.value)}>
              {shop.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({credits(m.credits)})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Wofür</span>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={kind === 'income' ? 'z. B. Belohnung von Dr. Halvek' : 'z. B. Liegegebühr'} autoComplete="off" />
          </label>
        )}
      </div>
      <button type="submit" className="primary" disabled={!(value > 0) || (withMember && !member)}>
        {bookingText[kind]} buchen
      </button>
    </form>
  );
}

function Offer({ shop, onBuy }: { shop: ShopView; onBuy: (item: ShopItem) => void }) {
  return (
    <div className="shop-offer">
      <h2 className="section-title">Angebot auf {shop.world?.name}</h2>
      {shop.offer.map((group) => (
        <details key={group.kind} className="shop-group" open={group.kind === 'weapon' || group.kind === 'ammunition'}>
          <summary>
            {kindNames[group.kind]} <span className="muted">({group.items.length})</span>
          </summary>
          <ul>
            {group.items.map((item) => (
              <li key={item.id} className="shop-item">
                <span className="shop-item-name">
                  {item.label}
                  {item.banned !== undefined && <span className="shop-banned"> · verboten ab Gesetz {item.banned}</span>}
                </span>
                <span className="mono muted shop-item-tl">TL {item.tl ?? '–'}</span>
                <span className="mono shop-item-price">{credits(item.price)}</span>
                <button type="button" className="ghost compact" disabled={!item.affordable} aria-label={`${item.label} kaufen`} onClick={() => onBuy(item)}>
                  Kaufen
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

function BuyDialog({ item, shop, onClose }: { item: ShopItem; shop: ShopView; onClose: () => void }) {
  const game = useGame();
  const [count, setCount] = useState(1);
  const [member, setMember] = useState(shop.members[0]?.id ?? '');
  const total = item.price * count;
  return (
    <div className="modal">
      <section className="result shop-buy" role="dialog" aria-modal="true" aria-labelledby="buy-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="buy-title" className="shop-buy-title">{item.label}</h2>
          <button type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        {item.banned !== undefined && (
          <p className="error" role="alert">
            Auf {shop.world?.name} verboten (Gesetz {shop.world?.law}, verboten ab {item.banned}). Wer damit erwischt wird, bekommt Ärger.
          </p>
        )}
        <label className="field">
          <span>Anzahl</span>
          <input type="number" inputMode="numeric" min={1} disabled={item.once} value={count} onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
        </label>
        <label className="field">
          <span>Für</span>
          <select value={member} onChange={(e) => setMember(e.target.value)}>
            {shop.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <p className="mono">
          {count} × {credits(item.price)} = <b>{credits(total)}</b> <span className="muted">(Kasse {credits(shop.funds)})</span>
        </p>
        <button
          type="button"
          className="primary"
          disabled={!member || total > shop.funds}
          onClick={() => {
            haptic('pick');
            game.buy(item.id, count, member);
            onClose();
          }}
        >
          {item.banned !== undefined ? 'Trotzdem kaufen' : 'Kaufen'}
        </button>
      </section>
    </div>
  );
}

type Sellable = ShopView['members'][number]['sellable'][number];

/** Was gerade verkauft werden soll: von wem welcher Gegenstand. Reine Anzeige, bis man bestätigt. */
interface Selling {
  readonly member: string;
  readonly item: Sellable;
}

/** Verkaufen aus dem Besitz eines Charakters: vorgeschlagen ist der halbe Preis. */
function Sale({ shop, onSell }: { shop: ShopView; onSell: (selling: Selling) => void }) {
  const [member, setMember] = useState(shop.members[0]?.id ?? '');
  const who = shop.members.find((m) => m.id === member) ?? shop.members[0];
  if (!who) return null;
  return (
    <div className="shop-offer shop-sale">
      <h2 className="section-title">Verkaufen auf {shop.world?.name}</h2>
      <label className="field">
        <span>Aus dem Besitz von</span>
        <select value={who.id} onChange={(e) => setMember(e.target.value)}>
          {shop.members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      {who.sellable.length === 0 ? (
        <p className="muted">{who.name} hat nichts, das sich verkaufen lässt.</p>
      ) : (
        <ul>
          {who.sellable.map((item) => (
            <li key={item.id} className="shop-item">
              <span className="shop-item-name">
                {item.count > 1 ? `${item.count} × ` : ''}
                {item.label}
              </span>
              <span className="mono muted shop-item-tl">je</span>
              <span className="mono shop-item-price">{credits(item.price)}</span>
              <button type="button" className="ghost compact" aria-label={`${item.label} verkaufen`} onClick={() => onSell({ member: who.id, item })}>
                Verkaufen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SellDialog({ selling, shop, onClose }: { selling: Selling; shop: ShopView; onClose: () => void }) {
  const game = useGame();
  const { item } = selling;
  const [count, setCount] = useState(1);
  const [price, setPrice] = useState(String(item.price));
  const each = Number(price);
  const valid = Number.isInteger(each) && each >= 1;
  const name = shop.members.find((m) => m.id === selling.member)?.name;
  return (
    <div className="modal">
      <section className="result shop-buy" role="dialog" aria-modal="true" aria-labelledby="sell-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="sell-title" className="shop-buy-title">
            {item.label} verkaufen
          </h2>
          <button type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className="muted">
          {name} hat {item.count}. Vorgeschlagen ist der halbe Preis der Charts; nach Verhandlung lässt er sich ändern.
        </p>
        <div className="shop-book-row">
          <label className="field">
            <span>Anzahl</span>
            <input type="number" inputMode="numeric" min={1} max={item.count} value={count} onChange={(e) => setCount(Math.min(item.count, Math.max(1, Math.floor(Number(e.target.value) || 1))))} />
          </label>
          <label className="field">
            <span>Erlös je Stück (Cr)</span>
            <input type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>
        <p className="mono">
          {count} × {credits(valid ? each : 0)} = <b>{credits(valid ? each * count : 0)}</b> <span className="muted">in die Kasse</span>
        </p>
        <button
          type="button"
          className="primary"
          disabled={!valid}
          onClick={() => {
            haptic('pick');
            game.sell(item.id, count, each, selling.member);
            onClose();
          }}
        >
          Verkaufen
        </button>
      </section>
    </div>
  );
}

function Ledger({ shop }: { shop: ShopView }) {
  if (shop.bookings.length === 0) return <p className="log-empty">Noch keine Buchung. Eine Einnahme buchen, etwa eine Belohnung, oder Credits eines Charakters einzahlen.</p>;
  return (
    <div className="shop-ledger">
      <h2 className="section-title">Kassenbuch</h2>
      <ol>
        {shop.bookings.map((b, i) => (
          <li key={i} className="shop-booking">
            <span className="kicker">{bookingText[b.kind]}</span>
            <span className="shop-booking-text">
              {b.kind === 'purchase'
                ? `${b.count} × ${b.item} für ${b.character} auf ${b.world}`
                : b.kind === 'sale'
                  ? `${b.count} × ${b.item} von ${b.character} auf ${b.world}`
                  : [b.character, b.text].filter(Boolean).join(' · ') || '—'}
            </span>
            <span className={b.amount < 0 ? 'mono shop-out' : 'mono shop-in'}>{credits(b.amount)}</span>
            <time className="entry-time" dateTime={b.at}>
              {clockTime(b.at)}
            </time>
          </li>
        ))}
      </ol>
    </div>
  );
}
