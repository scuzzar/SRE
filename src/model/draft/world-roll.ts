import {
  diceCount,
  DomainError,
  enterRoll,
  hexAt,
  hexId,
  occurrenceHex,
  OCCURRENCE_TARGET,
  putHex,
  stepOf,
  systemRow,
  worldDmParts,
  type Hex,
  type Random,
  type SystemContents,
  type WorldDmPart,
  type WorldRollKind,
} from '..';

/**
 * Ein Wurf der Weltenerschaffung. Flüchtig: Er trägt sein Ergebnis ins Hexfeld ein und wird nicht
 * gespeichert. Die Weltkarte zeigt die Würfe, die man gemacht hat, seit sie offen ist.
 */
export interface WorldRoll {
  readonly kind: WorldRollKind;
  /** Ein oder zwei Würfel. */
  readonly dice: readonly number[];
  readonly dm: number;
  /** Beim Vorkommen. */
  readonly target?: number;
  /** Woraus der DM bestand, mit Namen. */
  readonly parts: readonly WorldDmPart[];
  /** Der Wert, den der Wurf eingetragen hat: eine Stelle des UWP. */
  readonly value: number | undefined;
  /** Beim Vorkommen: gibt es eine Welt? */
  readonly success: boolean | undefined;
  /** Bei Raumhafen, Basen und Gasriese: die Zeile der System Contents Table. */
  readonly row: SystemContents | undefined;
}

export function totalOf(roll: Pick<WorldRoll, 'dice' | 'dm'>): number {
  return roll.dice.reduce((a, b) => a + b, 0) + roll.dm;
}

/** Was der nächste Wurf eines Hexfeldes braucht: Würfel und DM in Teilen; beim Namen oder fertig nichts. */
export function nextWorldRoll(hex: Hex): { readonly kind: WorldRollKind; readonly dice: 1 | 2; readonly parts: readonly WorldDmPart[] } | undefined {
  const step = stepOf(hex);
  if (step === 'name' || step === 'done') return undefined;
  return { kind: step, dice: diceCount(step), parts: worldDmParts(hex, step) };
}

function dice(count: number, random: Random): number[] {
  return Array.from({ length: count }, () => random.int(1, 6));
}

/** Würfelt das Vorkommen eines nicht erzeugten Feldes; damit entsteht das Hexfeld, leer oder mit Welt. */
export function rollOccurrence(hexes: readonly Hex[], column: number, row: number, random: Random): { hexes: readonly Hex[]; roll: WorldRoll } {
  if (hexAt(hexes, column, row)) throw new DomainError(`Das Feld ${hexId(column, row)} ist schon erzeugt.`);
  const roll = { kind: 'occurrence' as const, dice: dice(1, random), dm: 0, target: OCCURRENCE_TARGET };
  const hex = occurrenceHex(column, row, totalOf(roll), roll.target);
  return { hexes: putHex(hexes, hex), roll: { ...roll, parts: [], value: undefined, success: !hex.empty, row: undefined } };
}

/** Würfelt den nächsten Wurf einer Welt in Erschaffung und trägt sein Ergebnis ein. */
export function rollWorld(hexes: readonly Hex[], column: number, row: number, random: Random): { hexes: readonly Hex[]; roll: WorldRoll } {
  const hex = hexAt(hexes, column, row);
  if (!hex) throw new DomainError(`Für das Feld ${hexId(column, row)} erst das Vorkommen würfeln.`);
  const next = nextWorldRoll(hex);
  if (!next) throw new DomainError(`Für das Feld ${hexId(column, row)} gibt es nichts mehr zu würfeln.`);
  const thrown = { kind: next.kind, dice: dice(next.dice, random), dm: next.parts.reduce((sum, p) => sum + p.dm, 0) };
  const after = enterRoll(hex, next.kind, totalOf(thrown));
  const kind = next.kind;
  const table = kind === 'starport' || kind === 'navalBase' || kind === 'scoutBase' || kind === 'gasGiant';
  const value = kind === 'navalBase' || kind === 'scoutBase' || kind === 'gasGiant' || kind === 'occurrence' ? undefined : after.uwp[kind];
  return {
    hexes: putHex(hexes, after),
    roll: { ...thrown, parts: next.parts, value, success: undefined, row: table ? systemRow(totalOf(thrown)) : undefined },
  };
}
