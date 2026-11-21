import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { SpaceUnitView, SpaceView, WorldLook } from '../../controller';
import { useGame } from '../game-context';
import { CloseIcon } from '../icons';
import { worldCanvas, worldRadiusShare } from '../sector/world-icon';

// Die Raumkarte (Domänenmodell 2026-11-18c): der Raum um eine Welt in 2D. Alles, was eine Regel ist
// (Bahnen, Vorschau, Marken, Einrasten), kommt aus dem Snapshot; hier steht nur, wie es gezeichnet
// wird, wo die Kamera steht und wie ein Fingerzug zu einem Schubvektor wird.

/** Der Schubkreis auf dem Bildschirm in px, unabhängig vom Zoom: sein Rand ist der höchste Schub. */
const RING = 90;
/** Ein Finger näher an der Mitte als das heißt kein Schub. */
const DEAD = 14;
/** So lange spielt die Karte eine Raumrunde ab, in ms. */
const PLAY_MS = 1800;
const OWN = '#4fd1ff';
const WARN = '#ff5a6a';

interface Camera {
  /** Mitte des Bildes in km. */
  cx: number;
  cy: number;
  /** px je km. */
  scale: number;
}

type Point = { readonly x: number; readonly y: number };

/** Ort auf der Spur zwischen zwei Punkten mit Geschwindigkeit (Hermite über 1.000 s), für eine glatte Kurve. */
function hermite(p0: Point, v0: Point, p1: Point, v1: Point, t: number): Point {
  const T = 1000;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return { x: h00 * p0.x + h10 * T * v0.x + h01 * p1.x + h11 * T * v1.x, y: h00 * p0.y + h10 * T * v0.y + h01 * p1.y + h11 * T * v1.y };
}

/** Die Punkte der Spur einer Einheit bis zu ihrem jetzigen Ort. */
function trailOf(unit: SpaceUnitView): Point[] {
  const states = [...unit.track, { position: unit.position, velocity: unit.velocity }];
  const points: Point[] = [];
  for (let i = 0; i + 1 < states.length; i++) {
    const a = states[i]!;
    const b = states[i + 1]!;
    for (let k = 0; k < 12; k++) points.push(hermite(a.position, a.velocity, b.position, b.velocity, k / 12));
  }
  points.push(unit.position);
  return points;
}

/** Welcher Anteil des Symbols die Kugel ist: Gasriesen füllen es fast, kleine Welten wenig. */
function shareOf(look: WorldLook): number {
  return look.kind === 'giant' ? 0.9 : look.kind === 'small' ? 0.24 : worldRadiusShare(look.size);
}

/** Zeichnet einen Körper im Weltsymbol in echter Größe (mindestens `min` px Halbmesser) mit Namen. */
function drawBody(ctx: CanvasRenderingContext2D, dpr: number, look: WorldLook | undefined, radiusPx: number, x: number, y: number, name: string, min = 5): void {
  const rPx = Math.max(min, radiusPx);
  if (look) {
    const size = (2 * rPx) / shareOf(look);
    let px = 64;
    while (px < size * dpr && px < 1024) px *= 2;
    ctx.drawImage(worldCanvas(look, px, { orbits: false }), x - size / 2, y - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, rPx, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(200, 200, 210, 0.6)';
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(200, 210, 230, 0.8)';
  ctx.fillText(name, x + rPx + 6, y + 4);
}

/** Der Ort eines Körpers während der Wiedergabe (zwischen zwei Bildern) oder jetzt. */
function bodyAt(frames: readonly Point[] | undefined, position: Point, progress: number, playing: boolean): Point {
  if (!playing || !frames || frames.length === 0) return position;
  const k = progress * (frames.length - 1);
  const i = Math.min(frames.length - 1, Math.floor(k));
  const j = Math.min(frames.length - 1, i + 1);
  const a = frames[i]!;
  const b = frames[j]!;
  return { x: a.x + (b.x - a.x) * (k - i), y: a.y + (b.y - a.y) * (k - i) };
}

/**
 * Wo die Kamera zu Beginn steht: Welt und Einheiten mit Rand, die Welt etwas über der Mitte, weil
 * unten das Ziehblatt liegt.
 */
function startCamera(space: SpaceView, width: number, height: number): Camera {
  const reach = Math.max(4 * (space.world.radius ?? 5000), ...(space.flight?.units.map((u) => 1.6 * Math.hypot(u.position.x, u.position.y)) ?? []), 30_000);
  const scale = Math.min(width, 0.6 * height) / (2 * reach);
  return { cx: 0, cy: -(0.17 * height) / scale, scale };
}

export function SpaceScreen({ space }: { space: SpaceView }) {
  const game = useGame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const camera = useRef<Camera | undefined>(undefined);
  const latest = useRef(space);
  useLayoutEffect(() => {
    latest.current = space;
  }, [space]);
  // Die Wiedergabe der letzten Raumrunde: ab wann und welche Runde; reine Darstellung.
  const play = useRef<{ round: number; start: number } | undefined>(undefined);
  const seenRound = useRef(space.flight?.run?.round);
  const drag = useRef<{ kind: 'thrust'; unit: number } | { kind: 'pan'; x: number; y: number; cx: number; cy: number } | { kind: 'pinch'; d: number; scale: number } | undefined>(undefined);
  const pointers = useRef(new Map<number, Point>());
  const [, redraw] = useState(0);

  // Eine neue Raumrunde abspielen, sobald der Snapshot sie bringt.
  const runRound = space.flight?.run?.round;
  useEffect(() => {
    if (runRound !== undefined && runRound !== seenRound.current) play.current = { round: runRound, start: performance.now() };
    seenRound.current = runRound;
  }, [runRound]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      const view = latest.current;
      const dpr = window.devicePixelRatio || 1;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      const cam = (camera.current ??= startCamera(view, w, h));
      const sx = (x: number) => w / 2 + (x - cam.cx) * cam.scale;
      const sy = (y: number) => h / 2 - (y - cam.cy) * cam.scale;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#04060b';
      ctx.fillRect(0, 0, w, h);

      const flight = view.flight;
      const playing = play.current && flight?.run && play.current.round === flight.run.round ? play.current : undefined;
      // Der Zeitstempel des Bildes kann knapp vor dem Start liegen: nie unter 0.
      const progress = playing ? Math.max(0, Math.min(1, (now - playing.start) / PLAY_MS)) : 1;
      if (playing && progress >= 1) play.current = undefined;

      // Der Körper in der Mitte der Szene (ein Gasriese, wenn die Welt sein Mond ist) und die Monde.
      const bodies = view.bodies.map((b) => ({ ...b, at: bodyAt(b.frames, b.position, progress, playing !== undefined) }));
      const center = bodies.find((b) => b.orbit === undefined)?.at ?? { x: 0, y: 0 };
      const shift = { x: center.x - (bodies.find((b) => b.orbit === undefined)?.position.x ?? 0), y: center.y - (bodies.find((b) => b.orbit === undefined)?.position.y ?? 0) };

      // Sprunggrenzen
      ctx.font = '11px system-ui, sans-serif';
      for (const limit of view.jumpLimits) {
        const r = limit.km * cam.scale;
        if (r < 8 || r > 4 * Math.max(w, h)) continue;
        ctx.beginPath();
        ctx.arc(sx(center.x), sy(center.y), r, 0, 2 * Math.PI);
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(150, 120, 220, 0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(170, 145, 235, 0.85)';
        ctx.fillText(`Sprunggrenze ${limit.km === view.jumpLimits[0]?.km ? 10 : 100} D (DM +${limit.dm})`, sx(center.x) + 6, sy(center.y) - r - 6);
      }

      // Ringe: flache Bänder, durch die man hindurchfliegt
      for (const ring of view.rings) {
        const x = sx(ring.around.x + shift.x);
        const y = sy(ring.around.y + shift.y);
        ctx.beginPath();
        ctx.arc(x, y, ring.outer * cam.scale, 0, 2 * Math.PI);
        ctx.arc(x, y, ring.inner * cam.scale, 0, 2 * Math.PI, true);
        ctx.fillStyle = 'rgba(214, 200, 170, 0.22)';
        ctx.fill('evenodd');
      }
      // Bahnen der Monde und die Körper selbst
      for (const body of bodies) {
        if (body.orbit) {
          ctx.beginPath();
          ctx.arc(sx(body.orbit.around.x + shift.x), sy(body.orbit.around.y + shift.y), body.orbit.distance * cam.scale, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(160, 175, 200, 0.18)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      for (const body of bodies) drawBody(ctx, dpr, body.look, body.radius * cam.scale, sx(body.at.x), sy(body.at.y), body.name, body.orbit ? 3 : 5);

      // Die Welt im Weltsymbol, in echter Größe (mindestens ein paar Pixel); sie steht immer in der Mitte.
      const look = view.world.look;
      if (view.world.radius !== undefined) {
        drawBody(ctx, dpr, look, view.world.radius * cam.scale, sx(0), sy(0), view.world.name);
      } else {
        ctx.drawImage(worldCanvas(look, 128, { orbits: false }), sx(0) - 40, sy(0) - 40, 80, 80);
        ctx.fillStyle = 'rgba(200, 210, 230, 0.8)';
        ctx.fillText(view.world.name, sx(0) + 46, sy(0) + 4);
      }

      const path = (pts: readonly Point[], color: string, width: number, dash: number[] = []) => {
        if (pts.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(sx(pts[0]!.x), sy(pts[0]!.y));
        for (const p of pts) ctx.lineTo(sx(p.x), sy(p.y));
        ctx.setLineDash(dash);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.setLineDash([]);
      };

      for (const unit of flight?.units ?? []) {
        let at: Point = unit.position;
        let trail = trailOf(unit);
        if (playing && flight?.run) {
          const frames = flight.run.frames;
          const k = progress * (frames.length - 1);
          const i = Math.min(frames.length - 1, Math.floor(k));
          const j = Math.min(frames.length - 1, i + 1);
          const a = frames[i]![unit.index]!;
          const b = frames[j]![unit.index]!;
          at = { x: a.x + (b.x - a.x) * (k - i), y: a.y + (b.y - a.y) * (k - i) };
          trail = [...trailOf({ ...unit, track: unit.track.slice(0, -1), position: unit.track.at(-1)?.position ?? unit.position, velocity: unit.track.at(-1)?.velocity ?? unit.velocity }), ...frames.slice(0, i + 1).map((f) => f[unit.index]!), at];
        }
        path(trail, 'rgba(79, 209, 255, 0.35)', 1.2);
        if (!playing && !unit.crashed) {
          path(unit.preview.after, 'rgba(79, 209, 255, 0.75)', 1.4, [6, 5]);
          path(unit.preview.now, OWN, 2.4);
          const end = unit.preview.now.at(-1);
          if (end) {
            ctx.beginPath();
            ctx.arc(sx(end.x), sy(end.y), 6, 0, 2 * Math.PI);
            ctx.strokeStyle = OWN;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
          if (unit.preview.landing !== undefined && unit.preview.impact === undefined) {
            const p = unit.preview.landing.round === 0 ? end : (unit.preview.after.at(-1) ?? end);
            if (p) {
              ctx.fillStyle = '#7ee08a';
              ctx.font = 'bold 13px system-ui, sans-serif';
              ctx.fillText('↓ Landung', sx(p.x) + 8, sy(p.y));
              ctx.font = '11px system-ui, sans-serif';
            }
          }
          if (unit.preview.impact !== undefined) {
            const p = unit.preview.after.at(-1) ?? end;
            if (p) {
              ctx.fillStyle = WARN;
              ctx.font = 'bold 13px system-ui, sans-serif';
              ctx.fillText('✕ Aufschlag', sx(p.x) + 8, sy(p.y));
              ctx.font = '11px system-ui, sans-serif';
            }
          }
          // Raumbänder um die Einheit
          if (view.band * cam.scale > 26) {
            for (let b = 1; b <= 5; b++) {
              ctx.beginPath();
              ctx.arc(sx(at.x), sy(at.y), b * view.band * cam.scale, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(79, 209, 255, 0.10)';
              ctx.lineWidth = 1;
              ctx.stroke();
              ctx.fillStyle = 'rgba(79, 209, 255, 0.4)';
              ctx.fillText(`${b} RB`, sx(at.x + b * view.band) + 3, sy(at.y) - 3);
            }
          }
          // Schubkreis mit Marken und Schubvektor
          const X = sx(at.x);
          const Y = sy(at.y);
          const active = drag.current?.kind === 'thrust' && drag.current.unit === unit.index;
          ctx.beginPath();
          ctx.arc(X, Y, RING, 0, 2 * Math.PI);
          ctx.strokeStyle = active ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          for (const mark of unit.marks) {
            const c = Math.cos(mark.angle);
            const s = Math.sin(mark.angle);
            const on = unit.snap === mark.name;
            ctx.beginPath();
            ctx.moveTo(X + c * (RING - 5), Y - s * (RING - 5));
            ctx.lineTo(X + c * (RING + 5), Y - s * (RING + 5));
            ctx.strokeStyle = on ? '#fff' : OWN;
            ctx.lineWidth = on ? 2.5 : 1.5;
            ctx.stroke();
            if (active || on) {
              ctx.fillStyle = on ? '#fff' : OWN;
              ctx.fillText(mark.name === 'prograd' ? 'pro' : 'retro', X + c * (RING + 16), Y - s * (RING + 16));
            }
          }
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
          if (unit.thrust) {
            const L = (Math.hypot(unit.thrust.x, unit.thrust.y) / unit.maxG) * RING;
            const g = Math.hypot(unit.thrust.x, unit.thrust.y);
            const nx = unit.thrust.x / g;
            const ny = unit.thrust.y / g;
            ctx.beginPath();
            ctx.moveTo(X, Y);
            ctx.lineTo(X + nx * L, Y - ny * L);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(X + nx * L, Y - ny * L, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            if (active) {
              ctx.font = 'bold 13px system-ui, sans-serif';
              ctx.fillText(`${unit.thrustG.toLocaleString('de-DE', { minimumFractionDigits: 1 })} G`, X + nx * L + 10, Y - ny * L - 10);
              ctx.font = '11px system-ui, sans-serif';
            }
          }
        }
        // Das Schiff, zur Flugrichtung gedreht
        const angle = Math.atan2(unit.velocity.y, unit.velocity.x);
        ctx.save();
        ctx.translate(sx(at.x), sy(at.y));
        ctx.rotate(-angle);
        // Ein Small Craft ist kleiner gezeichnet, sein Name steht darunter (2026-11-21b).
        if (unit.craft) ctx.scale(0.7, 0.7);
        ctx.beginPath();
        ctx.moveTo(9, 0);
        ctx.lineTo(-6, 5.5);
        ctx.lineTo(-3.5, 0);
        ctx.lineTo(-6, -5.5);
        ctx.closePath();
        ctx.fillStyle = unit.crashed ? WARN : OWN;
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = unit.crashed ? WARN : OWN;
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(unit.crashed ? `${unit.name} (Aufschlag)` : unit.name, sx(at.x) + 12, sy(at.y) + (unit.craft ? 18 : -10));
        ctx.font = '11px system-ui, sans-serif';
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);

  /** Welche eigene Einheit hat ihren Schubkreis unter dem Finger? Die nächste gewinnt. */
  const unitAt = (x: number, y: number): SpaceUnitView | undefined => {
    const el = canvas.current;
    const cam = camera.current;
    const flight = latest.current.flight;
    if (!el || !cam || !flight || play.current) return undefined;
    const w = el.clientWidth;
    const h = el.clientHeight;
    let best: { unit: SpaceUnitView; d: number } | undefined;
    for (const unit of flight.units) {
      if (unit.crashed) continue;
      const d = Math.hypot(x - (w / 2 + (unit.position.x - cam.cx) * cam.scale), y - (h / 2 - (unit.position.y - cam.cy) * cam.scale));
      // Liegen zwei Einheiten übereinander (ein Beiboot gerade ausgesetzt), zieht der Finger an der Einheit der Gruppe (2026-11-21b).
      if (d <= RING + 12 && (!best || d < best.d - 1 || (Math.abs(d - best.d) <= 1 && unit.party))) best = { unit, d };
    }
    return best?.unit;
  };

  /** Der Schubvektor in G für einen Finger an (x, y): vom Schiff zum Finger, der Kreisrand ist der höchste Schub. */
  const thrustAt = (unit: SpaceUnitView, x: number, y: number) => {
    const el = canvas.current!;
    const cam = camera.current!;
    const dx = x - (el.clientWidth / 2 + (unit.position.x - cam.cx) * cam.scale);
    const dy = -(y - (el.clientHeight / 2 - (unit.position.y - cam.cy) * cam.scale));
    const len = Math.hypot(dx, dy);
    if (len < DEAD) return undefined;
    const g = (Math.min(len, RING) / RING) * unit.maxG;
    return { x: (dx / len) * g, y: (dy / len) * g };
  };

  const local = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    canvas.current?.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const cam = camera.current;
    if (!cam) return;
    if (pointers.current.size === 1) {
      const unit = unitAt(p.x, p.y);
      if (unit) {
        drag.current = { kind: 'thrust', unit: unit.index };
        game.aimThrust(unit.index, thrustAt(unit, p.x, p.y));
      } else drag.current = { kind: 'pan', x: p.x, y: p.y, cx: cam.cx, cy: cam.cy };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      drag.current = { kind: 'pinch', d: Math.hypot(a!.x - b!.x, a!.y - b!.y), scale: cam.scale };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const d = drag.current;
    const cam = camera.current;
    if (!d || !cam) return;
    if (d.kind === 'thrust') {
      const unit = latest.current.flight?.units[d.unit];
      if (unit) game.aimThrust(d.unit, thrustAt(unit, p.x, p.y));
    } else if (d.kind === 'pan') {
      cam.cx = d.cx - (p.x - d.x) / cam.scale;
      cam.cy = d.cy + (p.y - d.y) / cam.scale;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      cam.scale = clampScale((d.scale * Math.hypot(a!.x - b!.x, a!.y - b!.y)) / d.d);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (d?.kind === 'thrust' && pointers.current.size === 1) {
      const unit = latest.current.flight?.units[d.unit];
      if (unit) game.setThrust(d.unit, unit.thrust);
    }
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) drag.current = undefined;
    redraw((n) => n + 1);
  };

  const zoom = (factor: number) => {
    const cam = camera.current;
    if (cam) cam.scale = clampScale(cam.scale * factor);
  };

  const center = () => {
    const cam = camera.current;
    const el = canvas.current;
    if (!cam || !el) return;
    const unit = latest.current.flight?.units[0];
    if (unit && (cam.cx !== unit.position.x || cam.cy !== unit.position.y)) {
      cam.cx = unit.position.x;
      cam.cy = unit.position.y;
    } else {
      Object.assign(cam, startCamera(latest.current, el.clientWidth, el.clientHeight));
    }
  };

  return (
    <div className="globe-full space-full" role="region" aria-label={`Raumkarte · ${space.world.name}`}>
      <div className="globe-stage">
        <canvas
          ref={canvas}
          className="globe-canvas"
          aria-label={`Raumkarte von ${space.world.name}; im Schubkreis tippen oder ziehen setzt den Schub, außerhalb verschiebt ein Zug die Karte`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(e) => zoom(Math.exp(-e.deltaY * 0.0015))}
        />
      </div>
      <div className="globe-top">
        <div className="globe-bar">
          <button type="button" className="globe-round" aria-label="Raumkarte schließen" title="Zurück" onClick={() => game.closeSpace()}>
            <CloseIcon />
          </button>
          <div className="globe-title space-title">
            <span className="globe-title-name">Raum · {space.world.name}</span>
          </div>
        </div>
      </div>
      <div className="globe-zoom space-zoom">
        <button type="button" className="globe-round globe-locate" aria-label="Zum Schiff oder zur Welt" title="Zum Schiff oder zur Welt" onClick={center}>
          ⌖
        </button>
        <div className="globe-zoom-buttons">
          <button type="button" className="globe-round" aria-label="Hineinzoomen" onClick={() => zoom(1.6)}>
            +
          </button>
          <button type="button" className="globe-round" aria-label="Herauszoomen" onClick={() => zoom(1 / 1.6)}>
            −
          </button>
        </div>
      </div>
    </div>
  );
}

const clampScale = (s: number) => Math.min(0.2, Math.max(0.000_002, s));
