import type { AnimalTable } from './animals';
import { EHEX, uwpKinds, type DiceExpr, type SurfaceRow, type SystemContents, type Temperature, type TemperatureId, type TradeCode, type UwpDigit, type UwpKind } from '../data';
import { DomainError } from './errors';
import type { Random } from './ports';
import { ref } from './reference';
import { checkSurfaceMap, generateSurfaceMap, type SurfaceMap } from './surface-map';

export { EHEX, temperatureIds, uwpKinds, type DiceExpr, type SurfaceRow, type SurfaceTable, type SystemContents, type Temperature, type TemperatureId, type TradeCode, type UwpDigit, type UwpKind } from '../data';

/** Der Subsektor hat 8 Spalten und 10 Zeilen wie TAS Form 6. */
export const SECTOR_COLUMNS = 8;
export const SECTOR_ROWS = 10;
/** Eine Welt gibt es bei 4+ auf 1W6 (World Generation Checklist, „standard“). */
export const OCCURRENCE_TARGET = 4;
/** Die Hydrographie geht nicht über A: keine Landmassen. */
export const MAX_HYDROGRAPHICS = 10;
/** Atmosphäre D (dicht, nur in der Höhe atembar) hält das Wasser auch bei großer Hitze: kein Wasser-DM. */
const ATMOSPHERE_KEEPS_WATER = 13;

export type WorldRollKind = 'occurrence' | 'navalBase' | 'scoutBase' | 'gasGiant' | 'temperature' | UwpKind;

/** Was in der Weltenerschaffung als Nächstes dran ist: ein Wurf, die Oberfläche, der Name, oder fertig. */
export type WorldStep = WorldRollKind | 'surface' | 'system' | 'name' | 'done';

/**
 * Die Oberfläche einer Welt nach dem World Builder's Handbook, ohne Karte: Wasseranteil, Platten,
 * Land- und Wassermassen und einheimisches Leben. Sie entsteht in einem Zug.
 */
export interface Surface {
  /** Wasseranteil in Prozent, 0 bis 100. */
  readonly water: number;
  readonly plates: number;
  readonly majorContinents: number;
  readonly minorContinents: number;
  readonly majorIslands: number;
  readonly archipelagos: number;
  readonly majorOceans: number;
  readonly minorOceans: number;
  readonly smallSeas: number;
  readonly scatteredLakes: number;
  readonly life: boolean;
}

/** Die Stellen des UWP, jede, sobald sie feststeht. */
export type Uwp = Readonly<Partial<Record<UwpKind, number>>>;

/** Was für ein Körper eine Welt ist (Domänenmodell 2026-11-20b): Welt, kleine Welt, Gürtel, Gasriese oder Ring. */
export type WorldKind = 'world' | 'small' | 'belt' | 'giant' | 'ring';

/**
 * Eine Welt eines Systems (Domänenmodell 2026-11-20b, `World`): die Hauptwelt, ein weiterer Planet,
 * ein Gürtel, ein Gasriese, eine kleine Welt, ein Mond oder ein Ring. Die Hauptwelt hat die Id ihres
 * Hexfeldes (0304), damit Verweise auf sie dieselben bleiben; weitere Welten haben „0304-1“ usw.
 */
export interface World {
  readonly id: string;
  readonly kind: WorldKind;
  readonly name?: string;
  readonly uwp: Uwp;
  /** Die Temperatur nach Mongoose Traveller; fehlt bei Welten, deren Hydrographie vorher gewürfelt wurde. */
  readonly temperature?: TemperatureId;
  /** Die Oberfläche; fehlt bei Welten, die ihren TL vorher bekamen. */
  readonly surface?: Surface;
  /** Freier Text zu einer fertigen Welt; nie leer, lässt sich jederzeit ändern. */
  readonly note?: string;
  /** Die Tiertabellen der Welt, je Gelände höchstens eine; entstehen beim ersten Tierwurf. */
  readonly animals?: readonly AnimalTable[];
  /** Die erste Ziffer der Einwohnerzahl, 1–9; entsteht mit der Oberflächenkarte. */
  readonly populationMultiplier?: number;
  /** Die Oberflächenkarte; entsteht beim ersten Öffnen des Globus (siehe `surface-map.ts`). */
  readonly map?: SurfaceMap;
  /** Um den Hauptstern die Nummer der Bahn (eingefangene mit Nachkomma), bei einem Mond der Abstand in Radien der Welt, die er umkreist. */
  readonly orbit?: number;
  /** Nur Monde: wo sie am Kampagnentag 0 auf ihrer Bahn standen, in Grad. */
  readonly angle?: number;
  /** Auf einer Zwischenbahn außerhalb der Standardbahnen. */
  readonly captured?: boolean;
  /** Nur kleine Welten: Durchmesser in km. */
  readonly diameter?: number;
  /** Nur Gasriesen: groß oder klein und Radius in km. */
  readonly large?: boolean;
  readonly radius?: number;
  /** Die Welt, um die dieser Mond (oder Ring) kreist; fehlt, wenn sie um den Hauptstern kreist. */
  readonly moonOf?: string;
  /** Nur Nebenwelten (2026-11-20c): der Spaceport; den Starport hat nur die Hauptwelt (im UWP). */
  readonly spaceport?: Spaceport;
  /** Nur Nebenwelten: Einrichtungen, jede höchstens einmal. */
  readonly facilities?: readonly Facility[];
  /** Nur Nebenwelten: Marinestützpunkt und Scoutbasis; die Basen der Hauptwelt stehen am Hexfeld. */
  readonly bases?: readonly BaseKind[];
}

/** Der Raumhafen einer Nebenwelt (B6 39): F gut, G schlecht, H einfachste Einrichtungen, Y keiner. */
export type Spaceport = 'F' | 'G' | 'H' | 'Y';
export const spaceports: readonly Spaceport[] = ['F', 'G', 'H', 'Y'];
/** Eine Einrichtung einer Nebenwelt (B6 38). */
export type Facility = 'farming' | 'mining' | 'colony' | 'research' | 'military';
export const facilities: readonly Facility[] = ['farming', 'mining', 'colony', 'research', 'military'];
/** Eine Basis auf einer Nebenwelt (B6 37). */
export type BaseKind = 'naval' | 'scout';
export const baseKinds: readonly BaseKind[] = ['naval', 'scout'];

/**
 * Ein erzeugtes Hexfeld des Subsektors: das System (Domänenmodell 2026-11-20b). Es hält ob es leer
 * ist, die Basen und ob es einen Gasriesen gibt, und alle Welten des Systems; eine davon ist die
 * Hauptwelt. Die Würfe werden nicht gespeichert. Fehlt ein Hexfeld, ist es nicht erzeugt.
 */
export interface Hex {
  readonly column: number;
  readonly row: number;
  /** Das Vorkommen hat keine Welt ergeben. */
  readonly empty: boolean;
  readonly navalBase?: boolean;
  readonly scoutBase?: boolean;
  readonly gasGiant?: boolean;
  /** Alle Welten des Systems, die Hauptwelt zuerst. Ein leeres Feld hat keine. */
  readonly worlds: readonly World[];
  /** Die Id der Hauptwelt; fehlt bei einem leeren Feld. */
  readonly main?: string;
  /** Das Sternsystem (Domänenmodell 2026-11-18d); fehlt, bis es gewürfelt ist (siehe `star-system.ts`). */
  readonly system?: StarSystem;
}

/** Das Sternsystem eines Hexfeldes; der Typ steht in `star-system.ts`. */
export interface StarSystem {
  readonly stars: readonly Star[];
  readonly maxOrbits: number;
  readonly emptyOrbits: readonly number[];
}

/** Ein Stern (Domänenmodell `Star`): Typ, Zehntel, Größe; Begleiter mit Bahn, nah oder fern. */
export interface Star {
  readonly type: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
  readonly decimal?: number;
  readonly size: 'Ia' | 'Ib' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'D';
  readonly orbit?: number;
  readonly close: boolean;
  readonly farAu?: number;
}

/** Die Hauptwelt eines Hexfeldes; ein leeres Feld hat keine. */
export function mainOf(hex: Hex): World | undefined {
  return hex.main === undefined ? undefined : hex.worlds.find((w) => w.id === hex.main);
}

/** Die Hauptwelt; ohne sagt die Regel, dass das Feld keine Welt hat. */
export function mainWorld(hex: Hex): World {
  const world = mainOf(hex);
  if (world === undefined) throw new DomainError(`Im Feld ${hexId(hex.column, hex.row)} gibt es keine Welt.`);
  return world;
}

/** Das Hexfeld mit geänderter Hauptwelt; bleibt sie dieselbe, bleibt auch das Feld dasselbe. */
export function withMain(hex: Hex, change: (world: World) => World): Hex {
  const main = mainWorld(hex);
  const changed = change(main);
  return changed === main ? hex : { ...hex, worlds: hex.worlds.map((w) => (w === main ? changed : w)) };
}

/** Die leere Hauptwelt eines neuen Feldes mit Welt; sie hat die Id des Feldes. */
function newMainWorld(column: number, row: number): World {
  return { id: hexId(column, row), kind: 'world', uwp: {} };
}

/** Das Hexfeld einer Welt: die Id vor dem Bindestrich (0304-2 → 0304). */
export function hexIdOfWorld(worldId: string): string {
  return worldId.split('-')[0]!;
}

/** Eine Welt eines Systems, auch eine Nebenwelt oder ein Mond. */
export function worldById(hexes: readonly Hex[], id: string): World | undefined {
  return hexById(hexes, hexIdOfWorld(id))?.worlds.find((w) => w.id === id);
}

/** Woraus der DM eines Wurfs besteht, mit Namen: „Größe 7 +7“; ohne Namen der feste Teil der Formel (−7). */
export interface WorldDmPart {
  readonly label: string;
  readonly dm: number;
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

/** Das Hexfeld zu einem Verweis wie 0304. */
export function hexById(hexes: readonly Hex[], id: string): Hex | undefined {
  return hexes.find((h) => hexId(h.column, h.row) === id);
}

/** Ein Feld mit fertiger Hauptwelt: erzeugt, nicht leer, mit Namen. */
export function isWorld(hex: Hex | undefined): hex is Hex {
  return hex !== undefined && !hex.empty && stepOf(hex) === 'done';
}

/** Eine fertige Welt mit Namen. */
export type NamedWorld = World & { readonly name: string };

/**
 * Die fertige Welt, auf die verwiesen wird (Hauptwelt eines fertigen Feldes oder eine Welt seines
 * Systems); sonst ein DomainError.
 */
export function worldOf(hexes: readonly Hex[], id: string): NamedWorld {
  const hex = hexById(hexes, hexIdOfWorld(id));
  if (!isWorld(hex)) throw new DomainError(`Im Feld ${hexIdOfWorld(id)} gibt es keine fertige Welt.`);
  const world = hex.worlds.find((w) => w.id === id);
  if (world === undefined) throw new DomainError(`Die Welt ${id} gibt es nicht.`);
  return { ...world, name: world.name ?? mainWorld(hex).name! + (world.id === hex.main ? '' : ` ${world.id.split('-')[1]}`) };
}

/** Die fertige Hauptwelt eines Feldes mit Namen; sonst ein DomainError. */
export function namedMain(hex: Hex): NamedWorld {
  const id = hexId(hex.column, hex.row);
  if (!isWorld(hex)) throw new DomainError(`Im Feld ${id} gibt es keine fertige Welt.`);
  return mainWorld(hex) as NamedWorld;
}

/** Ein Hexfeld, wie es vor 2026-11-20b gespeichert wurde: die Werte der Hauptwelt am Feld. */
export type FlatHex = Pick<Hex, 'column' | 'row' | 'empty' | 'navalBase' | 'scoutBase' | 'gasGiant'> & Omit<World, 'id' | 'kind'>;

/** Macht aus einem Hexfeld von vor 2026-11-20b eines mit Hauptwelt (die Werte der Welt wandern in sie). */
export function hexFromFlat(old: FlatHex): Hex {
  const { column, row, empty, navalBase, scoutBase, gasGiant, ...world } = old;
  const base = { column, row, empty, ...(navalBase === undefined ? {} : { navalBase }), ...(scoutBase === undefined ? {} : { scoutBase }), ...(gasGiant === undefined ? {} : { gasGiant }) };
  const id = hexId(column, row);
  // Ein leeres Feld hatte nur `uwp: {}`; was sonst daran stand, bleibt als Welt, damit die Prüfung es zurückweist.
  if (empty) return { ...base, worlds: Object.keys(world).length === 1 && Object.keys(world.uwp).length === 0 ? [] : [{ id, kind: 'world', ...world }] };
  return { ...base, worlds: [{ id, kind: (world.uwp.size ?? 1) === 0 ? 'belt' : 'world', ...world }], main: id };
}

/** Die Ziffer einer Stelle des UWP; fehlt sie in den Charts, gibt es keinen Text und keinen DM. */
export function uwpDigitOf(kind: UwpKind, value: number): UwpDigit | undefined {
  return ref.worlds.uwpDigits[kind].find((d) => d.digit === value);
}

/** Die Zeile der Temperaturtabelle, in die eine Summe fällt. */
export function temperatureFor(total: number): Temperature {
  return ref.worlds.temperatures.find((t) => (t.from === undefined || total >= t.from) && (t.to === undefined || total <= t.to))!;
}

export function temperatureOf(id: TemperatureId): Temperature {
  return ref.worlds.temperatures.find((t) => t.id === id)!;
}

export function diceCount(kind: WorldRollKind): 1 | 2 {
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
  temperature: 'Temperatur',
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

/** Die Zeile der System Contents Table für Summe + DM, auf 2 bis 12 begrenzt. */
export function systemRow(total: number): SystemContents {
  return ref.worlds.systemContents[Math.min(12, Math.max(2, total)) - 2]!;
}

/**
 * Was ein Hexfeld als Nächstes braucht: einen Wurf, den Namen, oder nichts mehr. Die Temperatur kommt
 * vor der Hydrographie; steht die Hydrographie schon (aus der Zeit vor der Temperatur), geht es ohne
 * sie weiter.
 */
export function stepOf(hex: Hex): WorldStep {
  if (hex.empty) return 'done';
  const world = mainWorld(hex);
  if (world.uwp.starport === undefined) return 'starport';
  if (hex.navalBase === undefined) return 'navalBase';
  if (hex.scoutBase === undefined) return 'scoutBase';
  if (hex.gasGiant === undefined) return 'gasGiant';
  for (const kind of uwpKinds) {
    if (kind === 'hydrographics' && world.uwp.hydrographics === undefined && world.temperature === undefined) return 'temperature';
    if (world.uwp[kind] === undefined) return kind;
  }
  // Welten von vor der Temperatur bekommen die Oberfläche erst, wenn sie fertig sind.
  if (world.surface === undefined && world.temperature !== undefined && world.name === undefined) return 'surface';
  // Das Sternsystem kommt nach der Oberfläche (2026-11-20); Welten ohne Oberfläche gehen ohne es weiter.
  if (world.surface !== undefined && hex.system === undefined && world.name === undefined) return 'system';
  return world.name === undefined ? 'name' : 'done';
}

/** Eine fertige Welt ohne Temperatur: Ihre Weltkarte bietet an, sie nachzuwürfeln. */
export function lacksTemperature(hex: Hex): boolean {
  return !hex.empty && mainWorld(hex).temperature === undefined && stepOf(hex) === 'done';
}

/**
 * Was eine Welt als Nächstes würfelt: einen Wurf, die Oberfläche (in einem Zug) oder nichts. Eine
 * fertige Welt ohne Temperatur würfelt sie nach, danach die Oberfläche, wenn sie fehlt.
 */
export function nextWorldAction(hex: Hex): WorldRollKind | 'surface' | 'system' | undefined {
  const step = stepOf(hex);
  if (step !== 'name' && step !== 'done') return step;
  if (step === 'name' || hex.empty) return undefined;
  const world = mainWorld(hex);
  if (world.temperature === undefined) return 'temperature';
  return world.surface === undefined ? 'surface' : undefined;
}

/** Der Wurf, der als Nächstes dran ist; keiner, wenn die Oberfläche, der Name oder nichts mehr dran ist. */
export function nextRollKind(hex: Hex): WorldRollKind | undefined {
  const next = nextWorldAction(hex);
  return next === 'surface' || next === 'system' ? undefined : next;
}

/**
 * Setzt, was ohne Wurf feststeht: keine Basis bei manchen Raumhäfen, Atmosphäre und (nach der
 * Temperatur) Hydrographie bei kleinen Welten.
 */
function settle(hex: Hex): Hex {
  if (hex.empty) return hex;
  const world = mainWorld(hex);
  const port = world.uwp.starport === undefined ? undefined : ehex(world.uwp.starport);
  const uwp = { ...world.uwp };
  let { navalBase, scoutBase } = hex;
  if (port !== undefined && navalBase === undefined && !['A', 'B'].includes(port)) navalBase = false;
  if (port !== undefined && scoutBase === undefined && ['E', 'X'].includes(port)) scoutBase = false;
  if (uwp.size === 0 && uwp.atmosphere === undefined) uwp.atmosphere = 0;
  if (uwp.size !== undefined && uwp.size <= 1 && uwp.hydrographics === undefined && world.temperature !== undefined) uwp.hydrographics = 0;
  return withMain(
    {
      ...hex,
      ...(navalBase === undefined ? {} : { navalBase }),
      ...(scoutBase === undefined ? {} : { scoutBase }),
    },
    (w) => ({ ...w, uwp }),
  );
}

/** Der DM des nächsten Wurfs in Teilen; die Summe ist der DM des Wurfs. */
export function worldDmParts(hex: Pick<World, 'uwp' | 'temperature'>, kind: WorldRollKind): readonly WorldDmPart[] {
  const { uwp } = hex;
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
      if (kind === 'hydrographics' && hex.temperature !== undefined && atmosphere !== ATMOSPHERE_KEEPS_WATER) {
        const temperature = temperatureOf(hex.temperature);
        if (temperature.hydroDm !== 0) parts.push({ label: temperature.name, dm: temperature.hydroDm });
      }
      return parts;
    }
    case 'temperature': {
      const atmosphere = value('atmosphere');
      const dm = uwpDigitOf('atmosphere', atmosphere)?.temperatureDm ?? 0;
      return dm === 0 ? [] : [{ label: `Atmosphäre ${ehex(atmosphere)}`, dm }];
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

/** Ein neues Hexfeld nach dem Vorkommen: Summe + DM ≥ Zielwert heißt, es gibt eine Welt. */
export function occurrenceHex(column: number, row: number, total: number, target: number): Hex {
  const empty = total < target;
  return empty ? { column, row, empty, worlds: [] } : { column, row, empty, worlds: [newMainWorld(column, row)], main: hexId(column, row) };
}

/**
 * Trägt das Ergebnis eines Wurfs (Summe + DM) ins Hexfeld ein. Der Wurf muss der sein, der als
 * Nächstes dran ist; was danach ohne Wurf feststeht, wird mit gesetzt.
 */
export function enterRoll(hex: Hex, kind: WorldRollKind, total: number): Hex {
  if (kind !== nextRollKind(hex)) throw new DomainError(`Ein Wurf „${kind}“ passt nicht zum Schritt „${stepOf(hex)}“.`);
  return applyRoll(hex, kind, total);
}

/** Trägt ein Ergebnis ein, ohne zu prüfen, ob es dran ist. */
function applyRoll(hex: Hex, kind: WorldRollKind, total: number): Hex {
  switch (kind) {
    case 'occurrence':
      throw new DomainError('Das Vorkommen würfelt man für ein nicht erzeugtes Feld.');
    case 'starport':
      return settle(withMain(hex, (w) => ({ ...w, uwp: { ...w.uwp, starport: EHEX.indexOf(systemRow(total).starport) } })));
    case 'navalBase':
    case 'scoutBase':
    case 'gasGiant':
      return settle({ ...hex, [kind]: systemRow(total)[kind] });
    case 'temperature':
      return settle(withMain(hex, (w) => ({ ...w, temperature: temperatureFor(total).id })));
    default: {
      const value = Math.max(0, kind === 'hydrographics' ? Math.min(MAX_HYDROGRAPHICS, total) : total);
      return settle(withMain(hex, (w) => ({ ...w, uwp: { ...w.uwp, [kind]: value } })));
    }
  }
}

function rollDice(count: number, random: Random): number {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += random.int(1, 6);
  return sum;
}

function rollExpr(expr: DiceExpr, random: Random): number {
  return Math.max(0, rollDice(expr.dice, random) + expr.dm);
}

/** Die Zeile der Kontinente- bzw. Ozeane-Tabelle für einen Wurf. */
export function surfaceRow(table: SurfaceRow['table'], roll: number): SurfaceRow {
  return ref.worlds.surfaceRows.find((row) => row.table === table && row.roll === roll)!;
}

/** Welche Tabelle ein Wasseranteil braucht: 50–99 % Kontinente, 1–49 % Ozeane; bei 0 und 100 % keine. */
export function surfaceTableFor(water: number): SurfaceRow['table'] | undefined {
  if (water >= 50 && water <= 99) return 'continents';
  if (water >= 1 && water <= 49) return 'oceans';
  return undefined;
}

/**
 * Höchstens so viele große Kontinente: Jeder hat mindestens 15 % der Landfläche. Hausregel, weil die
 * Kontinente-Tabelle bis 2W6 + 1 würfelt; was darüber liegt, zählt zu den kleinen.
 */
export const MAX_MAJOR_CONTINENTS = 6;

/** Ab welcher Summe auf 2W6 es einheimisches Leben gibt. */
export const LIFE_TARGET = 10;

/** Der DM auf das einheimische Leben, in Teilen. */
export function lifeDmParts(hex: Pick<World, 'uwp' | 'temperature'>): readonly WorldDmPart[] {
  const atmosphere = hex.uwp.atmosphere ?? 0;
  const hydrographics = hex.uwp.hydrographics ?? 0;
  const parts: WorldDmPart[] = [];
  if (atmosphere === 0) parts.push({ label: 'Atmosphäre 0', dm: -3 });
  if (atmosphere >= 4 && atmosphere <= 9) parts.push({ label: `Atmosphäre ${ehex(atmosphere)}`, dm: 4 });
  if (hydrographics === 0) parts.push({ label: 'Hydrographie 0', dm: -2 });
  if (hydrographics >= 2 && hydrographics <= 8) parts.push({ label: `Hydrographie ${ehex(hydrographics)}`, dm: 1 });
  if (hex.temperature !== undefined && hex.temperature !== 'temperate') parts.push({ label: temperatureOf(hex.temperature).name, dm: -1 });
  return parts;
}

/**
 * Würfelt die Oberfläche einer Welt in einem Zug (World Builder's Handbook S. 68–70): Wasseranteil,
 * Platten, Land- bzw. Wassermassen, einheimisches Leben.
 */
export function rollSurface(hex: Pick<World, 'uwp' | 'temperature'>, random: Random): Surface {
  const size = hex.uwp.size ?? 0;
  const hydrographics = hex.uwp.hydrographics ?? 0;
  // Wasseranteil: Hydrographie × 10 + (2W6 − 7), eine 12 wird neu gewürfelt.
  let water = 0;
  if (size > 0) {
    let offset = 12;
    while (offset === 12) offset = rollDice(2, random);
    water = Math.min(100, Math.max(0, hydrographics * 10 + offset - 7));
  }
  const plates = size > 0 ? Math.max(1, size + hydrographics - rollDice(2, random)) : 0;
  const masses = { majorContinents: 0, minorContinents: 0, majorIslands: 0, archipelagos: 0, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0 };
  const table = surfaceTableFor(water);
  if (table) {
    const row = surfaceRow(table, rollDice(1, random) + hydrographics * 3);
    const [major, minor, small, scattered] = [row.major, row.minor, row.small, row.scattered].map((expr) => rollExpr(expr, random)) as [number, number, number, number];
    if (table === 'continents') {
      const capped = Math.min(major, MAX_MAJOR_CONTINENTS);
      Object.assign(masses, { majorContinents: capped, minorContinents: minor + major - capped, majorIslands: small, archipelagos: row.onlyScattered ? (100 - water) * 5 * 2 : scattered });
    } else {
      Object.assign(masses, { majorOceans: major, minorOceans: minor, smallSeas: small, scatteredLakes: row.onlyScattered ? water * 5 * 2 : scattered });
    }
  }
  const lifeDm = lifeDmParts(hex).reduce((sum, p) => sum + p.dm, 0);
  const life = rollDice(2, random) + lifeDm >= LIFE_TARGET;
  return { water, plates, ...masses, life };
}

/** Trägt die Oberfläche ein, wenn sie dran ist; sonst ein DomainError. */
export function enterSurface(hex: Hex, random: Random): Hex {
  if (nextWorldAction(hex) !== 'surface') throw new DomainError(`Die Oberfläche ist für das Feld ${hexId(hex.column, hex.row)} nicht dran.`);
  return withMain(hex, (w) => ({ ...w, surface: rollSurface(w, random) }));
}

/** Ist alles Land Archipel: keine anderen Landmassen, und die Archipele sind die ganze Landfläche in halben Hexen. */
export function onlyArchipelagos(surface: Surface): boolean {
  return surface.archipelagos > 0 && surface.majorContinents + surface.minorContinents + surface.majorIslands === 0 && surface.archipelagos === (100 - surface.water) * 5 * 2;
}

/** Ist alles Wasser verstreuter See: keine anderen Gewässer, und die Seen sind die ganze Wasserfläche in halben Hexen. */
export function onlyLakes(surface: Surface): boolean {
  return surface.scatteredLakes > 0 && surface.majorOceans + surface.minorOceans + surface.smallSeas === 0 && surface.scatteredLakes === surface.water * 5 * 2;
}

/** Prüft die Oberfläche einer Welt: Sie braucht Temperatur und TL, und jeder Wert liegt dort, wo die Regeln ihn hinbringen können. */
export function validateSurface(hex: World, fail: (why: string) => never): void {
  const surface = hex.surface;
  if (surface === undefined) return;
  if (hex.uwp.tech === undefined || hex.temperature === undefined) fail('Die Oberfläche braucht TL und Temperatur.');
  const counts = [surface.plates, surface.majorContinents, surface.minorContinents, surface.majorIslands, surface.archipelagos, surface.majorOceans, surface.minorOceans, surface.smallSeas, surface.scatteredLakes];
  if (!Number.isInteger(surface.water) || counts.some((n) => !Number.isInteger(n) || n < 0) || typeof surface.life !== 'boolean') fail('Die Oberfläche hat ungültige Werte.');
  const size = hex.uwp.size ?? 0;
  const hydrographics = hex.uwp.hydrographics ?? 0;
  const [low, high] = size === 0 ? [0, 0] : [Math.max(0, hydrographics * 10 - 5), Math.min(100, hydrographics * 10 + 4)];
  if (surface.water < low || surface.water > high) fail(`Ein Wasseranteil von ${surface.water} % passt nicht zur Hydrographie ${ehex(hydrographics)}.`);
  if (size === 0 ? surface.plates !== 0 : surface.plates < 1 || surface.plates > Math.max(1, size + hydrographics - 2)) fail(`${surface.plates} Platten kann kein Wurf ergeben.`);
  const table = surfaceTableFor(surface.water);
  const land = surface.majorContinents + surface.minorContinents + surface.majorIslands + surface.archipelagos;
  const sea = surface.majorOceans + surface.minorOceans + surface.smallSeas + surface.scatteredLakes;
  if ((table !== 'continents' && land > 0) || (table !== 'oceans' && sea > 0)) fail(`Bei ${surface.water} % Wasser passen diese Land- und Wassermassen nicht.`);
  if (surface.majorContinents > MAX_MAJOR_CONTINENTS) fail(`Mehr als ${MAX_MAJOR_CONTINENTS} große Kontinente gibt es nicht.`);
}

/** Ob die Hauptwelt eine Oberflächenkarte haben kann: fertig, ab Größe 1, mit Oberfläche und Temperatur. */
export function canHaveMap(hex: Hex): boolean {
  if (!isWorld(hex)) return false;
  return mapPossible(hex, mainWorld(hex));
}

/**
 * Ob eine Welt des Systems eine Oberflächenkarte haben kann (2026-11-20d): eine Welt (keine kleine
 * Welt, kein Gürtel, Ring oder Gasriese) ab Größe 1 mit Oberfläche und Temperatur; die Hauptwelt
 * erst, wenn sie fertig ist.
 */
export function mapPossible(hex: Hex, world: World): boolean {
  if (world.id === hex.main && !isWorld(hex)) return false;
  return world.kind === 'world' && (world.uwp.size ?? 0) >= 1 && world.surface !== undefined && world.temperature !== undefined;
}

/** Die Hexfelder mit geänderter Welt `id`; gibt es sie nicht, ein DomainError. */
export function withWorld(hexes: readonly Hex[], id: string, change: (world: World, hex: Hex) => World): readonly Hex[] {
  const hex = hexes.find((h) => h.worlds.some((w) => w.id === id));
  if (!hex) throw new DomainError(`Die Welt ${id} gibt es nicht.`);
  return hexes.map((h) => (h === hex ? { ...h, worlds: h.worlds.map((w) => (w.id === id ? change(w, h) : w)) } : h));
}

/**
 * Erzeugt die Oberflächenkarte der Welt `id` (neu oder als Ersatz); den Bevölkerungsmultiplikator
 * würfelt sie nur, wenn die Welt noch keinen hat. Eine Nebenwelt hat keinen Starport: Ihre erste
 * Hauptstadt bekommt den Spaceport als Hafen (2026-11-20d).
 */
export function withSurfaceMapOf(hexes: readonly Hex[], id: string, random: Random, taken: ReadonlySet<string> = new Set()): readonly Hex[] {
  return withWorld(hexes, id, (world, hex) => {
    if (!mapPossible(hex, world)) throw new DomainError(`Die Welt ${world.name ?? id} kann keine Oberflächenkarte haben.`);
    const u = world.uwp;
    const main = world.id === hex.main;
    const { map, populationMultiplier } = generateSurfaceMap(
      {
        size: u.size!,
        atmosphere: u.atmosphere ?? 0,
        hydrographics: u.hydrographics ?? 0,
        population: u.population ?? 0,
        tech: u.tech ?? 0,
        starport: main ? (u.starport ?? 31) : 31,
        ...(main || world.spaceport === undefined ? {} : { spaceport: world.spaceport }),
        temperature: world.temperature!,
        surface: world.surface!,
        ...(world.populationMultiplier === undefined ? {} : { populationMultiplier: world.populationMultiplier }),
        ...(world.name === undefined ? {} : { name: world.name }),
      },
      random,
      taken,
    );
    return { ...world, map, ...(populationMultiplier === undefined ? {} : { populationMultiplier }) };
  });
}

/**
 * Erzeugt die Oberflächenkarte einer Welt (neu oder als Ersatz) und gibt das Hexfeld mit Karte
 * zurück; den Bevölkerungsmultiplikator würfelt sie nur, wenn die Welt noch keinen hat.
 */
export function withSurfaceMap(hex: Hex, random: Random, taken: ReadonlySet<string> = new Set()): Hex {
  if (!canHaveMap(hex)) throw new DomainError(`Die Welt im Feld ${hexId(hex.column, hex.row)} kann keine Oberflächenkarte haben.`);
  return withSurfaceMapOf([hex], hex.main!, random, taken)[0]!;
}

/** Die Namen aller Städte auf allen Oberflächenkarten, außer der der Welt `except` (für ihr Neuwürfeln). */
export function cityNamesTaken(hexes: readonly Hex[], except?: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const h of hexes) for (const w of h.worlds) if (w.id !== except) for (const c of w.map?.cities ?? []) names.add(c.name);
  return names;
}

/** Benennt die Stadt an der Stelle `index` der Karte der Welt `id` um; ein leerer Name geht nicht. */
export function renameCity(hexes: readonly Hex[], id: string, index: number, name: string): readonly Hex[] {
  const trimmed = name.trim();
  return withWorld(hexes, id, (world) => {
    if (!world.map?.cities?.[index]) throw new DomainError('Diese Stadt gibt es nicht.');
    if (!trimmed) throw new DomainError('Eine Stadt braucht einen Namen.');
    return { ...world, map: { ...world.map, cities: world.map.cities.map((c, i) => (i === index ? { ...c, name: trimmed } : c)) } };
  });
}

/** Die Handelscodes einer Welt, sobald das UWP vollständig ist: jeder, dessen Bedingungen alle erfüllt sind. */
export function tradeCodesOf(world: Pick<World, 'uwp'> | undefined): readonly TradeCode[] {
  if (world === undefined || uwpKinds.some((k) => world.uwp[k] === undefined)) return [];
  return ref.worlds.tradeCodes.filter((code) => code.if.every((c) => c.digits.includes(world.uwp[c.of]!)));
}

/** Das UWP in der üblichen Schreibweise, z. B. A788899-C; offene Stellen als „?“. */
export function uwpCode(uwp: Uwp): string {
  const digit = (k: UwpKind) => (uwp[k] === undefined ? '?' : ehex(uwp[k]));
  return `${uwpKinds.slice(0, -1).map(digit).join('')}-${digit('tech')}`;
}

function checkPosition(column: number, row: number): void {
  if (!Number.isInteger(column) || !Number.isInteger(row) || column < 1 || column > SECTOR_COLUMNS || row < 1 || row > SECTOR_ROWS) {
    throw new DomainError(`Das Feld ${hexId(column, row)} liegt nicht im Subsektor.`);
  }
}

/** Ersetzt ein Hexfeld oder nimmt es neu auf. */
export function putHex(hexes: readonly Hex[], hex: Hex): readonly Hex[] {
  checkPosition(hex.column, hex.row);
  return [...hexes.filter((h) => h.column !== hex.column || h.row !== hex.row), hex];
}

/** Gibt der fertig gewürfelten Welt ihren Namen; danach ist sie fertig. */
export function nameWorld(hexes: readonly Hex[], column: number, row: number, name: string): readonly Hex[] {
  const hex = hexAt(hexes, column, row);
  if (!hex || stepOf(hex) !== 'name') throw new DomainError('Erst alles würfeln, dann den Namen geben.');
  const trimmed = name.trim();
  if (!trimmed) throw new DomainError('Die Welt braucht einen Namen.');
  return putHex(hexes, withMain(hex, (w) => ({ ...w, name: trimmed })));
}

/** Setzt die Notiz einer fertigen Welt (Hauptwelt oder Nebenwelt); Leerraum am Rand fällt weg, eine leere Notiz entfernt sie. */
export function noteWorld(hexes: readonly Hex[], id: string, note: string): readonly Hex[] {
  const trimmed = note.trim();
  return withWorld(hexes, id, (w, hex) => {
    if (w.id === hex.main && !isWorld(hex)) throw new DomainError('Eine Notiz hat nur eine fertige Welt.');
    const rest: World = { ...w };
    delete (rest as { note?: string }).note;
    return trimmed ? { ...rest, note: trimmed } : rest;
  });
}

/** Benennt eine Nebenwelt (2026-11-20d); ein leerer Name nimmt ihn weg. Die Hauptwelt bekommt ihren Namen in der Erschaffung. */
export function renameWorld(hexes: readonly Hex[], id: string, name: string): readonly Hex[] {
  const trimmed = name.trim();
  return withWorld(hexes, id, (w, hex) => {
    if (w.id === hex.main) throw new DomainError('Die Hauptwelt behält ihren Namen.');
    const rest: World = { ...w };
    delete (rest as { name?: string }).name;
    return trimmed ? { ...rest, name: trimmed } : rest;
  });
}

/** Verwirft eine Welt in Erschaffung: Das Feld ist wieder nicht erzeugt. Fertiges bleibt. */
export function discardWorld(hexes: readonly Hex[], column: number, row: number): readonly Hex[] {
  const hex = hexAt(hexes, column, row);
  if (!hex) return hexes;
  if (stepOf(hex) === 'done') throw new DomainError('Ein fertiges Feld lässt sich nicht verwerfen.');
  return hexes.filter((h) => h !== hex);
}

/** Welche Werte ein Wurf ergeben kann (Summe + DM, unter 0 als 0). */
const ranges: Record<UwpKind, readonly [number, number]> = {
  starport: [10, 31],
  size: [0, 10],
  atmosphere: [0, 15],
  hydrographics: [0, MAX_HYDROGRAPHICS],
  population: [0, 10],
  government: [0, 15],
  law: [0, 20],
  tech: [0, 22],
};

/**
 * Prüft ein Hexfeld gegen die Regeln: Werte nur in der Reihenfolge des Ablaufs, jeder in dem Bereich,
 * den sein Wurf ergeben kann, und die Werte ohne Wurf so, wie die Regeln sie setzen.
 */
export function validateHex(hex: Hex): void {
  const id = hexId(hex.column, hex.row);
  const fail = (why: string): never => {
    throw new DomainError(`Das Feld ${id}: ${why}`);
  };
  if (hex.empty) {
    if (hex.worlds.length > 0 || hex.main !== undefined || hex.navalBase !== undefined || hex.scoutBase !== undefined || hex.gasGiant !== undefined || hex.system !== undefined) fail('Ein leeres Feld hat keine Welt.');
    return;
  }
  if (hex.main !== id) fail('Die Hauptwelt hat die Id ihres Feldes.');
  const ids = new Set<string>();
  for (const w of hex.worlds) {
    if (ids.has(w.id)) fail(`Die Welt ${w.id} kommt doppelt vor.`);
    ids.add(w.id);
    if (hexIdOfWorld(w.id) !== id) fail(`Die Welt ${w.id} gehört nicht zu diesem Feld.`);
    if (w.moonOf !== undefined && !hex.worlds.some((o) => o.id === w.moonOf && o.moonOf === undefined)) fail(`Der Mond ${w.id} kreist um keine Welt dieses Systems.`);
  }
  const main = mainOf(hex);
  if (main === undefined) fail('Die Hauptwelt fehlt.');
  validateMain(hex, main!, fail);
}

function validateMain(hex: Hex, world: World, fail: (why: string) => never): void {
  const values: [string, unknown][] = [
    ['starport', world.uwp.starport],
    ['navalBase', hex.navalBase],
    ['scoutBase', hex.scoutBase],
    ['gasGiant', hex.gasGiant],
    ...uwpKinds.slice(1).map((k): [string, unknown] => [k, world.uwp[k]]),
    ['name', world.name],
  ];
  if (world.kind !== 'world' && world.kind !== 'belt') fail('Die Hauptwelt ist eine Welt oder ein Gürtel.');
  if (world.temperature !== undefined && !ref.worlds.temperatures.some((t) => t.id === world.temperature)) fail('Diese Temperatur gibt es nicht.');
  if (world.temperature !== undefined && world.uwp.atmosphere === undefined) fail('Die Temperatur steht da, aber die Atmosphäre fehlt.');
  validateSurface(world, fail);
  const missing = values.findIndex(([, v]) => v === undefined);
  if (missing >= 0 && values.slice(missing).some(([, v]) => v !== undefined)) fail(`Es fehlt ${values[missing]![0]}, aber Späteres steht schon da.`);
  for (const kind of uwpKinds) {
    const value = world.uwp[kind];
    if (value === undefined) continue;
    const [min, max] = ranges[kind];
    if (!Number.isInteger(value) || value < min || value > max) fail(`${labels[kind]} ${value} kann kein Wurf ergeben.`);
  }
  if (world.uwp.starport !== undefined && !ref.worlds.systemContents.some((r) => EHEX.indexOf(r.starport) === world.uwp.starport)) fail('Diesen Raumhafen gibt es nicht.');
  if (world.name !== undefined && !world.name.trim()) fail('Die Welt braucht einen Namen.');
  if (world.note !== undefined && stepOf(hex) !== 'done') fail('Eine Notiz hat nur eine fertige Welt.');
  if (world.note !== undefined && !world.note.trim()) fail('Eine leere Notiz gibt es nicht.');
  if (world.populationMultiplier !== undefined && (!Number.isInteger(world.populationMultiplier) || world.populationMultiplier < 1 || world.populationMultiplier > 9 || !((world.uwp.population ?? 0) >= 1))) fail('Einen Bevölkerungsmultiplikator 1–9 hat nur eine Welt mit Bevölkerung.');
  if (world.map !== undefined) {
    if (!canHaveMap(hex)) fail('Eine Oberflächenkarte hat nur eine fertige Welt ab Größe 1 mit Oberfläche.');
    const why = checkSurfaceMap(world.map, world.uwp.size!, world.uwp.population ?? 0);
    if (why) fail(why);
  }
  // Was ohne Wurf feststeht, muss so stehen, wie die Regeln es setzen.
  const settled = settle(hex);
  const port = world.uwp.starport === undefined ? undefined : ehex(world.uwp.starport);
  if (port !== undefined && !['A', 'B'].includes(port) && hex.navalBase === true) fail(`Bei Raumhafen ${port} gibt es keine Marinebasis.`);
  if (port !== undefined && ['E', 'X'].includes(port) && hex.scoutBase === true) fail(`Bei Raumhafen ${port} gibt es keine Scoutbasis.`);
  if (world.uwp.size === 0 && world.uwp.atmosphere !== undefined && world.uwp.atmosphere !== 0) fail('Größe 0 hat keine Atmosphäre.');
  if (world.uwp.size !== undefined && world.uwp.size <= 1 && world.uwp.hydrographics !== undefined && world.uwp.hydrographics !== 0) fail('Größe 0 oder 1 hat keine Hydrographie.');
  if (stepOf(settled) !== stepOf(hex)) fail('Ein Wert, der ohne Wurf feststeht, fehlt.');
}

/** Prüft die Hexfelder einer Kampagne: im Subsektor, je Feld höchstens eins, jedes nach den Regeln. */
export function validateHexes(hexes: readonly Hex[]): void {
  const seen = new Set<string>();
  for (const hex of hexes) {
    checkPosition(hex.column, hex.row);
    const id = hexId(hex.column, hex.row);
    if (seen.has(id)) throw new DomainError(`Das Feld ${id} kommt doppelt vor.`);
    seen.add(id);
    validateHex(hex);
  }
}

/** Ein Wurf, wie Hexfelder ihn gespeichert haben, bevor sie Werte statt Würfe hielten. */
export interface LegacyWorldRoll {
  readonly kind: WorldRollKind;
  readonly dice: readonly number[];
  readonly dm: number;
  readonly target?: number;
}

/**
 * Ein Hexfeld aus der Zeit, als es seine Würfe hielt: Die Würfe werden nachgespielt und als Werte
 * übernommen. Passt ein Wurf nicht zu den Regeln, gibt es einen DomainError.
 */
export function hexFromRolls(old: { readonly column: number; readonly row: number; readonly name?: string; readonly rolls: readonly LegacyWorldRoll[] }): Hex {
  const [first, ...rest] = old.rolls;
  if (first?.kind !== 'occurrence') throw new DomainError(`Das Feld ${hexId(old.column, old.row)} beginnt nicht mit dem Vorkommen.`);
  const total = (r: LegacyWorldRoll) => r.dice.reduce((a, b) => a + b, 0) + r.dm;
  let hex = occurrenceHex(old.column, old.row, total(first), first.target ?? OCCURRENCE_TARGET);
  for (const roll of rest) {
    // Damals kam nach der Atmosphäre gleich die Hydrographie, bei kleinen Welten ohne Wurf als 0.
    if (stepOf(hex) === 'temperature' && roll.kind !== 'temperature') {
      if ((mainWorld(hex).uwp.size ?? 99) <= 1) hex = withMain(hex, (w) => ({ ...w, uwp: { ...w.uwp, hydrographics: 0 } }));
      else if (roll.kind === 'hydrographics') {
        hex = applyRoll(hex, roll.kind, total(roll));
        continue;
      }
    }
    hex = enterRoll(hex, roll.kind, total(roll));
  }
  if (old.name !== undefined) {
    if (stepOf(hex) !== 'name') throw new DomainError('Nur eine fertig gewürfelte Welt hat einen Namen.');
    const name = old.name;
    hex = withMain(hex, (w) => ({ ...w, name }));
  }
  return hex;
}
