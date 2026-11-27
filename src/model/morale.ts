import { activeSkills, anyCharacterOf, livingCharacters, type Campaign, type CharacterId } from './campaign';
import { replay } from './career';
import { currentEncounter, distanceOf, encounterTypeOfEncounter, hasEncounterType, isAnimalEncounter, isEscapedDistance, npcSideIds, steppedPosition, withDistance, type Encounter, type MoraleRoll, type SurpriseDmPart } from './encounter';
import type { Random } from './ports';
import { canFight, woundStateOf } from './wounds';

/**
 * Moral und Flucht (S. 5, SR 23). Ab 25 % Verlusten würfelt die App zu Beginn jeder neuen Runde je
 * Partei 2W6 gegen 7+; die Würfe bleiben an der Begegnung (`pcMorale`, `npcMorale`). Durchgefallene
 * fliehen: Die NSC-Partei kämpft nicht mehr und rückt je neuer Runde 2 Bands weg, über 20 Bands ist
 * sie entkommen (SR 21). Bei den SC bleibt die Entscheidung beim Spieler, der Wurf ist die
 * Empfehlung „Rückzug empfohlen“ (`/retreat`). Für Tiere gilt die Moral nicht; sie fliehen nach ihrem
 * Verhalten (SR 47–49). Der Code folgt `docs/modell/kampf.md` unter *Moral* (2026-11-27e).
 */

/** Eine Partei des Kampfs. */
export type MoraleSide = 'pcs' | 'npcs';

/** Der Moraltest einer Partei: 2W6, ihr DM und die Runde, in der er fiel (S. 5); er hängt an der Begegnung. */
export type { MoraleRoll };

/** Ab wie viel Prozent Verlusten eine Partei jede Runde auf die Moral würfelt (S. 5: 25 %). */
export const MORALE_LOSS = 25;

/** Wogegen die Moralprobe würfelt: 7+ heißt stehenbleiben (S. 5). */
export const MORALE_TARGET = 7;

/** Bands, die eine fliehende NSC-Gruppe je neue Runde zurücklegt (SR 21: weg nur durch Bewegung). */
export const FLEE_BANDS = 2;

/** Die Verluste einer Partei: wie viele ihrer Kämpfer nicht mehr kämpfen können, von ihrer Zahl und in Prozent. */
export interface Losses {
  readonly lost: number;
  readonly total: number;
  readonly percent: number;
}

function d6(random: Random): number {
  return random.int(1, 6);
}

function totalOf(roll: MoraleRoll): number {
  return roll.dice[0] + roll.dice[1] + roll.dm;
}

function partsOf(entries: readonly (readonly [boolean, string, number])[]): readonly SurpriseDmPart[] {
  return entries.filter(([applies]) => applies).map(([, label, dm]) => ({ label, dm }));
}

/** Der Moraltest dieser Partei, wenn er schon gewürfelt ist. */
export function moraleOf(encounter: Encounter, side: MoraleSide): MoraleRoll | undefined {
  return side === 'pcs' ? encounter.pcMorale : encounter.npcMorale;
}

/** Die Kämpfer einer Partei: die SC der Kampagne, die NSC-Seite mit den dazugenommenen NSC. */
function fightersOf(campaign: Campaign, encounter: Encounter, side: MoraleSide): readonly CharacterId[] {
  return side === 'pcs' ? livingCharacters(campaign).map((c) => c.id) : npcSideIds(encounter);
}

/** Die Verluste einer Partei (S. 5): ihre Kämpfer, die nicht mehr kämpfen können, und ihre Zahl. */
export function lossesOf(campaign: Campaign, encounter: Encounter, side: MoraleSide): Losses {
  const fighters = fightersOf(campaign, encounter, side);
  const lost = fighters.filter((id) => !canFight(woundStateOf(campaign, id))).length;
  return { lost, total: fighters.length, percent: fighters.length === 0 ? 0 : Math.round((lost * 100) / fighters.length) };
}

/** Muß diese Partei in der laufenden Runde auf die Moral würfeln? Ab 25 % Verlusten, je Runde einmal; Tiere haben keine Moral. */
export function moraleDue(campaign: Campaign, encounter: Encounter, side: MoraleSide): boolean {
  // Die erste Runde beginnt mit der Überraschung; gewürfelt wird zu Beginn jeder *neuen* Runde (S. 5).
  if (encounter.round < 2) return false;
  if (side === 'npcs' && (isAnimalEncounter(encounter) || isFleeing(encounter))) return false;
  if (lossesOf(campaign, encounter, side).percent < MORALE_LOSS) return false;
  const roll = moraleOf(encounter, side);
  return roll === undefined || roll.round < encounter.round;
}

/** Der DM für den ausgefallenen Anführer: −2 in der Fallrunde und der nächsten, danach nicht mehr (S. 5). */
export function leaderDownDm(encounter: Encounter): number {
  return encounter.leaderDown === undefined || encounter.round - encounter.leaderDown > 1 ? 0 : -2;
}

/** Die DMs der SC-Seite auf die Moral: Army oder Marines +1, Leader +1, Tactics +1, über 50 % Verluste −2. */
export function pcMoraleParts(campaign: Campaign, encounter: Encounter): readonly SurpriseDmPart[] {
  const pcs = livingCharacters(campaign);
  const skill = (id: string) => pcs.some((c) => activeSkills(c).some((s) => s.of === id && s.level >= 1));
  const military = pcs.some((c) => c.career !== undefined && ['army', 'marines'].includes(replay(c.career).service?.id ?? ''));
  return partsOf([
    [military, 'Army/Marines', 1],
    [skill('leader'), 'Leader', 1],
    [skill('tactics'), 'Tactics', 1],
    [lossesOf(campaign, encounter, 'pcs').percent > 50, 'über 50 % Verluste', -2],
  ]);
}

/** Die DMs der NSC-Partei auf die Moral (S. 5); für Tiere wird nicht gewürfelt. */
export function npcMoraleParts(campaign: Campaign, encounter: Encounter): readonly SurpriseDmPart[] {
  const type = hasEncounterType(encounter) ? encounterTypeOfEncounter(encounter) : undefined;
  const leader = encounter.leader === undefined ? undefined : anyCharacterOf(campaign, encounter.leader);
  const tactics = leader !== undefined && activeSkills(leader).some((s) => s.of === 'tactics' && s.level >= 1);
  return partsOf([
    [type?.military === true, 'militärisch', 1],
    [encounter.leader !== undefined, 'Anführer', 1],
    [tactics, 'Anführer: Tactics', 1],
    [lossesOf(campaign, encounter, 'npcs').percent > 50, 'über 50 % Verluste', -2],
    [leaderDownDm(encounter) < 0, 'Anführer ausgefallen', -2],
  ]);
}

const sumOf = (parts: readonly SurpriseDmPart[]) => parts.reduce((total, p) => total + p.dm, 0);

/** Die DMs auf die Moral je Partei, nach dem heutigen Stand der Parteien. */
export function moraleParts(campaign: Campaign, encounter: Encounter): { readonly pcs: readonly SurpriseDmPart[]; readonly npcs: readonly SurpriseDmPart[] } {
  return { pcs: pcMoraleParts(campaign, encounter), npcs: npcMoraleParts(campaign, encounter) };
}

/** DM der SC-Seite auf die Moral. */
export function pcMoraleDm(campaign: Campaign, encounter: Encounter): number {
  return sumOf(pcMoraleParts(campaign, encounter));
}

/** DM der NSC-Partei auf die Moral. */
export function npcMoraleDm(campaign: Campaign, encounter: Encounter): number {
  return sumOf(npcMoraleParts(campaign, encounter));
}

/** Besteht diese Partei ihre Moralprobe (7+)? Ohne Wurf: nein. */
export function moralePassed(encounter: Encounter, side: MoraleSide): boolean {
  const roll = moraleOf(encounter, side);
  return roll !== undefined && totalOf(roll) >= MORALE_TARGET;
}

/** Flieht die NSC-Partei, weil sie ihre Moralprobe verloren hat? */
export function isFleeing(encounter: Encounter): boolean {
  return encounter.npcFleeing === true;
}

/**
 * `/npcEscaped`: die fliehende NSC-Partei ist über 20 Bands weg. Da die Gruppe der feste Bezugspunkt
 * auf Band 0 ist, heißt das: jeder SC, der kämpft, liegt auf Band 21.
 */
export function npcEscaped(campaign: Campaign, encounter: Encounter): boolean {
  if (!isFleeing(encounter)) return false;
  const pcs = livingCharacters(campaign);
  if (pcs.length === 0) return true;
  return pcs.every((c) => isEscapedDistance(distanceOf(encounter, c.id)));
}

/**
 * `/retreat`: die verlorene Moralprobe der SC-Seite ist von der laufenden Runde – die App empfiehlt
 * den Rückzug, entschieden wird sie beim Spieler.
 */
export function retreatSuggested(encounter: Encounter): boolean {
  const roll = encounter.pcMorale;
  return roll !== undefined && roll.round === encounter.round && totalOf(roll) < MORALE_TARGET;
}

/** Was der Anfang einer neuen Runde gebracht hat; `morale`, `fled` und `escaped` steuern die Anzeige. */
export interface RoundStart {
  readonly campaign: Campaign;
  /** Hat die App eine Moralprobe gewürfelt? Dann zeigt sie die Würfelbühne. */
  readonly morale: boolean;
  /** Ist die NSC-Partei in dieser Runde geflohen? */
  readonly fled: boolean;
  /** Ist die fliehende NSC-Partei jetzt über 20 Bands weg? */
  readonly escaped: boolean;
}

/**
 * Der Anfang einer neuen Runde (S. 5, SR 23): Eine fliehende NSC-Gruppe rückt 2 Bands weg, die
 * Fallrunde des Anführers wird notiert, und jede Partei ab 25 % Verlusten würfelt 2W6 gegen 7+.
 * Fällt die NSC-Partei durch, flieht sie. Vor dem Wurf auf die Überraschung und nach dem Ende der
 * Begegnung tut sich nichts. Alles ist je Runde einmal getan, der Aufruf darf also jeden Zug
 * begleiten: Die Flucht zählt über `npcMoved`, der Wurf über seine Runde.
 */
export function startRound(campaign: Campaign, random: Random): RoundStart {
  const stored = currentEncounter(campaign);
  const none = { campaign, morale: false, fled: false, escaped: false };
  if (!stored || stored.ended || stored.pcSurprise === undefined || stored.npcSurprise === undefined) return none;
  let encounter = stored;
  // Die fliehende Gruppe rennt: 2 Bands je neue Runde, ohne Combat-Schläge (Hausregel unter *Moral*).
  if (isFleeing(encounter) && (encounter.npcMoved ?? 0) < FLEE_BANDS) encounter = runAway(campaign, encounter);
  // Der Anführer ist ausgefallen: Die Fallrunde wird notiert (S. 5: −2 für zwei Runden).
  if (encounter.leader !== undefined && encounter.leaderDown === undefined && !canFight(woundStateOf(campaign, encounter.leader))) {
    encounter = { ...encounter, leaderDown: encounter.round };
  }
  let morale = false;
  let fled = false;
  for (const side of ['pcs', 'npcs'] as const) {
    if (!moraleDue(campaign, encounter, side)) continue;
    const dm = side === 'pcs' ? pcMoraleDm(campaign, encounter) : npcMoraleDm(campaign, encounter);
    const roll: MoraleRoll = { dice: [d6(random), d6(random)], dm, round: encounter.round };
    encounter = side === 'pcs' ? { ...encounter, pcMorale: roll } : { ...encounter, npcMorale: roll };
    morale = true;
    if (side === 'npcs' && totalOf(roll) < MORALE_TARGET) {
      // Sie flieht: Die 2 Bands dieser Runde sind schon gelaufen, die nächsten erst mit der neuen Runde.
      encounter = { ...encounter, npcFleeing: true, npcMoved: FLEE_BANDS };
      fled = true;
    }
  }
  if (encounter === stored) return none;
  const after: Campaign = { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? encounter : e)) };
  return { campaign: after, morale, fled, escaped: npcEscaped(after, encounter) };
}

/** Die fliehende NSC-Gruppe geht 2 Bands weiter weg: Sie bleibt auf Band 0, also rückt jeder SC. */
function runAway(campaign: Campaign, encounter: Encounter): Encounter {
  let after = withNpcMoved(encounter);
  for (const pc of livingCharacters(campaign)) {
    const distance = distanceOf(after, pc.id);
    let position = distance;
    for (let step = 0; step < FLEE_BANDS; step += 1) {
      const next = steppedPosition(position.band, position.close, 1);
      if (next === undefined) break;
      position = { ...position, ...next };
    }
    if (position.band !== distance.band || position.close !== distance.close) after = withDistance(after, position);
  }
  return after;
}

/** Die Begegnung mit den 2 Bands, die die NSC-Gruppe in dieser Runde gelaufen ist. */
function withNpcMoved(encounter: Encounter): Encounter {
  const rest = Object.fromEntries(Object.entries(encounter).filter(([key]) => key !== 'npcMoved')) as Record<string, unknown>;
  return { ...rest, npcMoved: FLEE_BANDS } as Encounter;
}
