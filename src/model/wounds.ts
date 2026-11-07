import { activeSkills, characterOf, keepFocus, livingCharacters, type Campaign, type CharacterId, type Upp } from './campaign';
import { DomainError } from './errors';
import { physical, type AttackResult, type DamageRoll, type LogEntry, type PhysicalCharacteristic, type Recovery, type RecoveryKind } from './log';
import type { Clock, Random } from './ports';
import { currentEncounter, npcOf } from './encounter';

/** Wer kämpft: ein Charakter der Kampagne (SC) oder ein NSC einer Begegnung. */
export type Combatant = { readonly pc: CharacterId } | { readonly npc: string };

/** Wie viel STR, DEX und END jemand durch Treffer verloren hat. */
export interface Wounds {
  readonly str: number;
  readonly dex: number;
  readonly end: number;
}

export type WoundState = 'unhurt' | 'wounded' | 'unconscious' | 'serious' | 'dead';

const key = { STR: 'str', DEX: 'dex', END: 'end' } as const;

/** Trifft der Angriff diesen SC bzw. NSC? */
function hits(attack: LogEntry | undefined, who: Combatant): attack is AttackResult {
  if (attack?.kind !== 'attack') return false;
  return 'pc' in who ? attack.victim === who.pc : attack.against === who.npc;
}

/** Die Schadenswürfe gegen diesen SC bzw. NSC, in der Reihenfolge des Logs. */
export function damageAgainst(log: readonly LogEntry[], who: Combatant): readonly DamageRoll[] {
  return log.flatMap((e) => (e.kind === 'damage' && e.to !== undefined && hits(log[e.of], who) ? [e] : []));
}

export function uppOf(campaign: Campaign, who: Combatant): Upp {
  return 'pc' in who ? characterOf(campaign, who.pc).upp : npcOf(campaign, who.npc).upp;
}

/** Ein Block eines Schadenswurfs: so viele Punkte auf dieses Attribut (SR 21). */
export interface WoundBlock {
  readonly points: number;
  readonly to: PhysicalCharacteristic;
}

/** Die Blöcke eines Schadenswurfs; einer von vor dem Überlauf hat keine Punkte: je Würfel ein Block. */
export function blocksOf(roll: DamageRoll): readonly WoundBlock[] {
  if (roll.to === undefined) return [];
  return roll.to.map((to, i) => ({ to, points: roll.points ? roll.points[i]! : roll.dice[i]! }));
}

/** Wendet Blöcke auf Wunden an; ein Attribut nimmt höchstens auf, was es bis 0 noch hat. */
function apply(upp: Upp, wounds: Wounds, blocks: readonly WoundBlock[]): Wounds {
  const taken = { ...wounds };
  blocks.forEach((b) => {
    const k = key[b.to];
    taken[k] += Math.min(b.points, Math.max(0, upp[k] - taken[k]));
  });
  return taken;
}

/** Wie weit die Verteilung ist: die Blöcke bis hierher und, wenn noch etwas offen ist, der nächste. */
export interface Distribution {
  readonly blocks: readonly WoundBlock[];
  /** Der nächste Block: Würfel `die`, Rest `rest`, auf eines der Attribute über 0 (`open`). */
  readonly next?: { readonly die: number; readonly rest: number; readonly open: readonly PhysicalCharacteristic[] };
}

/**
 * Verteilt Würfel nach SR 21 in Blöcken: je gewähltem Attribut (`to`, je Block eins) so viel, wie es
 * bis 0 aufnimmt; der Rest des Würfels wird der nächste Block. Ist nur ein Attribut über 0, nimmt
 * es den Block von selbst; sind alle auf 0, verfällt der Rest. Ein Attribut auf 0 lässt sich nicht
 * wählen.
 */
export function distribute(upp: Upp, wounds: Wounds, dice: readonly number[], to: readonly PhysicalCharacteristic[]): Distribution {
  const taken = { ...wounds };
  const left = (c: PhysicalCharacteristic) => Math.max(0, upp[key[c]] - taken[key[c]]);
  const blocks: WoundBlock[] = [];
  for (let die = 0; die < dice.length; die++) {
    let rest = dice[die]!;
    while (rest > 0) {
      const open = physical.filter((c) => left(c) > 0);
      if (open.length === 0) break;
      const choice = to[blocks.length] ?? (open.length === 1 ? open[0] : undefined);
      if (choice === undefined) return { blocks, next: { die, rest, open } };
      if (!physical.includes(choice)) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
      if (!open.includes(choice)) throw new DomainError(`${choice} steht schon auf 0; der Rest geht auf ein anderes Attribut.`);
      const points = Math.min(rest, left(choice));
      taken[key[choice]] += points;
      rest -= points;
      blocks.push({ points, to: choice });
    }
  }
  if (to.length > blocks.length) throw new DomainError('Es sind schon alle Würfel verteilt.');
  return { blocks };
}

/** Die Verteilung auf diesen SC bzw. NSC mit seinen Wunden bis jetzt. */
export function distributeOn(campaign: Campaign, who: Combatant, dice: readonly number[], to: readonly PhysicalCharacteristic[]): Distribution {
  return distribute(uppOf(campaign, who), woundsOf(campaign, who), dice, to);
}

/** Gilt die Heilung diesem SC bzw. NSC? */
function heals(entry: LogEntry, who: Combatant): entry is Recovery {
  return entry.kind === 'recovery' && ('pc' in who ? entry.for === who.pc : entry.npc === who.npc);
}

/** Was Schaden und Heilung bis hierher ergeben haben. */
export interface History {
  readonly wounds: Wounds;
  /** Standen seit der letzten vollen Heilung zwei Attribute zugleich auf 0? */
  readonly serious: boolean;
  /** Kein Schaden seit der letzten vollen Heilung: Der nächste Treffer ist ein erster. */
  readonly fresh: boolean;
}

function zerosOf(upp: Upp, wounds: Wounds): number {
  const current = woundedUpp(upp, wounds);
  return [current.str, current.dex, current.end].filter((v) => v <= 0).length;
}

/** Aufwachen: bei einem Attribut auf 0 die Mitte zwischen verwundet und voll (abgerundet), bei zwei mindestens 1. */
function woken(upp: Upp, wounds: Wounds): Wounds {
  const serious = zerosOf(upp, wounds) >= 2;
  const back = (k: 'str' | 'dex' | 'end') => {
    const current = upp[k] - wounds[k];
    const after = serious ? Math.min(upp[k], Math.max(1, current)) : Math.floor((current + upp[k]) / 2);
    return upp[k] - after;
  };
  return { str: back('str'), dex: back('dex'), end: back('end') };
}

/** Schaden und Heilung im Log der Reihe nach, bis vor die Stelle `upTo`. */
export function historyOf(log: readonly LogEntry[], upp: Upp, who: Combatant, upTo = log.length): History {
  let wounds: Wounds = { str: 0, dex: 0, end: 0 };
  let serious = false;
  let fresh = true;
  log.slice(0, upTo).forEach((entry) => {
    if (entry.kind === 'damage' && entry.to !== undefined && hits(log[entry.of], who)) {
      wounds = apply(upp, wounds, blocksOf(entry));
      fresh = false;
      if (zerosOf(upp, wounds) >= 2) serious = true;
    } else if (heals(entry, who)) {
      if (entry.how === 'wake') wounds = woken(upp, wounds);
      else {
        wounds = { str: 0, dex: 0, end: 0 };
        serious = false;
        fresh = true;
      }
    }
  });
  return { wounds, serious, fresh };
}

/** `/wounds`: was Schadenswürfe und Heilungen im Log diesem SC bzw. NSC genommen bzw. gegeben haben. */
export function woundsOf(campaign: Campaign, who: Combatant): Wounds {
  return historyOf(campaign.log, uppOf(campaign, who), who).wounds;
}

/** Das UPP mit den Wunden: STR, DEX und END um das verringert, was sie verloren haben. */
export function woundedUpp(upp: Upp, wounds: Wounds): Upp {
  return { ...upp, str: upp.str - wounds.str, dex: upp.dex - wounds.dex, end: upp.end - wounds.end };
}

/** `/state`: nach der Zahl der Attribute auf 0. */
export function woundState(upp: Upp, wounds: Wounds): WoundState {
  const current = woundedUpp(upp, wounds);
  const zeros = [current.str, current.dex, current.end].filter((v) => v <= 0).length;
  if (zeros >= 3) return 'dead';
  if (zeros === 2) return 'serious';
  if (zeros === 1) return 'unconscious';
  return wounds.str + wounds.dex + wounds.end > 0 ? 'wounded' : 'unhurt';
}

export function woundStateOf(campaign: Campaign, who: Combatant): WoundState {
  return woundState(uppOf(campaign, who), woundsOf(campaign, who));
}

/** Wer bewusstlos, schwer verwundet oder tot ist, greift nicht an. */
export function canFight(state: WoundState): boolean {
  return state === 'unhurt' || state === 'wounded';
}

/** Der erste Schaden, den jemand bekommt, geht auf ein zufälliges Attribut, bis es auf 0 ist (S. 7, SR 21); nach einer vollen Heilung wieder. */
export function isFirstHit(log: readonly LogEntry[], who: Combatant): boolean {
  let fresh = true;
  for (const entry of log) {
    if (entry.kind === 'damage' && entry.to !== undefined && hits(log[entry.of], who)) fresh = false;
    else if (heals(entry, who) && entry.how !== 'wake') fresh = true;
  }
  return fresh;
}

/** Wen der Treffer an dieser Stelle trifft, wenn er ein Ziel hat. */
export function victimOf(attack: AttackResult): Combatant | undefined {
  if (attack.against !== undefined) return { npc: attack.against };
  if (attack.victim !== undefined) return { pc: attack.victim };
  return undefined;
}

/**
 * Verteilt die Würfel, wo die App es tut (SR 21): beim ersten Treffer alle Blöcke auf ein zufälliges
 * Attribut, bis es auf 0 ist, den Rest zufällig auf die anderen; bei einem NSC sonst jeden Block
 * zufällig auf ein Attribut über 0. Bei einem SC nach dem ersten Treffer wählt der Spieler; dann gibt
 * es `undefined`.
 */
export function autoWounds(campaign: Campaign, who: Combatant, dice: readonly number[], random: Random): readonly WoundBlock[] | undefined {
  const first = isFirstHit(campaign.log, who);
  if (!first && 'pc' in who) return undefined;
  const upp = uppOf(campaign, who);
  const wounds = woundsOf(campaign, who);
  const critical = first ? physical[random.int(0, 2)]! : undefined;
  let to: PhysicalCharacteristic[] = [];
  for (;;) {
    const step = distribute(upp, wounds, dice, to);
    if (!step.next) return step.blocks;
    const open = step.next.open;
    const pick = critical !== undefined && open.includes(critical) ? critical : open[random.int(0, open.length - 1)]!;
    to = [...step.blocks.map((b) => b.to), pick];
  }
}

/**
 * Prüft, dass die Verteilung zum Treffer passt: ohne Ziel keine; mit Ziel je Würfel ein Attribut
 * (vor dem Überlauf) oder Blöcke, die der Reihe nach genau die Würfel ergeben, beim letzten
 * Würfel, der einen tötet, auch weniger.
 */
export function checkWounds(log: readonly LogEntry[], roll: DamageRoll, attack: AttackResult): void {
  const who = victimOf(attack);
  if (!who) {
    if (roll.to !== undefined || roll.points !== undefined) throw new DomainError('Ein Treffer ohne Ziel verteilt keinen Schaden.');
    return;
  }
  if (roll.to === undefined) throw new DomainError('Ein Schaden mit Ziel geht auf Attribute.');
  if (roll.to.some((c) => !physical.includes(c))) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
  if (roll.points === undefined) {
    if (roll.to.length !== roll.dice.length) throw new DomainError('Ein Schaden mit Ziel geht je Würfel auf ein Attribut.');
    const earlier = log.slice(0, log.indexOf(roll) < 0 ? log.length : log.indexOf(roll));
    if (isFirstHit(earlier, who) && new Set(roll.to).size > 1) throw new DomainError('Der erste Treffer geht ganz auf ein Attribut.');
    return;
  }
  if (roll.points.length !== roll.to.length) throw new DomainError('Ein Schaden hat je Block ein Attribut und Punkte.');
  if (roll.points.some((p) => !Number.isInteger(p) || p < 1 || p > 6)) throw new DomainError('Ein Block hat 1 bis 6 Punkte.');
  let block = 0;
  for (const d of roll.dice) {
    let rest = d;
    while (rest > 0 && block < roll.points.length) {
      const points = roll.points[block]!;
      if (points > rest) throw new DomainError('Die Blöcke eines Würfels ergeben mehr als den Würfel.');
      rest -= points;
      block++;
    }
  }
  if (block < roll.points.length) throw new DomainError('Es gibt mehr Blöcke als Würfel.');
}

/** Stirbt ein SC an seinen Wunden, ist er tot; der Charakter oben rückt nach. */
export function markDeath(campaign: Campaign, who: Combatant): Campaign {
  if (!('pc' in who) || woundStateOf(campaign, who) !== 'dead') return campaign;
  const after = { ...campaign, characters: campaign.characters.map((c) => (c.id === who.pc ? { ...c, dead: true } : c)) };
  return keepFocus(campaign, after);
}

/** Was man für leichte Wunden braucht, neben Medical-1 (S. 7). */
export const MEDICAL_KIT = 'medical-kit';

/** Ob und durch wen jemand geheilt werden kann. */
export interface RecoveryOptions {
  /** Bewusstlos oder schwer verwundet: kann aufwachen. */
  readonly wake: boolean;
  /** Leicht verwundet: heilt nach 3 Tagen Ruhe. */
  readonly rest: boolean;
  /** Seit der letzten vollen Heilung schwer verwundet. */
  readonly serious: boolean;
  /** Verwundet und nicht tot: lässt sich behandeln, wenn es einen gibt, der es kann. */
  readonly treatable: boolean;
  /** Die lebenden SC und ob sie behandeln können, mit Grund, wenn nicht. */
  readonly healers: readonly { readonly id: CharacterId; readonly name: string; readonly able: boolean; readonly why?: string }[];
}

function medicalLevel(campaign: Campaign, id: CharacterId): number {
  return activeSkills(characterOf(campaign, id)).find((s) => s.of === 'medical')?.level ?? 0;
}

/** Was für diesen SC bzw. NSC an Heilung geht. */
export function recoveryOptions(campaign: Campaign, who: Combatant): RecoveryOptions {
  const history = historyOf(campaign.log, uppOf(campaign, who), who);
  const state = woundStateOf(campaign, who);
  const hurt = history.wounds.str + history.wounds.dex + history.wounds.end > 0;
  const treatable = hurt && state !== 'dead';
  const healers = livingCharacters(campaign).map((c) => {
    const level = medicalLevel(campaign, c.id);
    const awake = canFight(woundStateOf(campaign, { pc: c.id }));
    const needs = history.serious ? 3 : 1;
    const kit = history.serious || c.possessions.some((p) => p.of === MEDICAL_KIT);
    const why = !awake ? 'ist bewusstlos' : level < needs ? `braucht Medical-${needs}` : !kit ? 'braucht ein Medical Kit' : undefined;
    return { id: c.id, name: c.name, able: why === undefined, ...(why === undefined ? {} : { why }) };
  });
  return { wake: state === 'unconscious' || state === 'serious', rest: treatable && !history.serious, serious: history.serious, treatable, healers };
}

/**
 * Heilt einen SC oder NSC der laufenden Begegnung: Aufwachen, Behandlung durch einen SC (bei einer
 * schweren Wunde nur in einer medizinischen Einrichtung, 5W6 Tage) oder Ruhe (nur leichte Wunden).
 */
export function recover(campaign: Campaign, how: RecoveryKind, who: Combatant, random: Random, clock: Clock, healer?: CharacterId, facility = false): Recovery {
  if (!('pc' in who) && !currentEncounter(campaign)?.npcs.some((n) => n.id === who.npc && n.became === undefined)) {
    throw new DomainError('Heilen lassen sich NSC nur in der laufenden Begegnung.');
  }
  const options = recoveryOptions(campaign, who);
  const name = 'pc' in who ? characterOf(campaign, who.pc).name : npcOf(campaign, who.npc).name;
  const patient = 'pc' in who ? { for: who.pc } : { npc: who.npc };
  const base = { kind: 'recovery' as const, at: clock.now(), how, ...patient };
  if (how === 'wake') {
    if (!options.wake) throw new DomainError(`${name} ist nicht bewusstlos.`);
    return base;
  }
  if (!options.treatable) throw new DomainError(woundStateOf(campaign, who) === 'dead' ? `${name} ist tot.` : `${name} ist nicht verwundet.`);
  if (how === 'rest') {
    if (!options.rest) throw new DomainError('Eine schwere Wunde heilt ohne Behandlung nicht.');
    return base;
  }
  if (healer === undefined) throw new DomainError('Für die Behandlung fehlt, wer behandelt.');
  const by = options.healers.find((h) => h.id === healer);
  if (!by) throw new DomainError('Behandeln kann nur ein lebender SC.');
  if (!by.able) throw new DomainError(`${by.name} ${by.why}.`);
  if (healer === ('pc' in who ? who.pc : undefined) && !canFight(woundStateOf(campaign, who))) throw new DomainError(`${name} ist bewusstlos und behandelt sich nicht selbst.`);
  if (!options.serious) return { ...base, by: healer };
  if (!facility) throw new DomainError('Eine schwere Wunde behandelt man nur in einer medizinischen Einrichtung.');
  return { ...base, by: healer, dice: Array.from({ length: 5 }, () => random.int(1, 6)) };
}

/** `/days`: wie lange eine Behandlung einer schweren Wunde dauert. */
export function daysOf(recovery: Recovery): number | undefined {
  return recovery.dice?.reduce((sum, d) => sum + d, 0);
}

/** Prüft eine Heilung aus der Kampagnendatei: Patient genau einer, Behandlung mit Behandelndem, Tage nur bei schweren Wunden. */
export function checkRecovery(campaign: Campaign, entry: Recovery, at: number): void {
  if ((entry.for === undefined) === (entry.npc === undefined)) throw new DomainError('Eine Heilung gilt genau einem SC oder NSC.');
  const who: Combatant = entry.for !== undefined ? { pc: entry.for } : { npc: entry.npc! };
  if ('pc' in who) characterOf(campaign, who.pc);
  else npcOf(campaign, who.npc);
  if ((entry.how === 'treatment') !== (entry.by !== undefined)) throw new DomainError('Nur eine Behandlung hat einen Behandelnden.');
  if (entry.by !== undefined) characterOf(campaign, entry.by);
  const history = historyOf(campaign.log, uppOf(campaign, who), who, at);
  if (entry.how === 'treatment' && (entry.dice !== undefined) !== history.serious) throw new DomainError('Nur die Behandlung einer schweren Wunde dauert 5W6 Tage.');
  if (entry.dice !== undefined && (entry.dice.length !== 5 || entry.dice.some((d) => !Number.isInteger(d) || d < 1 || d > 6))) throw new DomainError('Die Behandlung einer schweren Wunde dauert 5W6 Tage.');
  if (entry.how === 'rest' && history.serious) throw new DomainError('Eine schwere Wunde heilt ohne Behandlung nicht.');
}
