import type { Campaign } from './campaign';
import type { CareerRoll, ShipChoice } from './career';
import { DomainError } from './errors';
import type { Clock, Random } from './ports';
import { gainOf, shipDesignOf, type Gain } from './reference';
import { bookShip } from './shop';
import { MONTH_DAYS, nextMonthStart } from './time';
import type { Place } from './place';
import type { ShipDamage } from './space-combat';

/** Ein Turret auf einem Hardpoint (Domänenmodell: `Turret`, 2026-11-21g): Turmart und Waffen, höchstens so viele wie Plätze. */
export interface Turret {
  readonly type: string;
  readonly weapons: readonly string[];
}

/** Was ein konkretes Schiff an Bord hat (Domänenmodell: `ShipSoftware`): ein Verweis auf das Programm. */
export interface ShipSoftware {
  readonly program: string;
}

/**
 * Ein Schiff der Kampagne (Domänenmodell: `Ship`). `price` ist der tatsächlich gezahlte Preis,
 * getrennt vom `basePrice` des Entwurfs. Mit Bankfinanzierung oder Merchant-Vorteil kommen Kreditsumme
 * (`initialLoan`, beim Abschluss fest), Restschuld (`loanBalance`) und Fälligkeit (`nextPaymentDay`)
 * dazu; ist die Restschuld bezahlt, entfallen beide bis auf die Kreditsumme als Erinnerung.
 * `berthedSince` ist der Tag, an dem es in den Hafen kam, in dem es liegt (2026-11-17b).
 */
export interface Ship {
  readonly id: string;
  /** Der Standardentwurf in den Referenzdaten. */
  readonly design: string;
  readonly name: string;
  /** Treibstoff im Tank, in Tonnen. */
  readonly fuel: number;
  /** Davon unraffiniert, aus einem Gasriesen geschöpft (2026-11-21f); höchstens `fuel`. */
  readonly unrefined: number;
  /** Fracht im Laderaum, in Tonnen. */
  readonly cargo: number;
  readonly price: number;
  readonly initialLoan?: number;
  readonly loanBalance?: number;
  /** Das Monatsende, an dem die nächste Rate fällig ist. */
  readonly nextPaymentDay?: number;
  /** Seit welchem Tag es im Hafen liegt; Grundlage der Liegegebühr. Fehlt in Ständen von vorher. */
  readonly berthedSince?: number;
  /** Ausgeblendet statt gelöscht: Buchungen und Log zeigen weiter auf es. */
  readonly retired: boolean;
  readonly software: readonly ShipSoftware[];
  /** Die Turrets in der Reihenfolge der Hardpoints (2026-11-21g). */
  readonly turrets: readonly Turret[];
  /** Schaden aus dem Raumkampf, bis zur Reparatur (2026-11-21h); fehlt ohne Schaden. */
  readonly damage?: ShipDamage;
  /** Wo es steht (2026-11-21): Welt, Feld oder Stadt; fehlt, solange es bei der Gruppe ist (alte Stände, gerade gekauft) oder an Bord. */
  readonly place?: Place;
  /** Das Mutterschiff eines Small Craft (2026-11-21b), seine Id. */
  readonly mother?: string;
  /** Liegt im Hangar seines Mutterschiffs (2026-11-21b); gespeichert nur, wenn wahr. */
  readonly aboard?: boolean;
  /** Kreist um die Welt seines Orts, statt auf ihr zu stehen (2026-11-21b); gespeichert nur, wenn wahr. */
  readonly inOrbit?: boolean;
  /** Ein zugekauftes Beiboot liegt im Laderaum seines Mutterschiffs statt im Hangar (2026-11-21c); gespeichert nur, wenn wahr. */
  readonly inHold?: boolean;
}

/**
 * Ein Deckplan (Domänenmodell: `DeckPlan`): über Kampagnen hinweg gehalten, je Entwurf bis zu drei,
 * mit OneDrive abgeglichen (2026-11-17), aber nie in einer Kampagnendatei. `image` ist das Bild als
 * Data URL. Ein Plan ändert sich nie; ein neues Bild ist ein neuer Plan mit neuem `key`.
 */
export interface DeckPlan {
  /** Woran der Abgleich das Bild auf jedem Gerät wiedererkennt; zufällig, weltweit eindeutig. */
  readonly key: string;
  readonly design: string;
  readonly name: string;
  /** Das PNG als Data URL. */
  readonly image: string;
}

/** Die Plätze je Entwurf: „Deck A“ ist der erste freie. */
export const deckSlotNames = ['Deck A', 'Deck B', 'Deck C'] as const;
/** Cr je Tonne raffinierten Treibstoff (SR 30). */
export const FUEL_PRICE = 500;
/** Monatsraten, bis die Kreditsumme bezahlt ist (SR 29: 40 Jahre). */
export const LOAN_MONTHS = 480;
/** Anzahlung bei Bankfinanzierung, als Anteil des Preises (SR 29). */
const DOWN_PAYMENT = 0.2;

/** `/ship`: das nicht ausgeblendete Schiff ohne Mutterschiff, wie `focus` beim Charakter (2026-11-21b). */
export function shipOf(campaign: Campaign): Ship | undefined {
  return campaign.ships.find((s) => !s.retired && s.mother === undefined);
}

/** Ist der Entwurf des Schiffs ein Small Craft? */
export function isSmallCraft(ship: Ship): boolean {
  return shipDesignOf(ship.design).kind === 'smallCraft';
}

/** Die nicht ausgeblendeten Beiboote eines Schiffs, in der Reihenfolge der Kampagne. */
export function craftOf(campaign: Campaign, mother: string): readonly Ship[] {
  return campaign.ships.filter((s) => !s.retired && s.mother === mother);
}

/** Alle eigenen Schiffe und Small Craft, die nicht ausgeblendet sind: das aktive Schiff und seine Beiboote. */
export function vesselsOf(campaign: Campaign): readonly Ship[] {
  const ship = shipOf(campaign);
  return ship === undefined ? [] : [ship, ...craftOf(campaign, ship.id)];
}

/** Wo ein Schiff ist: an Bord dort, wo sein Mutterschiff ist; ohne eigenen Ort `undefined` (bei der Gruppe). */
export function whereIs(campaign: Campaign, ship: Ship): Ship | undefined {
  if (!ship.aboard || ship.mother === undefined) return ship;
  const mother = campaign.ships.find((s) => s.id === ship.mother);
  return mother === undefined ? undefined : whereIs(campaign, mother);
}

/** Ein Schiff mit neuen Werten, die übrigen bleiben. */
export function changeShip(campaign: Campaign, id: string, change: (ship: Ship) => Ship): Campaign {
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === id ? change(s) : s)) };
}

export function shipById(campaign: Campaign, id: string): Ship {
  const ship = campaign.ships.find((s) => s.id === id);
  if (ship === undefined) throw new DomainError(`Das Schiff ${id} gibt es nicht.`);
  return ship;
}

/** Das aktive Schiff; ohne sagt die Regel, dass die Gruppe keins hat. */
export function activeShip(campaign: Campaign): Ship {
  const ship = shipOf(campaign);
  if (ship === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  return ship;
}

function nextShipId(ships: readonly Ship[]): string {
  const numbers = ships.map((s) => Number(s.id.slice(1))).filter((n) => Number.isInteger(n) && n > 0);
  return `s${Math.max(0, ...numbers) + 1}`;
}

/**
 * Standard-Bordsoftware eines neuen Schiffs (Hausregel, 16. November 2026): die Pflichtprogramme
 * des Flugs – Maneuver und Jump je Sprungzahl des Entwurfs – dazu Navigation, Flugplan,
 * Anti-Hijack und Bibliothek.
 */
export function standardSoftware(design: string): readonly ShipSoftware[] {
  const plan = shipDesignOf(design);
  // Small Craft haben keinen Rechner und damit keine Programme (SE 13, 2026-11-21b).
  if (plan.computer === undefined) return [];
  const jump = plan.jump;
  return ['maneuver', `jump-${jump}`, 'navigation', 'generate', 'anti-hijack', 'library'].map((program) => ({ program }));
}

/** `/monthlyPayment`: ein Vierhundertachtzigstel der Kreditsumme (SR 29); ein schuldenfreies Schiff hat keine. */
export function monthlyPaymentOf(ship: Ship): number | undefined {
  return ship.initialLoan === undefined ? undefined : Math.round(ship.initialLoan / LOAN_MONTHS);
}

/** Die erste Rate: am ersten Monatsende, das mindestens vier Wochen nach dem Erwerb liegt (2026-11-17b). */
export function firstPaymentDay(day: number): number {
  return nextMonthStart(day + MONTH_DAYS - 1);
}

/** Aus einem Objekt die optionalen Felder entfernen, die null sind – gespeichert wird, was es gibt. */
export function without<T extends object>(value: T, ...keys: (keyof T)[]): T {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.some((k) => key === k))) as T;
}

/** Das Namensmuster der Beiboote eines neuen Schiffs: „Beiboot 1“, „Beiboot 2“ … (2026-11-21b). */
export const CRAFT_NAME = 'Beiboot';

/** Tonnen im Laderaum eines Schiffs, die zugekaufte Beiboote belegen: je Beiboot sein Rumpf (2026-11-21c). */
export function holdTonsOf(campaign: Campaign, ship: Ship): number {
  return craftOf(campaign, ship.id)
    .filter((c) => c.inHold)
    .reduce((sum, c) => sum + shipDesignOf(c.design).hull, 0);
}

/** Der freie Laderaum: Laderaum des Entwurfs minus Fracht minus die Rümpfe der Beiboote im Laderaum. */
export function freeCargoOf(campaign: Campaign, ship: Ship): number {
  return shipDesignOf(ship.design).cargo - ship.cargo - holdTonsOf(campaign, ship);
}

/** Der Name des nächsten Beiboots eines Schiffs: „Beiboot n“ mit der nächsten freien Nummer. */
function nextCraftName(ships: readonly Ship[], mother: string): string {
  const taken = new Set(ships.filter((s) => !s.retired && s.mother === mother).map((s) => s.name));
  let n = 1;
  while (taken.has(`${CRAFT_NAME} ${n}`)) n++;
  return `${CRAFT_NAME} ${n}`;
}

/** Warum ein Small Craft dieses Entwurfs nicht hinzukommen kann (zu groß für den Laderaum des aktiven Schiffs); `undefined`, wenn es kann. */
export function craftPurchaseBlocker(campaign: Campaign, design: string): string | undefined {
  const plan = shipDesignOf(design);
  const active = shipOf(campaign);
  if (plan.kind !== 'smallCraft' || active === undefined || isSmallCraft(active)) return undefined;
  const free = freeCargoOf(campaign, active);
  return plan.hull > free ? `${plan.name} braucht ${plan.hull} t im Laderaum; frei sind ${free.toLocaleString('de-DE')} t.` : undefined;
}

/**
 * Ein Schiff kommt hinzu, das bisher aktive wird samt seinen Beibooten ausgeblendet. `initialLoan` ist
 * die Kreditsumme beim Abschluss – ohne bleibt es schuldenfrei; mit Kredit ist die erste Rate an einem
 * Monatsende frühestens vier Wochen später fällig. Das neue Schiff liegt von heute an im Hafen. Für
 * jedes Beiboot seines Entwurfs kommt ein eigenes Schiff an Bord dazu, mit vollem Tank, Preis 0 (im
 * Grundpreis enthalten) und ohne Kredit (2026-11-21b).
 *
 * Ein Small Craft (2026-11-21c) wird mit Schiff dessen Beiboot im Laderaum, an Bord; ohne Schiff
 * gehört es der Gruppe eigenständig und ist ihr aktives Schiff. Ein eigenständiges Small Craft wird
 * beim nächsten Schiff dessen Beiboot im Laderaum, wenn sein Rumpf hineinpasst, sonst ausgeblendet.
 * ⚑ Kommt zu einem eigenständigen Small Craft ein weiteres Small Craft, ersetzt es das alte wie ein
 * Schiff (ein Small Craft trägt keine Beiboote).
 */
/** Die Turrets ab Werft (2026-11-21g); ein Small Craft kommt mit seiner Bewaffnung, meist Lasern (2026-11-22). */
export function designTurrets(design: string): Turret[] {
  return shipDesignOf(design).turrets.map((t) => ({ type: t.type, weapons: [...t.weapons] }));
}

/**
 * Die Turrets eines gespeicherten Schiffs: die gespeicherten, soweit es welche hat (2026-11-21g).
 * Spielstände von davor haben keine; vor 2026-11-22 war kein Small Craft bewaffnet, eines ohne
 * Turrets bekommt die seines Entwurfs – beide bekommen die des Entwurfs.
 */
export function storedTurrets(design: string, stored: readonly Turret[] | undefined): Turret[] {
  if (stored !== undefined && !(stored.length === 0 && shipDesignOf(design).kind === 'smallCraft')) return stored.map((t) => ({ type: t.type, weapons: [...t.weapons] }));
  return designTurrets(design);
}

export function addShip(campaign: Campaign, design: string, initialLoan: number | undefined): { campaign: Campaign; ship: Ship } {
  const plan = shipDesignOf(design);
  const active = shipOf(campaign);
  const small = plan.kind === 'smallCraft';
  const loan = initialLoan === undefined ? {} : { initialLoan, loanBalance: initialLoan, nextPaymentDay: firstPaymentDay(campaign.day) };
  if (small && active !== undefined && !isSmallCraft(active)) {
    const blocker = craftPurchaseBlocker(campaign, design);
    if (blocker) throw new DomainError(blocker);
    const boat: Ship = { id: nextShipId(campaign.ships), design: plan.id, name: nextCraftName(campaign.ships, active.id), fuel: plan.fuel, unrefined: 0, cargo: 0, price: plan.basePrice, ...loan, retired: false, software: [], turrets: designTurrets(plan.id), mother: active.id, aboard: true, inHold: true };
    return { campaign: { ...campaign, ships: [...campaign.ships, boat] }, ship: boat };
  }
  const ship: Ship = {
    id: nextShipId(campaign.ships),
    design: plan.id,
    name: plan.name,
    fuel: plan.fuel,
    unrefined: 0,
    cargo: 0,
    price: plan.basePrice,
    ...loan,
    berthedSince: campaign.day,
    retired: false,
    software: standardSoftware(plan.id),
    // Ab Werft mit den Turrets des Entwurfs; sie stecken im Grundpreis (2026-11-21g), bei Small Craft mit Lasern (2026-11-22).
    turrets: designTurrets(plan.id),
  };
  // Ein eigenständiges Small Craft wird Beiboot im Laderaum des neuen Schiffs, wenn es hineinpasst.
  const keep = !small && active !== undefined && isSmallCraft(active) && shipDesignOf(active.design).hull <= plan.cargo ? active : undefined;
  const ships: Ship[] = [
    ...campaign.ships.map((s): Ship => {
      if (s.id === keep?.id) return s.place === undefined ? { ...s, mother: ship.id, aboard: true, inHold: true } : { ...s, mother: ship.id, inHold: true };
      return s.retired ? s : { ...s, retired: true };
    }),
    ship,
  ];
  plan.craft.forEach((craft) => {
    const boat = shipDesignOf(craft);
    ships.push({ id: nextShipId(ships), design: boat.id, name: nextCraftName(ships, ship.id), fuel: boat.fuel, unrefined: 0, cargo: 0, price: 0, retired: false, software: [], turrets: designTurrets(boat.id), mother: ship.id, aboard: true });
  });
  return { campaign: { ...campaign, ships }, ship };
}

/**
 * Kauf in der Werft: bar der volle Preis, bei der Bank 20 % Anzahlung und die doppelte Preissumme
 * als Kreditsumme (SR 29, zusammen 220 %). Ein vorhandenes Schiff wird ausgeblendet, nicht
 * verkauft – einen Verkaufserlös gibt es hier nicht.
 */
export function buyShip(campaign: Campaign, design: string, method: 'cash' | 'bank', clock: Clock): Campaign {
  const plan = shipDesignOf(design);
  const down = method === 'bank' ? Math.round(plan.basePrice * DOWN_PAYMENT) : plan.basePrice;
  const added = addShip(campaign, design, method === 'bank' ? plan.basePrice * 2 : undefined);
  return bookShip(added.campaign, -down, added.ship.id, 'price', clock);
}

/** Der freie Tankraum in Tonnen. */
export function freeTankOf(ship: Ship): number {
  return shipDesignOf(ship.design).fuel - ship.fuel;
}

/**
 * Treibstoff je Sprung, in Tonnen (`ShipDesign./jumpFuel`, Hausregel 16. November 2026):
 * Tankinhalt durch Sprungzahl, gerundet – die SR-30-Formel braucht Energiewerks-Ratings,
 * die die Referenzdaten nicht haben. Ein voller Tank reicht damit genau für so viele
 * Sprünge, wie der Entwurf Sprung kann.
 */
export function jumpFuelOf(design: string): number {
  const plan = shipDesignOf(design);
  // Small Craft springen nicht (2026-11-21b).
  return plan.jump === 0 ? 0 : Math.round(plan.fuel / plan.jump);
}

/** Volltanken bzw. auffüllen: Cr 500 je Tonne raffinierten Treibstoff (SR 30), höchstens bis der Tank voll ist. */
export function buyFuel(campaign: Campaign, tons: number, clock: Clock): Campaign {
  const ship = activeShip(campaign);
  if (!Number.isInteger(tons) || tons < 1) throw new DomainError('Getankt wird in ganzen Tonnen ab 1 t.');
  const free = freeTankOf(ship);
  if (tons > free) throw new DomainError(`Der Tank fasst noch ${free} t.`);
  const booked = bookShip(campaign, -tons * FUEL_PRICE, ship.id, 'fuel', clock);
  return { ...booked, ships: booked.ships.map((s) => (s.id === ship.id ? { ...s, fuel: s.fuel + tons } : s)) };
}

/** Was auf dem Schiffsbogen steht: Name, Treibstoff und Fracht in Tonnen. */
export interface ShipInput {
  readonly name: string;
  readonly fuel: number;
  readonly cargo: number;
}

export function validShipInput(design: string, input: ShipInput, holdTons = 0): ShipInput {
  const name = input.name.trim();
  if (name === '') throw new DomainError('Ein Schiff braucht einen Namen.');
  const plan = shipDesignOf(design);
  // Small Craft haben Tanks und Exzess-Tonnage mit Bruchteilen (Ship's Boat 1,8 t), Schiffe ganze Tonnen.
  const small = plan.kind === 'smallCraft';
  for (const [value, what] of [
    [input.fuel, 'Der Treibstoff'],
    [input.cargo, 'Die Fracht'],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || (!small && !Number.isInteger(value))) throw new DomainError(small ? `${what} ist eine Zahl ab 0.` : `${what} ist eine Zahl ganzer Tonnen ab 0.`);
  }
  if (input.fuel > plan.fuel) throw new DomainError(`Der Tank fasst ${plan.fuel} t.`);
  // Zugekaufte Beiboote belegen einen Teil des Laderaums (2026-11-21c).
  if (input.cargo > plan.cargo - holdTons) throw new DomainError(holdTons > 0 ? `Der Laderaum fasst neben den Beibooten noch ${(plan.cargo - holdTons).toLocaleString('de-DE')} t.` : `Der Laderaum fasst ${plan.cargo} t.`);
  return { name, fuel: input.fuel, cargo: input.cargo };
}

/** Bearbeiten des Schiffsbogens: Name, Treibstoff und Fracht von Hand korrigieren. */
export function updateShip(campaign: Campaign, id: string, input: ShipInput): Campaign {
  const ship = shipById(campaign, id);
  const valid = validShipInput(ship.design, input, holdTonsOf(campaign, ship));
  // Unraffinierter Treibstoff ist ein Teil des Tankinhalts (2026-11-21f).
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === id ? { ...s, ...valid, unrefined: Math.min(s.unrefined, valid.fuel) } : s)) };
}

/** Umbenennen über das Stift-Symbol am Namen. */
export function renameShip(campaign: Campaign, id: string, name: string): Campaign {
  const ship = shipById(campaign, id);
  return updateShip(campaign, id, { name, fuel: ship.fuel, cargo: ship.cargo });
}

/** Warum das aktive Schiff jetzt nicht ausgeblendet werden kann; `undefined`, wenn es geht. */
export function retireShipBlocker(campaign: Campaign): string | undefined {
  if (shipOf(campaign) === undefined) return 'Die Gruppe hat kein Schiff.';
  if (campaign.flight !== undefined) return 'Während eines Systemflugs wird kein Schiff ausgeblendet.';
  return undefined;
}

/**
 * Blendet das aktive Schiff von Hand aus (Owner, 22. November 2026: die Spielleitung, etwa um danach
 * ein eigenständiges Small Craft zu kaufen). Nichts wird gelöscht: Das Schiff und seine Beiboote
 * bekommen `retired`, Buchungen und Log zeigen sie weiter; Raten zahlt ein ausgeblendetes Schiff nicht.
 */
export function retireShip(campaign: Campaign): Campaign {
  const blocker = retireShipBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const ship = activeShip(campaign);
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === ship.id || s.mother === ship.id ? { ...s, retired: true } : s)) };
}

/** Der noch nicht entschiedene Ship-Vorteil: Entwurf und ob er schuldenfrei wäre. */
export interface PendingShipGain {
  readonly design: string;
  readonly debtFree: boolean;
}

/** Was ein Vorteile-Wurf an Schiff vorgibt, wenn er eins gibt: Zeile mit `ship`, sonst keine. */
function shipGainRow(roll: CareerRoll): Gain | undefined {
  return roll.kind === 'benefit' && roll.gained !== undefined ? gainOf(roll.gained) : undefined;
}

/**
 * Der Ship-Vorteil der laufenden Erschaffung, dessen Wirkung noch offen ist: der letzte
 * Vorteile-Wurf mit Schiff, für den `shipChoice` fehlt und bei dem die Gruppe schon ein Schiff
 * eines anderen Entwurfs hat. Ohne aktives Schiff oder bei demselben Entwurf wirkt der Vorteil
 * sofort (siehe `applyShipGain`) und ist nie offen.
 */
export function pendingShipGain(campaign: Campaign): PendingShipGain | undefined {
  const rolls = campaign.generation?.career.rolls ?? [];
  for (const roll of [...rolls].reverse()) {
    const gain = shipGainRow(roll);
    if (gain?.ship === undefined) continue;
    if (roll.shipChoice !== undefined) return undefined;
    const active = shipOf(campaign);
    if (active === undefined || active.design === gain.ship) return undefined;
    return { design: gain.ship, debtFree: gain.shipDebtFree === true };
  }
  return undefined;
}

/**
 * Der Ship-Vorteil, soweit er sofort wirkt: ohne Schiff der Gruppe legt er es an – beim Scout
 * schuldenfrei, beim Merchant mit dem vollen Preis als Kredit (SR, Mustering-out Benefits).
 * Derselbe Entwurf zahlt die Restschuld auf 0, die Kreditsumme bleibt stehen. Für einen
 * anderen Entwurf tut er nichts – die Wahl trifft `chooseShipGain` (offen bleibt sie über
 * `pendingShipGain`), bei `random` entscheidet sie der Zufall.
 */
export function gainShip(campaign: Campaign, design: string, debtFree: boolean, random?: Random): Campaign {
  const active = shipOf(campaign);
  if (active === undefined) return addShip(campaign, design, debtFree ? undefined : shipDesignOf(design).basePrice).campaign;
  if (active.design === design) return active.loanBalance === undefined ? campaign : { ...campaign, ships: campaign.ships.map((s) => (s.id === active.id ? without(s, 'loanBalance', 'nextPaymentDay') : s)) };
  if (random === undefined) return campaign;
  return chooseShipGain(campaign, random.int(0, 1) === 0 ? 'keep' : 'switch');
}

/**
 * Lässt die Ship-Vorteile der laufenden Erschaffung wirken, soweit sie sofort wirken: ohne Schiff
 * legt er es an, derselbe Entwurf zahlt die Restschuld ab. Für einen andern Entwurf bleibt die Wahl
 * offen – die trifft `chooseShipGain` (im Schritt-für-Schritt-Ablauf) oder der Zufall (`runGeneration`).
 */
export function resolveShipGains(campaign: Campaign): Campaign {
  let after = campaign;
  for (const roll of campaign.generation?.career.rolls ?? []) {
    const gain = shipGainRow(roll);
    if (gain?.ship === undefined || roll.shipChoice !== undefined) continue;
    const active = shipOf(after);
    if (active !== undefined && active.design !== gain.ship) continue;
    after = gainShip(after, gain.ship, gain.shipDebtFree === true);
  }
  return after;
}

/**
 * Die Wahl zum noch offenen Ship-Vorteil: **behalten** lässt den Vorteil wirkungslos im
 * Lebenslauf stehen, **wechseln** blendet das alte Schiff samt Restschuld aus und legt das neue an.
 * In beiden Fällen steht die Wahl am Wurf.
 */
export function chooseShipGain(campaign: Campaign, choice: ShipChoice): Campaign {
  const pending = pendingShipGain(campaign);
  if (pending === undefined || campaign.generation === undefined) throw new DomainError('Es ist kein Schiff zu wählen.');
  const rolls = [...campaign.generation.career.rolls].reverse();
  const at = rolls.findIndex((roll) => shipGainRow(roll)?.ship !== undefined && roll.shipChoice === undefined);
  if (at < 0) throw new DomainError('Es ist kein Schiff zu wählen.');
  const index = campaign.generation.career.rolls.length - 1 - at;
  const rollsWithChoice = campaign.generation.career.rolls.map((roll, i) => (i === index ? { ...roll, shipChoice: choice } : roll));
  const career = { ...campaign.generation.career, rolls: rollsWithChoice };
  const chosen: Campaign = { ...campaign, generation: { ...campaign.generation, career } };
  return choice === 'switch' ? addShip(chosen, pending.design, pending.debtFree ? undefined : shipDesignOf(pending.design).basePrice).campaign : chosen;
}

/**
 * Der freie Deckplan-Platz eines Entwurfs für ein neues Bild: „Deck A“, sonst „Deck B“, sonst „Deck C“.
 * Liegen schon drei Pläne da (über den Abgleich auch auf Deck D …), geht keiner mehr dazu.
 */
export function freeDeckSlot(plans: readonly DeckPlan[]): string {
  const slot = plans.length < deckSlotNames.length ? deckSlotNames.find((name) => !plans.some((p) => p.name === name)) : undefined;
  if (slot === undefined) throw new DomainError(`Mehr als ${deckSlotNames.length} Deckpläne je Entwurf gehen nicht.`);
  return slot;
}

/**
 * Der nächste Platz, den keiner der genannten belegt: Deck A, B, C und danach, nur über den Abgleich
 * („beide behalten“), Deck D, Deck E … bis Deck Z.
 */
export function nextDeckSlot(taken: readonly string[]): string {
  for (let i = 0; i < 26; i++) {
    const name = `Deck ${String.fromCharCode(65 + i)}`;
    if (!taken.includes(name)) return name;
  }
  throw new DomainError('Alle Deckplan-Plätze dieses Entwurfs sind belegt.');
}

/** Ein Deckplan-Platz: „Deck A“ bis „Deck Z“. */
export const deckSlotPattern = /^Deck [A-Z]$/;
