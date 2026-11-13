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
  lawHere,
  legalReaction,
  locationOf,
  lotteryPaid,
  LOW_PASSAGE,
  MAX_DAYS,
  missingChecks,
  parsecs,
  passages,
  potOf,
  reactionText,
  reviveDm,
  survived,
  ticketsOf,
  travellersOf,
  winnerOf,
  worldOf,
  fundsOf,
  hexById,
  REVIVE_TARGET,
  type Campaign,
  type CheckKind,
  type CheckRoll,
  type Journey,
  type PassageId,
  type TimePassed,
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
  /** Welche Tests heute noch fehlen bzw. diese Woche (für die Erinnerung). */
  readonly missingDay: readonly string[];
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

/** Was der Controller für die Reise in Vorbereitung hält. */
export interface JourneyDraft {
  readonly to: string;
  /** Die Zahl der NSC in Low Passage (1W6), gewürfelt beim Öffnen, damit man tippen kann. */
  readonly npcDie: number;
  readonly choice: Readonly<Record<string, PassageId>>;
  readonly guesses: Readonly<Record<string, number>>;
  readonly error: string | undefined;
  /** Nach der Reise: ihre Stelle im Log; dann zeigt der Dialog das Ergebnis. */
  readonly done: number | undefined;
}

/** Der Dialog der Reise. */
export interface JourneyView {
  readonly to: string;
  readonly toName: string;
  readonly fromName: string;
  readonly parsecs: number;
  readonly days: number;
  readonly arrival: string;
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

export function timeItem(entry: TimePassed): TimeItem {
  const from = entry.day ?? 0;
  return { kind: 'time', at: entry.at, days: entry.days, week: entry.week, from: dateLabel(from), to: dateLabel(from + entry.days) };
}

function worldName(campaign: Campaign, id: string): string {
  return hexById(campaign.hexes, id)?.name ?? id;
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
    missingDay: missingChecks(campaign, false, animals).map((k) => checkNames[k]),
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

export function journeyView(campaign: Campaign, draft: JourneyDraft): JourneyView | undefined {
  if (draft.done !== undefined) {
    const entry = campaign.log[draft.done];
    if (entry?.kind !== 'journey') return undefined;
    const result = journeyItem(campaign, entry, draft.done);
    return {
      to: entry.to,
      toName: result.to,
      fromName: result.from,
      parsecs: parsecs(worldOf(campaign.hexes, entry.from), worldOf(campaign.hexes, entry.to)),
      days: entry.days,
      arrival: result.toDate,
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
  if (!from || !target) return undefined;
  const travellers = travellersOf(campaign);
  const choice = Object.fromEntries(travellers.map((c) => [c.id, draft.choice[c.id] ?? lastPassage(campaign, c.id)])) as Record<string, PassageId>;
  const lows = travellers.filter((c) => choice[c.id] === LOW_PASSAGE).length;
  const npcs = lows === 0 ? 0 : draft.npcDie;
  return {
    to: draft.to,
    toName: target.name ?? draft.to,
    fromName: from.name,
    parsecs: parsecs(from, target),
    days: JOURNEY_DAYS,
    arrival: dateLabel(dayOf(campaign) + JOURNEY_DAYS),
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
    error: draft.error ?? journeyBlocker(campaign, draft.to),
    result: undefined,
  };
}
