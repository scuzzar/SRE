import {
  dockBlocker,
  dockableCraft,
  launchableCraft,
  flightStartBlocker,
  LANDING_KMS,
  BAND_KM,
  elapsedOf,
  flightTime,
  dayStart,
  G_KMS2,
  gravityAt,
  hexById,
  hexIdOfWorld,
  isWorld,
  jumpLimitsOf,
  lengthOf,
  maxGOf,
  moonAt,
  originAt,
  previewOf,
  radiusOf,
  ROUND_SECONDS,
  sceneOf,
  shipDesignOf,
  STEP_SECONDS,
  thrustMarks,
  worldById,
  type Campaign,
  type Hex,
  type Scene,
  type ThrustMark,
  type TrackPoint,
  type Vec,
  type World,
} from '../model';
import { systemLook, type WorldLook } from './world-view';

/** Die offene Raumkarte im Zustand des Controllers: die Welt, ein gezogener (noch nicht gesetzter) Schubvektor und die letzte Wiedergabe. */
export interface OpenSpace {
  readonly world: string;
  /** Der Schubvektor, den der Finger gerade zieht; erst beim Loslassen wird er gesetzt (`setThrust`). */
  readonly aim?: { readonly unit: number; readonly thrust: Vec | undefined; readonly snap?: ThrustMark['name'] };
  /**
   * Die letzte Raumrunde für die Wiedergabe: Orte aller Einheiten (wie sie in der Szene liegen) alle
   * `every` Schritte ab der Zeit `t`; `round` ist die Runde danach.
   */
  readonly run?: { readonly round: number; readonly t: number; readonly every: number; readonly frames: readonly (readonly Vec[])[] };
}

/** Eine Einheit auf der Raumkarte, wie die View sie zeichnet. */
export interface SpaceUnitView {
  readonly index: number;
  /** In dieser Einheit sitzt die Gruppe (2026-11-21b); nur sie landet. */
  readonly party: boolean;
  /** Ein Small Craft. */
  readonly craft: boolean;
  readonly name: string;
  readonly designName: string;
  readonly position: Vec;
  readonly velocity: Vec;
  readonly maxG: number;
  /** Der Schubvektor dieser Runde in G (gezogen oder gesetzt); fehlt ohne Schub. */
  readonly thrust: Vec | undefined;
  readonly thrustG: number;
  /** Woran er eingerastet ist. */
  readonly snap: ThrustMark['name'] | undefined;
  readonly crashed: boolean;
  readonly track: readonly TrackPoint[];
  /** Bahnvorschau: diese Runde mit Schub, danach fünf ohne; `impact` = Raumrunde ab jetzt, in der sie aufschlüge. */
  /** `landing`: in welcher Raumrunde ab jetzt sie langsam aufsetzte und wo (Owner, 21. November 2026). */
  readonly preview: { readonly now: readonly Vec[]; readonly after: readonly Vec[]; readonly impact: number | undefined; readonly landing: { readonly round: number; readonly name: string } | undefined };
  readonly marks: readonly ThrustMark[];
  /** km/s gegenüber der Welt der Raumkarte. */
  readonly speed: number;
  /** km über der Oberfläche der Welt; ohne Körper der Abstand zu ihrer Mitte. */
  readonly altitude: number;
  /** Schwerkraft am Ort in G, von allen Körpern zusammen. */
  readonly gravity: number;
}

/** Ein Körper auf der Raumkarte außer der Welt selbst: die Mitte (wenn die Welt ein Mond ist) und die Monde. */
export interface SpaceBodyView {
  readonly id: string;
  readonly name: string;
  readonly look: WorldLook | undefined;
  readonly radius: number;
  /** Wo er jetzt steht, von der Welt aus gesehen. */
  readonly position: Vec;
  /** Seine Bahn als Kreis um `around` (von der Welt aus gesehen) mit diesem Halbmesser; die Mitte hat keine. */
  readonly orbit: { readonly around: Vec; readonly distance: number } | undefined;
  /** Während der Wiedergabe der letzten Raumrunde: seine Orte, ein Bild je Bild der Einheiten. */
  readonly frames: readonly Vec[] | undefined;
}

/** Die Raumkarte einer Welt (Domänenmodell 2026-11-18c, mit Monden 2026-11-18d). */
export interface SpaceView {
  /** Die Welt der Raumkarte; sie steht immer in der Mitte, alles andere ist von ihr aus gesehen. */
  readonly world: { readonly id: string; readonly name: string; readonly look: WorldLook; readonly radius: number | undefined };
  /** Die übrigen Körper: der Gasriese, um den die Welt kreist, und die Monde. */
  readonly bodies: readonly SpaceBodyView[];
  /** Ringe: Bänder um `around` von `inner` bis `outer` km. */
  readonly rings: readonly { readonly id: string; readonly around: Vec; readonly inner: number; readonly outer: number }[];
  /** Sprunggrenzen: Abstand von der Mitte in km und der DM auf den Fehlsprung innerhalb davon. */
  readonly jumpLimits: readonly { readonly km: number; readonly dm: number }[];
  /** Ein Raumband in km, für die Ringe um die Einheit. */
  readonly band: number;
  /** Die Gruppe ist auf dieser Welt. */
  readonly here: boolean;
  /** Welche Raumkarten der Knopf „Raum“ anbietet: die Hauptwelt und jeder Gasriese des Systems. */
  readonly choices: readonly { readonly id: string; readonly name: string }[];
  /** Warum hier kein Systemflug beginnen kann; fehlt, wenn er kann (oder schon läuft). */
  readonly startBlocker: string | undefined;
  /** Bis zu dieser Geschwindigkeit gegenüber der Oberfläche ist Aufsetzen eine Landung, in km/s. */
  readonly landingKms: number;
  readonly flight:
    | {
        readonly round: number;
        /** Dauer des Systemflugs, z. B. „2 h 30 min“. */
        readonly elapsed: string;
        readonly units: readonly SpaceUnitView[];
        /** Die Stelle der Einheit der Gruppe in `units`. */
        readonly party: number;
        /** Beiboote an Bord der Einheit der Gruppe, die sie jetzt aussetzen kann (2026-11-21b). */
        readonly launchable: readonly { readonly id: string; readonly name: string }[];
        /** Small Craft, die jetzt an ihrem Mutterschiff andocken können. */
        readonly dockable: readonly { readonly id: string; readonly name: string }[];
        /** Sitzt die Gruppe in einem Small Craft, das noch nicht andocken kann: warum nicht. */
        readonly dockHint: string | undefined;
        /** Die Orte der Einheiten während der letzten Raumrunde, von der Welt aus gesehen. */
        readonly run: { readonly round: number; readonly frames: readonly (readonly Vec[])[] } | undefined;
      }
    | undefined;
  /** Ein Systemflug läuft, aber an einer anderen Welt. */
  readonly elsewhere: string | undefined;
}

function duration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h === 0 ? `${m} min` : `${h} h ${m} min`;
}

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });

/** Der Name einer Welt des Systems auf der Raumkarte: die Hauptwelt mit ihrem Namen, sonst nach ihrer Art. */
function bodyName(hex: Hex, world: World): string {
  if (world.name !== undefined) return world.name;
  if (world.id === hex.main) return world.id;
  if (world.kind === 'giant') return world.large ? 'Großer Gasriese' : 'Kleiner Gasriese';
  // Ohne Namen heißt eine Nebenwelt wie auf Weltkarte und im Log nach der Hauptwelt mit ihrer Nummer.
  const main = hex.worlds.find((w) => w.id === hex.main);
  return `${main?.name ?? hex.main} ${world.id.split('-')[1]}`;
}

/**
 * Die Raumkarten, die das Blatt zur Wahl anbietet: die Welt der Weltkarte (jede außer Ringen, Owner,
 * 21. November 2026), die Hauptwelt und jeder Gasriese.
 */
export function spaceChoices(hex: Hex, current?: string): readonly { readonly id: string; readonly name: string }[] {
  return hex.worlds.filter((w) => w.kind !== 'ring' && (w.id === current || w.id === hex.main || w.kind === 'giant')).map((w) => ({ id: w.id, name: bodyName(hex, w) }));
}

/** Die Körper der Szene außer der Welt, von ihr aus gesehen zur Zeit `t`. */
function bodiesOf(hex: Hex, scene: Scene, worldId: string, t: number, run: OpenSpace['run']): readonly SpaceBodyView[] {
  const origin = originAt(scene, worldId, t).position;
  const frameTimes = run ? run.frames.map((_, k) => run.t + k * run.every * STEP_SECONDS) : undefined;
  const result: SpaceBodyView[] = [];
  const center = hex.worlds.find((w) => w.id === scene.center);
  if (center && center.id !== worldId) {
    result.push({
      id: center.id,
      name: bodyName(hex, center),
      look: systemLook(hex, center),
      radius: radiusOf(center) ?? 0,
      position: sub({ x: 0, y: 0 }, origin),
      orbit: undefined,
      frames: frameTimes?.map((ft) => sub({ x: 0, y: 0 }, originAt(scene, worldId, ft).position)),
    });
  }
  for (const moon of scene.moons) {
    if (moon.world === worldId) continue;
    const world = hex.worlds.find((w) => w.id === moon.world)!;
    result.push({
      id: moon.world,
      name: bodyName(hex, world),
      look: systemLook(hex, world),
      radius: moon.body?.radius ?? radiusOf(world) ?? 0,
      position: sub(moonAt(moon, t).position, origin),
      orbit: { around: sub({ x: 0, y: 0 }, origin), distance: moon.distance },
      frames: frameTimes?.map((ft) => sub(moonAt(moon, ft).position, originAt(scene, worldId, ft).position)),
    });
  }
  return result;
}

export function spaceView(campaign: Campaign, space: OpenSpace): SpaceView | undefined {
  const hex = hexById(campaign.hexes, hexIdOfWorld(space.world));
  if (!isWorld(hex) || !worldById(campaign.hexes, space.world)) return undefined;
  const world = worldById(campaign.hexes, space.world)!;
  const scene = sceneOf(campaign.hexes, space.world);
  const center = hex.worlds.find((w) => w.id === scene.center)!;
  const look = systemLook(hex, world)!;
  const here = hexIdOfWorld(campaign.location?.world ?? '') === hexIdOfWorld(space.world) && campaign.location?.world !== undefined;
  const flight = campaign.flight?.world === space.world ? campaign.flight : undefined;
  const t = flight ? flightTime(campaign, flight) : dayStart(campaign.day);
  const origin = originAt(scene, space.world, t);
  const [ten, hundred] = jumpLimitsOf(center);
  const blocker = flight ? undefined : flightStartBlocker(campaign, space.world);
  const radius = radiusOf(world);
  const worldBody = scene.moons.find((m) => m.world === space.world)?.body ?? (scene.center === space.world ? scene.body : undefined);
  const tStart = flight ? t - elapsedOf(flight) : t;
  const run = flight && space.run?.round === flight.round ? space.run : undefined;
  return {
    world: { id: space.world, name: bodyName(hex, world), look, radius: worldBody?.radius ?? radius },
    bodies: bodiesOf(hex, scene, space.world, t, run),
    rings: scene.rings.map((r) => ({ id: r.world, around: sub({ x: 0, y: 0 }, origin.position), inner: r.inner, outer: r.outer })),
    jumpLimits: ten === undefined || hundred === undefined ? [] : [{ km: ten, dm: 15 }, { km: hundred, dm: 5 }],
    band: BAND_KM,
    here,
    choices: spaceChoices(hex, space.world),
    startBlocker: blocker,
    landingKms: LANDING_KMS,
    elsewhere: campaign.flight && !flight ? campaign.flight.world : undefined,
    flight: flight && {
      round: flight.round,
      party: Math.max(0, flight.units.findIndex((u) => u.ship === flight.party)),
      launchable: launchableCraft(campaign).map((c) => ({ id: c.id, name: c.name })),
      dockable: dockableCraft(campaign).map((c) => ({ id: c.id, name: c.name })),
      dockHint: (() => {
        const ship = campaign.ships.find((s) => s.id === flight.party);
        if (ship?.mother === undefined || dockableCraft(campaign).some((c) => c.id === ship.id)) return undefined;
        return dockBlocker(campaign, ship.id);
      })(),
      elapsed: duration(elapsedOf(flight)),
      run: run && { round: run.round, frames: run.frames.map((frame, k) => frame.map((p) => sub(p, originAt(scene, space.world, run.t + k * run.every * STEP_SECONDS).position))) },
      units: flight.units.map((unit, index): SpaceUnitView => {
        const ship = campaign.ships.find((s) => s.id === unit.ship)!;
        const aim = space.aim?.unit === index ? space.aim : undefined;
        const thrust = aim ? aim.thrust : unit.thrust;
        const position = sub(unit.position, origin.position);
        const velocity = sub(unit.velocity, origin.velocity);
        const r = lengthOf(position);
        // Nur die Einheit der Gruppe landet, mit Landeautomatik (2026-11-21b).
        const party = unit.ship === flight.party;
        const preview = party ? previewOf(scene, unit, thrust, t, 2, space.world, shipDesignOf(ship.design).maneuver) : previewOf(scene, unit, thrust, t, 2, space.world, undefined, false);
        return {
          index,
          party,
          craft: ship.mother !== undefined,
          name: ship.name,
          designName: shipDesignOf(ship.design).name,
          position,
          velocity,
          maxG: maxGOf(campaign, unit),
          thrust,
          thrustG: thrust === undefined ? 0 : Math.round(lengthOf(thrust) * 10) / 10,
          snap: aim?.snap,
          crashed: unit.crashed,
          track: unit.track.map((p, i) => {
            const at = originAt(scene, space.world, tStart + i * ROUND_SECONDS);
            return { position: sub(p.position, at.position), velocity: sub(p.velocity, at.velocity) };
          }),
          preview: { now: preview.now, after: preview.after, impact: preview.impact, landing: preview.landing && { round: preview.landing.round, name: bodyName(hex, hex.worlds.find((w) => w.id === preview.landing!.world)!) } },
          marks: thrustMarks({ position, velocity, crashed: unit.crashed }),
          speed: lengthOf(velocity),
          altitude: worldBody === undefined ? r : r - worldBody.radius,
          gravity: lengthOf(gravityAt(scene, unit.position, t)) / G_KMS2,
        };
      }),
    },
  };
}
