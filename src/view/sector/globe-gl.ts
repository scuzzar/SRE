import type { GlobeView } from '../../controller';
import { ATMOSPHERE_GLOW, basisOf, CELL_KINDS, cellLook, LIGHT, radiusOf, rgbOf, type Camera, type Viewport } from './globe-render';

// Reine Darstellung: der Globus mit WebGL 2, so sparsam, dass er auch auf dem Handy flüssig bleibt.
//
// 1. Muster backen: Beim Start rechnet die Grafikkarte je Geländeart einmal ein kachelbares Muster
//    (fraktales Rauschen, Zellen, Grate) in eine Lage eines Texturstapels, mit Mipmaps. Danach kostet
//    ein Muster nur noch Texturzugriffe, und die Mipmaps glätten es von selbst, wenn man herauszoomt.
// 2. Felder mit Übergängen: Gezeichnet werden die Dreiecke zwischen je drei Feldmitten. Jeder Bildpunkt
//    kennt so seine drei nächsten Felder und ihren Anteil; nahe am Rand zwischen zwei Feldern mischen
//    sich Farbe und Muster, mit Rauschen ausgefranst. Das Hexgitter sind die genauen Feldränder.
// 3. Licht: Die Höhe im Alphakanal des Musters gibt Schatten (Hänge zum Licht links oben hell).

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

const BAKE_VS = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/** Lage des Rauschens, das Übergänge ausfranst und große Flächen belebt (nach den Geländearten). */
const NOISE_LAYER = CELL_KINDS.length;
const BAKE_SIZE = 512;

/**
 * Das Muster einer Lage, kachelbar (alles mit ganzzahligen Perioden). RGB ist ein Faktor auf die
 * Grundfarbe des Feldes, halbiert gespeichert (0,5 = unverändert), A die Höhe für Licht und Schatten.
 * Die Arten wie CELL_KINDS: 0 Wasser, 1 Eis auf Wasser, 2 Eis auf Land, 3 Tundra, 4 Gebirge,
 * 5 Zerklüftet, 6 Wüste, 7 Dschungel, 8 Sumpf, 9 Offen/Wald, 10 Besiedelt, 11 Stadt, 12 Öde; 13 Rauschen.
 */
const BAKE_FS = `#version 300 es
precision highp float;
uniform int uLayer;
uniform float uSize;
out vec4 outColor;

float hsh(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hsh2(vec2 p) {
  return vec2(hsh(p), hsh(p + 71.3));
}
float vnoise(vec2 p, float per) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hsh(mod(i, per));
  float b = hsh(mod(i + vec2(1.0, 0.0), per));
  float c = hsh(mod(i + vec2(0.0, 1.0), per));
  float d = hsh(mod(i + vec2(1.0, 1.0), per));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// Fraktales Rauschen über die Kachel t (0 bis 1), Grundfrequenz f, kachelbar.
float fbm(vec2 t, float f, int octaves, float seed) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    sum += amp * vnoise(t * f + vec2(seed * 13.0 + float(i) * 7.0, seed * 29.0 + float(i) * 3.0), f);
    norm += amp;
    f *= 2.0;
    amp *= 0.5;
  }
  return sum / norm;
}
float ridged(vec2 t, float f, int octaves, float seed) {
  float sum = 0.0;
  float amp = 0.5;
  float norm = 0.0;
  float weight = 1.0;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    float r = 1.0 - abs(2.0 * vnoise(t * f + vec2(seed * 11.0 + float(i) * 5.0, float(i) * 9.0), f) - 1.0);
    r = r * r * weight;
    weight = clamp(r * 1.6, 0.0, 1.0);
    sum += amp * r;
    norm += amp;
    f *= 2.0;
    amp *= 0.5;
  }
  return sum / norm;
}
// Zellen: Abstand zum nächsten und zweitnächsten Punkt und eine Kennung der Zelle, kachelbar.
vec3 cells(vec2 t, float f, float seed) {
  vec2 p = t * f;
  vec2 i = floor(p);
  vec2 fr = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  float id = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = hsh2(mod(i + o, f) + seed * 17.0);
      vec2 r = o + h - fr;
      float d = dot(r, r);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = hsh(mod(i + o, f) + seed * 31.0);
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return vec3(sqrt(d1), sqrt(d2), id);
}
// Verzerrte Koordinaten für organische Formen (Verschiebung kachelbar).
vec2 warp(vec2 t, float f, float amount) {
  return t + amount * (vec2(fbm(t, f, 4, 3.0), fbm(t, f, 4, 8.0)) - 0.5);
}

void main() {
  vec2 t = gl_FragCoord.xy / uSize;
  vec3 fac = vec3(1.0);
  float h = 0.5;
  int k = uLayer;
  if (k == 13) {
    // Vier unabhängige Rauschfelder für die Übergänge und große Flächen.
    outColor = vec4(fbm(t, 4.0, 5, 1.0), fbm(t, 4.0, 5, 2.0), fbm(t, 4.0, 5, 3.0), fbm(t, 4.0, 5, 4.0));
    return;
  }
  vec2 w = warp(t, 4.0, 0.25);
  if (k == 0) {
    float current = fbm(w, 4.0, 6, 1.0);
    float waves = fbm(t + current * 0.1, 32.0, 3, 2.0);
    fac = vec3(0.86 + 0.28 * current + 0.12 * smoothstep(0.7, 0.8, waves));
    h = current * 0.3 + waves * 0.1;
  } else if (k == 1 || k == 2) {
    vec3 c = cells(w, 8.0, 1.0);
    float crack = 1.0 - smoothstep(0.03, 0.07, c.y - c.x);
    fac = vec3(0.93 + 0.1 * c.z) * (0.95 + 0.1 * fbm(t, 16.0, 4, 2.0));
    fac = mix(fac, vec3(0.7, 0.78, 0.88), crack * 0.75);
    h = (c.y - c.x) * 0.8 + fbm(t, 16.0, 4, 3.0) * 0.2;
  } else if (k == 3) {
    vec3 c = cells(t, 16.0, 2.0);
    float border = 1.0 - smoothstep(0.04, 0.09, c.y - c.x);
    float lichen = smoothstep(0.5, 0.62, fbm(w, 8.0, 6, 4.0));
    fac = mix(vec3(1.0), vec3(0.95, 0.98, 0.75), lichen * 0.6) * (0.9 + 0.2 * fbm(t, 32.0, 4, 5.0));
    fac *= 1.0 - border * 0.25;
    h = (c.y - c.x) * 0.3 + lichen * 0.1;
  } else if (k == 4) {
    h = ridged(w, 4.0, 7, 1.0);
    fac = vec3(mix(0.78, 1.18, h));
    float snow = smoothstep(0.7, 0.8, h + 0.1 * fbm(t, 32.0, 3, 2.0));
    fac = mix(fac, vec3(1.9, 1.95, 2.0), snow * 0.7);
  } else if (k == 5) {
    vec3 c = cells(t, 32.0, 3.0);
    h = fbm(w, 4.0, 7, 2.0) * 0.7 + ridged(t, 8.0, 5, 3.0) * 0.3;
    fac = vec3(mix(0.82, 1.15, h)) * (0.88 + 0.2 * smoothstep(0.3, 0.45, c.x));
  } else if (k == 6) {
    float s = (w.x * 3.0 + w.y * 2.0) * 2.0 + fbm(t, 4.0, 4, 6.0) * 2.0;
    float dune = abs(fract(s) - 0.35);
    float ripple = sin((t.x * 64.0 + t.y * 32.0 + fbm(t, 16.0, 3, 7.0) * 4.0) * 6.2831853) * 0.5 + 0.5;
    h = (1.0 - smoothstep(0.0, 0.65, dune)) * 0.85 + ripple * 0.06;
    fac = vec3(mix(0.9, 1.1, fbm(w, 4.0, 5, 8.0)));
  } else if (k == 7 || k == 9) {
    bool jungle = k == 7;
    float density = jungle ? 0.9 : smoothstep(0.38, 0.62, fbm(w, 4.0, 6, 9.0));
    vec3 c = cells(t, jungle ? 40.0 : 32.0, 4.0);
    float crown = 1.0 - smoothstep(0.0, 0.75, c.x);
    float tree = step(c.z, density);
    vec3 meadow = vec3(1.2, 1.18, 0.95) * (0.9 + 0.2 * fbm(t, 16.0, 5, 10.0));
    vec3 canopy = vec3(0.75 + 0.35 * crown) * (0.88 + 0.24 * c.z);
    fac = mix(meadow * 0.85, canopy, tree);
    h = tree * crown * 0.5;
  } else if (k == 8) {
    float m = fbm(w, 8.0, 7, 11.0);
    float pool = smoothstep(0.55, 0.57, m);
    float shore = smoothstep(0.5, 0.55, m) - pool;
    fac = vec3(0.85 + 0.3 * fbm(t, 32.0, 4, 12.0));
    fac = mix(fac, vec3(0.8, 0.95, 0.6), shore * 0.6);
    fac = mix(fac, vec3(0.3, 0.46, 0.76), pool * 0.85);
    h = (1.0 - pool) * 0.2;
  } else if (k == 10) {
    vec3 c = cells(warp(t, 4.0, 0.08), 12.0, 5.0);
    vec3 tone = c.z < 0.35 ? vec3(1.0, 1.02, 0.9) : c.z < 0.65 ? vec3(1.12, 1.06, 0.82) : c.z < 0.85 ? vec3(0.9, 0.98, 0.86) : vec3(1.02, 0.92, 0.78);
    float a = floor(c.z * 4.0) * 0.785;
    float furrow = sin(dot(t, vec2(cos(a), sin(a))) * 400.0) * 0.5 + 0.5;
    float hedge = 1.0 - smoothstep(0.02, 0.05, c.y - c.x);
    fac = tone * (1.0 - 0.05 * furrow) * (1.0 - hedge * 0.3);
    h = hedge * 0.15 + furrow * 0.02;
  } else if (k == 11) {
    vec2 g = warp(t, 4.0, 0.04) * 24.0;
    vec2 cell = floor(g);
    float roof = hsh(mod(cell, 24.0));
    vec2 e = 0.5 - abs(fract(g) - 0.5);
    float street = 1.0 - smoothstep(0.06, 0.1, min(e.x, e.y));
    fac = vec3(0.8 + 0.35 * roof);
    if (roof > 0.9) fac = vec3(0.55, 0.8, 0.5);
    fac = mix(fac, vec3(0.55), street * 0.8);
    h = (1.0 - street) * (0.3 + 0.3 * roof);
  } else {
    h = fbm(w, 4.0, 7, 13.0);
    vec3 c = cells(t, 16.0, 6.0);
    float crater = smoothstep(0.25, 0.15, c.x) * step(0.8, c.z);
    fac = vec3(mix(0.85, 1.12, h));
    h -= crater * 0.3;
  }
  outColor = vec4(clamp(fac * 0.5, 0.0, 1.0), clamp(h, 0.0, 1.0));
}
`;

const CELL_VS = `#version 300 es
in vec3 aPos;
in vec3 aBary;
in vec3 aKinds;
in vec3 aChan;
in vec3 aCol0;
in vec3 aCol1;
in vec3 aCol2;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uF;
uniform vec2 uScale;
out vec3 vPos;
out vec3 vView;
out vec3 vBary;
out vec3 vKinds;
out vec3 vChan;
out vec3 vCol0;
out vec3 vCol1;
out vec3 vCol2;
void main() {
  vec3 v = vec3(dot(aPos, uE), dot(aPos, uN), dot(aPos, uF));
  vView = v;
  vPos = aPos;
  vBary = aBary;
  vKinds = aKinds;
  vChan = aChan;
  vCol0 = aCol0;
  vCol1 = aCol1;
  vCol2 = aCol2;
  gl_Position = vec4(v.x * uScale.x, v.y * uScale.y, 0.0, 1.0);
}
`;

const CELL_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;
uniform sampler2DArray uTex;
uniform vec3 uLight;
uniform vec3 uGlow;
uniform float uHalo;
uniform float uK;
uniform float uGrid;
in vec3 vPos;
in vec3 vView;
in vec3 vBary;
in vec3 vKinds;
in vec3 vChan;
in vec3 vCol0;
in vec3 vCol1;
in vec3 vCol2;
out vec4 outColor;

vec3 TW;
vec2 UV0, UV1, UV2, DX0, DY0, DX1, DY1, DX2, DY2;

// Ein Muster auf der Kugel: aus drei Richtungen projiziert, nach der Lage der Fläche gemischt.
// Meist trägt nur eine Richtung, die anderen werden übersprungen.
vec4 sampleLayer(float layer, float scale) {
  vec4 s = vec4(0.0);
  if (TW.x > 0.0) s += TW.x * textureGrad(uTex, vec3(UV0 * scale, layer), DX0 * scale, DY0 * scale);
  if (TW.y > 0.0) s += TW.y * textureGrad(uTex, vec3(UV1 * scale, layer), DX1 * scale, DY1 * scale);
  if (TW.z > 0.0) s += TW.z * textureGrad(uTex, vec3(UV2 * scale, layer), DX2 * scale, DY2 * scale);
  return s;
}
float channel(vec4 n, float c) {
  return c < 0.5 ? n.r : c < 1.5 ? n.g : c < 2.5 ? n.b : n.a;
}

void main() {
  if (vView.z < 0.0) discard;
  vec3 normal = normalize(vView);
  vec3 nrm = normalize(vPos);
  // Musterraum: eine Kachel auf etwa zwei Felder.
  vec3 q = nrm * uK;
  vec3 tw = pow(abs(nrm), vec3(6.0));
  tw /= tw.x + tw.y + tw.z;
  tw *= step(0.04, tw);
  TW = tw / (tw.x + tw.y + tw.z);
  UV0 = q.yz; UV1 = q.xz; UV2 = q.xy;
  DX0 = dFdx(UV0); DY0 = dFdy(UV0);
  DX1 = dFdx(UV1); DY1 = dFdy(UV1);
  DX2 = dFdx(UV2); DY2 = dFdy(UV2);

  // Übergänge: Der Anteil jedes der drei Felder, am Rand mit Rauschen verschoben und dann geschärft.
  vec4 n = sampleLayer(${NOISE_LAYER}.0, 0.5);
  vec3 jitter = vec3(channel(n, vChan.x), channel(n, vChan.y), channel(n, vChan.z)) - 0.5;
  vec4 fineNoise = sampleLayer(${NOISE_LAYER}.0, 2.0);
  vec3 fineJitter = vec3(channel(fineNoise, vChan.x), channel(fineNoise, vChan.y), channel(fineNoise, vChan.z)) - 0.5;
  vec3 b = vBary + 0.55 * jitter + 0.22 * fineJitter;
  // Scharf, aber nie feiner als ein Bildpunkt: Je weiter weg, desto weicher.
  float sharp = clamp(0.6 / max(length(fwidth(vBary)), 1e-4), 8.0, 60.0);
  vec3 wb = exp((b - max(b.x, max(b.y, b.z))) * sharp);
  wb /= wb.x + wb.y + wb.z;
  vec3 base = vCol0 * wb.x + vCol1 * wb.y + vCol2 * wb.z;

  // Gleiche Arten teilen sich ein Muster; jedes Muster nur, wenn es merklich beiträgt.
  vec3 k = floor(vKinds + 0.5);
  vec3 wk = wb;
  if (k.y == k.x) { wk.x += wk.y; wk.y = 0.0; }
  if (k.z == k.x) { wk.x += wk.z; wk.z = 0.0; } else if (k.z == k.y) { wk.y += wk.z; wk.z = 0.0; }
  wk *= step(0.02, wk);
  wk /= max(wk.x + wk.y + wk.z, 1e-6);
  vec4 d = vec4(0.0);
  if (wk.x > 0.0) d += wk.x * sampleLayer(k.x, 1.0);
  if (wk.y > 0.0) d += wk.y * sampleLayer(k.y, 1.0);
  if (wk.z > 0.0) d += wk.z * sampleLayer(k.z, 1.0);

  vec3 col = base * d.rgb * 2.0 * (0.9 + 0.2 * n.a);
  // Licht und Schatten aus der Höhe des Musters.
  vec2 g = vec2(dFdx(d.a), dFdy(d.a)) / max(length(fwidth(q)), 1e-5);
  col *= clamp(1.0 + dot(g, vec2(0.55, -0.5)) * 0.035, 0.6, 1.4);
  col *= 0.45 + 0.6 * clamp(dot(normal, uLight), 0.0, 1.0);
  if (uHalo > 0.0) col = mix(col, uGlow, pow(1.0 - normal.z, 2.6) * 0.75);
  if (uGrid > 0.5) {
    // Der genaue Feldrand: wo die zwei größten Anteile gleich sind.
    vec3 s = vBary;
    float hi = max(s.x, max(s.y, s.z));
    float mid = s.x + s.y + s.z - hi - min(s.x, min(s.y, s.z));
    float edge = hi - mid;
    col = mix(col, col * 0.35, (1.0 - smoothstep(0.0, fwidth(edge) * 1.2, edge)) * 0.85);
  }
  outColor = vec4(col, 1.0);
}
`;

/** Wie weit ein Band über seine Breite hinausreicht: Ufer bzw. Seitenstreifen. */
const BANK = 2.0;

const LINE_VS = `#version 300 es
in vec3 aP;
in vec3 aS;
in float aSide;
in float aHalfW;
in float aAlong;
in float aKind;
in float aFlow;
uniform vec3 uE;
uniform vec3 uN;
uniform vec3 uF;
uniform vec2 uScale;
uniform float uR;
out vec3 vView;
out float vAcross;
out float vAlong;
out float vKind;
out float vFlow;
out float vWidthPx;
void main() {
  // Nie schmaler als ein, zwei Bildpunkte, damit Flüsse und Straßen auch von weit weg zu sehen sind.
  float px = 1.0 / uR;
  float hw = max(aHalfW, (aKind < 0.5 ? 0.9 : 0.7) * px);
  vec3 p = aP + aS * aSide * hw * ${BANK.toFixed(1)};
  vec3 v = vec3(dot(p, uE), dot(p, uN), dot(p, uF));
  vView = v;
  vAcross = aSide * ${BANK.toFixed(1)};
  vAlong = aAlong;
  vKind = aKind;
  vFlow = aFlow;
  vWidthPx = hw / px;
  gl_Position = vec4(v.x * uScale.x, v.y * uScale.y, 0.0, 1.0);
}
`;

const LINE_FS = `#version 300 es
precision highp float;
uniform vec3 uLight;
in vec3 vView;
in float vAcross;
in float vAlong;
in float vKind;
in float vFlow;
in float vWidthPx;
out vec4 outColor;

float wave(float x) {
  return sin(x) * 0.5 + sin(x * 2.3 + 1.7) * 0.3 + sin(x * 5.1 + 0.4) * 0.2;
}

void main() {
  if (vView.z < 0.0) discard;
  float shade = 0.45 + 0.6 * clamp(dot(normalize(vView), uLight), 0.0, 1.0);
  float a = abs(vAcross);
  float aa = max(fwidth(vAcross), 0.02);
  // Wie viel Einzelheit die Breite trägt: dünne Linien schlicht, breite Bänder mit allem.
  float detail = smoothstep(1.5, 5.0, vWidthPx);
  float core = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, a);
  float outer = 1.0 - smoothstep(${BANK.toFixed(1)} - aa * 2.0, ${BANK.toFixed(1)}, a);
  vec3 col;
  float alpha;
  if (vKind < 0.5) {
    // Fluss: in der Mitte tief, am Rand flach; Strömung zieht Schlieren mit; nasses, dunkles Ufer.
    float depth = 1.0 - a;
    vec3 shallow = vec3(0.22, 0.45, 0.6);
    vec3 deep = mix(vec3(0.12, 0.32, 0.52), vec3(0.08, 0.24, 0.44), vFlow);
    vec3 water = mix(shallow, deep, smoothstep(0.0, 0.8, depth));
    float streak = wave(vAlong * 9.0 + vAcross * 2.5 + wave(vAlong * 2.0) * 2.0);
    water *= 1.0 + 0.08 * streak * detail;
    // Glanz auf der Lichtseite der Strömung.
    water += vec3(0.12, 0.14, 0.15) * smoothstep(0.55, 0.95, streak) * detail * (1.0 - a) * 0.6;
    float bankT = clamp((a - 1.0) / (${BANK.toFixed(1)} - 1.0), 0.0, 1.0);
    vec3 bank = mix(vec3(0.16, 0.15, 0.09), vec3(0.0), bankT);
    float bankA = (1.0 - bankT) * 0.5 * detail * outer;
    col = mix(bank * bankA, water, core);
    alpha = mix(bankA, 1.0, core);
    // An der Mündung geht der Fluss ins Meer über.
    float mouth = 1.0 - smoothstep(0.93, 1.0, vFlow);
    col *= mouth;
    alpha *= mouth;
  } else {
    // Straße: festgefahrener Belag, Fahrspuren, Rand etwas dunkler, daneben ein schmaler Schatten.
    vec3 dirt = vec3(0.5, 0.41, 0.3) * (0.95 + 0.08 * wave(vAlong * 23.0));
    float rut = smoothstep(0.12, 0.0, abs(a - 0.5)) * detail;
    float edge = smoothstep(0.65, 1.0, a);
    vec3 road = dirt * (1.0 - 0.15 * rut) * (1.0 - 0.25 * edge);
    float shoulderT = clamp((a - 1.0) / (${BANK.toFixed(1)} - 1.0), 0.0, 1.0);
    float shoulderA = (1.0 - shoulderT) * 0.3 * detail * outer;
    // Vormultipliert: der Seitenstreifen dunkelt nur ab, die Straße deckt fast ganz.
    alpha = mix(shoulderA, 0.92, core);
    col = road * 0.92 * core;
  }
  outColor = vec4(col * shade, alpha);
}
`;

/** Werte je Ecke eines Bandes: Mitte (3), Seite (3), links/rechts (1), halbe Breite (1), Weg (1), Art (1), Lauf (1). */
const LINE_STRIDE = 11;

function smallHash(i: number): number {
  return (Math.imul(i + 1, 2654435761) >>> 0) / 4294967296;
}

/**
 * Flüsse und Straßen als Bänder auf der Kugel: weich durch die Feldmitten (Catmull-Rom), dazwischen
 * leicht geschlängelt, je Feld zehn Stützpunkte. Flüsse werden von der Quelle zur Mündung breiter und
 * laufen am Ende ins Wasser hinein; Straßen bleiben gleich breit und treffen jede Feldmitte.
 */
export function lineMesh(globe: GlobeView): Float32Array {
  const { grid, map } = globe;
  const { forms } = cellLook(globe);
  const p = grid.xyz;
  const cellW = 1.26 / grid.n;
  const at = (c: number): [number, number, number] => [p[c * 3]!, p[c * 3 + 1]!, p[c * 3 + 2]!];
  const out: number[] = [];
  const band = (cells: readonly number[], kind: 0 | 1, seed: number) => {
    const points = cells.map(at);
    if (kind === 0) {
      // Die Mündung: ein Stück hinein ins nächste Wasserfeld.
      const last = cells[cells.length - 1]!;
      const sea = grid.neighbors[last]!.find((q) => forms[q] === 'water' || forms[q] === 'waterIce');
      if (sea !== undefined) {
        const a = at(last);
        const b = at(sea);
        points.push([a[0] + (b[0] - a[0]) * 0.6, a[1] + (b[1] - a[1]) * 0.6, a[2] + (b[2] - a[2]) * 0.6]);
      }
    }
    if (points.length < 2) return;
    const steps = 10;
    const samples: [number, number, number][] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]!;
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const p3 = points[Math.min(points.length - 1, i + 2)]!;
      // Schlängeln: senkrecht zur Richtung, an den Feldmitten null.
      const sign = (smallHash(seed * 131 + i) < 0.5 ? -1 : 1) * (0.5 + 0.5 * smallHash(seed * 71 + i));
      const amp = (kind === 0 ? 0.16 : 0.05) * cellW * sign;
      const dir = [p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]];
      for (let s = i === 0 ? 0 : 1; s <= steps; s++) {
        const t = s / steps;
        const t2 = t * t;
        const t3 = t2 * t;
        const cr = (j: number) => 0.5 * (2 * p1[j]! + (-p0[j]! + p2[j]!) * t + (2 * p0[j]! - 5 * p1[j]! + 4 * p2[j]! - p3[j]!) * t2 + (-p0[j]! + 3 * p1[j]! - 3 * p2[j]! + p3[j]!) * t3);
        let x = cr(0);
        let y = cr(1);
        let z = cr(2);
        const l = Math.hypot(x, y, z);
        x /= l;
        y /= l;
        z /= l;
        // Seite = Lage × Richtung.
        let sx = y * dir[2]! - z * dir[1]!;
        let sy = z * dir[0]! - x * dir[2]!;
        let sz = x * dir[1]! - y * dir[0]!;
        const sl = Math.hypot(sx, sy, sz) || 1;
        sx /= sl;
        sy /= sl;
        sz /= sl;
        const m = amp * (Math.sin(Math.PI * t) + (kind === 0 ? 0.35 * Math.sin(2 * Math.PI * t) : 0));
        samples.push([x + sx * m, y + sy * m, z + sz * m]);
      }
    }
    let along = 0;
    const n = samples.length;
    const vertex = (i: number, side: number) => {
      const c = samples[i]!;
      const prev = samples[Math.max(0, i - 1)]!;
      const next = samples[Math.min(n - 1, i + 1)]!;
      const tx = next[0] - prev[0];
      const ty = next[1] - prev[1];
      const tz = next[2] - prev[2];
      let sx = c[1] * tz - c[2] * ty;
      let sy = c[2] * tx - c[0] * tz;
      let sz = c[0] * ty - c[1] * tx;
      const sl = Math.hypot(sx, sy, sz) || 1;
      sx /= sl;
      sy /= sl;
      sz /= sl;
      const flow = i / (n - 1);
      // Flüsse laufen an der Quelle spitz aus und werden zur Mündung hin breiter.
      const halfW = kind === 0 ? cellW * (0.03 + 0.07 * flow) * Math.min(1, flow * 12) : cellW * 0.036;
      out.push(c[0], c[1], c[2], sx, sy, sz, side, halfW, along, kind, flow);
    };
    const alongAt: number[] = [0];
    for (let i = 1; i < n; i++) {
      const a = samples[i - 1]!;
      const b = samples[i]!;
      along += Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / cellW;
      alongAt.push(along);
    }
    for (let i = 0; i < n - 1; i++) {
      // Zwei Dreiecke je Stück; der Weg steht je Ecke.
      const quad: [number, number][] = [
        [i, -1],
        [i, 1],
        [i + 1, -1],
        [i, 1],
        [i + 1, 1],
        [i + 1, -1],
      ];
      for (const [j, side] of quad) {
        along = alongAt[j]!;
        vertex(j, side);
      }
    }
  };
  (map.rivers ?? []).forEach((river, i) => band(river, 0, i + 1));
  (map.roads ?? []).forEach((road, i) => band(road, 1, i + 1001));
  return new Float32Array(out);
}

/** Zeichnet den Globus einer Karte; `undefined`, wenn das Gerät kein WebGL 2 kann. */
export interface GlobeRenderer {
  draw(globe: GlobeView, camera: Camera, view: Viewport, showGrid: boolean): void;
}

function compile(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram | undefined {
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

/** Werte je Ecke: Lage (3), Anteil (3), Arten (3), Rauschkanäle (3), drei Farben (9). */
const STRIDE = 21;

/** Ein Rauschkanal je Feld (0–3), gestreut, damit Nachbarn meist verschieden ausfransen. */
function channelOf(cell: number): number {
  return (Math.imul(cell + 1, 2654435761) >>> 29) & 3;
}

/**
 * Die Dreiecke zwischen je drei benachbarten Feldmitten. Alle drei Ecken eines Dreiecks tragen
 * dieselben drei Felder (Art, Rauschkanal, Farbe); nur der Anteil ist je Ecke ein anderer.
 */
export function cellMesh(globe: GlobeView): Float32Array {
  const { grid } = globe;
  const { color, kind } = cellLook(globe);
  const p = grid.xyz;
  const triangles: [number, number, number][] = [];
  for (let c = 0; c < grid.cells; c++) {
    const cx = p[c * 3]!;
    const cy = p[c * 3 + 1]!;
    const cz = p[c * 3 + 2]!;
    let ux = -cy;
    let uy = cx;
    let uz = 0;
    if (Math.hypot(ux, uy) < 1e-6) [ux, uy, uz] = [1, 0, 0];
    const vx = cy * uz - cz * uy;
    const vy = cz * ux - cx * uz;
    const vz = cx * uy - cy * ux;
    const angle = (q: number) => {
      const dx = p[q * 3]! - cx;
      const dy = p[q * 3 + 1]! - cy;
      const dz = p[q * 3 + 2]! - cz;
      return Math.atan2(dx * vx + dy * vy + dz * vz, dx * ux + dy * uy + dz * uz);
    };
    const around = [...grid.neighbors[c]!].sort((a, b) => angle(a) - angle(b));
    for (let i = 0; i < around.length; i++) {
      const q = around[i]!;
      const r = around[(i + 1) % around.length]!;
      // Jedes Dreieck einmal: vom Feld mit der kleinsten Nummer aus.
      if (c < q && c < r) triangles.push([c, q, r]);
    }
  }
  const out = new Float32Array(triangles.length * 3 * STRIDE);
  let o = 0;
  for (const tri of triangles) {
    for (let v = 0; v < 3; v++) {
      const cell = tri[v]!;
      out[o++] = p[cell * 3]!;
      out[o++] = p[cell * 3 + 1]!;
      out[o++] = p[cell * 3 + 2]!;
      for (let j = 0; j < 3; j++) out[o++] = j === v ? 1 : 0;
      for (const c of tri) out[o++] = kind[c]!;
      for (const c of tri) out[o++] = channelOf(c);
      for (const c of tri) {
        out[o++] = color[c * 3]!;
        out[o++] = color[c * 3 + 1]!;
        out[o++] = color[c * 3 + 2]!;
      }
    }
  }
  return out;
}

export function createGlobeRenderer(canvas: HTMLCanvasElement): GlobeRenderer | undefined {
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: true, alpha: true });
  } catch {
    gl = null;
  }
  if (!gl) return undefined;
  const halo = compile(gl, QUAD_VS, HALO_FS);
  const bake = compile(gl, BAKE_VS, BAKE_FS);
  const cells = compile(gl, CELL_VS, CELL_FS);
  const lines = compile(gl, LINE_VS, LINE_FS);
  if (!halo || !bake || !cells || !lines) return undefined;

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  // Die Muster einmal backen: je Lage ein Durchgang in den Texturstapel, dann die Mipmaps.
  const layers = NOISE_LAYER + 1;
  const patterns = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, patterns);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, Math.log2(BAKE_SIZE) + 1, gl.RGBA8, BAKE_SIZE, BAKE_SIZE, layers);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, BAKE_SIZE, BAKE_SIZE);
  gl.disable(gl.BLEND);
  gl.useProgram(bake);
  gl.uniform1f(gl.getUniformLocation(bake, 'uSize'), BAKE_SIZE);
  const bakePos = gl.getAttribLocation(bake, 'aPos');
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.enableVertexAttribArray(bakePos);
  gl.vertexAttribPointer(bakePos, 2, gl.FLOAT, false, 0, 0);
  for (let layer = 0; layer < layers; layer++) {
    gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, patterns, 0, layer);
    gl.uniform1i(gl.getUniformLocation(bake, 'uLayer'), layer);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  gl.disableVertexAttribArray(bakePos);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(fbo);
  gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  if (aniso) gl.texParameterf(gl.TEXTURE_2D_ARRAY, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 4);

  // Das Netz gehört zu einer Karte; wird sie neu gewürfelt, entsteht es neu.
  let shown: object | undefined;
  let mesh: { buffer: WebGLBuffer | null; vertices: number } | undefined;
  let lineBuffer: { buffer: WebGLBuffer | null; vertices: number } | undefined;
  const lineAttribs = (
    [
      ['aP', 3, 0],
      ['aS', 3, 3],
      ['aSide', 1, 6],
      ['aHalfW', 1, 7],
      ['aAlong', 1, 8],
      ['aKind', 1, 9],
      ['aFlow', 1, 10],
    ] as const
  ).map(([name, size, offset]) => [gl!.getAttribLocation(lines, name), size, offset] as const);
  const attribs = (
    [
      ['aPos', 3, 0],
      ['aBary', 3, 3],
      ['aKinds', 3, 6],
      ['aChan', 3, 9],
      ['aCol0', 3, 12],
      ['aCol1', 3, 15],
      ['aCol2', 3, 18],
    ] as const
  ).map(([name, size, offset]) => [gl!.getAttribLocation(cells, name), size, offset] as const);

  return {
    draw(globe, camera, view, showGrid) {
      const g = gl!;
      if (shown !== globe.map || !mesh) {
        if (mesh) g.deleteBuffer(mesh.buffer);
        const data = cellMesh(globe);
        const buffer = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, buffer);
        g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
        mesh = { buffer, vertices: data.length / STRIDE };
        if (lineBuffer) g.deleteBuffer(lineBuffer.buffer);
        const lineData = lineMesh(globe);
        const lb = g.createBuffer();
        g.bindBuffer(g.ARRAY_BUFFER, lb);
        g.bufferData(g.ARRAY_BUFFER, lineData, g.STATIC_DRAW);
        lineBuffer = { buffer: lb, vertices: lineData.length / LINE_STRIDE };
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
      // Eine Kachel auf etwa zwei Felder: ein Feld ist rund 1,26 / n breit.
      g.uniform1f(h('uK'), globe.grid.n / 2.52);
      g.uniform1f(h('uGrid'), showGrid ? 1 : 0);
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D_ARRAY, patterns);
      g.uniform1i(h('uTex'), 0);
      g.bindBuffer(g.ARRAY_BUFFER, mesh.buffer);
      for (const [loc, size, offset] of attribs) {
        g.enableVertexAttribArray(loc);
        g.vertexAttribPointer(loc, size, g.FLOAT, false, STRIDE * 4, offset * 4);
      }
      g.drawArrays(g.TRIANGLES, 0, mesh.vertices);
      for (const [loc] of attribs) g.disableVertexAttribArray(loc);

      // Flüsse und Straßen über dem Gelände, im selben Licht; die Ufer und Seitenstreifen halb durchsichtig.
      if (lineBuffer && lineBuffer.vertices > 0) {
        g.enable(g.BLEND);
        g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
        g.useProgram(lines);
        const l = (name: string) => g.getUniformLocation(lines, name);
        g.uniform3f(l('uE'), e[0], e[1], e[2]);
        g.uniform3f(l('uN'), n[0], n[1], n[2]);
        g.uniform3f(l('uF'), f[0], f[1], f[2]);
        g.uniform2f(l('uScale'), (2 * R) / W, (2 * R) / H);
        g.uniform1f(l('uR'), R);
        g.uniform3f(l('uLight'), LIGHT[0], LIGHT[1], LIGHT[2]);
        g.bindBuffer(g.ARRAY_BUFFER, lineBuffer.buffer);
        for (const [loc, size, offset] of lineAttribs) {
          g.enableVertexAttribArray(loc);
          g.vertexAttribPointer(loc, size, g.FLOAT, false, LINE_STRIDE * 4, offset * 4);
        }
        g.drawArrays(g.TRIANGLES, 0, lineBuffer.vertices);
        for (const [loc] of lineAttribs) g.disableVertexAttribArray(loc);
      }
    },
  };
}
