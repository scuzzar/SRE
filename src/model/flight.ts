import type { Campaign } from './campaign';
import { DomainError } from './errors';
import type { Clock } from './ports';
import { shipDesignOf } from './reference';
import { hexById, hexIdOfWorld, worldById, worldOf, type Hex, type World } from './sector';
import { gravityOf, radiusOf } from './star-system';
import { changeShip, craftOf, freeCargoOf, shipById, shipOf, vesselsOf, without, type Ship } from './ship';
import { passTime, START_DAY } from './time';
import { placeGroup } from './upkeep';
import { chooseLanding, needsLanding, shipArrives, shipDepartureBlocker } from './landing';
import type { Random } from './ports';
import { battleRunning, breakOffBattle, checkDamage, foesControlDamage, foesFire, foesWillFire, planFoe, settleBattle, unitMaxG, type Intent, type ShipDamage } from './space-combat';
import { worldPlace } from './place';

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

/** Was sich auf der Raumkarte frei bewegt: eigene Schiffe und Small Craft, und fremde Schiffe (Domänenmodell: `SpaceUnit`). */
export interface SpaceUnit {
  /** Das Schiff oder Small Craft der Kampagne; fehlt bei einem fremden Schiff (2026-11-21h). */
  readonly ship?: string;
  /** Fremdes Schiff: Standardentwurf, Name, Absicht (fehlt beim Wrack) und Schaden (2026-11-21h). */
  readonly design?: string;
  readonly name?: string;
  readonly intent?: Intent;
  readonly damage?: ShipDamage;
  /**
   * Die Hardpoints, die in dieser Raumrunde schon gefeuert haben (2026-11-23, Raumkampf-Interface):
   * die Stellen in `Ship.turrets`. Fehlt er, hat keiner gefeuert (ein Hardpoint feuert je Raumrunde
   * einmal; SR 32).
   */
  readonly firedTurrets?: readonly number[];
  /**
   * Hat in dieser Raumrunde schon zurückgefeuert (2026-11-23): Mit dem Programm *Return Fire* feuert
   * eine beschossene Einheit einmal je Raumrunde zurück, auch wenn sie schon gefeuert hat.
   */
  readonly returned?: boolean;
  readonly position: Vec;
  readonly velocity: Vec;
  /** Der Schubvektor der laufenden Raumrunde in G; fehlt er, fliegt die Einheit ballistisch. */
  readonly thrust?: Vec;
  /**
   * Der **Andockflug** (2026-11-23c): Die Einheit steuert in der nächsten Bewegung den Ort an, an dem
   * ihr Mutterschiff stehen wird, und dockt dort an, wenn sie näher als 100 km an ihm steht. Ein
   * selbst gesetzter Schub hebt ihn auf; reichte der Schub nicht, bleibt der Flug bestehen.
   */
  readonly docking?: boolean;
  /** Der Andockflug geht zum Highport, nicht zum Mutterschiff (`SpaceUnit.dockAt`, 2026-11-28b): die Nummer seiner Stadt. */
  readonly dockAt?: number;
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
  /**
   * Phase der laufenden Raumrunde (2026-11-23, Raumkampf-Interface): `thrust` = Schub wählen,
   * `fire` = feuern. Im Raumkampf rückt die Raumrunde erst nach dem Feuer weiter; fehlt sie,
   * steht das Blatt in der Schubphase (alte Speicherstände).
   */
  readonly phase?: BattlePhase;
  /** Die Einheit der Gruppe, als Id ihres Schiffs (2026-11-21b): Nur sie landet. */
  readonly party: string;
  /**
   * Die Reise, die eine Begegnung beim Start von der Welt unterbrach (2026-11-22b): ihr Ziel, das Feld
   * des Sprungs (`jumpTo`) oder die Welt der Reise im System (`travelTo`). Im Domänenmodell der Pfeil
   * `departure` auf den `SpaceBattle`; hier das Ziel selbst.
   */
  readonly departure?: Departure;
  readonly units: readonly SpaceUnit[];
}

/** Phase der Raumrunde im Raumkampf (2026-11-23): Schub wählen oder feuern. */
export type BattlePhase = 'thrust' | 'fire';
export const battlePhases = ['thrust', 'fire'] as const;

/** Die Phase der laufenden Raumrunde; ohne Angabe die Schubphase. */
export function phaseOf(flight: SystemFlight): BattlePhase {
  return flight.phase ?? 'thrust';
}

/** Das Ziel einer unterbrochenen Reise (2026-11-22b): genau eins von beiden. */
export interface Departure {
  readonly jumpTo?: string;
  readonly travelTo?: string;
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
  /** Die Mitte ist ein Gasriese: Seine Wolkendecke gilt als Oberfläche, dort schöpft man statt zu landen (2026-11-21f). */
  readonly giant?: boolean;
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
  return { center: center.id, body, moons, rings, ...(center.kind === 'giant' ? { giant: true } : {}) };
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

/** `/maxG`: die G des Maneuver Drive des Schiffs, nach dem Schaden (2026-11-21h). */
export function maxGOf(campaign: Campaign, unit: SpaceUnit): number {
  return unitMaxG(campaign, unit);
}

/** Die Stelle der Einheit der Gruppe in `units` (2026-11-21b); von ihr aus wird im Raumkampf gefeuert, auf sie zielen fremde Schiffe. */
export function partyIndexOf(flight: SystemFlight): number {
  return flight.units.findIndex((u) => u.ship !== undefined && u.ship === flight.party);
}

/** Ob der Entwurf des Schiffs einer Einheit stromlinienförmig ist (kann an Gasriesen schöpfen, SR 32). */
export function streamlinedOf(campaign: Campaign, unit: SpaceUnit): boolean {
  return unit.ship !== undefined && shipDesignOf(shipById(campaign, unit.ship).design).streamlined;
}

/**
 * `/elapsed`: Sekunden seit Beginn des Systemflugs. In der Feuerphase (2026-11-23) ist die Bewegung
 * der Raumrunde schon gelaufen, die Raumrunde aber noch nicht weitergerückt – die Sekunde zählt die
 * Feuerphase dazu, damit Ort und Schwerkraft für alle nach dem Feuer rechnen.
 */
export function elapsedOf(flight: SystemFlight): number {
  return (flight.round - 1) * ROUND_SECONDS + (phaseOf(flight) === 'fire' ? ROUND_SECONDS : 0);
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

/** Die Körper der Szene zur Zeit `t`: wo sie stehen und wie schnell sie sich bewegen. */
function bodiesAt(scene: Scene, t: number): { body: Body; world: string; at: Vec; velocity: Vec; giant?: boolean }[] {
  const bodies: { body: Body; world: string; at: Vec; velocity: Vec; giant?: boolean }[] = [];
  if (scene.body) bodies.push({ body: scene.body, world: scene.center, at: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, ...(scene.giant ? { giant: true } : {}) });
  for (const moon of scene.moons) {
    if (!moon.body) continue;
    const m = moonAt(moon, t);
    bodies.push({ body: moon.body, world: moon.world, at: m.position, velocity: m.velocity });
  }
  return bodies;
}

/** Mit dieser Sinkgeschwindigkeit setzt die Landeautomatik auf, in km/s (sicher unter `LANDING_KMS`). */
export const AUTO_TOUCHDOWN_KMS = 1;

/**
 * Die Landeautomatik (Owner, 21. November 2026): Führt die Bahn auf die Oberfläche eines Körpers (der
 * tiefste Punkt der Bahn um ihn liegt unter seiner Oberfläche) und ist der Weg bis dorthin gerade so
 * lang, wie das Schiff mit seinem höchsten Schub zum Abbremsen braucht, bremst es selbst: mit vollem
 * Schub gegen die Bewegung gegenüber dem Körper. Der eingestellte Schub ruht dann. `undefined`: Die
 * Automatik greift nicht ein. Am Gasriesen fliegt sie nur mit Stromlinie mit (Schöpfen, 2026-11-21f).
 */
export function autoBrake(scene: Scene, state: State, t: number, maxG: number, streamlined = false): Vec | undefined {
  const brake = maxG * G_KMS2;
  for (const { body, at, velocity, giant } of bodiesAt(scene, t)) {
    if (giant && !streamlined) continue;
    const d = sub(state.position, at);
    const r = lengthOf(d);
    const h = r - body.radius;
    // Nur in der Nähe: höchstens drei Radien über der Oberfläche.
    if (h <= 0 || h > 3 * body.radius) continue;
    const v = sub(state.velocity, velocity);
    const s = lengthOf(v);
    const closing = -(d.x * v.x + d.y * v.y) / r;
    // Sinkt das Schiff schon langsam genug, lässt die Automatik es weiter sinken.
    if (closing <= AUTO_TOUCHDOWN_KMS || s < EPS) continue;
    // Der tiefste Punkt der Bahn um diesen Körper (Zweikörper): r_p = L² / (μ (1 + e)).
    const mu = body.gm;
    const L = Math.abs(d.x * v.y - d.y * v.x);
    const energy = (s * s) / 2 - mu / r;
    const e = Math.sqrt(Math.max(0, 1 + (2 * energy * L * L) / (mu * mu)));
    if ((L * L) / (mu * (1 + e)) > body.radius) continue;
    // Bremsweg zur Oberfläche: die Annäherung muss weg, gegen die Schwerkraft dort; ein Schritt Vorlauf.
    const net = (brake * closing) / s - mu / (body.radius * body.radius);
    const stopping = net > 0 ? (closing * closing - AUTO_TOUCHDOWN_KMS * AUTO_TOUCHDOWN_KMS) / (2 * net) : Infinity;
    if (stopping + 2 * closing * STEP_SECONDS < h) continue;
    return scale(v, -maxG / s);
  }
  return undefined;
}

/** Freie Sichtlinie von `a` nach `b` zur Zeit `t`: Kein Körper liegt dazwischen (2026-11-21h). */
export function lineOfSight(scene: Scene, a: Vec, b: Vec, t: number): boolean {
  const ab = sub(b, a);
  const len2 = ab.x * ab.x + ab.y * ab.y;
  for (const { body, at } of bodiesAt(scene, t)) {
    const k = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((at.x - a.x) * ab.x + (at.y - a.y) * ab.y) / len2));
    if (lengthOf(sub(add(a, scale(ab, k)), at)) < body.radius) return false;
  }
  return true;
}

/** Liegt `p` zur Zeit `t` in einem Körper? Dann der Ort auf seiner Oberfläche. */
function inside(scene: Scene, p: Vec, t: number): { readonly surface: Vec; readonly world: string; readonly velocity: Vec; readonly giant: boolean } | undefined {
  for (const { body, world, at, velocity, giant } of bodiesAt(scene, t)) {
    const d = sub(p, at);
    const r = lengthOf(d);
    if (r < body.radius) return { surface: add(at, scale(d, body.radius / Math.max(r, EPS))), world, velocity, giant: giant === true };
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
  /** Langsam aufgesetzt (höchstens `LANDING_KMS`): auf dieser Welt gelandet bzw. am Gasriesen eingetaucht; nur in der Rechnung, nie gespeichert. */
  readonly landedOn?: string;
  /** Mit `landedOn`: es war ein Gasriese, das Schiff schöpft (2026-11-21f). */
  readonly skims?: boolean;
}

/**
 * Ein Schritt von `STEP_SECONDS` ab der Zeit `t` mit *Velocity Verlet*: Schwerkraft am alten und am
 * neuen Ort (die Monde dort, wo sie dann stehen), Schub (in G) gleichmäßig über den Schritt. Gerät
 * die Einheit unter die Oberfläche eines Körpers, schlägt sie auf. Am Gasriesen taucht ein Schiff mit
 * Stromlinie (`streamlined`) langsam ein und schöpft; ohne Stromlinie schlägt es auf (2026-11-21f).
 */
export function step(scene: Scene, state: State, thrust: Vec | undefined, t = 0, maxG?: number, land = true, streamlined = false): State {
  if (state.crashed || state.landedOn !== undefined) return state;
  const dt = STEP_SECONDS;
  // Mit `maxG` fliegt die Landeautomatik mit (ein Schiff); sie hat Vorrang vor dem eingestellten Schub.
  const used = (maxG === undefined ? undefined : autoBrake(scene, state, t, maxG, streamlined)) ?? thrust;
  const push = used === undefined ? { x: 0, y: 0 } : scale(used, G_KMS2);
  const a0 = add(gravityAt(scene, state.position, t), push);
  const position = add(add(state.position, scale(state.velocity, dt)), scale(a0, 0.5 * dt * dt));
  const a1 = add(gravityAt(scene, position, t + dt), push);
  const velocity = add(state.velocity, scale(add(a0, a1), 0.5 * dt));
  const contact = inside(scene, position, t + dt);
  if (contact) {
    // Langsam aufgesetzt ist gelandet, schneller aufgeschlagen; ohne die Gruppe landet keine Einheit (2026-11-21b).
    // Am Gasriesen schöpft ein Schiff mit Stromlinie, statt zu landen (2026-11-21f).
    const slow = land && lengthOf(sub(velocity, contact.velocity)) <= LANDING_KMS;
    if (slow && contact.giant && streamlined) return { position: contact.surface, velocity: contact.velocity, crashed: false, landedOn: contact.world, skims: true };
    if (slow && !contact.giant) return { position: contact.surface, velocity: contact.velocity, crashed: false, landedOn: contact.world };
    return { position: contact.surface, velocity: { x: 0, y: 0 }, crashed: true };
  }
  return { position, velocity, crashed: false };
}

/**
 * Rechnet `steps` Schritte ab der Zeit `t` und gibt alle Zwischenstände zurück (der erste ist der
 * Anfang). Der Schub gilt für die ersten `thrustSteps` Schritte (eine Raumrunde), danach ballistisch.
 */
export function propagate(scene: Scene, start: State, thrust: Vec | undefined, steps: number, thrustSteps = steps, t = 0, maxG?: number, land = true, streamlined = false): readonly State[] {
  const states: State[] = [start];
  let state = start;
  for (let i = 0; i < steps; i++) {
    state = step(scene, state, i < thrustSteps ? thrust : undefined, t + i * STEP_SECONDS, maxG, land, streamlined);
    states.push(state);
  }
  return states;
}

/** Wie weit 1 G den Endpunkt einer Raumrunde verschiebt, in km: ½ · 10 m/s² · (1.000 s)² = 5.000 km. */
export const REACH_PER_G = 0.5 * G_KMS2 * ROUND_SECONDS * ROUND_SECONDS;

/** Wo die Einheit am Ende dieser Raumrunde ohne Schub stünde (der Punkt „ohne Schub“ der Zieleingabe, 2026-11-22). */
export function coastOf(scene: Scene, state: State, t: number): Vec {
  return propagate(scene, state, undefined, ROUND_STEPS, ROUND_STEPS, t, undefined, false).at(-1)!.position;
}

/**
 * Der Schubvektor (in G), mit dem die Einheit am Ende dieser Raumrunde bei `target` steht (Zieleingabe wie
 * bei den Vektorregeln von Mayday, Owner 2026-11-22: man zieht vom Punkt „ohne Schub“ aus, und wohin man
 * zieht, dort steht das Schiff nach der Runde). Gerechnet mit der echten Schwerkraft, in drei Schritten
 * angenähert; höchstens `maxG` (reicht er nicht, voller Schub in diese Richtung).
 */
export function thrustToward(scene: Scene, state: State, target: Vec, t: number, maxG: number): Vec | undefined {
  let thrust: Vec = { x: 0, y: 0 };
  for (let k = 0; k < 3; k++) {
    const end = propagate(scene, state, thrust, ROUND_STEPS, ROUND_STEPS, t, undefined, false).at(-1)!.position;
    thrust = add(thrust, scale(sub(target, end), 1 / REACH_PER_G));
    const g = lengthOf(thrust);
    if (g > maxG) thrust = scale(thrust, maxG / g);
  }
  return lengthOf(thrust) < EPS ? undefined : thrust;
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
 * Das eigene Schiff oder Small Craft, bei dem die Gruppe steht und mit dem sie abfliegen kann
 * (2026-11-21b): zuerst das aktive Schiff, sonst ein Beiboot, das am Ort der Gruppe gelandet ist.
 * Beiboote an Bord fliegen mit ihrem Mutterschiff.
 */
export function groupVessel(campaign: Campaign): Ship | undefined {
  return vesselsOf(campaign).find((v) => !v.aboard && !v.inOrbit && shipDepartureBlocker(campaign, v) === undefined && (v.mother === undefined || v.place !== undefined));
}

/**
 * Beginnt einen Systemflug auf der Raumkarte der Welt, auf der die Gruppe ist, mit dem eigenen Schiff
 * oder einem Small Craft, bei dem sie steht (2026-11-21b). Es startet auf einer Kreisbahn mit dem
 * doppelten Weltradius gegen den Uhrzeigersinn, oberhalb der Welt (dort verdeckt es das Ziehblatt
 * nicht); bei Größe 0 ruhend in 20.000 km Abstand. Eigene Schiffe in der Umlaufbahn dieser Welt kommen
 * dazu, auf einer Kreisbahn mit dem dreifachen Weltradius (weitere je einen halben Radius höher).
 */
export function startFlight(campaign: Campaign, world: string, clock: Clock): Campaign {
  const blocker = flightStartBlocker(campaign, world);
  if (blocker) throw new DomainError(blocker);
  const vessel = groupVessel(campaign)!;
  const t = dayStart(campaign.day);
  // Ablegen am Highport (2026-11-28b): Die Einheit beginnt am Ort der Station, mit ihrer Geschwindigkeit.
  const hp = worldById(campaign.hexes, world)?.map?.highport;
  const where = vessel.place ?? campaign.location;
  const station = hp !== undefined && where?.world === world && where.city === hp ? stationAtWorld(campaign.hexes, world) : undefined;
  const start = station ? stationAt(station, t) : startOrbit(campaign.hexes, world, t);
  const units: SpaceUnit[] = [{ ship: vessel.id, ...start, crashed: false, track: [] }];
  vesselsOf(campaign)
    .filter((v) => v.inOrbit && v.place?.world === world)
    .forEach((v, i) => units.push({ ship: v.id, ...startOrbit(campaign.hexes, world, t, 3 + i / 2), crashed: false, track: [] }));
  return { ...campaign, flight: { world, startedAt: clock.now(), round: 1, party: vessel.id, units } };
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
  if (groupVessel(campaign) === undefined) return shipDepartureBlocker(campaign) ?? 'Die Gruppe ist bei keinem eigenen Schiff.';
  return undefined;
}

/** Von welcher Welt die Gruppe startet: wo ihr Schiff oder Small Craft steht, ohne eigenen Ort beim Aufenthaltsort der Gruppe. */
export function launchWorld(campaign: Campaign): string | undefined {
  const ship = groupVessel(campaign) ?? shipOf(campaign);
  if (!ship) return undefined;
  return ship.place?.world ?? campaign.location?.world;
}

/**
 * Wo das Schiff zur Zeit `t` startet: auf einer Kreisbahn mit doppeltem Radius um die Welt, gegen den
 * Uhrzeigersinn, oberhalb von ihr; ist die Welt ein Mond, mitbewegt mit ihm. Ohne Körper ruhend in
 * 20.000 km Abstand.
 */
export function startOrbit(hexes: readonly Hex[], worldId: string, t: number, radii = 2): { readonly position: Vec; readonly velocity: Vec } {
  const scene = sceneOf(hexes, worldId);
  const moon = scene.moons.find((m) => m.world === worldId);
  const at = originAt(scene, worldId, t);
  const body = moon ? moon.body : scene.body;
  if (body === undefined) return { position: add(at.position, { x: 0, y: (BELT_START_KM * radii) / 2 }), velocity: at.velocity };
  const r = radii * body.radius;
  return { position: add(at.position, { x: 0, y: r }), velocity: add(at.velocity, { x: -Math.sqrt(body.gm / r), y: 0 }) };
}

/**
 * Wo das Schiff bei einer Begegnung bei der Ankunft auftaucht (2026-11-22b): an der Sprunggrenze,
 * 100 Durchmesser der Welt von ihr entfernt in Richtung `angle` (Grad), ruhend gegenüber der Welt
 * (bei einem Mond mitbewegt); ohne Körper in 20.000 km.
 */
export function arrivalPoint(hexes: readonly Hex[], worldId: string, t: number, angle: number): { readonly position: Vec; readonly velocity: Vec } {
  const scene = sceneOf(hexes, worldId);
  const moon = scene.moons.find((m) => m.world === worldId);
  const at = originAt(scene, worldId, t);
  const body = moon ? moon.body : scene.body;
  const r = body === undefined ? BELT_START_KM : 200 * body.radius;
  const a = (angle * Math.PI) / 180;
  return { position: add(at.position, { x: r * Math.cos(a), y: r * Math.sin(a) }), velocity: at.velocity };
}

/**
 * Beginnt einen Systemflug bei der Ankunft an `world` (2026-11-22b): mit dem eigenen Schiff, das eben
 * angekommen ist, an der Sprunggrenze (`arrivalPoint`). Der Landeplatz wartet, solange er läuft.
 */
export function startArrivalFlight(campaign: Campaign, world: string, angle: number, clock: Clock): Campaign {
  if (campaign.flight !== undefined) throw new DomainError('Es läuft schon ein Systemflug.');
  const ship = shipOf(campaign);
  if (ship === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  const unit: SpaceUnit = { ship: ship.id, ...arrivalPoint(campaign.hexes, world, dayStart(campaign.day), angle), crashed: false, track: [] };
  return { ...campaign, flight: { world, startedAt: clock.now(), round: 1, party: ship.id, units: [unit] } };
}

/** DM auf den Fehlsprung nahe an einem Körper der Raumkarte (SR 28, 2026-11-22b): innerhalb 10 Durchmesser +15, innerhalb 100 +5; der höchste zählt. */
export function jumpLimitDm(scene: Scene, p: Vec, t: number): number {
  let dm = 0;
  for (const { body, at } of bodiesAt(scene, t)) {
    const diameters = lengthOf(sub(p, at)) / (2 * body.radius);
    if (diameters < 10) dm = Math.max(dm, 15);
    else if (diameters < 100) dm = Math.max(dm, 5);
  }
  return dm;
}

/** Setzt den Schubvektor einer Einheit für die laufende Raumrunde (undefined: kein Schub). */
export function setThrust(campaign: Campaign, index: number, thrust: Vec | undefined): Campaign {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) throw new DomainError('Diese Einheit gibt es nicht.');
  if (unit.crashed && thrust !== undefined) throw new DomainError('Eine aufgeschlagene Einheit gibt keinen Schub.');
  const normal = normalThrust(thrust, maxGOf(campaign, unit));
  // Wer selbst steuert, gibt den Andockflug auf (2026-11-23c).
  const rest = without(unit, 'thrust', 'docking', 'dockAt');
  const next: SpaceUnit = normal === undefined ? rest : { ...rest, thrust: normal };
  return { ...campaign, flight: { ...flight, units: flight.units.map((u, i) => (i === index ? next : u)) } };
}

/** Die Zwischenstände einer Raumrunde je Einheit, alle `every` Schritte (für die Wiedergabe). */
export interface RoundRun {
  readonly campaign: Campaign;
  readonly frames: readonly (readonly Vec[])[];
  /** Ist eine Einheit gelandet, die Welt; der Systemflug ist dann zu Ende. */
  readonly landed?: string;
  /** Ein Schiff hat am Gasriesen geschöpft (2026-11-21f). */
  readonly skimmed?: boolean;
  /** Ein Small Craft ist mit dieser Bewegung angekommen und hat angedockt (2026-11-23c). */
  readonly docked?: string;
  /** Eine Einheit hat mit dieser Bewegung am Highport angedockt (2026-11-28b): sein Name. */
  readonly highport?: string;
  /** Das eigene Schiff ist im Raumkampf zerstört; der Systemflug ist zu Ende (2026-11-21h). */
  readonly lost?: boolean;
}

/**
 * Führt die Raumrunde aus: alle Einheiten zugleich 1.000 Sekunden mit ihrem Schubvektor. Danach hängt
 * jede ihren alten Ort an die Spur, der Schub ist leer, die Raumrunde eins weiter. Überschreitet die
 * Dauer volle 24 Stunden, vergeht ein Tag wie mit „Tage vergehen“.
 */
export function runRound(campaign: Campaign, clock: Clock, random?: Random, every = 2): RoundRun {
  const flight = activeFlight(campaign);
  // In der Feuerphase ist die Bewegung dieser Raumrunde schon gelaufen (2026-11-23a); erst „End Turn“.
  if (phaseOf(flight) === 'fire') throw new DomainError('Die Bewegung dieser Raumrunde ist schon gelaufen; erst „End Turn“.');
  const scene = sceneOf(campaign.hexes, flight.world);
  const t = flightTime(campaign, flight);
  // Fremde Schiffe wählen ihren Schub nach ihrer Absicht (2026-11-21h); nur die Einheit der Gruppe landet,
  // mit der Landeautomatik, und schöpft am Gasriesen (2026-11-21b, 2026-11-21f).
  const thrusts = flight.units.map((u, i) => (u.ship === undefined ? planFoe(campaign, scene, i, t) : u.thrust));
  const runOf = (u: SpaceUnit, thrust: Vec | undefined): readonly State[] =>
    u.ship === flight.party ? propagate(scene, u, u.thrust, ROUND_STEPS, ROUND_STEPS, t, maxGOf(campaign, u), true, streamlinedOf(campaign, u)) : propagate(scene, u, thrust, ROUND_STEPS, ROUND_STEPS, t, undefined, false);
  let runs = flight.units.map((u, i) => runOf(u, thrusts[i]));
  // Andockflug (2026-11-23c): Eine Einheit mit `docking` steuert den Ort an, an dem ihr Mutterschiff
  // nach dieser Bewegung steht, und dockt dort an; ihr eigener Schubpunkt ist ihr dabei gleich.
  const homes = flight.units.flatMap((u, i) => {
    const mother = u.docking === true && u.dockAt === undefined ? flight.units.findIndex((m) => m.ship === campaign.ships.find((s) => s.id === u.ship)?.mother) : -1;
    return mother < 0 ? [] : [{ index: i, mother }];
  });
  // Andockflug zum Highport (2026-11-28b): Ziel ist der Ort der Station nach dieser Bewegung.
  const station = stationOf(campaign);
  const stationEnd = station === undefined ? undefined : stationAt(station, t + ROUND_SECONDS).position;
  const toStation = stationEnd === undefined ? [] : flight.units.flatMap((u, i) => (u.docking === true && u.dockAt !== undefined ? [i] : []));
  for (const index of toStation) {
    const unit = flight.units[index]!;
    const maxG = maxGOf(campaign, unit);
    runs = runs.map((r, k) => (k === index ? propagate(scene, unit, thrustToward(scene, unit, stationEnd!, t, maxG), ROUND_STEPS, ROUND_STEPS, t, maxG, unit.ship === flight.party, streamlinedOf(campaign, unit)) : r));
  }
  for (const home of homes) {
    const unit = flight.units[home.index]!;
    const target = runs[home.mother]!.at(-1)!.position;
    const maxG = maxGOf(campaign, unit);
    runs = runs.map((r, k) => (k === home.index ? propagate(scene, unit, thrustToward(scene, unit, target, t, maxG), ROUND_STEPS, ROUND_STEPS, t, maxG, unit.ship === flight.party, streamlinedOf(campaign, unit)) : r));
  }
  const units = flight.units.map((u, i): SpaceUnit => {
    const end = runs[i]!.at(-1)!;
    // Die Bewegung leert den Schub; in der neuen Feuerphase darf jede Einheit wieder feuern (2026-11-21i).
    const rest = without(u, 'thrust');
    const crashed = end.crashed || (u.ship === undefined && end.landedOn !== undefined);
    return { ...rest, firedTurrets: [], returned: false, position: end.position, velocity: end.velocity, crashed, track: [...u.track, { position: u.position, velocity: u.velocity }] };
  });
  // Im Raumkampf (2026-11-23) bleibt die Raumrunde stehen: erst die Schubphase, dann das Feuer,
  // und „End Turn“ rückt sie weiter. Ohne Raumkampf ist die Runde mit der Bewegung zu Ende.
  const battle = battleRunning(campaign);
  const next: SystemFlight = battle ? { ...flight, units, phase: 'fire' } : { ...flight, round: flight.round + 1, units, phase: 'thrust' };
  let result: Campaign = { ...campaign, flight: next };
  const daysBefore = Math.floor(elapsedOf(flight) / DAY_SECONDS);
  const daysAfter = Math.floor(elapsedOf(next) / DAY_SECONDS);
  for (let d = daysBefore; d < daysAfter; d++) result = passTime(result, { days: 1 }, clock);
  const frames = framesOf(runs, every);
  // Am Gasriesen eingetaucht: Das Schiff schöpft und fliegt weiter (2026-11-21f).
  runs.forEach((r, i) => {
    const end = r.at(-1)!;
    if (end.skims) result = skim(result, i, end.position, clock);
  });
  // Am Ziel angekommen: Der Andockflug ist zu Ende, das Small Craft ist an Bord (2026-11-23c).
  const homeIds = homes.flatMap((home) => (lengthOf(sub(units[home.index]!.position, units[home.mother]!.position)) <= DOCK_KM ? [flight.units[home.index]!.ship!] : []));
  for (const id of homeIds) result = finishDock(result, id);
  // Am Highport angekommen (2026-11-28b): Die Einheit dockt an; war es die der Gruppe, endet der Flug.
  const stationIds = toStation.flatMap((i) => (lengthOf(sub(units[i]!.position, stationEnd!)) <= DOCK_KM ? [flight.units[i]!.ship!] : []));
  const partyDocks = stationIds.includes(flight.party);
  for (const id of stationIds.filter((id) => id !== flight.party)) result = finishHighportDock(result, id, clock);
  const dockedNames = [...homeIds, ...stationIds].map((id) => shipById(campaign, id).name);
  const note = { ...(dockedNames.length === 0 ? {} : { docked: dockedNames[0]! }), ...(stationIds.length > 0 ? { highport: station!.name } : {}) };
  if (partyDocks) return { campaign: finishHighportDock(result, flight.party, clock), frames, landed: flight.world, ...note };
  // Gelandet: Der Systemflug endet, die Gruppe ist auf dieser Welt (Owner, 21. November 2026).
  const landed = runs.map((r) => r.at(-1)!).find((s) => s.landedOn !== undefined && !s.skims)?.landedOn;
  if (landed !== undefined) return { campaign: placeGroup(shipArrives(endFlight(result, clock), landed, flight.party), landed, clock, flight.party), frames, landed, ...note };
  // Ohne Raumkampf (2026-11-23) ist die Raumrunde mit der Bewegung zu Ende, wie bisher. Im Raumkampf
  // folgt erst die Feuerphase; fremde Schiffe feuern am Ende der Raumrunde (`endFirePhase`).
  if (!battle && foesWillFire(result)) {
    if (random === undefined) throw new DomainError('Für das Feuer braucht es Würfel.');
    result = foesFire(result, random, clock);
  }
  const settled = settleBattle(result, clock);
  if (settled.lost) return { campaign: settled.campaign, frames, lost: true, ...note };
  return { campaign: settled.campaign, frames, ...(runs.some((r) => r.at(-1)!.skims) ? { skimmed: true } : {}), ...note };
}

/**
 * „End Turn“ im Raumkampf (2026-11-23, SR 32): Am Ende der Raumrunde feuern die fremden Schiffe, die
 * können und noch nicht gefeuert haben (Retourvente), dann endet der Raumkampf, wo ein Schiff zerstört,
 * kampfunfähig oder entkommen ist. Danach ist die nächste Raumrunde da: Raumrunde eins weiter,
 * Schubphase.
 */
export function endFirePhase(campaign: Campaign, clock: Clock, random: Random): RoundRun {
  // „End Turn“ gibt es nur in der Feuerphase, nach der Bewegung (2026-11-23a).
  if (phaseOf(activeFlight(campaign)) !== 'fire') throw new DomainError('Erst die Bewegung dieser Raumrunde, dann „End Turn“.');
  let result = campaign;
  if (foesWillFire(result)) result = foesFire(result, random, clock);
  // Schiffsbetrieb (Phase 6, 2026-11-22d): Die fremden Schiffe versuchen die Schadenskontrolle.
  result = foesControlDamage(result, random, clock);
  const settled = settleBattle(result, clock);
  if (settled.lost) return { campaign: settled.campaign, frames: [], lost: true };
  const now = activeFlight(settled.campaign);
  return { campaign: { ...settled.campaign, flight: { ...now, round: now.round + 1, phase: 'thrust' } }, frames: [] };
}

/** Die Orte aller Einheiten alle `every` Schritte, für die Wiedergabe. */
function framesOf(runs: readonly (readonly State[])[], every: number): Vec[][] {
  const frames: Vec[][] = [];
  for (let s = 0; s <= ROUND_STEPS; s += every) frames.push(runs.map((r) => r[s]!.position));
  return frames;
}


/** Wie viele Raumrunden das Schöpfen dauert (Hausregel 2026-11-21f: gut 6 Stunden; die SR nennen keine Dauer). */
export const SKIM_ROUNDS = 22;

/**
 * Die Einheit `index` ist an der Stelle `at` in den Gasriesen in der Mitte eingetaucht (2026-11-21f):
 * Der Tank wird mit unraffiniertem Treibstoff voll (Logeintrag, wenn es etwas zu schöpfen gab), das
 * Schöpfen dauert `SKIM_ROUNDS` Raumrunden (die Spur hält dafür die Stelle des Eintauchens), danach
 * steht das Schiff auf der Kreisbahn mit doppeltem Radius über dieser Stelle, gegen den Uhrzeigersinn.
 */
function skim(campaign: Campaign, index: number, at: Vec, clock: Clock): Campaign {
  const flight = activeFlight(campaign);
  const unit = flight.units[index]!;
  const scene = sceneOf(campaign.hexes, flight.world);
  const body = scene.body!;
  const ship = shipById(campaign, unit.ship!);
  const tons = shipDesignOf(ship.design).fuel - ship.fuel;
  const r = 2 * body.radius;
  const d = lengthOf(at) || 1;
  const position = scale(at, r / d);
  const speed = Math.sqrt(body.gm / r);
  const velocity = { x: (-at.y / d) * speed, y: (at.x / d) * speed };
  const dive = { position: at, velocity: { x: 0, y: 0 } };
  const units = flight.units.map((u, i): SpaceUnit => (i === index ? { ...u, position, velocity, crashed: false, track: [...u.track.slice(0, -1), ...Array.from({ length: SKIM_ROUNDS + 1 }, () => dive)] } : u));
  // Die übrigen Einheiten treiben die Raumrunden ballistisch weiter.
  const t = flightTime(campaign, flight);
  const others = units.map((u, i): SpaceUnit => {
    if (i === index || u.crashed) return u;
    const states = propagate(scene, u, undefined, SKIM_ROUNDS * ROUND_STEPS, 0, t, undefined, false);
    const track = Array.from({ length: SKIM_ROUNDS }, (_, k) => ({ position: states[k * ROUND_STEPS]!.position, velocity: states[k * ROUND_STEPS]!.velocity }));
    const end = states.at(-1)!;
    return { ...u, position: end.position, velocity: end.velocity, crashed: end.crashed, track: [...u.track, ...track] };
  });
  const next: SystemFlight = { ...flight, round: flight.round + SKIM_ROUNDS, units: others };
  let result: Campaign = {
    ...campaign,
    flight: next,
    ships: campaign.ships.map((s) => (s.id === ship.id ? { ...s, fuel: s.fuel + tons, unrefined: s.unrefined + tons } : s)),
    log: tons > 0 ? [...campaign.log, { kind: 'skimming', at: clock.now(), day: campaign.day, giant: scene.center, ship: ship.id, tons }] : campaign.log,
  };
  const daysBefore = Math.floor(elapsedOf(flight) / DAY_SECONDS);
  const daysAfter = Math.floor(elapsedOf(next) / DAY_SECONDS);
  for (let k = daysBefore; k < daysAfter; k++) result = passTime(result, { days: 1 }, clock);
  return result;
}

/**
 * Beendet den Systemflug; angebrochene Tage verfallen. Was ohne die Gruppe noch fliegt, ist danach in
 * der Umlaufbahn der Welt des Systemflugs, Ort, Geschwindigkeit und Spur gehen verloren (2026-11-21b);
 * was aufgeschlagen ist, steht auf ihr (in Stufe 1 ohne Folgen). Ein Beiboot der Gruppe, das in diesem
 * Flug ausgesetzt wurde und nicht gelandet ist, steht danach dort, wo die Gruppe ist. Fremde Schiffe
 * verschwinden; ein laufender Raumkampf ist abgebrochen (mit `clock` im Log, 2026-11-21h).
 */
export function endFlight(campaign: Campaign, clock?: Clock): Campaign {
  const flight = activeFlight(campaign);
  let after: Campaign = without(clock === undefined ? campaign : breakOffBattle(campaign, clock), 'flight');
  for (const unit of flight.units) {
    if (unit.ship === undefined) continue;
    after = changeShip(after, unit.ship, (s) => {
      if (unit.ship === flight.party) return s.place === undefined && s.mother !== undefined && campaign.location !== undefined ? { ...without(s, 'aboard', 'inOrbit'), place: campaign.location } : s;
      if (unit.crashed) return { ...without(s, 'aboard', 'inOrbit'), place: worldPlace(flight.world) };
      return { ...without(s, 'aboard'), place: worldPlace(flight.world), inOrbit: true };
    });
  }
  return after;
}

/** Wie nah ein Small Craft seinem Mutterschiff zum Andocken kommen muss, in km (Hausregel aus dem Konzept). */
export const DOCK_KM = 100;

/** Die Einheit und ihr Mutterschiff im Flug; `undefined`, wenn eines von beiden nicht mitfliegt. */
function motherPair(campaign: Campaign, id: string): { readonly craft: SpaceUnit; readonly mother: SpaceUnit } | undefined {
  const flight = campaign.flight;
  if (flight === undefined) return undefined;
  const craft = flight.units.find((u) => u.ship === id);
  const ship = campaign.ships.find((s) => s.id === id);
  const mother = ship?.mother === undefined ? undefined : flight.units.find((u) => u.ship === ship.mother);
  return craft === undefined || mother === undefined ? undefined : { craft, mother };
}

/** Wo die Einheit am Ende dieser Bewegung mit ihrem (vielleicht leeren) Schub stünde. */
function endState(scene: Scene, state: State, thrust: Vec | undefined, t: number): State {
  return propagate(scene, state, thrust, ROUND_STEPS, ROUND_STEPS, t, undefined, false).at(-1)!;
}

/**
 * Was ein Small Craft zum Andocken braucht (2026-11-23c): `g` = so viel G, um den **Andockpunkt** zu
 * erreichen – den Ort, an dem sein Mutterschiff nach dieser Bewegung steht; `maxG` = was das Small
 * Craft höchsten kann; `now` = das Mutterschiff steht schon näher als 100 km, da wird sofort angedockt.
 * Gerechnet wie bei der Zieleingabe des Schubs: vom Punkt „ohne Schub" aus, 5.000 km je G.
 */
export function dockPlan(campaign: Campaign, id: string): { readonly g: number; readonly maxG: number; readonly now: boolean } | undefined {
  const pair = motherPair(campaign, id);
  if (campaign.flight === undefined || pair === undefined) return undefined;
  const scene = sceneOf(campaign.hexes, campaign.flight.world);
  const t = flightTime(campaign, campaign.flight);
  const point = endState(scene, pair.mother, pair.mother.thrust, t).position;
  return { g: lengthOf(sub(point, coastOf(scene, pair.craft, t))) / REACH_PER_G, maxG: maxGOf(campaign, pair.craft), now: lengthOf(sub(pair.craft.position, pair.mother.position)) <= DOCK_KM };
}

/** Steht das Small Craft schon näher als 100 km an seinem Mutterschiff? Dann dockt „Andocken" sofort an. */
export function docksNow(campaign: Campaign, id: string): boolean {
  return dockPlan(campaign, id)?.now === true;
}

/**
 * Warum ein Small Craft jetzt nicht andocken kann; `undefined`, wenn es kann (2026-11-21b, Hausregel
 * 2026-11-23c). Zwei Bedingungen: Das Mutterschiff hat **Platz** – einen der Liegeplätze, für die es
 * gebaut ist (`craft` im Entwurf), oder, wenn alle belegt sind, freien Laderaum für den Rumpf. Und
 * das Small Craft hat genug **Schub**, um den Andockpunkt der nächsten Bewegung zu erreichen; Nähe und
 * Geschwindigkeit für sich sind keine Bedingung (2026-11-23c).
 */
export function dockBlocker(campaign: Campaign, id: string): string | undefined {
  const pair = motherPair(campaign, id);
  const ship = campaign.ships.find((s) => s.id === id);
  const motherShip = ship?.mother === undefined ? undefined : campaign.ships.find((s) => s.id === ship.mother);
  if (pair === undefined || ship === undefined || motherShip === undefined) return 'Das Mutterschiff fliegt nicht mit.';
  if (pair.craft.crashed || pair.mother.crashed) return 'Eine aufgeschlagene Einheit dockt nicht an.';
  const berths = shipDesignOf(motherShip.design).craft.length;
  if (craftOf(campaign, motherShip.id).filter((c) => c.aboard).length >= berths) {
    const hull = shipDesignOf(ship.design).hull;
    const free = freeCargoOf(campaign, motherShip);
    if (hull > free) return `Kein Platz für ${ship.name} in ${motherShip.name}: kein Liegeplatz frei und nur ${free.toLocaleString('de-DE')} t Laderaum offen, ${hull.toLocaleString('de-DE')} t nötig.`;
  }
  const plan = dockPlan(campaign, id)!;
  if (plan.now || plan.g <= plan.maxG) return undefined;
  return `Zu weit weg: ${gText(plan.g)} G bis ${motherShip.name}, ${ship.name} hat ${gText(plan.maxG)} G.`;
}

/** Ein Welttag in Sekunden (Hausregel 2026-11-28b: jede Welt dreht sich in 24 Stunden). */
const WORLD_DAY_S = 86_400;

/** Der Highport auf der Raumkarte (2026-11-28b): seine Stadt, sein Name und seine geostationäre Kreisbahn. */
export interface Station {
  readonly city: number;
  readonly name: string;
  readonly distance: number;
  readonly angle: number;
  readonly omega: number;
  /** Ist die Welt ein Mond, läuft die Station mit ihm. */
  readonly moon?: MoonBody;
}

/**
 * Der Highport der Welt des Systemflugs, wenn sie einen hat und selbst die Mitte der Raumkarte ist:
 * auf der geostationären Bahn `∛(GM × T² / 4π²)` mit einem Welttag von 24 Stunden, die Richtung beim
 * Beginnen aus dem Schlüssel der Welt. Gespeichert wird davon nichts.
 */
export function stationOf(campaign: Campaign): Station | undefined {
  return campaign.flight === undefined ? undefined : stationAtWorld(campaign.hexes, campaign.flight.world);
}

/** Der Highport der Welt `worldId` auf ihrer Raumkarte, auch ohne laufenden Flug. */
export function stationAtWorld(hexes: readonly Hex[], worldId: string): Station | undefined {
  const flight = { world: worldId };
  const world = worldById(hexes, flight.world);
  const hp = world?.map?.highport;
  const city = hp === undefined ? undefined : world!.map!.cities?.[hp];
  const scene = sceneOf(hexes, flight.world);
  const moon = scene.moons.find((m) => m.world === flight.world);
  const body = moon ? moon.body : scene.center === flight.world ? scene.body : undefined;
  if (hp === undefined || city === undefined || body === undefined) return undefined;
  const distance = Math.cbrt((body.gm * WORLD_DAY_S * WORLD_DAY_S) / (4 * Math.PI * Math.PI));
  let hash = 0;
  for (const ch of flight.world) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return { city: hp, name: city.name, distance, angle: ((hash % 360) * Math.PI) / 180, omega: (2 * Math.PI) / WORLD_DAY_S, ...(moon ? { moon } : {}) };
}

/** Wo der Highport zur Zeit `t` steht und wie schnell er sich bewegt (bei einem Mond mit ihm). */
export function stationAt(station: Station, t: number): { readonly position: Vec; readonly velocity: Vec } {
  const own = moonAt({ world: '', body: undefined, distance: station.distance, angle: station.angle, omega: station.omega }, t);
  if (station.moon === undefined) return own;
  const base = moonAt(station.moon, t);
  return { position: add(base.position, own.position), velocity: add(base.velocity, own.velocity) };
}

/** Was eine Einheit zum Andocken am Highport braucht: G zum Andockpunkt, ihr Schub und ob sie schon näher als 100 km ist. */
export function highportPlan(campaign: Campaign, id: string): { readonly g: number; readonly maxG: number; readonly now: boolean } | undefined {
  const flight = campaign.flight;
  const station = stationOf(campaign);
  const unit = flight?.units.find((u) => u.ship === id);
  if (flight === undefined || station === undefined || unit === undefined) return undefined;
  const scene = sceneOf(campaign.hexes, flight.world);
  const t = flightTime(campaign, flight);
  const point = stationAt(station, t + ROUND_SECONDS).position;
  return { g: lengthOf(sub(point, coastOf(scene, unit, t))) / REACH_PER_G, maxG: maxGOf(campaign, unit), now: lengthOf(sub(unit.position, stationAt(station, t).position)) <= DOCK_KM };
}

/** Warum eine eigene Einheit jetzt nicht am Highport andocken kann; `undefined`, wenn sie kann (2026-11-28b, ohne Platzbedingung). */
export function highportDockBlocker(campaign: Campaign, id: string): string | undefined {
  const station = stationOf(campaign);
  if (station === undefined) return 'Hier gibt es keinen Highport.';
  const unit = campaign.flight!.units.find((u) => u.ship === id);
  if (unit === undefined) return 'Diese Einheit fliegt nicht mit.';
  if (unit.crashed) return 'Eine aufgeschlagene Einheit dockt nicht an.';
  const plan = highportPlan(campaign, id)!;
  if (plan.now || plan.g <= plan.maxG) return undefined;
  return `Zu weit weg: ${gText(plan.g)} G bis ${station.name}, ${shipById(campaign, id).name} hat ${gText(plan.maxG)} G.`;
}

/**
 * Dockt eine eigene Einheit am Highport an oder schickt sie auf den Andockflug dorthin (2026-11-28b),
 * wie ein Small Craft am Mutterschiff.
 */
export function dockAtHighport(campaign: Campaign, id: string, clock: Clock): Campaign {
  const flight = activeFlight(campaign);
  const blocker = highportDockBlocker(campaign, id);
  if (blocker) throw new DomainError(blocker);
  const station = stationOf(campaign)!;
  if (!highportPlan(campaign, id)!.now) return { ...campaign, flight: { ...flight, units: flight.units.map((u) => (u.ship === id ? { ...u, docking: true, dockAt: station.city } : u)) } };
  return finishHighportDock(campaign, id, clock);
}

/**
 * Angedockt am Highport: Die Einheit entfällt, ihr Schiff steht am Highport (nicht in der Umlaufbahn).
 * War die Gruppe darin, endet der Systemflug wie nach einer Landung, und die Gruppe ist am Highport.
 */
function finishHighportDock(campaign: Campaign, id: string, clock: Clock): Campaign {
  const flight = activeFlight(campaign);
  const station = stationOf(campaign)!;
  const place = { world: flight.world, city: station.city };
  if (flight.party === id) {
    const landed = placeGroup(shipArrives(endFlight(campaign, clock), flight.world, id), flight.world, clock, id);
    return needsLanding(landed) ? chooseLanding(landed, { city: station.city }) : changeShip({ ...landed, location: place }, id, (s) => ({ ...without(s, 'aboard', 'inOrbit'), place }));
  }
  const docked = changeShip(campaign, id, (s) => ({ ...without(s, 'aboard', 'inOrbit'), place }));
  return { ...docked, flight: { ...flight, units: flight.units.filter((u) => u.ship !== id) } };
}

/** G so auf 0,1 gerundet, wie die App Schub anzeigt. */
function gText(g: number): string {
  return (Math.round(g * 10) / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 });
}

/** Die Beiboote an Bord der Einheit der Gruppe, die sie jetzt aussetzen kann (2026-11-21b). */
export function launchableCraft(campaign: Campaign): readonly Ship[] {
  const flight = campaign.flight;
  if (flight === undefined) return [];
  const party = flight.units.find((u) => u.ship === flight.party);
  if (party === undefined || party.crashed || party.ship === undefined) return [];
  // ⚑ Ein Beiboot je Raumrunde: Steht noch eines genau dort, wo das Mutterschiff ist, ist es gerade erst ausgesetzt.
  if (flight.units.some((u) => u !== party && u.position.x === party.position.x && u.position.y === party.position.y && campaign.ships.find((s) => s.id === u.ship)?.mother === party.ship)) return [];
  return craftOf(campaign, party.ship).filter((c) => c.aboard);
}

/**
 * Setzt ein Beiboot aus (2026-11-21b): Es wird eine eigene Einheit mit Ort, Geschwindigkeit und Spur
 * des Mutterschiffs, ist nicht mehr an Bord, und die Gruppe steigt mit um.
 */
export function launchCraft(campaign: Campaign, id: string): Campaign {
  const flight = activeFlight(campaign);
  if (!launchableCraft(campaign).some((c) => c.id === id)) throw new DomainError('Dieses Beiboot lässt sich jetzt nicht aussetzen.');
  const mother = flight.units.find((u) => u.ship === flight.party)!;
  const unit: SpaceUnit = { ship: id, position: mother.position, velocity: mother.velocity, crashed: false, track: mother.track };
  return { ...changeShip(campaign, id, (s) => without(s, 'aboard')), flight: { ...flight, party: id, units: [...flight.units, unit] } };
}

/** Die Small Craft im Flug, die jetzt andocken können. */
export function dockableCraft(campaign: Campaign): readonly Ship[] {
  if (campaign.flight === undefined) return [];
  return campaign.flight.units.flatMap((u) => {
    const ship = campaign.ships.find((s) => s.id === u.ship);
    return ship?.mother !== undefined && dockBlocker(campaign, ship.id) === undefined ? [ship] : [];
  });
}

/**
 * Dockt ein Small Craft an seinem Mutterschiff an oder schickt es auf den **Andockflug**
 * (2026-11-21b, 2026-11-23c): Steht das Mutterschiff schon näher als 100 km, entfällt die Einheit
 * sofort, es ist an Bord, und saß die Gruppe darin, sitzt sie jetzt im Mutterschiff. Weiter weg setzt
 * der Knopf den Andockflug: erst mit der nächsten Bewegung wird angeflogen und angedockt.
 */
export function dockCraft(campaign: Campaign, id: string): Campaign {
  const flight = activeFlight(campaign);
  const blocker = dockBlocker(campaign, id);
  if (blocker) throw new DomainError(blocker);
  if (!docksNow(campaign, id)) {
    return { ...campaign, flight: { ...flight, units: flight.units.map((u) => (u.ship === id ? { ...u, docking: true } : u)) } };
  }
  return finishDock(campaign, id);
}

/** Hebt den Andockflug eines Small Craft auf; es fliegt wieder, wie ihm befohlen (2026-11-23c). */
export function cancelDock(campaign: Campaign, id: string): Campaign {
  const flight = activeFlight(campaign);
  return { ...campaign, flight: { ...flight, units: flight.units.map((u) => (u.ship === id ? without(u, 'docking', 'dockAt') : u)) } };
}

/** Macht den Andockflug zu Ende: die Einheit entfällt, sie ist an Bord, die Gruppe wechselt hinüber. */
function finishDock(campaign: Campaign, id: string): Campaign {
  const flight = activeFlight(campaign);
  const mother = shipById(campaign, id).mother!;
  const docked = changeShip(campaign, id, (s) => ({ ...without(s, 'place', 'inOrbit'), aboard: true }));
  return { ...docked, flight: { ...flight, party: flight.party === id ? mother : flight.party, units: flight.units.filter((u) => u.ship !== id) } };
}

/** Was die Bahnvorschau einer Einheit zeigt: diese Raumrunde mit Schub, danach fünf ohne; Orte von `origin` aus gesehen. */
export interface Preview {
  readonly now: readonly Vec[];
  readonly after: readonly Vec[];
  /** In welcher Raumrunde ab jetzt (0 = diese) sie aufschlüge; fehlt, wenn nicht. */
  readonly impact?: number;
  /** In welcher Raumrunde ab jetzt sie landete (langsam aufsetzen) und wo; `skims`: am Gasriesen, sie schöpfte; fehlt, wenn nicht. */
  readonly landing?: { readonly round: number; readonly world: string; readonly skims?: boolean };
}

/** Raumrunden, die die Bahnvorschau ohne Schub vorausrechnet. */
export const PREVIEW_ROUNDS = 5;

/** Die Bahnvorschau einer Einheit ab der Zeit `t` mit einem (vielleicht nur gezogenen) Schubvektor; alle `every` Schritte ein Punkt. */
export function previewOf(scene: Scene, unit: State, thrust: Vec | undefined, t = 0, every = 2, origin = scene.center, maxG?: number, land = true, streamlined = false): Preview {
  const absolute = propagate(scene, unit, thrust, ROUND_STEPS * (1 + PREVIEW_ROUNDS), ROUND_STEPS, t, maxG, land, streamlined);
  const states = absolute.map((s, i) => ({ ...s, position: sub(s.position, originAt(scene, origin, t + i * STEP_SECONDS).position) }));
  const now: Vec[] = [];
  const after: Vec[] = [];
  let impact: number | undefined;
  let landing: Preview['landing'];
  states.forEach((s, i) => {
    if (impact === undefined && s.crashed && !unit.crashed) impact = Math.floor(Math.max(0, i - 1) / ROUND_STEPS);
    if (landing === undefined && s.landedOn !== undefined) landing = { round: Math.floor(Math.max(0, i - 1) / ROUND_STEPS), world: s.landedOn, ...(s.skims ? { skims: true } : {}) };
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
  if (!flight.units.some((u) => u.ship === flight.party)) throw new DomainError('Die Gruppe sitzt in keiner Einheit des Systemflugs.');
  const own = flight.units.flatMap((u) => (u.ship === undefined ? [] : [u.ship]));
  if (new Set(own).size !== own.length) throw new DomainError('Ein Schiff fliegt doppelt im Systemflug.');
  for (const unit of flight.units) {
    // Eigene Einheiten haben ein Schiff, fremde einen Entwurf (2026-11-21h).
    if ((unit.ship === undefined) === (unit.design === undefined)) throw new DomainError('Eine Einheit ist entweder ein eigenes Schiff oder ein fremdes mit Entwurf.');
    if (unit.design !== undefined) shipDesignOf(unit.design);
    if (unit.damage !== undefined) checkDamage(unit.damage, shipDesignOf(unit.design ?? '').turrets.length);
    if (unit.ship !== undefined && shipById(campaign, unit.ship).aboard) throw new DomainError('Ein Beiboot an Bord ist keine eigene Einheit.');
    const maxG = maxGOf(campaign, unit);
    if (unit.thrust !== undefined && lengthOf(unit.thrust) > maxG + 1e-6) throw new DomainError('Der Schub einer Einheit ist größer als ihr höchster Schub.');
    // In der Feuerphase (2026-11-23) ist die Bewegung der Raumrunde schon gelaufen, die Raumrunde rückt erst mit „End Turn“ weiter.
    if (unit.track.length !== flight.round - 1 + (phaseOf(flight) === 'fire' ? 1 : 0)) throw new DomainError('Die Spur einer Einheit passt nicht zur Raumrunde.');
  }
  if (flight.departure !== undefined) {
    const { jumpTo, travelTo } = flight.departure;
    if ((jumpTo === undefined) === (travelTo === undefined)) throw new DomainError('Eine unterbrochene Reise hat genau ein Ziel.');
    if (jumpTo !== undefined && !hexById(campaign.hexes, jumpTo)) throw new DomainError('Die unterbrochene Reise führt zu einem Feld, das es nicht gibt.');
    if (travelTo !== undefined) worldOf(campaign.hexes, travelTo);
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
