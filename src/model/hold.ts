import { livingCharacters, type Campaign, type CharacterId } from './campaign';
import { animalTypeOf } from './animals';
import type { AnimalSpecial } from './reference';
import { DomainError } from './errors';
import { currentEncounter, distanceOf, encounterAnimalRow, isAnimalEncounter, withDistance, type Encounter } from './encounter';
import type { AttackResult } from './log';
import type { Random } from './ports';
import { canFight, woundStateOf } from './wounds';

/** Wer von einem Trapper oder einer Siren auf Close oder Short überrascht wird, ist bei 5+ gefangen (SR 48). */
export const TRAP_TARGET = 5;
/** Losreißen statt zu schlagen: aus der Falle 9+, aus dem Filter 7+ (SR 48). */
export const STRUGGLE_TARGET: Record<AnimalSpecial, number> = { trap: 9, lure: 9, filter: 7 };
/** Je helfendem Kameraden auf Close: +1 bei der Falle, +2 beim Filter. */
export const HELPER_DM: Record<AnimalSpecial, number> = { trap: 1, lure: 1, filter: 2 };
/** Der Filter saugt auf Close bei 6+ ein, ohne DMs; wer schon drin ist, nimmt den Schaden von selbst (Zielwert 2). */
export const FILTER_TARGET = 6;
export const FILTER_HELD_TARGET = 2;

/** Die besondere Angriffsart der Tiere der laufenden Begegnung, wenn es eine gibt. */
export function encounterSpecial(campaign: Campaign, encounter: Encounter | undefined = currentEncounter(campaign)): AnimalSpecial | undefined {
  if (!encounter || !isAnimalEncounter(encounter)) return undefined;
  return animalTypeOf(encounterAnimalRow(campaign, encounter).type!).special;
}

/** Können die Tiere der laufenden Begegnung noch festhalten? Wenn keines mehr kämpfen kann, ist jeder frei. */
function animalsHold(campaign: Campaign, encounter: Encounter): boolean {
  return encounter.npcs.some((n) => canFight(woundStateOf(campaign, n.id)));
}

/** Ist dieser SC festgehalten (Falle, Köder oder Filter)? Dann greift er nicht an, bewegt sich nicht und weicht nicht aus. */
export function isHeld(campaign: Campaign, pc: CharacterId): boolean {
  const encounter = currentEncounter(campaign);
  if (!encounter || encounterSpecial(campaign, encounter) === undefined) return false;
  return distanceOf(encounter, pc).held === true && animalsHold(campaign, encounter);
}

/** Wer beim Losreißen hilft: die anderen SC in Berührung, die kämpfen können und nicht selbst festgehalten sind (SR 48). */
export function helpersOf(campaign: Campaign, pc: CharacterId): readonly CharacterId[] {
  const encounter = currentEncounter(campaign);
  if (!encounter) return [];
  return livingCharacters(campaign)
    .filter((c) => c.id !== pc && canFight(woundStateOf(campaign, c.id)) && distanceOf(encounter, c.id).close && !isHeld(campaign, c.id))
    .map((c) => c.id);
}

/** Was ein festgehaltener SC zum Losreißen braucht: Zielwert und DM aus den Helfern. */
export function struggleNeed(campaign: Campaign, pc: CharacterId): { readonly target: number; readonly dm: number; readonly helpers: number } {
  const special = encounterSpecial(campaign);
  if (!special) throw new DomainError('Hier hält kein Tier fest.');
  const helpers = helpersOf(campaign, pc).length;
  return { target: STRUGGLE_TARGET[special], dm: helpers * HELPER_DM[special], helpers };
}

/**
 * Die Falle schnappt zu (SR 48): Haben die Tiere einer Begegnung mit Trapper oder Siren Überraschung,
 * würfelt jeder SC auf Close oder Short (Band 0) 2W6; bei 5+ ist er festgehalten. Die Würfel bleiben
 * an seiner Entfernung.
 */
export function springTrap(campaign: Campaign, encounter: Encounter, surprised: boolean, random: Random): Encounter {
  const special = encounterSpecial(campaign, encounter);
  if (!surprised || (special !== 'trap' && special !== 'lure')) return encounter;
  return livingCharacters(campaign).reduce((current, c) => {
    const distance = distanceOf(current, c.id);
    if (distance.band !== 0) return current;
    const trapDice = [random.int(1, 6), random.int(1, 6)] as const;
    return withDistance(current, { ...distance, trapDice, held: trapDice[0] + trapDice[1] >= TRAP_TARGET });
  }, encounter);
}

/** Nach einem gelungenen Einsaugen des Filters ist das Ziel festgehalten. */
export function holdAfterAttack(campaign: Campaign, results: readonly AttackResult[]): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter || encounterSpecial(campaign, encounter) !== 'filter') return campaign;
  const caught = results.filter((r) => r.against !== undefined && r.dice[0] + r.dice[1] + r.dm >= r.target && campaign.characters.some((c) => c.id === r.against));
  if (caught.length === 0) return campaign;
  const after = caught.reduce((current, r) => withDistance(current, { ...distanceOf(current, r.against!), held: true }), encounter);
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? after : e)) };
}

/** Was ein Versuch zum Losreißen ergab: Würfel, DM, Zielwert, ob er frei ist, und die Kampagne danach. */
export interface Struggle {
  readonly dice: readonly [number, number];
  readonly dm: number;
  readonly target: number;
  readonly freed: boolean;
  readonly campaign: Campaign;
}

/**
 * Der festgehaltene SC reißt sich statt zu schlagen los (SR 48): 2W6 + DM der Helfer gegen 9 (Falle)
 * bzw. 7 (Filter). Jeder Versuch kostet einen Combat-Schlag (`struggles`). Gelingt er, ist er frei.
 */
export function struggle(campaign: Campaign, pc: CharacterId, random: Random): Struggle {
  const encounter = currentEncounter(campaign);
  if (!encounter || !isHeld(campaign, pc)) throw new DomainError('Losreißen kann nur, wer festgehalten ist.');
  const need = struggleNeed(campaign, pc);
  const dice = [random.int(1, 6), random.int(1, 6)] as const;
  const freed = dice[0] + dice[1] + need.dm >= need.target;
  const distance = distanceOf(encounter, pc);
  const after = withDistance(encounter, { ...distance, held: !freed, struggles: (distance.struggles ?? 0) + 1 });
  return { dice, dm: need.dm, target: need.target, freed, campaign: { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? after : e)) } };
}

/** Wie viele W6 der Filter beim Einsaugen macht: 1W6 je angefangene 50 kg seiner Masse, ohne Wundänderung (SR 48). */
export function filterDice(weight: number): number {
  return Math.max(1, Math.ceil(weight / 50));
}
