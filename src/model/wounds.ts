import { characterOf, keepFocus, type Campaign, type CharacterId, type Upp } from './campaign';
import { DomainError } from './errors';
import { physical, type AttackResult, type DamageRoll, type LogEntry, type PhysicalCharacteristic } from './log';
import type { Random } from './ports';
import { npcOf } from './encounter';

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

/** Wendet Würfel auf Wunden an: jeder Würfel ganz auf sein Attribut, was über 0 hinausgeht, verfällt. */
function apply(upp: Upp, wounds: Wounds, dice: readonly number[], to: readonly PhysicalCharacteristic[]): Wounds {
  const taken = { ...wounds };
  dice.forEach((d, i) => {
    const k = key[to[i]!];
    taken[k] += Math.min(d, Math.max(0, upp[k] - taken[k]));
  });
  return taken;
}

/** `/wounds`: was die Schadenswürfe im Log diesem SC bzw. NSC genommen haben. */
export function woundsOf(campaign: Campaign, who: Combatant): Wounds {
  const upp = uppOf(campaign, who);
  return damageAgainst(campaign.log, who).reduce((w, roll) => apply(upp, w, roll.dice, roll.to!), { str: 0, dex: 0, end: 0 });
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

/** Der erste Schaden, den jemand bekommt, geht ganz auf ein zufälliges Attribut (S. 7). */
export function isFirstHit(log: readonly LogEntry[], who: Combatant): boolean {
  return damageAgainst(log, who).length === 0;
}

/** Wen der Treffer an dieser Stelle trifft, wenn er ein Ziel hat. */
export function victimOf(attack: AttackResult): Combatant | undefined {
  if (attack.against !== undefined) return { npc: attack.against };
  if (attack.victim !== undefined) return { pc: attack.victim };
  return undefined;
}

/**
 * Verteilt die Würfel, wo die App es tut: beim ersten Treffer alles auf ein zufälliges Attribut, bei
 * einem NSC sonst jeden Würfel zufällig auf ein Attribut über 0. Bei einem SC nach dem ersten
 * Treffer wählt der Spieler; dann gibt es `undefined`.
 */
export function autoWounds(campaign: Campaign, who: Combatant, dice: readonly number[], random: Random): readonly PhysicalCharacteristic[] | undefined {
  if (isFirstHit(campaign.log, who)) {
    const one = physical[random.int(0, 2)]!;
    return dice.map(() => one);
  }
  if ('pc' in who) return undefined;
  const upp = uppOf(campaign, who);
  let wounds = woundsOf(campaign, who);
  return dice.map((d) => {
    const current = woundedUpp(upp, wounds);
    const open = physical.filter((c) => current[key[c]] > 0);
    const to = (open.length > 0 ? open : physical)[random.int(0, (open.length > 0 ? open : physical).length - 1)]!;
    wounds = apply(upp, wounds, [d], [to]);
    return to;
  });
}

/** Prüft, dass die Verteilung zum Treffer passt: je Würfel ein Attribut, beim ersten Treffer alle gleich. */
export function checkWounds(log: readonly LogEntry[], roll: DamageRoll, attack: AttackResult): void {
  const who = victimOf(attack);
  if (!who) {
    if (roll.to !== undefined) throw new DomainError('Ein Treffer ohne Ziel verteilt keinen Schaden.');
    return;
  }
  if (roll.to === undefined || roll.to.length !== roll.dice.length) throw new DomainError('Ein Schaden mit Ziel geht je Würfel auf ein Attribut.');
  if (roll.to.some((c) => !physical.includes(c))) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
  const earlier = log.slice(0, log.indexOf(roll) < 0 ? log.length : log.indexOf(roll));
  if (isFirstHit(earlier, who) && new Set(roll.to).size > 1) throw new DomainError('Der erste Treffer geht ganz auf ein Attribut.');
}

/** Stirbt ein SC an seinen Wunden, ist er tot; der Charakter oben rückt nach. */
export function markDeath(campaign: Campaign, who: Combatant): Campaign {
  if (!('pc' in who) || woundStateOf(campaign, who) !== 'dead') return campaign;
  const after = { ...campaign, characters: campaign.characters.map((c) => (c.id === who.pc ? { ...c, dead: true } : c)) };
  return keepFocus(campaign, after);
}
