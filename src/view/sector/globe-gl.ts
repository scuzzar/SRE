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

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x), mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  return (0.5 * noise(p) + 0.25 * noise(p * 2.03 + 7.1) + 0.125 * noise(p * 4.01 + 3.7)) / 0.875;
}
// Ein dünner Strich, wo v die Null kreuzt, w Pixel breit.
float stroke(float v, float w) {
  float fw = fwidth(v);
  return 1.0 - smoothstep(fw * w * 0.5, fw * (w * 0.5 + 1.0), abs(v));
}

void main() {
  if (vView.z < 0.0) discard;
  vec3 normal = normalize(vView);
  // Musterraum: etwa drei Einheiten je Feld; px ist ein Bildpunkt in diesen Einheiten.
  vec3 q = normalize(vPos) * uK;
  float px = length(fwidth(q));
  float coarse = 1.0 - smoothstep(0.12, 0.5, px);
  float fine = 1.0 - smoothstep(0.03, 0.15, px);
  int k = int(vKind + 0.5);
  vec3 col = vCol;
  float n1 = fbm(q * 0.8);
  if (k == 0) {
    // Wasser: weiche Schlieren, Schaumkronen nur ganz nah.
    col *= 0.93 + 0.14 * n1 * coarse;
    col = mix(col, col * 1.35, smoothstep(0.78, 0.86, noise(q * vec3(5.0, 5.0, 2.0))) * fine * 0.35);
  } else if (k == 1 || k == 2) {
    // Eis: Schollen mit feinen Rissen.
    col *= 0.95 + 0.08 * n1 * coarse;
    col = mix(col, col * 0.78, stroke(noise(q * 1.6) - 0.5, 1.0) * coarse * 0.8);
  } else if (k == 3) {
    // Tundra: Flechten und Moos in Flecken.
    col = mix(col, col * vec3(0.92, 0.95, 0.78), smoothstep(0.5, 0.7, noise(q * 2.5)) * coarse);
    col *= 0.9 + 0.18 * noise(q * 9.0) * fine;
  } else if (k == 4) {
    // Gebirge: Grate heller, Täler dunkler, auf den höchsten Graten ein Hauch Schnee.
    float ridge = 1.0 - abs(2.0 * fbm(q * 0.9) - 1.0);
    col *= 0.86 + 0.28 * mix(0.5, ridge, coarse);
    col = mix(col, vec3(0.86, 0.87, 0.9), smoothstep(0.93, 0.99, ridge) * coarse * 0.5);
  } else if (k == 5) {
    // Zerklüftet: Felsbrocken und Schatten.
    float rock = fbm(q * 1.7);
    col *= 0.8 + 0.4 * rock * coarse + 0.2 * (1.0 - coarse);
    col *= 0.92 + 0.16 * noise(q * 8.0) * fine;
  } else if (k == 6) {
    // Wüste: geschwungene Dünen.
    float dune = sin((q.x * 0.8 + q.y * 0.5 + q.z * 0.3 + n1 * 5.0) * 3.0);
    col *= 1.0 + 0.09 * dune * coarse;
    col *= 0.95 + 0.1 * noise(q * 10.0) * fine;
  } else if (k == 7 || k == 9) {
    // Dschungel und Wald: Baumkronen, im Dschungel dicht, im offenen Land mit Lichtungen.
    float trees = smoothstep(0.42, 0.62, noise(q * 4.0)) * (k == 7 ? 1.0 : smoothstep(0.4, 0.6, n1));
    col = mix(col * (k == 7 ? 1.0 : 1.12), col * 0.62, trees * fine * (k == 7 ? 0.9 : 0.7) + (k == 7 ? 0.25 : 0.1) * (1.0 - fine));
    col *= 0.94 + 0.12 * n1 * coarse;
  } else if (k == 8) {
    // Sumpf: grün mit dunklen Wasserlöchern.
    float pool = smoothstep(0.56, 0.62, fbm(q * 1.4));
    col = mix(col, vec3(0.1, 0.19, 0.2), pool * coarse * 0.8);
    col *= 0.92 + 0.16 * noise(q * 7.0) * fine;
  } else if (k == 10) {
    // Besiedelt: Kulturland in Feldern verschiedener Tönung.
    vec3 g = q * 1.3 + 0.3 * vec3(noise(q * 0.7), noise(q * 0.7 + 5.0), noise(q * 0.7 + 9.0));
    float tint = hash(floor(g));
    col *= 0.95 + 0.1 * mix(0.5, tint, coarse);
  } else if (k == 11) {
    // Stadt: Häuserblöcke.
    vec3 g = q * 2.5;
    col *= 0.85 + 0.3 * hash(floor(g)) * fine + 0.15 * (1.0 - fine);
    vec3 e = 0.5 - abs(fract(g) - 0.5);
    col = mix(col, col * 0.6, (1.0 - smoothstep(0.0, 0.08, min(min(e.x, e.y), e.z))) * fine * 0.7);
  } else {
    // Offen ohne Leben: Geröll und Staub.
    col *= 0.86 + 0.24 * n1 * coarse + 0.12 * (1.0 - coarse);
    col *= 0.93 + 0.14 * noise(q * 9.0) * fine;
  }
  col *= 0.45 + 0.6 * clamp(dot(normal, uLight), 0.0, 1.0);
  if (uHalo > 0.0) col = mix(col, uGlow, pow(1.0 - normal.z, 2.6) * 0.75);
  if (uGrid > 0.5) {
    float w = fwidth(vEdge);
    col = mix(col, col * 0.35, (1.0 - smoothstep(0.0, w * 1.1, vEdge)) * 0.85);
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
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return undefined;
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
