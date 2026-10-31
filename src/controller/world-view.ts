import {
  ehex,
  hexAt,
  hexId,
  nextWorldRoll,
  replayHex,
  SECTOR_COLUMNS,
  SECTOR_ROWS,
  tradeCodesOf,
  uwpCode,
  uwpDigitOf,
  uwpKinds,
  worldLabel,
  type Hex,
  type UwpKind,
  type WorldDmPart,
  type WorldRoll,
  type WorldRollKind,
  type WorldRollOutcome,
  type WorldState,
  type WorldStep,
} from '../model';

/** Ein Feld der Karte. */
export interface HexView {
  /** Spalte und Zeile, z. B. 0304. */
  readonly id: string;
  readonly column: number;
  readonly row: number;
  /** Nicht erzeugt, in Erschaffung, leer oder mit fertiger Welt. */
  readonly state: 'open' | 'pending' | 'empty' | 'world';
  readonly name: string | undefined;
  /** Raumhafen als Buchstabe, sobald gewürfelt. */
  readonly starport: string | undefined;
  readonly navalBase: boolean;
  readonly scoutBase: boolean;
  readonly gasGiant: boolean;
  readonly size: number | undefined;
  readonly hydrographics: number | undefined;
  readonly population: number | undefined;
}

/** Eine Welt in der Liste unter der Karte. */
export interface WorldListItem {
  readonly id: string;
  readonly column: number;
  readonly row: number;
  readonly name: string;
  readonly uwp: string;
  readonly bases: string;
  readonly trade: readonly string[];
  readonly gasGiant: boolean;
}

/** Eine Zeile im Verlauf der Weltenerschaffung: ein Wurf mit dem, was er ergeben hat. */
export interface WorldLine {
  readonly index: number;
  readonly kind: WorldRollKind;
  readonly label: string;
  readonly dice: readonly number[];
  readonly dm: number;
  /** Woraus der DM besteht; ohne Namen ist es der feste Teil der Formel (−7). */
  readonly parts: readonly WorldDmPart[];
  readonly total: number;
  readonly target: number | undefined;
  readonly success: boolean | undefined;
  readonly result: string;
}

export type WorldAction =
  | { readonly kind: 'roll'; readonly label: string; readonly dice: 1 | 2; readonly parts: readonly WorldDmPart[]; readonly target: number | undefined }
  | { readonly kind: 'name' }
  | { readonly kind: 'done' };

/** Eine Stelle des UWP auf der Weltkarte. */
export interface ProfileItem {
  readonly kind: UwpKind;
  readonly label: string;
  /** Die Ziffer in eHex; fehlt, solange sie offen ist. */
  readonly code: string | undefined;
  /** Der Text aus den Charts; manche Ziffern haben keinen. */
  readonly text: string | undefined;
}

export interface WorldView {
  readonly id: string;
  readonly name: string | undefined;
  readonly step: WorldStep;
  readonly empty: boolean;
  /** Was als Nächstes dran ist, in Worten. */
  readonly prompt: string;
  readonly uwp: string;
  readonly profile: readonly ProfileItem[];
  /** `undefined`, solange es noch nicht feststeht. */
  readonly navalBase: boolean | undefined;
  readonly scoutBase: boolean | undefined;
  readonly gasGiant: boolean | undefined;
  readonly trade: readonly { readonly code: string; readonly name: string }[];
  readonly lines: readonly WorldLine[];
  readonly action: WorldAction;
  readonly error: string | undefined;
}

function yesNo(value: boolean | undefined): string {
  return value ? 'ja' : 'nein';
}

function resultOf(roll: WorldRoll, outcome: WorldRollOutcome): string {
  switch (roll.kind) {
    case 'occurrence':
      return outcome.success ? 'Welt' : 'leer';
    case 'navalBase':
    case 'scoutBase':
    case 'gasGiant':
      return yesNo(outcome.row?.[roll.kind]);
    default: {
      const value = outcome.value!;
      const text = uwpDigitOf(roll.kind, value)?.text;
      return text ? `${ehex(value)} · ${text}` : ehex(value);
    }
  }
}

function worldLines(hex: Hex, state: WorldState): readonly WorldLine[] {
  return hex.rolls.map((roll, index) => {
    const outcome = state.outcomes[index]!;
    return {
      index,
      kind: roll.kind,
      label: worldLabel(roll.kind),
      dice: roll.dice,
      dm: roll.dm,
      parts: outcome.parts,
      total: roll.dice.reduce((a, b) => a + b, 0) + roll.dm,
      target: roll.target,
      success: outcome.success,
      result: resultOf(roll, outcome),
    };
  });
}

/** Welche Basen eine Welt hat, wie in der Liste eines Subsektors: N für Marine, S für Scouts. */
function basesText(state: WorldState): string {
  return `${state.navalBase ? 'N' : ''}${state.scoutBase ? 'S' : ''}`;
}

/** Alle 80 Felder des Subsektors, spaltenweise. */
export function sectorView(hexes: readonly Hex[]): readonly HexView[] {
  const cells: HexView[] = [];
  for (let column = 1; column <= SECTOR_COLUMNS; column++) {
    for (let row = 1; row <= SECTOR_ROWS; row++) {
      const hex = hexAt(hexes, column, row);
      const state = hex ? replayHex(hex) : undefined;
      cells.push({
        id: hexId(column, row),
        column,
        row,
        state: !state ? 'open' : state.step !== 'done' ? 'pending' : state.empty ? 'empty' : 'world',
        name: hex?.name,
        starport: state?.uwp.starport === undefined ? undefined : ehex(state.uwp.starport),
        navalBase: state?.navalBase ?? false,
        scoutBase: state?.scoutBase ?? false,
        gasGiant: state?.gasGiant ?? false,
        size: state?.uwp.size,
        hydrographics: state?.uwp.hydrographics,
        population: state?.uwp.population,
      });
    }
  }
  return cells;
}

/** Die fertigen Welten, nach Feld, wie die Liste eines Subsektors. */
export function worldList(hexes: readonly Hex[]): readonly WorldListItem[] {
  return [...hexes]
    .sort((a, b) => a.column - b.column || a.row - b.row)
    .flatMap((hex) => {
      const state = replayHex(hex);
      if (state.step !== 'done' || state.empty) return [];
      return [
        {
          id: hexId(hex.column, hex.row),
          column: hex.column,
          row: hex.row,
          name: hex.name!,
          uwp: uwpCode(state),
          bases: basesText(state),
          trade: tradeCodesOf(state).map((t) => t.id),
          gasGiant: state.gasGiant ?? false,
        },
      ];
    });
}

const rollLabels: Record<WorldRollKind, string> = {
  occurrence: 'Vorkommen würfeln',
  starport: 'Raumhafen würfeln',
  navalBase: 'Marinebasis würfeln',
  scoutBase: 'Scoutbasis würfeln',
  gasGiant: 'Gasriese würfeln',
  size: 'Größe würfeln',
  atmosphere: 'Atmosphäre würfeln',
  hydrographics: 'Hydrographie würfeln',
  population: 'Bevölkerung würfeln',
  government: 'Regierung würfeln',
  law: 'Gesetz würfeln',
  tech: 'TL würfeln',
};

const prompts: Record<WorldRollKind, string> = {
  occurrence: 'Gibt es hier eine Welt? Bei 4+ ja',
  starport: 'Systeminhalt: Raumhafen',
  navalBase: 'Systeminhalt: Marinebasis (8+)',
  scoutBase: 'Systeminhalt: Scoutbasis (7+)',
  gasGiant: 'Systeminhalt: Gasriese (bis 9)',
  size: 'UWP: Größe, 2W6 − 2',
  atmosphere: 'UWP: Atmosphäre, 2W6 − 7 + Größe',
  hydrographics: 'UWP: Hydrographie, 2W6 − 7 + Größe',
  population: 'UWP: Bevölkerung, 2W6 − 2',
  government: 'UWP: Regierung, 2W6 − 7 + Bevölkerung',
  law: 'UWP: Gesetz, 2W6 − 7 + Regierung',
  tech: 'UWP: Tech Level, 1W6 + DMs',
};

/** Die Weltkarte eines Feldes, auch eines nicht erzeugten (dann ohne Würfe). */
export function worldView(hexes: readonly Hex[], column: number, row: number, error: string | undefined): WorldView {
  const hex: Hex = hexAt(hexes, column, row) ?? { column, row, rolls: [] };
  const state = replayHex(hex);
  const next = nextWorldRoll(state);
  const action: WorldAction = next
    ? { kind: 'roll', label: rollLabels[next.kind], dice: next.dice, parts: next.parts, target: next.target }
    : state.step === 'name'
      ? { kind: 'name' }
      : { kind: 'done' };
  const prompt = next ? prompts[next.kind] : state.step === 'name' ? 'Fertig gewürfelt: Namen eingeben und übernehmen' : state.empty ? 'Kein System in diesem Feld' : '';
  return {
    id: hexId(column, row),
    name: hex.name,
    step: state.step,
    empty: state.empty,
    prompt,
    uwp: uwpCode(state),
    profile: uwpKinds.map((kind) => {
      const value = state.uwp[kind];
      return { kind, label: worldLabel(kind), code: value === undefined ? undefined : ehex(value), text: value === undefined ? undefined : uwpDigitOf(kind, value)?.text };
    }),
    navalBase: state.navalBase,
    scoutBase: state.scoutBase,
    gasGiant: state.gasGiant,
    trade: tradeCodesOf(state).map((t) => ({ code: t.id, name: t.name })),
    lines: worldLines(hex, state),
    action,
    error,
  };
}
