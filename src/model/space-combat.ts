import type { Campaign } from './campaign';
import { DomainError } from './errors';
import type { Clock, Random } from './ports';
import { ref, shipDesignOf } from './reference';
import { roll2d6, sum, type Dice } from './rules';
import { hexById, hexIdOfWorld, worldById } from './sector';
import { starportLetter } from './surface-map';
import { shipById, shipOf, type Ship, type Turret } from './ship';
import { bookShip, fundsOf } from './shop';
import { armamentBlocker } from './armament';
import type { SpaceAttack, SpaceBattle, SpaceBattleEnd } from './log';
import {
  activeFlight,
  BAND_KM,
  flightTime,
  lengthOf,
  lineOfSight,
  propagate,
  ROUND_SECONDS,
  ROUND_STEPS,
  sceneOf,
  type Scene,
  type SpaceUnit,
  type SystemFlight,
  type Vec,
} from './flight';

const d6 = (random: Random): number => random.int(1, 6);

// Raumkampf, Stufe 2: Gegner und Laser (Domänenmodell 2026-11-21d; Konzept: docs/konzept-raumkampf.md,
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
  | 'explode';
export const hitZones = ['powerPlant', 'maneuver', 'jump', 'fuel', 'hull', 'hold', 'computer', 'turret', 'criticalPowerPlant', 'criticalManeuver', 'criticalJump', 'crew', 'criticalComputer', 'explode'] as const;

/** Was ein fremdes Schiff will (Konzept, Abschnitt 6). */
export type Intent = 'attack' | 'flee' | 'ignore';
export const intents = ['attack', 'flee', 'ignore'] as const;

/** Wie ein Raumkampf endete. */
export type BattleOutcome = 'destroyed' | 'disabled' | 'escaped' | 'broken' | 'lost';
export const battleOutcomes = ['destroyed', 'disabled', 'escaped', 'broken', 'lost'] as const;

/** Der Schaden eines Schiffs (Domänenmodell: `ShipDamage`): die Treffer in ihrer Reihenfolge und die ausgefallenen Turrets. */
export interface ShipDamage {
  readonly hits: readonly HitZone[];
  readonly turretsOut: readonly number[];
}

/** Trefferzonen für Starships nach 2W6 (SE 12), Index = Summe − 2; 12 ist kritisch. */
const HIT_TABLE: readonly HitZone[] = ['powerPlant', 'maneuver', 'jump', 'fuel', 'hull', 'hull', 'hold', 'computer', 'turret', 'turret'];
/** Kritische Treffer nach 1W6 (SE 12). */
const CRITICAL_TABLE: readonly HitZone[] = ['criticalPowerPlant', 'criticalManeuver', 'criticalJump', 'crew', 'criticalComputer', 'explode'];
/** Trefferwurf: 8+ (SR 40). */
export const HIT_TARGET = 8;
/** Abstand, den ein angreifendes fremdes Schiff hält: 5 Raumbänder (Hausregel). */
const ATTACK_KM = 5 * BAND_KM;
/** Über diese Entfernung kein Schuss, und ein fremdes Schiff ist entkommen (Tracking, SR 42): 90 Raumbänder. */
export const TRACKING_BANDS = 90;
/** Reparatur je Treffer und je kritischem Treffer in Cr (Hausregel 2026-11-21d). */
export const REPAIR_HIT = 100_000;
export const REPAIR_CRITICAL = 1_000_000;

const isCritical = (zone: HitZone) => zone.startsWith('critical') || zone === 'crew' || zone === 'explode';
const count = (damage: ShipDamage | undefined, ...zones: HitZone[]) => (damage?.hits ?? []).filter((h) => zones.includes(h)).length;

/** `/maneuver`: die G des Antriebs nach dem Schaden; Maneuver und Power Plant je −1, kritisch 0. */
export function maneuverAfter(design: string, damage: ShipDamage | undefined): number {
  if (count(damage, 'criticalManeuver', 'criticalPowerPlant', 'crew', 'explode') > 0) return 0;
  return Math.max(0, shipDesignOf(design).maneuver - count(damage, 'maneuver', 'powerPlant'));
}

/** `/jump`: die Sprungzahl nach dem Schaden; Jump je −1, kritisch 0. */
export function jumpAfter(design: string, damage: ShipDamage | undefined): number {
  if (count(damage, 'criticalJump', 'criticalPowerPlant', 'explode') > 0) return 0;
  return Math.max(0, shipDesignOf(design).jump - count(damage, 'jump', 'powerPlant'));
}

/** `/destroyed`: ein kritischer Treffer *Explode*. */
export function destroyedBy(damage: ShipDamage | undefined): boolean {
  return count(damage, 'explode') > 0;
}

/** Kann das Schiff feuern? Nicht ohne Crew, nicht mit zerstörtem Computer, nicht zerstört. */
function canFire(damage: ShipDamage | undefined): boolean {
  return count(damage, 'crew', 'criticalComputer', 'explode') === 0;
}

/** Die Laser eines Schiffs, die noch feuern können: je Turret, das nicht ausgefallen ist. */
function workingLasers(turrets: readonly Turret[], damage: ShipDamage | undefined): readonly { turret: number; weapon: string }[] {
  if (!canFire(damage)) return [];
  return turrets.flatMap((t, i) => (damage?.turretsOut.includes(i) ? [] : t.weapons.filter((w) => w.endsWith('laser')).map((weapon) => ({ turret: i, weapon }))));
}

/** Wie viele Laser einer Einheit noch feuern können. */
export function laserCountOf(campaign: Campaign, unit: SpaceUnit): number {
  return workingLasers(turretsOfUnit(campaign, unit), damageOfUnit(campaign, unit)).length;
}

/** `/disabled`: zerstört, Crew handlungsunfähig, oder ohne Antrieb und ohne arbeitenden Laser. */
export function disabledBy(design: string, turrets: readonly Turret[], damage: ShipDamage | undefined): boolean {
  if (destroyedBy(damage) || count(damage, 'crew') > 0) return true;
  return maneuverAfter(design, damage) === 0 && workingLasers(turrets, damage).length === 0;
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

/** Das Raumband einer Entfernung: Entfernung ÷ 10.000 km, aufgerundet (Hausregel, mindestens 1). */
export function bandOf(km: number): number {
  return Math.max(1, Math.ceil(km / BAND_KM));
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
  if (flight.units[0]?.crashed) return 'Das eigene Schiff ist aufgeschlagen.';
  return undefined;
}

/** Der Code eines Ergebnisses der Starship Encounter Table: Entwurf, Pirat. */
function parseEncounter(code: string): { design: string; pirate: boolean } {
  const letter = code[0]!;
  const design = ref.ships.find((s) => s.code === letter);
  if (design === undefined) throw new DomainError(`Den Schiffstyp ${letter} gibt es nicht.`);
  return { design: design.id, pirate: code.includes('P') };
}

/** Die Spalte der Starship Encounter Table und ihre DMs für das System des Flugs: Raumhafen der Hauptwelt, Marine- und Scoutbasis. */
export function encounterColumn(campaign: Campaign): { readonly column: 'A' | 'B' | 'C' | 'D' | 'E' | 'X'; readonly dm: number } {
  const flight = activeFlight(campaign);
  const hex = hexById(campaign.hexes, hexIdOfWorld(flight.world));
  const main = hex?.main === undefined ? undefined : worldById(campaign.hexes, hex.main);
  const letter = main?.uwp.starport === undefined ? 'X' : starportLetter(main.uwp.starport);
  const port = (['A', 'B', 'C', 'D', 'E'] as const).find((p) => p === letter) ?? 'X';
  return { column: port, dm: (hex?.navalBase ? 2 : 0) + (hex?.scoutBase ? 1 : 0) };
}

/**
 * Würfelt eine Schiffsbegegnung im Systemflug (SE 13): 2W6 + DM auf die Spalte des Raumhafens. Ohne
 * Ergebnis kommt kein Schiff (`campaign` bleibt). Ein Pirat greift an; sonst entscheidet die Reaktion
 * (SE 21): 2 greift an, 3 bei 5+, 4 bei 8+ auf einen weiteren Wurf, sonst ignoriert es die Gruppe.
 */
export function rollShipEncounter(campaign: Campaign, random: Random, clock: Clock): { readonly campaign: Campaign; readonly encounter: Dice; readonly total: number; readonly code: string | undefined } {
  const blocker = encounterBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const { column, dm } = encounterColumn(campaign);
  const encounter = roll2d6(random);
  const total = Math.min(15, sum(encounter) + dm);
  const code = ref.starshipEncounters[column]?.[total - 2] ?? undefined;
  if (code === undefined || code === null) return { campaign, encounter, total, code: undefined };
  const { design, pirate } = parseEncounter(code);
  let intent: Intent = 'attack';
  let reaction: Dice | undefined;
  let attack: Dice | undefined;
  if (!pirate) {
    reaction = roll2d6(random);
    const r = sum(reaction);
    if (r === 3 || r === 4) attack = roll2d6(random);
    intent = r === 2 || (attack !== undefined && sum(attack) >= (r === 3 ? 5 : 8)) ? 'attack' : 'ignore';
  }
  const offset = { bands: sum(roll2d6(random)), angle: d6(random) * 60 };
  const placed = placeFoe(campaign, design, intent, clock, offset);
  // Die Würfe gehören in den Logeintrag der Begegnung, der eben angehängt wurde.
  const log = placed.log.map((e, i) => (i === placed.log.length - 1 && e.kind === 'spaceBattle' ? { ...e, encounter, ...(reaction ? { reaction } : {}), ...(attack ? { attack } : {}) } : e));
  return { campaign: { ...placed, log }, encounter, total, code };
}

/**
 * Ein fremdes Schiff taucht auf, mit Entwurf und Absicht (von Hand gewählt oder aus `rollShipEncounter`):
 * `offset.bands` Raumbänder vom eigenen Schiff in Richtung `offset.angle` (Grad), mit dessen
 * Geschwindigkeit; von Hand 7 Raumbänder voraus. Logeintrag `SpaceBattle`.
 */
export function placeFoe(campaign: Campaign, design: string, intent: Intent, clock: Clock, offset?: { readonly bands: number; readonly angle: number }): Campaign {
  const blocker = encounterBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const plan = shipDesignOf(design);
  const flight = activeFlight(campaign);
  const own = flight.units[0]!;
  const ahead = lengthOf(own.velocity) > 1e-6 ? Math.atan2(own.velocity.y, own.velocity.x) : Math.PI / 2;
  const angle = offset === undefined ? ahead : (offset.angle * Math.PI) / 180;
  const km = (offset?.bands ?? 7) * BAND_KM;
  const position = { x: own.position.x + km * Math.cos(angle), y: own.position.y + km * Math.sin(angle) };
  const ownName = shipOf(campaign)?.name;
  const name = plan.name === ownName ? `${plan.name} (fremd)` : plan.name;
  const foe: SpaceUnit = { design: plan.id, name, intent, position, velocity: own.velocity, crashed: false, track: own.track.map(() => ({ position, velocity: own.velocity })) };
  const entry: SpaceBattle = { kind: 'spaceBattle', at: clock.now(), day: campaign.day, foe: name, design: plan.id, intent };
  return { ...campaign, flight: { ...flight, units: [...flight.units, foe] }, log: [...campaign.log, entry] };
}

/** Setzt das Ziel einer Einheit für die laufende Raumrunde (`undefined`: kein Feuer). */
export function setAim(campaign: Campaign, index: number, target: number | undefined): Campaign {
  const flight = activeFlight(campaign);
  const unit = flight.units[index];
  if (unit === undefined) throw new DomainError('Diese Einheit gibt es nicht.');
  if (target !== undefined) {
    const other = flight.units[target];
    if (other === undefined || target === index) throw new DomainError('Dieses Ziel gibt es nicht.');
    if (workingLasers(turretsOfUnit(campaign, unit), damageOfUnit(campaign, unit)).length === 0) throw new DomainError(`${nameOfUnit(campaign, unit)} hat keinen Laser, der feuern kann.`);
  }
  const { aim: _old, ...rest } = unit;
  void _old;
  const next: SpaceUnit = target === undefined ? rest : { ...rest, aim: target };
  return { ...campaign, flight: { ...flight, units: flight.units.map((u, i) => (i === index ? next : u)) } };
}

/** Die höchste G einer Einheit nach Schaden (fremde Schiffe ohne Absicht treiben). */
export function unitMaxG(campaign: Campaign, unit: SpaceUnit): number {
  return maneuverAfter(designOfUnit(campaign, unit), damageOfUnit(campaign, unit));
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
  const own = flight.units[0]!;
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
}

/** Die Schüsse einer Einheit auf `to`: jeder arbeitende Laser einzeln, mit Sichtlinie und höchstens 90 Raumbändern. */
function shotsOf(campaign: Campaign, flight: SystemFlight, scene: Scene, from: number, to: number, t: number): readonly Shot[] {
  const a = flight.units[from]!;
  const b = flight.units[to]!;
  if (a.crashed || b.crashed) return [];
  const damage = damageOfUnit(campaign, a);
  const bands = bandOf(lengthOf({ x: a.position.x - b.position.x, y: a.position.y - b.position.y }));
  if (bands > TRACKING_BANDS || !lineOfSight(scene, a.position, b.position, t)) return [];
  const base = spaceRangeDm(bands) - count(damage, 'computer');
  return workingLasers(turretsOfUnit(campaign, a), damage).map(({ turret, weapon }) => ({ from, to, turret, weapon, dm: base + (weapon === 'pulse-laser' ? -1 : 0) }));
}

/** Würfelt die Trefferzonen eines Treffers: Beam Laser einen Schadenswurf, Pulse Laser zwei; bei 12 kritisch (1W6). */
function rollHits(weapon: string, random: Random): readonly HitZone[] {
  const zones: HitZone[] = [];
  for (let k = 0; k < (weapon === 'pulse-laser' ? 2 : 1); k++) {
    const roll = sum(roll2d6(random));
    zones.push(roll === 12 ? CRITICAL_TABLE[d6(random) - 1]! : HIT_TABLE[roll - 2]!);
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
    if (zone === 'turret') {
      const working = turrets.map((_, i) => i).filter((i) => !damage.turretsOut.includes(i));
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
        return { ...s, damage, fuel, unrefined: Math.min(s.unrefined, fuel), cargo: Math.max(0, s.cargo - cargoLost) };
      }),
    };
  }
  return { ...campaign, flight: { ...flight, units: flight.units.map((u, i) => (i === index ? { ...u, damage } : u)) } };
}

/** Würfelt Schüsse und hängt sie ans Log; gibt die Treffer je Ziel zurück. */
function fire(campaign: Campaign, shots: readonly Shot[], random: Random, clock: Clock): { campaign: Campaign; hits: Map<number, HitZone[]> } {
  const flight = activeFlight(campaign);
  const hits = new Map<number, HitZone[]>();
  const log = [...campaign.log];
  for (const shot of shots) {
    const dice = roll2d6(random);
    const hit = sum(dice) + shot.dm >= HIT_TARGET;
    const zones = hit ? rollHits(shot.weapon, random) : [];
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
      hits: zones,
    };
    log.push(entry);
  }
  return { campaign: { ...campaign, log }, hits };
}

/**
 * Laserfeuer und Rückfeuer nach der Bewegung (SR 40, gleichzeitig): erst alle Einheiten mit Ziel, Schaden
 * nach allen Würfen; dann feuern Beschossene ohne eigenes Ziel zurück. Ein beschossenes fremdes Schiff,
 * das nicht angriff, greift danach an (mit Laser) oder flieht.
 */
export function firePhase(campaign: Campaign, random: Random, clock: Clock): Campaign {
  const flight = activeFlight(campaign);
  if (!flight.units.some((u) => u.aim !== undefined)) return campaign;
  const scene = sceneOf(campaign.hexes, flight.world);
  const t = flightTime(campaign, flight);
  const shooters = flight.units.map((u, i) => (u.aim !== undefined ? i : -1)).filter((i) => i >= 0);
  const shots = shooters.flatMap((i) => shotsOf(campaign, flight, scene, i, flight.units[i]!.aim!, t));
  const first = fire(campaign, shots, random, clock);
  let after = first.campaign;
  for (const [to, zones] of first.hits) after = applyHits(after, to, zones, random);
  // Rückfeuer: wer beschossen wurde und kein eigenes Ziel hatte, auf den ersten, der auf ihn feuerte.
  const now = activeFlight(after);
  const targeted = [...new Set(shots.map((s) => s.to))].filter((i) => now.units[i]!.aim === undefined);
  const back = targeted.flatMap((i) => shotsOf(after, now, scene, i, shots.find((s) => s.to === i)!.from, t));
  const second = fire(after, back, random, clock);
  after = second.campaign;
  for (const [to, zones] of second.hits) after = applyHits(after, to, zones, random);
  // Beschossene fremde Schiffe, die nicht angriffen, wehren sich oder fliehen (Hausregel).
  const final = activeFlight(after);
  const units = final.units.map((u, i) => {
    if (u.ship !== undefined || u.intent === undefined || u.intent === 'attack' || !targeted.includes(i)) return u;
    return { ...u, intent: (workingLasers(turretsOfUnit(after, u), u.damage).length > 0 ? 'attack' : 'flee') as Intent };
  });
  return { ...after, flight: { ...final, units } };
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
  const own = flight.units[0]!;
  const ship = own.ship === undefined ? undefined : shipById(campaign, own.ship);
  if (ship !== undefined && destroyedBy(ship.damage)) {
    for (const u of flight.units) if (activeFoe(campaign, u)) result = battleEnd(result, nameOfUnit(campaign, u), 'lost', clock);
    const { flight: _gone, ...rest } = result;
    void _gone;
    return { campaign: { ...rest, ships: rest.ships.map((s) => (s.id === ship.id ? { ...s, retired: true } : s)) }, lost: true };
  }
  const units: SpaceUnit[] = [];
  for (const [i, u] of flight.units.entries()) {
    if (i === 0 || u.ship !== undefined || u.intent === undefined) {
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
      const { intent: _i, aim: _a, ...wreck } = u;
      void _i;
      void _a;
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

/** Was die Reparatur des eigenen Schiffs kostet: Cr 100.000 je Treffer, Cr 1.000.000 je kritischem (Hausregel). */
export function repairCostOf(ship: Ship): number {
  return (ship.damage?.hits ?? []).reduce((n, h) => n + (isCritical(h) ? REPAIR_CRITICAL : REPAIR_HIT), 0);
}

/** Repariert das eigene Schiff an einer Werft (Raumhafen A oder B), alles auf einmal. */
export function repairShip(campaign: Campaign, clock: Clock): Campaign {
  const ship = shipOf(campaign);
  if (ship === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  if (ship.damage === undefined) throw new DomainError(`${ship.name} hat keinen Schaden.`);
  const blocker = armamentBlocker(campaign);
  if (blocker) throw new DomainError(blocker.replace('Umrüsten', 'Reparieren'));
  const cost = repairCostOf(ship);
  if (cost > fundsOf(campaign)) throw new DomainError(`Die Reparatur kostet Cr ${cost.toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`);
  const paid = bookShip(campaign, -cost, ship.id, 'repair', clock, `Reparatur, ${ship.damage.hits.length} Treffer`);
  return { ...paid, ships: paid.ships.map((s) => (s.id === ship.id ? (({ damage: _d, ...rest }) => (void _d, rest))(s) : s)) };
}

/** Prüft einen geladenen Schaden. */
export function checkDamage(damage: ShipDamage, turrets: number): void {
  for (const h of damage.hits) if (!hitZones.includes(h)) throw new DomainError(`Die Trefferzone ${h} gibt es nicht.`);
  for (const t of damage.turretsOut) if (!Number.isInteger(t) || t < 0 || t >= turrets) throw new DomainError('Ein ausgefallenes Turret gibt es nicht.');
}
