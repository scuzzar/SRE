import { useState } from 'react';
import type { ShopItem, ShopView, Snapshot } from '../../controller';
import type { ItemKind } from '../../model';
import { bookingText, clockTime, credits, kindNames } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';
import { Form } from '../Form';
import { CharacterStrip } from '../oracle/CharacterStrip';

type FreeKind = 'income' | 'expense' | 'deposit' | 'payout';
const freeKinds: readonly FreeKind[] = ['income', 'expense', 'deposit', 'payout'];

/** Die Bereiche des Shops: drei Theken, der Verkauf und die Kasse. Welcher offen ist, ist reine Darstellung. */
type Area = 'weapons' | 'armor' | 'gear' | 'sell' | 'funds';
const areas: readonly { readonly id: Area; readonly name: string }[] = [
  { id: 'weapons', name: 'Waffen' },
  { id: 'armor', name: 'Rüstung' },
  { id: 'gear', name: 'Sonstiges' },
  { id: 'sell', name: 'Verkauf' },
  { id: 'funds', name: 'Kasse' },
];

/**
 * Der Reiter Shop, gebaut wie der Laden eines Rollenspiels: oben die Leiste mit dem Charakter oben
 * (für ihn kauft und verkauft man), darunter Aufenthaltsort und Gruppenkasse und die Bereiche Waffen
 * (mit dem Magazin als eigener Spalte), Rüstung, Sonstiges, Verkauf (sein Besitz) und Kasse (freie
 * Buchungen und Kassenbuch). Gerechnet und geprüft wird im Model; was man gerade eintippt, welcher
 * Bereich offen und welcher Kauf offen ist, hält nur die View.
 */
export function ShopScreen({ view }: { view: Snapshot }) {
  const shop = view.shop;
  // Der gewählte Bereich gilt für die Kampagne, in der man ihn gewählt hat; sonst öffnet der Shop auf
  // einer Welt bei den Waffen, ohne Welt bei der Kasse.
  const [chosen, setChosen] = useState<{ readonly campaign: string; readonly area: Area } | undefined>(undefined);
  const [buying, setBuying] = useState<ShopItem | undefined>(undefined);
  const [selling, setSelling] = useState<Selling | undefined>(undefined);
  if (!shop) return null;
  const area: Area = chosen?.campaign === view.campaign.id ? chosen.area : shop.world ? 'weapons' : 'funds';
  const setArea = (a: Area) => setChosen({ campaign: view.campaign.id, area: a });
  const owner = shop.members.find((m) => m.id === shop.owner);
  return (
    <div className="screen">
      <CharacterStrip view={view} shop />
      <div className="shop-top">
        <div className="shop-head">
          {shop.world ? (
            <p className="shop-world">
              <b>{shop.world.name}</b> <span className="mono muted">{shop.world.id}</span>
              <span className="muted">
                {' '}
                · TL {shop.world.tech} · Gesetz {shop.world.law}
              </span>
            </p>
          ) : (
            <p className="shop-world muted">Auf keiner Welt</p>
          )}
          <p className="shop-funds">
            <span className="muted">Kasse</span> <strong className="mono">{credits(shop.funds)}</strong>
          </p>
        </div>
        <div className="shop-tabs" role="tablist" aria-label="Bereiche des Shops">
          {areas.map((a) => (
            <button key={a.id} type="button" role="tab" id={`shop-tab-${a.id}`} aria-selected={area === a.id} aria-controls="shop-area" onClick={() => setArea(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      </div>
      <section className="scroll shop-scroll" id="shop-area" role="tabpanel" aria-labelledby={`shop-tab-${area}`}>
        {shop.error && (
          <p className="error" role="alert">
            {shop.error}
          </p>
        )}
        {area === 'funds' ? (
          <>
            <BookingForm owner={owner} />
            <Ledger shop={shop} />
          </>
        ) : !shop.world ? (
          <p className="log-empty">Die Gruppe ist auf keiner Welt. Auf der Sektorkarte eine fertige Welt öffnen und „Gruppe ist hier“ wählen; dann lässt sich hier kaufen und verkaufen.</p>
        ) : area === 'weapons' ? (
          <WeaponCounter shop={shop} onBuy={setBuying} />
        ) : area === 'sell' ? (
          <SaleCounter owner={owner} onSell={(item) => owner && setSelling({ member: owner.id, item })} />
        ) : area === 'armor' ? (
          <ItemCounter title="Rüstungen" items={shop.armor} onBuy={setBuying} />
        ) : (
          shop.gear.map((group) => <ItemCounter key={group.kind} title={kindNames[group.kind]} items={group.items} onBuy={setBuying} />)
        )}
      </section>
      {buying && <BuyDialog key={buying.id} item={buying} shop={shop} owner={owner} onClose={() => setBuying(undefined)} />}
      {selling && <SellDialog key={`${selling.member}-${selling.item.id}`} selling={selling} shop={shop} onClose={() => setSelling(undefined)} />}
    </div>
  );
}

type Member = ShopView['members'][number];

/** Buchungen ins Leere: Einnahme und Ausgabe frei, Einzahlung und Auszahlung mit dem Charakter oben. */
function BookingForm({ owner }: { owner: Member | undefined }) {
  const game = useGame();
  const [kind, setKind] = useState<FreeKind>('income');
  const [amount, setAmount] = useState('');
  const [text, setText] = useState('');
  const member = owner?.id;
  const withMember = kind === 'deposit' || kind === 'payout';
  const value = Number(amount);
  return (
    <Form
      className="shop-book"
      onSend={() => {
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
          <p className="field shop-who">
            <span>{kind === 'deposit' ? 'Von' : 'An'}</span>
            <b>{owner ? `${owner.name} (${credits(owner.credits)})` : 'niemandem'}</b>
          </p>
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
      {withMember && <p className="muted shop-hint">Wer einzahlt oder bekommt, wählt man oben in der Leiste.</p>}
    </Form>
  );
}

/** Was unter dem Namen einer Ware steht: Fertigkeit, Besitz, Verbot. */
function Meta({ parts, banned }: { parts: readonly (string | false | undefined)[]; banned: number | undefined }) {
  const shown = parts.filter(Boolean);
  if (shown.length === 0 && banned === undefined) return null;
  return (
    <span className="shop-meta">
      {shown.join(' · ')}
      {banned !== undefined && <span className="shop-banned">{shown.length ? ' · ' : ''}verboten ab Gesetz {banned}</span>}
    </span>
  );
}

/** Der Preis in Cr als Knopf, immer gleich breit: antippen öffnet den Kauf. Reicht die Kasse nicht, ist er grau. */
function PriceButton({ item, sub, onBuy }: { item: ShopItem; sub?: string | undefined; onBuy: (item: ShopItem) => void }) {
  return (
    <button type="button" className="shop-price" disabled={!item.affordable} aria-label={`${item.label} kaufen`} onClick={() => onBuy(item)}>
      <span>{item.price.toLocaleString('de-DE')}</span>
      {sub && <span className="shop-price-sub">{sub}</span>}
    </button>
  );
}

/**
 * Die Waffentheke: Nahkampf und Schusswaffen, je Zeile Waffe, Schaden, Preis und daneben das Magazin.
 * Fett steht, was der Charakter oben führen kann (er hat die Fertigkeit).
 */
function WeaponCounter({ shop, onBuy }: { shop: ShopView; onBuy: (item: ShopItem) => void }) {
  const groups = [
    { name: 'Nahkampf', weapons: shop.weapons.filter((w) => w.attack !== 'shot') },
    { name: 'Schusswaffen', weapons: shop.weapons.filter((w) => w.attack === 'shot') },
  ].filter((g) => g.weapons.length > 0);
  const owner = shop.members.find((m) => m.id === shop.owner);
  return (
    <>
      {owner && (
        <p className="muted shop-hint">
          <b className="shop-skilled-sample">Fett</b>: {owner.name} hat die Fertigkeit. Preis antippen zum Kaufen.
        </p>
      )}
      {groups.map((group) => (
        <div key={group.name} className="shop-counter">
          <h2 className="section-title">{group.name}</h2>
          <div className="shop-table shop-weapons" role="table" aria-label={group.name}>
            <div className="shop-row shop-row-head" role="row">
              <span role="columnheader">Waffe</span>
              <span role="columnheader" className="shop-num" aria-label="Schaden">
                W6
              </span>
              <span role="columnheader" className="shop-num">
                Cr
              </span>
              <span role="columnheader" className="shop-num">
                Munition
              </span>
            </div>
            {group.weapons.map((w) => (
              <div key={w.item.id} role="row" className={w.skill ? 'shop-row skilled' : 'shop-row'}>
                <span role="cell" className="shop-name">
                  <span className="shop-label">{w.item.label}</span>
                  <Meta
                    parts={[w.skill, w.characteristic, w.item.owned > 0 && `${w.item.owned} im Besitz`, w.ammo && w.ammo.owned > 0 && `${w.ammo.owned} Magazin${w.ammo.owned > 1 ? 'e' : ''}`]}
                    banned={w.item.banned}
                  />
                </span>
                <span role="cell" className="shop-num">
                  {w.wounds}
                </span>
                <span role="cell" className="shop-num">
                  <PriceButton item={w.item} onBuy={onBuy} />
                </span>
                <span role="cell" className="shop-num">
                  {w.ammo ? <PriceButton item={w.ammo} sub={`${w.ammo.rounds} Schuss`} onBuy={onBuy} /> : <span className="muted">–</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Eine Theke ohne Extras: Ware, TL und Preis; was der Charakter oben hat oder trägt, steht darunter. */
function ItemCounter({ title, items, onBuy }: { title: string; items: readonly ShopItem[]; onBuy: (item: ShopItem) => void }) {
  return (
    <div className="shop-counter">
      <h2 className="section-title">
        {title} <span className="muted">({items.length})</span>
      </h2>
      <div className="shop-table shop-items" role="table" aria-label={title}>
        <div className="shop-row shop-row-head" role="row">
          <span role="columnheader">Ware</span>
          <span role="columnheader" className="shop-num">
            TL
          </span>
          <span role="columnheader" className="shop-num">
            Cr
          </span>
        </div>
        {items.map((item) => (
          <div key={item.id} role="row" className="shop-row">
            <span role="cell" className="shop-name">
              <span className="shop-label">{item.label}</span>
              <Meta parts={[item.worn ? 'getragen' : undefined, item.owned > 0 && `${item.owned} im Besitz`]} banned={item.banned} />
            </span>
            <span role="cell" className="shop-num muted">
              {item.tl ?? '–'}
            </span>
            <span role="cell" className="shop-num">
              <PriceButton item={item} onBuy={onBuy} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Der Verkauf: der Besitz des Charakters oben nach Art, mit dem vorgeschlagenen Erlös je Stück als Knopf. */
function SaleCounter({ owner, onSell }: { owner: Member | undefined; onSell: (item: Sellable) => void }) {
  if (!owner) return <p className="log-empty">Ohne lebenden Charakter gibt es nichts zu verkaufen.</p>;
  if (owner.sellable.length === 0) return <p className="log-empty">{owner.name} hat nichts, das sich verkaufen lässt. Oben in der Leiste lässt sich ein anderer Charakter wählen.</p>;
  // Nach Art in der Reihenfolge der Liste, wie die Theken.
  const kinds = Object.keys(kindNames) as ItemKind[];
  const groups = kinds.map((kind) => ({ kind, items: owner.sellable.filter((i) => i.kind === kind) })).filter((g) => g.items.length > 0);
  return (
    <>
      <p className="muted shop-hint">
        Besitz von <b className="shop-skilled-sample">{owner.name}</b>. Erlös je Stück antippen zum Verkaufen; vorgeschlagen ist der halbe Preis.
      </p>
      {groups.map((group) => (
        <div key={group.kind} className="shop-counter">
          <h2 className="section-title">{kindNames[group.kind]}</h2>
          <div className="shop-table shop-items" role="table" aria-label={kindNames[group.kind]}>
            <div className="shop-row shop-row-head" role="row">
              <span role="columnheader">Gegenstand</span>
              <span role="columnheader" className="shop-num">
                Stk
              </span>
              <span role="columnheader" className="shop-num">
                Cr je
              </span>
            </div>
            {group.items.map((item) => (
              <div key={item.id} role="row" className="shop-row">
                <span role="cell" className="shop-name">
                  <span className="shop-label">{item.label}</span>
                  <Meta parts={[item.role]} banned={undefined} />
                </span>
                <span role="cell" className="shop-num">
                  {item.count}
                </span>
                <span role="cell" className="shop-num">
                  <button type="button" className="shop-price" aria-label={`${item.label} verkaufen`} onClick={() => onSell(item)}>
                    <span>{item.price.toLocaleString('de-DE')}</span>
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function BuyDialog({ item, shop, owner, onClose }: { item: ShopItem; shop: ShopView; owner: Member | undefined; onClose: () => void }) {
  const game = useGame();
  const [count, setCount] = useState(1);
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
        <p>{owner ? <>Für <b>{owner.name}</b>{item.owned > 0 ? `, der schon ${item.owned} hat` : ''}.</> : 'Es gibt niemanden, der es bekommen könnte.'}</p>
        <div className="shop-stepper" role="group" aria-label="Anzahl">
          <button type="button" className="ghost" aria-label="Eins weniger" disabled={item.once || count <= 1} onClick={() => setCount(count - 1)}>
            −
          </button>
          <input type="number" inputMode="numeric" min={1} aria-label="Anzahl" disabled={item.once} value={count} onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
          <button type="button" className="ghost" aria-label="Eins mehr" disabled={item.once || item.price * (count + 1) > shop.funds} onClick={() => setCount(count + 1)}>
            +
          </button>
        </div>
        <p className="mono">
          {count} × {credits(item.price)} = <b>{credits(total)}</b> <span className="muted">(Kasse {credits(shop.funds)})</span>
        </p>
        <button
          type="button"
          className="primary"
          disabled={!owner || total > shop.funds}
          onClick={() => {
            if (!owner) return;
            haptic('pick');
            game.buy(item.id, count, owner.id);
            onClose();
          }}
        >
          {item.banned !== undefined ? 'Trotzdem kaufen' : 'Kaufen'}
        </button>
      </section>
    </div>
  );
}

type Sellable = Member['sellable'][number];

/** Was gerade verkauft werden soll: von wem welcher Gegenstand. Reine Anzeige, bis man bestätigt. */
interface Selling {
  readonly member: string;
  readonly item: Sellable;
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
          {name} hat {item.count}. Der Erlös geht in die Gruppenkasse. Vorgeschlagen ist der halbe Preis der Charts; nach Verhandlung lässt er sich ändern.
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
