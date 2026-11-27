import type { Campaign, Character } from './campaign';
import { DomainError } from './errors';
import type { Clock, Random } from './ports';
import { DRIVE_LETTERS, drivePotentialOf, ref, shipDesignOf, softwareOf } from './reference';
import { roll2d6, sum, type Dice } from './rules';
import { hexById, hexIdOfWorld, worldById } from './sector';
import { starportLetter } from './surface-map';
import { craftOf, shipById, shipOf, type Ship, type Turret } from './ship';
import { evadeDmOf, evades, hasTarget, hasThrust, predictDm, returnsFire, slotOfProgram, TARGET_PROGRAM, usesGunner, type SoftwareSlot } from './software';
import { gunnerPost, holderOf, postSkill, postsOf } from './crew';
import type { DamageControl, SpaceAttack, SpaceBattle, SpaceBattleEnd } from './log';
import {
  activeFlight,
  BAND_KM,
  endFlight,
  launchWorld,
  partyIndexOf,
  flightTime,
  lengthOf,
  phaseOf,
  lineOfSight,
  propagate,
  ROUND_SECONDS,
  ROUND_STEPS,
  sceneOf,
  startArrivalFlight,
  startFlight,
  type Scene,
  type SpaceUnit,
  type SystemFlight,
  type Vec,
} from './flight';

const d6 = (random: Random): number => random.int(1, 6);

// Raumkampf, Stufe 2: Gegner und Laser (Domänenmodell 2026-11-21h; Konzept: docs/konzept-raumkampf.md,
// Abschnitte 4, 6, 7; Regeln SR 39–42, SE 12–13 in docs/regeln-schiffe.md).

/** Wohin ein Treffer geht (SE 12, Hit Locations und Critical Hits). */
export type HitZone =
  | 'powerPlant'
  | 'maneuver'
  | 'jump'
  | 'fuel'
  | 'hull'
  | 'hold'
  | 'computer'
  | 'turret'
  | 'criticalPowerPlant'
  | 'criticalManeuver'
  | 'criticalJump'
  | 'crew'
  | 'criticalComputer'
  | 'explode'
  // Nur Small Craft (SE 12, 2026-11-22):
  | 'drive'
  | 'cabin'
  | 'weapons'
  | 'criticalDrive';
export const hitZones = ['powerPlant', 'maneuver', 'jump', 'fuel', 'hull', 'hold', 'computer', 'turret', 'criticalPowerPlant', 'criticalManeuver', 'criticalJump', 'crew', 'criticalComputer', 'explode', 'drive', 'cabin', 'weapons', 'criticalDrive'] as const;

/** Was ein fremdes Schiff will (Konzept, Abschnitt 6). */
export type Intent = 'attack' | 'flee' | 'ignore';
export const intents = ['attack', 'flee', 'ignore'] as const;

/** Wie ein Raumkampf endete. */
export type BattleOutcome = 'destroyed' | 'disabled' | 'escaped' | 'broken' | 'lost' | 'departed';
export const battleOutcomes = ['destroyed', 'disabled', 'escaped', 'broken', 'lost', 'departed'] as const;

/**
 * Der Schaden eines Schiffs (Domänenmodell: `ShipDamage`): die Treffer in ihrer Reihenfolge, die
 * Stellen der geflickten darin (`patched`, 2026-11-22d; fehlt heißt keine) und die ausgefallenen
 * Turrets – je Treffer auf Turret oder Weapons einer, in derselben Reihenfolge.
 */
export interface ShipDamage {
  readonly hits: readonly HitZone[];
  readonly patched?: readonly number[];
  readonly turretsOut: readonly number[];
}

/** Trefferzonen für Starships nach 2W6 (SE 12), Index = Summe − 2; 12 ist kritisch. */
const HIT_TABLE: readonly HitZone[] = ['powerPlant', 'maneuver', 'jump', 'fuel', 'hull', 'hull', 'hold', 'computer', 'turret', 'turret'];
/** Kritische Treffer nach 1W6 (SE 12). */
const CRITICAL_TABLE: readonly HitZone[] = ['criticalPowerPlant', 'criticalManeuver', 'criticalJump', 'crew', 'criticalComputer', 'explode'];
/** Trefferzonen für Small Craft nach 2W6 (SE 12, 2026-11-22), Index = Summe − 2; 12 ist kritisch. */
const CRAFT_HIT_TABLE: readonly HitZone[] = ['drive', 'drive', 'drive', 'drive', 'cabin', 'computer', 'cabin', 'cabin', 'weapons', 'weapons'];
/** Kritische Treffer auf Small Craft nach 1W6 (SE 12). */
const CRAFT_CRITICAL_TABLE: readonly HitZone[] = ['criticalDrive', 'criticalDrive', 'criticalDrive', 'crew', 'criticalComputer', 'explode'];
/** Trefferwurf: 8+ (SR 40). */
export const HIT_TARGET = 8;
/** Abstand, den ein angreifendes fremdes Schiff hält: 5 Raumbänder (Hausregel). */
const ATTACK_KM = 5 * BAND_KM;
/** Über diese Entfernung kein Schuss, und ein fremdes Schiff ist entkommen (Tracking, SR 42): 90 Raumbänder. */
export const TRACKING_BANDS = 90;
/** Reparatur je Treffer und je kritischem Treffer in Cr (Hausregel 2026-11-21h). */
export const REPAIR_HIT = 100_000;
export const REPAIR_CRITICAL = 1_000_000;

export const isCritical = (zone: HitZone) => zone.startsWith('critical') || zone === 'crew' || zone === 'explode';
const isPatched = (damage: ShipDamage | undefined, at: number) => damage?.patched?.includes(at) === true;
/** Die Treffer, die wirken: alle außer den geflickten (2026-11-22d). */
const activeHits = (damage: ShipDamage | undefined): readonly HitZone[] => (damage?.hits ?? []).filter((_, at) => !isPatched(damage, at));
const count = (damage: ShipDamage | undefined, ...zones: HitZone[]) => activeHits(damage).filter((h) => zones.includes(h)).length;

/**
 * Die ausgefallenen Turrets: je Treffer auf Turret oder Weapons das Turret aus `turretsOut`, außer
 * der Treffer ist geflickt (2026-11-22d).
 */
export function turretsDown(damage: ShipDamage | undefined): readonly number[] {
  if (damage === undefined) return [];
  const stations = damage.hits.flatMap((h, at) => (h === 'turret' || h === 'weapons' ? [at] : []));
  return damage.turretsOut.filter((_, k) => !isPatched(damage, stations[k] ?? -1));
}

/** Die Leistung eines Antriebs, dessen Buchstabe `hits` Stufen gesunken ist (SR 41); unter A ist er zerstört. */
function driveAfter(hull: number, letter: string, hits: number): number {
  const at = DRIVE_LETTERS.indexOf(letter) - hits;
  return at < 0 ? 0 : drivePotentialOf(hull, DRIVE_LETTERS[at]!);
}

/**
 * `/maneuver`: die G nach dem Schaden (2026-11-22d). Jeder Treffer auf Maneuver oder Power Plant senkt
 * dessen Buchstaben um eine Stufe; es zählt das Kleinere aus der Leistung beider (Drive Potential,
 * SE 10). Kritisch 0. Ein Entwurf ohne Buchstaben (Small Craft, Entwürfe außerhalb der SR) verliert
 * je Treffer 1 G wie in Stufe 2.
 */
export function maneuverAfter(design: string, damage: ShipDamage | undefined): number {
  // Drive eines Small Craft: es kann sich nicht mehr bewegen (SR 41, 2026-11-22).
  if (count(damage, 'criticalManeuver', 'criticalPowerPlant', 'crew', 'explode', 'drive', 'criticalDrive') > 0) return 0;
  const plan = shipDesignOf(design);
  if (plan.maneuverDrive === undefined || plan.powerPlant === undefined) return Math.max(0, plan.maneuver - count(damage, 'maneuver', 'powerPlant'));
  return Math.min(driveAfter(plan.hull, plan.maneuverDrive, count(damage, 'maneuver')), driveAfter(plan.hull, plan.powerPlant, count(damage, 'powerPlant')));
}

/** `/jump`: die Sprungzahl nach dem Schaden, wie `/maneuver` aus Jump Drive und Power Plant; kritisch 0. */
export function jumpAfter(design: string, damage: ShipDamage | undefined): number {
  if (count(damage, 'criticalJump', 'criticalPowerPlant', 'explode') > 0) return 0;
  const plan = shipDesignOf(design);
  if (plan.jumpDrive === undefined || plan.powerPlant === undefined) return Math.max(0, plan.jump - count(damage, 'jump', 'powerPlant'));
  return Math.min(driveAfter(plan.hull, plan.jumpDrive, count(damage, 'jump')), driveAfter(plan.hull, plan.powerPlant, count(damage, 'powerPlant')));
}

/** Die Buchstaben der Antriebe nach dem Schaden (Jump, Maneuver, Power Plant), „–“ unter A; `undefined` ohne Buchstaben. */
export function driveLettersAfter(design: string, damage: ShipDamage | undefined): { readonly jump: string; readonly maneuver: string; readonly powerPlant: string } | undefined {
  const plan = shipDesignOf(design);
  if (plan.jumpDrive === undefined || plan.maneuverDrive === undefined || plan.powerPlant === undefined) return undefined;
  const after = (letter: string, critical: HitZone, hit: HitZone) => (count(damage, critical) > 0 ? '–' : (DRIVE_LETTERS[DRIVE_LETTERS.indexOf(letter) - count(damage, hit)] ?? '–'));
  return { jump: after(plan.jumpDrive, 'criticalJump', 'jump'), maneuver: after(plan.maneuverDrive, 'criticalManeuver', 'maneuver'), powerPlant: after(plan.powerPlant, 'criticalPowerPlant', 'powerPlant') };
}

/** `/destroyed`: ein kritischer Treffer *Explode*. */
export function destroyedBy(damage: ShipDamage | undefined): boolean {
  return count(damage, 'explode') > 0;
}

/** Kann das Schiff feuern? Nicht ohne Crew, nicht mit zerstörtem Computer, nicht zerstört; ein Small Craft nicht mit Drive-Treffer (SR 41). */
function canFire(damage: ShipDamage | undefined): boolean {
  return count(damage, 'crew', 'criticalComputer', 'explode', 'drive', 'criticalDrive') === 0;
}

/** Ein Small Craft ohne Computer (SE 13, 2026-11-22): DM −1 und nur eine Waffe zugleich. */
export function withoutComputer(design: string): boolean {
  const plan = shipDesignOf(design);
  return plan.kind === 'smallCraft' && plan.computer === undefined;
}

/** Die Laser eines Schiffs, die noch feuern können: je Turret, das nicht ausgefallen ist; ohne Computer nur der erste. */
function workingLasers(design: string, turrets: readonly Turret[], damage: ShipDamage | undefined): readonly { turret: number; weapon: string }[] {
  if (!canFire(damage)) return [];
  const lasers = turrets.flatMap((t, i) => (turretsDown(damage).includes(i) ? [] : t.weapons.filter((w) => w.endsWith('laser')).map((weapon) => ({ turret: i, weapon }))));
  return withoutComputer(design) ? lasers.slice(0, 1) : lasers;
}

/** Die Laser einer Einheit, die jetzt feuern können. */
function lasersOfUnit(campaign: Campaign, unit: SpaceUnit): readonly { turret: number; weapon: string }[] {
  return workingLasers(designOfUnit(campaign, unit), turretsOfUnit(campaign, unit), damageOfUnit(campaign, unit));
}

/** Wie viele Laser einer Einheit noch feuern können. */
export function laserCountOf(campaign: Campaign, unit: SpaceUnit): number {
  return lasersOfUnit(campaign, unit).length;
}

/** `/disabled`: zerstört, Crew handlungsunfähig, oder ohne Antrieb und ohne arbeitenden Laser. */
export function disabledBy(design: string, turrets: readonly Turret[], damage: ShipDamage | undefined): boolean {
  if (destroyedBy(damage) || count(damage, 'crew') > 0) return true;
  return maneuverAfter(design, damage) === 0 && workingLasers(design, turrets, damage).length === 0;
}

/** Der Entwurf einer Einheit: der des eigenen Schiffs oder der des fremden. */
export function designOfUnit(campaign: Campaign, unit: SpaceUnit): string {
  if (unit.ship !== undefined) return shipById(campaign, unit.ship).design;
  if (unit.design === undefined) throw new DomainError('Eine Einheit ohne Schiff braucht einen Entwurf.');
  return unit.design;
}

/** Die Turrets einer Einheit: die des eigenen Schiffs, beim fremden die seines Entwurfs. */
export function turretsOfUnit(campaign: Campaign, unit: SpaceUnit): readonly Turret[] {
  return unit.ship !== undefined ? shipById(campaign, unit.ship).turrets : shipDesignOf(designOfUnit(campaign, unit)).turrets;
}

/** Der Schaden einer Einheit: am eigenen Schiff, beim fremden an der Einheit. */
export function damageOfUnit(campaign: Campaign, unit: SpaceUnit): ShipDamage | undefined {
  return unit.ship !== undefined ? shipById(campaign, unit.ship).damage : unit.damage;
}

/** Der Name einer Einheit, wie Log und Blatt ihn schreiben. */
export function nameOfUnit(campaign: Campaign, unit: SpaceUnit): string {
  return unit.ship !== undefined ? shipById(campaign, unit.ship).name : (unit.name ?? shipDesignOf(designOfUnit(campaign, unit)).name);
}

/** Ein fremdes Schiff, das noch kämpft oder flieht (nicht kampfunfähig). */
export function activeFoe(_campaign: Campaign, unit: SpaceUnit): boolean {
  return unit.ship === undefined && unit.intent !== undefined && !unit.crashed;
}

/** Läuft ein Raumkampf? Ein fremdes Schiff ist da, das nicht kampfunfähig ist. */
export function battleRunning(campaign: Campaign): boolean {
  return campaign.flight?.units.some((u) => activeFoe(campaign, u)) ?? false;
}

/**
 * Warum ein Programm jetzt nicht in die Ablage gesteckt werden kann (Domänenmodell 2026-11-22d):
 * außerhalb des Raumkampfs frei, im Raumkampf nur zwischen CPU und Speicher und nur, solange das
 * eigene Schiff in dieser Raumrunde noch nicht gefeuert hat (die Reprogramming-Phase der SR);
 * ⚑ Archiv ↔ Speicher geht im Raumkampf nicht.
 */
export function plugBlocker(campaign: Campaign, shipId: string, program: string, to: SoftwareSlot): string | undefined {
  const from = slotOfProgram(shipById(campaign, shipId), program);
  if (from === undefined || from === to) return undefined;
  if (!battleRunning(campaign)) return undefined;
  const unit = campaign.flight?.units.find((u) => u.ship === shipId);
  if (unit !== undefined && (unit.firedTurrets?.length ?? 0) > 0) return 'Nach dem eigenen Schuss wird in dieser Raumrunde nichts mehr umgesteckt.';
  if (from === 'archive' || to === 'archive') return 'Im Raumkampf wird nur zwischen CPU und Speicher umgesteckt.';
  return undefined;
}

/** Das Raumband einer Entfernung: Entfernung ÷ 10.000 km, aufgerundet (Hausregel, mindestens 1). */
export function bandOf(km: number): number {
  // Ein Hauch Spielraum, damit genau 70.000 km nicht durch Rundung 8 Raumbänder werden.
  return Math.max(1, Math.ceil(km / BAND_KM - 1e-9));
}

/** Der DM der Entfernung (SE 12): über 25 Raumbänder −2, über 50 −5. */
export function spaceRangeDm(bands: number): number {
  return bands > 50 ? -5 : bands > 25 ? -2 : 0;
}

/** Warum gerade kein fremdes Schiff auftauchen kann; `undefined`, wenn es kann. */
export function encounterBlocker(campaign: Campaign): string | undefined {
  const flight = campaign.flight;
  if (flight === undefined) return 'Es läuft kein Systemflug.';
  if (flight.units.some((u) => u.ship === undefined)) return 'Es ist schon ein fremdes Schiff da (Stufe 2: höchstens eins).';
  if (flight.units[partyIndexOf(flight)]?.crashed) return 'Das Schiff der Gruppe ist aufgeschlagen.';
  return undefined;
}

/** Der Code eines Ergebnisses der Starship Encounter Table: Entwurf, Pirat. */
function parseEncounter(code: string): { design: string; pirate: boolean } {
  const letter = code[0]!;
  const design = ref.ships.find((s) => s.code === letter);
  if (design === undefined) throw new DomainError(`Den Schiffstyp ${letter} gibt es nicht.`);
  return { design: design.id, pirate: code.includes('P') };
}

/** Spalte und DM der Starship Encounter Table (SE 13) für ein System. */
export interface EncounterColumn {
  readonly column: 'A' | 'B' | 'C' | 'D' | 'E' | 'X';
  readonly dm: number;
  readonly navalBase: boolean;
  readonly scoutBase: boolean;
}

/** Die Spalte der Starship Encounter Table und ihre DMs für das System der Welt `world`: Raumhafen der Hauptwelt, Marine- und Scoutbasis (2026-11-22b). */
export function encounterColumnAt(hexes: Campaign['hexes'], world: string): EncounterColumn {
  const hex = hexById(hexes, hexIdOfWorld(world));
  const main = hex?.main === undefined ? undefined : worldById(hexes, hex.main);
  const letter = main?.uwp.starport === undefined ? 'X' : starportLetter(main.uwp.starport);
  const port = (['A', 'B', 'C', 'D', 'E'] as const).find((p) => p === letter) ?? 'X';
  const navalBase = hex?.navalBase === true;
  const scoutBase = hex?.scoutBase === true;
  return { column: port, dm: (navalBase ? 2 : 0) + (scoutBase ? 1 : 0), navalBase, scoutBase };
}

/** Die Spalte der Starship Encounter Table und ihre DMs für das System des Flugs. */
export function encounterColumn(campaign: Campaign): EncounterColumn {
  return encounterColumnAt(campaign.hexes, activeFlight(campaign).world);
}

/** Der Eintrag der Tabelle zu einer Summe mit DM (höchstens 15); `undefined`: kein Schiff. */
function encounterCode(column: EncounterColumn['column'], total: number): string | undefined {
  return ref.starshipEncounters[column]?.[Math.min(15, total) - 2] ?? undefined;
}

/** Der Zielwert (2026-11-22b): die Summen auf 2W6, bei denen ein Schiff kommt (`/shipOn`). */
export function shipOnSums(at: Pick<EncounterColumn, 'column' | 'dm'>): readonly number[] {
  const sums: number[] = [];
  for (let n = 2; n <= 12; n++) if (encounterCode(at.column, n + at.dm) !== undefined) sums.push(n);
  return sums;
}

/** Ein Wurf auf der Starship Encounter Table mit Reaktion (SE 13, SE 21), noch ohne Folgen. */
export interface ShipEncounterRoll {
  readonly encounter: Dice;
  readonly total: number;
  /** Der Eintrag der Tabelle; fehlt: kein Schiff. */
  readonly code?: string;
  readonly design?: string;
  readonly intent?: Intent;
  readonly reaction?: Dice;
  readonly attack?: Dice;
}

/**
 * Würfelt auf der Starship Encounter Table (SE 13): 2W6 + DM auf die Spalte. Ohne Ergebnis kommt kein
 * Schiff. Ein Pirat greift an; sonst entscheidet die Reaktion (SE 21): 2 greift an, 3 bei 5+, 4 bei 8+
 * auf einen weiteren Wurf, sonst ignoriert es die Gruppe.
 */
export function rollEncounterTable(at: Pick<EncounterColumn, 'column' | 'dm'>, random: Random): ShipEncounterRoll {
  const encounter = roll2d6(random);
  const total = Math.min(15, sum(encounter) + at.dm);
  const code = encounterCode(at.column, total);
  if (code === undefined || code === null) return { encounter, total };
  const { design, pirate } = parseEncounter(code);
  if (pirate) return { encounter, total, code, design, intent: 'attack' };
  const reaction = roll2d6(random);
  const r = sum(reaction);
  const attack = r === 3 || r === 4 ? roll2d6(random) : undefined;
  const intent: Intent = r === 2 || (attack !== undefined && sum(attack) >= (r === 3 ? 5 : 8)) ? 'attack' : 'ignore';
  return { encounter, total, code, design, intent, reaction, ...(attack ? { attack } : {}) };
}

/** Wo ein gewürfeltes fremdes Schiff auftaucht: 2W6 Raumbänder, Richtung 1W6 × 60° (Hausregel). */
function foeOffset(random: Random): { readonly bands: number; readonly angle: number } {
  return { bands: sum(roll2d6(random)), angle: d6(random) * 60 };
}

/** Die Würfe eines Begegnungswurfs für den Logeintrag. */
function rolledFields(roll: ShipEncounterRoll): Pick<SpaceBattle, 'encounter' | 'reaction' | 'attack'> {
  return { encounter: roll.encounter, ...(roll.reaction ? { reaction: roll.reaction } : {}), ...(roll.attack ? { attack: roll.attack } : {}) };
}

/**
 * Würfelt eine Schiffsbegegnung im Systemflug (SE 13): 2W6 + DM auf die Spalte des Raumhafens. Ohne
 * Ergebnis kommt kein Schiff (`campaign` bleibt); sonst taucht es auf (`placeFoe`).
 */
export function rollShipEncounter(campaign: Campaign, random: Random, clock: Clock): { readonly campaign: Campaign; readonly encounter: Dice; readonly total: number; readonly code: string | undefined } {
  const blocker = encounterBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const roll = rollEncounterTable(encounterColumn(campaign), random);
  if (roll.code === undefined) return { campaign, encounter: roll.encounter, total: roll.total, code: undefined };
  return { campaign: placeFoe(campaign, roll.design!, roll.intent!, clock, foeOffset(random), rolledFields(roll)), encounter: roll.encounter, total: roll.total, code: roll.code };
}

/** Anlass und Ziel einer Begegnung bei Abreise oder Ankunft (2026-11-22b). */
export interface EncounterContext {
  readonly occasion?: 'departure' | 'arrival';
  readonly jumpTo?: string;
  readonly travelTo?: string;
}

/** Der Logeintrag einer Begegnung aus einem Wurf mit Schiff, ohne Systemflug (eine Sichtung, 2026-11-22b). */
export function sightingEntry(campaign: Campaign, roll: ShipEncounterRoll, context: EncounterContext, clock: Clock): SpaceBattle {
  if (roll.design === undefined || roll.intent === undefined) throw new DomainError('Bei diesem Wurf kam kein Schiff.');
  const plan = shipDesignOf(roll.design);
  const name = plan.name === shipOf(campaign)?.name ? `${plan.name} (fremd)` : plan.name;
  return { kind: 'spaceBattle', at: clock.now(), day: campaign.day, foe: name, design: plan.id, intent: roll.intent, ...rolledFields(roll), ...context };
}

/**
 * Eine Begegnung bei Abreise, Ankunft oder von Hand öffnet die Raumkarte (2026-11-22b): ein neuer
 * Systemflug, beim Start an der Welt des Schiffs (wie „Systemflug beginnen“), bei der Ankunft an der
 * Sprunggrenze der Zielwelt (Richtung 1W6 × 60°); dann taucht das fremde Schiff auf wie beim Knopf.
 * Beim Start hält der Flug das Ziel der unterbrochenen Reise (`departure`).
 */
export function encounterFlight(campaign: Campaign, roll: ShipEncounterRoll, context: EncounterContext, random: Random, clock: Clock): Campaign {
  if (roll.design === undefined || roll.intent === undefined) throw new DomainError('Bei diesem Wurf kam kein Schiff.');
  let started: Campaign;
  if (context.occasion === 'arrival') {
    const world = campaign.location?.world;
    if (world === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt.');
    started = startArrivalFlight(campaign, world, d6(random) * 60, clock);
  } else {
    const world = launchWorld(campaign);
    if (world === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
    started = startFlight(campaign, world, clock);
  }
  const departure = context.occasion === 'departure' ? { ...(context.jumpTo ? { jumpTo: context.jumpTo } : {}), ...(context.travelTo ? { travelTo: context.travelTo } : {}) } : undefined;
  if (departure !== undefined) started = { ...started, flight: { ...activeFlight(started), departure } };
  return placeFoe(started, roll.design, roll.intent, clock, foeOffset(random), { ...rolledFields(roll), ...context });
}

/**
 * Ein fremdes Schiff taucht auf, mit Entwurf und Absicht (von Hand gewählt oder aus `rollShipEncounter`):
 * `offset.bands` Raumbänder vom eigenen Schiff in Richtung `offset.angle` (Grad), mit dessen
 * Geschwindigkeit; von Hand 7 Raumbänder voraus. Logeintrag `SpaceBattle`.
 */
export function placeFoe(campaign: Campaign, design: string, intent: Intent, clock: Clock, offset?: { readonly bands: number; readonly angle: number }, extra: Partial<Pick<SpaceBattle, 'encounter' | 'reaction' | 'attack' | 'occasion' | 'jumpTo' | 'travelTo'>> = {}): Campaign {
  const blocker = encounterBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const plan = shipDesignOf(design);
  const flight = activeFlight(campaign);
  const own = flight.units[partyIndexOf(flight)]!;
  const ahead = lengthOf(own.velocity) > 1e-6 ? Math.atan2(own.velocity.y, own.velocity.x) : Math.PI / 2;
  const angle = offset === undefined ? ahead : (offset.angle * Math.PI) / 180;
  const km = (offset?.bands ?? 7) * BAND_KM;
  const position = { x: own.position.x + km * Math.cos(angle), y: own.position.y + km * Math.sin(angle) };
  const ownName = shipOf(campaign)?.name;
  const name = plan.name === ownName ? `${plan.name} (fremd)` : plan.name;
  const foe: SpaceUnit = { design: plan.id, name, intent, position, velocity: own.velocity, crashed: false, track: own.track.map(() => ({ position, velocity: own.velocity })) };
  const entry: SpaceBattle = { kind: 'spaceBattle', at: clock.now(), day: campaign.day, foe: name, design: plan.id, intent, ...extra };
  return { ...campaign, flight: { ...flight, units: [...flight.units, foe] }, log: [...campaign.log, entry] };
}

/** Warum eine Einheit gar nicht feuern kann: Ziel, Aufschlag, Entfernung und Sichtlinie. */
function shotBaseBlocker(campaign: Campaign, index: number, target: number): string | undefined {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  const other = flight.units[target];
  if (unit === undefined || other === undefined || target === index) return 'Dieses Ziel gibt es nicht.';
  const name = nameOfUnit(campaign, unit);
  if (unit.crashed) return `${name} ist aufgeschlagen.`;
  if (other.crashed) return `${nameOfUnit(campaign, other)} ist aufgeschlagen.`;
  const bands = bandOf(lengthOf({ x: unit.position.x - other.position.x, y: unit.position.y - other.position.y }));
  if (bands > TRACKING_BANDS) return `${nameOfUnit(campaign, other)} ist ${bands} Raumbänder entfernt, zu weit (höchstens ${TRACKING_BANDS}).`;
  const scene = sceneOf(campaign.hexes, flight.world);
  if (!lineOfSight(scene, unit.position, other.position, flightTime(campaign, flight))) return `Ein Körper verdeckt ${nameOfUnit(campaign, other)}.`;
  return undefined;
}

/** Das Schiff einer eigenen Einheit; ein fremdes Schiff hat keins (Domänenmodell 2026-11-22d). */
function shipOfUnit(campaign: Campaign, unit: SpaceUnit): Ship | undefined {
  return unit.ship === undefined ? undefined : shipById(campaign, unit.ship);
}

/** Die Fertigkeit des Piloten der Einheit (0 ohne Pilot, 0 bei einem fremden Schiff). */
export function pilotSkillOf(campaign: Campaign, unit: SpaceUnit): number {
  const ship = shipOfUnit(campaign, unit);
  if (ship === undefined) return 0;
  const at = postsOf(ship).findIndex((p) => p.post === 'pilot');
  return at < 0 ? 0 : postSkill(campaign, ship, at);
}

/**
 * Warum der Hardpoint `turret` der Einheit `index` jetzt nicht auf `target` feuert (2026-11-23):
 * Aufschlag, ausgefallener Hardpoint, Laser und das Pflichtprogramm *Target*; dazu, wenn `target`
 * gegeben ist, Ziel, Entfernung, Sichtlinie und ob der Hardpoint in dieser Raumrunde schon gefeuert
 * hat. Das Blatt fragt ohne `target`, um den Hardpoint selbst zu erklären.
 */
export function hardpointBlocker(campaign: Campaign, index: number, target: number | undefined, turret: number): string | undefined {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) return 'Diese Einheit gibt es nicht.';
  const name = nameOfUnit(campaign, unit);
  if (unit.crashed) return `${name} ist aufgeschlagen.`;
  const turrets = turretsOfUnit(campaign, unit);
  if (turrets[turret] === undefined) return 'Diesen Hardpoint gibt es nicht.';
  if (turrets[turret].weapons.filter((w) => w.endsWith('laser')).length === 0) return `${name}: kein Laser auf Hardpoint ${turret + 1}.`;
  if (turretsDown(damageOfUnit(campaign, unit)).includes(turret)) return `Hardpoint ${turret + 1} von ${name} ist ausgefallen.`;
  const ship = shipOfUnit(campaign, unit);
  if (ship !== undefined && !hasTarget(ship)) return `Ohne ${softwareOf(TARGET_PROGRAM).name} in der CPU feuert kein Turret (SE 13).`;
  if (target === undefined) return undefined;
  const base = shotBaseBlocker(campaign, index, target);
  if (base !== undefined) return base;
  if ((unit.firedTurrets ?? []).includes(turret)) return `${name} hat Hardpoint ${turret + 1} in dieser Raumrunde schon gefeuert.`;
  if (shotsOf(campaign, flight, sceneOf(campaign.hexes, flight.world), index, target, flightTime(campaign, flight), turret).length === 0) return `${name}: Hardpoint ${turret + 1} hat keinen freien Laser.`;
  return undefined;
}

/** Ein Hardpoint im Blatt (2026-11-23): welche Waffen dort sitzen und warum er jetzt nicht feuert. */
export interface Hardpoint {
  readonly turret: number;
  readonly name: string;
  readonly weapons: readonly string[];
  /** Wie viele Laser dieses Hardpoints jetzt feuern können (ein Wurf je Laser). */
  readonly lasers: number;
  readonly out: boolean;
  readonly fired: boolean;
  readonly blocker: string | undefined;
}

/** Die Hardpoints der Einheit `index`, die Bewaffnung tragen, mit ihrem Stand (2026-11-23). */
export function hardpointsOf(campaign: Campaign, index: number): readonly Hardpoint[] {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) return [];
  const damage = damageOfUnit(campaign, unit);
  const lasers = lasersOfUnit(campaign, unit);
  const onlyOne = withoutComputer(designOfUnit(campaign, unit));
  return turretsOfUnit(campaign, unit)
    .map((turret, at) => {
      const guns = turret.weapons.filter((w) => w.endsWith('laser'));
      // Ohne Computer arbeitet nur der erste Laser des Schiffs, der im ersten Hardpoint steht (SE 13).
      const usable = lasers.filter((l) => l.turret === at && (!onlyOne || at === 0));
      return {
        turret: at,
        name: `Hardpoint ${at + 1}`,
        weapons: guns,
        lasers: usable.length,
        out: turretsDown(damage).includes(at),
        fired: (unit.firedTurrets ?? []).includes(at),
        blocker: hardpointBlocker(campaign, index, undefined, at),
      };
    })
    .filter((h) => h.weapons.length > 0);
}

/**
 * Warum die Einheit `index` jetzt nicht auf `target` feuern kann (2026-11-21i); `undefined`, wenn sie
 * kann. Jeder Hardpoint feuert höchstens einmal je Raumrunde.
 */
export function fireBlocker(campaign: Campaign, index: number, target: number): string | undefined {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) return 'Diese Einheit gibt es nicht.';
  const base = shotBaseBlocker(campaign, index, target);
  if (base !== undefined) return base;
  const ship = shipOfUnit(campaign, unit);
  if (ship !== undefined && !hasTarget(ship)) return `Ohne ${softwareOf(TARGET_PROGRAM).name} in der CPU feuert kein Turret (SE 13).`;
  if (lasersOfUnit(campaign, unit).length === 0) return `${nameOfUnit(campaign, unit)} hat keinen Laser, der feuern kann.`;
  if (hardpointsOf(campaign, index).every((h) => h.fired || h.out || h.lasers === 0)) return `${nameOfUnit(campaign, unit)} hat in dieser Raumrunde schon gefeuert.`;
  return undefined;
}

/**
 * Die höchste G einer Einheit nach Schaden (fremde Schiffe ohne Absicht treiben). Eigene Schiffe
 * stehen ohne *Maneuver* in der CPU still; läuft ein Ausweichprogramm, kostet das 1 G
 * (Domänenmodell 2026-11-22d). Fremde Schiffe haben Maneuver und Target in der CPU, sonst nichts.
 */
export function unitMaxG(campaign: Campaign, unit: SpaceUnit): number {
  const base = maneuverAfter(designOfUnit(campaign, unit), damageOfUnit(campaign, unit));
  const ship = shipOfUnit(campaign, unit);
  if (ship === undefined) return base;
  if (!hasThrust(ship)) return 0;
  return Math.max(0, base - (evades(ship) ? 1 : 0));
}

/**
 * Wie ein fremdes Schiff in dieser Raumrunde schubt (Konzept, Abschnitt 6): Es probiert 49 Schübe
 * (keiner, 16 Richtungen × ⅓, ⅔, volle Stärke), rechnet je zwei Raumrunden voraus, das eigene Schiff
 * mit seinem gesetzten Schub, und nimmt den, der der Absicht am besten dient. Ohne Zufall.
 */
export function planFoe(campaign: Campaign, scene: Scene, index: number, t: number): Vec | undefined {
  const flight = activeFlight(campaign);
  const unit = flight.units[index]!;
  if (unit.intent === undefined || unit.intent === 'ignore') return undefined;
  const maxG = unitMaxG(campaign, unit);
  if (maxG <= 0) return undefined;
  const own = flight.units[partyIndexOf(flight)]!;
  const ownPath = propagate(scene, own, own.thrust, 2 * ROUND_STEPS, ROUND_STEPS, t);
  const candidates: (Vec | undefined)[] = [undefined];
  for (let k = 0; k < 16; k++) {
    const a = (k * Math.PI) / 8;
    for (const f of [1 / 3, 2 / 3, 1]) candidates.push({ x: Math.cos(a) * maxG * f, y: Math.sin(a) * maxG * f });
  }
  let best: Vec | undefined;
  let bestScore = Infinity;
  for (const thrust of candidates) {
    const path = propagate(scene, unit, thrust, 2 * ROUND_STEPS, ROUND_STEPS, t);
    let score = 0;
    for (const at of [ROUND_STEPS, 2 * ROUND_STEPS]) {
      const s = path[at]!;
      if (s.crashed || s.landedOn !== undefined) score += 1e15;
      const d = lengthOf({ x: s.position.x - ownPath[at]!.position.x, y: s.position.y - ownPath[at]!.position.y });
      if (unit.intent === 'attack') {
        score += Math.abs(d - ATTACK_KM);
        if (!lineOfSight(scene, s.position, ownPath[at]!.position, t + (at / ROUND_STEPS) * ROUND_SECONDS)) score += 20 * BAND_KM;
      } else score -= d;
    }
    if (score < bestScore - 1e-6) {
      bestScore = score;
      best = thrust;
    }
  }
  return best;
}

/** Ein Schuss vor dem Würfeln. */
interface Shot {
  readonly from: number;
  readonly to: number;
  readonly turret: number;
  readonly weapon: string;
  readonly dm: number;
  readonly bands: number;
  readonly computerHits: number;
  readonly noComputer: boolean;
  /** Die DM der Programme (2026-11-23): Predict und der Gunner beim Schützen, Ausweichen beim Ziel. */
  readonly predict: number;
  readonly gunnery: number;
  readonly evade: number;
}

/**
 * Die Schüsse einer Einheit auf `to`: jeder arbeitende Laser einzeln, mit Sichtlinie und höchstens
 * 90 Raumbändern. `turret` gibt vor, dass nur dieser Hardpoint feuert, `skip` lässt die Hardpoints
 * aus, die in dieser Raumrunde schon gefeuert haben (2026-11-23).
 */
function shotsOf(campaign: Campaign, flight: SystemFlight, scene: Scene, from: number, to: number, t: number, turret?: number, skip: readonly number[] = []): readonly Shot[] {
  const a = flight.units[from]!;
  const b = flight.units[to]!;
  if (a.crashed || b.crashed) return [];
  const damage = damageOfUnit(campaign, a);
  const bands = bandOf(lengthOf({ x: a.position.x - b.position.x, y: a.position.y - b.position.y }));
  if (bands > TRACKING_BANDS || !lineOfSight(scene, a.position, b.position, t)) return [];
  const computerHits = count(damage, 'computer');
  const noComputer = withoutComputer(designOfUnit(campaign, a));
  // Die Programme in der CPU des Schützen (2026-11-23): Predict und, mit Gunner Interact, die
  // Fertigkeit des Gunners dieses Hardpoints; die des Ziels: sein Ausweich-DM.
  const shooter = shipOfUnit(campaign, a);
  const predict = shooter === undefined ? 0 : predictDm(shooter);
  const target = shipOfUnit(campaign, b);
  const evade = target === undefined ? 0 : evadeDmOf(target, pilotSkillOf(campaign, b));
  return lasersOfUnit(campaign, a)
    .filter(({ turret: at }) => (turret === undefined || at === turret) && !skip.includes(at))
    .map(({ turret: at, weapon }) => {
      const gunnery = shooter !== undefined && usesGunner(shooter) ? gunnerSkillOf(campaign, shooter, at) : 0;
      const parts = dmPartsOf(weapon, bands, computerHits, noComputer, { predict, gunnery, evade });
      return { from, to, turret: at, weapon, bands, computerHits, noComputer, predict, gunnery, evade, dm: sumDms(parts) };
    });
}

/** Ein Teil des DM eines Laserschusses (2026-11-21i): wofür und wie viel. */
export interface SpaceDmPart {
  readonly reason: 'range' | 'pulse' | 'computer' | 'noComputer' | 'predict' | 'gunnery' | 'evade';
  readonly dm: number;
}

/**
 * Die DMs eines Laserschusses (SE 12, Hausregel Computer, Domänenmodell 2026-11-22d): Entfernung über
 * 25 bzw. 50 Raumbänder, Pulse Laser, je Computer-Treffer −1, Small Craft ohne Computer −1 (SE 13);
 * dazu die Programme in der CPU: `predict`, die Fertigkeit des `gunnery` und das `evade` des Ziels;
 * nur die, die zählen.
 */
export function dmPartsOf(
  weapon: string,
  bands: number,
  computerHits: number,
  noComputer = false,
  program: { readonly predict?: number; readonly gunnery?: number; readonly evade?: number } = {},
): readonly SpaceDmPart[] {
  const parts: SpaceDmPart[] = [];
  if (spaceRangeDm(bands) !== 0) parts.push({ reason: 'range', dm: spaceRangeDm(bands) });
  if (weapon === 'pulse-laser') parts.push({ reason: 'pulse', dm: -1 });
  if (computerHits > 0) parts.push({ reason: 'computer', dm: -computerHits });
  if (noComputer) parts.push({ reason: 'noComputer', dm: -1 });
  if ((program.predict ?? 0) !== 0) parts.push({ reason: 'predict', dm: program.predict! });
  if ((program.gunnery ?? 0) !== 0) parts.push({ reason: 'gunnery', dm: program.gunnery! });
  if ((program.evade ?? 0) !== 0) parts.push({ reason: 'evade', dm: program.evade! });
  return parts;
}

const sumDms = (parts: readonly SpaceDmPart[]) => parts.reduce((n, p) => n + p.dm, 0);

/** Was ein Schuss von `from` auf `to` jetzt bräuchte (2026-11-21i): Entfernung, Computer-Treffer und je Waffe Anzahl, DMs und der nötige Wurf auf 2W6. `turret` beschränkt es auf einen Hardpoint (2026-11-23). */
export interface FirePreview {
  readonly bands: number;
  readonly computerHits: number;
  /** Die DM der Programme in der CPU (2026-11-23): Predict, der Gunner und das Ausweichen des Ziels. */
  readonly predict: number;
  readonly gunner: number;
  readonly evade: number;
  readonly weapons: readonly { readonly weapon: string; readonly count: number; readonly parts: readonly SpaceDmPart[]; readonly dm: number; readonly need: number }[];
}

export function firePreview(campaign: Campaign, from: number, to: number, turret?: number): FirePreview | undefined {
  const flight = activeFlight(campaign);
  const a = flight.units[from];
  const b = flight.units[to];
  if (a === undefined || b === undefined) return undefined;
  const damage = damageOfUnit(campaign, a);
  const bands = bandOf(lengthOf({ x: a.position.x - b.position.x, y: a.position.y - b.position.y }));
  const computerHits = count(damage, 'computer');
  const noComputer = withoutComputer(designOfUnit(campaign, a));
  const shooter = shipOfUnit(campaign, a);
  const predict = shooter === undefined ? 0 : predictDm(shooter);
  const targetShip = shipOfUnit(campaign, b);
  const evade = targetShip === undefined ? 0 : evadeDmOf(targetShip, pilotSkillOf(campaign, b));
  // Gunner Interact: die Fertigkeit des Gunners des Hardpoints, der feuert (ohne Gunner 0).
  const gunner = shooter === undefined || !usesGunner(shooter) ? 0 : gunnerSkillOf(campaign, shooter, turret ?? 0);
  const weapons = new Map<string, number>();
  for (const { weapon, turret: at } of lasersOfUnit(campaign, a)) {
    if (turret !== undefined && at !== turret) continue;
    weapons.set(weapon, (weapons.get(weapon) ?? 0) + 1);
  }
  return {
    bands,
    computerHits,
    predict,
    gunner,
    evade,
    weapons: [...weapons].map(([weapon, n]) => {
      const parts = dmPartsOf(weapon, bands, computerHits, noComputer, { predict, gunnery: gunner, evade });
      return { weapon, count: n, parts, dm: sumDms(parts), need: HIT_TARGET - sumDms(parts) };
    }),
  };
}

/** Die Fertigkeit des Gunners dieses Hardpoints (0 ohne Gunner-Posten oder ohne Gunner dahinter, 2026-11-23). */
export function gunnerSkillOf(campaign: Campaign, ship: Ship, turret: number): number {
  const at = gunnerPost(ship, turret);
  return at < 0 ? 0 : postSkill(campaign, ship, at);
}

/**
 * Würfelt die Trefferzonen eines Treffers: Beam Laser einen Schadenswurf, Pulse Laser zwei; bei 12
 * kritisch (1W6). Ein Small Craft als Ziel würfelt in seiner Spalte; ohne Computer zählt ein
 * Computer-Treffer als Drive (SE 12, 2026-11-22).
 */
function rollHits(weapon: string, target: string, random: Random): readonly HitZone[] {
  const craft = shipDesignOf(target).kind === 'smallCraft';
  const zones: HitZone[] = [];
  for (let k = 0; k < (weapon === 'pulse-laser' ? 2 : 1); k++) {
    const roll = sum(roll2d6(random));
    let zone = roll === 12 ? (craft ? CRAFT_CRITICAL_TABLE : CRITICAL_TABLE)[d6(random) - 1]! : (craft ? CRAFT_HIT_TABLE : HIT_TABLE)[roll - 2]!;
    if (craft && shipDesignOf(target).computer === undefined) zone = zone === 'computer' ? 'drive' : zone === 'criticalComputer' ? 'criticalDrive' : zone;
    zones.push(zone);
  }
  return zones;
}

/** Wendet Trefferzonen auf eine Einheit an: am eigenen Schiff mit Treibstoff und Fracht, Turrets fallen zufällig aus (1W6). */
function applyHits(campaign: Campaign, index: number, zones: readonly HitZone[], random: Random): Campaign {
  if (zones.length === 0) return campaign;
  const flight = activeFlight(campaign);
  const unit = flight.units[index]!;
  const turrets = turretsOfUnit(campaign, unit);
  let damage: ShipDamage = damageOfUnit(campaign, unit) ?? { hits: [], turretsOut: [] };
  let fuelLost = 0;
  let cargoLost = 0;
  for (const zone of zones) {
    let hit = zone;
    // Weapons eines Small Craft: seine Bewaffnung ist zerstört (SR 41); ohne zählt er wie Cabin.
    if (zone === 'weapons') {
      if (turrets.length === 0 || turretsDown(damage).includes(0)) hit = 'cabin';
      else damage = { ...damage, turretsOut: [...damage.turretsOut, 0] };
    }
    if (zone === 'turret') {
      const working = turrets.map((_, i) => i).filter((i) => !turretsDown(damage).includes(i));
      if (working.length === 0) hit = 'hull';
      else damage = { ...damage, turretsOut: [...damage.turretsOut, working[(d6(random) - 1) % working.length]!] };
    }
    if (hit === 'fuel') fuelLost += 10;
    if (hit === 'hold') cargoLost += 10;
    damage = { ...damage, hits: [...damage.hits, hit] };
  }
  if (unit.ship !== undefined) {
    const id = unit.ship;
    return {
      ...campaign,
      ships: campaign.ships.map((s) => {
        if (s.id !== id) return s;
        const fuel = Math.max(0, s.fuel - fuelLost);
        return { ...s, damage, fuel, unrefined: Math.min(s.unrefined, fuel), ...loseCargo(s, cargoLost) };
      }),
    };
  }
  return { ...campaign, flight: { ...flight, units: flight.units.map((u, i) => (i === index ? { ...u, damage } : u)) } };
}

/**
 * Treffer im Laderaum (10 t je Treffer): Seit den Ladungen (2026-11-27) geht die Tonnage von den
 * Ladungen ab, von der zuletzt geladenen an; eine Ladung ohne Tonnen ist verloren (ausgeblendet).
 * ⚑ Welche Ladung es trifft, ist eine offene Frage (TODO); Stückwaren verlieren ganze Stücke.
 */
function loseCargo(ship: Ship, tons: number): Pick<Ship, 'hold'> | Record<string, never> {
  if (tons <= 0 || ship.hold === undefined) return {};
  let left = tons;
  const hold = [...ship.hold].reverse().map((c) => {
    if (left <= 0 || c.retired || c.tons === 0) return c;
    const lost = Math.min(left, c.tons);
    left -= lost;
    const rest = c.tons - lost;
    if (rest <= 0) return { ...c, retired: true };
    const perItem = c.count === undefined ? undefined : c.tons / c.count;
    return { ...c, tons: perItem ? Math.floor(rest / perItem) * perItem : rest, ...(perItem ? { count: Math.floor(rest / perItem) } : {}) };
  });
  return { hold: hold.reverse() };
}

/** Würfelt Schüsse und hängt sie ans Log; gibt die Treffer je Ziel zurück. `returnFire`: der Schuss ist ein Rückfeuer (2026-11-23). */
function fire(campaign: Campaign, shots: readonly Shot[], random: Random, clock: Clock, returnFire = false): { campaign: Campaign; hits: Map<number, HitZone[]> } {
  const flight = activeFlight(campaign);
  const hits = new Map<number, HitZone[]>();
  const log = [...campaign.log];
  for (const shot of shots) {
    const dice = roll2d6(random);
    const hit = sum(dice) + shot.dm >= HIT_TARGET;
    const zones = hit ? rollHits(shot.weapon, designOfUnit(campaign, flight.units[shot.to]!), random) : [];
    hits.set(shot.to, [...(hits.get(shot.to) ?? []), ...zones]);
    const entry: SpaceAttack = {
      kind: 'spaceAttack',
      at: clock.now(),
      day: campaign.day,
      round: flight.round,
      attacker: nameOfUnit(campaign, flight.units[shot.from]!),
      target: nameOfUnit(campaign, flight.units[shot.to]!),
      turret: shot.turret,
      weapon: shot.weapon,
      dice,
      dm: shot.dm,
      bands: shot.bands,
      computerHits: shot.computerHits,
      ...(shot.noComputer ? { noComputer: true } : {}),
      ...(shot.predict !== 0 ? { predict: shot.predict } : {}),
      ...(shot.gunnery !== 0 ? { gunnery: shot.gunnery } : {}),
      ...(shot.evade !== 0 ? { evade: shot.evade } : {}),
      ...(returnFire ? { returnFire: true } : {}),
      hits: zones,
    };
    log.push(entry);
  }
  return { campaign: { ...campaign, log }, hits };
}

/**
 * Eine Salve: die Laser von `from` auf `to` – nur die des Hardpoints `turret`, sonst alle noch freien
 * –, Schaden nach allen Würfen, danach `firedTurrets` von `from` erweitert. `all` ignoriert die
 * Hardpoints, die schon gefeuert haben (das Rückfeuer des Programms Return Fire, 2026-11-23).
 */
function volley(campaign: Campaign, from: number, to: number, random: Random, clock: Clock, opts: { readonly turret?: number; readonly all?: boolean; readonly returnFire?: boolean } = {}): Campaign {
  const flight = activeFlight(campaign);
  const scene = sceneOf(campaign.hexes, flight.world);
  const skip = opts.all === true || opts.turret !== undefined ? [] : (flight.units[from]?.firedTurrets ?? []);
  const shots = shotsOf(campaign, flight, scene, from, to, flightTime(campaign, flight), opts.turret, skip);
  const fired = fire(campaign, shots, random, clock, opts.returnFire === true);
  let after = fired.campaign;
  for (const [target, zones] of fired.hits) after = applyHits(after, target, zones, random);
  const now = activeFlight(after);
  const used = [...new Set(shots.map((s) => s.turret))];
  return {
    ...after,
    flight: {
      ...now,
      units: now.units.map((u, i) => (i === from ? { ...u, firedTurrets: [...new Set([...(u.firedTurrets ?? []), ...used])], ...(opts.returnFire === true ? { returned: true } : {}) } : u)),
    },
  };
}

/**
 * Nach einem Schuss von `from` auf `to`: das Rückfeuer des Ziels (SR 40), solange es in dieser
 * Raumrunde noch nicht gefeuert hat. Ein eigenes Schiff feuert nur von selbst zurück, wenn *Return
 * Fire* in seiner CPU liegt – dann auch, wenn es schon gefeuert hat, aber einmal je Raumrunde
 * (Domänenmodell 2026-11-22d, 2026-11-23); ohne das Programm darf die Gruppe selbst feuern.
 */
function returnFireOf(campaign: Campaign, from: number, to: number, random: Random, clock: Clock): Campaign {
  const unit = activeFlight(campaign).units[to];
  if (unit === undefined) return campaign;
  const ship = shipOfUnit(campaign, unit);
  if (ship === undefined) {
    if (fireBlocker(campaign, to, from) === undefined) return volley(campaign, to, from, random, clock);
    return campaign;
  }
  if (!returnsFire(ship) || unit.returned === true) return campaign;
  if (shotBaseBlocker(campaign, to, from) !== undefined || lasersOfUnit(campaign, unit).length === 0) return campaign;
  return volley(campaign, to, from, random, clock, { all: true, returnFire: true });
}

/** Ein beschossenes fremdes Schiff, das nicht angriff, greift danach an (mit Laser) oder flieht; dann das Ende des Raumkampfs. */
function reactAndSettle(campaign: Campaign, target: number, clock: Clock): { readonly campaign: Campaign; readonly lost: boolean } {
  const flight = activeFlight(campaign);
  const units = flight.units.map((u, i) => {
    if (i !== target || u.ship !== undefined || u.intent === undefined || u.intent === 'attack') return u;
    return { ...u, intent: (lasersOfUnit(campaign, u).length > 0 ? 'attack' : 'flee') as Intent };
  });
  return settleBattle({ ...campaign, flight: { ...flight, units } }, clock);
}

/**
 * Der Hardpoint `turret` der Einheit `index` feuert auf `target` – ein Tipp im Blatt (2026-11-23):
 * sofort seine Laser, dann das Rückfeuer des Ziels, dann das Ende des Raumkampfs.
 */
export function fireHardpoint(campaign: Campaign, index: number, target: number, turret: number, random: Random, clock: Clock): { readonly campaign: Campaign; readonly lost: boolean } {
  const blocker = hardpointBlocker(campaign, index, target, turret);
  if (blocker) throw new DomainError(blocker);
  let after = volley(campaign, index, target, random, clock, { turret });
  after = returnFireOf(after, index, target, random, clock);
  return reactAndSettle(after, target, clock);
}

/**
 * Die Einheit `index` feuert auf `target` (2026-11-21i): sofort, alle noch freien Hardpoints, dann das
 * Rückfeuer des Ziels, wenn es in dieser Raumrunde noch nicht gefeuert hat und kann (SR 40) oder wenn
 * *Return Fire* in seiner CPU läuft. Danach das Ende des Raumkampfs (`settleBattle`).
 */
export function fireAt(campaign: Campaign, index: number, target: number, random: Random, clock: Clock): { readonly campaign: Campaign; readonly lost: boolean } {
  const blocker = fireBlocker(campaign, index, target);
  if (blocker) throw new DomainError(blocker);
  let after = volley(campaign, index, target, random, clock);
  after = returnFireOf(after, index, target, random, clock);
  return reactAndSettle(after, target, clock);
}

/** Nach der Bewegung (2026-11-21i): Angreifende fremde Schiffe feuern auf das eigene Schiff, wenn sie können; mit *Return Fire* antwortet das eigene Schiff von selbst (2026-11-23). */
export function foesFire(campaign: Campaign, random: Random, clock: Clock): Campaign {
  let after = campaign;
  for (const [i, u] of activeFlight(campaign).units.entries()) {
    const party = partyIndexOf(activeFlight(after));
    if (u.ship !== undefined || u.intent !== 'attack') continue;
    if (fireBlocker(after, i, party) === undefined) {
      after = volley(after, i, party, random, clock);
      after = returnFireOf(after, i, party, random, clock);
    }
  }
  return after;
}

// --- Schadenskontrolle (SR 42, Domänenmodell 2026-11-22d) -----------------------------------------

/** Schadenskontrolle gelingt auf 2W6 + Engineering 9+ (SR 42). */
export const DAMAGE_CONTROL_TARGET = 9;
/** ⚑ Ein fremdes Schiff flickt mit Engineering 1 (2026-11-22d). */
const FOE_ENGINEERING = 1;

/** Gelang die Schadenskontrolle (`/success`)? */
export function patchSucceeded(entry: Pick<DamageControl, 'dice' | 'dm'>): boolean {
  return sum(entry.dice) + entry.dm >= DAMAGE_CONTROL_TARGET;
}

/** Die Treffer, die sich flicken lassen: ungeflickt und nicht kritisch, als Stellen in `hits`. */
export function patchableHits(damage: ShipDamage | undefined): readonly number[] {
  return (damage?.hits ?? []).flatMap((h, at) => (isCritical(h) || isPatched(damage, at) ? [] : [at]));
}

/** Der Engineer eines eigenen Schiffs (Domänenmodell 2026-11-22d): wer den Posten hat und seine Fertigkeit darauf. */
export function engineerOf(campaign: Campaign, ship: Ship): { readonly who: Character; readonly skill: number } | undefined {
  const at = postsOf(ship).findIndex((p) => p.post === 'engineer');
  if (at < 0) return undefined;
  const who = holderOf(campaign, ship, at);
  return who === undefined ? undefined : { who, skill: postSkill(campaign, ship, at) };
}

/** Hat die Einheit in dieser Raumrunde schon geflickt? Ein Logeintrag dieses Flugs mit ihrem Namen und der Raumrunde. */
function patchedThisRound(campaign: Campaign, unit: SpaceUnit): boolean {
  const flight = activeFlight(campaign);
  const name = nameOfUnit(campaign, unit);
  return campaign.log.some((e) => e.kind === 'damageControl' && e.round === flight.round && e.unit === name && e.at >= flight.startedAt);
}

/**
 * Warum das eigene Schiff der Einheit `index` jetzt nicht flicken kann (2026-11-22d); mit `hit` auch,
 * ob sich dieser Treffer flicken lässt. Einmal je Raumrunde, im Raumkampf nach der Bewegung, mit
 * einem Engineer auf dem Posten; die Crew darf nicht außer Gefecht sein.
 */
export function damageControlBlocker(campaign: Campaign, index: number, hit?: number): string | undefined {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) return 'Diese Einheit gibt es nicht.';
  const ship = shipOfUnit(campaign, unit);
  if (ship === undefined) return 'Ein fremdes Schiff flickt von selbst.';
  if (!battleRunning(campaign)) return 'Geflickt wird im Raumkampf (SR 42); den Rest repariert die Werft.';
  if (phaseOf(flight) !== 'fire') return 'Erst die Bewegung abwarten.';
  if (unit.crashed) return `${ship.name} ist aufgeschlagen.`;
  if (count(ship.damage, 'crew', 'explode') > 0) return `Die Crew von ${ship.name} ist außer Gefecht.`;
  if (engineerOf(campaign, ship) === undefined) return `${ship.name} hat keinen Engineer.`;
  if (patchedThisRound(campaign, unit)) return `${ship.name} hat in dieser Raumrunde schon geflickt.`;
  const patchable = patchableHits(ship.damage);
  if (patchable.length === 0) return `${ship.name} hat keinen Treffer, der sich flicken lässt.`;
  if (hit !== undefined && !patchable.includes(hit)) return 'Diesen Treffer kann man nicht flicken (kritisch oder schon geflickt).';
  return undefined;
}

/** Würfelt die Schadenskontrolle der Einheit `index` auf den Treffer `hit` und hängt den Eintrag an; gelingt sie, ist der Treffer geflickt. */
function patch(campaign: Campaign, index: number, hit: number, dm: number, by: Character | undefined, random: Random, clock: Clock): Campaign {
  const flight = activeFlight(campaign);
  const unit = flight.units[index]!;
  const damage = damageOfUnit(campaign, unit)!;
  const dice = roll2d6(random);
  const entry: DamageControl = { kind: 'damageControl', at: clock.now(), day: campaign.day, round: flight.round, unit: nameOfUnit(campaign, unit), dice, dm, zone: damage.hits[hit]!, ...(by ? { by: by.id } : {}) };
  const logged = { ...campaign, log: [...campaign.log, entry] };
  if (!patchSucceeded(entry)) return logged;
  const patched: ShipDamage = { ...damage, patched: [...(damage.patched ?? []), hit].sort((a, b) => a - b) };
  if (unit.ship !== undefined) {
    const id = unit.ship;
    return { ...logged, ships: logged.ships.map((s) => (s.id === id ? { ...s, damage: patched } : s)) };
  }
  return { ...logged, flight: { ...flight, units: flight.units.map((u, i) => (i === index ? { ...u, damage: patched } : u)) } };
}

/**
 * Der Engineer des eigenen Schiffs der Einheit `index` flickt den Treffer `hit` (SR 42, 2026-11-22d):
 * 2W6 + Engineering, 9+; ein geflickter Treffer wirkt nicht mehr, kostet in der Werft aber weiter.
 */
export function controlDamage(campaign: Campaign, index: number, hit: number, random: Random, clock: Clock): Campaign {
  const blocker = damageControlBlocker(campaign, index, hit);
  if (blocker) throw new DomainError(blocker);
  const ship = shipOfUnit(campaign, activeFlight(campaign).units[index]!)!;
  const engineer = engineerOf(campaign, ship)!;
  return patch(campaign, index, hit, engineer.skill, engineer.who, random, clock);
}

/** In welcher Reihenfolge ein fremdes Schiff flickt (⚑ 2026-11-22d): Maneuver und Power Plant, dann Turret, dann der Rest. */
const FOE_PATCH_ORDER: readonly HitZone[] = ['maneuver', 'powerPlant', 'turret'];

/** Nach dem Feuer (End Turn): Jedes fremde Schiff, das noch kämpft oder flieht, versucht einmal, einen Treffer zu flicken, mit Engineering 1 (⚑). */
export function foesControlDamage(campaign: Campaign, random: Random, clock: Clock): Campaign {
  let after = campaign;
  for (const [i, u] of activeFlight(campaign).units.entries()) {
    if (!activeFoe(after, u) || count(u.damage, 'crew', 'explode') > 0 || patchedThisRound(after, u)) continue;
    const open = patchableHits(u.damage);
    if (open.length === 0) continue;
    const rank = (at: number) => {
      const r = FOE_PATCH_ORDER.indexOf(u.damage!.hits[at]!);
      return r < 0 ? 2 : r < 2 ? 0 : 1;
    };
    const hit = [...open].sort((a, b) => rank(a) - rank(b) || a - b)[0]!;
    after = patch(after, i, hit, FOE_ENGINEERING, undefined, random, clock);
  }
  return after;
}

/** Feuert gleich ein fremdes Schiff nach der Bewegung? Dann braucht die Raumrunde Würfel. */
export function foesWillFire(campaign: Campaign): boolean {
  return activeFlight(campaign).units.some((u) => u.ship === undefined && u.intent === 'attack' && !u.crashed);
}

/** Hängt das Ende des Raumkampfs ans Log. */
function battleEnd(campaign: Campaign, foe: string, outcome: BattleOutcome, clock: Clock): Campaign {
  const entry: SpaceBattleEnd = { kind: 'spaceBattleEnd', at: clock.now(), day: campaign.day, foe, outcome };
  return { ...campaign, log: [...campaign.log, entry] };
}

/**
 * Nach Bewegung und Feuer: Ist ein fremdes Schiff zerstört (oder aufgeschlagen), verschwindet es; ist es
 * kampfunfähig, treibt es als Wrack weiter (ohne Absicht); ist es über 90 Raumbänder fort, ist es
 * entkommen. Ist das eigene Schiff zerstört, endet der Systemflug, das Schiff wird ausgeblendet.
 * Gibt `lost: true`, wenn das eigene Schiff verloren ist.
 */
export function settleBattle(campaign: Campaign, clock: Clock): { readonly campaign: Campaign; readonly lost: boolean } {
  const flight = activeFlight(campaign);
  let result = campaign;
  const own = flight.units[partyIndexOf(flight)]!;
  const ship = own.ship === undefined ? undefined : shipById(campaign, own.ship);
  if (ship !== undefined && destroyedBy(ship.damage)) {
    for (const u of flight.units) if (activeFoe(campaign, u)) result = battleEnd(result, nameOfUnit(campaign, u), 'lost', clock);
    // Der Systemflug endet wie mit „beenden“ (was sonst fliegt, ist danach in der Umlaufbahn); das Schiff der Gruppe ist ausgeblendet.
    const ended = endFlight(result);
    // Mit dem Mutterschiff werden auch seine Beiboote ausgeblendet (2026-11-21b).
    return { campaign: { ...ended, ships: ended.ships.map((s) => (s.id === ship.id || s.mother === ship.id ? { ...s, retired: true } : s)) }, lost: true };
  }
  const units: SpaceUnit[] = [];
  for (const u of flight.units) {
    if (u.ship !== undefined || u.intent === undefined) {
      units.push(u);
      continue;
    }
    const name = nameOfUnit(campaign, u);
    const design = designOfUnit(campaign, u);
    if (u.crashed || destroyedBy(u.damage)) {
      result = battleEnd(result, name, 'destroyed', clock);
      continue;
    }
    const km = lengthOf({ x: u.position.x - own.position.x, y: u.position.y - own.position.y });
    if (bandOf(km) > TRACKING_BANDS) {
      result = battleEnd(result, name, 'escaped', clock);
      continue;
    }
    if (disabledBy(design, shipDesignOf(design).turrets, u.damage)) {
      result = battleEnd(result, name, 'disabled', clock);
      const { intent: _i, ...wreck } = u;
      void _i;
      units.push(wreck);
      continue;
    }
    units.push(u);
  }
  return { campaign: { ...result, flight: { ...activeFlight(result), units } }, lost: false };
}

/** Endet der Systemflug (Landen, Beenden) während eines Raumkampfs: abgebrochen. */
export function breakOffBattle(campaign: Campaign, clock: Clock): Campaign {
  let result = campaign;
  for (const u of campaign.flight?.units ?? []) if (activeFoe(campaign, u)) result = battleEnd(result, nameOfUnit(campaign, u), 'broken', clock);
  return result;
}

/** Die Schiffe mit Schaden, die mit dem eigenen Schiff in die Werft kommen: es selbst und seine Beiboote an Bord (2026-11-22). */
export function damagedAtYard(campaign: Campaign, ship: Ship): readonly Ship[] {
  return [ship, ...craftOf(campaign, ship.id).filter((c) => c.aboard === true)].filter((s) => s.damage !== undefined && s.damage.hits.length > 0);
}

/** Was die Reparatur kostet: Cr 100.000 je Treffer, Cr 1.000.000 je kritischem (Hausregel), für das Schiff und seine Beiboote an Bord. */
export function repairCostOf(campaign: Campaign, ship: Ship): number {
  return damagedAtYard(campaign, ship)
    .flatMap((s) => s.damage?.hits ?? [])
    .reduce((n, h) => n + (isCritical(h) ? REPAIR_CRITICAL : REPAIR_HIT), 0);
}

/** Prüft einen geladenen Schaden. */
export function checkDamage(damage: ShipDamage, turrets: number): void {
  for (const h of damage.hits) if (!hitZones.includes(h)) throw new DomainError(`Die Trefferzone ${h} gibt es nicht.`);
  for (const t of damage.turretsOut) if (!Number.isInteger(t) || t < 0 || t >= turrets) throw new DomainError('Ein ausgefallenes Turret gibt es nicht.');
  for (const at of damage.patched ?? []) {
    const hit = damage.hits[at];
    if (hit === undefined || isCritical(hit)) throw new DomainError('Ein geflickter Treffer gibt es nicht.');
  }
}
