import { anyCharacterOf, armedWeaponsOf, isCampaignCharacter, livingCharacters, setWields, type Campaign, type CharacterId } from './campaign';
import { ammoOf, reload } from './combat';
import { DomainError } from './errors';
import { currentEncounter, moveBand, needsSurprise, type Encounter } from './encounter';
import { canFight, woundStateOf } from './wounds';

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

/** Höchstens so viele Bands bewegt sich eine Partei je Runde: 1 gehend, 2 laufend (Charts S. 7, Book 1). */
export const MAX_MOVE = 2;

/** Wie viele Bands die Partei in der gespeicherten Runde schon gegangen ist. */
function movedIn(encounter: Encounter, side: Side): number {
  return (side === 'pcs' ? encounter.pcMoved : encounter.npcMoved) ?? 0;
}

/** Die Begegnung in der nächsten Runde: Runde + 1, keiner war dran, keiner ist gegangen. */
function nextRound(encounter: Encounter): Encounter {
  const rest = Object.fromEntries(Object.entries(encounter).filter(([key]) => key !== 'pcMoved' && key !== 'npcMoved')) as unknown as Encounter;
  return { ...rest, round: encounter.round + 1, acted: [] };
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
 * Beendet den Zug dessen, der dran ist (nach dem Angriff, Nachladen oder Aussetzen). Ist danach in
 * dieser Runde keiner mehr dran, beginnt die nächste. Ist der Nächste aus einer Partei, die gelaufen
 * ist, zieht er von selbst (siehe `passRunners`).
 */
export function endTurn(campaign: Campaign): Campaign {
  return passRunners(finishTurn(campaign));
}

/** Beendet nur den Zug dessen, der dran ist, ohne die Läufer weiterzuziehen. */
function finishTurn(campaign: Campaign): Campaign {
  const running = currentEncounter(campaign);
  const turn = turnOf(campaign);
  if (!running || !turn) throw new DomainError('Es ist keiner am Zug.');
  const encounter = fightState(campaign, running);
  let after: Encounter = { ...encounter, acted: [...encounter.acted, turn.id] };
  if (waiting(campaign, after).length === 0) after = nextRound(after);
  return withEncounter(campaign, after);
}

/**
 * Die leere Waffe (Primär, dann Sekundär; 0 Schuss geladen), die dieser Kämpfer mit einem Magazin
 * aus seinem Besitz nachladen kann; sonst `undefined`.
 */
export function reloadableWeapon(campaign: Campaign, id: CharacterId): string | undefined {
  const character = anyCharacterOf(campaign, id);
  return armedWeaponsOf(character).find((weapon) => {
    const ammo = ammoOf({ ...character, wields: weapon });
    return ammo !== undefined && ammo.rounds === 0 && ammo.magazines > 0;
  });
}

/**
 * Wer läuft, greift nicht an: Ist der Kämpfer am Zug aus einer Partei, die in dieser Runde gelaufen
 * ist, zieht er von selbst. Ein NSC mit leerer Waffe und Magazin lädt nach, jeder andere setzt aus;
 * so weiter, bis einer der anderen Partei dran ist oder die Runde endet. Nur ein SC, der nachladen
 * könnte, bleibt am Zug und wählt selbst.
 */
function passRunners(campaign: Campaign): Campaign {
  let current = campaign;
  for (let turn = turnOf(current); turn && hasRun(current, turn.side); turn = turnOf(current)) {
    const weapon = reloadableWeapon(current, turn.id);
    if (weapon !== undefined && turn.side === 'pcs') return current;
    if (weapon !== undefined) current = reload(setWields(current, turn.id, weapon), turn.id);
    current = finishTurn(current);
  }
  return current;
}

/** Wie weit sich eine Partei in der Runde, die gerade gilt, bewegen kann. */
export interface MoveState {
  readonly side: Side;
  /** Schon gegangene Bands in dieser Runde. */
  readonly moved: number;
  /** Geht noch ein Band? Sonst steht in `reason`, warum nicht. */
  readonly can: boolean;
  readonly reason: string | undefined;
  /** Die Partei ist gelaufen (2 Bands): Ihre Kämpfer greifen in dieser Runde nicht an. */
  readonly ran: boolean;
}

const sideLabel = { pcs: 'SC', npcs: 'NSC' } as const;

/** Bands, die eine Partei in der Runde, die gerade gilt, gegangen ist. */
export function movedOf(campaign: Campaign, side: Side): number {
  const encounter = currentEncounter(campaign);
  return encounter ? movedIn(fightState(campaign, encounter), side) : 0;
}

/** Ist die Partei in dieser Runde gelaufen? Dann greifen ihre Kämpfer nicht an. */
export function hasRun(campaign: Campaign, side: Side): boolean {
  return movedOf(campaign, side) >= MAX_MOVE;
}

/**
 * Wie weit sich die Partei dessen bewegen kann, der am Zug ist: gehen 1 Band, laufen ein zweites,
 * solange noch keiner von ihr in dieser Runde dran war. `undefined`, wenn keiner am Zug ist.
 */
export function moveState(campaign: Campaign): MoveState | undefined {
  const running = currentEncounter(campaign);
  const turn = turnOf(campaign);
  if (!running || !turn) return undefined;
  const encounter = fightState(campaign, running);
  const moved = movedIn(encounter, turn.side);
  const someoneActed = fightOrder(campaign, encounter).some((s) => s.side === turn.side && encounter.acted.includes(s.id));
  const who = `Die ${sideLabel[turn.side]}`;
  const reason =
    moved >= MAX_MOVE
      ? `${who} sind in dieser Runde schon gelaufen (2 Bands).`
      : moved === 1 && someoneActed
        ? `${who} sind schon gegangen; laufen (ein zweites Band) geht nur, bevor einer von ihnen dran war.`
        : undefined;
  return { side: turn.side, moved, can: reason === undefined, reason, ran: moved >= MAX_MOVE };
}

/**
 * Die Partei dessen, der am Zug ist, geht ein Band näher (−1) oder weiter weg (+1). Das ist kein
 * Zug; das zweite Band in einer Runde ist Laufen, danach greift die Partei in dieser Runde nicht an:
 * Ihre Kämpfer ziehen von selbst (siehe `passRunners`).
 */
export function moveSide(campaign: Campaign, step: -1 | 1): Campaign {
  const state = moveState(campaign);
  if (!state) throw new DomainError('Bewegen kann nur die Partei, die am Zug ist.');
  if (!state.can) throw new DomainError(state.reason!);
  const encounter = fightState(campaign, currentEncounter(campaign)!);
  const moved = moveBand(withEncounter(campaign, encounter), step);
  const after = currentEncounter(moved)!;
  // Das zweite Band ist ein Lauf: Er kostet jeden Kämpfer der Partei einen Combat-Schlag (SR 20).
  const run = state.moved + 1 >= MAX_MOVE ? 1 : 0;
  return passRunners(
    withEncounter(
      moved,
      state.side === 'pcs' ? { ...after, pcMoved: state.moved + 1, pcRuns: (after.pcRuns ?? 0) + run } : { ...after, npcMoved: state.moved + 1, npcRuns: (after.npcRuns ?? 0) + run },
    ),
  );
}

/** Ist dieser SC bzw. NSC gerade am Zug? */
export function isTurnOf(campaign: Campaign, id: string): boolean {
  return turnOf(campaign)?.id === id;
}
