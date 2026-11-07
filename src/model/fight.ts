import { livingCharacters, type Campaign } from './campaign';
import { DomainError } from './errors';
import { currentEncounter, moveBand, type Encounter } from './encounter';
import { canFight, woundStateOf, type Combatant } from './wounds';

/** Die beiden Parteien eines Kampfs: die SC und die NSC der Begegnung. */
export type Side = 'pcs' | 'npcs';

/** `/surprise`: Wer 3 oder mehr über der anderen Partei liegt, hat Überraschung (S. 5). */
export function surpriseOf(encounter: Encounter): Side | undefined {
  if (!encounter.pcSurprise || !encounter.npcSurprise) return undefined;
  const pcs = encounter.pcSurprise.die + encounter.pcSurprise.dm;
  const npcs = encounter.npcSurprise.die + encounter.npcSurprise.dm;
  if (pcs - npcs >= 3) return 'pcs';
  if (npcs - pcs >= 3) return 'npcs';
  return undefined;
}

/** `/first`: Die Partei mit dem höheren Überraschungswurf zieht jede Runde zuerst; bei Gleichstand die SC. */
export function firstSide(encounter: Encounter): Side {
  if (!encounter.pcSurprise || !encounter.npcSurprise) return 'pcs';
  return encounter.npcSurprise.die + encounter.npcSurprise.dm > encounter.pcSurprise.die + encounter.pcSurprise.dm ? 'npcs' : 'pcs';
}

/** Ein Kämpfer der Simulation mit seiner Id (SC `c…`, NSC `n…`) und Partei. */
export interface FightSlot {
  readonly id: string;
  readonly side: Side;
  readonly who: Combatant;
}

/** Alle Kämpfer in Zugreihenfolge: erst die Partei, die zuerst zieht, dann die andere. */
export function fightOrder(campaign: Campaign, encounter: Encounter): readonly FightSlot[] {
  const pcs: FightSlot[] = livingCharacters(campaign).map((c) => ({ id: c.id, side: 'pcs', who: { pc: c.id } }));
  const npcs: FightSlot[] = encounter.npcs.filter((n) => n.became === undefined).map((n) => ({ id: n.id, side: 'npcs', who: { npc: n.id } }));
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
    if (members.length === 0 || members.every((s) => !canFight(woundStateOf(campaign, s.who)))) return side;
  }
  return undefined;
}

/** Wer in dieser Runde noch dran ist, in Zugreihenfolge; in Runde 1 mit Überraschung nur deren Partei. */
function waiting(campaign: Campaign, encounter: Encounter): readonly FightSlot[] {
  const surprise = encounter.round === 1 ? surpriseOf(encounter) : undefined;
  return fightOrder(campaign, encounter).filter(
    (s) => (surprise === undefined || s.side === surprise) && !encounter.acted.includes(s.id) && canFight(woundStateOf(campaign, s.who)),
  );
}

/**
 * Die Begegnung mit der Runde, die gerade gilt: Ist in der gespeicherten Runde keiner mehr dran (etwa
 * weil der Letzte außerhalb seines Zugs übernommen oder ausgeblendet wurde), gilt schon die nächste.
 */
export function fightState(campaign: Campaign, encounter: Encounter): Encounter {
  if (defeatedSide(campaign, encounter) || waiting(campaign, encounter).length > 0) return encounter;
  return nextRound(encounter);
}

/** `/turn`: wer in der laufenden Begegnung dran ist; keiner, wenn der Kampf entschieden ist. */
export function turnOf(campaign: Campaign): FightSlot | undefined {
  const encounter = currentEncounter(campaign);
  if (!encounter || defeatedSide(campaign, encounter)) return undefined;
  return waiting(campaign, fightState(campaign, encounter))[0];
}

function withEncounter(campaign: Campaign, encounter: Encounter): Campaign {
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? encounter : e)) };
}

/**
 * Beendet den Zug dessen, der dran ist (nach dem Angriff, Nachladen oder Aussetzen). Ist danach in
 * dieser Runde keiner mehr dran, beginnt die nächste.
 */
export function endTurn(campaign: Campaign): Campaign {
  const running = currentEncounter(campaign);
  const turn = turnOf(campaign);
  if (!running || !turn) throw new DomainError('Es ist keiner am Zug.');
  const encounter = fightState(campaign, running);
  let after: Encounter = { ...encounter, acted: [...encounter.acted, turn.id] };
  if (waiting(campaign, after).length === 0) after = nextRound(after);
  return withEncounter(campaign, after);
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
 * Zug; das zweite Band in einer Runde ist Laufen, danach greift die Partei in dieser Runde nicht an.
 */
export function moveSide(campaign: Campaign, step: -1 | 1): Campaign {
  const state = moveState(campaign);
  if (!state) throw new DomainError('Bewegen kann nur die Partei, die am Zug ist.');
  if (!state.can) throw new DomainError(state.reason!);
  const encounter = fightState(campaign, currentEncounter(campaign)!);
  const moved = moveBand(withEncounter(campaign, encounter), step);
  const after = currentEncounter(moved)!;
  return withEncounter(moved, state.side === 'pcs' ? { ...after, pcMoved: state.moved + 1 } : { ...after, npcMoved: state.moved + 1 });
}

/** Ist dieser SC bzw. NSC gerade am Zug? */
export function isTurnOf(campaign: Campaign, id: string): boolean {
  return turnOf(campaign)?.id === id;
}
