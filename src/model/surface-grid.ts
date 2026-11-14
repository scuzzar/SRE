// Das Raster der Oberflächenkarte (siehe docs/konzept-oberflaechenkarte.md, Abschnitt 1): ein
// Ikosaeder, jede Kante in n = 4 × Größe Abschnitte geteilt, jeder Eckpunkt ein Oberflächenfeld.
// Die Reihenfolge der Felder ist Teil des Spielstands (die Geländeart steht gepackt in dieser
// Reihenfolge) und darf sich nie ändern.

/** Felder je Kante eines Kartendreiecks je Stufe der Größe: n = 4 × Größe, etwa 251 km je Feld. */
export const CELLS_PER_SIZE = 4;
/** Wie viele Felder das Buch je Kante hat (35 Hexe am Äquator über 5 Dreiecke). */
export const BOOK_CELLS_PER_EDGE = 7;
/** Eine Hexreihe des Buchs in Grad Breite: 90° auf 11 Reihen. */
export const DEGREES_PER_ROW = 90 / 11;

export interface SurfaceGrid {
  /** Felder je Kante eines Kartendreiecks. */
  readonly n: number;
  /** Zahl der Felder: 10 × n² + 2. */
  readonly cells: number;
  /** Lage jedes Feldes auf der Einheitskugel, je drei Werte x, y, z (z zeigt zum Nordpol). */
  readonly xyz: Float64Array;
  /** Breitengrad jedes Feldes in Grad, −90 bis 90. */
  readonly lat: Float64Array;
  /** Längengrad jedes Feldes in Grad, −180 bis 180. */
  readonly lon: Float64Array;
  /** Das Kartendreieck (0–19), in dem das Feld zuerst vorkommt. */
  readonly face: Uint8Array;
  /** Die Nachbarn jedes Feldes (5 an den 12 Ecken, sonst 6). */
  readonly neighbors: readonly (readonly number[])[];
}

type Vec = readonly [number, number, number];

/** Die 12 Ecken des Ikosaeders: Nordpol, fünf oben, fünf unten (um 36° versetzt), Südpol. */
function corners(): Vec[] {
  const result: Vec[] = [[0, 0, 1]];
  const ringLat = Math.atan(0.5);
  for (let k = 0; k < 5; k++) result.push(fromLatLon(ringLat, (k * 72 * Math.PI) / 180));
  for (let k = 0; k < 5; k++) result.push(fromLatLon(-ringLat, ((36 + k * 72) * Math.PI) / 180));
  result.push([0, 0, -1]);
  return result;
}

function fromLatLon(lat: number, lon: number): Vec {
  return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
}

/**
 * Die 20 Kartendreiecke als Ecken: fünf oben am Nordpol, zehn im Band um den Äquator, fünf unten am
 * Südpol. Oben 1–5, unten 6–10.
 */
function faces(): [number, number, number][] {
  const result: [number, number, number][] = [];
  const up = (k: number) => 1 + (k % 5);
  const down = (k: number) => 6 + (k % 5);
  for (let k = 0; k < 5; k++) result.push([0, up(k), up(k + 1)]);
  for (let k = 0; k < 5; k++) {
    result.push([up(k), down(k), up(k + 1)]);
    result.push([up(k + 1), down(k), down(k + 1)]);
  }
  for (let k = 0; k < 5; k++) result.push([11, down(k + 1), down(k)]);
  return result;
}

const cache = new Map<number, SurfaceGrid>();

/** Felder je Kante für eine Welt dieser Größe; bei Größe 0 gibt es kein Raster. */
export function cellsPerEdge(size: number): number {
  return CELLS_PER_SIZE * size;
}

/** Zahl der Felder einer Welt dieser Größe. */
export function cellCount(size: number): number {
  const n = cellsPerEdge(size);
  return size > 0 ? 10 * n * n + 2 : 0;
}

/** Das Raster einer Welt dieser Größe (ab 1); einmal gebaut, dann aus dem Speicher. */
export function surfaceGrid(size: number): SurfaceGrid {
  if (!Number.isInteger(size) || size < 1) throw new Error(`Ein Raster gibt es erst ab Größe 1, nicht für ${size}.`);
  const n = cellsPerEdge(size);
  const known = cache.get(n);
  if (known) return known;
  const grid = buildGrid(n);
  cache.set(n, grid);
  return grid;
}

function buildGrid(n: number): SurfaceGrid {
  const vertices = corners();
  const triangles = faces();
  // Jeder Punkt hat einen eindeutigen Schlüssel aus seinen Gewichten auf den Ecken; so bekommen
  // Punkte auf gemeinsamen Kanten in jedem Dreieck dieselbe Nummer, ohne Rundung.
  const index = new Map<string, number>();
  const points: Vec[] = [];
  const faceOf: number[] = [];
  const local: number[][] = [];
  const keyOf = (weights: [number, number][]) =>
    weights
      .filter(([, w]) => w > 0)
      .sort((a, b) => a[0] - b[0])
      .map(([v, w]) => `${v}:${w}`)
      .join(',');
  triangles.forEach(([a, b, c], f) => {
    const ids: number[] = [];
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        const weights: [number, number][] = [
          [a, n - i - j],
          [b, i],
          [c, j],
        ];
        const key = keyOf(weights);
        let id = index.get(key);
        if (id === undefined) {
          id = points.length;
          index.set(key, id);
          // Aus den sortierten Gewichten gerechnet, damit derselbe Punkt immer gleich liegt.
          const sorted = key.split(',').map((p) => p.split(':').map(Number) as [number, number]);
          let x = 0;
          let y = 0;
          let z = 0;
          for (const [v, w] of sorted) {
            const corner = vertices[v]!;
            x += corner[0] * w;
            y += corner[1] * w;
            z += corner[2] * w;
          }
          const length = Math.hypot(x, y, z);
          points.push([x / length, y / length, z / length]);
          faceOf.push(f);
        }
        ids.push(id);
      }
    }
    local.push(ids);
  });
  // Nachbarn aus den kleinen Dreiecken jedes Kartendreiecks.
  const sets = points.map(() => new Set<number>());
  const link = (p: number, q: number) => {
    sets[p]!.add(q);
    sets[q]!.add(p);
  };
  for (const ids of local) {
    const at = (i: number, j: number) => ids[i * (n + 1) - (i * (i - 1)) / 2 + j]!;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        if (i + j < n) {
          link(at(i, j), at(i + 1, j));
          link(at(i, j), at(i, j + 1));
          link(at(i + 1, j), at(i, j + 1));
        }
      }
    }
  }
  const cells = points.length;
  const xyz = new Float64Array(cells * 3);
  const lat = new Float64Array(cells);
  const lon = new Float64Array(cells);
  points.forEach(([x, y, z], i) => {
    xyz[i * 3] = x;
    xyz[i * 3 + 1] = y;
    xyz[i * 3 + 2] = z;
    lat[i] = (Math.asin(Math.max(-1, Math.min(1, z))) * 180) / Math.PI;
    lon[i] = (Math.atan2(y, x) * 180) / Math.PI;
  });
  return {
    n,
    cells,
    xyz,
    lat,
    lon,
    face: Uint8Array.from(faceOf),
    neighbors: sets.map((s) => [...s].sort((p, q) => p - q)),
  };
}

/** Ob zwei Felder benachbart sind. */
export function adjacent(grid: SurfaceGrid, a: number, b: number): boolean {
  return grid.neighbors[a]!.includes(b);
}

/** Der Kosinus des Winkels zwischen zwei Feldern (1: dasselbe Feld, −1: gegenüber). */
export function cosAngle(grid: SurfaceGrid, a: number, b: number): number {
  const p = grid.xyz;
  return p[a * 3]! * p[b * 3]! + p[a * 3 + 1]! * p[b * 3 + 1]! + p[a * 3 + 2]! * p[b * 3 + 2]!;
}

/**
 * Das Feld, das einer Richtung (x, y, z, Länge 1) am nächsten liegt. Läuft von `start` aus zum
 * jeweils näheren Nachbarn; mit einem nahen Start (dem Ergebnis für den Nachbarpixel) braucht das
 * nur wenige Schritte.
 */
export function nearestCell(grid: SurfaceGrid, x: number, y: number, z: number, start = 0): number {
  const p = grid.xyz;
  let best = start;
  let bestDot = p[best * 3]! * x + p[best * 3 + 1]! * y + p[best * 3 + 2]! * z;
  for (;;) {
    let next = best;
    for (const q of grid.neighbors[best]!) {
      const dot = p[q * 3]! * x + p[q * 3 + 1]! * y + p[q * 3 + 2]! * z;
      if (dot > bestDot) {
        bestDot = dot;
        next = q;
      }
    }
    if (next === best) return best;
    best = next;
  }
}

/** Abstand in Schritten von den Startfeldern zu jedem Feld, nur über Felder, die `pass` erlaubt; sonst −1. */
export function distances(grid: SurfaceGrid, starts: Iterable<number>, pass: (cell: number) => boolean = () => true, limit = Infinity): Int32Array {
  const result = new Int32Array(grid.cells).fill(-1);
  const queue: number[] = [];
  for (const s of starts) {
    if (result[s] === -1) {
      result[s] = 0;
      queue.push(s);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head]!;
    const d = result[cell]!;
    if (d >= limit) continue;
    for (const q of grid.neighbors[cell]!) {
      if (result[q] === -1 && pass(q)) {
        result[q] = d + 1;
        queue.push(q);
      }
    }
  }
  return result;
}
