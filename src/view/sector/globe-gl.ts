import type { GlobeView } from '../../controller';
import { ATMOSPHERE_GLOW, basisOf, cellLook, LIGHT, radiusOf, rgbOf, type Camera, type Viewport } from './globe-render';

// Reine Darstellung: der Globus mit WebGL. Jedes Oberflächenfeld ist eine echte Fläche (ein Sechseck,
// an den 12 Ecken des Rasters ein Fünfeck); Küsten und Geländegrenzen laufen an den Feldrändern, also
// genau dort, wo man auch antippt. Jede Geländeart hat ein eigenes Muster, das die Grafikkarte in
// Bildschirmauflösung rechnet: scharf auf jeder Zoomstufe, und erst sichtbar, wenn es groß genug ist.
// Das Hexgitter sind nur noch die Ränder der Felder zum Zuschalten.

const QUAD_VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Leuchten der Atmosphäre außen um die Kugel und ein dunkler Grund unter den Feldern. */
const HALO_FS = `
precision highp float;
uniform vec2 uView;
uniform float uR;
uniform vec3 uGlow;
uniform float uHalo;
void main() {
  float sx = (gl_FragCoord.x - uView.x * 0.5) / uR;
  float sy = (uView.y * 0.5 - gl_FragCoord.y) / uR;
  float d = sqrt(sx * sx + sy * sy);
  if (d <= 1.0) {
    gl_FragColor = vec4(0.03, 0.08, 0.17, 1.0);
    return;
  }
  float dist = (d - 1.0) * uR;
  if (uHalo > 0.0 && dist < uHalo) {
    float a = pow(1.0 - dist / uHalo, 2.2) * 0.7;
    gl_FragColor = vec4(uGlow * a, a);
    return;
  }
  gl_FragColor = vec4(0.0);
}
`;

const CELL_VS = `
attribute vec3 aPos;
attribute vec3 aCol;
attribute float aEdge;
attribute float aKind;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uF;
uniform vec2 uScale;
varying vec3 vCol;
varying float vEdge;
varying float vKind;
varying vec3 vPos;
varying vec3 vView;
void main() {
  vec3 v = vec3(dot(aPos, uE), dot(aPos, uN), dot(aPos, uF));
  vView = v;
  vPos = aPos;
  vCol = aCol;
  vEdge = aEdge;
  vKind = aKind;
  gl_Position = vec4(v.x * uScale.x, v.y * uScale.y, 0.0, 1.0);
}
`;

// Die Arten wie CELL_KINDS in globe-render.ts:
// 0 Wasser, 1 Eis auf Wasser, 2 Eis auf Land, 3 Tundra, 4 Gebirge, 5 Zerklüftet, 6 Wüste,
// 7 Dschungel, 8 Sumpf, 9 Offen/Wald, 10 Besiedelt, 11 Stadt, 12 Offen ohne Leben.
const CELL_FS = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec3 uLight;
uniform vec3 uGlow;
uniform float uHalo;
uniform float uK;
uniform float uGrid;
varying vec3 vCol;
varying float vEdge;
varying float vKind;
varying vec3 vPos;
varying vec3 vView;

// Ein Bildpunkt in Mustereinheiten; jede Oktave, die feiner als ein Bildpunkt wäre, blendet aus.
float PX;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
vec3 hash3(vec3 p) {
  return vec3(hash(p), hash(p + 19.19), hash(p + 47.37));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
// Jede Oktave gedreht, damit keine Achsen im Muster sichtbar werden.
const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fade(float px) {
  return 1.0 - smoothstep(0.25, 0.6, px);
}
// Fraktales Rauschen, dessen feine Oktaven erst beim Hineinzoomen dazukommen.
float fbm(vec3 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  float px = PX;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * mix(0.5, noise(p), fade(px));
    norm += amp;
    p = ROT * p * 2.03 + 1.7;
    px *= 2.03;
    amp *= 0.5;
  }
  return sum / norm;
}
// Grate: jede Oktave scharf geknickt und vom Grat darüber gewichtet.
float ridged(vec3 p, int octaves) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  float weight = 1.0;
  float px = PX;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float r = 1.0 - abs(2.0 * noise(p) - 1.0);
    r = r * r * weight;
    weight = clamp(r * 1.6, 0.0, 1.0);
    sum += amp * mix(0.35, r, fade(px));
    norm += amp;
    p = ROT * p * 2.07 + 3.1;
    px *= 2.07;
    amp *= 0.5;
  }
  return sum / norm;
}
// Zellen: Abstand zum nächsten und zweitnächsten Punkt, dazu eine Kennung der Zelle.
vec3 cells(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  float id = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 o = vec3(float(x), float(y), float(z));
        vec3 h = hash3(i + o);
        vec3 r = o + h - f;
        float d = dot(r, r);
        if (d < d1) {
          d2 = d1;
          d1 = d;
          id = h.x;
        } else if (d < d2) {
          d2 = d;
        }
      }
    }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
// Licht und Schatten aus einer Höhe: Hänge zum Licht (links oben) hell, abgewandte dunkel.
float relief(float h, float strength) {
  vec2 g = vec2(dFdx(h), dFdy(h)) / max(PX, 1e-5);
  return clamp(1.0 + dot(g, vec2(0.55, -0.5)) * strength, 0.55, 1.45);
}
// Weiche Grenze, die nie feiner als ein Bildpunkt wird.
float soft(float edge, float v, float width) {
  float w = max(width, fwidth(v));
  return smoothstep(edge - w, edge + w, v);
}

void main() {
  if (vView.z < 0.0) discard;
  vec3 normal = normalize(vView);
  // Musterraum: etwa drei Einheiten je Feld.
  vec3 q = normalize(vPos) * uK;
  PX = length(fwidth(q));
  float near = 1.0 - smoothstep(0.08, 0.3, PX);
  int k = int(vKind + 0.5);
  vec3 col = vCol;
  // Großräumige Schwankung über alle Felder, damit kein Feld einfarbig ist.
  float large = fbm(q * 0.22 + 11.0, 5);
  // Verzerrte Koordinaten für organische Formen.
  vec3 w = q + 1.6 * vec3(fbm(q * 0.35, 4), fbm(q * 0.35 + 5.2, 4), fbm(q * 0.35 + 9.7, 4));

  if (k == 0) {
    // Wasser: Strömungsschlieren, aus der Nähe kräuselnde Wellen mit Glanz.
    float current = fbm(w * 0.6, 6);
    col *= 0.86 + 0.28 * current;
    float waves = fbm(q * vec3(6.0, 6.0, 3.0) + current * 4.0, 4);
    col *= relief(waves * 0.06, 1.0);
    col = mix(col, col * 1.4 + 0.04, soft(0.74, waves, 0.02) * near * 0.3);
  } else if (k == 1 || k == 2) {
    // Eis: Schollen mit Rissen, jede etwas anders getönt, mit Pressrücken.
    vec3 c = cells(w * 0.9);
    float crack = 1.0 - soft(0.05, c.y - c.x, 0.01);
    float h = fbm(q * 1.5, 6) * 0.6 + (c.y - c.x) * 0.4;
    col *= (0.93 + 0.1 * c.z) * relief(h * 0.25, 1.0);
    col = mix(col, col * vec3(0.7, 0.78, 0.88), crack * 0.75);
  } else if (k == 3) {
    // Tundra: Frostmusterboden aus Vielecken, Flechten und Moos dazwischen.
    vec3 c = cells(q * 1.8);
    float border = 1.0 - soft(0.06, c.y - c.x, 0.01);
    float lichen = soft(0.55, fbm(w * 1.6, 6), 0.05);
    col = mix(col, col * vec3(0.95, 0.98, 0.75), lichen * 0.6);
    col = mix(col, col * 0.75, border * 0.5);
    col *= 0.9 + 0.2 * fbm(q * 4.0, 5);
  } else if (k == 4) {
    // Gebirge: verzweigte Grate mit Licht und Schatten, Geröll in den Tälern, Schnee auf den Gipfeln.
    float h = ridged(w * 0.55, 7);
    col = mix(col * 0.78, col * 1.18, h);
    col *= relief(h * 0.9, 1.2);
    col = mix(col, vec3(0.88, 0.89, 0.93) * relief(h * 0.9, 0.6), soft(0.74, h + 0.15 * fbm(q * 3.0, 4), 0.05) * 0.65);
  } else if (k == 5) {
    // Zerklüftet: Kuppen und Schluchten, Felsbrocken aus der Nähe.
    float h = fbm(w * 0.9, 7) * 0.7 + ridged(q * 1.4, 5) * 0.3;
    col = mix(col * 0.82, col * 1.15, h);
    col *= relief(h * 0.7, 1.0);
    vec3 c = cells(q * 6.0);
    col *= mix(1.0, 0.85 + 0.25 * soft(0.35, c.x, 0.05), near);
  } else if (k == 6) {
    // Wüste: Dünenkämme mit Lee und Luv, darauf feine Rippeln.
    float t = dot(w, vec3(0.8, 0.5, 0.33)) * 1.4 + fbm(q * 0.6, 4) * 2.5;
    float dune = abs(fract(t) - 0.35);
    float h = 1.0 - smoothstep(0.0, 0.65, dune);
    float ripple = sin(t * 26.0 + fbm(q * 3.0, 3) * 6.0) * 0.5 + 0.5;
    col = mix(col * 0.9, col * 1.1, fbm(w * 0.4, 5));
    // Die Kämme erst mit Licht und Schatten, wenn sie breit genug sind, sonst flimmern sie als Streifen.
    float crest = 1.0 - smoothstep(0.04, 0.12, PX);
    col *= mix(1.0 + 0.06 * (h - 0.5), relief(h * 0.25 + ripple * 0.01 * near, 1.0), crest);
  } else if (k == 7 || k == 9) {
    // Wald und Dschungel: runde Baumkronen mit Schatten; im Wald Lichtungen und Wiesen dazwischen.
    bool jungle = k == 7;
    float density = jungle ? 0.85 + 0.15 * large : smoothstep(0.38, 0.62, fbm(w * 0.5, 6));
    vec3 c = cells(q * (jungle ? 5.0 : 4.0));
    float crown = 1.0 - smoothstep(0.0, 0.75, c.x);
    float tree = step(c.z, density);
    vec3 meadow = col * vec3(1.2, 1.18, 0.95) * (0.9 + 0.2 * fbm(q * 3.0, 5));
    vec3 canopy = col * (0.75 + 0.35 * crown) * (0.88 + 0.24 * c.z);
    canopy *= relief(crown * 0.12, 1.0);
    vec3 farAway = mix(meadow, col * 0.85, density);
    col = mix(farAway, mix(meadow * 0.8, canopy, tree), near);
    col *= 0.92 + 0.16 * large;
  } else if (k == 8) {
    // Sumpf: verzweigte Wasserläufe und Tümpel, Schilf an den Ufern.
    float m = fbm(w * 1.1, 7);
    float pool = soft(0.56, m, 0.01);
    float shore = soft(0.5, m, 0.02) - pool;
    col *= 0.85 + 0.3 * fbm(q * 3.5, 5);
    col = mix(col, col * vec3(0.8, 0.95, 0.6), shore * 0.6);
    col = mix(col, vec3(0.08, 0.17, 0.19) * (0.9 + 0.3 * fbm(q * 2.0, 3)), pool * 0.85);
  } else if (k == 10) {
    // Besiedelt: Felder als Flickenteppich in Grün, Gelb und Braun, Hecken an den Rändern, Furchen darin.
    vec3 c = cells(q * 1.1 + 0.5 * vec3(fbm(q * 0.5, 3)));
    vec3 tone = c.z < 0.35 ? vec3(1.0, 1.02, 0.9) : c.z < 0.65 ? vec3(1.12, 1.06, 0.82) : c.z < 0.85 ? vec3(0.9, 0.98, 0.86) : vec3(1.02, 0.92, 0.78);
    col = mix(col, col * tone, 0.4 + 0.6 * near);
    float furrow = sin(dot(q, normalize(hash3(vec3(c.z * 91.0)) - 0.5)) * 40.0) * 0.5 + 0.5;
    col *= 1.0 - 0.05 * furrow * near;
    col = mix(col, col * 0.72, (1.0 - soft(0.03, c.y - c.x, 0.006)) * 0.55 * near);
    col *= 0.94 + 0.12 * large;
  } else if (k == 11) {
    // Stadt: Viertel und Blöcke mit Straßen, Dächer verschieden hell, ab und zu ein Park.
    vec3 g = w * 2.2;
    vec3 cell = floor(g);
    float roof = hash(cell);
    vec3 e = 0.5 - abs(fract(g) - 0.5);
    float street = 1.0 - soft(0.07, min(min(e.x, e.y), e.z), 0.01);
    col *= 0.8 + 0.35 * mix(0.5, roof, near);
    if (roof > 0.9) col = mix(col, vec3(0.3, 0.45, 0.25), near * 0.8);
    col = mix(col, col * 0.55, street * near * 0.8);
  } else {
    // Ödes Land: Staub, Geröll und kleine Krater.
    float h = fbm(w * 0.8, 7);
    col = mix(col * 0.85, col * 1.12, h);
    vec3 c = cells(q * 2.5);
    float crater = smoothstep(0.25, 0.18, c.x) * step(0.8, c.z);
    col *= relief(h * 0.4 - crater * 0.05, 1.0);
  }
  col *= 0.45 + 0.6 * clamp(dot(normal, uLight), 0.0, 1.0);
  if (uHalo > 0.0) col = mix(col, uGlow, pow(1.0 - normal.z, 2.6) * 0.75);
  if (uGrid > 0.5) {
    float ew = fwidth(vEdge);
    col = mix(col, col * 0.35, (1.0 - smoothstep(0.0, ew * 1.1, vEdge)) * 0.85);
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Zeichnet den Globus einer Karte; `undefined`, wenn das Gerät kein WebGL kann. */
export interface GlobeRenderer {
  draw(globe: GlobeView, camera: Camera, view: Viewport, showGrid: boolean): void;
}

function compile(gl: WebGLRenderingContext, vs: string, fs: string): WebGLProgram | undefined {
  const program = gl.createProgram();
  if (!program) return undefined;
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) return undefined;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      // Geht ein Shader nicht, zeichnet der Prozessor; der Grund steht in der Konsole.
      console.warn('Globus-Shader:', gl.getShaderInfoLog(shader));
      return undefined;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : undefined;
}

/** Werte je Ecke im Netz: Lage (3), Farbe (3), Abstand zum Rand (1), Art (1). */
const STRIDE = 8;

/**
 * Die Felder als Dreiecke: je Feld ein Fächer von der Mitte zu den Ecken. Eine Ecke liegt zwischen
 * dem Feld und zwei aufeinanderfolgenden Nachbarn. Ihre Farbe ist der Mittelwert der Felder gleicher
 * Art, die sich dort treffen: So verläuft etwa die Wassertiefe weich, Grenzen zwischen Arten bleiben
 * scharf. Der Abstand zum Rand ist 1 in der Mitte und 0 am Rand (für das Gitter).
 */
export function hexMesh(globe: GlobeView): Float32Array {
  const { grid } = globe;
  const { color, kind } = cellLook(globe);
  const p = grid.xyz;
  let count = 0;
  for (let c = 0; c < grid.cells; c++) count += grid.neighbors[c]!.length;
  const out = new Float32Array(count * 3 * STRIDE);
  let o = 0;
  const push = (x: number, y: number, z: number, rgb: readonly [number, number, number], edge: number, k: number) => {
    out[o++] = x;
    out[o++] = y;
    out[o++] = z;
    out[o++] = rgb[0];
    out[o++] = rgb[1];
    out[o++] = rgb[2];
    out[o++] = edge;
    out[o++] = k;
  };
  const rgbOfCell = (c: number) => [color[c * 3]!, color[c * 3 + 1]!, color[c * 3 + 2]!] as const;
  for (let c = 0; c < grid.cells; c++) {
    const cx = p[c * 3]!;
    const cy = p[c * 3 + 1]!;
    const cz = p[c * 3 + 2]!;
    // Eine Richtung in der Tangentialebene, dann die Nachbarn nach Winkel um das Feld.
    let ux = -cy;
    let uy = cx;
    let uz = 0;
    if (Math.hypot(ux, uy) < 1e-6) [ux, uy, uz] = [1, 0, 0];
    const ul = Math.hypot(ux, uy, uz);
    ux /= ul;
    uy /= ul;
    uz /= ul;
    const vx = cy * uz - cz * uy;
    const vy = cz * ux - cx * uz;
    const vz = cx * uy - cy * ux;
    const angle = (q: number): number => {
      const dx = p[q * 3]! - cx;
      const dy = p[q * 3 + 1]! - cy;
      const dz = p[q * 3 + 2]! - cz;
      return Math.atan2(dx * vx + dy * vy + dz * vz, dx * ux + dy * uy + dz * uz);
    };
    const around = [...grid.neighbors[c]!].sort((a, b) => angle(a) - angle(b));
    const k = kind[c]!;
    const center = rgbOfCell(c);
    const corners = around.map((q, i) => {
      const r = around[(i + 1) % around.length]!;
      const x = cx + p[q * 3]! + p[r * 3]!;
      const y = cy + p[q * 3 + 1]! + p[r * 3 + 1]!;
      const z = cz + p[q * 3 + 2]! + p[r * 3 + 2]!;
      const l = Math.hypot(x, y, z);
      let sum = [center[0], center[1], center[2]];
      let n = 1;
      for (const m of [q, r]) {
        if (kind[m] !== k) continue;
        const rgb = rgbOfCell(m);
        sum = [sum[0]! + rgb[0], sum[1]! + rgb[1], sum[2]! + rgb[2]];
        n++;
      }
      return { at: [x / l, y / l, z / l] as const, rgb: [sum[0]! / n, sum[1]! / n, sum[2]! / n] as const };
    });
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % corners.length]!;
      push(cx, cy, cz, center, 1, k);
      push(a.at[0], a.at[1], a.at[2], a.rgb, 0, k);
      push(b.at[0], b.at[1], b.at[2], b.rgb, 0, k);
    }
  }
  return out;
}

export function createGlobeRenderer(canvas: HTMLCanvasElement): GlobeRenderer | undefined {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true, alpha: true });
  } catch {
    gl = null;
  }
  if (!gl) return undefined;
  // Ohne Ableitungen im Shader gehen weder Muster noch Gitter; dann rechnet der Prozessor.
  if (!gl.getExtension('OES_standard_derivatives')) return undefined;
  const halo = compile(gl, QUAD_VS, HALO_FS);
  const cells = compile(gl, CELL_VS, CELL_FS);
  if (!halo || !cells) return undefined;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  // Das Netz gehört zu einer Karte; wird sie neu gewürfelt, entsteht es neu.
  let shown: object | undefined;
  let mesh: { buffer: WebGLBuffer | null; vertices: number } | undefined;

  return {
    draw(globe, camera, view, showGrid) {
      const g = gl!;
      if (shown !== globe.map || !mesh) {
        if (mesh) g.deleteBuffer(mesh.buffer);
        const data = hexMesh(globe);
        const buffer = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, buffer);
        g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
        mesh = { buffer, vertices: data.length / STRIDE };
        shown = globe.map;
      }
      const glowHex = ATMOSPHERE_GLOW[globe.look.atmosphere ?? 0];
      const glow = glowHex ? rgbOf(glowHex) : ([0, 0, 0] as const);
      const W = view.width;
      const H = view.height;
      const R = radiusOf(view, camera);
      const { e, n, f } = basisOf(camera);
      const haloWidth = glowHex ? R * 0.06 : 0;
      g.viewport(0, 0, W, H);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);

      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      g.useProgram(halo);
      const u = (name: string) => g.getUniformLocation(halo, name);
      g.uniform2f(u('uView'), W, H);
      g.uniform1f(u('uR'), R);
      g.uniform3f(u('uGlow'), glow[0], glow[1], glow[2]);
      g.uniform1f(u('uHalo'), haloWidth);
      g.bindBuffer(g.ARRAY_BUFFER, quad);
      const aPos = g.getAttribLocation(halo, 'aPos');
      g.enableVertexAttribArray(aPos);
      g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      g.disableVertexAttribArray(aPos);

      g.disable(g.BLEND);
      g.useProgram(cells);
      const h = (name: string) => g.getUniformLocation(cells, name);
      g.uniform3f(h('uE'), e[0], e[1], e[2]);
      g.uniform3f(h('uN'), n[0], n[1], n[2]);
      g.uniform3f(h('uF'), f[0], f[1], f[2]);
      g.uniform2f(h('uScale'), (2 * R) / W, (2 * R) / H);
      g.uniform3f(h('uLight'), LIGHT[0], LIGHT[1], LIGHT[2]);
      g.uniform3f(h('uGlow'), glow[0], glow[1], glow[2]);
      g.uniform1f(h('uHalo'), haloWidth);
      // Etwa drei Mustereinheiten je Feld: ein Feld ist rund 1,26 / n breit.
      g.uniform1f(h('uK'), (3 * globe.grid.n) / 1.26);
      g.uniform1f(h('uGrid'), showGrid ? 1 : 0);
      g.bindBuffer(g.ARRAY_BUFFER, mesh.buffer);
      const attribs = [
        [g.getAttribLocation(cells, 'aPos'), 3, 0],
        [g.getAttribLocation(cells, 'aCol'), 3, 3],
        [g.getAttribLocation(cells, 'aEdge'), 1, 6],
        [g.getAttribLocation(cells, 'aKind'), 1, 7],
      ] as const;
      for (const [loc, size, offset] of attribs) {
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, size, g.FLOAT, false, STRIDE * 4, offset * 4);
      }
      g.drawArrays(g.TRIANGLES, 0, mesh.vertices);
      for (const [loc] of attribs) g.disableVertexAttribArray(loc);
    },
  };
}
