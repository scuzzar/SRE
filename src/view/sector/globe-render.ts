import { landformAt, nearestCell, type GlobeView } from '../../controller';

// Reine Darstellung: der Globus einer Welt aus ihrer Oberflächenkarte. `cellLook` sagt, wie jedes Feld
// aussieht (für WebGL in globe-gl.ts). Ohne WebGL: Aus Raster und Geländeart
// entsteht einmal je Karte eine Textur nach Breiten- und Längengrad (mit ausgefransten Küsten), die
// jedes Bild Pixel für Pixel auf die Kugel legt. Licht von links oben, Atmosphäre als Leuchten am Rand.

type Rgb = readonly [number, number, number];
type Landform = ReturnType<typeof landformAt>;

const COLORS: Readonly<Record<Landform, Rgb>> = {
  water: [0.09, 0.27, 0.48],
  waterIce: [0.78, 0.86, 0.93],
  landIce: [0.93, 0.95, 0.97],
  tundra: [0.55, 0.58, 0.5],
  mountain: [0.46, 0.41, 0.36],
  rugged: [0.55, 0.49, 0.38],
  desert: [0.8, 0.68, 0.46],
  jungle: [0.13, 0.36, 0.16],
  swamp: [0.28, 0.37, 0.25],
  open: [0.3, 0.47, 0.24],
  settled: [0.55, 0.55, 0.32],
};
const DEEP: Rgb = [0.04, 0.13, 0.3];
const BARREN: Rgb = [0.52, 0.44, 0.36];

const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function hash3(i: number, j: number, k: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, c: number) => hash3(xi + a, yi + b, zi + c);
  const x1 = l(0, 0, 0) + (l(1, 0, 0) - l(0, 0, 0)) * u;
  const x2 = l(0, 1, 0) + (l(1, 1, 0) - l(0, 1, 0)) * u;
  const x3 = l(0, 0, 1) + (l(1, 0, 1) - l(0, 0, 1)) * u;
  const x4 = l(0, 1, 1) + (l(1, 1, 1) - l(0, 1, 1)) * u;
  const y1 = x1 + (x2 - x1) * v;
  const y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}

function fbm(x: number, y: number, z: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * f + o * 13.1, y * f, z * f);
    norm += amp;
    amp *= 0.5;
    f *= 2.07;
  }
  return sum / norm;
}

/** Die Textur einer Karte: Farbe je Texel, das Feld je Texel (für Gitter und Antippen) und Höhe. */
interface Texture {
  readonly width: number;
  readonly height: number;
  readonly color: Uint8ClampedArray;
  readonly gridColor: Uint8ClampedArray;
}

/**
 * Die Art eines Feldes für das Muster im Shader (`globe-gl.ts`): die Geländearten in dieser
 * Reihenfolge, dazu `city` (ein Feld mit Stadt) und `barren` (Offen/Wald ohne Leben).
 */
export const CELL_KINDS = ['water', 'waterIce', 'landIce', 'tundra', 'mountain', 'rugged', 'desert', 'jungle', 'swamp', 'open', 'settled', 'city', 'barren'] as const;
export type CellKind = (typeof CELL_KINDS)[number];

const CITY: Rgb = [0.6, 0.59, 0.55];

/** Wie jedes Feld aussieht: Geländeart, Abstand zur Küste, Grundfarbe und Art für das Muster. */
export interface CellLook {
  readonly forms: readonly Landform[];
  readonly coast: Int32Array;
  /** Grundfarbe je Feld (r, g, b von 0 bis 1); Wasser wird mit dem Abstand zur Küste tiefer. */
  readonly color: Float32Array;
  /** Die Nummer in `CELL_KINDS` je Feld. */
  readonly kind: Uint8Array;
}

const looks = new WeakMap<object, CellLook>();

/** Das Aussehen der Felder, einmal je Karte; schnell, ohne Textur. */
export function cellLook(globe: GlobeView): CellLook {
  const known = looks.get(globe.map);
  if (known) return known;
  const { grid, map } = globe;
  const cells = grid.cells;
  const forms: Landform[] = new Array(cells);
  for (let c = 0; c < cells; c++) forms[c] = landformAt(map, c);
  // Abstand zur Küste je Feld, für flaches und tiefes Wasser.
  const isWater = (c: number) => forms[c] === 'water' || forms[c] === 'waterIce';
  const coast = new Int32Array(cells).fill(-1);
  const queue: number[] = [];
  for (let c = 0; c < cells; c++) {
    if (!isWater(c)) {
      coast[c] = 0;
      queue.push(c);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head]!;
    for (const q of grid.neighbors[c]!) {
      if (coast[q] === -1) {
        coast[q] = coast[c]! + 1;
        queue.push(q);
      }
    }
  }
  const life = globe.look.life === true;
  const cities = new Set((map.cities ?? []).map((c) => c.cell).filter((c) => c !== undefined));
  const color = new Float32Array(cells * 3);
  const kind = new Uint8Array(cells);
  for (let c = 0; c < cells; c++) {
    const form = forms[c]!;
    const k: CellKind = cities.has(c) && !isWater(c) ? 'city' : form === 'open' && !life ? 'barren' : form;
    let col: Rgb = k === 'city' ? CITY : k === 'barren' ? BARREN : COLORS[form];
    if (form === 'water') col = mix(COLORS.water, DEEP, clamp((coast[c]! - 1) / 6, 0, 1) * 0.8);
    color.set(col, c * 3);
    kind[c] = CELL_KINDS.indexOf(k);
  }
  const look = { forms, coast, color, kind };
  looks.set(globe.map, look);
  return look;
}

const textures = new WeakMap<object, Texture>();

/** Baut die Textur einmal je Karte (Breite nach Feinheit des Rasters); nur ohne WebGL gebraucht. */
export function textureOf(globe: GlobeView): Texture {
  const known = textures.get(globe.map);
  if (known) return known;
  const { grid, map } = globe;
  const width = clamp(grid.n * 32, 512, 1536);
  const height = width / 2;
  const { forms, coast } = cellLook(globe);
  const life = globe.look.life === true;
  const color = new Uint8ClampedArray(width * height * 4);
  const cellOf = new Int32Array(width * height);
  // Ausfransen: die Richtung vor dem Nachschlagen um bis zu ein halbes Feld verschieben.
  const warp = (0.6 * Math.PI) / (5 * grid.n);
  let last = 0;
  for (let y = 0; y < height; y++) {
    const lat = (0.5 - (y + 0.5) / height) * Math.PI;
    const cl = Math.cos(lat);
    const sl = Math.sin(lat);
    let rowStart = last;
    for (let x = 0; x < width; x++) {
      const lon = ((x + 0.5) / width - 0.5) * 2 * Math.PI;
      let bx = cl * Math.cos(lon);
      let by = cl * Math.sin(lon);
      let bz = sl;
      const nx = fbm(bx * 6 + 1.7, by * 6, bz * 6, 2) - 0.5;
      const ny = fbm(bx * 6, by * 6 + 5.3, bz * 6, 2) - 0.5;
      const nz = fbm(bx * 6, by * 6, bz * 6 + 9.1, 2) - 0.5;
      bx += nx * warp * 4;
      by += ny * warp * 4;
      bz += nz * warp * 4;
      const len = Math.hypot(bx, by, bz);
      const cell = nearestCell(grid, bx / len, by / len, bz / len, x === 0 ? rowStart : last);
      if (x === 0) rowStart = cell;
      last = cell;
      cellOf[y * width + x] = cell;
      const form = forms[cell]!;
      const detail = fbm(bx * 22, by * 22, bz * 22, 2);
      let col: Rgb = form === 'open' && !life ? BARREN : COLORS[form];
      if (form === 'water') col = mix(COLORS.water, DEEP, clamp((coast[cell]! - 1) / 6, 0, 1) * 0.8 + detail * 0.15);
      else if (form === 'mountain') col = mix(col, [0.92, 0.92, 0.94], clamp((detail - 0.55) * 3, 0, 0.6));
      else col = mix(col, [col[0] * 0.8, col[1] * 0.8, col[2] * 0.8], detail);
      const i = (y * width + x) * 4;
      color[i] = col[0] * 255;
      color[i + 1] = col[1] * 255;
      color[i + 2] = col[2] * 255;
      color[i + 3] = 255;
    }
  }
  // Flüsse und Straßen als Linien, Städte als Flecken in der Textur.
  const paint = (cell: number, rgb: Rgb, radius: number) => {
    const lat = grid.lat[cell]!;
    const lon = grid.lon[cell]!;
    const cx = ((lon + 180) / 360) * width;
    const cy = ((90 - lat) / 180) * height;
    const rx = radius / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -Math.ceil(rx); dx <= Math.ceil(rx); dx++) {
        if ((dx / rx) ** 2 + (dy / radius) ** 2 > 1) continue;
        const px = (((Math.round(cx + dx) % width) + width) % width) | 0;
        const py = clamp(Math.round(cy + dy), 0, height - 1);
        const i = (py * width + px) * 4;
        color[i] = rgb[0] * 255;
        color[i + 1] = rgb[1] * 255;
        color[i + 2] = rgb[2] * 255;
      }
    }
  };
  const line = (cells: readonly number[], rgb: Rgb, alpha: number) => {
    for (let k = 1; k < cells.length; k++) {
      const a = cells[k - 1]!;
      const b = cells[k]!;
      const steps = Math.max(8, Math.round(width / grid.n / 4));
      const ax = grid.xyz[a * 3]!;
      const ay = grid.xyz[a * 3 + 1]!;
      const az = grid.xyz[a * 3 + 2]!;
      const bx = grid.xyz[b * 3]!;
      const by = grid.xyz[b * 3 + 1]!;
      const bz = grid.xyz[b * 3 + 2]!;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        const z = az + (bz - az) * t;
        const len = Math.hypot(x, y, z);
        const lat = (Math.asin(z / len) * 180) / Math.PI;
        const lon = (Math.atan2(y, x) * 180) / Math.PI;
        paintAt(lat, lon, rgb, alpha);
      }
    }
  };
  const paintAt = (lat: number, lon: number, rgb: Rgb, alpha: number) => {
    const px = (((Math.round(((lon + 180) / 360) * width) % width) + width) % width) | 0;
    const py = clamp(Math.round(((90 - lat) / 180) * height), 0, height - 1);
    const i = (py * width + px) * 4;
    color[i] = color[i]! + (rgb[0] * 255 - color[i]!) * alpha;
    color[i + 1] = color[i + 1]! + (rgb[1] * 255 - color[i + 1]!) * alpha;
    color[i + 2] = color[i + 2]! + (rgb[2] * 255 - color[i + 2]!) * alpha;
  };
  for (const road of map.roads ?? []) line(road, [0.35, 0.26, 0.18], 0.55);
  for (const river of map.rivers ?? []) line(river, [0.16, 0.4, 0.72], 0.9);
  for (const city of map.cities ?? []) if (city.cell !== undefined) paint(city.cell, city.rank === 'primary' ? [0.78, 0.76, 0.7] : [0.66, 0.64, 0.56], city.rank === 'primary' ? 3 : 2);
  // Dieselbe Textur mit Hexgitter: Texel, deren Feld sich vom rechten oder unteren Nachbarn unterscheidet.
  const gridColor = new Uint8ClampedArray(color);
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width; x++) {
      const here = cellOf[y * width + x];
      if (here !== cellOf[y * width + ((x + 1) % width)] || here !== cellOf[(y + 1) * width + x]) {
        const i = (y * width + x) * 4;
        gridColor[i] = gridColor[i]! * 0.55;
        gridColor[i + 1] = gridColor[i + 1]! * 0.55;
        gridColor[i + 2] = gridColor[i + 2]! * 0.55;
      }
    }
  }
  const texture = { width, height, color, gridColor };
  textures.set(globe.map, texture);
  return texture;
}

/** Wohin der Globus schaut: Mitte als Breiten- und Längengrad (Bogenmaß) und Zoom (1 = ganze Kugel). */
export interface Camera {
  readonly lat: number;
  readonly lon: number;
  readonly zoom: number;
}

interface Basis {
  readonly e: Rgb;
  readonly n: Rgb;
  readonly f: Rgb;
}

export function basisOf(camera: Camera): Basis {
  const cl = Math.cos(camera.lat);
  const sl = Math.sin(camera.lat);
  const co = Math.cos(camera.lon);
  const so = Math.sin(camera.lon);
  return { e: [-so, co, 0], n: [-sl * co, -sl * so, cl], f: [cl * co, cl * so, sl] };
}

/** Die Fläche, auf die gezeichnet wird, in Pixeln. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** Radius der Kugel in Pixeln: ganz herausgezoomt füllt sie die kürzere Seite fast ganz. */
export function radiusOf(view: Viewport, camera: Camera): number {
  return Math.min(view.width, view.height) * 0.46 * camera.zoom;
}

/** Das Feld unter einem Punkt des Canvas (in Pixeln) oder `undefined` neben der Kugel. */
export function cellAt(globe: GlobeView, camera: Camera, view: Viewport, px: number, py: number): number | undefined {
  const R = radiusOf(view, camera);
  const sx = (px - view.width / 2) / R;
  const sy = (py - view.height / 2) / R;
  const d2 = sx * sx + sy * sy;
  if (d2 > 1) return undefined;
  const sz = Math.sqrt(1 - d2);
  const { e, n, f } = basisOf(camera);
  const bx = sx * e[0] - sy * n[0] + sz * f[0];
  const by = sx * e[1] - sy * n[1] + sz * f[1];
  const bz = sx * e[2] - sy * n[2] + sz * f[2];
  return nearestCell(globe.grid, bx, by, bz, 0);
}

/** Wo ein Feld auf dem Canvas liegt; `undefined` auf der Rückseite. */
export function screenOf(globe: GlobeView, camera: Camera, view: Viewport, cell: number): { x: number; y: number; depth: number } | undefined {
  const p = globe.grid.xyz;
  return screenOfPoint(camera, view, p[cell * 3]!, p[cell * 3 + 1]!, p[cell * 3 + 2]!);
}

/** Ein Punkt auf der Einheitskugel auf dem Bildschirm; auf der Rückseite keiner. */
export function screenOfPoint(camera: Camera, view: Viewport, bx: number, by: number, bz: number): { x: number; y: number; depth: number } | undefined {
  const R = radiusOf(view, camera);
  const { e, n, f } = basisOf(camera);
  const depth = bx * f[0] + by * f[1] + bz * f[2];
  if (depth <= 0.02) return undefined;
  return { x: view.width / 2 + (bx * e[0] + by * e[1] + bz * e[2]) * R, y: view.height / 2 - (bx * n[0] + by * n[1] + bz * n[2]) * R, depth };
}

export const ATMOSPHERE_GLOW: readonly (string | undefined)[] = [undefined, '#8fb4ff', '#9be35a', '#7fb0ff', '#a6e24a', '#6fa8ff', '#5c9cff', '#9fe03c', '#6aa6ff', '#a8dc3a', '#b56cff', '#c46cff', '#ff4fd8', '#9cc4ff', '#6fa8ff', '#d08cff'];

export function rgbOf(hex: string): Rgb {
  const v = parseInt(hex.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

/** Licht von links oben, leicht von vorn: die ganze sichtbare Seite bleibt hell genug. */
export const LIGHT = (() => {
  const v = [-0.55, 0.5, 0.67];
  const l = Math.hypot(v[0]!, v[1]!, v[2]!);
  return [v[0]! / l, v[1]! / l, v[2]! / l] as const;
})();

/** Zeichnet den Globus in ein ImageData; die Kugel steht in der Mitte. */
export function renderGlobe(img: ImageData, globe: GlobeView, camera: Camera, showGrid: boolean): void {
  const W = img.width;
  const H = img.height;
  const data = img.data;
  const tex = textureOf(globe);
  const src = showGrid ? tex.gridColor : tex.color;
  const R = radiusOf({ width: W, height: H }, camera);
  const { e, n, f } = basisOf(camera);
  const glowHex = ATMOSPHERE_GLOW[globe.look.atmosphere ?? 0];
  const glow = glowHex ? rgbOf(glowHex) : undefined;
  const halo = glow ? R * 0.06 : 0;
  const tw = tex.width;
  const th = tex.height;
  for (let py = 0; py < H; py++) {
    const sy = (py + 0.5 - H / 2) / R;
    for (let px = 0; px < W; px++) {
      const sx = (px + 0.5 - W / 2) / R;
      const d2 = sx * sx + sy * sy;
      const i = (py * W + px) * 4;
      if (d2 > 1) {
        if (glow && halo > 0) {
          const dist = (Math.sqrt(d2) - 1) * R;
          if (dist < halo) {
            const a = Math.pow(1 - dist / halo, 2.2) * 0.7;
            data[i] = glow[0] * 255;
            data[i + 1] = glow[1] * 255;
            data[i + 2] = glow[2] * 255;
            data[i + 3] = a * 255;
            continue;
          }
        }
        data[i + 3] = 0;
        continue;
      }
      const sz = Math.sqrt(1 - d2);
      const bx = sx * e[0] - sy * n[0] + sz * f[0];
      const by = sx * e[1] - sy * n[1] + sz * f[1];
      const bz = sx * e[2] - sy * n[2] + sz * f[2];
      const lat = Math.asin(bz < -1 ? -1 : bz > 1 ? 1 : bz);
      const lon = Math.atan2(by, bx);
      const tx = Math.min(tw - 1, Math.max(0, Math.floor(((lon + Math.PI) / (2 * Math.PI)) * tw)));
      const ty = Math.min(th - 1, Math.max(0, Math.floor((0.5 - lat / Math.PI) * th)));
      const t = (ty * tw + tx) * 4;
      // Licht im Blickraum: Normale (sx, −sy, sz).
      const lit = sx * LIGHT[0] - sy * LIGHT[1] + sz * LIGHT[2];
      const shade = 0.45 + 0.6 * clamp(lit, 0, 1);
      let r = (src[t]! / 255) * shade;
      let g = (src[t + 1]! / 255) * shade;
      let b = (src[t + 2]! / 255) * shade;
      if (glow) {
        const rim = Math.pow(1 - sz, 2.6) * 0.75;
        r += (glow[0] - r) * rim;
        g += (glow[1] - g) * rim;
        b += (glow[2] - b) * rim;
      }
      const edge = clamp((1 - Math.sqrt(d2)) * R, 0, 1);
      data[i] = r * 255;
      data[i + 1] = g * 255;
      data[i + 2] = b * 255;
      data[i + 3] = edge * 255;
    }
  }
}
