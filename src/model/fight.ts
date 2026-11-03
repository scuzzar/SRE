import { livingCharacters, type Campaign } from './campaign';
import { DomainError } from './errors';
import { currentEncounter, type Encounter } from './encounter';
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

/** `/turn`: wer in der laufenden Begegnung dran ist; keiner, wenn der Kampf entschieden ist. */
export function turnOf(campaign: Campaign): FightSlot | undefined {
  const encounter = currentEncounter(campaign);
  if (!encounter || defeatedSide(campaign, encounter)) return undefined;
  return waiting(campaign, encounter)[0];
}

function withEncounter(campaign: Campaign, encounter: Encounter): Campaign {
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? encounter : e)) };
}

/**
 * Beendet den Zug dessen, der dran ist (nach dem Angriff, Nachladen oder Aussetzen). Ist danach in
 * dieser Runde keiner mehr dran, beginnt die nächste.
 */
export function endTurn(campaign: Campaign): Campaign {
  const encounter = currentEncounter(campaign);
  const turn = turnOf(campaign);
  if (!encounter || !turn) throw new DomainError('Es ist keiner am Zug.');
  let after: Encounter = { ...encounter, acted: [...encounter.acted, turn.id] };
  if (waiting(campaign, after).length === 0) after = { ...after, round: after.round + 1, acted: [] };
  return withEncounter(campaign, after);
}

/** Ist dieser SC bzw. NSC gerade am Zug? */
export function isTurnOf(campaign: Campaign, id: string): boolean {
  return turnOf(campaign)?.id === id;
}
