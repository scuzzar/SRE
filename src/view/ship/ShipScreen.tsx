import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import type { ShipView, ShipYardRow, Snapshot } from '../../controller';
import { credits, mcr } from '../format';
import { SpaceCard, SpaceDock } from '../space/SpacePanel';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { CloseIcon, DropIcon, ExpandIcon, PencilIcon, ShipIcon, TrashIcon } from '../icons';
import { deckImage } from './deck-image';

/** Die Ansicht unter den Kacheln: eigene Deckpläne oder was nicht in den Kacheln steht. */
type Tab = 'deck' | 'details';

/** Das Blatt, das als Feld an der Stelle des Reiters steht; die Werft ist ein Blatt, kein eigener Reiter. */
type Sheet =
  | { readonly kind: 'yard' }
  | { readonly kind: 'buy'; readonly design: string; readonly method: 'cash' | 'bank' }
  | { readonly kind: 'edit' }
  | { readonly kind: 'fuel' }
  | { readonly kind: 'rename' }
  | { readonly kind: 'deck'; readonly name: string };

type Boat = NonNullable<ShipView['ship']>;

/**
 * Der Reiter Schiff: oben die Leiste mit Name (Stift zum Umbenennen) und Entwurf, dazu die Kasse;
 * darunter die Stände als Kacheln und zwei Ansichten – die eigenen Deckpläne und die Details.
 * Unten im Dock: Bearbeiten, Treibstoff und die goldene Werft. Die Werft und die übrigen Blätter
 * stehen als Feld an der Stelle des Reiters, im Ziehblatt; in der Werft wird bar oder über die Bank gekauft.
 */
export function ShipScreen({ view }: { view: Snapshot }) {
  const game = useGame();
  const ship = view.ship;
  const [tab, setTab] = useState<Tab>('deck');
  const [sheet, setSheet] = useState<Sheet | undefined>(undefined);
  const close = () => setSheet(undefined);
  if (ship === undefined) return null;
  const boat = ship.ship;
  const deck = sheet?.kind === 'deck' ? ship.deckPlans.find((p) => p.name === sheet.name) : undefined;
  const buying = sheet?.kind === 'buy' ? ship.yard.find((d) => d.designId === sheet.design) : undefined;
  // Ein offenes Blatt steht wie ein angetipptes Feld an der Stelle des Reiters: im Ziehblatt, das sich
  // ziehen lässt, über der Karte; im Desktop-Modus in der Seitenspalte.
  const field =
    sheet?.kind === 'yard' ? (
      <YardSheet ship={ship} onBuy={(d) => setSheet({ kind: 'buy', design: d.designId, method: d.price <= ship.funds ? 'cash' : 'bank' })} onClose={close} />
    ) : sheet?.kind === 'buy' && buying !== undefined ? (
      <BuySheet
        ship={ship}
        design={buying}
        method={sheet.method}
        onMethod={(method) => setSheet({ ...sheet, method })}
        onBack={() => setSheet({ kind: 'yard' })}
        onBuy={() => {
          haptic('pick');
          game.buyShipDesign(sheet.design, sheet.method);
          close();
        }}
        onClose={close}
      />
    ) : sheet?.kind === 'edit' && boat !== undefined ? (
      <EditSheet boat={boat} onClose={close} />
    ) : sheet?.kind === 'fuel' && boat !== undefined ? (
      <FuelSheet boat={boat} ship={ship} onClose={close} />
    ) : sheet?.kind === 'rename' && boat !== undefined ? (
      <RenameSheet boat={boat} onClose={close} />
    ) : sheet?.kind === 'deck' && deck !== undefined ? (
      <DeckSheet name={deck.name} image={deck.image} onClose={close} />
    ) : undefined;
  if (field !== undefined) return <div className="screen">{field}</div>;
  // Auf der Raumkarte steht hier die Bedienung des Systemflugs (Owner, 21. November 2026).
  if (view.space) {
    return (
      <div className="screen">
        <SpaceCard space={view.space} />
        <div className="dock">
          <SpaceDock space={view.space} />
        </div>
      </div>
    );
  }
  return (
    <div className="screen">
      <div className="shop-top">
        <div className="shop-head">
          <div className="head-ship">
            <span className="head-name">
              <p className="shop-world">{boat === undefined ? <span className="muted">Kein Schiff</span> : <b>{boat.name}</b>}</p>
              {/* Umbenennen wie sonst auch: über das Stift-Symbol. */}
              {boat !== undefined && (
                <button type="button" className="icon-button" aria-label="Schiff umbenennen" onClick={() => setSheet({ kind: 'rename' })}>
                  <PencilIcon />
                </button>
              )}
            </span>
            {boat !== undefined && (
              <p className="head-sub mono muted">
                {boat.designName} ({boat.designCode})
              </p>
            )}
          </div>
          <p className="shop-funds">
            <span className="muted">Kasse</span> <strong className="mono">{credits(ship.funds)}</strong>
          </p>
        </div>
      </div>
      <section className="scroll shop-scroll" role="tabpanel">
        {ship.error && (
          <p className="error" role="alert">
            {ship.error}
          </p>
        )}
        {boat !== undefined && !ship.flying && ship.launchBlocker && <p className="combat-hint ship-launch-hint">Starten: {ship.launchBlocker}</p>}
        {boat === undefined ? (
          <p className="log-empty">
            Die Gruppe hat noch kein Schiff. Unten die <b>Werft</b> öffnen und einen Standardentwurf kaufen; bei der Abmusterung gibt es Schiffe als Vorteil (Scout/Courier schuldenfrei, Subsidized
            Merchant mit Kreditschuld).
          </p>
        ) : (
          <>
            <div className="card-grid cols-2 ship-tiles">
              <div className="tile">
                <span className="tile-label">Treibstoff</span>
                <span className="tile-text">
                  {boat.fuel} / {boat.fuelMax} t
                </span>
                {boat.unrefined > 0 && <span className="tile-sub">davon {boat.unrefined} t unraffiniert (Sprung DM +1)</span>}
              </div>
              <div className="tile">
                <span className="tile-label">Fracht</span>
                <span className="tile-text">
                  {boat.cargo} / {boat.cargoMax} t
                </span>
              </div>
              <div className="tile duo">
                <span className="duo-col">
                  <span className="tile-label">Kabinen</span>
                  <span className="tile-text">
                    {boat.cabins} / {boat.cabinsMax}
                  </span>
                </span>
                <span className="duo-col">
                  <span className="tile-label">Niedrigbetten</span>
                  <span className="tile-text">
                    {boat.lowBerthsUsed} / {boat.lowBerthsMax}
                  </span>
                </span>
              </div>
              <div className="tile">
                <span className="tile-label">Antrieb</span>
                <span className="tile-text">{boat.thruster}</span>
                {(boat.maneuverNow < boat.maneuver || boat.jumpNow < boat.jump) && (
                  <span className="tile-sub negative">
                    beschädigt: Jump-{boat.jumpNow} · {boat.maneuverNow}G
                  </span>
                )}
              </div>
              {boat.damage.length > 0 && (
                <div className="tile">
                  <span className="tile-label">Schaden</span>
                  <span className="tile-text negative">{boat.damage.length} Treffer</span>
                  <span className="tile-sub">
                    {boat.damage.join(', ')}
                    {boat.turretsOut.length > 0 ? ` · Turret ${boat.turretsOut.join(', ')} ausgefallen` : ''} · Reparatur in der Werft
                  </span>
                </div>
              )}
              <div className="tile">
                <span className="tile-label">Hardpoints</span>
                <span className="tile-text">{armamentLine(boat)}</span>
              </div>
              <div className="tile">
                <span className="tile-label">Computer</span>
                <span className="tile-text">{boat.computerName}</span>
              </div>
            </div>
            <div className="shop-tabs" role="tablist" aria-label="Ansichten des Schiffs">
              <button type="button" role="tab" aria-selected={tab === 'deck'} onClick={() => setTab('deck')}>
                Deckplan
              </button>
              <button type="button" role="tab" aria-selected={tab === 'details'} onClick={() => setTab('details')}>
                Details
              </button>
            </div>
            {tab === 'deck' ? <DeckPlans ship={ship} onView={(name) => setSheet({ kind: 'deck', name })} /> : <Details boat={boat} />}
          </>
        )}
      </section>
      <div className="dock">
        <div className="actions">
          {boat === undefined ? (
            <button type="button" className="action gold" onClick={() => setSheet({ kind: 'yard' })}>
              <ShipIcon />
              Werft öffnen
            </button>
          ) : (
            <>
              {ship.flying ? (
                <button type="button" className="action draw" onClick={() => game.showFlight()}>
                  <ShipIcon />
                  Zum Flug
                </button>
              ) : (
                <button type="button" className="action draw" disabled={ship.launchBlocker !== undefined} title={ship.launchBlocker} onClick={() => game.launch()}>
                  <ShipIcon />
                  Starten
                </button>
              )}
              <button type="button" className="action soft" onClick={() => setSheet({ kind: 'edit' })}>
                <PencilIcon />
                Bearbeiten
              </button>
              <button type="button" className="action soft" onClick={() => setSheet({ kind: 'fuel' })}>
                <DropIcon />
                Treibstoff
              </button>
              <button type="button" className="action gold" onClick={() => setSheet({ kind: 'yard' })}>
                <ShipIcon />
                Werft
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Ein Blatt des Reiters Schiff, als Feld an der Stelle des Reiters wie das angetippte Feld des Globus:
 * oben Titel und ✕ (am Kopf lässt sich das Ziehblatt fassen), darunter der Inhalt, unten im Dock die
 * Knöpfe. Esc schließt es wie das ✕.
 */
function SheetFrame({ title, aside, onClose, foot, children }: { title: string; aside?: string; onClose: () => void; foot?: ReactNode; children: ReactNode }) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ein Popup darüber (Ergebnis, Menü) schließt Esc zuerst.
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"], [role="alertdialog"], .menu-layer')) return;
      e.preventDefault();
      close.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <>
      <section className="scroll shop-scroll ship-field" aria-label={title}>
        <div className="globe-sheet-head" data-tray-peek>
          <h3>{title}</h3>
          <span className="header-right">
            {aside !== undefined && <span className="sheet-aside mono muted">{aside}</span>}
            <button type="button" className="icon-button" aria-label={`${title} schließen`} onClick={onClose}>
              <CloseIcon />
            </button>
          </span>
        </div>
        {children}
      </section>
      {foot !== undefined && (
        <div className="dock">
          <div className="actions">{foot}</div>
        </div>
      )}
    </>
  );
}

/** Ansicht Deckplan: bis zu drei eigene Pläne, jeder voll in der Breite, darunter die zwei Knöpfe. */
function DeckPlans({ ship, onView }: { ship: ShipView; onView: (name: string) => void }) {
  const game = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const full = ship.freeDeckSlots === 0;
  // Welcher Plan gerade fragt, ob er wirklich weg soll: Löschen braucht zwei Tipper, wie bei Kampagnen.
  const [confirming, setConfirming] = useState<string | undefined>(undefined);
  // PNG-Upload und Kamera: die Datei wird zum Data URL-Bild (große Fotos verkleinert), das der Controller ablegt.
  const take = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file === undefined) return;
    void deckImage(file)
      .catch(() => '')
      .then((image) => game.addDeckPlan(image));
  };
  return (
    <>
      {ship.deckPlans.length > 0 && (
        <div className="deck-stack">
          {ship.deckPlans.map((plan) => (
            <figure key={plan.name} className="deck-card">
              <img src={plan.image} alt={plan.name} onClick={() => onView(plan.name)} />
              <figcaption>
                <span>{plan.name}</span>
                <span>
                  <button type="button" className="icon-button" aria-label={`${plan.name} ansehen`} onClick={() => onView(plan.name)}>
                    <ExpandIcon />
                  </button>
                  {confirming === plan.name ? (
                    <>
                      <button type="button" className="ghost deck-keep" onClick={() => setConfirming(undefined)}>
                        Behalten
                      </button>
                      <button
                        type="button"
                        className="ghost danger deck-delete"
                        onClick={() => {
                          setConfirming(undefined);
                          void game.removeDeckPlan(plan.name);
                        }}
                      >
                        Löschen?
                      </button>
                    </>
                  ) : (
                    <button type="button" className="icon-button" aria-label={`${plan.name} löschen`} onClick={() => setConfirming(plan.name)}>
                      <TrashIcon />
                    </button>
                  )}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="deck-empty">{full ? (ship.deckPlans.length > 3 ? `${ship.deckPlans.length} Deckpläne aus dem Abgleich; für ein neues Bild erst auf drei löschen` : 'Alle drei Deckpläne belegt') : `Noch ${ship.freeDeckSlots} von 3 Plätzen frei`}</div>
      <div className="deck-adds">
        <button type="button" className="ghost" disabled={full} title={full ? 'Alle drei Deckpläne belegt' : undefined} onClick={() => fileRef.current?.click()}>
          PNG hochladen
        </button>
        <button type="button" className="ghost" disabled={full} title={full ? 'Alle drei Deckpläne belegt' : undefined} onClick={() => camRef.current?.click()}>
          Kamera
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden onChange={take} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={take} />
    </>
  );
}

/** Ansicht Details: alles, was nicht schon in den Kacheln steht, und die Software an Bord. */
function Details({ boat }: { boat: Boat }) {
  const debt = boat.loanBalance === undefined ? (boat.initialLoan === undefined ? 'schuldenfrei' : 'bezahlt') : credits(boat.loanBalance);
  return (
    <>
      <dl className="profile">
        <div>
          <dt>Restschuld</dt>
          <dd className={boat.loanBalance === undefined ? undefined : 'gold'}>{debt}</dd>
        </div>
        {boat.initialLoan !== undefined && (
          <div>
            <dt>Kreditsumme</dt>
            <dd>{credits(boat.initialLoan)}</dd>
          </div>
        )}
        {boat.monthlyPayment !== undefined && (
          <div>
            <dt>Monatsrate</dt>
            <dd>{`${credits(boat.monthlyPayment)} × 480`}</dd>
          </div>
        )}
        {boat.nextPayment !== undefined && (
          <div>
            <dt>Nächste Rate</dt>
            <dd>{boat.nextPayment}</dd>
          </div>
        )}
        <div>
          <dt>Crewbedarf</dt>
          <dd>{boat.crew}</dd>
        </div>
        <div>
          <dt>Bauzeit</dt>
          <dd>{`${boat.months} Monate`}</dd>
        </div>
        <div>
          <dt>Grundpreis</dt>
          <dd>{mcr(boat.basePrice)}</dd>
        </div>
        <div>
          <dt>Preis (gezahlt)</dt>
          <dd>{credits(boat.price)}</dd>
        </div>
      </dl>
      {boat.loanBalance !== undefined && <p className="shop-hint muted">Die Bank hebt die Monatsrate automatisch ein, wenn sie fällig ist; ohne Deckung bleibt die Rate als Hinweis in der Kasse stehen.</p>}
      <h2 className="section-title">Software an Bord · {boat.computerName}</h2>
      <div className="shop-table" role="table" aria-label="Software an Bord">
        {boat.software.map((s) => (
          <div key={s.name} className="shop-row soft-row" role="row">
            <span role="cell" className="shop-name">
              <span className="shop-label">{s.name}</span>
              <span className="shop-meta">{s.effect}</span>
            </span>
            <span role="cell" className="shop-num soft-kind muted">
              {s.kind}
            </span>
          </div>
        ))}
      </div>
      <p className="shop-hint muted">Kabinen und Niedrigbetten: immer die Gruppe zuerst, später zahlende Passagiere. Bewaffnung in der Werft; noch offen: Kampf-Software. Gereist wird schon: „Hierher reisen“ auf einer Weltkarte auch mit eigenem Schiff.</p>
    </>
  );
}

/** Die Bewaffnung in einer Zeile: Hardpoints, Turrets und Waffen, oder „unbewaffnet“. */
function armamentLine(boat: Boat): string {
  const weapons = boat.turrets.reduce((n, t) => n + t.weapons.length, 0);
  if (boat.turrets.length === 0) return `${boat.hardpoints} · unbewaffnet`;
  return `${boat.turrets.length} / ${boat.hardpoints} Turrets · ${weapons === 0 ? 'unbestückt' : `${weapons} Waffe${weapons === 1 ? '' : 'n'}`}`;
}

/**
 * Bewaffnung des eigenen Schiffs in der Werft (2026-11-21g): je Hardpoint ein Turret mit seinen Waffen,
 * Einbauen kostet den Preis aus der Kasse, Ausbauen bringt nichts zurück (erst nachfragen).
 */
function ArmamentSection({ ship, boat }: { ship: ShipView; boat: Boat }) {
  const game = useGame();
  const [asking, setAsking] = useState<string | undefined>(undefined);
  const blocked = boat.armamentBlocker !== undefined;
  const free = boat.hardpoints - boat.turrets.length;
  const price = (o: { name: string; price: number }) => `${o.name} · ${mcr(o.price)} MCr`;
  const remove = (key: string, act: () => void) => {
    if (asking !== key) return setAsking(key);
    setAsking(undefined);
    haptic('pick');
    act();
  };
  return (
    <div className="shop-counter armament">
      <h2 className="section-title">
        Bewaffnung von {boat.name} <span className="muted">({boat.hardpoints} Hardpoints)</span>
      </h2>
      {boat.armamentBlocker && <p className="combat-hint">{boat.armamentBlocker}</p>}
      {boat.hardpoints === 0 && <p className="shop-hint muted">{boat.designName} hat keine Hardpoints.</p>}
      <ol className="turret-list">
        {boat.turrets.map((t, i) => (
          <li key={i} className="turret">
            <div className="turret-head">
              <b>Hardpoint {i + 1}</b> · {t.typeName}
              <span className="muted">
                {' '}
                ({t.weapons.length}/{t.slots})
              </span>
            </div>
            <div className="turret-weapons">
              {t.weapons.map((w, k) => (
                <button key={k} type="button" className="ghost compact" disabled={blocked} onClick={() => remove(`w${i}-${k}`, () => game.removeWeapon(i, k))}>
                  {asking === `w${i}-${k}` ? `${w.name} ausbauen? (kein Erlös)` : `${w.name} ✕`}
                </button>
              ))}
              {t.weapons.length === 0 && <span className="muted">unbestückt</span>}
            </div>
            <div className="turret-actions">
              {t.weapons.length < t.slots && (
                <select aria-label={`Waffe in Turret ${i + 1} einbauen`} value="" disabled={blocked} onChange={(e) => e.target.value && (haptic('pick'), game.installWeapon(i, e.target.value))}>
                  <option value="">+ Waffe einbauen …</option>
                  {ship.shipWeapons.map((w) => (
                    <option key={w.id} value={w.id} disabled={!w.affordable}>
                      {price(w)}
                    </option>
                  ))}
                </select>
              )}
              <select aria-label={`Turmart von Turret ${i + 1} ändern`} value="" disabled={blocked} onChange={(e) => e.target.value && (haptic('pick'), game.replaceTurret(i, e.target.value))}>
                <option value="">Turmart ändern …</option>
                {ship.turretTypes
                  .filter((k) => k.id !== t.typeId)
                  .map((k) => (
                    <option key={k.id} value={k.id} disabled={!k.affordable}>
                      {price(k)}
                      {(k.slots ?? 0) < t.weapons.length ? ` (nur ${k.slots} Waffe${k.slots === 1 ? '' : 'n'} bleiben)` : ''}
                    </option>
                  ))}
              </select>
              <button type="button" className="ghost compact danger" disabled={blocked} onClick={() => remove(`t${i}`, () => game.removeTurret(i))}>
                {asking === `t${i}` ? 'Turret ausbauen? (kein Erlös)' : 'Turret ausbauen'}
              </button>
            </div>
          </li>
        ))}
        {Array.from({ length: Math.max(0, free) }, (_, k) => (
          <li key={`free${k}`} className="turret free">
            <div className="turret-head">
              <b>Hardpoint {boat.turrets.length + k + 1}</b> · frei
            </div>
            {k === 0 && (
              <div className="turret-actions">
                <select aria-label="Turret einbauen" value="" disabled={blocked} onChange={(e) => e.target.value && (haptic('pick'), game.installTurret(e.target.value))}>
                  <option value="">+ Turret einbauen …</option>
                  {ship.turretTypes.map((k2) => (
                    <option key={k2.id} value={k2.id} disabled={!k2.affordable}>
                      {price(k2)} · {k2.slots} Platz{k2.slots === 1 ? '' : 'e'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="shop-hint muted">Preise nach SE 10; Hardpoints stecken schon im Preis des Entwurfs. Einbauen nur an einem Raumhafen A oder B, Ausbauen ohne Erlös.</p>
    </div>
  );
}

/** Reparatur des Schadens aus dem Raumkampf in der Werft (2026-11-21h, Hausregel: Cr 100.000 je Treffer, Cr 1.000.000 je kritischem). */
function RepairSection({ boat, funds }: { boat: Boat; funds: number }) {
  const game = useGame();
  return (
    <div className="shop-counter">
      <h2 className="section-title">Reparatur</h2>
      <p>
        {boat.name}: {boat.damage.join(', ')}
      </p>
      {boat.armamentBlocker && <p className="combat-hint">{boat.armamentBlocker.replace('Umrüsten', 'Reparieren')}</p>}
      <button type="button" className="action gold" disabled={boat.armamentBlocker !== undefined || boat.repairCost > funds} onClick={() => (haptic('pick'), game.repairShip())}>
        Alles reparieren · {mcr(boat.repairCost)} MCr
      </button>
      <p className="shop-hint muted">Hausregel: Cr 100.000 je Treffer, Cr 1.000.000 je kritischem Treffer; die SR rechnen mit dem Neuwert der Baugruppen, die die App nicht kennt.</p>
    </div>
  );
}

/** Die Werft als Blatt: die Bewaffnung des eigenen Schiffs, dann die Standardentwürfe, der Preis als Knopf. */
function YardSheet({ ship, onBuy, onClose }: { ship: ShipView; onBuy: (design: ShipYardRow) => void; onClose: () => void }) {
  return (
    <SheetFrame title="Werft" aside="Standardentwürfe · SR 35–37" onClose={onClose}>
      {ship.error && (
        <p className="error" role="alert">
          {ship.error}
        </p>
      )}
      {ship.ship !== undefined && ship.ship.damage.length > 0 && <RepairSection boat={ship.ship} funds={ship.funds} />}
      {ship.ship !== undefined && <ArmamentSection ship={ship} boat={ship.ship} />}
      <p className="shop-hint muted">Preis antippen zum Bestellen an der Werft. Bar oder über die Bank: 20&nbsp;% Anzahlung, 480 Monatsraten, zusammen 220&nbsp;% des Preises (SR&nbsp;29). Grau = nicht bezahlbar.</p>
      <div className="shop-counter">
        <h2 className="section-title">
          Standardentwürfe <span className="muted">({ship.yard.length})</span>
        </h2>
        <div className="shop-table" role="table" aria-label="Standardentwürfe">
          <div className="shop-row ship-row shop-row-head" role="row">
            <span role="columnheader">Entwurf</span>
            <span role="columnheader" className="shop-num">
              MCr
            </span>
          </div>
          {ship.yard.map((d) => (
            <div key={d.designId} className="shop-row ship-row" role="row">
              <span role="cell" className="shop-name">
                <span className="shop-label">
                  {d.name} <small>{d.code}</small>
                </span>
                <span className="shop-meta">
                  {d.hull} t · Jump-{d.jump} · {d.maneuver}G · {d.crew}
                </span>
              </span>
              <span role="cell" className="shop-num">
                <button type="button" className="shop-price" disabled={!d.affordable} onClick={() => onBuy(d)}>
                  <span>{mcr(d.price)}</span>
                  {d.affordable && <span className="shop-price-sub">{d.price <= ship.funds ? 'bar' : `Anzahlung ${mcr(d.down)}`}</span>}
                  {d.owned && (
                    <span className="shop-owned" title="das habt ihr">
                      ✓
                    </span>
                  )}
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="shop-hint muted">Auch bei der Abmusterung gibt es ein Schiff: der Ship-Vorteil der Laufbahn (Scout/Courier schuldenfrei, Subsidized Merchant mit Kreditschuld).</p>
    </SheetFrame>
  );
}

/** Bestellung an der Werft: bar oder mit Bankfinanzierung, die Zahlungen vorausgerechnet. */
function BuySheet({ ship, design, method, onMethod, onBack, onBuy, onClose }: { ship: ShipView; design: ShipYardRow; method: 'cash' | 'bank'; onMethod: (m: 'cash' | 'bank') => void; onBack: () => void; onBuy: () => void; onClose: () => void }) {
  const cash = ship.funds >= design.price;
  const canPay = method === 'cash' ? cash : ship.funds >= design.down;
  const monthly = Math.round((design.price * 2) / 480);
  return (
    <SheetFrame
      title={`${design.name} (${design.code}) kaufen`}
      aside={`${design.hull} t · Jump-${design.jump} · ${design.maneuver}G`}
      onClose={onClose}
      foot={
        <>
          <button type="button" className="action soft" onClick={onBack}>
            ← Werft
          </button>
          <button type="button" className="action gold" disabled={!canPay} onClick={onBuy}>
            {method === 'cash' ? 'Bar kaufen' : 'Finanzieren und bestellen'}
          </button>
        </>
      }
    >
      <div className="segmented" role="radiogroup" aria-label="Bezahlart">
        <button type="button" role="radio" aria-checked={method === 'cash'} disabled={!cash} onClick={() => onMethod('cash')}>
          Bar aus der Kasse
        </button>
        <button type="button" role="radio" aria-checked={method === 'bank'} onClick={() => onMethod('bank')}>
          Bankfinanzierung
        </button>
      </div>
      {method === 'cash' ? (
        <dl className="profile">
          <div>
            <dt>Preis</dt>
            <dd>{credits(design.price)}</dd>
          </div>
          <div>
            <dt>Kasse danach</dt>
            <dd>{credits(ship.funds - design.price)}</dd>
          </div>
          <div>
            <dt>Bauzeit (Referenz)</dt>
            <dd>{`${design.months} Monate`}</dd>
          </div>
        </dl>
      ) : (
        <dl className="profile">
          <div>
            <dt>Anzahlung (20 %)</dt>
            <dd>{credits(design.down)}</dd>
          </div>
          <div>
            <dt>Kreditsumme (200 %)</dt>
            <dd>{credits(design.price * 2)}</dd>
          </div>
          <div>
            <dt>Monatsrate</dt>
            <dd>{`${credits(monthly)} × 480`}</dd>
          </div>
          <div>
            <dt>Gesamt (220 %)</dt>
            <dd>{credits(design.down + design.price * 2)}</dd>
          </div>
        </dl>
      )}
      {!canPay && (
        <p className="error" role="alert">
          Die Kasse ({credits(ship.funds)}) reicht dafür nicht.
        </p>
      )}
      {ship.ship !== undefined && <p className="shop-hint muted">Die Gruppe hat schon „{ship.ship.name}“. Beim Kaufen wird das alte Schiff ausgemustert (wie beim Wechsel durch den Ship-Vorteil).</p>}
    </SheetFrame>
  );
}

/** Bearbeiten des Schiffsbogens: Name, Treibstoff und Fracht in ganzen Tonnen. */
function EditSheet({ boat, onClose }: { boat: Boat; onClose: () => void }) {
  const game = useGame();
  const [name, setName] = useState(boat.name);
  const [fuel, setFuel] = useState(String(boat.fuel));
  const [cargo, setCargo] = useState(String(boat.cargo));
  const tons = (value: string, max: number) => /^\d+$/.test(value.trim()) && Number(value) <= max;
  const valid = name.trim() !== '' && tons(fuel, boat.fuelMax) && tons(cargo, boat.cargoMax);
  return (
    <SheetFrame
      title="Schiff bearbeiten"
      aside={`${boat.designName} (${boat.designCode})`}
      onClose={onClose}
      foot={
        <>
          <button type="button" className="action soft" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="action gold"
            disabled={!valid}
            onClick={() => {
              haptic('pick');
              game.editShip({ name: name.trim(), fuel: Number(fuel), cargo: Number(cargo) });
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <label className="field">
        <span>Name</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="field">
        <span>Treibstoff (von {boat.fuelMax} t)</span>
        <input type="number" inputMode="numeric" min={0} max={boat.fuelMax} value={fuel} onChange={(e) => setFuel(e.target.value)} />
      </label>
      <label className="field">
        <span>Fracht (von {boat.cargoMax} t)</span>
        <input type="number" inputMode="numeric" min={0} max={boat.cargoMax} value={cargo} onChange={(e) => setCargo(e.target.value)} />
      </label>
      <p className="shop-hint muted">Die Belegung der Kabinen ergibt sich aus der Gruppe; zahlende Passagiere kommen mit dem Handel.</p>
    </SheetFrame>
  );
}

/** Treibstoff kaufen: raffiniert zu Cr 500 je Tonne (SR 30), höchstens bis der Tank voll ist. */
function FuelSheet({ boat, ship, onClose }: { boat: Boat; ship: ShipView; onClose: () => void }) {
  const game = useGame();
  const need = boat.fuelMax - boat.fuel;
  const [qty, setQty] = useState(need);
  const cost = qty * ship.fuelPrice;
  const buyable = qty >= 1 && cost <= ship.funds;
  return (
    <SheetFrame
      title="Treibstoff kaufen"
      aside={`Cr ${ship.fuelPrice} / t · raffiniert`}
      onClose={onClose}
      foot={
        <>
          <button type="button" className="action soft" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="action gold"
            disabled={!buyable}
            onClick={() => {
              haptic('pick');
              game.buyFuelTons(qty);
              onClose();
            }}
          >
            Kaufen
          </button>
        </>
      }
    >
      <label className="field">
        <span>Menge in Tonnen</span>
        <span className="fuel-row">
          <input type="number" inputMode="numeric" min={0} max={need} value={qty} onChange={(e) => setQty(Math.max(0, Math.min(need, Math.floor(Number(e.target.value) || 0))))} />
          <button type="button" className="ghost compact" disabled={need === 0} onClick={() => setQty(need)}>
            Voll tanken ({need} t)
          </button>
        </span>
      </label>
      <dl className="profile">
        <div>
          <dt>Tank danach</dt>
          <dd>
            {boat.fuel + qty} / {boat.fuelMax} t
          </dd>
        </div>
        <div>
          <dt>Kosten</dt>
          <dd>{credits(cost)}</dd>
        </div>
        <div>
          <dt>Kasse danach</dt>
          <dd>{credits(ship.funds - cost)}</dd>
        </div>
      </dl>
      {need === 0 ? <p className="shop-hint muted">Der Tank ist voll.</p> : cost > ship.funds ? <p className="error" role="alert">Die Kasse ({credits(ship.funds)}) reicht dafür nicht.</p> : null}
    </SheetFrame>
  );
}

/** Umbenennen über das Stift-Symbol am Namen. */
function RenameSheet({ boat, onClose }: { boat: Boat; onClose: () => void }) {
  const game = useGame();
  const [name, setName] = useState(boat.name);
  return (
    <SheetFrame
      title="Schiff umbenennen"
      onClose={onClose}
      foot={
        <>
          <button type="button" className="action soft" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="action gold"
            disabled={name.trim() === ''}
            onClick={() => {
              haptic('pick');
              game.renameShip(name.trim());
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <label className="field">
        <span>Name</span>
        <input autoFocus value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>
    </SheetFrame>
  );
}

/** Einen hinterlegten Deckplan groß ansehen; hier lässt er sich auch entfernen. */
function DeckSheet({ name, image, onClose }: { name: string; image: string; onClose: () => void }) {
  const game = useGame();
  // Erst der zweite Tipper löscht, wie im Reiter und in der Kampagnenwahl.
  const [confirming, setConfirming] = useState(false);
  return (
    <SheetFrame
      title={name}
      aside="Deckplan"
      onClose={onClose}
      foot={
        <>
          <button
            type="button"
            className="action soft danger"
            onClick={() => {
              if (!confirming) {
                setConfirming(true);
                return;
              }
              void game.removeDeckPlan(name);
              onClose();
            }}
          >
            {confirming ? 'Löschen?' : 'Löschen'}
          </button>
          <button type="button" className="action gold" onClick={onClose}>
            Fertig
          </button>
        </>
      }
    >
      <img className="deck-large" src={image} alt={name} />
    </SheetFrame>
  );
}
