import { useState } from 'react';
import type { ShopView, Snapshot } from '../../controller';
import { bookingText, clockTime, credits, shipCostText } from '../format';
import { Form } from '../Form';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { PeopleTabs } from './PeopleTabs';

type FreeKind = 'income' | 'expense' | 'deposit' | 'payout';
const freeKinds: readonly FreeKind[] = ['income', 'expense', 'deposit', 'payout'];

/**
 * Die Kasse im Reiter Charaktere (neben SC und NSC): Stand der Gruppenkasse, freie Buchungen und das
 * Kassenbuch. Gekauft und verkauft wird im Shop („Einkaufen“ am Feld). Gerechnet und geprüft wird im
 * Model; was man gerade eintippt, hält nur die View.
 */
export function FundsScreen({ view }: { view: Snapshot }) {
  const shop = view.shop;
  return (
    <div className="screen">
      <PeopleTabs screen="funds" />
      {shop && (
        <section className="scroll shop-scroll funds-screen" aria-label="Kasse">
          <p className="funds-total">
            <span className="muted">Gruppenkasse</span> <strong className="mono">{credits(shop.funds)}</strong>
          </p>
          {shop.error && (
            <p className="error" role="alert">
              {shop.error}
            </p>
          )}
          <BookingForm shop={shop} />
          <Ledger shop={shop} />
        </section>
      )}
    </div>
  );
}

/**
 * Buchungen ins Leere: Einnahme und Ausgabe frei, Einzahlung und Auszahlung mit einem SC, den man hier
 * wählt; vorgewählt ist der Charakter oben.
 */
function BookingForm({ shop }: { shop: ShopView }) {
  const game = useGame();
  const [kind, setKind] = useState<FreeKind>('income');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const member = shop.members.find((m) => m.id === picked) ?? shop.members.find((m) => m.id === shop.owner) ?? shop.members[0];
  const withMember = kind === 'deposit' || kind === 'payout';
  const value = Number(amount);
  return (
    <Form
      className="shop-book"
      onSend={() => {
        haptic('pick');
        game.book(kind, value, text, withMember ? member?.id : undefined);
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
          <label className="field shop-who">
            <span>{kind === 'deposit' ? 'Von' : 'An'}</span>
            <select value={member?.id ?? ''} disabled={shop.members.length === 0} onChange={(e) => setPicked(e.target.value)}>
              {shop.members.length === 0 && <option value="">niemandem</option>}
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
    </Form>
  );
}

function Ledger({ shop }: { shop: ShopView }) {
  if (shop.bookings.length === 0) return <p className="log-empty">Noch keine Buchung. Eine Einnahme buchen, etwa eine Belohnung, oder Credits eines Charakters einzahlen.</p>;
  return (
    <div className="shop-ledger">
      <h2 className="section-title">Kassenbuch</h2>
      <ol>
        {shop.bookings.map((b, i) => (
          <li key={i} className={b.amount === 0 ? 'shop-booking unpaid' : 'shop-booking'}>
            <span className="kicker">{b.shipCost === undefined ? bookingText[b.kind] : shipCostText[b.shipCost]}</span>
            <span className="shop-booking-text">
              {b.kind === 'purchase'
                ? `${b.count} × ${b.item} für ${b.character} auf ${b.world}`
                : b.kind === 'sale'
                  ? `${b.count} × ${b.item} von ${b.character} auf ${b.world}`
                  : [b.character, b.ship, b.text].filter(Boolean).join(' · ') || '—'}
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
