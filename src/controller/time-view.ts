import {
  canSetStartDate,
  checkKinds,
  checkNames,
  checkOf,
  checksLabel,
  checksMet,
  dateLabel,
  dateParts,
  dayOf,
  daysToSunday,
  encounterChecks,
  hasPolice,
  itemOf,
  journeyBlocker,
  journeyCost,
  JOURNEY_DAYS,
  jumpFuelOf,
  lawHere,
  legalReaction,
  locationOf,
  lotteryPaid,
  LOW_PASSAGE,
  MAX_DAYS,
  misjumpOf,
  missingChecks,
  parsecs,
  passages,
  potOf,
  reactionText,
  reviveDm,
  shipJourneyBlocker,
  shipDesignOf,
  shipOf,
  survived,
  ticketsOf,
  travellersOf,
  winnerOf,
  fundsOf,
  hexById,
  REVIVE_TARGET,
  type Campaign,
  type CheckKind,
  type CheckRoll,
  type Journey,
  type PassageId,
  type TimePassed,
  costsOf,
  lifeSupportOf,
  monthOf,
  type MonthEnd,
  type ShipCost,
  worldById,
  hexIdOfWorld,
  mainOf,
  systemDistance,
  journeyDays,
  type SystemJourney,
  type Skimming,
  type SpaceBattle,
  type SpaceAttack,
  type SpaceBattleEnd,
  type HitZone,
  type Intent,
  type BattleOutcome,
  HIT_TARGET,
  dmPartsOf,
  type SpaceDmPart,
  shipWeaponOf,
  flightHours,
  systemJourneyBlocker,
  TICKET_RATE,
  TICKET_G,
  type SystemJourneyMode,
  worldOf,
  journeyCraft,
} from '../model';

/** Ein Test im Log: Art, Würfel, Zielwert, ob bestanden; bei der Polizei dazu die Reaktion. */
export interface CheckItem {
  readonly kind: 'check';
  readonly at: string;
  readonly check: CheckKind;
  readonly name: string;
  readonly dice: readonly number[];
  readonly total: number;
  readonly target: number;
  readonly passed: boolean;
  /** Was der Test heißt, z. B. „heute keine Begegnung“ oder „die Polizei hält die Gruppe an“. */
  readonly text: string;
  readonly reactionDice: readonly [number, number] | undefined;
  readonly reactionDm: number | undefined;
  readonly reaction: number | undefined;
  readonly reactionText: string | undefined;
}

/** Vergangene Zeit im Log: von wann bis wann. */
export interface TimeItem {
  readonly kind: 'time';
  readonly at: string;
  readonly days: number;
  readonly week: boolean;
  readonly from: string;
  readonly to: string;
}

/** Eine Koje im Kälteschlaf, wie der Log sie zeigt. */
export interface BerthItem {
  /** Fehlt bei einem NSC. */
  readonly name: string | undefined;
  readonly dice: readonly [number, number];
  readonly dm: number;
  readonly total: number;
  readonly survived: boolean;
  readonly guess: number;
  readonly winner: boolean;
}

/** Eine Reise im Log. */
export interface JourneyItem {
  readonly kind: 'journey';
  readonly at: string;
  readonly index: number;
  readonly from: string;
  readonly to: string;
  readonly fromDate: string;
  readonly toDate: string;
  readonly passengers: readonly { readonly name: string; readonly passage: string }[];
  readonly berths: readonly BerthItem[];
  readonly survivors: number;
  readonly pot: number;
  /** Wer die Lotterie gewann: Name, „ein NSC“, oder fehlt ohne Lotterie. */
  readonly winner: string | undefined;
  /** Ob der Gewinner überlebte und der Topf ausgezahlt wurde. */
  readonly paid: boolean;
  /** Ob ein Los über den Gewinner entschied. */
  readonly lot: boolean;
  readonly reviveTarget: number;
  /** Name des Schiffs bei einer Reise mit eigenem Schiff; fehlt bei der Passage. */
  readonly ship: string | undefined;
  /** Der Sprungwurf (2W6) bei einer Reise mit eigenem Schiff. */
  readonly jump: readonly number[] | undefined;
  /** Der DM des Sprungwurfs: +1 mit unraffiniertem Treibstoff (2026-11-21f). */
  readonly jumpDm: number;
  /** Ob der Sprungwurf ein Fehlsprung ist (13+). */
  readonly misjump: boolean;
}

/** Treibstoff am Gasriesen geschöpft, im Log (2026-11-21f). */
export interface SkimmingItem {
  readonly kind: 'skimming';
  readonly at: string;
  readonly giant: string;
  readonly ship: string;
  readonly tons: number;
}

/** Trefferzonen, Absichten und Ausgänge des Raumkampfs, wie Log und Blatt sie schreiben (2026-11-21h). */
export const hitZoneNames: Record<HitZone, string> = {
  powerPlant: 'Power Plant',
  maneuver: 'Maneuver Drive',
  jump: 'Jump Drive',
  fuel: 'Treibstoff',
  hull: 'Rumpf',
  hold: 'Laderaum',
  computer: 'Computer',
  turret: 'Turret',
  criticalPowerPlant: 'Power Plant zerstört',
  criticalManeuver: 'Maneuver Drive zerstört',
  criticalJump: 'Jump Drive zerstört',
  crew: 'Crew handlungsunfähig',
  criticalComputer: 'Computer zerstört',
  explode: 'Explosion',
  drive: 'Drive',
  cabin: 'Kabine',
  weapons: 'Bewaffnung',
  criticalDrive: 'Drive zerstört',
};
export const intentNames: Record<Intent, string> = { attack: 'greift an', flee: 'flieht', ignore: 'beachtet die Gruppe nicht' };
export const outcomeNames: Record<BattleOutcome, string> = { destroyed: 'zerstört', disabled: 'kampfunfähig', escaped: 'entkommen', broken: 'abgebrochen', lost: 'eigenes Schiff verloren' };

/** Ein fremdes Schiff taucht auf, im Log (2026-11-21h). */
export interface SpaceBattleItem {
  readonly kind: 'spaceBattle';
  readonly at: string;
  readonly foe: string;
  readonly design: string;
  readonly intent: string;
  readonly encounter: readonly number[] | undefined;
  readonly reaction: readonly number[] | undefined;
  readonly attack: readonly number[] | undefined;
}

/** Ein Laserschuss im Log (2026-11-21h). */
export interface SpaceAttackItem {
  readonly kind: 'spaceAttack';
  readonly at: string;
  readonly round: number;
  readonly attacker: string;
  readonly target: string;
  readonly turret: number;
  readonly weapon: string;
  readonly dice: readonly number[];
  readonly dm: number;
  /** Woraus der DM kommt, z. B. „Entfernung 31 RB (über 25)“ −2 (2026-11-21i); leer ohne DM. */
  readonly parts: readonly DmLine[];
  /** Was auf 2W6 nötig war: 8 − DM. */
  readonly need: number;
  readonly total: number;
  readonly hit: boolean;
  readonly hits: readonly string[];
}

/** Ein DM mit seinem Grund, wie Blatt, Würfe und Log ihn schreiben. */
export interface DmLine {
  readonly label: string;
  readonly dm: number;
}

/** Die DMs eines Laserschusses mit ihren Gründen (2026-11-21i). */
export function dmLines(parts: readonly SpaceDmPart[], bands: number, computerHits: number): readonly DmLine[] {
  return parts.map((p) => ({
    label: p.reason === 'range' ? `Entfernung ${bands} RB (über ${bands > 50 ? 50 : 25})` : p.reason === 'pulse' ? 'Pulse Laser' : p.reason === 'noComputer' ? 'ohne Computer' : `Computer-Treffer${computerHits > 1 ? ` ×${computerHits}` : ''}`,
    dm: p.dm,
  }));
}

/** Das Ende eines Raumkampfs im Log (2026-11-21h). */
export interface SpaceBattleEndItem {
  readonly kind: 'spaceBattleEnd';
  readonly at: string;
  readonly foe: string;
  readonly outcome: string;
}

export function spaceBattleItem(entry: SpaceBattle): SpaceBattleItem {
  return { kind: 'spaceBattle', at: entry.at, foe: entry.foe, design: shipDesignOf(entry.design).name, intent: intentNames[entry.intent], encounter: entry.encounter, reaction: entry.reaction, attack: entry.attack };
}

export function spaceAttackItem(entry: SpaceAttack): SpaceAttackItem {
  const total = entry.dice[0] + entry.dice[1] + entry.dm;
  // Einträge von vor 2026-11-21i kennen nur die Summe der DMs.
  const parts = entry.bands === undefined ? (entry.dm === 0 ? [] : [{ label: 'DM', dm: entry.dm }]) : dmLines(dmPartsOf(entry.weapon, entry.bands, entry.computerHits ?? 0, entry.noComputer === true), entry.bands, entry.computerHits ?? 0);
  return { kind: 'spaceAttack', at: entry.at, round: entry.round, attacker: entry.attacker, target: entry.target, turret: entry.turret, weapon: shipWeaponOf(entry.weapon).name, dice: entry.dice, dm: entry.dm, parts, need: HIT_TARGET - entry.dm, total, hit: total >= HIT_TARGET, hits: entry.hits.map((h) => hitZoneNames[h]) };
}

export function spaceBattleEndItem(entry: SpaceBattleEnd): SpaceBattleEndItem {
  return { kind: 'spaceBattleEnd', at: entry.at, foe: entry.foe, outcome: outcomeNames[entry.outcome] };
}

export function skimmingItem(campaign: Campaign, entry: Skimming): SkimmingItem {
  return { kind: 'skimming', at: entry.at, giant: worldName(campaign, entry.giant), ship: campaign.ships.find((s) => s.id === entry.ship)?.name ?? entry.ship, tons: entry.tons };
}

/** Eine Reise im System im Log (2026-11-20d). */
export interface SystemJourneyItem {
  readonly kind: 'systemJourney';
  readonly at: string;
  readonly from: string;
  readonly to: string;
  readonly fromDate: string;
  readonly toDate: string;
  /** „37 h, 4,5 Mio. km“. */
  readonly flight: string;
  /** Mit Ticket (und dem Preis) oder mit dem eigenen Schiff. */
  readonly how: string;
  readonly travellers: readonly string[];
}

/** Die Spielzeit oben im Reiter Begegnung. */
export interface TimeView {
  /** „Sonntag, 008-1105“. */
  readonly label: string;
  readonly dayOfYear: number;
  readonly year: number;
  /** Ob sich das Startdatum noch ändern lässt (kein Logeintrag hat einen Tag). */
  readonly canSetStart: boolean;
  readonly maxDays: number;
  /** Wie viele Tage „Woche beenden“ weiterschaltet. */
  readonly toSunday: number;
  /** Welche Tests diese Woche fehlen; daran erinnert „Woche beenden“. */
  readonly missingWeek: readonly string[];
  /** Warum gerade keine Zeit vergeht (laufende Begegnung). */
  readonly blocked: string | undefined;
  readonly note: string | undefined;
}

/** Je Test: „heute 1×“ bzw. „diese Woche 1×“ und ob die Regel schon erfüllt ist (dann langes Drücken). */
export type ChecksView = Readonly<Record<CheckKind, { readonly label: string; readonly met: boolean; readonly period: string }>>;

/** Die Begegnungsart Polizei. */
export interface LegalView {
  /** Ob es auf dem Aufenthaltsort Polizei gibt (Gesetz 1 oder mehr). */
  readonly available: boolean;
  readonly law: number | undefined;
  readonly last: CheckItem | undefined;
  readonly note: string | undefined;
}

/** Wie die Gruppe reist: gebuchte Passage oder das eigene Schiff (2026-11-16d). */
export type JourneyMode = 'passage' | 'ship';

/** Was der Controller für die Reise in Vorbereitung hält. */
export interface JourneyDraft {
  readonly to: string;
  /** Mit Passage oder mit eigenem Schiff; vorgeschlagen, was verfügbar ist. */
  readonly mode: JourneyMode;
  /** Die Zahl der NSC in Low Passage (1W6), gewürfelt beim Öffnen, damit man tippen kann. */
  readonly npcDie: number;
  readonly choice: Readonly<Record<string, PassageId>>;
  readonly guesses: Readonly<Record<string, number>>;
  readonly error: string | undefined;
  /** Nach der Reise: ihre Stelle im Log; dann zeigt der Dialog das Ergebnis. */
  readonly done: number | undefined;
}

/** Der Dialog der Reise im System, flüchtig im Zustand des Controllers (2026-11-20d). */
export interface SystemJourneyDraft {
  readonly to: string;
  readonly mode: SystemJourneyMode;
  /** Mit `mode` = `craft`: das Small Craft (2026-11-21b). */
  readonly craft?: string;
  readonly error: string | undefined;
  /** Nach der Reise ihre Stelle im Log; dann zeigt der Dialog das Ergebnis. */
  readonly done: number | undefined;
}

/** Eine Art, im System zu reisen, wie der Dialog sie anbietet. */
export interface SystemJourneyOption {
  readonly mode: SystemJourneyMode;
  /** Mit `mode` = `craft`: das Small Craft (2026-11-21b). */
  readonly craft: string | undefined;
  /** Der Knopf im Dialog: „Ticket“, „Eigenes Schiff“ oder der Name des Beiboots. */
  readonly button: string;
  readonly label: string;
  readonly g: number;
  readonly hours: number;
  readonly days: number;
  readonly arrival: string;
  /** Preis aller Tickets; mit eigenem Schiff 0. */
  readonly cost: number;
  readonly blocker: string | undefined;
}

/** Der Dialog der Reise im System. */
export interface SystemJourneyView {
  readonly to: string;
  readonly toName: string;
  readonly fromName: string;
  /** „4,5 Mio. km“. */
  readonly distance: string;
  readonly mode: SystemJourneyMode;
  readonly craft: string | undefined;
  readonly options: readonly SystemJourneyOption[];
  readonly travellers: readonly string[];
  readonly funds: number;
  readonly error: string | undefined;
  readonly result: SystemJourneyItem | undefined;
}

/** Der Dialog der Reise. */
export interface JourneyView {
  readonly to: string;
  readonly toName: string;
  readonly fromName: string;
  readonly parsecs: number;
  readonly days: number;
  readonly arrival: string;
  /** Mit Passage oder mit eigenem Schiff. */
  readonly mode: JourneyMode;
  /** Was für das eigene Schiff spricht bzw. dagegen: zum Umschalten und für den Hinweis. */
  readonly ship:
    | {
        readonly name: string;
        readonly design: string;
        readonly jump: number;
        readonly fuel: number;
        readonly perJump: number;
        readonly after: number;
        /** Wie viele reisen und wie viele Kabinen das Schiff hat; mehr Reisende als Kabinen heißt Doppelbelegung. */
        readonly travellers: number;
        readonly staterooms: number;
        /** Cr2.000 je Reisendem, am Abflugtag gebucht. */
        readonly lifeSupport: number;
        readonly blocker: string | undefined;
      }
    | undefined;
  /** Warum die Passage hier nicht geht (für den deaktivierten Knopf); `undefined`, wenn sie geht. */
  readonly passageBlocker: string | undefined;
  readonly passages: readonly { readonly id: PassageId; readonly name: string; readonly price: number; readonly tickets: number }[];
  readonly travellers: readonly { readonly id: string; readonly name: string; readonly passage: PassageId; readonly guess: number | undefined; readonly dm: number | undefined }[];
  /** Wie viele NSC in Low Passage mitreisen, wenn ein SC Low reist. */
  readonly npcs: number;
  /** Alle Low-Passagiere; ein Tipp geht von 0 bis hierher. */
  readonly lowTotal: number;
  readonly pot: number;
  readonly cost: number;
  readonly funds: number;
  readonly error: string | undefined;
  /** Nach der Reise das Ergebnis. */
  readonly result: JourneyItem | undefined;
}

export function checkItem(entry: CheckRoll): CheckItem {
  const check = checkOf(entry);
  const reaction = legalReaction(entry);
  const text = checkText(entry.check, check.passed);
  return {
    kind: 'check',
    at: entry.at,
    check: entry.check,
    name: checkNames[entry.check],
    dice: entry.dice,
    total: check.total,
    target: entry.target,
    passed: check.passed,
    text,
    reactionDice: entry.reactionDice,
    reactionDm: entry.reactionDm,
    reaction,
    reactionText: reaction === undefined ? undefined : reactionText(reaction),
  };
}

function checkText(kind: CheckKind, passed: boolean): string {
  switch (kind) {
    case 'random':
      return passed ? 'eine Begegnung' : 'heute keine Begegnung';
    case 'animal':
      return passed ? 'Tiere' : 'keine Tiere';
    case 'patron':
      return passed ? 'ein Patron' : 'diese Woche kein Patron';
    case 'rumor':
      return passed ? 'ein Gerücht' : 'diese Woche kein Gerücht';
    case 'legal':
      return passed ? 'die Polizei lässt die Gruppe in Ruhe' : 'die Polizei hält die Gruppe an und verlangt Ausweise';
  }
}

/** Eine Zeile der Monatsabrechnung: eine Art laufender Kosten mit ihrer Summe und offenen Posten. */
export interface MonthEndLine {
  readonly cost: ShipCost;
  readonly name: string;
  /** Was gebucht ist, als positiver Betrag in Cr. */
  readonly amount: number;
  /** Wie oft etwas offen geblieben ist (0 Cr mit Hinweis), z. B. eine nicht bezahlte Rate. */
  readonly unpaid: number;
}

/** Die Monatsabrechnung im Log (2026-11-17b): je Art der laufenden Kosten eine Zeile und die Summe. */
export interface MonthEndItem {
  readonly kind: 'monthEnd';
  readonly at: string;
  /** Der abgerechnete Monat, z. B. „Monat 3 · 1105“. */
  readonly month: string;
  readonly lines: readonly MonthEndLine[];
  readonly total: number;
}

const costNames: Record<Exclude<ShipCost, 'price' | 'armament' | 'repair'>, string> = { rate: 'Rate', fuel: 'Treibstoff', berthing: 'Liegegebühren', lifeSupport: 'Lebenserhaltung' };

export function monthEndItem(campaign: Campaign, entry: MonthEnd): MonthEndItem {
  const costs = costsOf(campaign, entry).map((c) => c.booking);
  const lines = (Object.keys(costNames) as (keyof typeof costNames)[]).flatMap((cost) => {
    const of = costs.filter((b) => b.shipCost === cost);
    return of.length === 0 ? [] : [{ cost, name: costNames[cost], amount: -of.reduce((sum, b) => sum + b.amount, 0), unpaid: of.filter((b) => b.amount === 0).length }];
  });
  // Abgerechnet wird der Monat, der mit dem Tag vor dem Monatsende aufhört.
  const { month, year } = monthOf((entry.day ?? 1) - 1);
  return { kind: 'monthEnd', at: entry.at, month: `Monat ${month} · ${year}`, lines, total: lines.reduce((sum, l) => sum + l.amount, 0) };
}

export function timeItem(entry: TimePassed): TimeItem {
  const from = entry.day ?? 0;
  return { kind: 'time', at: entry.at, days: entry.days, week: entry.week, from: dateLabel(from), to: dateLabel(from + entry.days) };
}

function worldName(campaign: Campaign, id: string): string {
  // Eine Nebenwelt ohne Namen heißt nach der Hauptwelt mit ihrer Nummer, z. B. „Kessra 3“.
  try {
    return worldOf(campaign.hexes, id).name;
  } catch {
    return worldById(campaign.hexes, id)?.name ?? id;
  }
}

function nameOf(campaign: Campaign, id: string): string {
  return campaign.characters.find((c) => c.id === id)?.name ?? id;
}

export function journeyItem(campaign: Campaign, entry: Journey, index: number): JourneyItem {
  const winner = winnerOf(entry);
  const from = entry.day ?? 0;
  const winnerBerth = winner === undefined ? undefined : entry.berths[winner];
  return {
    kind: 'journey',
    at: entry.at,
    index,
    from: worldName(campaign, entry.from),
    to: worldName(campaign, entry.to),
    fromDate: dateLabel(from),
    toDate: dateLabel(from + entry.days),
    passengers: entry.passengers.map((p) => ({ name: nameOf(campaign, p.for), passage: itemOf(p.passage).name })),
    berths: entry.berths.map((b, i) => ({ name: b.for === undefined ? undefined : nameOf(campaign, b.for), dice: b.revive, dm: b.dm, total: b.revive[0] + b.revive[1] + b.dm, survived: survived(b), guess: b.guess, winner: i === winner })),
    survivors: entry.berths.filter(survived).length,
    pot: potOf(entry),
    winner: winnerBerth === undefined ? undefined : winnerBerth.for === undefined ? 'ein NSC' : nameOf(campaign, winnerBerth.for),
    paid: lotteryPaid(entry),
    lot: entry.lot !== undefined,
    reviveTarget: REVIVE_TARGET,
    ship: entry.ship === undefined ? undefined : campaign.ships.find((s) => s.id === entry.ship)?.name ?? entry.ship,
    jump: entry.jump,
    jumpDm: entry.jumpDm ?? 0,
    misjump: misjumpOf(entry),
  };
}

export function systemJourneyView(campaign: Campaign, draft: SystemJourneyDraft): SystemJourneyView | undefined {
  const from = campaign.location?.world;
  if (draft.done !== undefined) {
    const entry = campaign.log[draft.done];
    if (entry?.kind !== 'systemJourney') return undefined;
    const result = systemJourneyItem(campaign, entry, draft.done);
    return { to: entry.to, toName: result.to, fromName: result.from, distance: result.flight, mode: draft.mode, craft: draft.craft, options: [], travellers: result.travellers, funds: fundsOf(campaign), error: undefined, result };
  }
  if (from === undefined) return undefined;
  let km: number;
  try {
    km = systemDistance(campaign.hexes, from, draft.to);
  } catch {
    return undefined;
  }
  const ship = shipOf(campaign);
  const option = (mode: SystemJourneyMode, button: string, label: string, g: number, craft?: string): SystemJourneyOption => {
    const hours = flightHours(km, g);
    const days = journeyDays(hours);
    return { mode, craft, button, label, g, hours, days, arrival: dateLabel(dayOf(campaign) + days), cost: mode === 'ticket' ? hours * TICKET_RATE * travellersOf(campaign).length : 0, blocker: systemJourneyBlocker(campaign, draft.to, mode, craft) };
  };
  // Dazu jedes Beiboot, mit dem die Gruppe von hier reisen kann (2026-11-21b).
  const options = [
    option('ticket', 'Ticket', 'Ticket', TICKET_G),
    ...(ship ? [option('ship', 'Eigenes Schiff', ship.name, shipDesignOf(ship.design).maneuver)] : []),
    ...journeyCraft(campaign).map((c) => option('craft', c.name, `${c.name} (${shipDesignOf(c.design).name})`, shipDesignOf(c.design).maneuver, c.id)),
  ];
  return {
    to: draft.to,
    toName: worldName(campaign, draft.to),
    fromName: worldName(campaign, from),
    distance: mkm(km),
    mode: draft.mode,
    craft: draft.craft,
    options,
    travellers: travellersOf(campaign).map((c) => c.name),
    funds: fundsOf(campaign),
    error: draft.error,
    result: undefined,
  };
}

const mkm = (km: number) => (km >= 1_000_000 ? `${(km / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. km` : `${Math.round(km).toLocaleString('de-DE')} km`);

export function systemJourneyItem(campaign: Campaign, entry: SystemJourney, index: number): SystemJourneyItem {
  const from = entry.day ?? 0;
  const ticket = campaign.bookings.find((b) => b.ticketFor === index);
  const ship = entry.ship === undefined ? undefined : (campaign.ships.find((s) => s.id === entry.ship)?.name ?? entry.ship);
  let distance: string | undefined;
  try {
    distance = mkm(systemDistance(campaign.hexes, entry.from, entry.to));
  } catch {
    distance = undefined;
  }
  return {
    kind: 'systemJourney',
    at: entry.at,
    from: worldName(campaign, entry.from),
    to: worldName(campaign, entry.to),
    fromDate: dateLabel(from),
    toDate: dateLabel(from + journeyDays(entry.hours)),
    flight: [`${entry.hours} h`, distance].filter((t) => t !== undefined).join(' · '),
    how: ship !== undefined ? `mit ${ship}` : `mit Ticket${ticket ? ` · Cr ${(-ticket.amount).toLocaleString('de-DE')}` : ''}`,
    travellers: entry.travellers.map((id) => nameOf(campaign, id)),
  };
}

/** Die Tierbegegnung gehört zu den täglichen Tests, wenn es auf der Welt im Gelände Tiere geben kann. */
export function timeView(campaign: Campaign, note: string | undefined, animals: boolean): TimeView {
  const today = dayOf(campaign);
  const { dayOfYear, year } = dateParts(today);
  return {
    label: dateLabel(today),
    dayOfYear,
    year,
    canSetStart: canSetStartDate(campaign),
    maxDays: MAX_DAYS,
    toSunday: daysToSunday(today),
    missingWeek: missingChecks(campaign, true, animals).map((k) => checkNames[k]),
    blocked: campaign.encounters.some((e) => !e.ended) ? 'Während einer laufenden Begegnung vergeht keine Zeit.' : undefined,
    note,
  };
}

export function checksView(campaign: Campaign): ChecksView {
  return Object.fromEntries(checkKinds.map((k) => [k, { label: checksLabel(campaign, k), met: checksMet(campaign, k), period: encounterChecks[k].period }])) as unknown as ChecksView;
}

export function legalView(campaign: Campaign, last: CheckItem | undefined, note: string | undefined): LegalView {
  return { available: hasPolice(campaign), law: lawHere(campaign), last, note };
}

/** Die Passage, die ein Charakter zuletzt nahm; sonst Middle Passage. */
export function lastPassage(campaign: Campaign, id: string): PassageId {
  for (let i = campaign.log.length - 1; i >= 0; i--) {
    const entry = campaign.log[i]!;
    if (entry.kind !== 'journey') continue;
    const p = entry.passengers.find((x) => x.for === id);
    if (p && passages.includes(p.passage as PassageId)) return p.passage as PassageId;
  }
  return 'middle-passage';
}

/** Das Schiff der Gruppe für den Reisedialog: Name, Entwurf, Sprungzahl und Treibstoff je Sprung. */
function shipForJourney(campaign: Campaign, shipBlocker: string | undefined) {
  const ship = shipOf(campaign);
  if (ship === undefined) return undefined;
  const plan = shipDesignOf(ship.design);
  const perJump = jumpFuelOf(ship.design);
  return { name: ship.name, design: plan.name, jump: plan.jump, fuel: ship.fuel, perJump, after: ship.fuel - perJump, travellers: travellersOf(campaign).length, staterooms: plan.staterooms, lifeSupport: lifeSupportOf(campaign), blocker: shipBlocker };
}

export function journeyView(campaign: Campaign, draft: JourneyDraft): JourneyView | undefined {
  if (draft.done !== undefined) {
    const entry = campaign.log[draft.done];
    if (entry?.kind !== 'journey') return undefined;
    const result = journeyItem(campaign, entry, draft.done);
    return {
      to: entry.to,
      toName: result.to,
      fromName: result.from,
      parsecs: parsecs(hexById(campaign.hexes, entry.from)!, hexById(campaign.hexes, entry.to)!),
      days: entry.days,
      arrival: result.toDate,
      mode: entry.ship === undefined ? 'passage' : 'ship',
      ship: undefined,
      passageBlocker: undefined,
      passages: [],
      travellers: [],
      npcs: entry.npcDie ?? 0,
      lowTotal: entry.berths.length,
      pot: result.pot,
      cost: 0,
      funds: fundsOf(campaign),
      error: undefined,
      result,
    };
  }
  const from = locationOf(campaign);
  const target = hexById(campaign.hexes, draft.to);
  const fromHex = from && hexById(campaign.hexes, hexIdOfWorld(from.id));
  if (!from || !fromHex || !target) return undefined;
  const passageBlocker = journeyBlocker(campaign, draft.to);
  const shipBlocker = shipJourneyBlocker(campaign, draft.to);
  const ship = shipForJourney(campaign, shipBlocker);
  const base = {
    to: draft.to,
    toName: mainOf(target)?.name ?? draft.to,
    fromName: from.name,
    parsecs: parsecs(fromHex, target),
    days: JOURNEY_DAYS,
    arrival: dateLabel(dayOf(campaign) + JOURNEY_DAYS),
    mode: draft.mode,
    ship,
    passageBlocker,
  };
  if (draft.mode === 'ship') {
    return { ...base, passages: [], travellers: [], npcs: 0, lowTotal: 0, pot: 0, cost: 0, funds: fundsOf(campaign), error: draft.error ?? shipBlocker, result: undefined };
  }
  const travellers = travellersOf(campaign);
  const choice = Object.fromEntries(travellers.map((c) => [c.id, draft.choice[c.id] ?? lastPassage(campaign, c.id)])) as Record<string, PassageId>;
  const lows = travellers.filter((c) => choice[c.id] === LOW_PASSAGE).length;
  const npcs = lows === 0 ? 0 : draft.npcDie;
  return {
    ...base,
    passages: passages.map((id) => ({ id, name: itemOf(id).name, price: itemOf(id).price ?? 0, tickets: ticketsOf(campaign, id) })),
    travellers: travellers.map((c) => ({
      id: c.id,
      name: c.name,
      passage: choice[c.id]!,
      guess: choice[c.id] === LOW_PASSAGE ? (draft.guesses[c.id] ?? lows + npcs) : undefined,
      dm: choice[c.id] === LOW_PASSAGE ? reviveDm(campaign, c.id, choice) : undefined,
    })),
    npcs,
    lowTotal: lows + npcs,
    pot: (lows + npcs) * 10,
    cost: journeyCost(campaign, choice),
    funds: fundsOf(campaign),
    error: draft.error ?? passageBlocker,
    result: undefined,
  };
}
