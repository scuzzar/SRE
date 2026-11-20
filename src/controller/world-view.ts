import {
  canHaveMap,
  ehex,
  surfaceGrid,
  type SurfaceGrid,
  type SurfaceMap,
  hexAt,
  hexId,
  isWorld,
  mainOf,
  mainWorld,
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
  type World,
  type WorldDmPart,
  type WorldRollKind,
  type WorldStep,
  orbitMillionKm,
  sizeCode,
  temperatureOfWorld,
  gravityOf,
  zonesOf,
  zoneOfOrbit,
  starName,
  moonsOf,
  type Zone,
  type Facility,
  type BaseKind,
} from '../model';
import { nextWorldRoll, totalOf, type WorldRoll } from '../model/draft';

/**
 * Was das Weltsymbol braucht: die Stellen des UWP, die man sieht, Wasseranteil, Temperatur und
 * Leben. `seed` (das Feld) legt fest, wo Kontinente und Städte liegen, damit jede Welt anders aussieht.
 * In der Weltenerschaffung fehlt, was noch nicht gewürfelt ist; das Symbol zeigt es grau.
 */
export interface WorldLook {
  readonly seed: string;
  /** Nur Gasriesen (groß oder klein) und kleine Welten (Größe S) sehen anders aus als eine Welt ihrer Größe. */
  readonly kind?: 'giant' | 'small';
  readonly large?: boolean;
  readonly size: number;
  readonly atmosphere: number | undefined;
  readonly hydrographics: number | undefined;
  /** Wasseranteil 0 bis 1: aus der Oberfläche, sonst aus der Hydrographie. */
  readonly water: number | undefined;
  readonly population: number | undefined;
  readonly tech: number | undefined;
  readonly temperature: 'frozen' | 'cold' | 'temperate' | 'hot' | 'boiling' | undefined;
  readonly life: boolean | undefined;
  /** Die Oberflächenkarte, wenn es eine gibt: Dann zeigt das Symbol die echten Felder. */
  readonly surface?: { readonly grid: SurfaceGrid; readonly map: SurfaceMap };
}

/**
 * Das Weltsymbol: für eine fertige Welt vollständig, für eine Welt in Erschaffung ab der Größe mit
 * dem, was schon gewürfelt ist; sonst `undefined`.
 */
export function lookOf(hex: Hex | undefined): WorldLook | undefined {
  const world = hex && mainOf(hex);
  if (!hex || !world || world.uwp.size === undefined) return undefined;
  if (hexState(hex) !== 'world') {
    const { size, atmosphere, hydrographics, population, tech } = world.uwp;
    return {
      seed: hexId(hex.column, hex.row),
      size,
      atmosphere,
      hydrographics,
      water: world.surface ? world.surface.water / 100 : undefined,
      population,
      tech,
      temperature: world.temperature,
      life: world.surface?.life,
    };
  }
  return lookOfWorld(world, hexId(hex.column, hex.row));
}

/** Das Symbol einer fertigen Welt; `seed` macht es unverwechselbar. */
export function lookOfWorld(world: World, seed: string): WorldLook {
  const { size = 0, atmosphere = 0, hydrographics = 0, population = 0, tech = 0 } = world.uwp;
  return {
    seed,
    size,
    atmosphere,
    hydrographics,
    water: world.surface ? world.surface.water / 100 : hydrographics >= 10 ? 0.985 : hydrographics / 10,
    population,
    tech,
    // Welten von vor der Temperatur gelten als gemäßigt, Welten von vor der Oberfläche als belebt,
    // wenn Luft und Wasser es erlauben.
    temperature: world.temperature ?? 'temperate',
    life: world.surface?.life ?? (atmosphere >= 2 && atmosphere <= 9 && hydrographics > 0),
    ...(world.map && size > 0 ? { surface: { grid: surfaceGrid(size), map: world.map } } : {}),
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
  /** Auf der Welt ist etwas geschehen (Logeinträge mit Ort) oder es leben dort dauerhafte NSC. */
  readonly marked: boolean;
  /** Eine offene Mission hat hier einen Ort (Fahne, 2026-11-18). */
  readonly mission: boolean;
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
  | { readonly kind: 'system'; readonly label: string }
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
  /** Die Welt kann einen Globus haben (fertig, ab Größe 1, mit Oberfläche). */
  readonly canGlobe: boolean;
  /** Die Oberflächenkarte gibt es schon. */
  readonly hasMap: boolean;
  /** Die Stellen der Logeinträge, die auf dieser Welt geschahen (Was hier geschah), das Neueste zuletzt. */
  readonly happened: readonly number[];
  /** Das Sternsystem, sobald es gewürfelt ist. */
  readonly system: SystemView | undefined;
}

/** Das Sternsystem in der Übersicht der Weltkarte (2026-11-20b): Sterne und was auf jeder Bahn liegt. */
export interface SystemView {
  readonly stars: readonly { readonly name: string; readonly where: string }[];
  readonly orbits: readonly OrbitView[];
}

/** Eine Bahn um den Hauptstern: ihre Welt (oder leer, oder ein Begleitstern) mit ihren Monden. */
export interface OrbitView {
  readonly orbit: string;
  readonly distance: string;
  readonly zone: string;
  readonly body: SystemBodyView;
  readonly moons: readonly SystemBodyView[];
}

/** Ein Körper der Übersicht: Welt, Gasriese, Gürtel, kleine Welt, Ring; oder eine leere Bahn, ein Begleitstern. */
export interface SystemBodyView {
  readonly id: string | undefined;
  readonly label: string;
  /** Größe, Atmosphäre, Hydrographie, Bevölkerung, wo es sie gibt (z. B. „7885“, „S002“). */
  readonly code: string | undefined;
  readonly detail: string | undefined;
  readonly main: boolean;
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
export function sectorView(hexes: readonly Hex[], marked: ReadonlySet<string> = new Set(), missions: ReadonlySet<string> = new Set()): readonly HexView[] {
  const cells: HexView[] = [];
  for (let column = 1; column <= SECTOR_COLUMNS; column++) {
    for (let row = 1; row <= SECTOR_ROWS; row++) {
      const hex = hexAt(hexes, column, row);
      const world = hex && mainOf(hex);
      cells.push({
        id: hexId(column, row),
        column,
        row,
        state: hexState(hex),
        name: world?.name,
        starport: world?.uwp.starport === undefined ? undefined : ehex(world.uwp.starport),
        navalBase: hex?.navalBase ?? false,
        scoutBase: hex?.scoutBase ?? false,
        gasGiant: hex?.gasGiant ?? false,
        size: world?.uwp.size,
        hydrographics: world?.uwp.hydrographics,
        population: world?.uwp.population,
        uwp: world && hexState(hex) === 'world' ? uwpCode(world.uwp) : undefined,
        trade: world && hexState(hex) === 'world' ? tradeCodesOf(world).map((t) => t.id) : [],
        look: lookOf(hex),
        marked: marked.has(hexId(column, row)),
        mission: missions.has(hexId(column, row)),
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
      const world = mainWorld(hex);
      return [
        {
          id: hexId(hex.column, hex.row),
          column: hex.column,
          row: hex.row,
          name: world.name!,
          uwp: uwpCode(world.uwp),
          bases: basesText(hex),
          trade: tradeCodesOf(world).map((t) => t.id),
          gasGiant: hex.gasGiant ?? false,
          note: world.note?.split('\n')[0],
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

function temperatureViewOf(world: World): TemperatureView {
  const { name, average, text } = temperatureOf(world.temperature!);
  const atmosphere = world.uwp.atmosphere;
  return { name, average, text, swings: atmosphere !== undefined && atmosphere <= 1 };
}

/** Die Weltkarte eines Feldes mit den Würfen, die man gemacht hat, seit sie offen ist. */
export function worldView(hexes: readonly Hex[], column: number, row: number, rolls: readonly WorldRoll[], error: string | undefined, happened: readonly number[] = []): WorldView {
  const hex: Hex = hexAt(hexes, column, row) ?? { column, row, empty: false, worlds: [{ id: hexId(column, row), kind: 'world', uwp: {} }], main: hexId(column, row) };
  const world: World = mainOf(hex) ?? { id: hexId(column, row), kind: 'world', uwp: {} };
  const step = stepOf(hex);
  const next = nextWorldRoll(hex);
  const surfaceDue = nextWorldAction(hex) === 'surface';
  const systemDue = nextWorldAction(hex) === 'system';
  const action: WorldAction = next
    ? { kind: 'roll', label: rollLabels[next.kind], dice: next.dice, parts: next.parts, target: undefined }
    : surfaceDue
      ? { kind: 'surface', label: 'Oberfläche würfeln' }
      : systemDue
        ? { kind: 'system', label: 'Sternsystem würfeln' }
        : step === 'name'
        ? { kind: 'name' }
        : { kind: 'done' };
  const prompt = next
    ? prompts[next.kind]
    : surfaceDue
      ? "Oberfläche nach dem World Builder's Handbook: Wasser, Platten, Land, Leben"
      : systemDue
        ? 'Sternsystem nach Book 6: Sterne, Bahnen, Gasriesen, Gürtel, weitere Welten, Monde'
        : step === 'name'
        ? 'Fertig gewürfelt: Namen eingeben und übernehmen'
        : hex.empty
          ? 'Kein System in diesem Feld'
          : '';
  return {
    id: hexId(column, row),
    name: world.name,
    step,
    empty: hex.empty,
    prompt,
    uwp: uwpCode(world.uwp),
    profile: uwpKinds.map((kind) => {
      const value = world.uwp[kind];
      return { kind, label: worldLabel(kind), code: value === undefined ? undefined : ehex(value), text: value === undefined ? undefined : uwpDigitOf(kind, value)?.text };
    }),
    navalBase: hex.navalBase,
    scoutBase: hex.scoutBase,
    gasGiant: hex.gasGiant,
    temperature: world.temperature === undefined ? undefined : temperatureViewOf(world),
    surface: world.surface === undefined ? undefined : surfaceLines(world.surface),
    trade: (hex.empty ? [] : tradeCodesOf(world)).map((t) => ({ code: t.id, name: t.name })),
    lines: rolls.map(worldLine),
    action,
    note: world.note,
    look: lookOf(hex),
    canNote: isWorld(hex),
    canGlobe: canHaveMap(hex),
    hasMap: world.map !== undefined,
    happened,
    error,
    system: systemView(hex),
  };
}

const ZONE_NAMES: Record<Zone, string> = { inner: 'innen', habitable: 'bewohnbar', outer: 'außen' };
const num = (n: number, digits = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Die Bahn um den Stern als Text, eingefangene mit Nachkomma (5,4). */
function orbitText(orbit: number): string {
  return Number.isInteger(orbit) ? String(orbit) : num(orbit, 1);
}

/** Der Abstand vom Stern: in AU, nah am Stern in Millionen km. */
function distanceText(orbit: number): string {
  const km = orbitMillionKm(orbit);
  const au = km / 149.6;
  return au < 1 ? `${num(km)} Mio. km` : `${num(au, au < 10 ? 1 : 0)} AU`;
}

/**
 * Das UWP einer Nebenwelt mit ihrem Raumhafen (2026-11-20c), z. B. G552531-8; Systeme von davor nur
 * Größe, Atmosphäre, Hydrographie, Bevölkerung. Gasriesen und Ringe haben keins.
 */
function codeOf(world: World): string | undefined {
  if (world.kind === 'giant' || world.kind === 'ring') return undefined;
  const digit = (v: number | undefined) => (v === undefined ? '?' : ehex(v));
  const middle = `${sizeCode(world)}${digit(world.uwp.atmosphere)}${digit(world.uwp.hydrographics)}${digit(world.uwp.population)}`;
  if (world.spaceport === undefined) return middle;
  return `${world.spaceport}${middle}${digit(world.uwp.government)}${digit(world.uwp.law)}-${digit(world.uwp.tech)}`;
}

const FACILITY_NAMES: Record<Facility, string> = { farming: 'Landwirtschaft', mining: 'Bergbau', colony: 'Kolonie', research: 'Forschungslabor', military: 'Militärbasis' };
const BASE_NAMES: Record<BaseKind, string> = { naval: 'Marinestützpunkt', scout: 'Scoutbasis' };

/** Das Weltsymbol einer Welt des Systems; die Hauptwelt wie auf der Karte, Ringe und Gürtel ohne. */
export function systemLook(hex: Hex, world: World): WorldLook | undefined {
  if (world.id === hex.main) return lookOf(hex);
  if (world.kind === 'ring') return undefined;
  if (world.kind === 'giant') return { seed: world.id, kind: 'giant', large: world.large ?? false, size: 10, atmosphere: undefined, hydrographics: undefined, water: undefined, population: undefined, tech: undefined, temperature: undefined, life: undefined };
  const look = lookOfWorld({ ...world, temperature: temperatureOfWorld(hex, world) }, world.id);
  if (world.kind === 'belt') return { ...look, size: 0 };
  return world.kind === 'small' ? { ...look, kind: 'small', size: 1, life: false } : { ...look, life: false };
}

function bodyView(hex: Hex, world: World): SystemBodyView {
  const main = world.id === hex.main;
  const name = main ? mainWorld(hex).name : undefined;
  const kindLabel =
    world.kind === 'giant'
      ? `Gasriese, ${world.large ? 'groß' : 'klein'}`
      : world.kind === 'belt'
        ? main
          ? 'Asteroidengürtel'
          : 'Planetoidengürtel'
        : world.kind === 'small'
          ? 'Kleine Welt'
          : world.kind === 'ring'
            ? 'Ring'
            : world.moonOf === undefined
              ? 'Welt'
              : 'Mond';
  const label = main ? `${name ?? 'Hauptwelt'} (Hauptwelt)` : world.captured ? `${kindLabel}, eingefangen` : kindLabel;
  const details: string[] = [];
  if (world.moonOf !== undefined && world.orbit !== undefined) details.push(`${num(world.orbit)} Radien`);
  if (world.kind === 'giant' && world.radius !== undefined) details.push(`Radius ${num(world.radius)} km`);
  if (world.kind === 'small' && world.diameter !== undefined) details.push(`${num(world.diameter)} km`);
  const g = gravityOf(world);
  if (g > 0) details.push(`${num(g, 2)} G`);
  for (const b of world.bases ?? []) details.push(BASE_NAMES[b]);
  for (const f of world.facilities ?? []) details.push(FACILITY_NAMES[f]);
  return { id: world.id, label, code: main ? undefined : codeOf(world), detail: details.join(' · ') || undefined, main, look: systemLook(hex, world) };
}

/** Die Übersicht des Sternsystems: Sterne, dann jede Bahn um den Hauptstern von innen nach außen. */
export function systemView(hex: Hex): SystemView | undefined {
  const system = hex.system;
  if (!system) return undefined;
  const zones = zonesOf(system.stars[0]!);
  const stars = system.stars.map((star, i) => ({
    name: starName(star),
    where: i === 0 ? 'Hauptstern' : star.close ? 'nah am Hauptstern' : star.farAu !== undefined ? `fern, ${num(star.farAu)} AU` : `Bahn ${star.orbit}`,
  }));
  const zone = (orbit: number) => ZONE_NAMES[zoneOfOrbit(zones, orbit) ?? 'inner'];
  const rows: { orbit: number; row: OrbitView }[] = [];
  for (const world of hex.worlds.filter((w) => w.moonOf === undefined && w.orbit !== undefined)) {
    const orbit = world.orbit!;
    rows.push({ orbit, row: { orbit: orbitText(orbit), distance: distanceText(orbit), zone: zone(orbit), body: bodyView(hex, world), moons: moonsOf(hex, world).map((m) => bodyView(hex, m)) } });
  }
  const empty = (label: string): SystemBodyView => ({ id: undefined, label, code: undefined, detail: undefined, main: false, look: undefined });
  for (const orbit of system.emptyOrbits) rows.push({ orbit, row: { orbit: orbitText(orbit), distance: distanceText(orbit), zone: zone(orbit), body: empty('leere Bahn'), moons: [] } });
  for (const star of system.stars.slice(1)) {
    if (star.orbit !== undefined) rows.push({ orbit: star.orbit, row: { orbit: orbitText(star.orbit), distance: distanceText(star.orbit), zone: zone(star.orbit), body: empty(`Begleitstern ${starName(star)}`), moons: [] } });
  }
  return { stars, orbits: rows.sort((a, b) => a.orbit - b.orbit).map((r) => r.row) };
}
