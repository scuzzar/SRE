import type { Campaign } from './campaign';
import { DomainError } from './errors';
import { activeFlight, endFlight, flightStartBlocker, flightTime, jumpLimitDm, launchWorld, partyIndexOf, sceneOf } from './flight';
import type { Journey, SystemJourney } from './log';
import type { Clock, Random } from './ports';
import type { Dice } from './rules';
import { activeFoe, nameOfUnit } from './space-combat';
import type { SpaceBattleEnd } from './log';
import { shipJourneyBlocker, travelShip } from './travel';
import { systemJourneyBlocker, travelInSystem } from './system-journey';

// Schiffsbegegnungen bei Abreise und Ankunft (Domänenmodell 2026-11-22b; SR 42, SE 13 in
// docs/regeln-schiffe.md unter *Schiffsbegegnungen im System*).

/**
 * Hängt den Begegnungswurf der Ankunft ohne Schiff an die letzte Reise (2026-11-22b): an die Reise
 * bzw. Reise im System, mit der die Gruppe eben angekommen ist.
 */
export function recordArrivalRoll(campaign: Campaign, dice: Dice): Campaign {
  const index = campaign.log.findLastIndex((e) => e.kind === 'journey' || e.kind === 'systemJourney');
  if (index < 0) throw new DomainError('Es gibt keine Reise, an der der Wurf stehen könnte.');
  const entry = campaign.log[index] as Journey | SystemJourney;
  return { ...campaign, log: campaign.log.map((e, i) => (i === index ? { ...entry, arrivalRoll: dice } : e)) };
}

/** Warum der Knopf „Schiffsbegegnung“ im Reiter Begegnung gerade nichts würfeln kann; `undefined`, wenn er kann (2026-11-22b). */
export function manualEncounterBlocker(campaign: Campaign): string | undefined {
  if (campaign.flight !== undefined) return undefined;
  const world = launchWorld(campaign);
  if (world === undefined) return 'Die Gruppe hat kein Schiff.';
  return flightStartBlocker(campaign, world);
}

/** Was der Knopf der Weiterreise im Systemflug tut: springen oder im System reisen, und wohin. */
export function departureOf(campaign: Campaign): { readonly kind: 'jump' | 'system'; readonly to: string } | undefined {
  const departure = campaign.flight?.departure;
  if (departure?.jumpTo !== undefined) return { kind: 'jump', to: departure.jumpTo };
  if (departure?.travelTo !== undefined) return { kind: 'system', to: departure.travelTo };
  return undefined;
}

/** Der DM auf den Fehlsprung beim Sprung aus dem Systemflug jetzt: +5 bzw. +15 nahe an einem Körper (SR 28). */
export function flightJumpDm(campaign: Campaign): number {
  const flight = activeFlight(campaign);
  const own = flight.units[partyIndexOf(flight)]!;
  return jumpLimitDm(sceneOf(campaign.hexes, flight.world), own.position, flightTime(campaign, flight));
}

/** Der Systemflug endet für die Weiterreise: Ein fremdes Schiff, das noch da ist, bleibt zurück (Ausgang *abgereist*). */
function leaveFlight(campaign: Campaign, clock: Clock): Campaign {
  let result = campaign;
  for (const u of activeFlight(campaign).units) {
    if (!activeFoe(campaign, u)) continue;
    const entry: SpaceBattleEnd = { kind: 'spaceBattleEnd', at: clock.now(), day: result.day, foe: nameOfUnit(campaign, u), outcome: 'departed' };
    result = { ...result, log: [...result.log, entry] };
  }
  return endFlight(result);
}

/** Warum die unterbrochene Reise jetzt nicht weitergehen kann; `undefined`, wenn sie kann. */
export function departureBlocker(campaign: Campaign): string | undefined {
  const departure = departureOf(campaign);
  if (departure === undefined) return 'Dieser Systemflug unterbrach keine Reise.';
  const own = activeFlight(campaign).units[partyIndexOf(activeFlight(campaign))];
  if (own?.crashed) return 'Das Schiff der Gruppe ist aufgeschlagen.';
  const ended = endFlight(campaign);
  return departure.kind === 'jump' ? shipJourneyBlocker(ended, departure.to) : systemJourneyBlocker(ended, departure.to, 'ship');
}

/**
 * Die unterbrochene Reise geht aus dem Systemflug weiter (2026-11-22b): „Springen nach …“ bzw.
 * „Reisen nach …“, ohne neuen Wurf beim Start. Beim Sprung zählt der DM der Nähe zu einem Körper.
 * Der Systemflug endet; ein fremdes Schiff bleibt zurück.
 */
export function departFromFlight(campaign: Campaign, random: Random, clock: Clock): Campaign {
  const blocker = departureBlocker(campaign);
  if (blocker) throw new DomainError(blocker);
  const departure = departureOf(campaign)!;
  const extraDm = departure.kind === 'jump' ? flightJumpDm(campaign) : 0;
  const left = leaveFlight(campaign, clock);
  return departure.kind === 'jump' ? travelShip(left, departure.to, random, clock, { extraDm }) : travelInSystem(left, departure.to, 'ship', clock);
}
