import { anyCharacterOf, armedWeaponsOf, isCampaignCharacter, livingCharacters, setWields, type Campaign, type CharacterId } from './campaign';
import { ammoOf, reload } from './combat';
import { DomainError } from './errors';
import { currentEncounter, distanceOf, encounterAnimalRow, ESCAPED_BAND, isAnimalEncounter, isEscapedDistance, needsSurprise, steppedPosition, withDistance, type Encounter } from './encounter';
import { canFight, woundStateOf } from './wounds';
import { isHeld } from './hold';

/** Die beiden Parteien eines Kampfs: die SC und die NSC der Begegnung. */
export type Side = 'pcs' | 'npcs';

/** Die Partei eines Kämpfers: SC, wer zur Kampagne gehört; NSC, wer an einer Begegnung hängt. */
export function sideOf(campaign: Campaign, who: CharacterId): Side {
  return isCampaignCharacter(campaign, who) ? 'pcs' : 'npcs';
}

/** `/surprise`: Wer 3 oder mehr über der anderen Partei liegt, hat Überraschung (S. 5). */
export function surpriseOf(encounter: Encounter): Side | undefined {
  if (!encounter.pcSurprise || !encounter.npcSurprise) return undefined;
  const pcs = encounter.pcSurprise.die + encounter.pcSurprise.dm;
  const npcs = encounter.npcSurprise.die + encounter.npcSurprise.dm;
  if (pcs - npcs >= 3) return 'pcs';
  if (npcs - pcs >= 3) return 'npcs';
  return undefined;
}

/**
 * `/surprising`: die Partei mit Überraschung, solange die Überraschung hält: bis zum Ende der Runde,
 * in der die andere Partei Alarm gegeben hat (SR 20).
 */
export function surprisingOf(encounter: Encounter): Side | undefined {
  const surprise = surpriseOf(encounter);
  if (surprise === undefined || (encounter.alarm !== undefined && encounter.round > encounter.alarm)) return undefined;
  return surprise;
}

/** `/first`: Die Partei mit dem höheren Überraschungswurf zieht jede Runde zuerst; bei Gleichstand die SC. */
export function firstSide(encounter: Encounter): Side {
  if (!encounter.pcSurprise || !encounter.npcSurprise) return 'pcs';
  return encounter.npcSurprise.die + encounter.npcSurprise.dm > encounter.pcSurprise.die + encounter.pcSurprise.dm ? 'npcs' : 'pcs';
}

/** Ein Kämpfer der Simulation: der Charakter und seine Partei. */
export interface FightSlot {
  readonly id: CharacterId;
  readonly side: Side;
}

/** Alle Kämpfer in Zugreihenfolge: erst die Partei, die zuerst zieht, dann die andere. */
export function fightOrder(campaign: Campaign, encounter: Encounter): readonly FightSlot[] {
  const pcs: FightSlot[] = livingCharacters(campaign).map((c) => ({ id: c.id, side: 'pcs' }));
  const npcs: FightSlot[] = encounter.npcs.map((n) => ({ id: n.id, side: 'npcs' }));
  return firstSide(encounter) === 'pcs' ? [...pcs, ...npcs] : [...npcs, ...pcs];
}

/** Höchstens so viele Bands bewegt sich ein SC bzw. die NSC-Gruppe je Runde: 1 gehend, 2 laufend (Charts S. 7, SR 20). */
export const MAX_MOVE = 2;

/** Wie viele Bands der SC bzw. die NSC-Gruppe in der gespeicherten Runde schon gegangen ist. */
function movedIn(encounter: Encounter, slot: FightSlot): number {
  return (slot.side === 'pcs' ? distanceOf(encounter, slot.id).moved : encounter.npcMoved) ?? 0;
}

/** Ein Objekt ohne dieses Feld. */
function without<T extends object>(value: T, key: string): T {
  return Object.fromEntries(Object.entries(value).filter(([k]) => k !== key)) as T;
}

/** Die Begegnung in der nächsten Runde: Runde + 1, keiner war dran, keiner ist gegangen. */
function nextRound(encounter: Encounter): Encounter {
  const rest = without(encounter, 'npcMoved');
  return { ...rest, ...(encounter.distances ? { distances: encounter.distances.map((d) => without(d, 'moved')) } : {}), round: encounter.round + 1, acted: [] };
}

/** Ist eine Partei ganz außer Gefecht (alle bewusstlos, schwer verwundet oder tot)? Dann die unterlegene. */
export function defeatedSide(campaign: Campaign, encounter: Encounter): Side | undefined {
  const order = fightOrder(campaign, encounter);
  for (const side of ['pcs', 'npcs'] as const) {
    const members = order.filter((s) => s.side === side);
    if (members.length === 0 || members.every((s) => !canFight(woundStateOf(campaign, s.id)))) return side;
  }
  return undefined;
}

/** Wer in dieser Runde noch dran ist, in Zugreihenfolge; solange die Überraschung hält, nur deren Partei. */
function waiting(campaign: Campaign, encounter: Encounter): readonly FightSlot[] {
  // Vor dem Wurf auf die Überraschung ist keiner am Zug: Er ist der erste Wurf im Kampf.
  if (needsSurprise(encounter)) return [];
  const surprise = surprisingOf(encounter);
  return fightOrder(campaign, encounter).filter(
    (s) => (surprise === undefined || s.side === surprise) && !encounter.acted.includes(s.id) && canFight(woundStateOf(campaign, s.id)),
  );
}

/**
 * Die Begegnung mit der Runde, die gerade gilt: Ist in der gespeicherten Runde keiner mehr dran (etwa
 * weil der Letzte außerhalb seines Zugs übernommen oder ausgeblendet wurde), gilt schon die nächste.
 */
export function fightState(campaign: Campaign, encounter: Encounter): Encounter {
  if (needsSurprise(encounter) || defeatedSide(campaign, encounter) || waiting(campaign, encounter).length > 0) return encounter;
  return nextRound(encounter);
}

/** `/turn`: wer in der laufenden Begegnung dran ist; keiner, wenn der Kampf entschieden ist. */
export function turnOf(campaign: Campaign): FightSlot | undefined {
  const encounter = currentEncounter(campaign);
  if (!encounter || defeatedSide(campaign, encounter)) return undefined;
  return waiting(campaign, fightState(campaign, encounter))[0];
}

export function withEncounter(campaign: Campaign, encounter: Encounter): Campaign {
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? encounter : e)) };
}

/**
 * Beendet den Zug dessen, der dran ist (nach dem Angriff, Nachladen, Ausweichen oder Aussetzen). Ist
 * danach in dieser Runde keiner mehr dran, beginnt die nächste. Ist der Nächste einer, der gelaufen
 * ist (oder aus der NSC-Gruppe, die gelaufen ist), zieht er von selbst (siehe `passRunners`).
 */
export function endTurn(campaign: Campaign): Campaign {
  return passRunners(finishTurn(campaign));
}

/**
 * Der Kämpfer am Zug weicht aus (SR 20): Er greift nicht an, das ist sein Zug. Bis zu seinem nächsten
 * Zug bekommt jeder Angriff auf ihn einen DM nach der Reichweite (siehe `evadeDm`).
 */
export function evadeTurn(campaign: Campaign): Campaign {
  return passRunners(finishTurn(campaign, true));
}

/** Weicht dieser Kämpfer in der laufenden Begegnung gerade aus? */
export function isEvading(campaign: Campaign, who: CharacterId): boolean {
  return currentEncounter(campaign)?.evading?.includes(who) ?? false;
}

/**
 * Beendet nur den Zug dessen, der dran ist, ohne die Läufer weiterzuziehen. Sein Zug nimmt ihn aus
 * dem Ausweichen; weicht er (wieder) aus, kommt er hinein.
 */
function finishTurn(campaign: Campaign, evade = false): Campaign {
  const running = currentEncounter(campaign);
  const turn = turnOf(campaign);
  if (!running || !turn) throw new DomainError('Es ist keiner am Zug.');
  const encounter = fightState(campaign, running);
  const evading = [...(encounter.evading ?? []).filter((id) => id !== turn.id), ...(evade ? [turn.id] : [])];
  let after: Encounter = { ...without(encounter, 'evading'), ...(evading.length > 0 ? { evading } : {}), acted: [...encounter.acted, turn.id] };
  if (waiting(campaign, after).length === 0) after = nextRound(after);
  return withEncounter(campaign, after);
}

/**
 * Die leere Waffe (Primär, dann Sekundär; 0 Schuss geladen), die dieser Kämpfer mit einem Magazin
 * aus dem Gruppengepäck (NSC: aus seinem Besitz) nachladen kann; sonst `undefined`.
 */
export function reloadableWeapon(campaign: Campaign, id: CharacterId): string | undefined {
  const character = anyCharacterOf(campaign, id);
  return armedWeaponsOf(character).find((weapon) => {
    const ammo = ammoOf({ ...character, wields: weapon }, campaign.stash);
    return ammo !== undefined && ammo.rounds === 0 && ammo.magazines > 0;
  });
}

/**
 * Wer läuft, greift nicht an: Ist der Kämpfer am Zug ein SC, der in dieser Runde gelaufen ist, oder
 * einer aus der NSC-Gruppe, die gelaufen ist, zieht er von selbst. Ein NSC mit leerer Waffe und
 * Magazin lädt nach, jeder andere setzt aus; so weiter, bis einer dran ist, der nicht gelaufen ist,
 * oder die Runde endet. Nur ein SC, der nachladen könnte, bleibt am Zug und wählt selbst.
 */
function passRunners(campaign: Campaign): Campaign {
  let current = campaign;
  for (let turn = turnOf(current); turn && hasRun(current, turn); turn = turnOf(current)) {
    const weapon = reloadableWeapon(current, turn.id);
    if (weapon !== undefined && turn.side === 'pcs') return current;
    if (weapon !== undefined) current = reload(setWields(current, turn.id, weapon), turn.id);
    current = finishTurn(current);
  }
  return current;
}

/** Wie weit sich der SC am Zug bzw. die NSC-Gruppe in der Runde, die gerade gilt, bewegen kann. */
export interface MoveState {
  readonly side: Side;
  /** Wer sich bewegt: der SC am Zug; bei der NSC-Gruppe `undefined`. */
  readonly pc: CharacterId | undefined;
  /** Schon gegangene Bands in dieser Runde. */
  readonly moved: number;
  /** Geht noch ein Band? Sonst steht in `reason`, warum nicht. */
  readonly can: boolean;
  readonly reason: string | undefined;
  /** Gelaufen (2 Bands): kein Angriff in dieser Runde. */
  readonly ran: boolean;
}

/** Bands, die der SC bzw. die NSC-Gruppe in der Runde, die gerade gilt, gegangen ist. */
export function movedOf(campaign: Campaign, slot: FightSlot): number {
  const encounter = currentEncounter(campaign);
  return encounter ? movedIn(fightState(campaign, encounter), slot) : 0;
}

/** Ist dieser Kämpfer in dieser Runde gelaufen (der SC selbst, beim NSC seine Gruppe)? Dann greift er nicht an. Tiere laufen nicht. */
export function hasRun(campaign: Campaign, slot: FightSlot): boolean {
  if (slot.side === 'npcs' && animalSpeedOf(campaign) !== undefined) return false;
  return movedOf(campaign, slot) >= MAX_MOVE;
}

/** Die Geschwindigkeit der Tiere der laufenden Begegnung: so viele Bands je Runde (SR 47); fehlt ohne Tiere. */
export function animalSpeedOf(campaign: Campaign): number | undefined {
  const encounter = currentEncounter(campaign);
  return encounter && isAnimalEncounter(encounter) ? (encounterAnimalRow(campaign, encounter).speed ?? 0) : undefined;
}

/**
 * Wie weit sich bewegen kann, wer am Zug ist: ein SC für sich, ein NSC mit der ganzen Gruppe. Gehen
 * 1 Band, laufen ein zweites; die NSC-Gruppe nur, solange noch keiner von ihr in dieser Runde dran
 * war. `undefined`, wenn keiner am Zug ist.
 */
export function moveState(campaign: Campaign): MoveState | undefined {
  const running = currentEncounter(campaign);
  const turn = turnOf(campaign);
  if (!running || !turn) return undefined;
  const encounter = fightState(campaign, running);
  const moved = movedIn(encounter, turn);
  const pc = turn.side === 'pcs' ? turn.id : undefined;
  const someoneActed = pc === undefined && fightOrder(campaign, encounter).some((s) => s.side === 'npcs' && encounter.acted.includes(s.id));
  const who = pc === undefined ? 'Die NSC sind' : `${anyCharacterOf(campaign, pc).name} ist`;
  if (pc !== undefined && isHeld(campaign, pc)) return { side: turn.side, pc, moved, can: false, reason: `${anyCharacterOf(campaign, pc).name} ist festgehalten; erst losreißen.`, ran: false };
  // Tiere gehen je Runde bis zu ihrer Geschwindigkeit S, ohne zu laufen (SR 47).
  const speed = pc === undefined ? animalSpeedOf(campaign) : undefined;
  if (speed !== undefined) {
    const reason = speed === 0 ? 'Die Tiere sind unbeweglich (S0).' : moved >= speed ? `Die Tiere sind in dieser Runde schon ${speed} ${speed === 1 ? 'Band' : 'Bands'} gegangen (S${speed}).` : undefined;
    return { side: turn.side, pc, moved, can: reason === undefined, reason, ran: false };
  }
  const reason =
    moved >= MAX_MOVE
      ? `${who} in dieser Runde schon gelaufen (2 Bands).`
      : moved === 1 && someoneActed
        ? 'Die NSC sind schon gegangen; laufen (ein zweites Band) geht nur, bevor einer von ihnen dran war.'
        : undefined;
  return { side: turn.side, pc, moved, can: reason === undefined, reason, ran: moved >= MAX_MOVE };
}

/**
 * Wer am Zug ist, geht ein Band näher (−1) oder weiter weg (+1): ein SC für sich; ein NSC mit der
 * ganzen Gruppe, die auf Band 0 bleibt, also rücken alle SC, die kämpfen, um ein Band (wer in
 * Berührung ist bzw. entkommen, bleibt es). Das ist kein Zug; das zweite Band in einer Runde ist
 * Laufen und kostet einen Combat-Schlag, danach greift, wer gelaufen ist, in dieser Runde nicht an
 * (siehe `passRunners`).
 */
export function moveSide(campaign: Campaign, step: -1 | 1): Campaign {
  const state = moveState(campaign);
  if (!state) throw new DomainError('Bewegen kann nur, wer am Zug ist.');
  if (!state.can) throw new DomainError(state.reason!);
  const encounter = fightState(campaign, currentEncounter(campaign)!);
  const run = state.pc === undefined && animalSpeedOf(campaign) !== undefined ? 0 : state.moved + 1 >= MAX_MOVE ? 1 : 0;
  let after: Encounter;
  if (state.pc !== undefined) {
    const distance = distanceOf(encounter, state.pc);
    const next = steppedPosition(distance.band, distance.close, step);
    if (!next) throw new DomainError(step < 0 ? 'Näher als in Berührung geht nicht.' : `${anyCharacterOf(campaign, state.pc).name} ist schon entkommen.`);
    after = withDistance(encounter, { ...distance, ...next, moved: state.moved + 1, ...(run || distance.runs ? { runs: (distance.runs ?? 0) + run } : {}) });
  } else {
    const pcs = livingCharacters(campaign).map((c) => distanceOf(encounter, c.id));
    // Wer festgehalten ist, bleibt, wo er ist.
    const moved = pcs.map((d) => (isHeld(campaign, d.of) ? d : { ...d, ...(steppedPosition(d.band, d.close, step) ?? {}) }));
    if (moved.every((d, i) => d.band === pcs[i]!.band && d.close === pcs[i]!.close)) {
      throw new DomainError(step < 0 ? 'Alle SC sind schon in Berührung.' : `Alle SC sind schon über ${ESCAPED_BAND - 1} Bands weg.`);
    }
    after = moved.reduce(withDistance, { ...encounter, npcMoved: state.moved + 1, ...(run || encounter.npcRuns ? { npcRuns: (encounter.npcRuns ?? 0) + run } : {}) });
  }
  return passRunners(withEncounter(campaign, after));
}

/** Ist dieser SC entkommen? Dann greift er nicht an und wird nicht angegriffen. NSC entkommen nie. */
export function isEscaped(campaign: Campaign, who: CharacterId): boolean {
  const encounter = currentEncounter(campaign);
  return encounter !== undefined && sideOf(campaign, who) === 'pcs' && isEscapedDistance(distanceOf(encounter, who));
}

/** Ist dieser SC bzw. NSC gerade am Zug? */
export function isTurnOf(campaign: Campaign, id: string): boolean {
  return turnOf(campaign)?.id === id;
}
