import type { CharacterId } from './campaign';
import type { Clock, Random } from './ports';
import { oddsOf, slotOfEntry, type Slot } from './reference';
import { roll2d6, sum, type Characteristic, type Dice } from './rules';

/**
 * Der Log verweist, er kopiert nicht. Ein Eintrag hält nur fest, was allein ihm gehört: Frage,
 * Zeitpunkt und Würfel, beim Orakel dazu die Chance, bei einer Probe DM und Zielwert.
 * Einträge werden nur angehängt, nie geändert oder gelöscht.
 */
export type LogEntry = OracleAnswer | DiceRoll | CardPick | TaskResult;

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
  /** In der Reihenfolge der Karte, mindestens einer. */
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
export function isSuccess(result: TaskResult): boolean {
  return sum(result.dice) + result.dm >= result.target;
}
