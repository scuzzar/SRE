import { EHEX, uwpKinds, type SystemContents, type TradeCode, type UwpDigit, type UwpKind } from '../data';
import { DomainError } from './errors';
import type { Random } from './ports';
import { ref } from './reference';

export { EHEX, uwpKinds, type SystemContents, type TradeCode, type UwpDigit, type UwpKind } from '../data';

/** Der Subsektor hat 8 Spalten und 10 Zeilen wie TAS Form 6. */
export const SECTOR_COLUMNS = 8;
export const SECTOR_ROWS = 10;
/** Eine Welt gibt es bei 4+ auf 1W6 (World Generation Checklist, „standard“). */
export const OCCURRENCE_TARGET = 4;
/** Die Hydrographie geht nicht über A: keine Landmassen. */
export const MAX_HYDROGRAPHICS = 10;

export type WorldRollKind = 'occurrence' | 'navalBase' | 'scoutBase' | 'gasGiant' | UwpKind;

/** Was in der Weltenerschaffung als Nächstes dran ist: ein Wurf, der Name, oder fertig. */
export type WorldStep = WorldRollKind | 'name' | 'done';

/** Ein Wurf der Weltenerschaffung. Er hält Art, Würfel und DM fest, das Vorkommen auch seinen Zielwert. */
export interface WorldRoll {
  readonly kind: WorldRollKind;
  /** Ein oder zwei Würfel. */
  readonly dice: readonly number[];
  readonly dm: number;
  readonly target?: number;
}

/**
 * Ein erzeugtes Hexfeld des Subsektors. Es hält nur seine Würfe und den Namen der Welt; alles andere
 * folgt aus dem Nachspielen (`replayHex`). Fehlt ein Hexfeld, ist es nicht erzeugt.
 */
export interface Hex {
  readonly column: number;
  readonly row: number;
  readonly name?: string;
  readonly rolls: readonly WorldRoll[];
}

/** Woraus der DM eines Wurfs besteht, mit Namen: „Größe +7“, „Raumhafen A +6“. */
export interface WorldDmPart {
  readonly label: string;
  readonly dm: number;
}

/** Was ein Wurf ergeben hat. */
export interface WorldRollOutcome {
  /** Der Wert einer Stelle des UWP. */
  readonly value: number | undefined;
  /** Beim Vorkommen: gibt es eine Welt? */
  readonly success: boolean | undefined;
  /** Bei Raumhafen, Basen und Gasriese: die Zeile der System Contents Table. */
  readonly row: SystemContents | undefined;
  /** Woraus der DM bestand, nach dem heutigen Stand der Tabellen; der Wurf selbst hält nur die Summe. */
  readonly parts: readonly WorldDmPart[];
}

/** Der Stand nach dem Nachspielen eines Hexfeldes. */
export interface WorldState {
  readonly step: WorldStep;
  /** Der erste Wurf hat keine Welt ergeben. */
  readonly empty: boolean;
  /** Die Stellen des UWP, soweit sie feststehen (auch ohne Wurf, etwa Atmosphäre 0 bei Größe 0). */
  readonly uwp: Readonly<Partial<Record<UwpKind, number>>>;
  /** `undefined`, solange es noch nicht feststeht. */
  readonly navalBase: boolean | undefined;
  readonly scoutBase: boolean | undefined;
  readonly gasGiant: boolean | undefined;
  readonly outcomes: readonly WorldRollOutcome[];
}

/** Die Ziffer in eHex, wie das UWP sie schreibt: 10 → A, 31 → X. */
export function ehex(value: number): string {
  return EHEX[value] ?? '?';
}

/** Der Name eines Feldes aus Spalte und Zeile: 0304. */
export function hexId(column: number, row: number): string {
  return `${String(column).padStart(2, '0')}${String(row).padStart(2, '0')}`;
}

export function hexAt(hexes: readonly Hex[], column: number, row: number): Hex | undefined {
  return hexes.find((h) => h.column === column && h.row === row);
}

/** Die Ziffer einer Stelle des UWP; fehlt sie in den Charts, gibt es keinen Text und keinen DM. */
export function uwpDigitOf(kind: UwpKind, value: number): UwpDigit | undefined {
  return ref.worlds.uwpDigits[kind].find((d) => d.digit === value);
}

function diceCount(kind: WorldRollKind): 1 | 2 {
  return kind === 'occurrence' || kind === 'tech' ? 1 : 2;
}

const labels: Record<WorldRollKind, string> = {
  occurrence: 'Vorkommen',
  starport: 'Raumhafen',
  navalBase: 'Marinebasis',
  scoutBase: 'Scoutbasis',
  gasGiant: 'Gasriese',
  size: 'Größe',
  atmosphere: 'Atmosphäre',
  hydrographics: 'Hydrographie',
  population: 'Bevölkerung',
  government: 'Regierung',
  law: 'Gesetz',
  tech: 'TL',
};

/** Wie ein Wurf oder eine Stelle des UWP heißt. */
export function worldLabel(kind: WorldRollKind): string {
  return labels[kind];
}

function sumOf(roll: WorldRoll): number {
  return roll.dice.reduce((a, b) => a + b, 0);
}

function systemRow(total: number): SystemContents {
  return ref.worlds.systemContents[Math.min(12, Math.max(2, total)) - 2]!;
}

/** Wo der Spielstand gerade steht, während nachgespielt wird. */
interface Progress {
  empty: boolean;
  occurrence: boolean;
  uwp: Partial<Record<UwpKind, number>>;
  navalBase: boolean | undefined;
  scoutBase: boolean | undefined;
  gasGiant: boolean | undefined;
}

/** Der nächste Wurf, oder `name`, wenn alle Würfe da sind. */
function nextStep(p: Progress): WorldStep {
  if (!p.occurrence) return 'occurrence';
  if (p.empty) return 'done';
  const { uwp } = p;
  if (uwp.starport === undefined) return 'starport';
  if (p.navalBase === undefined) return 'navalBase';
  if (p.scoutBase === undefined) return 'scoutBase';
  if (p.gasGiant === undefined) return 'gasGiant';
  for (const kind of uwpKinds) if (uwp[kind] === undefined) return kind;
  return 'name';
}

/** Setzt, was ohne Wurf feststeht: keine Basis bei manchen Raumhäfen, Atmosphäre und Hydrographie bei kleinen Welten. */
function settle(p: Progress): void {
  const { uwp } = p;
  const port = uwp.starport === undefined ? undefined : ehex(uwp.starport);
  if (port !== undefined && p.navalBase === undefined && !['A', 'B'].includes(port)) p.navalBase = false;
  if (port !== undefined && p.scoutBase === undefined && ['E', 'X'].includes(port)) p.scoutBase = false;
  if (uwp.size === 0 && uwp.atmosphere === undefined) uwp.atmosphere = 0;
  if (uwp.size !== undefined && uwp.size <= 1 && uwp.hydrographics === undefined) uwp.hydrographics = 0;
}

/** Der DM des nächsten Wurfs in Teilen; die Summe ist der DM, den der Wurf festhält. */
export function worldDmParts(state: Pick<WorldState, 'uwp'>, kind: WorldRollKind): readonly WorldDmPart[] {
  const { uwp } = state;
  const value = (k: UwpKind) => uwp[k] ?? 0;
  switch (kind) {
    case 'scoutBase': {
      const dm = { A: -3, B: -2, C: -1 }[ehex(value('starport'))] ?? 0;
      return dm === 0 ? [] : [{ label: `Raumhafen ${ehex(value('starport'))}`, dm }];
    }
    case 'size':
    case 'population':
      return [{ label: '', dm: -2 }];
    case 'atmosphere':
    case 'hydrographics': {
      const parts = [
        { label: '', dm: -7 },
        { label: `Größe ${ehex(value('size'))}`, dm: value('size') },
      ];
      const atmosphere = value('atmosphere');
      if (kind === 'hydrographics' && (atmosphere <= 1 || atmosphere >= 10)) parts.push({ label: `Atmosphäre ${ehex(atmosphere)}`, dm: -4 });
      return parts;
    }
    case 'government':
      return [
        { label: '', dm: -7 },
        { label: `Bevölkerung ${ehex(value('population'))}`, dm: value('population') },
      ];
    case 'law':
      return [
        { label: '', dm: -7 },
        { label: `Regierung ${ehex(value('government'))}`, dm: value('government') },
      ];
    case 'tech':
      return uwpKinds
        .filter((k) => k !== 'law' && k !== 'tech')
        .flatMap((k) => {
          const dm = uwpDigitOf(k, value(k))?.techDm ?? 0;
          return dm === 0 ? [] : [{ label: `${labels[k]} ${ehex(value(k))}`, dm }];
        });
    default:
      return [];
  }
}

/** Was ein Wurf für den Stand bedeutet; `parts` nach dem Stand vor dem Wurf. */
function apply(p: Progress, roll: WorldRoll, parts: readonly WorldDmPart[]): WorldRollOutcome {
  const total = sumOf(roll) + roll.dm;
  const none = { value: undefined, success: undefined, row: undefined, parts };
  switch (roll.kind) {
    case 'occurrence': {
      const success = total >= (roll.target ?? OCCURRENCE_TARGET);
      p.occurrence = true;
      p.empty = !success;
      return { ...none, success };
    }
    case 'navalBase':
    case 'scoutBase':
    case 'gasGiant': {
      const row = systemRow(total);
      p[roll.kind] = row[roll.kind];
      return { ...none, row };
    }
    case 'starport': {
      const row = systemRow(total);
      const value = EHEX.indexOf(row.starport);
      p.uwp.starport = value;
      return { ...none, row, value };
    }
    default: {
      const value = Math.max(0, roll.kind === 'hydrographics' ? Math.min(MAX_HYDROGRAPHICS, total) : total);
      p.uwp[roll.kind] = value;
      return { ...none, value };
    }
  }
}

/**
 * Spielt die Würfe eines Hexfeldes der Reihe nach nach und prüft sie gegen die Regeln: Jeder Wurf
 * muss der sein, der als Nächstes dran ist, mit so vielen Würfeln, wie er braucht.
 */
export function replayHex(hex: Pick<Hex, 'rolls' | 'name'>): WorldState {
  const p: Progress = { empty: false, occurrence: false, uwp: {}, navalBase: undefined, scoutBase: undefined, gasGiant: undefined };
  const outcomes: WorldRollOutcome[] = [];
  for (const roll of hex.rolls) {
    const step = nextStep(p);
    if (roll.kind !== step) throw new DomainError(`Ein Wurf „${roll.kind}“ passt nicht zum Schritt „${step}“.`);
    const count = diceCount(roll.kind);
    if (roll.dice.length !== count || roll.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
      throw new DomainError(`Ein Wurf „${roll.kind}“ hat ${count === 1 ? 'einen Würfel' : 'zwei Würfel'} von 1 bis 6.`);
    }
    if (!Number.isInteger(roll.dm)) throw new DomainError('Ein DM ist eine ganze Zahl.');
    outcomes.push(apply(p, roll, worldDmParts(p, roll.kind)));
    settle(p);
  }
  let step = nextStep(p);
  if (hex.name !== undefined) {
    if (step !== 'name') throw new DomainError('Nur eine fertig gewürfelte Welt hat einen Namen.');
    if (!hex.name.trim()) throw new DomainError('Die Welt braucht einen Namen.');
    step = 'done';
  }
  return { step, empty: p.empty, uwp: { ...p.uwp }, navalBase: p.navalBase, scoutBase: p.scoutBase, gasGiant: p.gasGiant, outcomes };
}

/** Die Handelscodes einer fertigen Welt: jeder, dessen Bedingungen alle erfüllt sind. */
export function tradeCodesOf(state: WorldState): readonly TradeCode[] {
  if (state.empty || uwpKinds.some((k) => state.uwp[k] === undefined)) return [];
  return ref.worlds.tradeCodes.filter((code) => code.if.every((c) => c.digits.includes(state.uwp[c.of]!)));
}

/** Das UWP in der üblichen Schreibweise, z. B. A788899-C; offene Stellen als „?“. */
export function uwpCode(state: WorldState): string {
  const digit = (k: UwpKind) => (state.uwp[k] === undefined ? '?' : ehex(state.uwp[k]));
  return `${uwpKinds.slice(0, -1).map(digit).join('')}-${digit('tech')}`;
}

/** Was der nächste Wurf braucht: Würfel, DM in Teilen und beim Vorkommen den Zielwert. */
export function nextWorldRoll(state: WorldState): { readonly kind: WorldRollKind; readonly dice: 1 | 2; readonly parts: readonly WorldDmPart[]; readonly target: number | undefined } | undefined {
  const step = state.step;
  if (step === 'name' || step === 'done') return undefined;
  return { kind: step, dice: diceCount(step), parts: worldDmParts(state, step), target: step === 'occurrence' ? OCCURRENCE_TARGET : undefined };
}

function checkPosition(column: number, row: number): void {
  if (!Number.isInteger(column) || !Number.isInteger(row) || column < 1 || column > SECTOR_COLUMNS || row < 1 || row > SECTOR_ROWS) {
    throw new DomainError(`Das Feld ${hexId(column, row)} liegt nicht im Subsektor.`);
  }
}

function replaceHex(hexes: readonly Hex[], hex: Hex): readonly Hex[] {
  const others = hexes.filter((h) => h.column !== hex.column || h.row !== hex.row);
  return [...others, hex];
}

function appendRoll(hexes: readonly Hex[], hex: Hex, random: Random): readonly Hex[] {
  const next = nextWorldRoll(replayHex(hex));
  if (!next) throw new DomainError(`Für das Feld ${hexId(hex.column, hex.row)} gibt es nichts mehr zu würfeln.`);
  const dice = Array.from({ length: next.dice }, () => random.int(1, 6));
  const dm = next.parts.reduce((sum, part) => sum + part.dm, 0);
  const roll: WorldRoll = next.target === undefined ? { kind: next.kind, dice, dm } : { kind: next.kind, dice, dm, target: next.target };
  return replaceHex(hexes, { ...hex, rolls: [...hex.rolls, roll] });
}

/** Würfelt das Vorkommen eines nicht erzeugten Feldes; damit entsteht das Hexfeld, leer oder mit Welt. */
export function rollOccurrence(hexes: readonly Hex[], column: number, row: number, random: Random): readonly Hex[] {
  checkPosition(column, row);
  if (hexAt(hexes, column, row)) throw new DomainError(`Das Feld ${hexId(column, row)} ist schon erzeugt.`);
  return appendRoll(hexes, { column, row, rolls: [] }, random);
}

/** Würfelt den nächsten Wurf einer Welt in Erschaffung. */
export function rollWorld(hexes: readonly Hex[], column: number, row: number, random: Random): readonly Hex[] {
  const hex = hexAt(hexes, column, row);
  if (!hex) throw new DomainError(`Für das Feld ${hexId(column, row)} erst das Vorkommen würfeln.`);
  return appendRoll(hexes, hex, random);
}

/** Gibt der fertig gewürfelten Welt ihren Namen; danach ist sie fertig. */
export function nameWorld(hexes: readonly Hex[], column: number, row: number, name: string): readonly Hex[] {
  const hex = hexAt(hexes, column, row);
  if (!hex || replayHex(hex).step !== 'name') throw new DomainError('Erst alles würfeln, dann den Namen geben.');
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError('Die Welt braucht einen Namen.');
  return replaceHex(hexes, { ...hex, name: trimmed });
}

/** Verwirft eine Welt in Erschaffung: Das Feld ist wieder nicht erzeugt. Fertiges bleibt. */
export function discardWorld(hexes: readonly Hex[], column: number, row: number): readonly Hex[] {
  const hex = hexAt(hexes, column, row);
  if (!hex) return hexes;
  if (replayHex(hex).step === 'done') throw new DomainError('Ein fertiges Feld lässt sich nicht verwerfen.');
  return hexes.filter((h) => h !== hex);
}

/** Prüft die Hexfelder einer Kampagne: im Subsektor, je Feld höchstens eins, jedes mit mindestens einem Wurf. */
export function validateHexes(hexes: readonly Hex[]): void {
  const seen = new Set<string>();
  for (const hex of hexes) {
    checkPosition(hex.column, hex.row);
    const id = hexId(hex.column, hex.row);
    if (seen.has(id)) throw new DomainError(`Das Feld ${id} kommt doppelt vor.`);
    seen.add(id);
    if (hex.rolls.length === 0) throw new DomainError(`Das Feld ${id} hat keinen Wurf.`);
    replayHex(hex);
  }
}
