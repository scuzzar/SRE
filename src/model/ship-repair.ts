import { activeSkills, type Campaign, type Character, type CharacterId } from './campaign';
import { DomainError } from './errors';
import type { Clock, Random } from './ports';
import { roll2d6, sum } from './rules';
import { shipOf, shipById, type Ship } from './ship';
import { bookShip, fundsOf } from './shop';
import { shipyardBlocker } from './armament';
import { shipDepartureBlocker } from './landing';
import { candidatesFor } from './crew';
import { dayOf, weekStart } from './time';
import { damagedAtYard, isCritical, REPAIR_CRITICAL, REPAIR_HIT, type HitZone, type ShipDamage } from './space-combat';
import type { ShipRepair } from './log';

// Reparatur außerhalb des Kampfs (Domänenmodell 2026-11-27d, docs/modell/schiffe.md; SR 28 und 42,
// zusammengefasst in docs/regeln-schiffe.md).

/** Unterwegs flicken: 2W6 + Engineering 10+ (SR 28). */
export const FIELD_REPAIR_TARGET = 10;
/** In der Werft selbst reparieren: 2W6 + Engineering 8+ (Owner). */
export const YARD_REPAIR_TARGET = 8;
/** Material, wenn der eigene Engineer in der Werft repariert: die Hälfte des Werftpreises (Owner). */
export const MATERIAL_HIT = REPAIR_HIT / 2;
export const MATERIAL_CRITICAL = REPAIR_CRITICAL / 2;
/** Gebühr, wenn er es nicht schafft (Owner). */
export const FEE_HIT = 10_000;
export const FEE_CRITICAL = 20_000;
/** Wer in der Werft selbst repariert, braucht Engineering-1 oder mehr (Owner). */
export const YARD_MIN_ENGINEERING = 1;

/** Gelang der Reparaturversuch (`/success`)? Unterwegs 10+, in der Werft 8+. */
export function repairSucceeded(entry: Pick<ShipRepair, 'dice' | 'dm' | 'yard'>): boolean {
  return sum(entry.dice) + entry.dm >= (entry.yard ? YARD_REPAIR_TARGET : FIELD_REPAIR_TARGET);
}

/** Die Stufe in Engineering (0 ohne die Fertigkeit, ⚑). */
export function engineeringOf(character: Character): number {
  return activeSkills(character).find((s) => s.of === 'engineering')?.level ?? 0;
}

/** Ein Treffer auf der Detailseite Schaden: an welchem Schiff, an welcher Stelle in seinen Treffern. */
export interface HitRef {
  readonly ship: string;
  readonly at: number;
}

/** Die Treffer des eigenen Schiffs und seiner Beiboote an Bord, in dieser Reihenfolge. */
export function damagedHitsOf(campaign: Campaign, ship: Ship): readonly (HitRef & { readonly zone: HitZone; readonly critical: boolean; readonly patched: boolean })[] {
  return damagedAtYard(campaign, ship).flatMap((s) =>
    s.damage!.hits.map((zone, at) => ({ ship: s.id, at, zone, critical: isCritical(zone), patched: s.damage!.patched?.includes(at) === true })),
  );
}

/**
 * Nimmt Treffer aus dem Schaden (2026-11-27d): Die übrigen behalten ihre Reihenfolge; `patched` und
 * `turretsOut` werden mitgezogen – ein Turret-Treffer nimmt sein ausgefallenes Turret mit. Bleibt
 * nichts übrig, ist der Schaden weg (`undefined`).
 */
export function withoutHits(damage: ShipDamage, remove: readonly number[]): ShipDamage | undefined {
  const gone = new Set(remove);
  const keep = damage.hits.map((_, at) => at).filter((at) => !gone.has(at));
  if (keep.length === 0) return undefined;
  const index = new Map(keep.map((old, now) => [old, now]));
  const stations = damage.hits.flatMap((h, at) => (h === 'turret' || h === 'weapons' ? [at] : []));
  const patched = (damage.patched ?? []).filter((at) => index.has(at)).map((at) => index.get(at)!);
  return {
    hits: keep.map((at) => damage.hits[at]!),
    ...(patched.length > 0 ? { patched } : {}),
    turretsOut: damage.turretsOut.filter((_, k) => !gone.has(stations[k] ?? -1)),
  };
}

function withDamage(campaign: Campaign, shipId: string, damage: ShipDamage | undefined): Campaign {
  return {
    ...campaign,
    ships: campaign.ships.map((s) => {
      if (s.id !== shipId) return s;
      if (damage !== undefined) return { ...s, damage };
      const { damage: _d, ...rest } = s;
      void _d;
      return rest;
    }),
  };
}

/** Der Treffer, auf den ein Verweis zeigt, an Schiff oder Beiboot an Bord des eigenen Schiffs. */
function hitOf(campaign: Campaign, ref: HitRef): { readonly zone: HitZone; readonly critical: boolean; readonly patched: boolean } {
  const own = shipOf(campaign);
  if (own === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  const hit = damagedHitsOf(campaign, own).find((h) => h.ship === ref.ship && h.at === ref.at);
  if (hit === undefined) throw new DomainError('Diesen Treffer gibt es nicht.');
  return hit;
}

/** Steht das eigene Schiff an einer Werft, und die Gruppe ist bei ihm? */
export function atShipyard(campaign: Campaign): boolean {
  return shipOf(campaign) !== undefined && shipyardBlocker(campaign) === undefined;
}

/** Was der Charakter an Reparaturen in diesem Zeitraum schon versucht hat. */
function attemptsOf(campaign: Campaign, who: CharacterId, yard: boolean, since: number): readonly ShipRepair[] {
  return campaign.log.flatMap((e) => (e.kind === 'shipRepair' && e.by === who && e.yard === yard && (e.day ?? 0) >= since ? [e] : []));
}

function personOf(campaign: Campaign, who: CharacterId): Character {
  const person = candidatesFor(campaign).find((c) => c.id === who);
  if (person === undefined) throw new DomainError('Nur ein lebender, sichtbarer Charakter kann reparieren.');
  return person;
}

/**
 * Warum der Charakter `who` den Treffer `ref` jetzt nicht reparieren kann; ohne `ref` nur, ob er
 * überhaupt kann (2026-11-27d). In der Werft repariert er ganz (Engineering-1+, ein Treffer je Tag
 * oder ein kritischer je Woche, das Material muss in der Kasse sein), sonst flickt er (einmal je Woche,
 * nicht kritisch, nicht im Systemflug, nur beim Schiff).
 */
export function repairBlocker(campaign: Campaign, who: CharacterId, ref?: HitRef): string | undefined {
  const ship = shipOf(campaign);
  if (ship === undefined) return 'Die Gruppe hat kein Schiff.';
  if (campaign.flight !== undefined) return 'Im Systemflug wird nicht repariert; im Raumkampf hilft die Schadenskontrolle.';
  const away = shipDepartureBlocker(campaign);
  if (away) return away;
  const person = candidatesFor(campaign).find((c) => c.id === who);
  if (person === undefined) return 'Nur ein lebender, sichtbarer Charakter kann reparieren.';
  const today = dayOf(campaign);
  const hit = ref === undefined ? undefined : hitOf(campaign, ref);
  if (atShipyard(campaign)) {
    if (engineeringOf(person) < YARD_MIN_ENGINEERING) return `${person.name} braucht Engineering-${YARD_MIN_ENGINEERING}, um in der Werft selbst zu reparieren.`;
    if (attemptsOf(campaign, who, true, today).length > 0) return `${person.name} hat heute schon repariert.`;
    const week = attemptsOf(campaign, who, true, weekStart(today));
    if (hit?.critical === true && week.some((e) => isCritical(e.zone))) return `${person.name} hat diese Woche schon einen kritischen Treffer repariert.`;
    if (hit !== undefined && (hit.critical ? MATERIAL_CRITICAL : MATERIAL_HIT) > fundsOf(campaign)) return `Das Material kostet Cr ${(hit.critical ? MATERIAL_CRITICAL : MATERIAL_HIT).toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`;
    return undefined;
  }
  if (attemptsOf(campaign, who, false, weekStart(today)).length > 0) return `${person.name} hat diese Woche schon geflickt.`;
  if (hit?.critical === true) return 'Kritische Treffer lassen sich unterwegs nicht flicken; das geht nur in der Werft.';
  if (hit?.patched === true) return 'Dieser Treffer ist schon geflickt.';
  return undefined;
}

/** Was ein Reparaturversuch in der Werft kostet: Material bei Erfolg, Gebühr beim Fehlschlag. */
export function yardRepairCost(critical: boolean, success: boolean): number {
  return success ? (critical ? MATERIAL_CRITICAL : MATERIAL_HIT) : critical ? FEE_CRITICAL : FEE_HIT;
}

/**
 * Der Charakter `who` versucht, den Treffer `ref` zu reparieren (2026-11-27d): 2W6 + Engineering.
 * In der Werft (8+) ist er bei Erfolg ganz weg, und das Material wird gebucht, sonst die Gebühr;
 * unterwegs (10+) ist er bei Erfolg geflickt. Logeintrag `ShipRepair`.
 */
export function attemptRepair(campaign: Campaign, who: CharacterId, ref: HitRef, random: Random, clock: Clock): Campaign {
  const blocker = repairBlocker(campaign, who, ref);
  if (blocker) throw new DomainError(blocker);
  const person = personOf(campaign, who);
  const hit = hitOf(campaign, ref);
  const yard = atShipyard(campaign);
  const entry: ShipRepair = { kind: 'shipRepair', at: clock.now(), day: campaign.day, ship: ref.ship, by: who, dice: roll2d6(random), dm: engineeringOf(person), zone: hit.zone, yard };
  const success = repairSucceeded(entry);
  let after: Campaign = { ...campaign, log: [...campaign.log, entry] };
  const target = shipById(after, ref.ship);
  if (yard) {
    const cost = yardRepairCost(hit.critical, success);
    after = bookShip(after, -cost, ref.ship, 'repair', clock, `${success ? 'Material' : 'Gebühr'}: ${person.name} repariert selbst (${success ? 'gelungen' : 'misslungen'})`);
    if (success) after = withDamage(after, ref.ship, withoutHits(target.damage!, [ref.at]));
  } else if (success) {
    after = withDamage(after, ref.ship, { ...target.damage!, patched: [...(target.damage!.patched ?? []), ref.at].sort((a, b) => a - b) });
  }
  return after;
}

/** Was die Werft für diese Treffer verlangt: Cr 100.000 je Treffer, Cr 1.000.000 je kritischem (Hausregel 2026-11-21h). */
export function selectedRepairCost(campaign: Campaign, refs: readonly HitRef[]): number {
  return refs.reduce((n, ref) => n + (hitOf(campaign, ref).critical ? REPAIR_CRITICAL : REPAIR_HIT), 0);
}

/** Die Werft repariert alles an Schiff und Beibooten an Bord auf einmal („Alles auswählen“). */
export function repairShip(campaign: Campaign, clock: Clock): Campaign {
  const ship = shipOf(campaign);
  if (ship === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  const all = damagedHitsOf(campaign, ship);
  if (all.length === 0) throw new DomainError(`${ship.name} hat keinen Schaden.`);
  return repairSelected(campaign, all, clock);
}

/**
 * Die Werft repariert die ausgewählten Treffer (2026-11-27d) an Schiff und Beibooten an Bord, eine
 * Buchung für alle; die Treffer verschwinden.
 */
export function repairSelected(campaign: Campaign, refs: readonly HitRef[], clock: Clock): Campaign {
  const ship = shipOf(campaign);
  if (ship === undefined) throw new DomainError('Die Gruppe hat kein Schiff.');
  if (refs.length === 0) throw new DomainError('Kein Treffer ausgewählt.');
  const blocker = shipyardBlocker(campaign);
  if (blocker) throw new DomainError(blocker.replace('umgerüstet', 'repariert').replace('Umrüsten', 'Reparieren'));
  const unique = [...new Map(refs.map((r) => [`${r.ship}-${r.at}`, r])).values()];
  const cost = selectedRepairCost(campaign, unique);
  if (cost > fundsOf(campaign)) throw new DomainError(`Die Reparatur kostet Cr ${cost.toLocaleString('de-DE')}, in der Kasse ist Cr ${fundsOf(campaign).toLocaleString('de-DE')}.`);
  let after = bookShip(campaign, -cost, ship.id, 'repair', clock, `Reparatur, ${unique.length} Treffer`);
  for (const id of new Set(unique.map((r) => r.ship))) {
    const target = shipById(after, id);
    after = withDamage(after, id, withoutHits(target.damage!, unique.filter((r) => r.ship === id).map((r) => r.at)));
  }
  return after;
}
