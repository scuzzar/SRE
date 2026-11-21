import type { Place } from './place';
import type { CharacterId } from './campaign';
import { DomainError } from './errors';
import type { MapIcon, Scatter } from './card-roll';
import type { HitZone } from './space-combat';
import type { Clock, Random } from './ports';
import { slotOfEntry, type ArmorClass, type Range, type Slot } from './reference';
import { roll2d6, sum, type Characteristic, type Dice } from './rules';

/**
 * Der Log verweist, er kopiert nicht. Ein Eintrag hält nur fest, was allein ihm gehört: Frage,
 * Text einer Notiz oder Deutung, Zeitpunkt und Würfel, bei der Antwort des Orakels dazu die Chance, bei Probe und Angriff DM und Zielwert.
 * Einträge werden nur angehängt, nie geändert; löschen lässt sich ein Eintrag nur ganz.
 */
export type LogEntry = DiceRoll | CardPick | TaskResult | AttackResult | DamageRoll | Recovery | PatronRoll | RumorRoll | EventResult | SaveRoll | Butchering | TimePassed | MonthEnd | CheckRoll | Journey | SystemJourney | Skimming | SpaceBattle | SpaceAttack | SpaceBattleEnd | TripDay | Note;

/** Ein Ergebnis: was Orakel, Würfel oder Karte liefern. Nur ein Ergebnis lässt sich deuten. */
export type LogResult = Exclude<LogEntry, Note>;

interface LogEntryBase {
  /** Zeitpunkt als ISO-8601-Zeitstempel. */
  readonly at: string;
  /** Der Spieltag, an dem der Eintrag entstand (siehe `time.ts`); fehlt bei Einträgen von vor der Spielzeit. */
  readonly day?: number;
  /** Wo es geschah (2026-11-14j); bekommt beim Anlegen den Aufenthaltsort der Gruppe, falls es einen gibt. */
  readonly place?: Place;
}

/**
 * Die Gruppe lässt Tage vergehen oder beendet die Woche. `day` ist der Tag, an dem die Zeit zu
 * vergehen beginnt; danach ist die Kampagne `days` Tage weiter.
 */
export interface TimePassed extends LogEntryBase {
  readonly kind: 'time';
  readonly days: number;
  readonly week: boolean;
}

/**
 * Die Monatsabrechnung (2026-11-17b): Sie verweist auf die Buchungen mit laufenden Kosten seit der
 * letzten Abrechnung (`costs`), im Code auf die Stellen `costsFrom` bis ausschließlich `costsTo` in
 * den Buchungen; gezählt werden davon die laufenden Kosten (`isRunningCost`). `day` ist das
 * Monatsende, also der erste Tag des neuen Monats. Buchungen werden nie gelöscht, die Stellen bleiben.
 */
export interface MonthEnd extends LogEntryBase {
  readonly kind: 'monthEnd';
  readonly costsFrom: number;
  readonly costsTo: number;
}

/**
 * Ein Reisetag einer Fahrt (siehe `trip.ts`): die gefahrenen Stunden, die Miete des Tages und ob
 * die Gruppe angekommen ist. `day` ist der Tag, an dem gefahren wird; danach ist die Kampagne einen
 * Tag weiter. Der Ort ist das erreichte Feld.
 */
export interface TripDay extends LogEntryBase {
  readonly kind: 'tripDay';
  readonly hours: number;
  readonly rent: number;
  /** Der Fahrpreis des Tages im Linienverkehr; fehlt bei Reisetagen von vor dem Linienflug (dann 0). */
  readonly fare?: number;
  readonly arrived: boolean;
}

/** Die Arten der Tests: Zufallsbegegnung, Tiere, Patron, Gerücht, Polizei. `check` ist im Modell `kind`. */
export const checkKinds = ['random', 'animal', 'patron', 'rumor', 'legal'] as const;
export type CheckKind = (typeof checkKinds)[number];

/**
 * Ein gewürfelter Test einer Begegnungsart (Encounter Checklist, SE Charts S. 20). Bei der Polizei
 * dazu die Reaktion des Polizisten, wenn die Gruppe den Test nicht schafft.
 */
export interface CheckRoll extends LogEntryBase {
  readonly kind: 'check';
  readonly check: CheckKind;
  readonly dice: readonly number[];
  readonly target: number;
  readonly reactionDice?: Dice;
  readonly reactionDm?: number;
}

/** Ein Charakter auf der Reise mit seiner Passage (Verweis auf den Gegenstand). */
export interface Passenger {
  readonly for: CharacterId;
  readonly passage: string;
}

/** Ein Low-Passagier: SC (`for`) oder NSC (ohne), mit Wurf zum Aufwachen, DM und Tipp der Lotterie. */
export interface LowBerth {
  readonly for?: CharacterId;
  readonly revive: Dice;
  readonly dm: number;
  readonly guess: number;
}

/**
 * Eine Reise von `from` nach `to` (Felder wie 0304), am Abflugtag. `lot` ist bei
 * Gleichstand in der Lotterie die Stelle der Koje, die das Los gewann.
 * Mit eigenem Schiff (2026-11-16d): `ship` verweist auf das Schiff der Reise, `jump` ist der
 * Sprungwurf (2W6, Fehlsprung bei 13+); ohne Passagiere, Kojen und Lotterie.
 */
export interface Journey extends LogEntryBase {
  readonly kind: 'journey';
  readonly from: string;
  readonly to: string;
  readonly days: number;
  readonly passengers: readonly Passenger[];
  readonly berths: readonly LowBerth[];
  readonly npcDie?: number;
  readonly lot?: number;
  readonly ship?: string;
  readonly jump?: Dice;
  /** Mit `jump`: der DM, mit dem der Sprungwurf zählte (+1 mit unraffiniertem Treibstoff, SR 28; 2026-11-21b). Fehlt in Ständen von vorher: 0. */
  readonly jumpDm?: number;
}

/**
 * Treibstoff geschöpft (2026-11-21b): Das Schiff tauchte im Systemflug langsam in den Gasriesen
 * `giant` ein (im Domänenmodell der Pfeil `at`; `at` ist hier der Zeitstempel) und füllte den Tank
 * mit `tons` Tonnen unraffiniertem Treibstoff.
 */
export interface Skimming extends LogEntryBase {
  readonly kind: 'skimming';
  readonly giant: string;
  readonly ship: string;
  readonly tons: number;
}

/**
 * Ein fremdes Schiff taucht im Systemflug auf (2026-11-21d): Entwurf, Name und Absicht; gewürfelt mit
 * `encounter` (2W6, SE 13), `reaction` (2W6, SE 21) und `attack` (der weitere Wurf bei Reaktion 3 oder 4);
 * von Hand gewählt ohne Würfe.
 */
export interface SpaceBattle extends LogEntryBase {
  readonly kind: 'spaceBattle';
  readonly foe: string;
  readonly design: string;
  readonly intent: 'attack' | 'flee' | 'ignore';
  readonly encounter?: Dice;
  readonly reaction?: Dice;
  readonly attack?: Dice;
}

/** Ein Laserschuss im Raumkampf (2026-11-21d): wer auf wen, aus welchem Turret mit welcher Waffe, 2W6 + DM ≥ 8, und die Trefferzonen. */
export interface SpaceAttack extends LogEntryBase {
  readonly kind: 'spaceAttack';
  readonly round: number;
  readonly attacker: string;
  readonly target: string;
  readonly turret: number;
  readonly weapon: string;
  readonly dice: Dice;
  readonly dm: number;
  readonly hits: readonly HitZone[];
}

/** Das Ende eines Raumkampfs (2026-11-21d). */
export interface SpaceBattleEnd extends LogEntryBase {
  readonly kind: 'spaceBattleEnd';
  readonly foe: string;
  readonly outcome: 'destroyed' | 'disabled' | 'escaped' | 'broken' | 'lost';
}

/**
 * Die Reise im System (2026-11-20d): von Welt zu Welt desselben Systems, mit Ticket (ohne `ship`)
 * oder mit dem eigenen Schiff. `hours` ist die Flugzeit nach T = 2·√(D/A); `day` der Abflugtag,
 * danach ist die Kampagne `/days` Tage weiter (Stunden ÷ 24, aufgerundet, mindestens 1).
 */
export interface SystemJourney extends LogEntryBase {
  readonly kind: 'systemJourney';
  readonly from: string;
  readonly to: string;
  readonly hours: number;
  readonly travellers: readonly string[];
  readonly ship?: string;
}

/**
 * Eine Orakelantwort von vor 2026-11-14d, als sie ein eigener Logeintrag war. Gibt es nur noch beim
 * Laden alter Spielstände und Dateien; `upgradeOracle` macht eine Kartenauswahl daraus.
 */
export interface LegacyOracleAnswer extends LogEntryBase {
  readonly kind: 'oracle';
  readonly question?: string;
  readonly roll: number;
  readonly chance: number;
  readonly odds: string;
}

/** Die sechs Antworten des Orakels: Ja!, Ja, Ja?, Nein?, Nein, Nein!. */
export type Answer = 'yesStrong' | 'yes' | 'yesWeak' | 'noWeak' | 'no' | 'noStrong';

export interface DiceRoll extends LogEntryBase {
  readonly kind: 'dice';
  readonly dice: Dice;
}

export interface CardPick extends LogEntryBase {
  readonly kind: 'card';
  readonly question?: string;
  /** Die Werte der ausgewählten Wurffelder; nicht ausgewählte fehlen. */
  readonly bell?: number;
  readonly scatter?: Scatter;
  readonly map?: MapIcon;
  /**
   * Die Antwort des Orakels, falls auf der Karte eine Stufe gewählt war: der Wurf 1–100 der Karte,
   * der Verweis auf die Stufe und ihre Chance zum Zeitpunkt des Wurfs. Alle drei oder keins.
   */
  readonly oracle?: number;
  readonly odds?: string;
  readonly chance?: number;
  /** Der Wurf 1–100 auf den Ereignisfokus, nur bei einem Zufallsereignis mit gewählter Stufe. */
  readonly eventFocus?: number;
  /** Der Handlungsfaden: die Mission, die die Karte bei einem Fadenfokus ausgelost hat (2026-11-18). */
  readonly thread?: string;
  /** In der Reihenfolge der Karte. Zusammen mit Wurffeldern und Antwort mindestens eins. */
  readonly items: readonly PickedItem[];
}

export interface PickedItem {
  /** Verweis auf die übernommenen Einträge eines Feldes: einer, beim Paar beide in der Reihenfolge der Spalten. */
  readonly picked: readonly string[];
}

export interface TaskResult extends LogEntryBase {
  readonly kind: 'task';
  readonly for: CharacterId;
  /** Die Fertigkeit, deren Stufe der Charakter genutzt hat; keine heißt „ohne Fertigkeit“. */
  readonly uses?: string;
  readonly counts: readonly Characteristic[];
  /** Verweis auf die Stufe. */
  readonly odds: string;
  readonly dice: Dice;
  readonly dm: number;
  readonly target: number;
}

/**
 * Ein gewürfelter Angriff: Treffer oder nicht. Rüstung und Reichweite sind die des Ziels. Der
 * Angreifer (`for`) und das Ziel, wenn es eines gibt (`against`), sind Charaktere: SC oder NSC einer
 * Begegnung. `target` ist der Zielwert.
 */
export interface AttackResult extends LogEntryBase {
  readonly kind: 'attack';
  readonly for: CharacterId;
  readonly against?: CharacterId;
  /** Verweis auf die Waffe. */
  readonly with: string;
  /** Die Fertigkeit der Waffe, wenn der Charakter eine Stufe darin hat; sonst zählte Stufe 0. */
  readonly uses?: string;
  readonly armor: ArmorClass;
  readonly range: Range;
  readonly dice: Dice;
  readonly dm: number;
  readonly target: number;
  /**
   * Garbe: Die weiteren Würfe eines Feuerstoßes oder Schrotschusses verweisen auf den ersten. Im
   * Code die Stelle des ersten Wurfs im Log; sie liegt immer davor.
   */
  readonly volley?: number;
  /** Bei Schlägen und Hieben: wie der Schlag zählt (SR 22). Fehlt bei Schüssen und bei Angriffen von vorher. */
  readonly strike?: Strike;
}

/** Wie ein Schlag oder Hieb zählt: mit Überraschung, Combat (kostet END), geschwächt oder Special (gegen Wehrlose). */
export const strikes = ['surprise', 'combat', 'weakened', 'special'] as const;
export type Strike = (typeof strikes)[number];

/**
 * Der Schadenswurf zu einem Treffer: so viele W6, wie die Waffe `wounds` hat. `of` ist im Code die
 * Stelle des Treffers im Log; sie liegt immer davor.
 */
export interface DamageRoll extends LogEntryBase {
  readonly kind: 'damage';
  /** Die Stelle des Treffers; fehlt bei Schaden aus einem Ereignis, dann gilt `after`. */
  readonly of?: number;
  /** Die Stelle des misslungenen Rettungswurfs, nach dem der Schaden eines Ereignisses kommt. */
  readonly after?: number;
  /** Die Schadenswürfel; leer, wenn ein Tier traf: dann gilt `fixed`. */
  readonly dice: readonly number[];
  /** Der feste Schaden eines Tiers je Treffer (SR 48); er geht als ein Block auf ein Attribut. */
  readonly fixed?: number;
  /**
   * Bei einem Treffer mit Ziel: je Block das Attribut (SR 21). Ein Würfel ist ein Block; bringt er sein
   * Attribut auf 0, wird der Rest ein weiterer Block. Vor dem Überlauf: je Würfel das Attribut.
   */
  readonly to?: readonly PhysicalCharacteristic[];
  /** Je Block die Punkte, so lang wie `to`; fehlt bei Schadenswürfen von vor dem Überlauf. */
  readonly points?: readonly number[];
  /** Fiel das Ziel mit Überraschung lautlos: der Wurf, ob ein Kamerad es sieht und Alarm gibt (9+, SR 20). */
  readonly alarmDice?: readonly [number, number];
}

/** Aufwachen, Behandlung, Ruhe (S. 7). */
export const recoveryKinds = ['wake', 'treatment', 'rest'] as const;
export type RecoveryKind = (typeof recoveryKinds)[number];

/**
 * Eine Heilung: nimmt Wunden eines Charakters (`for`, SC oder NSC einer Begegnung) zurück. Bei der
 * Behandlung der Behandelnde (`by`), bei einer schweren Wunde die 5W6 Tage (`dice`). `how` ist im
 * Modell `kind`.
 */
export interface Recovery extends LogEntryBase {
  readonly kind: 'recovery';
  readonly how: RecoveryKind;
  readonly for: CharacterId;
  readonly by?: CharacterId;
  readonly dice?: readonly number[];
}

/**
 * Ein Wurf auf eine Patron-Liste (SE, Charts S. 20): zwei Würfel nacheinander, jeder mit seinem DM,
 * die DMs beim Würfeln festgehalten. `list` ist im Code der Verweis `of` auf die Liste; die Zeile
 * folgt aus Würfeln und DMs (siehe `patronOfRoll`).
 */
export interface PatronRoll extends LogEntryBase {
  readonly kind: 'patron';
  readonly list: 1 | 2;
  readonly dice: Dice;
  readonly dms: readonly [number, number];
}

/** Ein Wurf auf die Rumors Matrix (SE, Charts S. 21): zwei Würfel nacheinander, ohne DMs; das Gerücht folgt allein aus ihnen. */
export interface RumorRoll extends LogEntryBase {
  readonly kind: 'rumor';
  readonly dice: Dice;
}

/**
 * Ein Tierwurf, der auf ein Ereignis fiel (SR 49–50). Im Code ist der Verweis auf die Zeile Welt
 * (`in`), Gelände und die Summe der Würfel.
 */
export interface EventResult extends LogEntryBase {
  readonly kind: 'event';
  readonly in: string;
  readonly terrain: string;
  readonly tableDice: Dice;
}

/**
 * Der Rettungswurf eines SC gegen ein Ereignis (SR 49): 2W6 gegen den Zielwert von damals, bei
 * „8+“ mindestens, bei einem Attribut höchstens so hoch. `of` ist die Stelle des Ereignis-Eintrags.
 */
export interface SaveRoll extends LogEntryBase {
  readonly kind: 'save';
  readonly for: CharacterId;
  readonly of: number;
  readonly dice: Dice;
  readonly target: number;
}

/**
 * Das Ausweiden eines Tiers (Hausregel nach SR 48): wer die Beute bekommt (`for`), welches Tier
 * (`of`), der Fleischwürfel, wenn die Art essbar ist, und die Stufen von damals in Steward/Medical
 * (Fleisch) und Klinge (Fell).
 */
export interface Butchering extends LogEntryBase {
  readonly kind: 'butchering';
  readonly of: CharacterId;
  readonly meatDie?: number;
  readonly meatSkill: number;
  readonly furSkill: number;
}

/** Wen ein Schaden trifft: das Ziel des Treffers bzw. wer den Rettungswurf nicht geschafft hat. */
export function damageVictim(log: readonly LogEntry[], roll: DamageRoll): CharacterId | undefined {
  if (roll.of !== undefined) {
    const hit = log[roll.of];
    return hit?.kind === 'attack' ? hit.against : undefined;
  }
  const save = roll.after === undefined ? undefined : log[roll.after];
  return save?.kind === 'save' ? save.for : undefined;
}

/** Die Rettungswürfe zum Ereignis an der Stelle `index`. */
export function savesOf(log: readonly LogEntry[], index: number): readonly number[] {
  return log.flatMap((entry, i) => (entry.kind === 'save' && entry.of === index ? [i] : []));
}

/** Die Schadenswürfe nach dem Rettungswurf an der Stelle `index`. */
export function damageAfterOf(log: readonly LogEntry[], index: number): readonly number[] {
  return log.flatMap((entry, i) => (entry.kind === 'damage' && entry.after === index ? [i] : []));
}

/** Die körperlichen Attribute, die Wunden nehmen (S. 7). */
export const physical = ['STR', 'DEX', 'END'] as const;
export type PhysicalCharacteristic = (typeof physical)[number];

/**
 * Eine Notiz, oder mit `interprets` eine Deutung. `interprets` ist im Code die Stelle des gedeuteten
 * Ergebnisses im Log; sie liegt immer vor der Deutung selbst.
 */
export interface Note extends LogEntryBase {
  readonly kind: 'note';
  readonly text: string;
  readonly interprets?: number;
  /** Wann der Text zuletzt geändert wurde; fehlt, solange er so ist, wie er geschrieben wurde. */
  readonly editedAt?: string;
}

export function isResult(entry: LogEntry): entry is LogResult {
  return entry.kind !== 'note';
}

/**
 * Schreibt eine Notiz, oder mit `interprets` eine Deutung zu dem Ergebnis an dieser Stelle des Logs.
 * Der Text darf nicht leer sein; Leerraum am Rand fällt weg.
 */
export function writeNote(log: readonly LogEntry[], text: string, clock: Clock, interprets?: number): Note {
  const trimmed = text.trim();
  if (!trimmed) throw new DomainError('Eine Notiz braucht Text.');
  if (interprets === undefined) return { kind: 'note', at: clock.now(), text: trimmed };
  checkInterprets(log, interprets, log.length);
  return { kind: 'note', at: clock.now(), text: trimmed, interprets };
}

/** Eine Deutung an der Stelle `at` verweist auf ein früheres Ergebnis. */
export function checkInterprets(log: readonly LogEntry[], interprets: number, at: number): void {
  const target = log[interprets];
  if (!Number.isInteger(interprets) || interprets < 0 || interprets >= at || !target) throw new DomainError('Eine Deutung verweist auf einen Eintrag, den es davor nicht gibt.');
  if (!isResult(target)) throw new DomainError('Deuten lässt sich nur ein Ergebnis, keine Notiz oder Deutung.');
}

/**
 * Ändert den Text der Notiz oder Deutung an der Stelle `index`: Zeitpunkt, Stelle und das gedeutete
 * Ergebnis bleiben, `editedAt` ist jetzt. Der Text darf nicht leer sein; Leerraum am Rand fällt weg.
 */
export function editNote(log: readonly LogEntry[], index: number, text: string, clock: Clock): Note {
  const note = log[index];
  if (!note || note.kind !== 'note') throw new DomainError('Ändern lässt sich nur der Text einer Notiz oder Deutung.');
  const trimmed = text.trim();
  if (!trimmed) throw new DomainError('Eine Notiz braucht Text; zum Entfernen gibt es Löschen.');
  return trimmed === note.text ? note : { ...note, text: trimmed, editedAt: clock.now() };
}

/** Die Stellen der Deutungen, die das Ergebnis an der Stelle `index` hat. */
export function interpretationsOf(log: readonly LogEntry[], index: number): number[] {
  return log.flatMap((entry, i) => (entry.kind === 'note' && entry.interprets === index ? [i] : []));
}

/** Eine Frage ist freiwillig; eine leere Frage gibt es nicht. */
export function withQuestion<T extends object>(value: T, question: string | undefined): T & { question?: string } {
  const trimmed = question?.trim();
  return trimmed ? { ...value, question: trimmed } : value;
}

/**
 * Die Antwort aus einem Wurf 1–100 und einer Chance: Ja bis zur Chance. Ja! und Nein! nach der Fate
 * Chart von Mythic bei Chaosfaktor 5, also je ein Fünftel der Ja- bzw. Nein-Spanne am äußeren Rand;
 * Ja? und Nein? gespiegelt am inneren Rand (Hausregel). Allein aus Wurf und festgehaltener Chance,
 * nie aus dem heutigen Stand der Stufe.
 */
export function answerOf(roll: number, chance: number): Answer {
  const yes = Math.floor(chance / 5);
  const no = Math.floor((100 - chance) / 5);
  if (roll <= yes) return 'yesStrong';
  if (roll <= chance - yes) return 'yes';
  if (roll <= chance) return 'yesWeak';
  if (roll <= chance + no) return 'noWeak';
  if (roll <= 100 - no) return 'no';
  return 'noStrong';
}

/** Höchster Chaosfaktor, bis zu dem ein Pasch ein Zufallsereignis ist; die App führt ihn fest auf 5. */
export const CHAOS_FACTOR = 5;

/** `/randomEvent`: Der Orakelwurf ist ein Pasch bis zum Chaosfaktor (11, 22, 33, 44, 55), nach Mythic. */
export function isRandomEvent(roll: number): boolean {
  return roll % 11 === 0 && roll / 11 <= CHAOS_FACTOR;
}

/** Ob eine Antwort Ja ist (Ja!, Ja oder Ja?). */
export function isYesAnswer(answer: Answer): boolean {
  return answer === 'yesStrong' || answer === 'yes' || answer === 'yesWeak';
}

/** `/answer` einer Kartenauswahl; ohne gewählte Stufe keine. */
export function answerOfPick(pick: CardPick): Answer | undefined {
  return pick.oracle === undefined || pick.chance === undefined ? undefined : answerOf(pick.oracle, pick.chance);
}

/**
 * Macht aus einer Orakelantwort von vor 2026-11-14d eine Kartenauswahl ohne Felder: Frage, Wurf,
 * Stufe und Chance bleiben, ebenso die Stelle im Log und damit die Deutungen.
 */
export function upgradeOracle<T extends { readonly log: readonly LogEntry[] }>(campaign: T): T {
  const old = (entry: LogEntry): boolean => (entry as { readonly kind: string }).kind === 'oracle';
  if (!campaign.log.some(old)) return campaign;
  const log = campaign.log.map((entry): LogEntry => {
    if (!old(entry)) return entry;
    const { roll, question, ...rest } = entry as unknown as LegacyOracleAnswer;
    return withQuestion({ ...rest, kind: 'card', oracle: roll, items: [] } as CardPick, question);
  });
  return { ...campaign, log };
}

export function rollDice(random: Random, clock: Clock): DiceRoll {
  return { kind: 'dice', at: clock.now(), dice: roll2d6(random) };
}

/** `/total` */
export function totalOf(roll: DiceRoll): number {
  return sum(roll.dice);
}

/** `/in`: Das Feld folgt aus den Einträgen; alle gehören zu Spalten desselben Feldes. */
export function slotOf(item: PickedItem): Slot {
  return slotOfEntry(item.picked[0]!);
}

/** `/success`: Würfel + DM ≥ Zielwert, allein aus dem, was der Eintrag festhält. */
export function isSuccess(result: TaskResult | AttackResult): boolean {
  return sum(result.dice) + result.dm >= result.target;
}

/** Die Würfel eines Schadens, wie sie verteilt werden: fester Schaden (Tier) zählt wie ein Würfel. */
export function damageDiceOf(roll: DamageRoll): readonly number[] {
  return roll.fixed === undefined ? roll.dice : [roll.fixed];
}

/** `/damage`: die Summe der Schadenswürfel, bei einem Tier der feste Schaden. */
export function damageOf(roll: DamageRoll): number {
  if (roll.fixed !== undefined) return roll.fixed;
  return roll.dice.reduce((total, d) => total + d, 0);
}

/** Die Stellen der Schadenswürfe, die auf den Eintrag an der Stelle `index` verweisen; höchstens einer. */
export function damageRollsOf(log: readonly LogEntry[], index: number): number[] {
  return log.flatMap((entry, i) => (entry.kind === 'damage' && entry.of === index ? [i] : []));
}

/** Die Stelle des ersten Wurfs der Garbe, zu der der Angriff an der Stelle `index` gehört; allein ist er selbst der erste. */
export function volleyStart(log: readonly LogEntry[], index: number): number {
  const entry = log[index];
  return entry?.kind === 'attack' && entry.volley !== undefined ? entry.volley : index;
}

/** Die Stellen aller Würfe der Garbe, zu der der Angriff an der Stelle `index` gehört, der erste zuerst. */
export function volleyOf(log: readonly LogEntry[], index: number): number[] {
  const first = volleyStart(log, index);
  return log.flatMap((entry, i) => (i === first || (entry.kind === 'attack' && entry.volley === first) ? [i] : []));
}

/** `/neighbour`: Der Wurf gehört zu einer Garbe und trifft ein anderes Ziel als der erste. */
export function isNeighbour(log: readonly LogEntry[], index: number): boolean {
  const entry = log[index];
  if (entry?.kind !== 'attack' || entry.volley === undefined) return false;
  const first = log[entry.volley];
  if (first?.kind !== 'attack') return false;
  return entry.against !== first.against;
}
