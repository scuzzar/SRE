// Die Oberflächenkarte einer Welt (Domänenmodell: SurfaceMap, SurfaceCell, City, River, Road).
// Alle Regeln, Tabellen und Hausregeln stehen in docs/konzept-oberflaechenkarte.md; die Abschnitte
// dort sind hier als „Abschnitt n“ genannt. Die Karte entsteht in einem Zug und wird nur als Werte
// gespeichert, gepackt: die Geländeart als ein Zeichen je Feld in der Reihenfolge des Rasters.

import { cityNames } from '../data';
import type { Random } from './ports';
import { adjacent, BOOK_CELLS_PER_EDGE, cellCount, DEGREES_PER_ROW, distances, surfaceGrid, type SurfaceGrid } from './surface-grid';

export type Landform = 'water' | 'waterIce' | 'landIce' | 'tundra' | 'mountain' | 'rugged' | 'desert' | 'jungle' | 'swamp' | 'open' | 'settled';
export type Volcano = 'major' | 'field';
export type CityRank = 'primary' | 'secondary';
export type Port = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';

/** Je Geländeart ein Zeichen im gepackten Text. */
export const LANDFORM_CODES: Readonly<Record<Landform, string>> = {
  water: 'w',
  waterIce: 'i',
  landIce: 'I',
  tundra: 't',
  mountain: 'm',
  rugged: 'r',
  desert: 'd',
  jungle: 'j',
  swamp: 's',
  open: 'o',
  settled: 'e',
};
const LANDFORM_OF: Readonly<Record<string, Landform>> = Object.fromEntries(Object.entries(LANDFORM_CODES).map(([k, v]) => [v, k as Landform]));
export const landforms = Object.keys(LANDFORM_CODES) as readonly Landform[];
export const ports: readonly Port[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/** Eine Haupt- oder Nebenstadt. Ohne Feld liegt sie im Orbit. */
export interface City {
  readonly cell?: number;
  /** Der Name der Stadt (2026-11-14k); nie leer. */
  readonly name: string;
  /** Bevölkerungsziffer: die Stadt hat multiplier × 10^population Einwohner. */
  readonly population: number;
  readonly multiplier: number;
  readonly rank: CityRank;
  readonly port?: Port;
}

/** Die Oberflächenkarte, gepackt wie im Spielstand. */
export interface SurfaceMap {
  /** Ein Zeichen je Feld (siehe LANDFORM_CODES), in der Reihenfolge des Rasters. */
  readonly landforms: string;
  /** Kleinstädte je Feld: [Feld, Zahl], nur Felder mit mindestens einer, aufsteigend. */
  readonly towns?: readonly (readonly [number, number])[];
  /** Vulkane: [Feld, Art], höchstens einer je Feld, aufsteigend. */
  readonly volcanoes?: readonly (readonly [number, Volcano])[];
  /** Je Fluss die Felder von der Quelle bis zur Mündung. */
  readonly rivers?: readonly (readonly number[])[];
  /** Je Straße die Felder. */
  readonly roads?: readonly (readonly number[])[];
  /** Haupt- und Nebenstädte; ihre Nummer ist die Stelle in dieser Liste. */
  readonly cities?: readonly City[];
}

/** Was das Erzeugen von der Welt braucht. */
export interface MapWorld {
  readonly size: number;
  readonly atmosphere: number;
  readonly hydrographics: number;
  readonly population: number;
  readonly tech: number;
  /** 10–14 für A–E, 31 für X. */
  readonly starport: number;
  readonly temperature: 'frozen' | 'cold' | 'temperate' | 'hot' | 'boiling';
  readonly surface: {
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
  };
  readonly populationMultiplier?: number;
  /** Der Name der Welt; die Hauptstadt kann ihn tragen. */
  readonly name?: string;
}

/**
 * Ein Städtename, der noch nicht in `used` steht: zuerst aus der fertigen Liste der Klangart, dann aus
 * Bausteinen zusammengesetzt, zuletzt mit einer Nummer.
 */
export function cityName(style: 'earthly' | 'alien', random: Random, used: ReadonlySet<string>): string {
  const list = cityNames[style];
  for (let tries = 0; tries < 40; tries++) {
    const name = list[random.int(0, list.length - 1)]!;
    if (!used.has(name)) return name;
  }
  const free = list.filter((n) => !used.has(n));
  if (free.length) return free[random.int(0, free.length - 1)]!;
  const { roots, patterns, onsets, nuclei, codas } = cityNames.parts;
  const pick = <T>(items: readonly T[]) => items[random.int(0, items.length - 1)]!;
  for (let tries = 0; tries < 200; tries++) {
    let name: string;
    if (style === 'earthly') name = pick(patterns).replace('{r}', pick(roots));
    else {
      const syllables = 2 + random.int(0, 1);
      name = '';
      for (let k = 0; k < syllables; k++) name += pick(onsets) + pick(nuclei);
      name += pick(codas);
      name = name[0]!.toUpperCase() + name.slice(1);
    }
    if (!used.has(name)) return name;
  }
  let n = 2;
  while (used.has(`${list[0]} ${n}`)) n++;
  return `${list[0]} ${n}`;
}

export function landformAt(map: SurfaceMap, cell: number): Landform {
  return LANDFORM_OF[map.landforms[cell] ?? ''] ?? 'water';
}

export function isWaterLandform(landform: Landform): boolean {
  return landform === 'water' || landform === 'waterIce';
}

/** Unter diesem Jahresmittel in °C liegt dauerhaft Eis (Abschnitt 7, Hausregel: „das ganze Jahr unter 0 °C“). */
export const ICE_BELOW = -10;

/** Grundtemperatur je Stufe in °C (Abschnitt 6, Hausregel). */
export const BASE_TEMPERATURE: Readonly<Record<MapWorld['temperature'], number>> = { frozen: -60, cold: -25, temperate: 15, hot: 55, boiling: 100 };

/** Schritt der Breitengrad-Zuschläge je Größe (Buch S. 66): 3 bei Größe 1 bis 8 bei Größe A. */
export function latitudeStep(size: number): number {
  if (size <= 1) return 3;
  if (size <= 3) return 4;
  if (size <= 5) return 5;
  if (size <= 7) return 6;
  if (size <= 9) return 7;
  return 8;
}

/** Die Hexreihe des Buchs zu einem Breitengrad, als Kommazahl von 1 (Äquator) bis 11 (Pol). */
export function bookRow(latitude: number): number {
  return Math.min(11, Math.max(1, (Math.abs(latitude) / 90) * 11 + 0.5));
}

/** Die Temperatur eines Feldes in °C: Grundtemperatur der Stufe plus Breitengrad-Zuschlag. */
export function cellTemperature(size: number, temperature: MapWorld['temperature'], latitude: number): number {
  return BASE_TEMPERATURE[temperature] + latitudeStep(size) * (4 - bookRow(latitude));
}

/** Die Temperaturen aller Felder. */
export function temperatures(grid: SurfaceGrid, size: number, temperature: MapWorld['temperature']): Float64Array {
  const result = new Float64Array(grid.cells);
  for (let i = 0; i < grid.cells; i++) result[i] = cellTemperature(size, temperature, grid.lat[i]!);
  return result;
}

/** Die Rangfolge der Häfen: A ist der beste. */
function portRank(port: Port | undefined): number {
  return port === undefined ? 99 : ports.indexOf(port);
}

function better(a: Port | undefined, b: Port | undefined): Port | undefined {
  return portRank(a) <= portRank(b) ? a : b;
}

/** Hausregel: so viele Haupt- und Nebenstädte stehen höchstens einzeln auf der Karte. */
export const MAX_PRIMARY = 10;
export const MAX_SECONDARY = 20;

/** Raumhafen-Tabelle der Städte (Buch S. 74), Spalten A–E und X, Zeilen 1–8. */
const CITY_PORTS: Readonly<Record<string, readonly (Port | undefined)[]>> = {
  A: ['D', 'C', 'C', 'B', 'B', 'B', 'B', 'A'],
  B: ['F', 'D', 'D', 'C', 'C', 'B', 'B', 'B'],
  C: ['H', 'G', 'F', 'F', 'E', 'D', 'C', 'C'],
  D: ['H', 'H', 'G', 'G', 'G', 'E', 'E', 'D'],
  E: [undefined, undefined, 'H', 'H', 'H', 'H', 'E', 'E'],
  X: [undefined, undefined, undefined, 'H', 'H', 'H', 'H', 'H'],
};

/** Der Raumhafen des UWP als Buchstabe; X ist keiner. */
export function starportLetter(starport: number): Port | 'X' {
  return starport >= 10 && starport <= 14 ? (['A', 'B', 'C', 'D', 'E'] as const)[starport - 10]! : 'X';
}

/** Würfelt den Bevölkerungsmultiplikator 1–9 mit dem Verfahren des Buchs für Zahlen von 0 bis 9 (S. 1), eine 0 neu. */
export function rollDigit19(random: Random): number {
  for (;;) {
    const digit = rollDigit09(random);
    if (digit > 0) return digit;
  }
}

function rollDigit09(random: Random): number {
  const parity = random.int(1, 6);
  let die = 6;
  while (die === 6) die = random.int(1, 6);
  return parity % 2 === 0 ? die - 1 : die + 4;
}

// --- Erzeugen ---------------------------------------------------------------------------------

/** Die Karte und der Bevölkerungsmultiplikator der Welt (falls sie noch keinen hatte). */
export interface GeneratedMap {
  readonly map: SurfaceMap;
  readonly populationMultiplier?: number;
}

/** Erzeugt die Oberflächenkarte einer Welt ab Größe 1 in einem Zug (Reihenfolge wie im Konzept). */
export function generateSurfaceMap(world: MapWorld, random: Random, taken: ReadonlySet<string> = new Set()): GeneratedMap {
  return new Generator(world, random, taken).run();
}

interface Mass {
  readonly cells: number[];
  readonly kind: 'continent' | 'island' | 'archipelago' | 'ocean' | 'sea' | 'lake';
}

class Generator {
  private readonly grid: SurfaceGrid;
  private readonly n: number;
  /** Ein Hex des Buchs als Fläche bzw. als Länge in Feldern. */
  private readonly f: number;
  private readonly l: number;
  private readonly water: Uint8Array;
  private readonly form: Landform[];
  private readonly noise: Float64Array;
  private readonly plate: Int32Array;
  /** Bewegung der nächsten Plattengrenze je Feld (0 keine, 1 divergent, 2 seitlich, 3 konvergent) und Abstand dazu. */
  private readonly boundaryKind: Uint8Array;
  private readonly boundaryDistance: Int32Array;
  private convergent = 0;
  private readonly overlap: Uint8Array;
  private readonly temperature: Float64Array;
  private readonly volcano = new Map<number, Volcano>();
  private readonly rivers: number[][] = [];
  private readonly roads: number[][] = [];

  constructor(
    private readonly world: MapWorld,
    private readonly random: Random,
    private readonly taken: ReadonlySet<string> = new Set(),
  ) {
    this.grid = surfaceGrid(world.size);
    this.n = this.grid.n;
    this.l = this.n / BOOK_CELLS_PER_EDGE;
    this.f = this.l * this.l;
    const cells = this.grid.cells;
    this.water = new Uint8Array(cells);
    this.form = new Array<Landform>(cells).fill('open');
    this.noise = new Float64Array(cells);
    this.plate = new Int32Array(cells).fill(-1);
    this.boundaryKind = new Uint8Array(cells);
    this.boundaryDistance = new Int32Array(cells).fill(-1);
    this.overlap = new Uint8Array(cells);
    this.temperature = temperatures(this.grid, world.size, world.temperature);
  }

  run(): GeneratedMap {
    this.makeNoise();
    this.makePlates();
    this.placeWaterAndLand();
    this.surfaceForms();
    this.placeVolcanoes();
    this.lifeTerrain();
    this.placeRivers();
    const multiplier = this.world.population > 0 ? (this.world.populationMultiplier ?? rollDigit19(this.random)) : undefined;
    const { cities, towns } = this.civilization(multiplier);
    const map: SurfaceMap = {
      landforms: this.form.map((l) => LANDFORM_CODES[l]).join(''),
      ...(towns.length ? { towns } : {}),
      ...(this.volcano.size ? { volcanoes: [...this.volcano.entries()].sort((a, b) => a[0] - b[0]) } : {}),
      ...(this.rivers.length ? { rivers: this.rivers } : {}),
      ...(this.roads.length ? { roads: this.roads } : {}),
      ...(cities.length ? { cities } : {}),
    };
    return this.world.populationMultiplier === undefined && multiplier !== undefined ? { map, populationMultiplier: multiplier } : { map };
  }

  // --- Würfel und Hilfen ---

  private d6(): number {
    return this.random.int(1, 6);
  }

  private dice(count: number): number {
    let sum = 0;
    for (let i = 0; i < count; i++) sum += this.d6();
    return sum;
  }

  /** Eine Zahl von 0 bis unter 1. */
  private unit(): number {
    return this.random.int(0, 999_999) / 1_000_000;
  }

  /** Eine Fläche in Hexen des Buchs in Feldern, mindestens 1. */
  private area(hexes: number): number {
    return Math.max(1, Math.round(hexes * this.f));
  }

  /** Eine Länge in Hexen des Buchs in Feldern, mindestens 1. */
  private length(hexes: number): number {
    return Math.max(1, Math.round(hexes * this.l));
  }

  private pick<T>(items: readonly T[]): T | undefined {
    return items.length ? items[this.random.int(0, items.length - 1)] : undefined;
  }

  private pickWeighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    let total = 0;
    for (const item of items) total += Math.max(0, weight(item));
    if (total <= 0) return this.pick(items);
    let r = this.unit() * total;
    for (const item of items) {
      r -= Math.max(0, weight(item));
      if (r < 0) return item;
    }
    return items[items.length - 1];
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.random.int(0, i);
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }

  private isLand(cell: number): boolean {
    return this.water[cell] === 0;
  }

  /** Ein glattes Rauschen auf der Kugel aus überlagerten Wellen, je Feld 0 bis 1. */
  private makeNoise(): void {
    const waves = Array.from({ length: 14 }, (_, k) => {
      const z = this.unit() * 2 - 1;
      const t = this.unit() * Math.PI * 2;
      const r = Math.sqrt(1 - z * z);
      return { x: r * Math.cos(t), y: r * Math.sin(t), z, freq: 1.5 + k * 0.6 + this.unit(), phase: this.unit() * Math.PI * 2 };
    });
    const p = this.grid.xyz;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < this.grid.cells; i++) {
      let v = 0;
      for (const w of waves) v += Math.sin((p[i * 3]! * w.x + p[i * 3 + 1]! * w.y + p[i * 3 + 2]! * w.z) * w.freq * 3 + w.phase) / w.freq;
      this.noise[i] = v;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    for (let i = 0; i < this.grid.cells; i++) this.noise[i] = (this.noise[i]! - min) / (max - min || 1);
  }

  /**
   * Wachstum (Abschnitt 1): Die Fläche wächst vom Startfeld aus, je Schritt um ein freies Nachbarfeld,
   * das `allowed` erfüllt, zufällig und mit dem Rauschen gewichtet.
   */
  private grow(start: number, size: number, allowed: (cell: number) => boolean, take: (cell: number) => void, rough = 1): number[] {
    const taken: number[] = [];
    const inMass = new Set<number>();
    const frontier: number[] = [];
    const inFrontier = new Set<number>();
    const add = (cell: number) => {
      inMass.add(cell);
      taken.push(cell);
      take(cell);
      for (const q of this.grid.neighbors[cell]!) {
        if (!inMass.has(q) && !inFrontier.has(q)) {
          inFrontier.add(q);
          frontier.push(q);
        }
      }
    };
    if (!allowed(start)) return taken;
    add(start);
    while (taken.length < size) {
      // Ein paar Kandidaten aus dem Rand ziehen und den mit dem höchsten Rauschwert nehmen.
      let best = -1;
      let bestScore = -Infinity;
      for (let tries = 0; tries < 6 && frontier.length; tries++) {
        const k = this.random.int(0, frontier.length - 1);
        const cell = frontier[k]!;
        if (inMass.has(cell) || !allowed(cell)) {
          frontier[k] = frontier[frontier.length - 1]!;
          frontier.pop();
          inFrontier.delete(cell);
          tries--;
          continue;
        }
        const score = this.noise[cell]! * rough + this.unit();
        if (score > bestScore) {
          bestScore = score;
          best = cell;
        }
      }
      if (best < 0) break;
      const k = frontier.indexOf(best);
      frontier[k] = frontier[frontier.length - 1]!;
      frontier.pop();
      inFrontier.delete(best);
      add(best);
    }
    return taken;
  }

  // --- Abschnitt 3: Platten ---

  private makePlates(): void {
    const count = Math.max(1, this.world.surface.plates);
    const cells = this.grid.cells;
    const targets: number[] = [];
    for (let k = 0; k < count - 1; k++) targets.push(this.area(this.dice(2) * 5 * this.d6()));
    targets.push(Infinity);
    // Startfelder weit auseinander: von mehreren Zufallsfeldern das mit dem größten Abstand zu den bisherigen.
    const seeds: number[] = [];
    for (let k = 0; k < count; k++) {
      let best = this.random.int(0, cells - 1);
      let bestDistance = -1;
      for (let tries = 0; tries < 12; tries++) {
        const cell = this.random.int(0, cells - 1);
        let near = Infinity;
        for (const s of seeds) near = Math.min(near, 1 - this.dot(cell, s));
        if (near > bestDistance) {
          bestDistance = near;
          best = cell;
        }
      }
      seeds.push(best);
    }
    const frontiers = seeds.map((s) => [s]);
    const sizes = new Array<number>(count).fill(0);
    let assigned = 0;
    let active = true;
    while (assigned < cells && active) {
      active = false;
      for (let k = 0; k < count; k++) {
        const allFull = sizes.every((s, i) => s >= targets[i]! || frontiers[i]!.length === 0);
        if (sizes[k]! >= targets[k]! && !allFull) continue;
        const frontier = frontiers[k]!;
        while (frontier.length) {
          const i = this.random.int(0, frontier.length - 1);
          const cell = frontier[i]!;
          frontier[i] = frontier[frontier.length - 1]!;
          frontier.pop();
          if (this.plate[cell] !== -1) continue;
          this.plate[cell] = k;
          sizes[k]!++;
          assigned++;
          for (const q of this.grid.neighbors[cell]!) if (this.plate[q] === -1) frontier.push(q);
          active = true;
          break;
        }
      }
    }
    // Was übrig ist (abgeschnitten), geht an eine benachbarte Platte.
    for (let changed = true; changed; ) {
      changed = false;
      for (let c = 0; c < cells; c++) {
        if (this.plate[c] !== -1) continue;
        const q = this.grid.neighbors[c]!.find((x) => this.plate[x] !== -1);
        if (q !== undefined) {
          this.plate[c] = this.plate[q]!;
          changed = true;
        }
      }
    }
    // Grenzen und ihre Bewegung, 2W6 je Paar von Platten.
    const movement = new Map<string, number>();
    const boundary: number[] = [];
    for (let c = 0; c < cells; c++) {
      for (const q of this.grid.neighbors[c]!) {
        if (this.plate[q] === this.plate[c]) continue;
        const a = Math.min(this.plate[c]!, this.plate[q]!);
        const b = Math.max(this.plate[c]!, this.plate[q]!);
        const key = `${a}-${b}`;
        if (!movement.has(key)) {
          const roll = this.dice(2);
          const kind = roll <= 5 ? 3 : roll <= 8 ? 2 : 1;
          movement.set(key, kind);
          if (kind === 3) this.convergent++;
        }
        this.boundaryKind[c] = Math.max(this.boundaryKind[c]!, movement.get(key)!);
      }
      if (this.boundaryKind[c]) boundary.push(c);
    }
    // Abstand und Art der nächsten Grenze für jedes Feld.
    const queue = [...boundary];
    for (const c of boundary) this.boundaryDistance[c] = 0;
    for (let head = 0; head < queue.length; head++) {
      const c = queue[head]!;
      for (const q of this.grid.neighbors[c]!) {
        if (this.boundaryDistance[q] !== -1) continue;
        this.boundaryDistance[q] = this.boundaryDistance[c]! + 1;
        this.boundaryKind[q] = this.boundaryKind[c]!;
        queue.push(q);
      }
    }
    if (!boundary.length) for (let c = 0; c < cells; c++) this.boundaryDistance[c] = this.n * 4;
  }

  private dot(a: number, b: number): number {
    const p = this.grid.xyz;
    return p[a * 3]! * p[b * 3]! + p[a * 3 + 1]! * p[b * 3 + 1]! + p[a * 3 + 2]! * p[b * 3 + 2]!;
  }

  // --- Abschnitte 4 und 5: Wasser und Land ---

  /** Größen der großen und kleinen Massen: kleine je 4–9 %, große teilen sich den Rest, jede mindestens 15 %. */
  private massSizes(total: number, major: number, minor: number): { major: number[]; minor: number[] } {
    if (total <= 0) return { major: [], minor: [] };
    let minors = Array.from({ length: minor }, () => Math.round(((this.d6() + 3) / 100) * total));
    let rest = total - minors.reduce((s, x) => s + x, 0);
    if (major > 0) {
      const need = Math.ceil(0.15 * total) * major;
      if (rest < need) {
        const scale = Math.max(0, total - need) / Math.max(1, total - rest);
        minors = minors.map((m) => Math.floor(m * scale));
        rest = total - minors.reduce((s, x) => s + x, 0);
      }
      const shares = Array.from({ length: major }, () => 0.8 + this.unit() * 0.4);
      const sum = shares.reduce((s, x) => s + x, 0);
      let majors = shares.map((s) => Math.max(Math.ceil(0.15 * total), Math.floor((rest * s) / sum)));
      const over = majors.reduce((s, x) => s + x, 0) - rest;
      if (over > 0) majors = majors.map((m, i) => (i === 0 ? m - over : m));
      return { major: majors.filter((m) => m > 0), minor: minors.filter((m) => m > 0) };
    }
    return { major: [], minor: minors.filter((m) => m > 0) };
  }

  private placeWaterAndLand(): void {
    const s = this.world.surface;
    const cells = this.grid.cells;
    const waterTarget = Math.round((s.water / 100) * cells);
    if (s.water <= 0) return;
    if (s.water >= 100) {
      this.water.fill(1);
      const islands = Math.max(0, this.d6() - 3);
      for (let k = 0; k < islands; k++) this.placeLandMass(this.area(1), 'island');
      return;
    }
    if (s.water >= 50) {
      this.water.fill(1);
      const land = cells - waterTarget;
      const archipelagoCells = Math.max(1, Math.round(this.f / 2));
      let left = land;
      const continents = this.massSizes(Math.max(0, land - s.archipelagos * archipelagoCells - s.majorIslands * this.area(1)), s.majorContinents, s.minorContinents);
      const order = [...continents.major, ...continents.minor];
      const platesBySize = this.platesBySize();
      order.forEach((size, i) => {
        this.placeContinent(size, platesBySize[i % platesBySize.length]!);
        left -= size;
      });
      for (let k = 0; k < s.majorIslands && left > 0; k++) left -= this.placeLandMass(this.area(1), 'island').length;
      for (let k = 0; k < s.archipelagos && left > 0; k++) left -= this.placeArchipelago(archipelagoCells);
      // Binnenmeere in den Kontinenten.
      for (const [i, size] of order.entries()) {
        const seas = Math.max(0, this.d6() - (i < continents.major.length ? 3 : 4));
        for (let k = 0; k < seas; k++) this.placeWaterBody(this.area(1), 'inland');
        void size;
      }
    } else {
      const lakeCells = Math.max(1, Math.round(this.f / 2));
      const seaCells = this.area(1);
      const oceans = this.massSizes(Math.max(0, waterTarget - s.scatteredLakes * lakeCells - s.smallSeas * seaCells), s.majorOceans, s.minorOceans);
      oceans.major.forEach((size) => this.placeOcean(size));
      oceans.minor.forEach((size) => this.placeOcean(size));
      for (let k = 0; k < s.smallSeas; k++) this.placeWaterBody(seaCells, 'inland');
      for (let k = 0; k < s.scatteredLakes; k++) this.placeWaterBody(lakeCells, 'inland');
      // Inseln in den Ozeanen.
      oceans.major.forEach(() => {
        for (let k = this.d6() - 3; k > 0; k--) this.placeLandMass(this.area(1), 'island');
      });
      oceans.minor.forEach(() => {
        for (let k = this.d6() - 4; k > 0; k--) this.placeLandMass(this.area(1), 'island');
      });
    }
    this.balance(waterTarget);
    this.bridges();
    this.balance(waterTarget);
  }

  private platesBySize(): number[] {
    const sizes = new Map<number, number>();
    for (let c = 0; c < this.grid.cells; c++) sizes.set(this.plate[c]!, (sizes.get(this.plate[c]!) ?? 0) + 1);
    return [...sizes.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }

  /** Ein Kontinent auf seiner Platte (Abschnitt 5): Überlappung bei 8+ auf 2W6. */
  private placeContinent(size: number, home: number): void {
    const overlaps = this.dice(2) >= 8;
    const homeCells: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) if (this.plate[c] === home && this.water[c] && !this.touchesLand(c)) homeCells.push(c);
    if (!homeCells.length) {
      this.placeLandMass(size, 'continent');
      return;
    }
    let start: number;
    let neighbor = -1;
    if (overlaps) {
      const near = homeCells.filter((c) => this.boundaryDistance[c]! <= this.length(3));
      start = this.pick(near) ?? this.pick(homeCells)!;
      neighbor = this.plate[this.nearestOtherPlateCell(start)] ?? -1;
    } else {
      const deepest = Math.max(...homeCells.map((c) => this.boundaryDistance[c]!));
      start = this.pick(homeCells.filter((c) => this.boundaryDistance[c]! >= deepest - Math.max(1, Math.round(this.l)))) ?? homeCells[0]!;
    }
    const taken = new Set<number>();
    const freeWater = (c: number) => this.water[c] === 1 && !this.touchesOtherLand(c, taken);
    const onPlates = (c: number) => this.plate[c] === home || this.plate[c] === neighbor;
    let cells = this.grow(start, size, (c) => freeWater(c) && onPlates(c), (c) => {
      this.water[c] = 0;
      taken.add(c);
    });
    if (cells.length < size) {
      // Zu groß für die Platte: auch auf die Nachbarplatten.
      const more = this.growFrom(cells, size - cells.length, freeWater, taken);
      cells = cells.concat(more);
    }
    for (const c of cells) if (this.plate[c] !== home) this.overlap[c] = 1;
  }

  /** Lässt eine bestehende Fläche weiter wachsen. */
  private growFrom(mass: readonly number[], extra: number, allowed: (cell: number) => boolean, taken: Set<number>): number[] {
    const added: number[] = [];
    const frontier: number[] = [];
    const queued = new Set<number>();
    const enqueue = (c: number) => {
      for (const q of this.grid.neighbors[c]!) {
        if (!taken.has(q) && !queued.has(q)) {
          queued.add(q);
          frontier.push(q);
        }
      }
    };
    mass.forEach(enqueue);
    while (added.length < extra && frontier.length) {
      const k = this.random.int(0, frontier.length - 1);
      const next = frontier[k]!;
      frontier[k] = frontier[frontier.length - 1]!;
      frontier.pop();
      queued.delete(next);
      if (taken.has(next) || !allowed(next)) continue;
      this.water[next] = 0;
      taken.add(next);
      added.push(next);
      enqueue(next);
    }
    return added;
  }

  private nearestOtherPlateCell(start: number): number {
    const own = this.plate[start];
    const dist = distances(this.grid, [start]);
    let best = start;
    let bestD = Infinity;
    for (let c = 0; c < this.grid.cells; c++) {
      if (this.plate[c] !== own && dist[c]! >= 0 && dist[c]! < bestD) {
        bestD = dist[c]!;
        best = c;
      }
    }
    return best;
  }

  private touchesLand(cell: number): boolean {
    return this.grid.neighbors[cell]!.some((q) => this.water[q] === 0);
  }

  private touchesOtherLand(cell: number, own: Set<number>): boolean {
    return this.grid.neighbors[cell]!.some((q) => this.water[q] === 0 && !own.has(q));
  }

  private touchesOtherWater(cell: number, own: Set<number>): boolean {
    return this.grid.neighbors[cell]!.some((q) => this.water[q] === 1 && !own.has(q));
  }

  /** Eine zusammenhängende Landmasse im Wasser, ohne anderes Land zu berühren. */
  private placeLandMass(size: number, kind: Mass['kind']): number[] {
    const candidates: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) if (this.water[c] && !this.touchesLand(c)) candidates.push(c);
    const start = this.pick(candidates);
    if (start === undefined) return [];
    const taken = new Set<number>();
    void kind;
    return this.grow(start, size, (c) => this.water[c] === 1 && !this.touchesOtherLand(c, taken), (c) => {
      this.water[c] = 0;
      taken.add(c);
    });
  }

  /** Ein Archipel: kleine Inseln in einem Umkreis von 2 Hexen, nicht zusammenhängend. */
  private placeArchipelago(size: number): number {
    const candidates: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) if (this.water[c] && !this.touchesLand(c)) candidates.push(c);
    const center = this.pick(candidates);
    if (center === undefined) return 0;
    const dist = distances(this.grid, [center], () => true, this.length(2));
    const spots = this.shuffle(candidates.filter((c) => dist[c]! >= 0));
    let placed = 0;
    for (const c of spots) {
      if (placed >= size) break;
      if (this.touchesLand(c)) continue;
      this.water[c] = 0;
      placed++;
    }
    return placed;
  }

  /** Ein Ozean bei 1–49 % Wasser: Startfeld weit weg von anderem Wasser, ohne es zu berühren. */
  private placeOcean(size: number): void {
    const land: number[] = [];
    const waterCells: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) (this.water[c] ? waterCells : land).push(c);
    let start = this.pick(land.filter((c) => !this.touchesWater(c)));
    if (waterCells.length) {
      const dist = distances(this.grid, waterCells);
      let far = -1;
      for (let tries = 0; tries < 20; tries++) {
        const c = this.pick(land)!;
        if (dist[c]! > far && !this.touchesWater(c)) {
          far = dist[c]!;
          start = c;
        }
      }
    }
    if (start === undefined) return;
    const taken = new Set<number>();
    this.grow(start, size, (c) => this.water[c] === 0 && !this.touchesOtherWater(c, taken), (c) => {
      this.water[c] = 1;
      taken.add(c);
    });
  }

  private touchesWater(cell: number): boolean {
    return this.grid.neighbors[cell]!.some((q) => this.water[q] === 1);
  }

  /** Ein Gewässer ganz im Land (kleines Meer, See, Binnenmeer), ohne anderes Wasser zu berühren. */
  private placeWaterBody(size: number, where: 'inland'): void {
    void where;
    const candidates: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) if (!this.water[c] && !this.touchesWater(c) && this.grid.neighbors[c]!.every((q) => !this.touchesWater(q))) candidates.push(c);
    const start = this.pick(candidates);
    if (start === undefined) return;
    const taken = new Set<number>();
    this.grow(start, size, (c) => this.water[c] === 0 && !this.touchesOtherWater(c, taken) && this.grid.neighbors[c]!.every((q) => this.water[q] === 0 || taken.has(q) || !this.touchesOtherWater(q, taken)), (c) => {
      this.water[c] = 1;
      taken.add(c);
    });
  }

  /** Gleicht die Zahl der Wasserfelder aus, indem Küstenfelder umgewandelt werden (Abschnitt 4). */
  private balance(target: number): void {
    let count = 0;
    for (let c = 0; c < this.grid.cells; c++) count += this.water[c]!;
    let guard = this.grid.cells * 2;
    while (count !== target && guard-- > 0) {
      const toWater = count < target;
      const coast: number[] = [];
      for (let c = 0; c < this.grid.cells; c++) {
        if (toWater ? this.water[c] === 0 && this.touchesWater(c) : this.water[c] === 1 && this.touchesLand(c)) coast.push(c);
      }
      if (!coast.length) {
        // Kein Küstenfeld (alles Land oder alles Wasser): irgendein Feld.
        const any: number[] = [];
        for (let c = 0; c < this.grid.cells; c++) if (this.water[c] === (toWater ? 0 : 1)) any.push(c);
        coast.push(...any);
      }
      this.shuffle(coast);
      for (const c of coast) {
        if (count === target) break;
        // Nur umwandeln, wenn es nicht schon durch ein früheres Umwandeln in dieser Runde unpassend wurde.
        if (this.water[c] === (toWater ? 1 : 0)) continue;
        this.water[c] = toWater ? 1 : 0;
        count += toWater ? 1 : -1;
      }
    }
  }

  /** Landengen und Meerengen (Abschnitt 5): Massen, die nur ein Hex trennt, verbinden sich bei 9+. */
  private bridges(): void {
    const gap = this.length(1);
    for (const landSide of [true, false]) {
      const parts = this.components((c) => this.isLand(c) === landSide);
      const big = parts.filter((p) => p.length >= this.area(2));
      const id = new Int32Array(this.grid.cells).fill(-1);
      big.forEach((p, i) => p.forEach((c) => (id[c] = i)));
      const done = new Set<string>();
      for (const [i, part] of big.entries()) {
        // Breitensuche durch das Trennende, höchstens `gap` Felder weit.
        const prev = new Map<number, number>();
        const depth = new Map<number, number>();
        const queue: number[] = [];
        for (const c of part) {
          depth.set(c, 0);
          queue.push(c);
        }
        for (let head = 0; head < queue.length; head++) {
          const c = queue[head]!;
          const d = depth.get(c)!;
          for (const q of this.grid.neighbors[c]!) {
            if (depth.has(q)) continue;
            if (id[q] !== -1 && id[q] !== i && d >= 1) {
              const key = `${Math.min(i, id[q]!)}-${Math.max(i, id[q]!)}`;
              if (done.has(key)) continue;
              done.add(key);
              if (this.dice(2) >= 9) {
                for (let x: number | undefined = c; x !== undefined && depth.get(x)! > 0; x = prev.get(x)) this.water[x] = landSide ? 0 : 1;
              }
              continue;
            }
            if (this.isLand(q) === landSide || d >= gap) continue;
            depth.set(q, d + 1);
            prev.set(q, c);
            queue.push(q);
          }
        }
      }
    }
  }

  /** Zusammenhängende Gruppen der Felder, die `inside` erfüllen. */
  private components(inside: (cell: number) => boolean): number[][] {
    const seen = new Uint8Array(this.grid.cells);
    const result: number[][] = [];
    for (let c = 0; c < this.grid.cells; c++) {
      if (seen[c] || !inside(c)) continue;
      const part = [c];
      seen[c] = 1;
      for (let head = 0; head < part.length; head++) {
        for (const q of this.grid.neighbors[part[head]!]!) {
          if (!seen[q] && inside(q)) {
            seen[q] = 1;
            part.push(q);
          }
        }
      }
      result.push(part);
    }
    return result;
  }

  // --- Abschnitt 7: Oberflächenformen ---

  private freezeLatitude: [number, number] = [Infinity, Infinity];
  private glaciation = new Uint8Array(0);

  private surfaceForms(): void {
    const cells = this.grid.cells;
    for (let c = 0; c < cells; c++) this.form[c] = this.water[c] ? 'water' : 'open';
    // Eis und Tundra.
    let anyIce = false;
    let anyWarm = false;
    for (let c = 0; c < cells; c++) {
      if (this.temperature[c]! < ICE_BELOW) {
        this.form[c] = this.water[c] ? 'waterIce' : 'landIce';
        anyIce = true;
        const h = this.grid.lat[c]! >= 0 ? 0 : 1;
        this.freezeLatitude[h] = Math.min(this.freezeLatitude[h]!, Math.abs(this.grid.lat[c]!));
      } else anyWarm = true;
    }
    for (let c = 0; c < cells; c++) {
      if (this.form[c] === 'open' && this.grid.neighbors[c]!.some((q) => this.form[q] === 'landIce' || this.form[q] === 'waterIce')) this.form[c] = 'tundra';
    }
    // Vergletscherung: 1W6 − 1 Reihen von der Frostlinie zum Äquator.
    this.glaciation = new Uint8Array(cells);
    const rows = this.d6() - 1;
    if (anyIce && anyWarm && rows > 0) {
      for (let c = 0; c < cells; c++) {
        const h = this.grid.lat[c]! >= 0 ? 0 : 1;
        const freeze = this.freezeLatitude[h]!;
        if (freeze !== Infinity && this.temperature[c]! >= ICE_BELOW && Math.abs(this.grid.lat[c]!) >= freeze - rows * DEGREES_PER_ROW) this.glaciation[c] = 1;
      }
    }
    // Gebirge: (2W6 − 2) × 1W6 % der Landfelder, die Hälfte Gebirge, der Rest zerklüftet.
    const land: number[] = [];
    for (let c = 0; c < cells; c++) if (this.form[c] === 'open' || this.form[c] === 'tundra') land.push(c);
    const total = Math.round((((this.dice(2) - 2) * this.d6()) / 100) * land.length);
    const mountains = Math.ceil(total / 2);
    this.placeMountains(mountains, land);
    this.placeRugged(total - mountains);
    // Zusätzlich in der Vergletscherungszone je Kartendreieck 1W6 Hexe zerklüftet und ebenso viele Gebirge.
    for (let face = 0; face < 20; face++) {
      const zone = land.filter((c) => this.grid.face[c] === face && this.glaciation[c] && (this.form[c] === 'open' || this.form[c] === 'tundra'));
      if (!zone.length) continue;
      // Hausregel: höchstens die Hälfte des flachen Landes der Zone im Dreieck, je zur Hälfte.
      const count = Math.min(this.area(this.d6()), Math.floor(zone.length / 4));
      this.shuffle(zone);
      zone.slice(0, count).forEach((c) => (this.form[c] = 'rugged'));
      zone.slice(count, count * 2).forEach((c) => (this.form[c] = 'mountain'));
    }
  }

  private plain(cell: number): boolean {
    return this.form[cell] === 'open' || this.form[cell] === 'tundra';
  }

  private placeMountains(count: number, land: readonly number[]): void {
    const near = this.length(1);
    const weight = (c: number) => (this.boundaryDistance[c]! <= near ? [0, 1, 2, 3][this.boundaryKind[c]!]! * (this.overlap[c] ? 2 : 1) : 0);
    // Startfelder nach Gewicht ziehen: kumulierte Liste einmal bauen, schon belegte Felder überspringen.
    const pool = land.filter((c) => weight(c) > 0);
    const cumulative: number[] = [];
    let total = 0;
    for (const c of pool) cumulative.push((total += weight(c)));
    const drawStart = (): number | undefined => {
      for (let tries = 0; tries < 40; tries++) {
        let c: number | undefined;
        if (pool.length && tries < 30) {
          const r = this.unit() * total;
          let lo = 0;
          let hi = cumulative.length - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (cumulative[mid]! > r) hi = mid;
            else lo = mid + 1;
          }
          c = pool[lo];
        } else c = this.pick(land);
        if (c !== undefined && this.plain(c)) return c;
      }
      return land.find((c) => this.plain(c));
    };
    let placed = 0;
    while (placed < count) {
      const start = drawStart();
      if (start === undefined) break;
      // Eine Kette entlang der Grenze.
      let cell = start;
      const chain = Math.min(count - placed, 3 + this.random.int(0, Math.max(1, Math.round(6 * this.l))));
      for (let k = 0; k < chain; k++) {
        this.form[cell] = 'mountain';
        placed++;
        const next = this.grid.neighbors[cell]!.filter((q) => this.plain(q));
        const step = this.pickWeighted(next, (q) => 1 + (this.boundaryDistance[q]! <= near ? 3 : 0) + this.noise[q]!);
        if (step === undefined) break;
        cell = step;
      }
    }
  }

  private placeRugged(count: number): void {
    const besideMountains: number[] = [];
    const rest: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) {
      if (!this.plain(c)) continue;
      (this.grid.neighbors[c]!.some((q) => this.form[q] === 'mountain') ? besideMountains : rest).push(c);
    }
    const order = [...this.shuffle(besideMountains), ...this.shuffle(rest)];
    order.slice(0, count).forEach((c) => (this.form[c] = 'rugged'));
  }

  // --- Vulkane (Abschnitt 7, Hausregel für die Zahl) ---

  private placeVolcanoes(): void {
    const majors = Math.min(12, this.d6() - 1 + this.convergent);
    const fields = this.d6() - 1;
    const land: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) if (!this.water[c] && this.form[c] !== 'landIce') land.push(c);
    const small = new Set(this.components((c) => this.isLand(c)).filter((p) => p.length <= this.area(1)).flat());
    const near = this.length(1);
    const preference = (c: number) => {
      if (this.form[c] === 'rugged' || small.has(c)) return 3;
      if (this.grid.neighbors[c]!.some((q) => this.form[q] === 'mountain')) return 2;
      return 1;
    };
    const spacing = this.length(2);
    const place = (count: number, kind: Volcano, boundary: boolean) => {
      for (let k = 0; k < count; k++) {
        const taken = [...this.volcano.keys()];
        const dist = taken.length ? distances(this.grid, taken, () => true, spacing) : undefined;
        const free = land.filter((c) => !this.volcano.has(c) && (!dist || dist[c] === -1));
        const atBoundary = boundary ? free.filter((c) => this.boundaryDistance[c]! <= near && this.boundaryKind[c]! >= 2) : free;
        const pool = atBoundary.length ? atBoundary : free;
        if (!pool.length) return;
        const top = Math.max(...pool.map(preference));
        const cell = this.pick(pool.filter((c) => preference(c) === top))!;
        this.volcano.set(cell, kind);
      }
    };
    place(majors, 'major', true);
    place(fields, 'field', false);
  }

  // --- Abschnitt 8: Gelände durch Leben ---

  private lifeTerrain(): void {
    const cells = this.grid.cells;
    const h = this.world.hydrographics;
    if (!this.world.surface.life) {
      for (let c = 0; c < cells; c++) if (this.form[c] === 'open') this.form[c] = 'desert';
      return;
    }
    const continents = this.components((c) => this.isLand(c)).filter((p) => p.length >= this.area(2));
    const single = continents.length === 1;
    const regions = single ? Array.from({ length: 20 }, (_, face) => continents[0]!.filter((c) => this.grid.face[c] === face)) : continents;
    const coastDistance = distances(this.grid, Array.from({ length: cells }, (_, c) => c).filter((c) => this.water[c] === 1));
    // Kontinentale Wüste.
    for (const region of regions) {
      const inRegion = new Set(region);
      const groups = this.components((c) => inRegion.has(c) && this.form[c] === 'open');
      const group = groups.find((g) => g.length >= this.area(10));
      if (!group || this.dice(2) < h) continue;
      const size = this.area(this.dice(2) - 1);
      const deepest = group.reduce((a, b) => (coastDistance[b]! > coastDistance[a]! ? b : a));
      const inGroup = new Set(group);
      this.grow(deepest, size, (c) => inGroup.has(c) && this.form[c] === 'open' && (coastDistance[c]! > 1 || group.length < size * 2), (c) => (this.form[c] = 'desert'), 0.5);
    }
    // Regenschattenwüste: H − 1W6 Hexe neben zerklüftet oder Gebirge, nie direkt am Wasser.
    const windshadow = (h - this.d6()) * this.f;
    if (windshadow > 0) {
      const candidates = this.shuffle(this.cellsWhere((c) => this.form[c] === 'open' && !this.touchesWater(c) && this.grid.neighbors[c]!.some((q) => this.form[q] === 'rugged' || this.form[q] === 'mountain')));
      candidates.slice(0, Math.round(windshadow)).forEach((c) => (this.form[c] = 'desert'));
    }
    // Küstenwüste: H − 2W6 Hexe an der Küste, höchstens 4 Reihen von der Polkappe.
    const coastal = (h - this.dice(2)) * this.f;
    if (coastal > 0) {
      const nearCap = (c: number) => {
        const freeze = this.freezeLatitude[this.grid.lat[c]! >= 0 ? 0 : 1]!;
        return freeze !== Infinity && Math.abs(this.grid.lat[c]!) >= freeze - 4 * DEGREES_PER_ROW;
      };
      const candidates = this.shuffle(this.cellsWhere((c) => this.form[c] === 'open' && this.touchesWater(c) && nearCap(c)));
      candidates.slice(0, Math.round(coastal)).forEach((c) => (this.form[c] = 'desert'));
    }
    // Dschungel: 20–40 °C, höchstens 3 Hexe vom Meer, nie neben Wüste.
    const seaCells = this.components((c) => this.water[c] === 1).filter((p) => p.length >= this.area(1)).flat();
    const seaDistance = distances(this.grid, seaCells);
    const jungleOk = (c: number) => this.form[c] === 'open' && this.temperature[c]! >= 20 && this.temperature[c]! <= 40 && seaDistance[c]! >= 0 && seaDistance[c]! <= this.length(3) && !this.grid.neighbors[c]!.some((q) => this.form[q] === 'desert');
    for (const region of regions) {
      const inRegion = new Set(region);
      const group = this.components((c) => inRegion.has(c) && jungleOk(c)).find((g) => g.length >= this.area(10));
      if (!group || this.dice(2) > h) continue;
      const inGroup = new Set(group);
      this.grow(this.pick(group)!, this.area(this.dice(2) - 1), (c) => inGroup.has(c) && jungleOk(c), (c) => (this.form[c] = 'jungle'));
    }
    // Sumpf nur, wenn alles Wasser verstreute Seen sind.
    const s = this.world.surface;
    if (s.scatteredLakes > 0 && s.majorOceans + s.minorOceans + s.smallSeas === 0 && s.scatteredLakes === s.water * 10) {
      for (const c of this.cellsWhere((x) => this.form[x] === 'open' && this.temperature[x]! > 0 && this.touchesWater(x))) if (this.d6() >= 4) this.form[c] = 'swamp';
    }
  }

  private cellsWhere(test: (cell: number) => boolean): number[] {
    const result: number[] = [];
    for (let c = 0; c < this.grid.cells; c++) if (test(c)) result.push(c);
    return result;
  }

  // --- Abschnitt 9: Flüsse ---

  private placeRivers(): void {
    const cells = this.grid.cells;
    const continents = this.components((c) => this.isLand(c)).filter((p) => p.length >= this.area(2));
    const single = continents.length === 1;
    const coast = distances(this.grid, this.cellsWhere((c) => this.water[c] === 1));
    const used = new Uint8Array(cells);
    const groups = single ? Array.from({ length: 20 }, (_, face) => continents[0]!.filter((c) => this.grid.face[c] === face)).filter((g) => g.length >= this.area(10)) : continents;
    for (const group of groups) {
      const count = this.d6() - 1;
      const inGroup = new Set(group);
      const mouths = this.shuffle(group.filter((c) => coast[c] === 1 && this.form[c] !== 'landIce'));
      const jungle = group.filter((c) => this.form[c] === 'jungle');
      if (jungle.length && mouths.length) {
        // Der erste Fluss mündet nahe am Dschungel, damit er hindurch führen kann.
        const toJungle = distances(this.grid, jungle, (c) => inGroup.has(c));
        mouths.sort((a, b) => (toJungle[a]! < 0 ? 1e9 : toJungle[a]!) - (toJungle[b]! < 0 ? 1e9 : toJungle[b]!));
      }
      for (let k = 0; k < count && mouths.length; k++) {
        const mouth = mouths.shift()!;
        if (used[mouth]) continue;
        const length = this.length(this.d6());
        const path = [mouth];
        let cell = mouth;
        while (path.length < length) {
          if (this.form[cell] === 'mountain' || this.form[cell] === 'rugged') break;
          const next = this.grid.neighbors[cell]!.filter((q) => inGroup.has(q) && !used[q] && !path.includes(q) && coast[q]! > coast[cell]! && this.form[q] !== 'landIce');
          const step = this.pickWeighted(next, (q) => 1 + this.noise[q]! + (this.form[q] === 'jungle' ? 3 : 0) + (this.form[q] === 'mountain' || this.form[q] === 'rugged' ? 1 : 0));
          if (step === undefined) break;
          path.push(step);
          cell = step;
        }
        if (path.length < 2) continue;
        path.forEach((c) => (used[c] = 1));
        this.rivers.push(path.reverse());
      }
    }
  }

  // --- Abschnitt 10: Zivilisation ---

  private civilization(multiplier: number | undefined): { cities: City[]; towns: [number, number][] } {
    const P = this.world.population;
    if (P <= 0 || multiplier === undefined) return { cities: [], towns: [] };
    const groups = this.cityGroups(P, multiplier);
    if (!groups.length) return { cities: [], towns: [] };
    // Rang: Hauptstädte aus den höchsten Ziffern, höchstens 10; Nebenstädte eine Ziffer darunter.
    const digits = [...new Set(groups.map((g) => g.population))].sort((a, b) => b - a);
    let primaryDigits = 0;
    let primaryCount = 0;
    for (const d of digits) {
      const count = groups.filter((g) => g.population === d).reduce((s, g) => s + g.count, 0);
      if (primaryDigits > 0 && primaryCount + count > 10) break;
      primaryDigits++;
      primaryCount += count;
    }
    const lowestPrimary = digits[primaryDigits - 1]!;
    const listed: { population: number; multiplier: number; rank: CityRank; port?: Port; orbit?: boolean }[] = [];
    let townCount = 0;
    let townDigit = 0;
    for (const g of groups) {
      const rank: CityRank | undefined = g.population >= lowestPrimary ? 'primary' : g.population === lowestPrimary - 1 ? 'secondary' : undefined;
      if (rank) for (let k = 0; k < g.count; k++) listed.push({ population: g.population, multiplier: g.multipliers[k] ?? 5, rank });
      else {
        townCount += g.count;
        townDigit = Math.max(townDigit, g.population);
      }
    }
    listed.sort((a, b) => b.population - a.population || b.multiplier - a.multiplier);
    // Hausregel: einzeln höchstens 10 Haupt- und 20 Nebenstädte; die übrigen zählen als Kleinstädte.
    const primaries = listed.filter((c) => c.rank === 'primary');
    const secondaries = listed.filter((c) => c.rank === 'secondary');
    const extra = [...primaries.slice(MAX_PRIMARY), ...secondaries.slice(MAX_SECONDARY)];
    for (const c of extra) {
      townCount++;
      townDigit = Math.max(townDigit, c.population);
    }
    listed.length = 0;
    listed.push(...primaries.slice(0, MAX_PRIMARY), ...secondaries.slice(0, MAX_SECONDARY));
    this.assignPorts(listed);
    this.orbitalCities(listed, P, multiplier);
    const placed = this.placeCities(listed, townCount, townDigit);
    return { cities: this.nameCities(placed.cities), towns: placed.towns };
  }

  /**
   * Städtenamen (2026-11-14k): je Welt eine Klangart (1–4 auf 1W6 irdisch, sonst fremdartig), auf der
   * ganzen Kampagne ohne Doppel (`taken`). Die Hauptstadt trägt bei 1–2 auf 1W6 den Namen der Welt.
   */
  private nameCities(cities: readonly City[]): City[] {
    const used = new Set(this.taken);
    const style = this.d6() <= 4 ? 'earthly' : 'alien';
    return cities.map((city, i) => {
      let name: string;
      if (i === 0 && this.world.name && !used.has(this.world.name) && this.d6() <= 2) name = this.world.name;
      else name = cityName(style, this.random, used);
      used.add(name);
      return { ...city, name };
    });
  }

  /** Zahl und Größe der Städte (Buch S. 72–73, Schritte 2 und 3). */
  private cityGroups(P: number, M: number): { population: number; count: number; multipliers: number[] }[] {
    if (P <= 5) {
      if (this.d6() > P) return [{ population: P, count: 1, multipliers: [M] }];
      if (P <= 3) return [];
    }
    const result: { population: number; count: number; multipliers: number[] }[] = [];
    const total = M * 10 ** P;
    let available = total;
    // 3a: sehr große Städte, Ziffer P, Multiplikatoren zusammen höchstens M − 1.
    if (this.dice(3) < P) {
      let remaining = M - 1;
      const multipliers: number[] = [];
      while (remaining > 0) {
        const m = Math.min(rollDigit19(this.random), remaining);
        multipliers.push(m);
        remaining -= m;
      }
      if (multipliers.length) result.push({ population: P, count: multipliers.length, multipliers });
      available -= multipliers.reduce((s, m) => s + m, 0) * 10 ** P;
    }
    // 3c: große Städte, Ziffer P − 1, bis sie die Hälfte des Rests haben.
    if (P - 1 >= 1 && this.dice(2) < P) {
      const half = available / 2;
      let sum = 0;
      const multipliers: number[] = [];
      while (sum < half && multipliers.length < 100) {
        const m = rollDigit19(this.random);
        multipliers.push(m);
        sum += m * 10 ** (P - 1);
      }
      if (multipliers.length) result.push({ population: P - 1, count: multipliers.length, multipliers });
      available = Math.max(0, available - sum);
    }
    // 3e bis 3k: mittelgroße bis sehr kleine Städte mit der Kurzformel.
    const steps: [number, number, boolean][] = [
      [2, 1, true],
      [3, 10, false],
      [4, 100, false],
      [5, 1000, false],
    ];
    for (const [down, factor, needsRoll] of steps) {
      const digit = P - down;
      if (digit < 1) continue;
      if (needsRoll && this.d6() >= P) continue;
      const count = Math.round((available / 10 ** P) * (this.d6() + 9) * factor);
      if (count <= 0) continue;
      // Bei mehr als 20 Städten haben (3W6 − 3) % von ihnen den Multiplikator 9 statt 5.
      const nines = count > 20 ? Math.round(((this.dice(3) - 3) / 100) * count) : 0;
      const multipliers = Array.from({ length: count }, (_, k) => (k < nines ? 9 : 5));
      result.push({ population: digit, count, multipliers });
      available = Math.max(0, available - count * 5 * 10 ** digit);
    }
    return result;
  }

  /** Häfen der Städte (Buch S. 74). */
  private assignPorts(listed: { population: number; rank: CityRank; port?: Port }[]): void {
    const world = starportLetter(this.world.starport);
    const tl = this.world.tech;
    let first = true;
    for (const city of listed) {
      let port: Port | undefined;
      if (city.rank === 'primary') {
        if (first) {
          port = world === 'X' ? undefined : world;
          first = false;
        } else if (this.dice(2) <= city.population) port = world === 'X' ? undefined : world;
        else {
          const dm = city.population >= 8 ? 2 : city.population >= 6 ? 1 : 0;
          port = CITY_PORTS[world]![Math.min(8, this.d6() + dm) - 1];
        }
      }
      if (tl >= 5) port = better(port, 'H');
      if (tl >= 10 && city.rank === 'secondary') port = better(port, 'F');
      if (port) city.port = port;
      else delete city.port;
    }
  }

  /** Orbitalstädte (Buch S. 74, mit den Hausregeln des Konzepts). */
  private orbitalCities(listed: { population: number; multiplier: number; rank: CityRank; port?: Port; orbit?: boolean }[], P: number, M: number): void {
    const tl = this.world.tech;
    if (tl < 7) return;
    const limit = 10 ** Math.max(0, tl - 6);
    let inOrbit = 0;
    const move = (candidates: typeof listed) => {
      const city = candidates.find((c) => !c.orbit && inOrbit + c.multiplier * 10 ** c.population <= limit);
      if (!city) return false;
      city.orbit = true;
      inOrbit += city.multiplier * 10 ** city.population;
      return true;
    };
    const secondaries = listed.filter((c) => c.rank === 'secondary');
    const smallestFirst = [...secondaries].reverse();
    const atm = this.world.atmosphere;
    if (atm >= 10 && atm <= 12 && !this.world.surface.life && tl >= 9 && this.dice(3) - 3 <= P) {
      const wanted = Math.min(1, (tl - 6) / 10) * M * 10 ** P;
      while (inOrbit < wanted && move(secondaries)) {
        /* weiter */
      }
      return;
    }
    const world = starportLetter(this.world.starport);
    const groundA = listed.filter((c) => c.port === 'A').length;
    for (let k = 0; k < groundA; k++) move(secondaries);
    if (world === 'B' && !listed.some((c) => c.orbit)) move(smallestFirst);
    if ((world === 'C' || listed.some((c) => c.port === 'F')) && this.dice(2) < Math.min(tl, P)) move(smallestFirst);
  }

  /** Städte und Kleinstädte auf die Karte (Abschnitt 10e–h), dazu Straßen und besiedelte Felder. */
  private placeCities(listed: readonly { population: number; multiplier: number; rank: CityRank; port?: Port; orbit?: boolean }[], townCount: number, townDigit: number): { cities: City[]; towns: [number, number][] } {
    const tl = this.world.tech;
    const cells = this.grid.cells;
    const riverCells = new Set(this.rivers.flat());
    const allowed = (c: number, digit: number): boolean => {
      const form = this.form[c];
      if (digit < 5) return !this.water[c] && form !== 'landIce';
      if (form === 'open' || form === 'settled' || form === 'tundra') return true;
      if (tl >= 4 && (form === 'rugged' || form === 'desert' || form === 'swamp')) return true;
      if (tl >= 7 && form === 'jungle') return true;
      return tl >= 10;
    };
    const baseScore = (c: number) => (this.touchesWater(c) && !this.water[c] ? 3 : 0) + (riverCells.has(c) ? 2 : 0) + (this.temperature[c]! >= 0 && this.temperature[c]! <= 30 ? 2 : 0) + (this.form[c] === 'open' ? 1 : 0);
    const perCell = new Map<number, number>();
    // Hausregel (Owner, 14. November 2026): auf jedem Feld höchstens eine Siedlung, Stadt oder Kleinstadt.
    const maxPerCell = 1;
    const primaries: number[] = [];
    const penalty = new Float64Array(cells);
    const cities: City[] = [];
    const rankings = new Map<number, { cells: number[]; next: number }>();
    let fallback = -1;
    for (const city of listed) {
      if (city.orbit) {
        cities.push({ name: '', population: city.population, multiplier: city.multiplier, rank: city.rank, ...(city.port ? { port: city.port } : {}) });
        continue;
      }
      let best = -1;
      let bestScore = -Infinity;
      if (city.rank === 'primary') {
        for (let c = 0; c < cells; c++) {
          if ((perCell.get(c) ?? 0) >= maxPerCell || !allowed(c, city.population)) continue;
          const score = baseScore(c) - penalty[c]! + this.unit() * 0.5;
          if (score > bestScore) {
            bestScore = score;
            best = c;
          }
        }
      } else {
        // Nebenstädte gibt es zu Hunderten: eine Rangliste je Ziffer, einmal gebaut, der Reihe nach belegt.
        let ranking = rankings.get(city.population);
        if (!ranking) {
          const scored: [number, number][] = [];
          for (let c = 0; c < cells; c++) if (allowed(c, city.population)) scored.push([c, baseScore(c) - penalty[c]! + this.unit() * 0.5]);
          ranking = { cells: scored.sort((a, b) => b[1] - a[1]).map(([c]) => c), next: 0 };
          rankings.set(city.population, ranking);
        }
        while (ranking.next < ranking.cells.length && (perCell.get(ranking.cells[ranking.next]!) ?? 0) >= maxPerCell) ranking.next++;
        if (ranking.next < ranking.cells.length) {
          best = ranking.cells[ranking.next]!;
          bestScore = 0;
        }
      }
      if (best < 0) {
        // Sonderfall: kein erlaubtes Feld; dann das beste Feld überhaupt (Buch: setzen und erklären).
        if (fallback < 0) {
          for (let c = 0; c < cells; c++) {
            const score = baseScore(c) + this.unit() * 0.5;
            if (score > bestScore) {
              bestScore = score;
              fallback = c;
            }
          }
        }
        best = fallback;
      }
      perCell.set(best, (perCell.get(best) ?? 0) + 1);
      if (city.rank === 'primary') {
        primaries.push(best);
        const near = distances(this.grid, [best], () => true, this.length(4));
        for (let c = 0; c < cells; c++) if (near[c]! >= 0) penalty[c]! += 2;
      }
      cities.push({ cell: best, name: '', population: city.population, multiplier: city.multiplier, rank: city.rank, ...(city.port ? { port: city.port } : {}) });
    }
    // Kleinstädte: je höchstens eine auf einem Feld ohne Stadt, gewichtet mit der Wertung und der Nähe
    // zu Städten (gezogen ohne Zurücklegen). Gibt es mehr Kleinstädte als freie Felder, lebt der Rest
    // auf dem Land.
    const towns = new Map<number, number>();
    if (townCount > 0) {
      const placed = cities.filter((c) => c.cell !== undefined).map((c) => c.cell!);
      const taken = new Set(placed);
      const near = placed.length ? distances(this.grid, placed, () => true, this.length(2)) : undefined;
      const keyed: [number, number][] = [];
      for (let c = 0; c < cells; c++) {
        if (taken.has(c) || !allowed(c, townDigit)) continue;
        const weight = 1 + baseScore(c) + (near && near[c]! >= 0 ? 2 : 0);
        // Gewichtetes Ziehen ohne Zurücklegen: Schlüssel u^(1/Gewicht), die größten gewinnen.
        keyed.push([c, Math.pow(Math.max(1e-9, this.unit()), 1 / weight)]);
      }
      keyed.sort((x, y) => y[1] - x[1]);
      for (const [c] of keyed.slice(0, townCount)) towns.set(c, 1);
    }
    this.placeRoads(cities);
    this.settle(cities);
    return { cities, towns: [...towns.entries()].sort((a, b) => a[0] - b[0]) };
  }

  /** Straßen bei TL 5–10: jede Stadt zur nächsten größeren auf demselben Kontinent. */
  private placeRoads(cities: readonly City[]): void {
    const tl = this.world.tech;
    if (tl < 5 || tl > 10) return;
    const onLand = cities.filter((c) => c.cell !== undefined && !this.water[c.cell]);
    const part = new Int32Array(this.grid.cells).fill(-1);
    this.components((c) => this.isLand(c)).forEach((p, i) => p.forEach((c) => (part[c] = i)));
    const cost = (c: number) => (this.form[c] === 'mountain' ? 3 : this.form[c] === 'landIce' ? 4 : this.form[c] === 'rugged' || this.form[c] === 'jungle' || this.form[c] === 'swamp' ? 2 : 1);
    const seen = new Set<string>();
    for (const [i, city] of onLand.entries()) {
      if (i === 0) continue;
      const larger = onLand.slice(0, i).filter((c) => part[c.cell!] === part[city.cell!] && c.cell !== city.cell);
      if (!larger.length) continue;
      const path = this.cheapestPath(city.cell!, new Set(larger.map((c) => c.cell!)), (c) => part[c] === part[city.cell!], cost);
      if (path.length < 2) continue;
      const key = `${path[0]}-${path[path.length - 1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      this.roads.push(path);
    }
  }

  private cheapestPath(from: number, to: ReadonlySet<number>, pass: (cell: number) => boolean, cost: (cell: number) => number): number[] {
    const cells = this.grid.cells;
    const best = new Float64Array(cells).fill(Infinity);
    const prev = new Int32Array(cells).fill(-1);
    best[from] = 0;
    // Einfache Prioritätsliste: kleine Kosten (1–4), daher reicht ein Eimer je Kostenstand.
    const buckets: number[][] = [[from]];
    for (let d = 0; d < buckets.length; d++) {
      const bucket = buckets[d];
      if (!bucket) continue;
      for (const c of bucket) {
        if (best[c]! < d) continue;
        if (to.has(c)) {
          const path = [c];
          for (let x = prev[c]!; x !== -1; x = prev[x]!) path.push(x);
          return path.reverse();
        }
        for (const q of this.grid.neighbors[c]!) {
          if (!pass(q)) continue;
          const next = d + cost(q);
          if (next < best[q]!) {
            best[q] = next;
            prev[q] = c;
            (buckets[next] ??= []).push(q);
          }
        }
      }
    }
    return [];
  }

  /** Besiedelt: offene Landfelder höchstens 1 Hex von einer Stadt (nicht bei Atmosphäre außerhalb 4–9). */
  private settle(cities: readonly City[]): void {
    const atm = this.world.atmosphere;
    if (atm < 4 || atm > 9) return;
    const placed = cities.filter((c) => c.cell !== undefined).map((c) => c.cell!);
    if (!placed.length) return;
    const near = distances(this.grid, placed, () => true, this.length(1));
    const tl = this.world.tech;
    for (let c = 0; c < this.grid.cells; c++) {
      if (near[c]! < 0) continue;
      if (this.form[c] === 'open' || (tl >= 11 && (this.form[c] === 'desert' || this.form[c] === 'tundra' || this.form[c] === 'rugged' || this.form[c] === 'jungle' || this.form[c] === 'swamp'))) this.form[c] = 'settled';
    }
  }
}

// --- Prüfen ---

/** Prüft eine gespeicherte Karte gegen das Raster der Welt; gibt den ersten Fehler als Text zurück. */
export function checkSurfaceMap(map: SurfaceMap, size: number, population: number): string | undefined {
  if (size < 1) return 'Eine Welt der Größe 0 hat keine Oberflächenkarte.';
  const grid = surfaceGrid(size);
  if (map.landforms.length !== cellCount(size)) return `Die Oberflächenkarte hat ${map.landforms.length} Felder, eine Welt der Größe ${size} hat ${cellCount(size)}.`;
  for (const ch of map.landforms) if (!(ch in LANDFORM_OF)) return `Die Oberflächenkarte enthält die unbekannte Geländeart „${ch}“.`;
  const inGrid = (c: number) => Number.isInteger(c) && c >= 0 && c < grid.cells;
  let last = -1;
  for (const [cell, count] of map.towns ?? []) {
    if (!inGrid(cell) || cell <= last || !Number.isInteger(count) || count < 1) return 'Die Kleinstädte der Oberflächenkarte sind ungültig.';
    last = cell;
  }
  last = -1;
  for (const [cell, kind] of map.volcanoes ?? []) {
    if (!inGrid(cell) || cell <= last || (kind !== 'major' && kind !== 'field')) return 'Die Vulkane der Oberflächenkarte sind ungültig.';
    last = cell;
  }
  for (const line of [...(map.rivers ?? []), ...(map.roads ?? [])]) {
    if (line.length < 2 || !line.every(inGrid)) return 'Ein Fluss oder eine Straße der Oberflächenkarte ist ungültig.';
    for (let i = 1; i < line.length; i++) if (!adjacent(grid, line[i - 1]!, line[i]!)) return 'Ein Fluss oder eine Straße der Oberflächenkarte springt über Felder.';
  }
  for (const city of map.cities ?? []) {
    if (city.cell !== undefined && !inGrid(city.cell)) return 'Eine Stadt der Oberflächenkarte liegt außerhalb des Rasters.';
    if (typeof city.name !== 'string' || !city.name.trim()) return 'Eine Stadt der Oberflächenkarte hat keinen Namen.';
    if (!Number.isInteger(city.population) || city.population < 0 || !Number.isInteger(city.multiplier) || city.multiplier < 1 || city.multiplier > 9) return 'Eine Stadt der Oberflächenkarte hat ungültige Werte.';
  }
  if (population < 1 && ((map.cities?.length ?? 0) > 0 || (map.towns?.length ?? 0) > 0)) return 'Eine Welt ohne Bevölkerung hat keine Städte.';
  return undefined;
}
