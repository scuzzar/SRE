import { damageDice, damageRoll, DomainError, hitAt, needsWounding, physical, type Campaign, type Clock, type DamageRoll, type PhysicalCharacteristic, type Random } from '..';

/**
 * Ein gewürfelter Schaden an einem SC, solange der Spieler die Würfel auf STR, DEX und END verteilt
 * (S. 7). Flüchtig: wird zum Schadenswurf im Log, sobald jeder Würfel ein Attribut hat.
 */
export interface Wounding {
  /** Die Stelle des Treffers im Log. */
  readonly of: number;
  readonly dice: readonly number[];
  /** Je verteiltem Würfel das Attribut, der Reihe nach. */
  readonly to: readonly PhysicalCharacteristic[];
}

/** Würfelt den Schaden eines Treffers gegen einen SC, den der Spieler verteilt. */
export function startWounding(campaign: Campaign, of: number, random: Random): Wounding {
  if (!needsWounding(campaign, of)) throw new DomainError('Diesen Schaden verteilt die App.');
  return { of, dice: damageDice(campaign, of, random), to: [] };
}

/** Der nächste Würfel geht auf dieses Attribut. */
export function assignWound(wounding: Wounding, to: PhysicalCharacteristic): Wounding {
  if (!physical.includes(to)) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
  if (wounding.to.length >= wounding.dice.length) throw new DomainError('Alle Würfel sind verteilt.');
  return { ...wounding, to: [...wounding.to, to] };
}

/** Nimmt den zuletzt verteilten Würfel zurück. */
export function unassignWound(wounding: Wounding): Wounding {
  return { ...wounding, to: wounding.to.slice(0, -1) };
}

/** Sind alle Würfel verteilt, wird daraus der Schadenswurf. */
export function confirmWounding(wounding: Wounding, campaign: Campaign, clock: Clock): DamageRoll {
  hitAt(campaign.log, wounding.of);
  if (wounding.to.length !== wounding.dice.length) throw new DomainError('Erst jeden Würfel einem Attribut geben.');
  return damageRoll(campaign, wounding.of, wounding.dice, wounding.to, clock);
}
