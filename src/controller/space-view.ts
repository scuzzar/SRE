import {
  BAND_KM,
  bodyOf,
  elapsedOf,
  G_KMS2,
  hexById,
  isWorld,
  jumpLimitsOf,
  lengthOf,
  maxGOf,
  previewOf,
  shipDesignOf,
  shipOf,
  thrustMarks,
  type Campaign,
  type ThrustMark,
  type TrackPoint,
  type Vec,
  hexIdOfWorld,
  worldOf,
} from '../model';
import { lookOf, type WorldLook } from './world-view';

/** Die offene Raumkarte im Zustand des Controllers: die Welt, ein gezogener (noch nicht gesetzter) Schubvektor und die letzte Wiedergabe. */
export interface OpenSpace {
  readonly world: string;
  /** Der Schubvektor, den der Finger gerade zieht; erst beim Loslassen wird er gesetzt (`setThrust`). */
  readonly aim?: { readonly unit: number; readonly thrust: Vec | undefined; readonly snap?: ThrustMark['name'] };
  /** Die Orte aller Einheiten während der letzten Raumrunde, für die Wiedergabe; `round` ist die Runde danach. */
  readonly run?: { readonly round: number; readonly frames: readonly (readonly Vec[])[] };
}

/** Eine Einheit auf der Raumkarte, wie die View sie zeichnet. */
export interface SpaceUnitView {
  readonly index: number;
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
  readonly preview: { readonly now: readonly Vec[]; readonly after: readonly Vec[]; readonly impact: number | undefined };
  readonly marks: readonly ThrustMark[];
  /** km/s */
  readonly speed: number;
  /** km über der Oberfläche; ohne Körper der Abstand zur Mitte. */
  readonly altitude: number;
  /** Schwerkraft am Ort in G. */
  readonly gravity: number;
}

/** Die Raumkarte einer Welt (Domänenmodell 2026-11-18c). */
export interface SpaceView {
  readonly world: { readonly id: string; readonly name: string; readonly look: WorldLook; readonly radius: number | undefined };
  /** Sprunggrenzen: Abstand von der Mitte in km und der DM auf den Fehlsprung innerhalb davon. */
  readonly jumpLimits: readonly { readonly km: number; readonly dm: number }[];
  /** Ein Raumband in km, für die Ringe um die Einheit. */
  readonly band: number;
  /** Die Gruppe ist auf dieser Welt. */
  readonly here: boolean;
  /** Warum hier kein Systemflug beginnen kann; fehlt, wenn er kann (oder schon läuft). */
  readonly startBlocker: string | undefined;
  readonly flight:
    | {
        readonly round: number;
        /** Dauer des Systemflugs, z. B. „2 h 30 min“. */
        readonly elapsed: string;
        readonly units: readonly SpaceUnitView[];
        readonly run: OpenSpace['run'];
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

export function spaceView(campaign: Campaign, space: OpenSpace): SpaceView | undefined {
  const hex = hexById(campaign.hexes, hexIdOfWorld(space.world));
  if (!isWorld(hex)) return undefined;
  const world = worldOf(campaign.hexes, space.world);
  const body = bodyOf(world);
  const look = lookOf(hex)!;
  const [ten, hundred] = jumpLimitsOf(world);
  const here = campaign.location?.world === space.world;
  const flight = campaign.flight?.world === space.world ? campaign.flight : undefined;
  const blocker = flight
    ? undefined
    : campaign.flight
      ? 'Es läuft schon ein Systemflug an einer anderen Welt.'
      : !here
        ? 'Ein Systemflug beginnt nur auf der Welt, auf der die Gruppe ist.'
        : shipOf(campaign) === undefined
          ? 'Die Gruppe hat kein Schiff.'
          : campaign.encounters.some((e) => !e.ended)
            ? 'Während einer laufenden Begegnung beginnt kein Systemflug.'
            : campaign.trip
              ? 'Erst die Fahrt beenden, dann fliegen.'
              : undefined;
  return {
    world: { id: space.world, name: world.name, look, radius: body?.radius },
    jumpLimits: ten === undefined || hundred === undefined ? [] : [{ km: ten, dm: 15 }, { km: hundred, dm: 5 }],
    band: BAND_KM,
    here,
    startBlocker: blocker,
    elsewhere: campaign.flight && !flight ? campaign.flight.world : undefined,
    flight: flight && {
      round: flight.round,
      elapsed: duration(elapsedOf(flight)),
      run: space.run,
      units: flight.units.map((unit, index): SpaceUnitView => {
        const ship = campaign.ships.find((s) => s.id === unit.ship)!;
        const aim = space.aim?.unit === index ? space.aim : undefined;
        const thrust = aim ? aim.thrust : unit.thrust;
        const r = lengthOf(unit.position);
        const preview = previewOf(body, unit, thrust);
        return {
          index,
          name: ship.name,
          designName: shipDesignOf(ship.design).name,
          position: unit.position,
          velocity: unit.velocity,
          maxG: maxGOf(campaign, unit),
          thrust,
          thrustG: thrust === undefined ? 0 : Math.round(lengthOf(thrust) * 10) / 10,
          snap: aim?.snap,
          crashed: unit.crashed,
          track: unit.track,
          preview: { now: preview.now, after: preview.after, impact: preview.impact },
          marks: thrustMarks(unit),
          speed: lengthOf(unit.velocity),
          altitude: body === undefined ? r : r - body.radius,
          gravity: body === undefined || r === 0 ? 0 : body.gm / (r * r) / G_KMS2,
        };
      }),
    },
  };
}
