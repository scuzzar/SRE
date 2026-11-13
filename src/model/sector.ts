import type { AnimalTable } from './animals';
import { EHEX, uwpKinds, type DiceExpr, type SurfaceRow, type SystemContents, type Temperature, type TemperatureId, type TradeCode, type UwpDigit, type UwpKind } from '../data';
import { DomainError } from './errors';
import type { Random } from './ports';
import { ref } from './reference';

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
export type WorldStep = WorldRollKind | 'surface' | 'name' | 'done';

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

/**
 * Ein erzeugtes Hexfeld des Subsektors. Es hält die Werte seiner Welt, jeden, sobald er feststeht;
 * die Würfe werden nicht gespeichert. Fehlt ein Hexfeld, ist es nicht erzeugt.
 */
export interface Hex {
  readonly column: number;
  readonly row: number;
  /** Das Vorkommen hat keine Welt ergeben. */
  readonly empty: boolean;
  readonly name?: string;
  readonly navalBase?: boolean;
  readonly scoutBase?: boolean;
  readonly gasGiant?: boolean;
  readonly uwp: Uwp;
  /** Die Temperatur nach Mongoose Traveller; fehlt bei Welten, deren Hydrographie vorher gewürfelt wurde. */
  readonly temperature?: TemperatureId;
  /** Die Oberfläche; fehlt bei Welten, die ihren TL vorher bekamen. */
  readonly surface?: Surface;
  /** Freier Text zu einer fertigen Welt; nie leer, lässt sich jederzeit ändern. */
  readonly note?: string;
  /** Die Tiertabellen der Welt, je Gelände höchstens eine; entstehen beim ersten Tierwurf. */
  readonly animals?: readonly AnimalTable[];
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

/** Eine fertige Welt: erzeugt, nicht leer, mit Namen. */
export function isWorld(hex: Hex | undefined): hex is Hex & { readonly name: string } {
  return hex !== undefined && !hex.empty && stepOf(hex) === 'done';
}

/** Die fertige Welt, auf die verwiesen wird; sonst ein DomainError. */
export function worldOf(hexes: readonly Hex[], id: string): Hex & { readonly name: string } {
  const hex = hexById(hexes, id);
  if (!isWorld(hex)) throw new DomainError(`Im Feld ${id} gibt es keine fertige Welt.`);
  return hex;
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
  if (hex.uwp.starport === undefined) return 'starport';
  if (hex.navalBase === undefined) return 'navalBase';
  if (hex.scoutBase === undefined) return 'scoutBase';
  if (hex.gasGiant === undefined) return 'gasGiant';
  for (const kind of uwpKinds) {
    if (kind === 'hydrographics' && hex.uwp.hydrographics === undefined && hex.temperature === undefined) return 'temperature';
    if (hex.uwp[kind] === undefined) return kind;
  }
  // Welten von vor der Temperatur bekommen die Oberfläche erst, wenn sie fertig sind.
  if (hex.surface === undefined && hex.temperature !== undefined && hex.name === undefined) return 'surface';
  return hex.name === undefined ? 'name' : 'done';
}

/** Eine fertige Welt ohne Temperatur: Ihre Weltkarte bietet an, sie nachzuwürfeln. */
export function lacksTemperature(hex: Hex): boolean {
  return !hex.empty && hex.temperature === undefined && stepOf(hex) === 'done';
}

/**
 * Was eine Welt als Nächstes würfelt: einen Wurf, die Oberfläche (in einem Zug) oder nichts. Eine
 * fertige Welt ohne Temperatur würfelt sie nach, danach die Oberfläche, wenn sie fehlt.
 */
export function nextWorldAction(hex: Hex): WorldRollKind | 'surface' | undefined {
  const step = stepOf(hex);
  if (step !== 'name' && step !== 'done') return step;
  if (step === 'name' || hex.empty) return undefined;
  if (hex.temperature === undefined) return 'temperature';
  return hex.surface === undefined ? 'surface' : undefined;
}

/** Der Wurf, der als Nächstes dran ist; keiner, wenn die Oberfläche, der Name oder nichts mehr dran ist. */
export function nextRollKind(hex: Hex): WorldRollKind | undefined {
  const next = nextWorldAction(hex);
  return next === 'surface' ? undefined : next;
}

/**
 * Setzt, was ohne Wurf feststeht: keine Basis bei manchen Raumhäfen, Atmosphäre und (nach der
 * Temperatur) Hydrographie bei kleinen Welten.
 */
function settle(hex: Hex): Hex {
  const port = hex.uwp.starport === undefined ? undefined : ehex(hex.uwp.starport);
  const uwp = { ...hex.uwp };
  let { navalBase, scoutBase } = hex;
  if (port !== undefined && navalBase === undefined && !['A', 'B'].includes(port)) navalBase = false;
  if (port !== undefined && scoutBase === undefined && ['E', 'X'].includes(port)) scoutBase = false;
  if (uwp.size === 0 && uwp.atmosphere === undefined) uwp.atmosphere = 0;
  if (uwp.size !== undefined && uwp.size <= 1 && uwp.hydrographics === undefined && hex.temperature !== undefined) uwp.hydrographics = 0;
  return {
    ...hex,
    uwp,
    ...(navalBase === undefined ? {} : { navalBase }),
    ...(scoutBase === undefined ? {} : { scoutBase }),
  };
}

/** Der DM des nächsten Wurfs in Teilen; die Summe ist der DM des Wurfs. */
export function worldDmParts(hex: Pick<Hex, 'uwp' | 'temperature'>, kind: WorldRollKind): readonly WorldDmPart[] {
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
  return { column, row, empty: total < target, uwp: {} };
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
      return settle({ ...hex, uwp: { ...hex.uwp, starport: EHEX.indexOf(systemRow(total).starport) } });
    case 'navalBase':
    case 'scoutBase':
    case 'gasGiant':
      return settle({ ...hex, [kind]: systemRow(total)[kind] });
    case 'temperature':
      return settle({ ...hex, temperature: temperatureFor(total).id });
    default: {
      const value = Math.max(0, kind === 'hydrographics' ? Math.min(MAX_HYDROGRAPHICS, total) : total);
      return settle({ ...hex, uwp: { ...hex.uwp, [kind]: value } });
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
export function lifeDmParts(hex: Pick<Hex, 'uwp' | 'temperature'>): readonly WorldDmPart[] {
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
export function rollSurface(hex: Hex, random: Random): Surface {
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
  return { ...hex, surface: rollSurface(hex, random) };
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
function validateSurface(hex: Hex, fail: (why: string) => never): void {
  const surface = hex.surface;
  if (surface === undefined) return;
  if (hex.empty || hex.uwp.tech === undefined || hex.temperature === undefined) fail('Die Oberfläche braucht TL und Temperatur.');
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

/** Die Handelscodes einer Welt, sobald das UWP vollständig ist: jeder, dessen Bedingungen alle erfüllt sind. */
export function tradeCodesOf(hex: Hex): readonly TradeCode[] {
  if (hex.empty || uwpKinds.some((k) => hex.uwp[k] === undefined)) return [];
  return ref.worlds.tradeCodes.filter((code) => code.if.every((c) => c.digits.includes(hex.uwp[c.of]!)));
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
  return putHex(hexes, { ...hex, name: trimmed });
}

/** Setzt die Notiz einer fertigen Welt; Leerraum am Rand fällt weg, eine leere Notiz entfernt sie. */
export function noteWorld(hexes: readonly Hex[], column: number, row: number, note: string): readonly Hex[] {
  const hex = hexAt(hexes, column, row);
  if (!isWorld(hex)) throw new DomainError('Eine Notiz hat nur eine fertige Welt.');
  const rest: Hex = { ...hex };
  delete (rest as { note?: string }).note;
  const trimmed = note.trim();
  return putHex(hexes, trimmed ? { ...rest, note: trimmed } : rest);
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
  const values: [string, unknown][] = [
    ['starport', hex.uwp.starport],
    ['navalBase', hex.navalBase],
    ['scoutBase', hex.scoutBase],
    ['gasGiant', hex.gasGiant],
    ...uwpKinds.slice(1).map((k): [string, unknown] => [k, hex.uwp[k]]),
    ['name', hex.name],
  ];
  if (hex.empty && (hex.temperature !== undefined || values.some(([, v]) => v !== undefined))) fail('Ein leeres Feld hat keine Welt.');
  if (hex.temperature !== undefined && !ref.worlds.temperatures.some((t) => t.id === hex.temperature)) fail('Diese Temperatur gibt es nicht.');
  if (hex.temperature !== undefined && hex.uwp.atmosphere === undefined) fail('Die Temperatur steht da, aber die Atmosphäre fehlt.');
  validateSurface(hex, fail);
  const missing = values.findIndex(([, v]) => v === undefined);
  if (missing >= 0 && values.slice(missing).some(([, v]) => v !== undefined)) fail(`Es fehlt ${values[missing]![0]}, aber Späteres steht schon da.`);
  for (const kind of uwpKinds) {
    const value = hex.uwp[kind];
    if (value === undefined) continue;
    const [min, max] = ranges[kind];
    if (!Number.isInteger(value) || value < min || value > max) fail(`${labels[kind]} ${value} kann kein Wurf ergeben.`);
  }
  if (hex.uwp.starport !== undefined && !ref.worlds.systemContents.some((r) => EHEX.indexOf(r.starport) === hex.uwp.starport)) fail('Diesen Raumhafen gibt es nicht.');
  if (hex.name !== undefined && !hex.name.trim()) fail('Die Welt braucht einen Namen.');
  if (hex.note !== undefined && (hex.empty || stepOf(hex) !== 'done')) fail('Eine Notiz hat nur eine fertige Welt.');
  if (hex.note !== undefined && !hex.note.trim()) fail('Eine leere Notiz gibt es nicht.');
  // Was ohne Wurf feststeht, muss so stehen, wie die Regeln es setzen.
  const settled = settle(hex);
  const port = hex.uwp.starport === undefined ? undefined : ehex(hex.uwp.starport);
  if (port !== undefined && !['A', 'B'].includes(port) && hex.navalBase === true) fail(`Bei Raumhafen ${port} gibt es keine Marinebasis.`);
  if (port !== undefined && ['E', 'X'].includes(port) && hex.scoutBase === true) fail(`Bei Raumhafen ${port} gibt es keine Scoutbasis.`);
  if (hex.uwp.size === 0 && hex.uwp.atmosphere !== undefined && hex.uwp.atmosphere !== 0) fail('Größe 0 hat keine Atmosphäre.');
  if (hex.uwp.size !== undefined && hex.uwp.size <= 1 && hex.uwp.hydrographics !== undefined && hex.uwp.hydrographics !== 0) fail('Größe 0 oder 1 hat keine Hydrographie.');
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
      if (hex.uwp.size !== undefined && hex.uwp.size <= 1) hex = { ...hex, uwp: { ...hex.uwp, hydrographics: 0 } };
      else if (roll.kind === 'hydrographics') {
        hex = applyRoll(hex, roll.kind, total(roll));
        continue;
      }
    }
    hex = enterRoll(hex, roll.kind, total(roll));
  }
  if (old.name !== undefined) {
    if (stepOf(hex) !== 'name') throw new DomainError('Nur eine fertig gewürfelte Welt hat einen Namen.');
    hex = { ...hex, name: old.name };
  }
  return hex;
}
