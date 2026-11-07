import type { CharacterId } from './campaign';
import { DomainError } from './errors';
import type { MapIcon, Scatter } from './card-roll';
import type { Clock, Random } from './ports';
import { oddsOf, slotOfEntry, type ArmorClass, type Range, type Slot } from './reference';
import { roll2d6, sum, type Characteristic, type Dice } from './rules';

/**
 * Der Log verweist, er kopiert nicht. Ein Eintrag hält nur fest, was allein ihm gehört: Frage,
 * Text einer Notiz oder Deutung, Zeitpunkt und Würfel, beim Orakel dazu die Chance, bei Probe und Angriff DM und Zielwert.
 * Einträge werden nur angehängt, nie geändert; löschen lässt sich ein Eintrag nur ganz.
 */
export type LogEntry = OracleAnswer | DiceRoll | CardPick | TaskResult | AttackResult | DamageRoll | Recovery | Note;

/** Ein Ergebnis: was Orakel, Würfel oder Karte liefern. Nur ein Ergebnis lässt sich deuten. */
export type LogResult = Exclude<LogEntry, Note>;

interface LogEntryBase {
  /** Zeitpunkt als ISO-8601-Zeitstempel. */
  readonly at: string;
}

export interface OracleAnswer extends LogEntryBase {
  readonly kind: 'oracle';
  readonly question?: string;
  /** Wurf von 1 bis 100. */
  readonly roll: number;
  /** Die Chance der Stufe zum Zeitpunkt des Wurfs. */
  readonly chance: number;
  /** Verweis auf die Stufe. */
  readonly odds: string;
}

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
  /** In der Reihenfolge der Karte. Zusammen mit den Wurffeldern mindestens einer. */
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
 * Angreifer ist ein SC (`for`) oder ein NSC einer Begegnung (`by`), genau einer; das Ziel, wenn es
 * eines gibt, ein NSC (`against`) oder ein SC (`victim`). `target` ist der Zielwert.
 */
export interface AttackResult extends LogEntryBase {
  readonly kind: 'attack';
  readonly for?: CharacterId;
  readonly by?: string;
  readonly against?: string;
  readonly victim?: CharacterId;
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
}

/**
 * Der Schadenswurf zu einem Treffer: so viele W6, wie die Waffe `wounds` hat. `of` ist im Code die
 * Stelle des Treffers im Log; sie liegt immer davor.
 */
export interface DamageRoll extends LogEntryBase {
  readonly kind: 'damage';
  readonly of: number;
  readonly dice: readonly number[];
  /** Bei einem Treffer mit Ziel: je Würfel das Attribut, auf das er geht. */
  readonly to?: readonly PhysicalCharacteristic[];
}

/** Aufwachen, Behandlung, Ruhe (S. 7). */
export const recoveryKinds = ['wake', 'treatment', 'rest'] as const;
export type RecoveryKind = (typeof recoveryKinds)[number];

/**
 * Eine Heilung: nimmt Wunden eines SC (`for`) oder NSC (`npc`) zurück, genau eines. Bei der
 * Behandlung der Behandelnde (`by`), bei einer schweren Wunde die 5W6 Tage (`dice`). `how` ist im
 * Modell `kind`.
 */
export interface Recovery extends LogEntryBase {
  readonly kind: 'recovery';
  readonly how: RecoveryKind;
  readonly for?: CharacterId;
  readonly npc?: string;
  readonly by?: CharacterId;
  readonly dice?: readonly number[];
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

/** Die Stellen der Deutungen, die das Ergebnis an der Stelle `index` hat. */
export function interpretationsOf(log: readonly LogEntry[], index: number): number[] {
  return log.flatMap((entry, i) => (entry.kind === 'note' && entry.interprets === index ? [i] : []));
}

/** Eine Frage ist freiwillig; eine leere Frage gibt es nicht. */
export function withQuestion<T extends object>(value: T, question: string | undefined): T & { question?: string } {
  const trimmed = question?.trim();
  return trimmed ? { ...value, question: trimmed } : value;
}

/** Fragt das Orakel: ein Wurf von 1 bis 100, Ja bis zur Chance der Stufe. */
export function askOracle(oddsId: string, random: Random, clock: Clock, question?: string): OracleAnswer {
  const odds = oddsOf(oddsId);
  const answer: OracleAnswer = { kind: 'oracle', at: clock.now(), roll: random.int(1, 100), chance: odds.chance, odds: odds.id };
  return withQuestion(answer, question);
}

/** `/yes`: allein aus Wurf und festgehaltener Chance, nie aus dem heutigen Stand der Stufe. */
export function isYes(answer: OracleAnswer): boolean {
  return answer.roll <= answer.chance;
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

/** `/damage`: die Summe der Schadenswürfel. */
export function damageOf(roll: DamageRoll): number {
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
  return entry.against !== first.against || entry.victim !== first.victim;
}
