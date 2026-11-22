import type { Campaign } from '../campaign';
import { DomainError } from '../errors';
import type { SpaceBattle } from '../log';
import type { Clock, Random } from '../ports';
import { recordArrivalRoll } from '../ship-encounter';
import { encounterBlocker, encounterColumnAt, encounterFlight, placeFoe, rollEncounterTable, shipOnSums, sightingEntry, type EncounterColumn, type EncounterContext, type ShipEncounterRoll } from '../space-combat';
import { travelInSystem } from '../system-journey';
import { travelShip } from '../travel';

/**
 * Die Begegnungsprüfung (Domänenmodell 2026-11-22b: `EncounterCheck`; hier `ShipEncounterCheck`, weil
 * `EncounterCheck` im Code schon der Test der Encounter Checklist ist): der Dialog vor dem Wurf auf der
 * Starship Encounter Table bei Abreise, Ankunft oder von Hand. Flüchtig, nie gespeichert.
 */
export interface ShipEncounterCheck {
  /** Start von der Welt oder Ankunft; fehlt: von Hand. */
  readonly occasion?: 'departure' | 'arrival';
  /** Die Welt, in deren System gewürfelt wird. */
  readonly world: string;
  /** Beim Start: das Ziel der Reise (Feld des Sprungs bzw. Welt der Reise im System). */
  readonly jumpTo?: string;
  readonly travelTo?: string;
  /** Nach „Würfeln“: der Wurf. */
  readonly result?: ShipEncounterRoll;
  /** Ein Schiff, das die Gruppe ignoriert, noch nicht im Log: Der Dialog fragt „Zur Raumkarte“ oder „Weiter“. */
  readonly sighting?: SpaceBattle;
}

/** Eine neue Begegnungsprüfung. */
export function openShipCheck(world: string, context: EncounterContext = {}): ShipEncounterCheck {
  return { world, ...context };
}

/** `/column`, `/dm`: Spalte und DM der Prüfung. */
export function checkColumn(campaign: Campaign, check: ShipEncounterCheck): EncounterColumn {
  return encounterColumnAt(campaign.hexes, check.world);
}

/** `/shipOn`: die Summen auf 2W6, bei denen ein Schiff kommt. */
export function checkShipOn(campaign: Campaign, check: ShipEncounterCheck): readonly number[] {
  return shipOnSums(checkColumn(campaign, check));
}

function contextOf(check: ShipEncounterCheck): EncounterContext {
  return { ...(check.occasion ? { occasion: check.occasion } : {}), ...(check.jumpTo ? { jumpTo: check.jumpTo } : {}), ...(check.travelTo ? { travelTo: check.travelTo } : {}) };
}

/** Die Reise beim Start findet statt (mit dem Wurf ohne Schiff, oder ohne Wurf). */
function depart(campaign: Campaign, check: ShipEncounterCheck, random: Random, clock: Clock, departureRoll?: ShipEncounterRoll['encounter']): Campaign {
  if (check.jumpTo !== undefined) return travelShip(campaign, check.jumpTo, random, clock, departureRoll ? { departureRoll } : {});
  if (check.travelTo !== undefined) return travelInSystem(campaign, check.travelTo, 'ship', clock, undefined, departureRoll);
  throw new DomainError('Die Reise hat kein Ziel.');
}

/** Was nach einem Schritt der Prüfung geschah. */
export interface CheckStep {
  readonly campaign: Campaign;
  /** Die Prüfung danach; fehlt: sie ist erledigt. */
  readonly check: ShipEncounterCheck | undefined;
  /** Die Reise beim Start hat stattgefunden; bei der Ankunft folgt die nächste Prüfung. */
  readonly travelled: boolean;
  /** Ein Systemflug mit fremdem Schiff hat begonnen (oder es tauchte im laufenden auf). */
  readonly flight: boolean;
}

/**
 * „Würfeln“ (2026-11-22b): Ohne Schiff geht die Reise weiter (beim Start findet sie statt, der Wurf
 * steht an ihr; bei der Ankunft steht er an der Reise). Ein Angreifer öffnet die Raumkarte. Ein Schiff,
 * das ignoriert, wird zur Sichtung, und der Dialog fragt. Läuft schon ein Systemflug (von Hand),
 * taucht das Schiff dort auf wie beim Knopf.
 */
export function rollShipCheck(campaign: Campaign, check: ShipEncounterCheck, random: Random, clock: Clock): CheckStep {
  if (check.result !== undefined) throw new DomainError('Es ist schon gewürfelt.');
  const inFlight = check.occasion === undefined && campaign.flight !== undefined;
  if (inFlight) {
    const blocker = encounterBlocker(campaign);
    if (blocker) throw new DomainError(blocker);
  }
  const result = rollEncounterTable(checkColumn(campaign, check), random);
  const rolled = { ...check, result };
  if (result.code === undefined) {
    if (check.occasion === 'departure') return { campaign: depart(campaign, check, random, clock, result.encounter), check: rolled, travelled: true, flight: false };
    if (check.occasion === 'arrival') return { campaign: recordArrivalRoll(campaign, result.encounter), check: rolled, travelled: false, flight: false };
    return { campaign, check: rolled, travelled: false, flight: false };
  }
  if (inFlight) {
    const offset = { bands: random.int(1, 6) + random.int(1, 6), angle: random.int(1, 6) * 60 };
    const extra = { encounter: result.encounter, ...(result.reaction ? { reaction: result.reaction } : {}), ...(result.attack ? { attack: result.attack } : {}) };
    return { campaign: placeFoe(campaign, result.design!, result.intent!, clock, offset, extra), check: rolled, travelled: false, flight: true };
  }
  if (result.intent === 'attack') return { campaign: encounterFlight(campaign, result, contextOf(check), random, clock), check: rolled, travelled: false, flight: true };
  return { campaign, check: { ...rolled, sighting: sightingEntry(campaign, result, contextOf(check), clock) }, travelled: false, flight: false };
}

/**
 * Die Antwort auf eine Sichtung: „Zur Raumkarte“ (`toMap`) öffnet den Systemflug mit dem Schiff, das
 * ignoriert; „Weiter“ schreibt nur den Logeintrag, und die Reise geht weiter.
 */
export function answerSighting(campaign: Campaign, check: ShipEncounterCheck, toMap: boolean, random: Random, clock: Clock): CheckStep {
  if (check.sighting === undefined || check.result === undefined) throw new DomainError('Es gibt keine Sichtung.');
  if (toMap) return { campaign: encounterFlight(campaign, check.result, contextOf(check), random, clock), check: undefined, travelled: false, flight: true };
  const logged = { ...campaign, log: [...campaign.log, check.sighting] };
  if (check.occasion === 'departure') return { campaign: depart(logged, check, random, clock), check: undefined, travelled: true, flight: false };
  return { campaign: logged, check: undefined, travelled: false, flight: false };
}

/** „Abbrechen“, lang gedrückt (2026-11-22b): Der Wurf fällt aus, als wäre kein Schiff gekommen; nichts kommt ins Log außer der Reise. */
export function skipShipCheck(campaign: Campaign, check: ShipEncounterCheck, random: Random, clock: Clock): CheckStep {
  if (check.result !== undefined) throw new DomainError('Es ist schon gewürfelt.');
  if (check.occasion === 'departure') return { campaign: depart(campaign, check, random, clock), check: undefined, travelled: true, flight: false };
  return { campaign, check: undefined, travelled: false, flight: false };
}
