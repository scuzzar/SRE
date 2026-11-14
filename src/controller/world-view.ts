import {
  ehex,
  hexAt,
  hexId,
  isWorld,
  OCCURRENCE_TARGET,
  SECTOR_COLUMNS,
  SECTOR_ROWS,
  nextWorldAction,
  onlyArchipelagos,
  onlyLakes,
  stepOf,
  temperatureOf,
  tradeCodesOf,
  uwpCode,
  uwpDigitOf,
  uwpKinds,
  worldLabel,
  type Hex,
  type Surface,
  type UwpKind,
  type WorldDmPart,
  type WorldRollKind,
  type WorldStep,
} from '../model';
import { nextWorldRoll, totalOf, type WorldRoll } from '../model/draft';

/**
 * Was das Weltsymbol braucht: die Stellen des UWP, die man sieht, Wasseranteil, Temperatur und
 * Leben. `seed` (das Feld) legt fest, wo Kontinente und Städte liegen, damit jede Welt anders aussieht.
 * In der Weltenerschaffung fehlt, was noch nicht gewürfelt ist; das Symbol zeigt es grau.
 */
export interface WorldLook {
  readonly seed: string;
  readonly size: number;
  readonly atmosphere: number | undefined;
  readonly hydrographics: number | undefined;
  /** Wasseranteil 0 bis 1: aus der Oberfläche, sonst aus der Hydrographie. */
  readonly water: number | undefined;
  readonly population: number | undefined;
  readonly tech: number | undefined;
  readonly temperature: 'frozen' | 'cold' | 'temperate' | 'hot' | 'boiling' | undefined;
  readonly life: boolean | undefined;
}

/**
 * Das Weltsymbol: für eine fertige Welt vollständig, für eine Welt in Erschaffung ab der Größe mit
 * dem, was schon gewürfelt ist; sonst `undefined`.
 */
export function lookOf(hex: Hex | undefined): WorldLook | undefined {
  if (!hex || hex.empty || hex.uwp.size === undefined) return undefined;
  if (hexState(hex) !== 'world') {
    const { size, atmosphere, hydrographics, population, tech } = hex.uwp;
    return {
      seed: hexId(hex.column, hex.row),
      size,
      atmosphere,
      hydrographics,
      water: hex.surface ? hex.surface.water / 100 : undefined,
      population,
      tech,
      temperature: hex.temperature,
      life: hex.surface?.life,
    };
  }
  const { size = 0, atmosphere = 0, hydrographics = 0, population = 0, tech = 0 } = hex.uwp;
  return {
    seed: hexId(hex.column, hex.row),
    size,
    atmosphere,
    hydrographics,
    water: hex.surface ? hex.surface.water / 100 : hydrographics >= 10 ? 0.985 : hydrographics / 10,
    population,
    tech,
    // Welten von vor der Temperatur gelten als gemäßigt, Welten von vor der Oberfläche als belebt,
    // wenn Luft und Wasser es erlauben.
    temperature: hex.temperature ?? 'temperate',
    life: hex.surface?.life ?? (atmosphere >= 2 && atmosphere <= 9 && hydrographics > 0),
  };
}

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
  /** Das UWP einer fertigen Welt, z. B. C788545-7. */
  readonly uwp: string | undefined;
  /** Die Handelscodes einer fertigen Welt, z. B. Ag Ni. */
  readonly trade: readonly string[];
  /** Das Weltsymbol einer fertigen Welt. */
  readonly look: WorldLook | undefined;
}

/** Das gewählte Feld auf der Karte: noch nicht erzeugt, oder mit seinem Vorkommen. */
export interface SelectedHexView {
  readonly id: string;
  readonly column: number;
  readonly row: number;
  /** Nicht erzeugt: Vorkommen würfeln. Sonst steht da, was es ergeben hat. */
  readonly state: HexView['state'];
  /** Ab welchem Wurf auf 1W6 es eine Welt gibt. */
  readonly target: number;
  /** Der Wurf auf das Vorkommen, sobald gewürfelt. */
  readonly occurrence: WorldLine | undefined;
  readonly error: string | undefined;
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
  /** Die erste Zeile der Notiz zur Welt, falls es eine gibt. */
  readonly note: string | undefined;
  readonly look: WorldLook;
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
  | { readonly kind: 'surface'; readonly label: string }
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

/** Die Temperatur auf der Weltkarte. */
export interface TemperatureView {
  readonly name: string;
  /** Die mittlere Temperatur, z. B. „0 bis 30 °C“. */
  readonly average: string;
  readonly text: string;
  /** Bei Atmosphäre 0 oder 1 schwankt sie stark zwischen Tag und Nacht. */
  readonly swings: boolean;
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
  /** `undefined`, solange sie noch nicht feststeht, und bei Welten von vor der Temperatur. */
  readonly temperature: TemperatureView | undefined;
  /** Die Oberfläche in Worten, je Zeile ein Wert; `undefined`, solange sie fehlt. */
  readonly surface: readonly string[] | undefined;
  readonly trade: readonly { readonly code: string; readonly name: string }[];
  readonly lines: readonly WorldLine[];
  readonly action: WorldAction;
  readonly error: string | undefined;
  /** Die Notiz zur Welt; `undefined`, solange keine geschrieben ist. */
  readonly note: string | undefined;
  /** Nur eine fertige Welt hat eine Notiz. */
  readonly canNote: boolean;
  /** Das Weltsymbol, sobald die Welt fertig ist. */
  readonly look: WorldLook | undefined;
}

function yesNo(value: boolean | undefined): string {
  return value ? 'ja' : 'nein';
}

function resultOf(roll: WorldRoll): string {
  switch (roll.kind) {
    case 'occurrence':
      return roll.success ? 'Welt' : 'leer';
    case 'navalBase':
    case 'scoutBase':
    case 'gasGiant':
      return yesNo(roll.row?.[roll.kind]);
    case 'temperature':
      return `${roll.temperature!.name} · ${roll.temperature!.average}`;
    default: {
      const value = roll.value!;
      const text = uwpDigitOf(roll.kind, value)?.text;
      return text ? `${ehex(value)} · ${text}` : ehex(value);
    }
  }
}

/** Ein Wurf als Zeile; `index` zählt die Würfe, seit die Weltkarte offen ist. */
function worldLine(roll: WorldRoll, index: number): WorldLine {
  return {
    index,
    kind: roll.kind,
    label: worldLabel(roll.kind),
    dice: roll.dice,
    dm: roll.dm,
    parts: roll.parts,
    total: totalOf(roll),
    target: roll.target,
    success: roll.success,
    result: resultOf(roll),
  };
}

/** Welche Basen eine Welt hat, wie in der Liste eines Subsektors: N für Marine, S für Scouts. */
function basesText(hex: Hex): string {
  return `${hex.navalBase ? 'N' : ''}${hex.scoutBase ? 'S' : ''}`;
}

function hexState(hex: Hex | undefined): HexView['state'] {
  if (!hex) return 'open';
  if (hex.empty) return 'empty';
  return stepOf(hex) === 'done' ? 'world' : 'pending';
}

/** Alle 80 Felder des Subsektors, spaltenweise. */
export function sectorView(hexes: readonly Hex[]): readonly HexView[] {
  const cells: HexView[] = [];
  for (let column = 1; column <= SECTOR_COLUMNS; column++) {
    for (let row = 1; row <= SECTOR_ROWS; row++) {
      const hex = hexAt(hexes, column, row);
      cells.push({
        id: hexId(column, row),
        column,
        row,
        state: hexState(hex),
        name: hex?.name,
        starport: hex?.uwp.starport === undefined ? undefined : ehex(hex.uwp.starport),
        navalBase: hex?.navalBase ?? false,
        scoutBase: hex?.scoutBase ?? false,
        gasGiant: hex?.gasGiant ?? false,
        size: hex?.uwp.size,
        hydrographics: hex?.uwp.hydrographics,
        population: hex?.uwp.population,
        uwp: hex && hexState(hex) === 'world' ? uwpCode(hex.uwp) : undefined,
        trade: hex && hexState(hex) === 'world' ? tradeCodesOf(hex).map((t) => t.id) : [],
        look: lookOf(hex),
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
      if (hexState(hex) !== 'world') return [];
      return [
        {
          id: hexId(hex.column, hex.row),
          column: hex.column,
          row: hex.row,
          name: hex.name!,
          uwp: uwpCode(hex.uwp),
          bases: basesText(hex),
          trade: tradeCodesOf(hex).map((t) => t.id),
          gasGiant: hex.gasGiant ?? false,
          note: hex.note?.split('\n')[0],
          look: lookOf(hex)!,
        },
      ];
    });
}

/** Das gewählte Feld; `occurrence` ist das Vorkommen, wenn es gerade hier gewürfelt wurde. */
export function selectedView(hexes: readonly Hex[], column: number, row: number, occurrence: WorldRoll | undefined, error: string | undefined): SelectedHexView {
  return {
    id: hexId(column, row),
    column,
    row,
    state: hexState(hexAt(hexes, column, row)),
    target: OCCURRENCE_TARGET,
    occurrence: occurrence && worldLine(occurrence, 0),
    error,
  };
}

const rollLabels: Record<WorldRollKind, string> = {
  occurrence: 'Vorkommen würfeln',
  starport: 'Raumhafen würfeln',
  navalBase: 'Marinebasis würfeln',
  scoutBase: 'Scoutbasis würfeln',
  gasGiant: 'Gasriese würfeln',
  size: 'Größe würfeln',
  atmosphere: 'Atmosphäre würfeln',
  temperature: 'Temperatur würfeln',
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
  temperature: 'Temperatur (Mongoose Traveller): 2W6 + DM der Atmosphäre',
  hydrographics: 'UWP: Hydrographie, 2W6 − 7 + Größe',
  population: 'UWP: Bevölkerung, 2W6 − 2',
  government: 'UWP: Regierung, 2W6 − 7 + Bevölkerung',
  law: 'UWP: Gesetz, 2W6 − 7 + Regierung',
  tech: 'UWP: Tech Level, 1W6 + DMs',
};

/** Eine Menge mit Wort in Einzahl oder Mehrzahl: „1 großer Kontinent“, „4 kleine Kontinente“. */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Die Oberfläche in Worten; Mengen, die es nicht gibt, fallen weg. */
export function surfaceLines(surface: Surface): readonly string[] {
  const join = (parts: readonly string[]) => parts.join(', ');
  const lines = [`${surface.water} % Wasser`];
  if (surface.plates > 0) lines.push(count(surface.plates, 'tektonische Platte', 'tektonische Platten'));
  const land = [
    surface.majorContinents && count(surface.majorContinents, 'großer Kontinent', 'große Kontinente'),
    surface.minorContinents && count(surface.minorContinents, 'kleiner Kontinent', 'kleine Kontinente'),
    surface.majorIslands && count(surface.majorIslands, 'große Insel', 'große Inseln'),
    surface.archipelagos && count(surface.archipelagos, 'Archipel', 'Archipele'),
  ].filter((x): x is string => Boolean(x));
  const sea = [
    surface.majorOceans && count(surface.majorOceans, 'großer Ozean', 'große Ozeane'),
    surface.minorOceans && count(surface.minorOceans, 'kleiner Ozean', 'kleine Ozeane'),
    surface.smallSeas && count(surface.smallSeas, 'kleines Meer', 'kleine Meere'),
    surface.scatteredLakes && count(surface.scatteredLakes, 'verstreuter See', 'verstreute Seen'),
  ].filter((x): x is string => Boolean(x));
  if (onlyArchipelagos(surface)) lines.push('Land nur als Archipele');
  else if (land.length > 0) lines.push(join(land));
  if (onlyLakes(surface)) lines.push('Wasser nur als verstreute Seen');
  else if (sea.length > 0) lines.push(join(sea));
  if (surface.water === 0) lines.push('kein Wasser an der Oberfläche');
  if (surface.water === 100) lines.push('kein nennenswertes Land');
  lines.push(surface.life ? 'einheimisches Leben' : 'kein einheimisches Leben');
  return lines;
}

function temperatureViewOf(hex: Hex): TemperatureView {
  const { name, average, text } = temperatureOf(hex.temperature!);
  const atmosphere = hex.uwp.atmosphere;
  return { name, average, text, swings: atmosphere !== undefined && atmosphere <= 1 };
}

/** Die Weltkarte eines Feldes mit den Würfen, die man gemacht hat, seit sie offen ist. */
export function worldView(hexes: readonly Hex[], column: number, row: number, rolls: readonly WorldRoll[], error: string | undefined): WorldView {
  const hex: Hex = hexAt(hexes, column, row) ?? { column, row, empty: false, uwp: {} };
  const step = stepOf(hex);
  const next = nextWorldRoll(hex);
  const surfaceDue = nextWorldAction(hex) === 'surface';
  const action: WorldAction = next
    ? { kind: 'roll', label: rollLabels[next.kind], dice: next.dice, parts: next.parts, target: undefined }
    : surfaceDue
      ? { kind: 'surface', label: 'Oberfläche würfeln' }
      : step === 'name'
        ? { kind: 'name' }
        : { kind: 'done' };
  const prompt = next
    ? prompts[next.kind]
    : surfaceDue
      ? "Oberfläche nach dem World Builder's Handbook: Wasser, Platten, Land, Leben"
      : step === 'name'
        ? 'Fertig gewürfelt: Namen eingeben und übernehmen'
        : hex.empty
          ? 'Kein System in diesem Feld'
          : '';
  return {
    id: hexId(column, row),
    name: hex.name,
    step,
    empty: hex.empty,
    prompt,
    uwp: uwpCode(hex.uwp),
    profile: uwpKinds.map((kind) => {
      const value = hex.uwp[kind];
      return { kind, label: worldLabel(kind), code: value === undefined ? undefined : ehex(value), text: value === undefined ? undefined : uwpDigitOf(kind, value)?.text };
    }),
    navalBase: hex.navalBase,
    scoutBase: hex.scoutBase,
    gasGiant: hex.gasGiant,
    temperature: hex.temperature === undefined ? undefined : temperatureViewOf(hex),
    surface: hex.surface === undefined ? undefined : surfaceLines(hex.surface),
    trade: tradeCodesOf(hex).map((t) => ({ code: t.id, name: t.name })),
    lines: rolls.map(worldLine),
    action,
    note: hex.note,
    look: lookOf(hex),
    canNote: isWorld(hex),
    error,
  };
}
