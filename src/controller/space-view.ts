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
  encounterBlocker,
  battleRunning,
  encounterColumn,
  ref,
  designOfUnit,
  damageOfUnit,
  nameOfUnit,
  bandOf,
  spaceRangeDm,
  lineOfSight,
  laserCountOf,
  fireBlocker,
  firePreview,
  hardpointBlocker,
  hardpointsOf,
  phaseOf,
  partyIndexOf,
  coastOf,
  REACH_PER_G,
  shipWeaponOf,
  departureBlocker,
  departureOf,
  flightJumpDm,
} from '../model';
import { worldName } from './generation-view';
import { systemLook, type WorldLook } from './world-view';
import { dmLines, hitZoneNames, intentNames, type DmLine } from './time-view';

/** Was die Laser des Schiffs `from` auf die Einheit `index` jetzt bräuchten; `turret` beschränkt es auf einen Hardpoint. */
function fireLines(campaign: Campaign, from: number, index: number, turret?: number): SpaceUnitView['fire'] {
  const preview = firePreview(campaign, from, index, turret);
  if (preview === undefined) return [];
  return preview.weapons.map((w) => ({ weapon: shipWeaponOf(w.weapon).name, count: w.count, parts: dmLines(w.parts, preview.bands, preview.computerHits), dm: w.dm, need: w.need }));
}

/** Die offene Raumkarte im Zustand des Controllers: die Welt, ein gezogener (noch nicht gesetzter) Schubvektor und die letzte Wiedergabe. */
export interface OpenSpace {
  readonly world: string;
  /** Das angetippte fremde Schiff, auf das die Hardpoints zielen (2026-11-23); sonst das erste, das kämpft. */
  readonly target?: number;
  /** Der Schubvektor, den der Finger gerade zieht; erst beim Loslassen wird er gesetzt (`setThrust`). */
  readonly aim?: { readonly unit: number; readonly thrust: Vec | undefined; readonly snap?: ThrustMark['name'] };
  /**
   * Die letzte Raumrunde für die Wiedergabe: Orte aller Einheiten (wie sie in der Szene liegen) alle
   * `every` Schritte ab der Zeit `t`; `round` ist die Runde danach.
   */
  readonly run?: { readonly round: number; readonly t: number; readonly every: number; readonly frames: readonly (readonly Vec[])[] };
}

/** Ein Hardpoint im Kampfblatt (2026-11-23): was dort liegt, was er braucht und warum er stillsteht. */
export interface SpaceHardpointView {
  readonly turret: number;
  readonly name: string;
  /** Die Waffen zusammengefasst, z. B. „2× Pulse Laser“. */
  readonly label: string;
  /** Der nötige Wurf auf das gewählte Ziel, z. B. „5+“; ohne Ziel der DM je Waffe. */
  readonly need: string;
  readonly fired: boolean;
  readonly out: boolean;
  /** Warum der Hardpoint jetzt nicht feuert; `undefined`, wenn er feuern darf. */
  readonly blocker: string | undefined;
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
  /** `landing.skims`: am Gasriesen, das Schiff schöpft dort (2026-11-21f). */
  readonly preview: { readonly now: readonly Vec[]; readonly after: readonly Vec[]; readonly impact: number | undefined; readonly landing: { readonly round: number; readonly name: string; readonly skims: boolean } | undefined };
  /** Treibstoff im Tank, davon unraffiniert, und was der Tank fasst, in Tonnen. */
  readonly fuel: number;
  readonly unrefined: number;
  readonly fuelMax: number;
  /** Stromlinienförmig: kann an einem Gasriesen schöpfen (SR 32). */
  readonly streamlined: boolean;
  /** Raumkampf (2026-11-21h): ein fremdes Schiff, seine Absicht (fehlt beim Wrack), der Schaden als Trefferzonen. */
  readonly foe: boolean;
  readonly intent: string | undefined;
  readonly wreck: boolean;
  readonly damage: readonly string[];
  /** Laser, die noch feuern können; welche Hardpoints in dieser Raumrunde schon gefeuert haben (2026-11-21i, 2026-11-23). */
  readonly lasers: number;
  readonly firedTurrets: readonly number[];
  /** Die Nummer auf der Karte und im Blatt: M1, M2 … bei eigenen Schiffen, F1, F2 … bei fremden (2026-11-23). */
  readonly mark: string;
  /** Die Hardpoints des Schiffs mit Waffen und Stand (2026-11-23); ein fremdes Schiff hat keine im Blatt. */
  readonly hardpoints: readonly SpaceHardpointView[];
  /** Bei einem fremden Schiff: warum das eigene Schiff jetzt nicht auf es feuern kann (`undefined`: es kann). */
  readonly fireBlocker: string | undefined;
  /** Bei einem fremden Schiff: was die Laser des eigenen Schiffs jetzt bräuchten, je Waffe mit DMs und Zielwert auf 2W6 (2026-11-21i). */
  readonly fire: readonly { readonly weapon: string; readonly count: number; readonly parts: readonly DmLine[]; readonly dm: number; readonly need: number }[];
  /** Vom eigenen Schiff aus: Entfernung in Raumbändern, DM der Entfernung und ob die Sichtlinie frei ist. */
  readonly bands: number;
  readonly rangeDm: number;
  readonly sight: boolean;
  readonly marks: readonly ThrustMark[];
  /** km/s gegenüber der Welt der Raumkarte. */
  readonly speed: number;
  /** km über der Oberfläche der Welt; ohne Körper der Abstand zu ihrer Mitte. */
  readonly altitude: number;
  /** Schwerkraft am Ort in G, von allen Körpern zusammen. */
  readonly gravity: number;
  /** Zieleingabe (2026-11-22): wo die Einheit am Ende der Raumrunde ohne Schub stünde (von der Welt aus gesehen) und wie weit der höchste Schub den Endpunkt verschiebt, in km. */
  readonly coast: Vec;
  readonly reach: number;
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
  readonly world: { readonly id: string; readonly name: string; readonly look: WorldLook; readonly radius: number | undefined; /** Ein Gasriese: Dort schöpft man (2026-11-21f). */ readonly giant: boolean };
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
        /** Phase der Raumrunde im Raumkampf (2026-11-23): Schub wählen oder feuern. */
        readonly phase: 'thrust' | 'fire';
        /** Das gewählte Ziel der Hardpoints (2026-11-23): die Stelle in `units`; ohne fremdes Schiff fehlt es. */
        readonly target: number | undefined;
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
  /** Raumkampf (2026-11-21h): warum gerade kein fremdes Schiff auftauchen kann, ob einer läuft, Spalte der Begegnungstabelle, Entwürfe für „von Hand“. */
  readonly encounterBlocker: string | undefined;
  readonly battle: boolean;
  readonly encounterColumn: string | undefined;
  readonly designs: readonly { readonly id: string; readonly name: string }[];
  /**
   * Die Weiterreise (2026-11-22b): Unterbrach eine Begegnung beim Start eine Reise, der Knopf „Springen
   * nach …“ bzw. „Reisen nach …“, mit dem DM auf den Fehlsprung jetzt und warum es gerade nicht geht.
   */
  readonly departure: { readonly label: string; readonly jumpDm: number | undefined; readonly blocker: string | undefined } | undefined;
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

/**
 * Das gewählte Ziel der Hardpoints (2026-11-23): das zuletzt angetippte fremde Schiff, sonst das
 * erste, das kämpft; `undefined` ohne fremdes Schiff.
 */
export function targetIndex(campaign: Campaign, space: OpenSpace): number | undefined {
  const flight = campaign.flight;
  if (flight === undefined) return undefined;
  const chosen = flight.units.findIndex((u, i) => i === space.target && u.ship === undefined && !u.crashed);
  if (chosen >= 0) return space.target;
  const fighting = flight.units.findIndex((u) => u.ship === undefined && u.intent !== undefined && !u.crashed);
  return fighting >= 0 ? fighting : undefined;
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
  // Das gewählte Ziel der Hardpoints (2026-11-23): das zuletzt angetippte fremde Schiff, sonst das
  // erste, das kämpft. Nummern auf der Karte: eigene Schiffe M1, M2 …, fremde F1, F2 …
  const target = targetIndex(campaign, space);
  let ownCount = 0;
  let foeCount = 0;
  return {
    world: { id: space.world, name: bodyName(hex, world), look, radius: worldBody?.radius ?? radius, giant: world.kind === 'giant' },
    bodies: bodiesOf(hex, scene, space.world, t, run),
    rings: scene.rings.map((r) => ({ id: r.world, around: sub({ x: 0, y: 0 }, origin.position), inner: r.inner, outer: r.outer })),
    jumpLimits: ten === undefined || hundred === undefined ? [] : [{ km: ten, dm: 15 }, { km: hundred, dm: 5 }],
    band: BAND_KM,
    here,
    choices: spaceChoices(hex, space.world),
    startBlocker: blocker,
    landingKms: LANDING_KMS,
    elsewhere: campaign.flight && !flight ? campaign.flight.world : undefined,
    encounterBlocker: flight ? encounterBlocker(campaign) : undefined,
    battle: flight ? battleRunning(campaign) : false,
    encounterColumn: flight ? (({ column, dm }) => `Raumhafen ${column}${dm ? `, DM +${dm}` : ''}`)(encounterColumn(campaign)) : undefined,
    designs: ref.ships.map((d) => ({ id: d.id, name: d.name })),
    departure: (() => {
      const departure = flight ? departureOf(campaign) : undefined;
      if (departure === undefined) return undefined;
      const name = worldName(campaign.hexes, departure.to);
      return { label: departure.kind === 'jump' ? `Springen nach ${name}` : `Reisen nach ${name}`, jumpDm: departure.kind === 'jump' ? flightJumpDm(campaign) : undefined, blocker: departureBlocker(campaign) };
    })(),
    flight: flight && {
      round: flight.round,
      phase: phaseOf(flight),
      target,
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
        const design = shipDesignOf(designOfUnit(campaign, unit));
        const ship = unit.ship === undefined ? undefined : campaign.ships.find((s) => s.id === unit.ship)!;
        const damage = damageOfUnit(campaign, unit);
        const own = flight.units[partyIndexOf(flight)]!;
        const km = lengthOf(sub(unit.position, own.position));
        const aim = space.aim?.unit === index ? space.aim : undefined;
        const thrust = aim ? aim.thrust : unit.thrust;
        const position = sub(unit.position, origin.position);
        const velocity = sub(unit.velocity, origin.velocity);
        const r = lengthOf(position);
        // Nur die Einheit der Gruppe landet, mit Landeautomatik (2026-11-21b), und schöpft (2026-11-21f).
        const party = unit.ship !== undefined && unit.ship === flight.party;
        const plan = design;
        const preview = party ? previewOf(scene, unit, thrust, t, 2, space.world, maxGOf(campaign, unit), true, plan.streamlined) : previewOf(scene, unit, thrust, t, 2, space.world, undefined, false);
        return {
          index,
          party,
          mark: unit.ship === undefined ? `F${++foeCount}` : `M${++ownCount}`,
          craft: ship?.mother !== undefined,
          name: nameOfUnit(campaign, unit),
          designName: plan.name,
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
          preview: { now: preview.now, after: preview.after, impact: preview.impact, landing: preview.landing && { round: preview.landing.round, name: bodyName(hex, hex.worlds.find((w) => w.id === preview.landing!.world)!), skims: preview.landing.skims === true } },
          fuel: ship?.fuel ?? 0,
          unrefined: ship?.unrefined ?? 0,
          fuelMax: plan.fuel,
          streamlined: plan.streamlined,
          foe: unit.ship === undefined,
          intent: unit.intent === undefined ? undefined : intentNames[unit.intent],
          wreck: unit.ship === undefined && unit.intent === undefined,
          damage: (damage?.hits ?? []).map((h) => hitZoneNames[h]),
          lasers: laserCountOf(campaign, unit),
          firedTurrets: unit.firedTurrets ?? [],
          hardpoints:
            unit.ship === undefined
              ? []
              : hardpointsOf(campaign, index).map((h) => {
                  const lines = target === undefined ? [] : fireLines(campaign, index, target, h.turret);
                  return {
                    turret: h.turret,
                    name: h.name,
                    label: h.weapons.length === 1 ? shipWeaponOf(h.weapons[0]!).name : `${h.weapons.length}× ${shipWeaponOf(h.weapons[0]!).name}`,
                    need: lines.length === 0 ? '−' : [...new Set(lines.map((w) => `${w.need}+`))].join('/'),
                    fired: h.fired,
                    out: h.out,
                    blocker: target === undefined ? 'Kein Ziel' : hardpointBlocker(campaign, index, target, h.turret),
                  };
                }),
          fireBlocker: unit.ship === undefined ? fireBlocker(campaign, partyIndexOf(flight), index) : undefined,
          fire: unit.ship === undefined ? [] : target === undefined || index === target ? [] : fireLines(campaign, index, target),
          bands: bandOf(km),
          rangeDm: spaceRangeDm(bandOf(km)),
          sight: lineOfSight(scene, own.position, unit.position, t),
          marks: thrustMarks({ position, velocity, crashed: unit.crashed }),
          speed: lengthOf(velocity),
          altitude: worldBody === undefined ? r : r - worldBody.radius,
          gravity: lengthOf(gravityAt(scene, unit.position, t)) / G_KMS2,
          coast: sub(coastOf(scene, unit, t), originAt(scene, space.world, t + ROUND_SECONDS).position),
          reach: maxGOf(campaign, unit) * REACH_PER_G,
        };
      }),
    },
  };
}
