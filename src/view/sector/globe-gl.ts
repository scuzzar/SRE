import type { GlobeView } from '../../controller';
import { ATMOSPHERE_GLOW, basisOf, LIGHT, radiusOf, rgbOf, textureOf, type Camera, type Viewport } from './globe-render';

// Reine Darstellung: der Globus mit WebGL. Die Grafikkarte rechnet jedes Bild in voller Auflösung,
// auch beim Ziehen. Ohne Gitter liegt die Textur aus `globe-render.ts` auf der Kugel; mit Gitter ist
// jedes Feld ein echtes Sechseck (an den 12 Ecken ein Fünfeck) in seiner Farbe, mit scharfem Rand.

const QUAD_VS = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Kugel mit Textur (oder nur der Grund unter der Hexkarte), Licht, Atmosphäre am Rand und Leuchten außen. */
const SPHERE_FS = `
precision highp float;
uniform vec2 uView;
uniform float uR;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uF;
uniform vec3 uLight;
uniform vec3 uGlow;
uniform float uHalo;
uniform sampler2D uTex;
const float PI = 3.14159265358979;
void main() {
  float sx = (gl_FragCoord.x - uView.x * 0.5) / uR;
  float sy = (uView.y * 0.5 - gl_FragCoord.y) / uR;
  float d2 = sx * sx + sy * sy;
  if (d2 > 1.0) {
    float dist = (sqrt(d2) - 1.0) * uR;
    if (uHalo > 0.0 && dist < uHalo) {
      float a = pow(1.0 - dist / uHalo, 2.2) * 0.7;
      gl_FragColor = vec4(uGlow * a, a);
      return;
    }
    gl_FragColor = vec4(0.0);
    return;
  }
  float sz = sqrt(1.0 - d2);
  vec3 b = sx * uE - sy * uN + sz * uF;
  float lat = asin(clamp(b.z, -1.0, 1.0));
  float lon = atan(b.y, b.x);
  vec2 uv = vec2((lon + PI) / (2.0 * PI), 0.5 - lat / PI);
  vec3 col = texture2D(uTex, uv).rgb;
  float lit = dot(vec3(sx, -sy, sz), uLight);
  col *= 0.45 + 0.6 * clamp(lit, 0.0, 1.0);
  if (uHalo > 0.0) col = mix(col, uGlow, pow(1.0 - sz, 2.6) * 0.75);
  float a = clamp((1.0 - sqrt(d2)) * uR, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}
`;

const HEX_VS = `
attribute vec3 aPos;
attribute vec3 aCol;
attribute float aEdge;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uF;
uniform vec2 uScale;
varying vec3 vCol;
varying float vEdge;
varying vec3 vView;
void main() {
  vec3 v = vec3(dot(aPos, uE), dot(aPos, uN), dot(aPos, uF));
  vView = v;
  vCol = aCol;
  vEdge = aEdge;
  gl_Position = vec4(v.x * uScale.x, v.y * uScale.y, 0.0, 1.0);
}
`;

const HEX_FS = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec3 uLight;
uniform vec3 uGlow;
uniform float uHalo;
varying vec3 vCol;
varying float vEdge;
varying vec3 vView;
void main() {
  if (vView.z < 0.0) discard;
  vec3 normal = normalize(vView);
  vec3 col = vCol * (0.45 + 0.6 * clamp(dot(normal, uLight), 0.0, 1.0));
  if (uHalo > 0.0) col = mix(col, uGlow, pow(1.0 - normal.z, 2.6) * 0.75);
  float w = fwidth(vEdge);
  float line = 1.0 - smoothstep(0.0, w * 1.1, vEdge);
  col = mix(col, col * 0.35, line * 0.85);
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

/**
 * Die Felder als Dreiecke: je Feld ein Fächer von der Mitte zu den Ecken. Eine Ecke liegt zwischen
 * dem Feld und zwei aufeinanderfolgenden Nachbarn. Je Ecke: Lage (3), Farbe (3), Abstand zum Rand
 * (1 in der Mitte, 0 am Rand).
 */
export function hexMesh(globe: GlobeView): Float32Array {
  const { grid } = globe;
  const colors = textureOf(globe).cellColor;
  const p = grid.xyz;
  let count = 0;
  for (let c = 0; c < grid.cells; c++) count += grid.neighbors[c]!.length;
  const out = new Float32Array(count * 3 * 7);
  let o = 0;
  const push = (x: number, y: number, z: number, c: number, edge: number) => {
    out[o++] = x;
    out[o++] = y;
    out[o++] = z;
    out[o++] = colors[c * 3]!;
    out[o++] = colors[c * 3 + 1]!;
    out[o++] = colors[c * 3 + 2]!;
    out[o++] = edge;
  };
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
    const around = [...grid.neighbors[c]!].sort((a, b) => angle(a) - angle(b));
    function angle(q: number): number {
      const dx = p[q * 3]! - cx;
      const dy = p[q * 3 + 1]! - cy;
      const dz = p[q * 3 + 2]! - cz;
      return Math.atan2(dx * vx + dy * vy + dz * vz, dx * ux + dy * uy + dz * uz);
    }
    const corners = around.map((q, i) => {
      const r = around[(i + 1) % around.length]!;
      const x = cx + p[q * 3]! + p[r * 3]!;
      const y = cy + p[q * 3 + 1]! + p[r * 3 + 1]!;
      const z = cz + p[q * 3 + 2]! + p[r * 3 + 2]!;
      const l = Math.hypot(x, y, z);
      return [x / l, y / l, z / l] as const;
    });
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % corners.length]!;
      push(cx, cy, cz, c, 1);
      push(a[0], a[1], a[2], c, 0);
      push(b[0], b[1], b[2], c, 0);
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
  const derivatives = gl.getExtension('OES_standard_derivatives');
  const sphere = compile(gl, QUAD_VS, SPHERE_FS);
  const hex = derivatives ? compile(gl, HEX_VS, HEX_FS) : undefined;
  if (!sphere) return undefined;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  // Textur und Netz gehören zu einer Karte; wird sie neu gewürfelt, entstehen sie neu.
  let shown: object | undefined;
  // Das Netz der Felder entsteht erst, wenn das Gitter zum ersten Mal gezeigt wird.
  let mesh: { buffer: WebGLBuffer | null; vertices: number } | undefined;
  const load = (globe: GlobeView) => {
    const g = gl!;
    const tex = textureOf(globe);
    g.bindTexture(g.TEXTURE_2D, texture);
    g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
    g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, tex.width, tex.height, 0, g.RGBA, g.UNSIGNED_BYTE, new Uint8Array(tex.color.buffer, tex.color.byteOffset, tex.color.byteLength));
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    if (mesh) g.deleteBuffer(mesh.buffer);
    mesh = undefined;
    shown = globe.map;
  };

  return {
    draw(globe, camera, view, showGrid) {
      const g = gl!;
      if (shown !== globe.map) load(globe);
      const glowHex = ATMOSPHERE_GLOW[globe.look.atmosphere ?? 0];
      const glow = glowHex ? rgbOf(glowHex) : ([0, 0, 0] as const);
      const W = view.width;
      const H = view.height;
      g.viewport(0, 0, W, H);
      g.clearColor(0, 0, 0, 0);
      g.clear(g.COLOR_BUFFER_BIT);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      const R = radiusOf(view, camera);
      const { e, n, f } = basisOf(camera);
      const halo = glowHex ? R * 0.06 : 0;

      g.useProgram(sphere);
      const u = (name: string) => g.getUniformLocation(sphere, name);
      g.uniform2f(u('uView'), W, H);
      g.uniform1f(u('uR'), R);
      g.uniform3f(u('uE'), e[0], e[1], e[2]);
      g.uniform3f(u('uN'), n[0], n[1], n[2]);
      g.uniform3f(u('uF'), f[0], f[1], f[2]);
      g.uniform3f(u('uLight'), LIGHT[0], LIGHT[1], LIGHT[2]);
      g.uniform3f(u('uGlow'), glow[0], glow[1], glow[2]);
      g.uniform1f(u('uHalo'), halo);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, texture);
      g.uniform1i(u('uTex'), 0);
      g.bindBuffer(g.ARRAY_BUFFER, quad);
      const aPos = g.getAttribLocation(sphere, 'aPos');
      g.enableVertexAttribArray(aPos);
      g.vertexAttribPointer(aPos, 2, g.FLOAT, false, 0, 0);
      g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
      g.disableVertexAttribArray(aPos);

      if (!showGrid || !hex) return;
      if (!mesh) {
        const data = hexMesh(globe);
        const buffer = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, buffer);
        g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
        mesh = { buffer, vertices: data.length / 7 };
      }
      g.disable(g.BLEND);
      g.useProgram(hex);
      const h = (name: string) => g.getUniformLocation(hex, name);
      g.uniform3f(h('uE'), e[0], e[1], e[2]);
      g.uniform3f(h('uN'), n[0], n[1], n[2]);
      g.uniform3f(h('uF'), f[0], f[1], f[2]);
      g.uniform2f(h('uScale'), (2 * R) / W, (2 * R) / H);
      g.uniform3f(h('uLight'), LIGHT[0], LIGHT[1], LIGHT[2]);
      g.uniform3f(h('uGlow'), glow[0], glow[1], glow[2]);
      g.uniform1f(h('uHalo'), halo);
      g.bindBuffer(g.ARRAY_BUFFER, mesh.buffer);
      const attribs = [
        [g.getAttribLocation(hex, 'aPos'), 3, 0],
        [g.getAttribLocation(hex, 'aCol'), 3, 3],
        [g.getAttribLocation(hex, 'aEdge'), 1, 6],
      ] as const;
      for (const [loc, size, offset] of attribs) {
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, size, g.FLOAT, false, 28, offset * 4);
      }
      g.drawArrays(g.TRIANGLES, 0, mesh.vertices);
      for (const [loc] of attribs) g.disableVertexAttribArray(loc);
    },
  };
}
