import { useRef, useState, type ChangeEvent } from 'react';
import type { ShipView, ShipYardRow, Snapshot } from '../../controller';
import { credits, mcr } from '../format';
import { SpaceCard, SpaceDock } from '../space/SpacePanel';
import { useGame } from '../game-context';
import { haptic } from '../haptics';
import { DropIcon, ExpandIcon, PencilIcon, ShipIcon, TrashIcon } from '../icons';
import { DetailPage } from '../DetailPage';
import { CrewPersonSheet, CrewPostSheet, CrewTab } from './CrewTab';
import { ComputerTab, ProgramSheet, SoftwareYard } from './ComputerTab';
import { deckImage } from './deck-image';
import { CabinsList, HoldTab } from './HoldTab';

/** Die Ansicht unter den Kacheln: eigene Deckpläne, die Crew und der Rechner. */
type Tab = 'deck' | 'crew' | 'computer';

/** Die Detailseite, die an der Stelle des Bereichs steht; die Werft ist eine, kein eigener Unterreiter. */
type Sheet =
  | { readonly kind: 'yard' }
  | { readonly kind: 'buy'; readonly design: string; readonly method: 'cash' | 'bank' }
  | { readonly kind: 'edit' }
  | { readonly kind: 'fuel' }
  | { readonly kind: 'hold' }
  | { readonly kind: 'cabins' }
  | { readonly kind: 'damage'; readonly back?: 'yard' }
  | { readonly kind: 'rename' }
  | { readonly kind: 'deck'; readonly name: string }
  | { readonly kind: 'post'; readonly shipId: string; readonly at: number }
  | { readonly kind: 'person'; readonly shipId: string; readonly who: string }
  | { readonly kind: 'program'; readonly shipId: string; readonly program: string }
  | { readonly kind: 'software' };

type Boat = NonNullable<ShipView['ship']>;

/**
 * Der Bereich Schiff: oben die Leiste mit Name (Stift zum Umbenennen) und Entwurf, dazu die Kasse;
 * darunter die Stände als Kacheln und zwei Ansichten – die eigenen Deckpläne und die Details.
 * Unten im Dock: Bearbeiten, Treibstoff und die goldene Werft. Die Werft und die übrigen Detailseiten
 * stehen als Feld an der Stelle des Bereichs, im Ziehblatt; in der Werft wird bar oder über die Bank gekauft.
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
  // Die Detailseiten von Crew und Rechner brauchen das Schiff aus der Liste der Schiffe, den Posten
  // oder das Programm daraus.
  const vessel = boat !== undefined && sheet !== undefined && 'shipId' in sheet ? sheet.shipId : undefined;
  const crewBoat = vessel === undefined || boat === undefined ? undefined : boat.crews.find((c) => c.shipId === vessel);
  const crewPost = sheet?.kind === 'post' ? crewBoat?.posts[sheet.at] : undefined;
  const compBoat = vessel === undefined || boat === undefined ? undefined : boat.computers.find((c) => c.shipId === vessel);
  const program = sheet?.kind === 'program' ? compBoat?.programs.find((p) => p.id === sheet.program) : undefined;
  const buying = sheet?.kind === 'buy' ? ship.yard.find((d) => d.designId === sheet.design) : undefined;
  // Eine offene Detailseite steht wie ein angetipptes Feld an der Stelle des Bereichs: im Ziehblatt, das sich
  // ziehen lässt, über der Karte; im Desktop-Modus in der Seitenspalte.
  const field =
    sheet?.kind === 'yard' ? (
      <YardSheet ship={ship} onBuy={(d) => setSheet({ kind: 'buy', design: d.designId, method: d.price <= ship.funds ? 'cash' : 'bank' })} onDamage={() => setSheet({ kind: 'damage', back: 'yard' })} onClose={close} />
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
    ) : sheet?.kind === 'hold' && boat !== undefined ? (
      <DetailPage title="Laderaum" aside={boat.name} onClose={close}>
        <HoldTab hold={view.hold} error={ship.error} />
      </DetailPage>
    ) : sheet?.kind === 'cabins' && boat !== undefined ? (
      <DetailPage title="Kabinen" aside={boat.name} onClose={close}>
        <CabinsList hold={view.hold} />
      </DetailPage>
    ) : sheet?.kind === 'damage' && boat !== undefined ? (
      <DamageSheet boat={boat} funds={ship.funds} error={ship.error} onClose={sheet.back === 'yard' ? () => setSheet({ kind: 'yard' }) : close} />
    ) : sheet?.kind === 'fuel' && boat !== undefined ? (
      <FuelSheet boat={boat} ship={ship} onClose={close} />
    ) : sheet?.kind === 'rename' && boat !== undefined ? (
      <RenameSheet boat={boat} onClose={close} />
    ) : sheet?.kind === 'deck' && deck !== undefined ? (
      <DeckSheet name={deck.name} image={deck.image} onClose={close} />
    ) : sheet?.kind === 'post' && crewBoat !== undefined && crewPost !== undefined ? (
      <CrewPostSheet boat={crewBoat} post={crewPost} onClose={close} />
    ) : sheet?.kind === 'person' && crewBoat !== undefined ? (
      <CrewPersonSheet boat={crewBoat} who={sheet.who} onClose={close} />
    ) : sheet?.kind === 'program' && compBoat !== undefined && program !== undefined ? (
      <ProgramSheet boat={compBoat} program={program} onClose={close} />
    ) : sheet?.kind === 'software' ? (
      <SoftwareYard ship={ship} onClose={close} />
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
              {/* Treibstoff und Fracht in einer Kachel wie Kabinen und Niedrigbetten. */}
              <div className="tile duo">
                <span className="duo-col">
                  <span className="tile-label">Treibstoff</span>
                  <span className="tile-text">
                    {boat.fuel} / {boat.fuelMax} t
                  </span>
                </span>
                <button type="button" className="duo-col tile-open" aria-label="Laderaum: was an Bord ist und wohin es soll" onClick={() => setSheet({ kind: 'hold' })}>
                  <span className="tile-label">Fracht ›</span>
                  <span className="tile-text">
                    {boat.cargo} / {boat.cargoMax} t
                  </span>
                </button>
                {boat.unrefined > 0 && <span className="tile-sub">davon {boat.unrefined} t unraffiniert (Sprung DM +1)</span>}
              </div>
              <button type="button" className="tile duo tile-open" aria-label="Kabinen und Niedrigbetten: wer an Bord ist und wohin" onClick={() => setSheet({ kind: 'cabins' })}>
                <span className="duo-col">
                  <span className="tile-label">Kabinen ›</span>
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
              </button>
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
                <button type="button" className="tile tile-open" aria-label="Schaden: Treffer ansehen und reparieren" onClick={() => setSheet({ kind: 'damage' })}>
                  <span className="tile-label">Schaden ›</span>
                  <span className="tile-text negative">{boat.damage.length} Treffer</span>
                  <span className="tile-sub">
                    {boat.damage.join(', ')}
                    {boat.turretsOut.length > 0 && boat.craftWeapons === undefined ? ` · Turret ${boat.turretsOut.join(', ')} ausgefallen` : ''}
                  </span>
                </button>
              )}
              <div className="tile">
                <span className="tile-label">{boat.craftWeapons !== undefined ? 'Bewaffnung' : 'Hardpoints'}</span>
                <span className="tile-text">{armamentLine(boat)}</span>
              </div>
              <div className="tile">
                <span className="tile-label">Computer</span>
                <span className="tile-text">{boat.computerName}</span>
              </div>
              {/* Die Restschuld steht als letzte Kache, nicht mehr im Unterreiter Details. */}
              <div className="tile">
                <span className="tile-label">Restschuld</span>
                <span className={`tile-text${boat.loanBalance === undefined ? '' : ' gold'}`}>{debtLine(boat)}</span>
                {boat.monthlyPayment !== undefined && boat.loanBalance !== undefined && <span className="tile-sub">{`${credits(boat.monthlyPayment)} im Monat`}</span>}
              </div>
            </div>
            <div className="shop-tabs" role="tablist" aria-label="Ansichten des Schiffs">
              <button type="button" role="tab" aria-selected={tab === 'deck'} onClick={() => setTab('deck')}>
                Deckplan
              </button>
              <button type="button" role="tab" aria-selected={tab === 'crew'} onClick={() => setTab('crew')}>
                Crew
              </button>
              <button type="button" role="tab" aria-selected={tab === 'computer'} onClick={() => setTab('computer')}>
                Computer
              </button>
            </div>
            <div className="ship-panel" role="tabpanel" aria-label={tab === 'deck' ? 'Deckplan' : tab === 'crew' ? 'Crew' : 'Computer'}>
              {tab === 'deck' ? (
              <DeckPlans ship={ship} onView={(name) => setSheet({ kind: 'deck', name })} />
            ) : tab === 'crew' ? (
              <CrewTab crews={boat?.crews ?? []} onOpenPost={(shipId, at) => setSheet({ kind: 'post', shipId, at })} onOpenPerson={(shipId, who) => setSheet({ kind: 'person', shipId, who })} />
            ) : (
              <ComputerTab ship={ship} onOpenProgram={(shipId, program) => setSheet({ kind: 'program', shipId, program })} onOpenYard={() => setSheet({ kind: 'software' })} />
            )}
            </div>
          </>
        )}
      </section>
      {/* Die Aktionsleiste wie im Log: gleich breit, Symbol über dem Wort (2026-11-26). */}
      <div className="dock">
        <div className="actions oracle-actions">
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

/** Was in die Kachel „Restschuld“ gehört: der offene Rest, sonst „schuldenfrei“ oder „bezahlt“. */
function debtLine(boat: Boat): string {
  return boat.loanBalance === undefined ? (boat.initialLoan === undefined ? 'schuldenfrei' : 'bezahlt') : credits(boat.loanBalance);
}

/** Die Bewaffnung in einer Zeile: Hardpoints, Turrets und Waffen, oder „unbewaffnet“. */
function armamentLine(boat: Boat): string {
  if (boat.craftWeapons !== undefined) return boat.craftWeapons;
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
  // Was die Kasse nicht hergibt, ist ausgegraut und sagt es (GUI-Handbuch: Nichts passiert still).
  const price = (o: { name: string; price: number; affordable: boolean }) => `${o.name} · ${mcr(o.price)}${o.affordable ? '' : ' · Kasse zu klein'}`;
  const cheapest = Math.min(...ship.turretTypes.map((k) => k.price), ...ship.shipWeapons.map((w) => w.price));
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
      {!blocked && boat.hardpoints > 0 && (
        <p className={ship.funds < cheapest ? 'combat-hint' : 'shop-hint muted'}>
          In der Kasse: {credits(ship.funds)}.{ship.funds < cheapest ? ` Für Turrets und Waffen reicht das nicht; das Billigste kostet ${credits(cheapest)}.` : ' Ausgegraut ist, was die Kasse nicht hergibt.'}
        </p>
      )}
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

/** In der Werft: der Schaden in einer Zeile und der Weg zur Detailseite Schaden (2026-11-27d). */
function RepairSection({ boat, onOpen }: { boat: Boat; onOpen: () => void }) {
  return (
    <div className="shop-counter">
      <h2 className="section-title">Reparatur</h2>
      <p>
        {boat.name}: {boat.damage.join(', ')}
      </p>
      <button type="button" className="action gold" onClick={onOpen}>
        Schaden ansehen und reparieren ›
      </button>
    </div>
  );
}

/**
 * Die Detailseite Schaden (2026-11-27d): oben die Treffer zum Auswählen, darunter wer repariert. Unterwegs
 * flickt ein Charakter einen Treffer (10+, einmal je Woche); in der Werft repariert ein Engineer selbst
 * (8+, Material oder Gebühr) oder die Werft repariert alles Ausgewählte. Die Handlungen stehen unten.
 */
function DamageSheet({ boat, funds, error, onClose }: { boat: Boat; funds: number; error: string | undefined; onClose: () => void }) {
  const game = useGame();
  const repair = boat.repair;
  const [picked, setPicked] = useState<readonly string[]>([]);
  const [who, setWho] = useState<string | undefined>(repair.people.find((p) => p.blocker === undefined)?.id);
  const key = (h: { ship: string; at: number }) => `${h.ship}-${h.at}`;
  // Nach einer Reparatur stimmen alte Stellen nicht mehr: nur noch auswählen, was es gibt.
  const chosen = repair.hits.filter((h) => picked.includes(key(h)));
  const person = repair.people.find((p) => p.id === who);
  const single = chosen.length === 1 ? chosen[0]! : undefined;
  const attemptBlocker =
    person === undefined ? 'Wer repariert?' : single === undefined ? 'Genau einen Treffer auswählen.' : person.blockers[repair.hits.indexOf(single)];
  const yardCost = chosen.reduce((n, h) => n + h.yardPrice, 0);
  const toggle = (h: { ship: string; at: number }) => setPicked((p) => (p.includes(key(h)) ? p.filter((k) => k !== key(h)) : repair.atYard ? [...p, key(h)] : [key(h)]));
  const attemptLabel = repair.atYard ? `Selbst reparieren (${person?.need ?? repair.target}+)` : `Flicken (${person?.need ?? repair.target}+)`;
  return (
    <DetailPage
      title="Schaden"
      aside={boat.name}
      onClose={onClose}
      foot={
        <>
          <button
            type="button"
            className={repair.atYard ? 'action soft' : 'action gold'}
            disabled={attemptBlocker !== undefined}
            title={attemptBlocker}
            onClick={() => {
              haptic('shake');
              game.attemptRepair(person!.id, single!.ship, single!.at);
              setPicked([]);
            }}
          >
            {attemptLabel}
          </button>
          {repair.atYard && (
            <button
              type="button"
              className="action gold"
              disabled={chosen.length === 0 || yardCost > funds || repair.yardBlocker !== undefined}
              title={chosen.length === 0 ? 'Treffer auswählen' : yardCost > funds ? 'Zu wenig in der Kasse' : repair.yardBlocker}
              onClick={() => {
                haptic('pick');
                game.repairHits(chosen.map((h) => ({ ship: h.ship, at: h.at })));
                setPicked([]);
              }}
            >
              Werft · {chosen.length === 0 ? 'auswählen' : mcr(yardCost)}
            </button>
          )}
        </>
      }
    >
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <h4 className="section-title">
        Treffer{repair.atYard ? ' · auswählen, was repariert wird' : ' · einen zum Flicken auswählen'}
      </h4>
      <div className="chips" role="group" aria-label="Treffer">
        {repair.hits.map((h) => (
          <button key={key(h)} type="button" aria-pressed={picked.includes(key(h))} onClick={() => toggle(h)}>
            <span>{h.label}</span>
            {h.critical && <span className="negative"> · kritisch</span>}
            {h.patched && <span className="muted"> · geflickt</span>}
            {repair.atYard && <span className="mono muted"> · {mcr(h.yardPrice)}</span>}
          </button>
        ))}
      </div>
      {repair.atYard && (
        <button type="button" className="ghost compact" onClick={() => setPicked(chosen.length === repair.hits.length ? [] : repair.hits.map(key))}>
          {chosen.length === repair.hits.length ? 'Keinen auswählen' : 'Alle auswählen'}
        </button>
      )}
      <h4 className="section-title">Wer repariert · 2W6 + Engineering, {repair.target}+</h4>
      <div className="chips" role="group" aria-label="Wer repariert">
        {repair.people.map((p) => (
          <button key={p.id} type="button" aria-pressed={who === p.id} title={p.blocker} onClick={() => setWho(p.id)}>
            <span>{p.name}</span>
            <span className="mono muted"> · Engineering-{p.engineering} · {p.need}+</span>
          </button>
        ))}
      </div>
      {attemptBlocker !== undefined && person !== undefined && single !== undefined && <p className="combat-hint">{attemptBlocker}</p>}
      {person?.blocker !== undefined && <p className="combat-hint">{person.blocker}</p>}
      <p className="shop-hint muted">
        {repair.atYard
          ? `In der Werft: Die Werft repariert, was ausgewählt ist (Cr 100.000 je Treffer, Cr 1.000.000 je kritischem). Oder ein Engineer ab Engineering-1 repariert einen Treffer selbst, 8+: gelingt es, kostet das Material ${credits(repair.material.hit)} (kritisch ${credits(repair.material.critical)}), sonst die Gebühr ${credits(repair.fee.hit)} (kritisch ${credits(repair.fee.critical)}). Je Engineer ein Treffer am Tag oder ein kritischer in der Woche.`
          : 'Unterwegs nur provisorisch (SR 42): Je Charakter einmal in der Woche, 2W6 + Engineering 10+, dann ist der Treffer geflickt – er wirkt nicht mehr, die Werft berechnet ihn trotzdem. Kritische Treffer repariert nur die Werft.'}
      </p>
    </DetailPage>
  );
}

/** Eine Liste der Werft: Standardentwürfe oder Small Craft, der Preis als Knopf. */
function YardTable({ title, rows, funds, onBuy }: { title: string; rows: readonly ShipYardRow[]; funds: number; onBuy: (design: ShipYardRow) => void }) {
  return (
    <>
      <h2 className="section-title">
        {title} <span className="muted">({rows.length})</span>
      </h2>
      <div className="shop-table" role="table" aria-label={title}>
        <div className="shop-row ship-row shop-row-head" role="row">
          <span role="columnheader">Entwurf</span>
          <span role="columnheader" className="shop-num">
            MCr
          </span>
        </div>
        {rows.map((d) => (
          <div key={d.designId} className="shop-row ship-row" role="row" title={d.blocker}>
            <span role="cell" className="shop-name">
              <span className="shop-label">
                {d.name} {!d.smallCraft && <small>{d.code}</small>}
              </span>
              <span className="shop-meta">
                {d.smallCraft ? `${d.hull} t · ${d.maneuver}G · ${d.crew} · ${d.blocker ?? d.becomes}` : `${d.hull} t · Jump-${d.jump} · ${d.maneuver}G · ${d.crew}${d.craft !== '' ? ` · ${d.craft}` : ''}`}
              </span>
            </span>
            <span role="cell" className="shop-num">
              <button type="button" className="shop-price" disabled={!d.affordable} onClick={() => onBuy(d)}>
                <span>{mcr(d.price)}</span>
                {d.affordable && <span className="shop-price-sub">{d.price <= funds ? 'bar' : `Anzahlung ${mcr(d.down)}`}</span>}
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
    </>
  );
}

/** Die Werft als Detailseite: Reparatur und Bewaffnung des eigenen Schiffs (2026-11-21g/h), dann die Standardentwürfe und die Small Craft (2026-11-21c), der Preis als Knopf. */
function YardSheet({ ship, onBuy, onDamage, onClose }: { ship: ShipView; onBuy: (design: ShipYardRow) => void; onDamage: () => void; onClose: () => void }) {
  return (
    <DetailPage title="Werft" aside="Standardentwürfe · SR 33–37" onClose={onClose}>
      {ship.error && (
        <p className="error" role="alert">
          {ship.error}
        </p>
      )}
      {ship.ship !== undefined && ship.ship.damage.length > 0 && <RepairSection boat={ship.ship} onOpen={onDamage} />}
      {ship.ship !== undefined && ship.ship.hardpoints > 0 && <ArmamentSection ship={ship} boat={ship.ship} />}
      <p className="shop-hint muted">Preis antippen zum Bestellen an der Werft. Bar oder über die Bank: 20&nbsp;% Anzahlung, 480 Monatsraten, zusammen 220&nbsp;% des Preises (SR&nbsp;29). Grau = nicht bezahlbar.</p>
      <div className="shop-counter">
        <YardTable title="Standardentwürfe" rows={ship.yard.filter((d) => !d.smallCraft)} funds={ship.funds} onBuy={onBuy} />
        <YardTable title="Small Craft" rows={ship.yard.filter((d) => d.smallCraft)} funds={ship.funds} onBuy={onBuy} />
      </div>
      <p className="shop-hint muted">Ein Small Craft wird mit Schiff dessen Beiboot und liegt im Laderaum (so viele Tonnen wie sein Rumpf); ohne Schiff gehört es euch allein. Auch bei der Abmusterung gibt es ein Schiff: der Ship-Vorteil der Laufbahn (Scout/Courier schuldenfrei, Subsidized Merchant mit Kreditschuld).</p>
    </DetailPage>
  );
}

/** Bestellung an der Werft: bar oder mit Bankfinanzierung, die Zahlungen vorausgerechnet. */
function BuySheet({ ship, design, method, onMethod, onBack, onBuy, onClose }: { ship: ShipView; design: ShipYardRow; method: 'cash' | 'bank'; onMethod: (m: 'cash' | 'bank') => void; onBack: () => void; onBuy: () => void; onClose: () => void }) {
  const cash = ship.funds >= design.price;
  const canPay = method === 'cash' ? cash : ship.funds >= design.down;
  const monthly = Math.round((design.price * 2) / 480);
  return (
    <DetailPage
      title={design.smallCraft ? `${design.name} kaufen` : `${design.name} (${design.code}) kaufen`}
      aside={design.smallCraft ? `${design.hull} t · ${design.maneuver}G · ${design.becomes}` : `${design.hull} t · Jump-${design.jump} · ${design.maneuver}G`}
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
            <dd>{design.months === 0 ? 'keine Angabe' : `${design.months} Monate`}</dd>
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
    </DetailPage>
  );
}

/** Bearbeiten des Schiffsbogens: Name, Treibstoff und Fracht in ganzen Tonnen. */
function EditSheet({ boat, onClose }: { boat: Boat; onClose: () => void }) {
  const game = useGame();
  const [name, setName] = useState(boat.name);
  const [fuel, setFuel] = useState(String(boat.fuel));
  const tons = (value: string, max: number) => /^\d+$/.test(value.trim()) && Number(value) <= max;
  const valid = name.trim() !== '' && tons(fuel, boat.fuelMax);
  // Ausblenden erst beim zweiten Tippen, wie Löschen sonst auch (Owner, 22. November 2026).
  const [retiring, setRetiring] = useState(false);
  return (
    <DetailPage
      title="Schiff bearbeiten"
      aside={`${boat.designName} (${boat.designCode})`}
      onClose={onClose}
      foot={
        <>
          <button
            type="button"
            className="action soft danger"
            disabled={boat.retireBlocker !== undefined}
            title={boat.retireBlocker}
            onClick={() => {
              if (!retiring) return setRetiring(true);
              haptic('pick');
              game.retireShip();
              onClose();
            }}
          >
            {retiring ? 'Wirklich ausblenden?' : 'Ausblenden'}
          </button>
          <button
            type="button"
            className="action gold"
            disabled={!valid}
            onClick={() => {
              haptic('pick');
              game.editShip({ name: name.trim(), fuel: Number(fuel) });
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
      <p className="shop-hint muted">Fracht und Fahrgäste kommen über den Handel an Bord: Markt in einer Stadt, Fracht, Passagiere und Post an einer Welt im Subsektor.</p>
      <dl className="profile">
        {boat.initialLoan !== undefined && (
          <div>
            <dt>Kredit</dt>
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
          <dt>Grundpreis</dt>
          <dd>{mcr(boat.basePrice)}</dd>
        </div>
        <div>
          <dt>Preis (gezahlt)</dt>
          <dd>{credits(boat.price)}</dd>
        </div>
      </dl>
      {boat.loanBalance !== undefined && <p className="shop-hint muted">Die Bank hebt die Monatsrate automatisch ein, wenn sie fällig ist; ohne Deckung bleibt die Rate als Hinweis in der Kasse stehen.</p>}
      {boat.craft.length > 0 && (
        <>
          <h2 className="section-title">Beiboote</h2>
          <div className="shop-table" role="table" aria-label="Beiboote">
            {boat.craft.map((c) => (
              <div key={c.name} className="shop-row soft-row" role="row">
                <span role="cell" className="shop-name">
                  <span className="shop-label">{c.name}</span>
                  <span className="shop-meta">{c.design}</span>
                </span>
                <span role="cell" className="shop-num soft-kind muted">
                  {c.where}
                </span>
              </div>
            ))}
          </div>
          <p className="shop-hint muted">Im Systemflug aussetzen und wieder andocken; mit einem Beiboot landet die Gruppe, während das Schiff in der Umlaufbahn bleibt, oder reist damit im System. Gesprungen wird nur mit allen Beibooten an Bord.</p>
        </>
      )}
      <p className="shop-hint muted">
        Ausblenden (für die Spielleitung): {boat.name}
        {boat.craft.length > 0 ? ' und seine Beiboote verschwinden' : ' verschwindet'} aus dem Bereich Schiff, gelöscht wird nichts – Buchungen und Log zeigen {boat.craft.length > 0 ? 'sie' : 'es'} weiter. Raten fallen keine mehr an. Danach lässt sich ein neues Schiff oder ein eigenständiges Small Craft kaufen.
      </p>
      {boat.retireBlocker && <p className="combat-hint">Ausblenden: {boat.retireBlocker}</p>}
    </DetailPage>
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
    <DetailPage
      title="Treibstoff kaufen"
      aside={`Cr ${ship.fuelPrice} / t · raffiniert`}
      onClose={onClose}
      foot={
        <>
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
    </DetailPage>
  );
}

/** Umbenennen über das Stift-Symbol am Namen. */
function RenameSheet({ boat, onClose }: { boat: Boat; onClose: () => void }) {
  const game = useGame();
  const [name, setName] = useState(boat.name);
  return (
    <DetailPage
      title="Schiff umbenennen"
      onClose={onClose}
      foot={
        <>
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
    </DetailPage>
  );
}

/** Einen hinterlegten Deckplan groß ansehen; hier lässt er sich auch entfernen. */
function DeckSheet({ name, image, onClose }: { name: string; image: string; onClose: () => void }) {
  const game = useGame();
  // Erst der zweite Tipper löscht, wie im Bereich Schiff und in der Kampagnenwahl.
  const [confirming, setConfirming] = useState(false);
  return (
    <DetailPage
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
    </DetailPage>
  );
}
