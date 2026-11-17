import { useState } from 'react';
import type { ShopItem, ShopView, Snapshot } from '../../controller';
import type { ItemKind } from '../../model';
import { credits, kindNames } from '../format';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon } from '../icons';
import { CharacterStrip } from '../oracle/CharacterStrip';

/** Die Bereiche des Shops: drei Theken und der Verkauf. Welcher offen ist, ist reine Darstellung. */
type Area = 'weapons' | 'armor' | 'gear' | 'sell';
const areas: readonly { readonly id: Area; readonly name: string }[] = [
  { id: 'weapons', name: 'Waffen' },
  { id: 'armor', name: 'Rüstung' },
  { id: 'gear', name: 'Sonstiges' },
  { id: 'sell', name: 'Verkauf' },
];

/**
 * Der Shop, gebaut wie der Laden eines Rollenspiels; „Einkaufen“ am Feld bzw. an der Weltkarte des
 * Aufenthaltsorts öffnet ihn an der Stelle des Felds. Oben die Leiste mit dem Charakter oben (für ihn
 * kauft und verkauft man), darunter Aufenthaltsort und Stand der Gruppenkasse und die Bereiche Waffen
 * (mit dem Magazin als eigener Spalte), Rüstung, Sonstiges und Verkauf (sein Besitz). Buchungen und
 * Kassenbuch stehen im Reiter Charaktere unter Kasse (`FundsScreen`). Gerechnet und geprüft wird im
 * Model; welcher Bereich offen und welcher Kauf offen ist, hält nur die View. `onClose` (✕ oben) gibt
 * es auf dem Smartphone; im Desktop-Modus steht das ✕ im Kopf der Seitenspalte.
 */
export function ShopScreen({ view, onClose }: { view: Snapshot; onClose?: (() => void) | undefined }) {
  const shop = view.shop;
  // Der gewählte Bereich gilt für die Kampagne, in der man ihn gewählt hat; sonst öffnet der Shop bei
  // den Waffen.
  const [chosen, setChosen] = useState<{ readonly campaign: string; readonly area: Area } | undefined>(undefined);
  const game = useGame();
  const [buying, setBuying] = useState<ShopItem | undefined>(undefined);
  const [selling, setSelling] = useState<Selling | undefined>(undefined);
  if (!shop) return null;
  const area: Area = chosen?.campaign === view.campaign.id ? chosen.area : 'weapons';
  const setArea = (a: Area) => setChosen({ campaign: view.campaign.id, area: a });
  const owner = shop.members.find((m) => m.id === shop.owner);
  // Ein Tipp kauft ein Stück für den Charakter oben; mehr kauft man mit mehr Tipps. Nur was das
  // Gesetz der Welt verbietet, fragt erst nach.
  const buy = (item: ShopItem) => {
    if (!owner) return;
    if (item.banned !== undefined) return setBuying(item);
    haptic('pick');
    game.buy(item.id, 1, owner.id);
  };
  return (
    <div className="screen">
      {/* Im Desktop-Modus stehen Credits und Besitz in der Charakterspalte neben dem Shop. */}
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
          {onClose && (
            <button type="button" className="icon-button" aria-label="Shop schließen" onClick={onClose}>
              <CloseIcon />
            </button>
          )}
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
        {!shop.world ? (
          <p className="log-empty">Die Gruppe ist auf keiner Welt. Auf der Sektorkarte eine fertige Welt öffnen und „Gruppe platzieren“ wählen; dann lässt sich dort einkaufen.</p>
        ) : area === 'weapons' ? (
          <WeaponCounter shop={shop} hintHidden={view.shopHintHidden} onBuy={buy} />
        ) : area === 'sell' ? (
          <SaleCounter stash={shop.stash} owner={owner} onSell={(member, item) => setSelling({ member, item })} />
        ) : area === 'armor' ? (
          <ItemCounter title="Rüstungen" items={shop.armor} onBuy={buy} />
        ) : (
          shop.gear.map((group) => <ItemCounter key={group.kind} title={kindNames[group.kind]} items={group.items} onBuy={buy} />)
        )}
      </section>
      {buying && owner && <BannedDialog key={buying.id} item={buying} shop={shop} owner={owner} onClose={() => setBuying(undefined)} />}
      {selling && <SellDialog key={`${selling.member}-${selling.item.id}`} selling={selling} shop={shop} onClose={() => setSelling(undefined)} />}
    </div>
  );
}

type Member = ShopView['members'][number];

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

/**
 * Der Preis in Cr als Knopf, immer gleich breit: ein Tipp kauft ein Stück für den Charakter oben.
 * Das Abzeichen in der Ecke sagt, wie viele davon er schon besitzt. Reicht die Kasse nicht, ist er grau; was man
 * nur einmal haben kann und schon hat, ebenso.
 */
function PriceButton({ item, sub, onBuy }: { item: ShopItem; sub?: string | undefined; onBuy: (item: ShopItem) => void }) {
  const had = item.once && item.owned > 0;
  return (
    <button type="button" className="shop-price" disabled={!item.affordable || had} aria-label={`${item.label} kaufen`} onClick={() => onBuy(item)}>
      <span>{item.price.toLocaleString('de-DE')}</span>
      {sub && <span className="shop-price-sub">{sub}</span>}
      {item.owned > 0 && (
        <span key={item.owned} className="shop-owned" aria-label={`hat ${item.owned}`} title={`hat ${item.owned}`}>
          {item.owned}
        </span>
      )}
    </button>
  );
}

/**
 * Die Waffentheke: Nahkampf und Schusswaffen, je Zeile Waffe, Schaden, Preis und daneben das Magazin.
 * Fett steht, was der Charakter oben führen kann (er hat die Fertigkeit). Der Hinweis darüber lässt
 * sich wegklicken.
 */
function WeaponCounter({ shop, hintHidden, onBuy }: { shop: ShopView; hintHidden: boolean; onBuy: (item: ShopItem) => void }) {
  const game = useGame();
  const groups = [
    { name: 'Nahkampf', weapons: shop.weapons.filter((w) => w.attack !== 'shot') },
    { name: 'Schusswaffen', weapons: shop.weapons.filter((w) => w.attack === 'shot') },
  ].filter((g) => g.weapons.length > 0);
  const owner = shop.members.find((m) => m.id === shop.owner);
  return (
    <>
      {owner && !hintHidden && (
        <div className="shop-hint-box">
          <p className="muted shop-hint">
            <b className="shop-skilled-sample">Fett</b>: {owner.name} hat die Fertigkeit. Ein Tipp auf den Preis kauft eins für {owner.name}; die goldene Zahl in der Ecke: so viele sind schon da.
          </p>
          <button type="button" className="icon-button" aria-label="Hinweis ausblenden" onClick={() => game.hideShopHint()}>
            <CloseIcon />
          </button>
        </div>
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
                    parts={[w.skill, w.characteristic]}
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
              <Meta parts={[item.worn ? 'getragen' : undefined]} banned={item.banned} />
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
function SaleCounter({ stash, owner, onSell }: { stash: readonly Sellable[]; owner: Member | undefined; onSell: (member: string | undefined, item: Sellable) => void }) {
  if (stash.length === 0 && (!owner || owner.sellable.length === 0)) return <p className="log-empty">Im Gepäck und an {owner?.name ?? 'den SC'} ist nichts, das sich verkaufen lässt.</p>;
  return (
    <>
      <p className="muted shop-hint">Erlös je Stück antippen zum Verkaufen; vorgeschlagen ist der halbe Preis. Oben in der Leiste lässt sich ein anderer Charakter wählen.</p>
      {stash.length > 0 && <SaleGroups title="Gepäck" items={stash} onSell={(item) => onSell(undefined, item)} />}
      {owner && owner.sellable.length > 0 && <SaleGroups title={`Ausgerüstet von ${owner.name}`} items={owner.sellable} onSell={(item) => onSell(owner.id, item)} />}
    </>
  );
}

/** Verkäufliches nach Art, in der Reihenfolge der Liste, wie die Theken. */
function SaleGroups({ title, items, onSell }: { title: string; items: readonly Sellable[]; onSell: (item: Sellable) => void }) {
  const kinds = Object.keys(kindNames) as ItemKind[];
  const groups = kinds.map((kind) => ({ kind, items: items.filter((i) => i.kind === kind) })).filter((g) => g.items.length > 0);
  return (
    <>
      <h2 className="section-title shop-sale-title">{title}</h2>
      {groups.map((group) => (
        <div key={group.kind} className="shop-counter">
          <h3 className="section-title">{kindNames[group.kind]}</h3>
          <div className="shop-table shop-items" role="table" aria-label={`${title}: ${kindNames[group.kind]}`}>
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

/** Was das Gesetz der Welt verbietet, kauft man erst nach einer Rückfrage; auch hier genau eins. */
function BannedDialog({ item, shop, owner, onClose }: { item: ShopItem; shop: ShopView; owner: Member; onClose: () => void }) {
  const game = useGame();
  return (
    <div className="modal">
      <section className="result shop-buy" role="dialog" aria-modal="true" aria-labelledby="buy-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="buy-title" className="shop-buy-title">{item.label}</h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <p className="error" role="alert">
          Auf {shop.world?.name} verboten (Gesetz {shop.world?.law}, verboten ab {item.banned}). Wer damit erwischt wird, bekommt Ärger.
        </p>
        <p>
          Eins für <b>{owner.name}</b> für <span className="mono">{credits(item.price)}</span> aus der Kasse
          {item.owned > 0 ? ` (schon ${item.owned} im Besitz)` : ''}.
        </p>
        <button
          type="button"
          className="primary"
          onClick={() => {
            haptic('pick');
            game.buy(item.id, 1, owner.id);
            onClose();
          }}
        >
          Trotzdem kaufen
        </button>
      </section>
    </div>
  );
}

type Sellable = Member['sellable'][number];

/** Was gerade verkauft werden soll: aus dem Gepäck (`member` fehlt) oder von wem welcher Gegenstand. Reine Anzeige, bis man bestätigt. */
interface Selling {
  readonly member: string | undefined;
  readonly item: Sellable;
}

function SellDialog({ selling, shop, onClose }: { selling: Selling; shop: ShopView; onClose: () => void }) {
  const game = useGame();
  const { item } = selling;
  const game_ = item.perKg !== undefined;
  const [count, setCount] = useState(game_ ? item.count : 1);
  const [price, setPrice] = useState(String(item.price));
  const each = Number(price);
  const valid = Number.isInteger(each) && each >= 1;
  const name = selling.member === undefined ? 'Das Gepäck' : shop.members.find((m) => m.id === selling.member)?.name;
  if (game_) {
    // Jagdbeute: verkauft nach kg; vorgeschlagen ist der halbe Listenpreis für die gewählte Menge.
    const suggest = (kg: number) => String(Math.max(1, Math.floor((kg * item.perKg!) / 2)));
    return (
      <div className="modal">
        <section className="result shop-buy" role="dialog" aria-modal="true" aria-labelledby="sell-title">
          <div className="sheet-head" style={{ alignItems: 'center' }}>
            <h2 id="sell-title" className="shop-buy-title">
              {item.label} verkaufen
            </h2>
            <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          <p className="muted">
            {name} hat {item.count} kg, {item.role}. Vorgeschlagen ist der halbe Listenpreis; nach Verhandlung lässt er sich ändern.
          </p>
          <div className="shop-book-row">
            <label className="field">
              <span>kg</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={item.count}
                value={count}
                onChange={(e) => {
                  const kg = Math.min(item.count, Math.max(1, Math.floor(Number(e.target.value) || 1)));
                  setCount(kg);
                  setPrice(suggest(kg));
                }}
              />
            </label>
            <label className="field">
              <span>Erlös gesamt (Cr)</span>
              <input type="number" inputMode="numeric" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
          </div>
          <button
            type="button"
            className="primary"
            disabled={!valid}
            onClick={() => {
              haptic('pick');
              game.sellGame(item.id, count, each);
              onClose();
            }}
          >
            {count} kg für {credits(valid ? each : 0)} verkaufen
          </button>
        </section>
      </div>
    );
  }
  return (
    <div className="modal">
      <section className="result shop-buy" role="dialog" aria-modal="true" aria-labelledby="sell-title">
        <div className="sheet-head" style={{ alignItems: 'center' }}>
          <h2 id="sell-title" className="shop-buy-title">
            {item.label} verkaufen
          </h2>
          <button data-escape type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
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
