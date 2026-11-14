import type { WorldLook } from '../../controller';

// Reine Darstellung: das Weltsymbol, ein kleines 3D-Bild einer Welt, Pixel für Pixel auf ein Canvas
// gerechnet. In der Weltenerschaffung zeigt es ab der Größe, was schon gewürfelt ist; der Rest bleibt grau. Größe als Durchmesser (0 ist ein Asteroidengürtel), Atmosphäre als Leuchten am Rand,
// Wasser und Land nach dem Wasseranteil, Städte als Lichter auf der Nachtseite, Umlaufbahnen ab
// hohem TL. Das Licht kommt von links, die Welt steht halb im Licht.

/** Ab diesem TL leuchten Städte auf der Nachtseite. */
const LIGHTS_FROM_TL = 5;
/** Ab diesem TL deutet eine Linie eine Umlaufbahn an, je zwei Stufen mehr eine weitere. */
const ORBITS_FROM_TL = 8;

type Rgb = readonly [number, number, number];

interface Atmosphere {
  /** Farbe des Leuchtens; ohne Atmosphäre keins. */
  readonly glow: string | undefined;
  /** Breite des Leuchtens als Anteil am Radius. */
  readonly width: number;
  /** Dichte: wie hell Leuchten und Dunst sind. */
  readonly density: number;
  /** Anteil der Wolken bei genug Wasser. */
  readonly clouds: number;
  readonly cloudColor?: string;
}

/** Je Stelle 0 bis F: atembar blau, verunreinigt giftgrün, exotisch violett, ätzend mit gelben Wolken, heimtückisch magenta. */
const ATMOSPHERES: readonly Atmosphere[] = [
  { glow: undefined, width: 0, density: 0, clouds: 0 },
  { glow: '#8fb4ff', width: 0.035, density: 0.25, clouds: 0 },
  { glow: '#9be35a', width: 0.05, density: 0.38, clouds: 0.03, cloudColor: '#e4f0c8' },
  { glow: '#7fb0ff', width: 0.05, density: 0.38, clouds: 0.03 },
  { glow: '#a6e24a', width: 0.08, density: 0.52, clouds: 0.12, cloudColor: '#e2efc0' },
  { glow: '#6fa8ff', width: 0.08, density: 0.52, clouds: 0.12 },
  { glow: '#5c9cff', width: 0.115, density: 0.66, clouds: 0.26 },
  { glow: '#9fe03c', width: 0.115, density: 0.66, clouds: 0.26, cloudColor: '#e0ecb4' },
  { glow: '#6aa6ff', width: 0.16, density: 0.8, clouds: 0.42 },
  { glow: '#a8dc3a', width: 0.16, density: 0.8, clouds: 0.42, cloudColor: '#dbe6a6' },
  { glow: '#b56cff', width: 0.13, density: 0.75, clouds: 0.34, cloudColor: '#d9c2f2' },
  { glow: '#c46cff', width: 0.15, density: 0.82, clouds: 0.55, cloudColor: '#d8c46a' },
  { glow: '#ff4fd8', width: 0.16, density: 0.86, clouds: 0.6, cloudColor: '#c45a96' },
  { glow: '#9cc4ff', width: 0.21, density: 0.9, clouds: 0.8 },
  { glow: '#6fa8ff', width: 0.06, density: 0.45, clouds: 0.1 },
  { glow: '#d08cff', width: 0.14, density: 0.72, clouds: 0.3, cloudColor: '#b8f0ea' },
];

interface Climate {
  /** Ab dieser Breite (Sinus) liegt Eis; über 1 nie. */
  readonly cap: number;
  /** Wasser ist gefroren. */
  readonly ice: boolean;
  readonly tint: Rgb;
}

const CLIMATES: Record<NonNullable<WorldLook['temperature']>, Climate> = {
  frozen: { cap: 0, ice: true, tint: [0.85, 0.9, 1] },
  cold: { cap: 0.72, ice: false, tint: [0.92, 0.95, 1] },
  temperate: { cap: 0.93, ice: false, tint: [1, 1, 1] },
  hot: { cap: 0.99, ice: false, tint: [1.06, 0.98, 0.9] },
  boiling: { cap: 2, ice: false, tint: [1.1, 0.92, 0.82] },
};
/** Noch keine Temperatur: kein Eis, keine Tönung. */
const NO_CLIMATE: Climate = { cap: 2, ice: false, tint: [1, 1, 1] };

// --- Rauschen ---------------------------------------------------------------------------------

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Ein kleiner Zufallsgenerator mit festem Startwert; das Symbol sieht jedes Mal gleich aus. */
function seeded(seed: number): () => number {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lattice(i: number, j: number, k: number, s: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number, z: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const xf = x - xi;
  const yf = y - yi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const w = zf * zf * (3 - 2 * zf);
  const x1 = lattice(xi, yi, zi, s) + (lattice(xi + 1, yi, zi, s) - lattice(xi, yi, zi, s)) * u;
  const x2 = lattice(xi, yi + 1, zi, s) + (lattice(xi + 1, yi + 1, zi, s) - lattice(xi, yi + 1, zi, s)) * u;
  const x3 = lattice(xi, yi, zi + 1, s) + (lattice(xi + 1, yi, zi + 1, s) - lattice(xi, yi, zi + 1, s)) * u;
  const x4 = lattice(xi, yi + 1, zi + 1, s) + (lattice(xi + 1, yi + 1, zi + 1, s) - lattice(xi, yi + 1, zi + 1, s)) * u;
  const y1 = x1 + (x2 - x1) * v;
  const y2 = x3 + (x4 - x3) * v;
  return y1 + (y2 - y1) * w;
}

function fbm(x: number, y: number, z: number, s: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise(x * f, y * f, z * f, s + o * 17);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return sum / norm;
}

// Felder auf der Kugel, in Körperkoordinaten (Einheitsvektor).
const landField = (x: number, y: number, z: number, s: number) => fbm(x * 1.7 + 11.3, y * 1.7 + 4.1, z * 1.7 + 7.7, s, 6);
function cloudField(x: number, y: number, z: number, s: number): number {
  const warp = fbm(x * 2 + 3, y * 2, z * 2, s + 99, 3);
  return fbm(x * 2.4 + warp * 1.4, y * 5.2, z * 2.4 + warp * 1.4, s + 51, 5);
}
const detailField = (x: number, y: number, z: number, s: number) => noise(x * 9, y * 9, z * 9, s + 7);

interface Samples {
  readonly land: readonly number[];
  readonly cloud: readonly number[];
  /** Punkte auf der Kugel mit ihrem Landwert, für die Städte. */
  readonly points: readonly { readonly x: number; readonly y: number; readonly z: number; readonly land: number }[];
}

const sampleCache = new Map<number, Samples>();

/** Stichproben je Welt: daraus die Schwellen für genau so viel Wasser und Wolken wie verlangt. */
function samplesOf(seed: number): Samples {
  const cached = sampleCache.get(seed);
  if (cached) return cached;
  const r = seeded(seed ^ 0x9e37);
  const land: number[] = [];
  const cloud: number[] = [];
  const points: { x: number; y: number; z: number; land: number }[] = [];
  for (let i = 0; i < 2400; i++) {
    const y = r() * 2 - 1;
    const t = r() * Math.PI * 2;
    const q = Math.sqrt(1 - y * y);
    const x = q * Math.cos(t);
    const z = q * Math.sin(t);
    const lv = landField(x, y, z, seed);
    land.push(lv);
    cloud.push(cloudField(x, y, z, seed));
    points.push({ x, y, z, land: lv });
  }
  const result = { land: land.sort((a, b) => a - b), cloud: cloud.sort((a, b) => a - b), points };
  sampleCache.set(seed, result);
  return result;
}

function quantile(sorted: readonly number[], q: number): number {
  if (q <= 0) return -1;
  if (q >= 1) return 2;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0.5;
}

// --- Farben -------------------------------------------------------------------------------------

function rgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
function smooth(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

const C = {
  deep: rgb('#0c2850'),
  shallow: rgb('#2a6f9a'),
  lowGreen: rgb('#3d6a34'),
  midGreen: rgb('#6c8443'),
  ochre: rgb('#b39062'),
  rust: rgb('#7c573a'),
  sand: rgb('#c2a274'),
  rock: rgb('#8a857d'),
  regolith: rgb('#6d6961'),
  regolith2: rgb('#9a958c'),
  ice: rgb('#e3ecf4'),
  iceBlue: rgb('#b9d0e6'),
  basalt: rgb('#3e302a'),
  snow: rgb('#f2f5f8'),
  taintedSea: [0.12, 0.3, 0.25] as Rgb,
  steam: [0.35, 0.4, 0.42] as Rgb,
  rubble: [0.55, 0.47, 0.4] as Rgb,
  unknown: rgb('#55575a'),
  unknown2: rgb('#8a8c90'),
};

const tainted = (atmosphere: number) => atmosphere === 2 || atmosphere === 4 || atmosphere === 7 || atmosphere === 9;

function surfaceColor(look: WorldLook, x: number, y: number, z: number, lv: number, threshold: number, seed: number): Rgb {
  const det = detailField(x, y, z, seed);
  // In der Erschaffung, solange Atmosphäre oder Hydrographie fehlen: nur grauer Fels.
  if (look.atmosphere === undefined || look.hydrographics === undefined) {
    const e = clamp((lv - 0.35) / 0.4, 0, 1);
    const grey = mix(C.unknown, C.unknown2, det * 0.7 + e * 0.3);
    // Steht die Temperatur schon fest, tönt sie das Grau.
    const tint = look.temperature ? CLIMATES[look.temperature].tint : NO_CLIMATE.tint;
    return [grey[0] * tint[0], grey[1] * tint[1], grey[2] * tint[2]];
  }
  const atmosphere = look.atmosphere;
  const hydrographics = look.hydrographics;
  const vacuum = atmosphere <= 1;
  const climate = look.temperature ? CLIMATES[look.temperature] : NO_CLIMATE;
  const lat = Math.abs(y);
  const capEdge = climate.cap + (det - 0.5) * 0.12;
  if (lv < threshold) {
    const depth = clamp((threshold - lv) / 0.12, 0, 1);
    if (climate.ice || vacuum) return mix(C.iceBlue, C.ice, det * 0.6 + depth * 0.2);
    if (lat > capEdge) return mix(C.ice, C.snow, det);
    let col = mix(C.shallow, C.deep, Math.pow(depth, 0.6));
    if (tainted(atmosphere)) col = mix(col, C.taintedSea, 0.35);
    if (look.temperature === 'boiling') col = mix(col, C.steam, 0.4);
    return col;
  }
  const e = clamp((lv - threshold) / Math.max(0.08, 1 - threshold - 0.25), 0, 1);
  let col: Rgb;
  if (vacuum) {
    col = mix(C.regolith, C.regolith2, det * 0.8 + e * 0.3);
    if (noise(x * 14, y * 14, z * 14, seed + 3) > 0.72) col = mix(col, C.regolith, 0.5);
  } else if (look.temperature === 'frozen') {
    col = mix(C.iceBlue, C.rock, e * 0.6 + det * 0.2);
  } else if (look.temperature === 'boiling') {
    col = mix(C.basalt, C.rust, det * 0.5 + e * 0.3);
  } else {
    const dry = clamp(1 - hydrographics / 5, 0, 1);
    const green = look.life === true && ((atmosphere >= 2 && atmosphere <= 9) || atmosphere >= 13);
    const low = green ? mix(C.lowGreen, C.midGreen, det * 0.7) : mix(C.rust, C.ochre, det * 0.8);
    col = mix(low, green ? C.ochre : C.sand, dry * 0.85);
    if (look.temperature === 'hot') col = mix(col, C.ochre, 0.35);
    col = mix(col, C.rock, smooth(0.45, 0.9, e));
    if (look.temperature === 'cold') col = mix(col, C.iceBlue, 0.15);
  }
  if (lat > capEdge - 0.04 * e && !vacuum) col = mix(col, C.snow, 0.9);
  return [col[0] * climate.tint[0], col[1] * climate.tint[1], col[2] * climate.tint[2]];
}

// --- Zeichnen -----------------------------------------------------------------------------------

/** Richtung, in die das Licht fällt (Blickraum, z zum Betrachter): von links, die Welt halb im Licht. */
const SUN = (() => {
  const v = [1, 0.04, 0] as const;
  const l = Math.hypot(v[0], v[1], v[2]);
  return { x: v[0] / l, y: v[1] / l, z: v[2] / l };
})();
/** Wie hell ein Punkt mit der Normalen (x, y, z) beleuchtet ist; negativ auf der Nachtseite. */
const litOf = (x: number, y: number, z: number) => -(x * SUN.x + y * SUN.y + z * SUN.z);

const TILT = 0.38;
const ROTATION = (40 * Math.PI) / 180;
const CT = Math.cos(TILT);
const ST = Math.sin(TILT);
const CR = Math.cos(ROTATION);
const SR = Math.sin(ROTATION);

/** Zeichnet die Welt auf ein neues Canvas mit `px` × `px` Pixeln. */
export function drawWorld(look: WorldLook, px: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const S = Math.max(8, Math.round(px));
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const img = ctx.createImageData(S, S);
  const seed = hashText(look.seed);
  if (look.size === 0) {
    drawBelt(img, S, seed);
    ctx.putImageData(img, 0, 0);
    beltLights(ctx, S, look, seed);
    return canvas;
  }
  const atm = (look.atmosphere === undefined ? undefined : ATMOSPHERES[look.atmosphere]) ?? ATMOSPHERES[0]!;
  const hydrographics = look.hydrographics ?? 0;
  const exotic = (look.atmosphere ?? 0) >= 10;
  const R = (S / 2) * (0.3 + Math.min(10, look.size) * 0.052);
  const glow = atm.glow ? rgb(atm.glow) : undefined;
  const G = glow ? R * atm.width * 1.8 : 0;
  const samples = samplesOf(seed);
  // Ohne Hydrographie noch kein Wasser; ohne Oberfläche nach der Hydrographie.
  const water = look.water ?? (look.hydrographics === undefined ? 0 : look.hydrographics >= 10 ? 0.985 : look.hydrographics / 10);
  const threshold = quantile(samples.land, water);
  let cover = atm.clouds * (0.4 + 0.6 * Math.min(1, hydrographics / 4 + (exotic ? 0.6 : 0)));
  if (look.temperature === 'hot') cover = Math.min(0.9, cover * 1.3);
  if (look.temperature === 'boiling') cover = Math.min(0.95, cover * 1.5 + 0.1);
  if (look.temperature === 'frozen' || look.temperature === 'cold') cover *= 0.6;
  const cloudThreshold = quantile(samples.cloud, 1 - cover);
  const cloudColor = atm.cloudColor ? rgb(atm.cloudColor) : ([0.97, 0.98, 1] as Rgb);
  const data = img.data;
  const half = S / 2;
  const sun2 = Math.hypot(SUN.x, SUN.y) || 1;
  for (let py = 0; py < S; py++) {
    for (let px2 = 0; px2 < S; px2++) {
      const dx = (px2 + 0.5 - half) / R;
      const dy = (py + 0.5 - half) / R;
      const d2 = dx * dx + dy * dy;
      const i = (py * S + px2) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (d2 <= 1) {
        const z = Math.sqrt(1 - d2);
        // Körperkoordinaten: erst die Neigung um x, dann die Drehung um y
        const y1 = dy * CT - z * ST;
        const z1 = dy * ST + z * CT;
        const bx = dx * CR + z1 * SR;
        const bz = -dx * SR + z1 * CR;
        const by = -y1;
        const lv = landField(bx, by, bz, seed);
        let col = surfaceColor(look, bx, by, bz, lv, threshold, seed);
        if (cover > 0.001) {
          const ca = smooth(cloudThreshold, cloudThreshold + 0.09, cloudField(bx, by, bz, seed)) * (look.atmosphere === 13 ? 0.95 : 0.85);
          col = mix(col, cloudColor, ca);
        }
        const lit = litOf(dx, dy, z);
        const day = smooth(-0.04, 0.25, lit);
        const lt = clamp((lit + 0.08) / 1.08, 0, 1);
        const shade = 0.03 + 0.97 * (lt < 0.12 ? (lt * lt) / 0.24 : lt - 0.06);
        col = [col[0] * shade, col[1] * shade, col[2] * shade];
        if (glow) {
          const fresnel = Math.pow(1 - z, 2.4) * atm.density;
          col = mix(col, glow, clamp(fresnel * (0.15 + 0.85 * smooth(-0.25, 0.3, lit)), 0, 0.9));
          col = mix(col, glow, atm.density * (exotic ? 0.05 : 0.07) * day);
        }
        const edge = clamp((1 - Math.sqrt(d2)) * R, 0, 1);
        [r, g, b] = col;
        a = edge;
        if (glow && edge < 1) {
          const t = (1 - edge) * atm.density * 0.6;
          r = r * edge + glow[0] * t;
          g = g * edge + glow[1] * t;
          b = b * edge + glow[2] * t;
          a = Math.max(edge, atm.density * 0.6);
        }
      } else if (glow && G > 0) {
        const dist = Math.sqrt(d2) * R - R;
        if (dist < G) {
          const t = dist / G;
          const len = Math.sqrt(d2);
          const toward = -((dx / len) * SUN.x + (dy / len) * SUN.y) / sun2;
          const lf = 0.22 + 0.78 * smooth(-0.5, 0.9, toward);
          [r, g, b] = glow;
          a = clamp(atm.density * Math.pow(1 - t, 2.2) * lf, 0, 1);
        }
      }
      data[i] = clamp(r, 0, 1) * 255;
      data[i + 1] = clamp(g, 0, 1) * 255;
      data[i + 2] = clamp(b, 0, 1) * 255;
      data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  cityLights(ctx, S, R, look, seed, samples, threshold);
  orbits(ctx, S, R, look, seed);
  return canvas;
}

/** Wie viele Städte: doppelt so viele je Stufe der Bevölkerung. */
const cityCount = (population: number) => (population <= 0 ? 0 : Math.round(Math.pow(2, population)));

/** Wie die Lichter aussehen; unter dem Mindest-TL oder ohne Bewohner keine. */
function lightStyle(look: WorldLook): { alpha: number; color: string } | undefined {
  const { population = 0, tech } = look;
  if (population <= 0 || tech === undefined || tech < LIGHTS_FROM_TL) return undefined;
  const alpha = clamp(0.45 + (tech - LIGHTS_FROM_TL) * 0.07, 0.45, 1);
  const color = tech >= 12 ? '232,240,255' : tech >= 9 ? '255,228,170' : '255,196,110';
  return { alpha, color };
}

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha: number): void {
  const grd = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
  grd.addColorStop(0, `rgba(${color},${alpha})`);
  grd.addColorStop(0.35, `rgba(${color},${alpha * 0.45})`);
  grd.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(x - size * 2.2, y - size * 2.2, size * 4.4, size * 4.4);
}

function cityLights(ctx: CanvasRenderingContext2D, S: number, R: number, look: WorldLook, seed: number, samples: Samples, threshold: number): void {
  const style = lightStyle(look);
  if (!style) return;
  const onLand = samples.points.filter((p) => p.land >= threshold);
  // Ohne nennenswertes Land schwimmen die Städte; sonst Küsten und Tiefland zuerst.
  const candidates = (onLand.length < 30 ? samples.points : onLand).slice().sort((a, b) => Math.abs(a.land - threshold) - Math.abs(b.land - threshold));
  const n = Math.min(candidates.length, cityCount(look.population ?? 0));
  const r = seeded(seed ^ 0xc17);
  const base = Math.max(0.6, R * 0.012);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const p = candidates[k]!;
    // Körper → Blick, die Umkehrung von drawWorld
    const bx = p.x;
    const by = -p.y;
    const bz = p.z;
    const x = bx * CR - bz * SR;
    const z1 = bx * SR + bz * CR;
    const y = by * CT + z1 * ST;
    const z = -by * ST + z1 * CT;
    const size = base * (0.6 + r() * 1.1) * Math.sqrt(Math.max(0, z));
    const flicker = 0.45 + r() * 0.55;
    if (z <= 0.05) continue;
    const night = smooth(0.05, -0.18, litOf(x, y, z));
    if (night <= 0.02) continue;
    glowDot(ctx, S / 2 + x * R, S / 2 + y * R, size, style.color, style.alpha * night * flicker);
  }
  ctx.restore();
}

/** Umlaufbahnen: feine, schräge Linien, deren hintere Hälfte hinter der Welt verschwindet. Im Kleinen kräftiger. */
function orbits(ctx: CanvasRenderingContext2D, S: number, R: number, look: WorldLook, seed: number): void {
  const { population = 0, tech } = look;
  if (population <= 0 || tech === undefined || tech < ORBITS_FROM_TL) return;
  const over = tech - ORBITS_FROM_TL;
  const count = Math.min(4, 1 + Math.floor(over / 2));
  const small = S < 140;
  const alpha = clamp(0.2 + over * 0.035, 0.2, 0.45) * (small ? 1.9 : 1);
  const lineWidth = Math.max(small ? 1.1 : 0.6, S * 0.0035);
  const r = seeded(seed ^ 0x5a7);
  const c = S / 2;
  for (let k = 0; k < count; k++) {
    const a = Math.min(R * (1.18 + k * 0.1), (S / 2) * (0.9 + k * 0.025));
    const b = a * (0.18 + r() * 0.16);
    const tilt = -0.3 + (r() - 0.5) * 0.4;
    ctx.save();
    ctx.strokeStyle = `rgba(190,215,255,${Math.min(0.85, alpha * (k === 0 ? 1 : 0.8))})`;
    ctx.lineWidth = lineWidth;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, S, S);
    ctx.arc(c, c, R + 0.5, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.beginPath();
    ctx.ellipse(c, c, a, b, tilt, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(c, c, a, b, tilt, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}

interface Rock {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly s: number;
  readonly rot: number;
}

/** Ein Asteroidengürtel: Brocken auf einem flachen, schrägen Bogen, dazwischen Staub. */
function beltRocks(S: number, seed: number): readonly Rock[] {
  const r = seeded(seed ^ 0xa57);
  const rocks: Rock[] = [];
  const n = 9;
  for (let k = 0; k < n; k++) {
    const t = (k + 0.2 + r() * 0.6) / n;
    const big = k === 4 ? 1.7 : k === 2 || k === 7 ? 1.25 : 0.8 + r() * 0.3;
    rocks.push({ x: S * (0.1 + t * 0.8), y: S * (0.68 - t * 0.36 - Math.sin(t * Math.PI) * 0.06 + (r() - 0.5) * 0.12), r: S * (0.03 + r() * 0.03) * big, s: Math.floor(r() * 1e6), rot: r() * 6.28 });
  }
  for (let k = 0; k < 18; k++) {
    const t = r();
    rocks.push({ x: S * (0.08 + t * 0.84), y: S * (0.68 - t * 0.36 - Math.sin(t * Math.PI) * 0.06 + (r() - 0.5) * 0.2), r: S * (0.007 + r() * 0.01), s: Math.floor(r() * 1e6), rot: r() * 6.28 });
  }
  return rocks;
}

function drawBelt(img: ImageData, S: number, seed: number): void {
  const data = img.data;
  for (const rock of beltRocks(S, seed)) {
    const x0 = Math.max(0, Math.floor(rock.x - rock.r * 1.5));
    const x1 = Math.min(S - 1, Math.ceil(rock.x + rock.r * 1.5));
    const y0 = Math.max(0, Math.floor(rock.y - rock.r * 1.5));
    const y1 = Math.min(S - 1, Math.ceil(rock.y + rock.r * 1.5));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - rock.x;
        const dy = py + 0.5 - rock.y;
        const angle = Math.atan2(dy, dx) + rock.rot;
        const rr = rock.r * (1 + 0.56 * (noise(Math.cos(angle) * 1.6, Math.sin(angle) * 1.6, 0.5, rock.s) - 0.5));
        const d = Math.hypot(dx, dy) / rr;
        if (d > 1) continue;
        const lit = litOf(dx / rr, dy / rr, Math.sqrt(Math.max(0, 1 - d * d)));
        const base = mix(C.regolith, C.rubble, noise((px / rock.r) * 2.5, (py / rock.r) * 2.5, 0.3, rock.s));
        const shade = 0.05 + 0.95 * smooth(-0.1, 0.35, lit) * (0.5 + 0.5 * clamp(lit, 0, 1));
        const i = (py * S + px) * 4;
        data[i] = base[0] * shade * 255;
        data[i + 1] = base[1] * shade * 255;
        data[i + 2] = base[2] * shade * 255;
        data[i + 3] = Math.max(data[i + 3] ?? 0, clamp((1 - d) * rr, 0, 1) * 255);
      }
    }
  }
}

function beltLights(ctx: CanvasRenderingContext2D, S: number, look: WorldLook, seed: number): void {
  const style = lightStyle(look);
  if (!style) return;
  const rocks = beltRocks(S, seed);
  const r = seeded(seed ^ 0x5151);
  const n = Math.min(60, Math.ceil(cityCount(look.population ?? 0) / 6));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const rock = rocks[Math.floor(r() * 9)]!;
    // auf der Nachtseite des Brockens, der Sonne abgewandt
    const angle = Math.atan2(SUN.y, SUN.x) + (r() - 0.5) * 1.6;
    const dist = rock.r * (0.3 + r() * 0.5);
    glowDot(ctx, rock.x + Math.cos(angle) * dist, rock.y + Math.sin(angle) * dist, Math.max(0.7, S * 0.008), style.color, style.alpha * (0.5 + r() * 0.5));
  }
  ctx.restore();
}

// --- Zwischenspeicher ---------------------------------------------------------------------------

const keyOf = (look: WorldLook, px: number) => `${px}|${look.seed}|${look.size}|${look.atmosphere}|${look.hydrographics}|${look.water}|${look.population}|${look.tech}|${look.temperature}|${look.life}`;
const canvases = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();

/** Das Symbol als Canvas mit `px` Pixeln Kantenlänge, je Welt und Größe nur einmal gerechnet. */
export function worldCanvas(look: WorldLook, px: number): HTMLCanvasElement {
  const key = keyOf(look, Math.round(px));
  let canvas = canvases.get(key);
  if (!canvas) {
    canvas = drawWorld(look, px);
    canvases.set(key, canvas);
  }
  return canvas;
}

/** Das Symbol als Bild-URL, etwa für ein `<image>` in der Sektorkarte. */
export function worldImageUrl(look: WorldLook, px: number): string {
  const key = keyOf(look, Math.round(px));
  let url = urls.get(key);
  if (url === undefined) {
    try {
      url = worldCanvas(look, px).toDataURL('image/png');
    } catch {
      url = '';
    }
    urls.set(key, url);
  }
  return url;
}
