import type { Campaign } from './campaign';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { shipDesignOf } from './reference';
import { worldOf, type World } from './sector';
import { activeShip, shipById, without } from './ship';
import { passTime } from './time';

// Systemflug (Domänenmodell 2026-11-18c, Stufe 1 des Raumkampfs; Konzept: docs/konzept-raumkampf.md).
// Gerechnet wird in km und Sekunden, in der Ebene, die Welt in der Mitte.

/** Ein Vektor in der Ebene (Domänenmodell: `Vec`): Ort in km, Geschwindigkeit in km/s, Schub in G. */
export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Ein Punkt der Spur: wo eine Einheit am Ende einer vergangenen Raumrunde war, mit ihrer Geschwindigkeit. */
export interface TrackPoint {
  readonly position: Vec;
  readonly velocity: Vec;
}

/** Was sich auf der Raumkarte frei bewegt; in Stufe 1 nur ein eigenes Schiff (Domänenmodell: `SpaceUnit`). */
export interface SpaceUnit {
  /** Das Schiff der Kampagne. */
  readonly ship: string;
  readonly position: Vec;
  readonly velocity: Vec;
  /** Der Schubvektor der laufenden Raumrunde in G; fehlt er, fliegt die Einheit ballistisch. */
  readonly thrust?: Vec;
  /** Unter die Oberfläche geraten: bewegt sich nicht mehr. */
  readonly crashed: boolean;
  /** Ort und Geschwindigkeit am Ende jeder vergangenen Raumrunde. */
  readonly track: readonly TrackPoint[];
}

/** Der laufende Flug auf der Raumkarte einer Welt (Domänenmodell: `SystemFlight`). */
export interface SystemFlight {
  /** Die Welt als Hexfeld-Id (0304). */
  readonly world: string;
  readonly startedAt: string;
  /** Die laufende Raumrunde, ab 1. */
  readonly round: number;
  readonly units: readonly SpaceUnit[];
}

/** Eine Raumrunde in Sekunden (SR 39). */
export const ROUND_SECONDS = 1000;
/** Rechenschritt der Simulation in Sekunden; fest, damit jedes Gerät dieselbe Bahn rechnet. */
export const STEP_SECONDS = 10;
/** Schritte je Raumrunde. */
export const ROUND_STEPS = ROUND_SECONDS / STEP_SECONDS;
/** 1 G in km/s² (10 m/s², Supplement 3). */
export const G_KMS2 = 0.01;
/** Ein Raumband in km (SR 39). */
export const BAND_KM = 10_000;
/** Feinheit des Schubs in G. */
export const THRUST_STEP = 0.1;
/** Sekunden je Tag. */
const DAY_SECONDS = 86_400;
/** Abstand beim Start bei einer Welt ohne Körper (Größe 0). */
const BELT_START_KM = 20_000;
/** Spielraum beim Vergleich mit dem höchsten Schub. */
const EPS = 1e-9;

/** Ein Himmelskörper mit Schwerkraft: Radius in km, G·M in km³/s². */
export interface Body {
  readonly radius: number;
  readonly gm: number;
}

/** Größe der Welt als Zahl; fehlt sie, 0. */
function sizeOf(hex: World): number {
  return hex.uwp.size ?? 0;
}

/**
 * Die Welt als Himmelskörper: Radius = Größe × 800 km, Schwerkraft g = Größe ÷ 8 G (SR 22, Dichte
 * K = 1), G·M = g · R². Größe 0 (Asteroidengürtel) hat keinen Körper.
 */
export function bodyOf(hex: World): Body | undefined {
  const size = sizeOf(hex);
  if (size <= 0) return undefined;
  const radius = size * 800;
  return { radius, gm: (size / 8) * G_KMS2 * radius * radius };
}

/** Die Sprunggrenzen der Welt in km vom Mittelpunkt: 10 und 100 Durchmesser (SR 28); ohne Körper keine. */
export function jumpLimitsOf(hex: World): readonly number[] {
  const body = bodyOf(hex);
  return body === undefined ? [] : [20 * body.radius, 200 * body.radius];
}

/** `/maxG`: die G des Maneuver Drive des Schiffs. */
export function maxGOf(campaign: Campaign, unit: SpaceUnit): number {
  return shipDesignOf(shipById(campaign, unit.ship).design).maneuver;
}

/** `/elapsed`: Sekunden seit Beginn des Systemflugs. */
export function elapsedOf(flight: SystemFlight): number {
  return (flight.round - 1) * ROUND_SECONDS;
}

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const lengthOf = (a: Vec): number => Math.hypot(a.x, a.y);

/** Schwerkraft am Ort in km/s². */
function gravity(body: Body | undefined, p: Vec): Vec {
  if (body === undefined) return { x: 0, y: 0 };
  const r2 = p.x * p.x + p.y * p.y;
  const r = Math.sqrt(r2);
  if (r === 0) return { x: 0, y: 0 };
  return scale(p, -body.gm / (r2 * r));
}

/** Der Zustand einer Einheit in der Simulation. */
export interface State {
  readonly position: Vec;
  readonly velocity: Vec;
  readonly crashed: boolean;
}

/**
 * Ein Schritt von `STEP_SECONDS` mit *Velocity Verlet*: Schwerkraft am alten und am neuen Ort, Schub
 * (in G) gleichmäßig über den Schritt. Gerät die Einheit unter die Oberfläche, schlägt sie auf.
 */
export function step(body: Body | undefined, state: State, thrust: Vec | undefined): State {
  if (state.crashed) return state;
  const dt = STEP_SECONDS;
  const push = thrust === undefined ? { x: 0, y: 0 } : scale(thrust, G_KMS2);
  const a0 = add(gravity(body, state.position), push);
  const position = add(add(state.position, scale(state.velocity, dt)), scale(a0, 0.5 * dt * dt));
  const a1 = add(gravity(body, position), push);
  const velocity = add(state.velocity, scale(add(a0, a1), 0.5 * dt));
  if (body !== undefined && lengthOf(position) < body.radius) {
    const surface = scale(position, body.radius / Math.max(lengthOf(position), EPS));
    return { position: surface, velocity: { x: 0, y: 0 }, crashed: true };
  }
  return { position, velocity, crashed: false };
}

/**
 * Rechnet `steps` Schritte und gibt alle Zwischenstände zurück (der erste ist der Anfang). Der Schub
 * gilt für die ersten `thrustSteps` Schritte (eine Raumrunde), danach ballistisch.
 */
export function propagate(body: Body | undefined, start: State, thrust: Vec | undefined, steps: number, thrustSteps = steps): readonly State[] {
  const states: State[] = [start];
  let state = start;
  for (let i = 0; i < steps; i++) {
    state = step(body, state, i < thrustSteps ? thrust : undefined);
    states.push(state);
  }
  return states;
}

/** Der Schubvektor, wie die Regel ihn speichert: Stärke auf 0,1 G gerundet, höchstens `maxG`; unter 0,05 G kein Schub. */
export function normalThrust(thrust: Vec | undefined, maxG: number): Vec | undefined {
  if (thrust === undefined) return undefined;
  const g = lengthOf(thrust);
  if (!Number.isFinite(g)) throw new DomainError('Der Schub ist keine Zahl.');
  const rounded = Math.min(maxG, Math.round(g / THRUST_STEP) * THRUST_STEP);
  if (rounded < THRUST_STEP - EPS) return undefined;
  return scale(thrust, rounded / g);
}

/** Der laufende Systemflug; ohne sagt die Regel, dass keiner läuft. */
export function activeFlight(campaign: Campaign): SystemFlight {
  if (campaign.flight === undefined) throw new DomainError('Es läuft kein Systemflug.');
  return campaign.flight;
}

/**
 * Beginnt einen Systemflug auf der Raumkarte der Welt, auf der die Gruppe ist, mit dem eigenen Schiff.
 * Es startet auf einer Kreisbahn mit dem doppelten Weltradius gegen den Uhrzeigersinn, oberhalb der
 * Welt (dort verdeckt es das Ziehblatt nicht); bei Größe 0 ruhend in 20.000 km Abstand.
 */
export function startFlight(campaign: Campaign, world: string, clock: Clock): Campaign {
  if (campaign.flight !== undefined) throw new DomainError('Es läuft schon ein Systemflug.');
  if (campaign.location?.world !== world) throw new DomainError('Ein Systemflug beginnt nur auf der Welt, auf der die Gruppe ist.');
  if (campaign.encounters.some((e) => !e.ended)) throw new DomainError('Während einer laufenden Begegnung beginnt kein Systemflug.');
  if (campaign.trip !== undefined) throw new DomainError('Erst die Fahrt beenden, dann fliegen.');
  const hex = worldOf(campaign.hexes, world);
  const ship = activeShip(campaign);
  const body = bodyOf(hex);
  let position: Vec;
  let velocity: Vec;
  if (body === undefined) {
    position = { x: 0, y: BELT_START_KM };
    velocity = { x: 0, y: 0 };
  } else {
    const r = 2 * body.radius;
    position = { x: 0, y: r };
    velocity = { x: -Math.sqrt(body.gm / r), y: 0 };
  }
  const unit: SpaceUnit = { ship: ship.id, position, velocity, crashed: false, track: [] };
  return { ...campaign, flight: { world, startedAt: clock.now(), round: 1, units: [unit] } };
}

/** Setzt den Schubvektor einer Einheit für die laufende Raumrunde (undefined: kein Schub). */
export function setThrust(campaign: Campaign, index: number, thrust: Vec | undefined): Campaign {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) throw new DomainError('Diese Einheit gibt es nicht.');
  if (unit.crashed && thrust !== undefined) throw new DomainError('Eine aufgeschlagene Einheit gibt keinen Schub.');
  const normal = normalThrust(thrust, maxGOf(campaign, unit));
  const rest = without(unit, 'thrust');
  const next: SpaceUnit = normal === undefined ? rest : { ...rest, thrust: normal };
  return { ...campaign, flight: { ...flight, units: flight.units.map((u, i) => (i === index ? next : u)) } };
}

/** Die Zwischenstände einer Raumrunde je Einheit, alle `every` Schritte (für die Wiedergabe). */
export interface RoundRun {
  readonly campaign: Campaign;
  readonly frames: readonly (readonly Vec[])[];
}

/**
 * Führt die Raumrunde aus: alle Einheiten zugleich 1.000 Sekunden mit ihrem Schubvektor. Danach hängt
 * jede ihren alten Ort an die Spur, der Schub ist leer, die Raumrunde eins weiter. Überschreitet die
 * Dauer volle 24 Stunden, vergeht ein Tag wie mit „Tage vergehen“.
 */
export function runRound(campaign: Campaign, clock: Clock, every = 2): RoundRun {
  const flight = activeFlight(campaign);
  const body = bodyOf(worldOf(campaign.hexes, flight.world));
  const runs = flight.units.map((u) => propagate(body, u, u.thrust, ROUND_STEPS));
  const units = flight.units.map((u, i): SpaceUnit => {
    const end = runs[i]!.at(-1)!;
    const rest = without(u, 'thrust');
    return { ...rest, position: end.position, velocity: end.velocity, crashed: end.crashed, track: [...u.track, { position: u.position, velocity: u.velocity }] };
  });
  const next: SystemFlight = { ...flight, round: flight.round + 1, units };
  let result: Campaign = { ...campaign, flight: next };
  const daysBefore = Math.floor(elapsedOf(flight) / DAY_SECONDS);
  const daysAfter = Math.floor(elapsedOf(next) / DAY_SECONDS);
  for (let d = daysBefore; d < daysAfter; d++) result = passTime(result, { days: 1 }, clock);
  const frames: Vec[][] = [];
  for (let s = 0; s <= ROUND_STEPS; s += every) frames.push(runs.map((r) => r[s]!.position));
  return { campaign: result, frames };
}

/** Beendet den Systemflug; angebrochene Tage verfallen. */
export function endFlight(campaign: Campaign): Campaign {
  activeFlight(campaign);
  return without(campaign, 'flight');
}

/** Was die Bahnvorschau einer Einheit zeigt: diese Raumrunde mit Schub, danach fünf ohne. */
export interface Preview {
  readonly now: readonly Vec[];
  readonly after: readonly Vec[];
  /** In welcher Raumrunde ab jetzt (0 = diese) sie aufschlüge; fehlt, wenn nicht. */
  readonly impact?: number;
}

/** Raumrunden, die die Bahnvorschau ohne Schub vorausrechnet. */
export const PREVIEW_ROUNDS = 5;

/** Die Bahnvorschau einer Einheit mit einem (vielleicht nur gezogenen) Schubvektor; alle `every` Schritte ein Punkt. */
export function previewOf(body: Body | undefined, unit: State, thrust: Vec | undefined, every = 2): Preview {
  const states = propagate(body, unit, thrust, ROUND_STEPS * (1 + PREVIEW_ROUNDS), ROUND_STEPS);
  const now: Vec[] = [];
  const after: Vec[] = [];
  let impact: number | undefined;
  states.forEach((s, i) => {
    if (impact === undefined && s.crashed && !unit.crashed) impact = Math.floor(Math.max(0, i - 1) / ROUND_STEPS);
    if (i <= ROUND_STEPS) {
      if (i % every === 0 || i === ROUND_STEPS) now.push(s.position);
    } else if ((i - ROUND_STEPS) % (every * 2) === 0) after.push(s.position);
    if (i === ROUND_STEPS) after.push(s.position);
  });
  return { now, after, ...(impact === undefined ? {} : { impact }) };
}

/** Prüft einen geladenen Systemflug gegen die Kampagne. */
export function checkFlight(campaign: Campaign, flight: SystemFlight): void {
  worldOf(campaign.hexes, flight.world);
  if (!Number.isInteger(flight.round) || flight.round < 1) throw new DomainError('Die Raumrunde eines Systemflugs beginnt bei 1.');
  if (flight.units.length === 0) throw new DomainError('Ein Systemflug hat mindestens eine Einheit.');
  for (const unit of flight.units) {
    const maxG = maxGOf(campaign, unit);
    if (unit.thrust !== undefined && lengthOf(unit.thrust) > maxG + 1e-6) throw new DomainError('Der Schub einer Einheit ist größer als ihr höchster Schub.');
    if (unit.track.length !== flight.round - 1) throw new DomainError('Die Spur einer Einheit passt nicht zur Raumrunde.');
  }
}

/** Eine Marke am Schubkreis, an der der Schubvektor einrastet (Winkel im Bogenmaß, gegen den Uhrzeigersinn ab +x). */
export interface ThrustMark {
  readonly name: 'prograd' | 'retrograd';
  readonly angle: number;
}

/** Wie nah (in Bogenmaß) der Schubvektor einer Marke kommen muss, um einzurasten: etwa 5°. */
export const SNAP_ANGLE = (5 * Math.PI) / 180;

/** Die Marken einer Einheit: in Flugrichtung und gegen sie; ohne Geschwindigkeit keine. Ziel, weg und angleichen kommen mit fremden Einheiten. */
export function thrustMarks(unit: State): readonly ThrustMark[] {
  if (unit.crashed || lengthOf(unit.velocity) < 1e-3) return [];
  const angle = Math.atan2(unit.velocity.y, unit.velocity.x);
  return [
    { name: 'prograd', angle },
    { name: 'retrograd', angle: angle + (angle > 0 ? -Math.PI : Math.PI) },
  ];
}

/** Der Schubvektor nach dem Einrasten: liegt seine Richtung höchstens `SNAP_ANGLE` neben einer Marke, zeigt er genau dorthin. */
export function snapThrust(thrust: Vec | undefined, marks: readonly ThrustMark[]): { readonly thrust: Vec | undefined; readonly snap?: ThrustMark['name'] } {
  if (thrust === undefined) return { thrust };
  const g = lengthOf(thrust);
  if (g === 0) return { thrust: undefined };
  const angle = Math.atan2(thrust.y, thrust.x);
  for (const mark of marks) {
    const diff = Math.abs(Math.atan2(Math.sin(angle - mark.angle), Math.cos(angle - mark.angle)));
    if (diff <= SNAP_ANGLE) return { thrust: { x: g * Math.cos(mark.angle), y: g * Math.sin(mark.angle) }, snap: mark.name };
  }
  return { thrust };
}
