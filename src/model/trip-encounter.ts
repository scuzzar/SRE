// Begegnungen unterwegs (siehe docs/domain-model.md, *Fahrt*, Begegnungen am Boden): Jeder Reisetag
// mit Strecke am Boden verlangt einen Begegnungstest, in der Wildnis auf Tiere, sonst auf eine
// Zufallsbegegnung; besteht er, folgt gleich die Begegnung.

import { hasAnimals, terrainOf } from './animals';
import { appendLog, type Campaign } from './campaign';
import { rollAnimalEncounter, rollEncounter, type Encounter } from './encounter';
import { checkOf, rollCheck, type EncounterCheck } from './encounter-check';
import type { CheckRoll, CheckKind, LogEntry } from './log';
import { placeCell } from './place';
import type { Clock, Random } from './ports';
import { worldById } from './sector';
import { landformAt } from './surface-map';
import { driveDay, legHours, tripSurface, TRIP_HOURS_PER_DAY } from './trip';
import { flies, vehicleOf } from './vehicle';

/** Ob der nächste Reisetag Strecke am Boden hat (nicht nur einen Flug). */
export function groundToday(campaign: Campaign): boolean {
  const trip = campaign.trip;
  const surface = tripSurface(campaign);
  if (!trip || !surface) return false;
  const from = trip.hours;
  const to = from + TRIP_HOURS_PER_DAY;
  let t = 0;
  for (const leg of trip.legs) {
    const start = t;
    t += legHours(surface, leg);
    if (!flies(vehicleOf(leg.by)) && Math.min(t, to) - Math.max(start, from) > 1e-9) return true;
  }
  return false;
}

/** Ob die Gruppe in der Wildnis ist: auf einem Feld ohne Stadt und Kleinstadt, das nicht besiedelt ist. */
export function inWilderness(campaign: Campaign): boolean {
  const place = campaign.location;
  const map = place === undefined ? undefined : worldById(campaign.hexes, place.world)?.map;
  const cell = placeCell(campaign.hexes, place);
  if (!map || cell === undefined) return false;
  if ((map.cities ?? []).some((c) => c.cell === cell) || (map.towns ?? []).some(([c, n]) => c === cell && n > 0)) return false;
  return landformAt(map, cell) !== 'settled';
}

/** Welcher Test unterwegs gilt: in der Wildnis Tiere (wo das Gelände Tiere hat), sonst die Zufallsbegegnung. */
export function travelCheckKind(campaign: Campaign): CheckKind {
  const terrain = campaign.terrain === undefined ? undefined : terrainOf(campaign.terrain);
  return inWilderness(campaign) && terrain !== undefined && hasAnimals(terrain) ? 'animal' : 'random';
}

/** Ein Reisetag mit seinem Begegnungstest. */
export interface TravelDay {
  readonly campaign: Campaign;
  /** Der Test des Tages; fehlt an einem Tag nur in der Luft. */
  readonly check: { readonly entry: CheckRoll; readonly result: EncounterCheck } | undefined;
  /** Bei bestandenem Test: der Wurf auf die Liste bzw. Tiertabelle, die Begegnung oder (bei Tieren) ein Ereignis. */
  readonly roll: number | undefined;
  readonly encounter: Encounter | undefined;
  readonly event: string | undefined;
}

/**
 * „Einen Tag fahren“ mit dem Begegnungstest am Boden: erst fahren (der Ort und mit ihm das Gelände
 * ist das erreichte Feld), dann der Test dort; besteht er, die Begegnung.
 */
export function travelDay(campaign: Campaign, random: Random, clock: Clock): TravelDay {
  const ground = groundToday(campaign);
  const driven = driveDay(campaign, clock);
  if (!ground) return { campaign: driven, check: undefined, roll: undefined, encounter: undefined, event: undefined };
  const kind = travelCheckKind(driven);
  const entry = rollCheck(driven, kind, random, clock);
  const result = checkOf(entry);
  const tested = appendLog(driven, entry);
  if (!result.passed) return { campaign: tested, check: { entry, result }, roll: undefined, encounter: undefined, event: undefined };
  if (kind === 'animal') {
    const rolled = rollAnimalEncounter(tested, random, clock);
    return { campaign: rolled.campaign, check: { entry, result }, roll: rolled.roll, encounter: rolled.encounter, event: rolled.row.event };
  }
  const rolled = rollEncounter(tested, random, clock);
  return { campaign: rolled.campaign, check: { entry, result }, roll: rolled.roll, encounter: rolled.encounter, event: undefined };
}

/** Ob ein Logeintrag zur Reise gehört: ein Reisetag oder der Begegnungstest gleich danach. */
export function isTravelEntry(log: readonly LogEntry[], index: number): boolean {
  const entry = log[index];
  return entry?.kind === 'tripDay' || (entry?.kind === 'check' && log[index - 1]?.kind === 'tripDay');
}

/**
 * Wo die Gruppe auf dieser Welt gereist ist, aus dem Log: je Reisetag eine Strecke vom Ort davor (dem
 * letzten Eintrag mit Feld auf dieser Welt) zum erreichten Feld. Ohne Eintrag davor fehlt das erste Stück.
 */
export function travelTrace(campaign: Campaign, world: string): readonly (readonly [number, number])[] {
  const segments: [number, number][] = [];
  let last: number | undefined;
  campaign.log.forEach((entry) => {
    if (entry.place?.world !== world) return;
    const cell = placeCell(campaign.hexes, entry.place);
    if (cell === undefined) return;
    if (entry.kind === 'tripDay' && last !== undefined && last !== cell) segments.push([last, cell]);
    last = cell;
  });
  return segments;
}
