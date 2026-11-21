import type { Campaign } from './campaign';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { shipDesignOf } from './reference';
import { hexById, hexIdOfWorld, worldOf, type Hex, type World } from './sector';
import { gravityOf, radiusOf } from './star-system';
import { activeShip, shipById, shipOf, without } from './ship';
import { passTime, START_DAY } from './time';
import { placeGroup } from './upkeep';
import { needsLanding, shipArrives, shipDepartureBlocker } from './landing';

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
  /** Die Welt, an der der Flug beginnt (Id der Welt, 2026-11-20b): die Hauptwelt, ein Gasriese oder eine andere Welt des Systems. */
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

/**
 * Die Welt als Himmelskörper: Radius (Größe × 800 km, kleine Welt halber Durchmesser, Gasriese sein
 * Radius) und Schwerkraft nach B6 43 / SR 22, G·M = g · R². Gürtel und Ringe haben keinen Körper.
 */
export function bodyOf(world: World): Body | undefined {
  const radius = radiusOf(world);
  const g = gravityOf(world);
  if (radius === undefined || g <= 0) return undefined;
  return { radius, gm: g * G_KMS2 * radius * radius };
}

/** Ein Mond auf der Raumkarte: auf einer Kreisbahn gegen den Uhrzeigersinn um den Körper in der Mitte. */
export interface MoonBody {
  readonly world: string;
  /** Ohne Körper (Ring) keine Schwerkraft und kein Aufschlag. */
  readonly body: Body | undefined;
  /** Abstand von der Mitte in km. */
  readonly distance: number;
  /** Winkel am Kampagnentag 0 im Bogenmaß und Winkelgeschwindigkeit in rad/s. */
  readonly angle: number;
  readonly omega: number;
}

/** Ein Ring: flaches Band von `inner` bis `outer` km um die Mitte; ohne Schwerkraft, man fliegt hindurch. */
export interface RingBand {
  readonly world: string;
  readonly inner: number;
  readonly outer: number;
}

/**
 * Was auf der Raumkarte Schwerkraft hat (2026-11-18d): der Körper in der Mitte, still, und seine
 * Monde auf festen Kreisbahnen. Die Mitte ist die Welt der Raumkarte; ist sie selbst ein Mond (die
 * Hauptwelt als Mond eines Gasriesen), ist es die Welt, um die sie kreist.
 */
export interface Scene {
  readonly center: string;
  readonly body: Body | undefined;
  readonly moons: readonly MoonBody[];
  readonly rings: readonly RingBand[];
}

/** Die Szene der Raumkarte einer Welt. */
export function sceneOf(hexes: readonly Hex[], worldId: string): Scene {
  const hex = hexById(hexes, hexIdOfWorld(worldId));
  const world = worldOf(hexes, worldId);
  const center = (world.moonOf !== undefined ? hex?.worlds.find((w) => w.id === world.moonOf) : undefined) ?? world;
  const body = bodyOf(center);
  const moons: MoonBody[] = [];
  const rings: RingBand[] = [];
  const unit = radiusOf(center) ?? 0;
  for (const moon of hex?.worlds.filter((w) => w.moonOf === center.id) ?? []) {
    const distance = (moon.orbit ?? 0) * unit;
    if (moon.kind === 'ring') {
      rings.push({ world: moon.id, inner: ((moon.orbit ?? 0) + 0.2) * unit, outer: ((moon.orbit ?? 0) + 0.8) * unit });
      continue;
    }
    if (body === undefined || distance <= 0) continue;
    moons.push({ world: moon.id, body: bodyOf(moon), distance, angle: ((moon.angle ?? 0) * Math.PI) / 180, omega: Math.sqrt(body.gm / distance ** 3) });
  }
  return { center: center.id, body, moons, rings };
}

/** Eine Szene nur mit einem Körper in der Mitte (ohne Monde). */
export function sceneWith(body: Body | undefined): Scene {
  return { center: '', body, moons: [], rings: [] };
}

/** Wo ein Mond zur Zeit `t` (Sekunden seit Kampagnentag 0) steht und wie schnell er sich bewegt. */
export function moonAt(moon: MoonBody, t: number): { readonly position: Vec; readonly velocity: Vec } {
  const a = moon.angle + moon.omega * t;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { position: { x: moon.distance * c, y: moon.distance * s }, velocity: { x: -moon.distance * moon.omega * s, y: moon.distance * moon.omega * c } };
}

/**
 * Wo die Welt `worldId` zur Zeit `t` in der Szene steht und wie schnell sie sich bewegt: die Mitte
 * ruht im Ursprung, ein Mond läuft auf seiner Bahn. Die Raumkarte zeigt alles von ihr aus gesehen.
 */
export function originAt(scene: Scene, worldId: string, t: number): { readonly position: Vec; readonly velocity: Vec } {
  const moon = scene.moons.find((m) => m.world === worldId);
  return moon ? moonAt(moon, t) : { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } };
}

/** Sekunden seit Kampagnentag 0 (dem ersten Tag der Kampagne) zu Beginn eines Tages. */
export function dayStart(day: number): number {
  return (day - START_DAY) * DAY_SECONDS;
}

/** Die Zeit jetzt im Systemflug, in Sekunden seit Kampagnentag 0: Beginn des Starttages plus Dauer des Flugs. */
export function flightTime(campaign: Pick<Campaign, 'day'>, flight: SystemFlight): number {
  const elapsed = elapsedOf(flight);
  // Mit jedem vollen Tag des Flugs ist auch der Kampagnentag eins weiter.
  return dayStart(campaign.day - Math.floor(elapsed / DAY_SECONDS)) + elapsed;
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

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });

/** Die Anziehung eines Körpers in `at` auf den Ort `p`, in km/s². */
function pull(body: Body | undefined, at: Vec, p: Vec): Vec {
  if (body === undefined) return { x: 0, y: 0 };
  const d = sub(p, at);
  const r2 = d.x * d.x + d.y * d.y;
  const r = Math.sqrt(r2);
  if (r === 0) return { x: 0, y: 0 };
  return scale(d, -body.gm / (r2 * r));
}

/** Schwerkraft am Ort zur Zeit `t` in km/s²: die Mitte und alle Monde. */
export function gravityAt(scene: Scene, p: Vec, t: number): Vec {
  let a = pull(scene.body, { x: 0, y: 0 }, p);
  for (const moon of scene.moons) if (moon.body) a = add(a, pull(moon.body, moonAt(moon, t).position, p));
  return a;
}

/** Liegt `p` zur Zeit `t` in einem Körper? Dann der Ort auf seiner Oberfläche. */
function inside(scene: Scene, p: Vec, t: number): { readonly surface: Vec; readonly world: string; readonly velocity: Vec } | undefined {
  const bodies: { body: Body; world: string; at: Vec; velocity: Vec }[] = [];
  if (scene.body) bodies.push({ body: scene.body, world: scene.center, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 } });
  for (const moon of scene.moons) {
    if (!moon.body) continue;
    const m = moonAt(moon, t);
    bodies.push({ body: moon.body, world: moon.world, at: m.position, velocity: m.velocity });
  }
  for (const { body, world, at, velocity } of bodies) {
    const d = sub(p, at);
    const r = lengthOf(d);
    if (r < body.radius) return { surface: add(at, scale(d, body.radius / Math.max(r, EPS))), world, velocity };
  }
  return undefined;
}

/** Bis zu dieser Geschwindigkeit gegenüber der Oberfläche ist das Auftreffen eine Landung (Owner, 21. November 2026: erst 1, dann 5 km/s), in km/s. */
export const LANDING_KMS = 5;

/** Der Zustand einer Einheit in der Simulation. */
export interface State {
  readonly position: Vec;
  readonly velocity: Vec;
  readonly crashed: boolean;
  /** Langsam aufgesetzt (höchstens `LANDING_KMS`): auf dieser Welt gelandet; nur in der Rechnung, nie gespeichert. */
  readonly landedOn?: string;
}

/**
 * Ein Schritt von `STEP_SECONDS` ab der Zeit `t` mit *Velocity Verlet*: Schwerkraft am alten und am
 * neuen Ort (die Monde dort, wo sie dann stehen), Schub (in G) gleichmäßig über den Schritt. Gerät
 * die Einheit unter die Oberfläche eines Körpers, schlägt sie auf.
 */
export function step(scene: Scene, state: State, thrust: Vec | undefined, t = 0): State {
  if (state.crashed || state.landedOn !== undefined) return state;
  const dt = STEP_SECONDS;
  const push = thrust === undefined ? { x: 0, y: 0 } : scale(thrust, G_KMS2);
  const a0 = add(gravityAt(scene, state.position, t), push);
  const position = add(add(state.position, scale(state.velocity, dt)), scale(a0, 0.5 * dt * dt));
  const a1 = add(gravityAt(scene, position, t + dt), push);
  const velocity = add(state.velocity, scale(add(a0, a1), 0.5 * dt));
  const contact = inside(scene, position, t + dt);
  if (contact) {
    // Langsam aufgesetzt ist gelandet, schneller aufgeschlagen.
    if (lengthOf(sub(velocity, contact.velocity)) <= LANDING_KMS) return { position: contact.surface, velocity: contact.velocity, crashed: false, landedOn: contact.world };
    return { position: contact.surface, velocity: { x: 0, y: 0 }, crashed: true };
  }
  return { position, velocity, crashed: false };
}

/**
 * Rechnet `steps` Schritte ab der Zeit `t` und gibt alle Zwischenstände zurück (der erste ist der
 * Anfang). Der Schub gilt für die ersten `thrustSteps` Schritte (eine Raumrunde), danach ballistisch.
 */
export function propagate(scene: Scene, start: State, thrust: Vec | undefined, steps: number, thrustSteps = steps, t = 0): readonly State[] {
  const states: State[] = [start];
  let state = start;
  for (let i = 0; i < steps; i++) {
    state = step(scene, state, i < thrustSteps ? thrust : undefined, t + i * STEP_SECONDS);
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
  const blocker = flightStartBlocker(campaign, world);
  if (blocker) throw new DomainError(blocker);
  const ship = activeShip(campaign);
  const { position, velocity } = startOrbit(campaign.hexes, world, dayStart(campaign.day));
  const unit: SpaceUnit = { ship: ship.id, position, velocity, crashed: false, track: [] };
  return { ...campaign, flight: { world, startedAt: clock.now(), round: 1, units: [unit] } };
}

/** Warum an `world` kein Systemflug beginnen kann; `undefined`, wenn er kann. */
export function flightStartBlocker(campaign: Campaign, world: string): string | undefined {
  if (campaign.flight !== undefined) return campaign.flight.world === world ? 'Es läuft schon ein Systemflug.' : 'Es läuft schon ein Systemflug an einer anderen Welt.';
  // Am Gasriesen darf er von der Welt aus beginnen, auf der die Gruppe ist (wie man hinkommt, bleibt offen, 2026-11-18d).
  if (campaign.location === undefined || hexIdOfWorld(campaign.location.world) !== hexIdOfWorld(world)) return 'Ein Systemflug beginnt nur im System, in dem die Gruppe ist.';
  if (worldOf(campaign.hexes, world).kind === 'ring') return 'Um einen Ring gibt es keine Raumkarte.';
  if (shipOf(campaign) === undefined) return 'Die Gruppe hat kein Schiff.';
  if (campaign.encounters.some((e) => !e.ended)) return 'Während einer laufenden Begegnung beginnt kein Systemflug.';
  if (campaign.trip !== undefined) return 'Erst die Fahrt beenden, dann fliegen.';
  // Ohne Landeplatz steht das Schiff noch nirgends auf der Welt (2026-11-21).
  if (needsLanding(campaign)) return 'Erst den Landeplatz wählen.';
  return shipDepartureBlocker(campaign);
}

/** Von welcher Welt das Schiff der Gruppe startet: wo es steht, ohne eigenen Ort beim Aufenthaltsort der Gruppe. */
export function launchWorld(campaign: Campaign): string | undefined {
  const ship = shipOf(campaign);
  if (!ship) return undefined;
  return ship.place?.world ?? campaign.location?.world;
}

/**
 * Wo das Schiff zur Zeit `t` startet: auf einer Kreisbahn mit doppeltem Radius um die Welt, gegen den
 * Uhrzeigersinn, oberhalb von ihr; ist die Welt ein Mond, mitbewegt mit ihm. Ohne Körper ruhend in
 * 20.000 km Abstand.
 */
export function startOrbit(hexes: readonly Hex[], worldId: string, t: number): { readonly position: Vec; readonly velocity: Vec } {
  const scene = sceneOf(hexes, worldId);
  const moon = scene.moons.find((m) => m.world === worldId);
  const at = originAt(scene, worldId, t);
  const body = moon ? moon.body : scene.body;
  if (body === undefined) return { position: add(at.position, { x: 0, y: BELT_START_KM }), velocity: at.velocity };
  const r = 2 * body.radius;
  return { position: add(at.position, { x: 0, y: r }), velocity: add(at.velocity, { x: -Math.sqrt(body.gm / r), y: 0 }) };
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
  /** Ist eine Einheit gelandet, die Welt; der Systemflug ist dann zu Ende. */
  readonly landed?: string;
}

/**
 * Führt die Raumrunde aus: alle Einheiten zugleich 1.000 Sekunden mit ihrem Schubvektor. Danach hängt
 * jede ihren alten Ort an die Spur, der Schub ist leer, die Raumrunde eins weiter. Überschreitet die
 * Dauer volle 24 Stunden, vergeht ein Tag wie mit „Tage vergehen“.
 */
export function runRound(campaign: Campaign, clock: Clock, every = 2): RoundRun {
  const flight = activeFlight(campaign);
  const scene = sceneOf(campaign.hexes, flight.world);
  const t = flightTime(campaign, flight);
  const runs = flight.units.map((u) => propagate(scene, u, u.thrust, ROUND_STEPS, ROUND_STEPS, t));
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
  // Gelandet: Der Systemflug endet, die Gruppe ist auf dieser Welt (Owner, 21. November 2026).
  const landed = runs.map((r) => r.at(-1)!.landedOn).find((w) => w !== undefined);
  if (landed !== undefined) return { campaign: placeGroup(shipArrives(endFlight(result), landed), landed, clock), frames, landed };
  return { campaign: result, frames };
}

/** Beendet den Systemflug; angebrochene Tage verfallen. */
export function endFlight(campaign: Campaign): Campaign {
  activeFlight(campaign);
  return without(campaign, 'flight');
}

/** Was die Bahnvorschau einer Einheit zeigt: diese Raumrunde mit Schub, danach fünf ohne; Orte von `origin` aus gesehen. */
export interface Preview {
  readonly now: readonly Vec[];
  readonly after: readonly Vec[];
  /** In welcher Raumrunde ab jetzt (0 = diese) sie aufschlüge; fehlt, wenn nicht. */
  readonly impact?: number;
  /** In welcher Raumrunde ab jetzt sie landete (langsam aufsetzen) und wo; fehlt, wenn nicht. */
  readonly landing?: { readonly round: number; readonly world: string };
}

/** Raumrunden, die die Bahnvorschau ohne Schub vorausrechnet. */
export const PREVIEW_ROUNDS = 5;

/** Die Bahnvorschau einer Einheit ab der Zeit `t` mit einem (vielleicht nur gezogenen) Schubvektor; alle `every` Schritte ein Punkt. */
export function previewOf(scene: Scene, unit: State, thrust: Vec | undefined, t = 0, every = 2, origin = scene.center): Preview {
  const absolute = propagate(scene, unit, thrust, ROUND_STEPS * (1 + PREVIEW_ROUNDS), ROUND_STEPS, t);
  const states = absolute.map((s, i) => ({ ...s, position: sub(s.position, originAt(scene, origin, t + i * STEP_SECONDS).position) }));
  const now: Vec[] = [];
  const after: Vec[] = [];
  let impact: number | undefined;
  let landing: Preview['landing'];
  states.forEach((s, i) => {
    if (impact === undefined && s.crashed && !unit.crashed) impact = Math.floor(Math.max(0, i - 1) / ROUND_STEPS);
    if (landing === undefined && s.landedOn !== undefined) landing = { round: Math.floor(Math.max(0, i - 1) / ROUND_STEPS), world: s.landedOn };
    if (i <= ROUND_STEPS) {
      if (i % every === 0 || i === ROUND_STEPS) now.push(s.position);
    } else if ((i - ROUND_STEPS) % (every * 2) === 0) after.push(s.position);
    if (i === ROUND_STEPS) after.push(s.position);
  });
  return { now, after, ...(impact === undefined ? {} : { impact }), ...(landing === undefined ? {} : { landing }) };
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

/** Die Marken einer Einheit des laufenden Flugs, gegenüber der Welt der Raumkarte (prograd heißt: schneller um sie herum). */
export function marksOf(campaign: Campaign, unit: SpaceUnit): readonly ThrustMark[] {
  const flight = activeFlight(campaign);
  const at = originAt(sceneOf(campaign.hexes, flight.world), flight.world, flightTime(campaign, flight));
  return thrustMarks({ position: sub(unit.position, at.position), velocity: sub(unit.velocity, at.velocity), crashed: unit.crashed });
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
