import type { Campaign } from './campaign';
import type { CareerRoll, ShipChoice } from './career';
import { DomainError } from './errors';
import type { Clock, Random } from './ports';
import { gainOf, shipDesignOf, type Gain } from './reference';
import { bookShip } from './shop';
import { MONTH_DAYS, nextMonthStart } from './time';
import type { Place } from './place';
import type { ShipDamage } from './space-combat';

/** Ein Turret auf einem Hardpoint (Domänenmodell: `Turret`, 2026-11-21c): Turmart und Waffen, höchstens so viele wie Plätze. */
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
  /** Davon unraffiniert, aus einem Gasriesen geschöpft (2026-11-21b); höchstens `fuel`. */
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
  /** Die Turrets in der Reihenfolge der Hardpoints (2026-11-21c). */
  readonly turrets: readonly Turret[];
  /** Schaden aus dem Raumkampf, bis zur Reparatur (2026-11-21d); fehlt ohne Schaden. */
  readonly damage?: ShipDamage;
  /** Wo es steht (2026-11-21): Welt, Feld oder Stadt; fehlt, solange es bei der Gruppe ist (alte Stände, gerade gekauft). */
  readonly place?: Place;
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

/** `/ship`: das nicht ausgeblendete Schiff, wie `focus` beim Charakter. */
export function shipOf(campaign: Campaign): Ship | undefined {
  return campaign.ships.find((s) => !s.retired);
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

function nextShipId(campaign: Campaign): string {
  const numbers = campaign.ships.map((s) => Number(s.id.slice(1))).filter((n) => Number.isInteger(n) && n > 0);
  return `s${Math.max(0, ...numbers) + 1}`;
}

/**
 * Standard-Bordsoftware eines neuen Schiffs (Hausregel, 16. November 2026): die Pflichtprogramme
 * des Flugs – Maneuver und Jump je Sprungzahl des Entwurfs – dazu Navigation, Flugplan,
 * Anti-Hijack und Bibliothek.
 */
export function standardSoftware(design: string): readonly ShipSoftware[] {
  const jump = shipDesignOf(design).jump;
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

/**
 * Ein Schiff kommt hinzu, das bisher aktive wird ausgeblendet. `initialLoan` ist die Kreditsumme
 * beim Abschluss – ohne bleibt es schuldenfrei; mit Kredit ist die erste Rate an einem Monatsende
 * frühestens vier Wochen später fällig. Das neue Schiff liegt von heute an im Hafen.
 */
export function addShip(campaign: Campaign, design: string, initialLoan: number | undefined): { campaign: Campaign; ship: Ship } {
  const plan = shipDesignOf(design);
  const ship: Ship = {
    id: nextShipId(campaign),
    design: plan.id,
    name: plan.name,
    fuel: plan.fuel,
    unrefined: 0,
    cargo: 0,
    price: plan.basePrice,
    ...(initialLoan === undefined ? {} : { initialLoan, loanBalance: initialLoan, nextPaymentDay: firstPaymentDay(campaign.day) }),
    berthedSince: campaign.day,
    retired: false,
    software: standardSoftware(plan.id),
    // Ab Werft mit den Turrets des Entwurfs; sie stecken im Grundpreis (2026-11-21c).
    turrets: plan.turrets.map((t) => ({ type: t.type, weapons: [...t.weapons] })),
  };
  return { campaign: { ...campaign, ships: [...campaign.ships.map((s) => (s.retired ? s : { ...s, retired: true })), ship] }, ship };
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
  return Math.round(plan.fuel / plan.jump);
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

export function validShipInput(design: string, input: ShipInput): ShipInput {
  const name = input.name.trim();
  if (name === '') throw new DomainError('Ein Schiff braucht einen Namen.');
  const plan = shipDesignOf(design);
  for (const [value, what] of [
    [input.fuel, 'Der Treibstoff'],
    [input.cargo, 'Die Fracht'],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) throw new DomainError(`${what} ist eine Zahl ganzer Tonnen ab 0.`);
  }
  if (input.fuel > plan.fuel) throw new DomainError(`Der Tank fasst ${plan.fuel} t.`);
  if (input.cargo > plan.cargo) throw new DomainError(`Der Laderaum fasst ${plan.cargo} t.`);
  return { name, fuel: input.fuel, cargo: input.cargo };
}

/** Bearbeiten des Schiffsbogens: Name, Treibstoff und Fracht von Hand korrigieren. */
export function updateShip(campaign: Campaign, id: string, input: ShipInput): Campaign {
  const ship = shipById(campaign, id);
  const valid = validShipInput(ship.design, input);
  // Unraffinierter Treibstoff ist ein Teil des Tankinhalts (2026-11-21b).
  return { ...campaign, ships: campaign.ships.map((s) => (s.id === id ? { ...s, ...valid, unrefined: Math.min(s.unrefined, valid.fuel) } : s)) };
}

/** Umbenennen über das Stift-Symbol am Namen. */
export function renameShip(campaign: Campaign, id: string, name: string): Campaign {
  const ship = shipById(campaign, id);
  return updateShip(campaign, id, { name, fuel: ship.fuel, cargo: ship.cargo });
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
