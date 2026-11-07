import { damageDice, damageRoll, distributeOn, DomainError, hitAt, needsWounding, physical, victimOf, type Campaign, type Clock, type DamageRoll, type Distribution, type PhysicalCharacteristic, type Random } from '..';

/**
 * Ein gewürfelter Schaden an einem SC, solange der Spieler ihn auf STR, DEX und END verteilt (S. 7,
 * SR 21). Flüchtig: wird zum Schadenswurf im Log, sobald alle Würfel verteilt sind.
 */
export interface Wounding {
  /** Die Stelle des Treffers im Log. */
  readonly of: number;
  readonly dice: readonly number[];
  /**
   * Je Block das Attribut, der Reihe nach. Ein Würfel ist ein Block; bringt er sein Attribut auf 0,
   * wird der Rest ein weiterer Block. Blöcke, die nur auf ein Attribut gehen können, stehen schon
   * mit drin.
   */
  readonly to: readonly PhysicalCharacteristic[];
}

/** Wie weit die Verteilung ist, mit den Wunden des SC bis jetzt. */
export function woundingState(wounding: Wounding, campaign: Campaign): Distribution {
  const who = victimOf(hitAt(campaign.log, wounding.of));
  if (!who) throw new DomainError('Ein Treffer ohne Ziel verteilt keinen Schaden.');
  return distributeOn(campaign, who, wounding.dice, wounding.to);
}

/** Die Attribute aller Blöcke, die feststehen, auch der von selbst verteilten. */
function settled(wounding: Wounding, campaign: Campaign, to: readonly PhysicalCharacteristic[]): Wounding {
  const next = { ...wounding, to };
  return { ...next, to: woundingState(next, campaign).blocks.map((b) => b.to) };
}

/** Würfelt den Schaden eines Treffers gegen einen SC, den der Spieler verteilt. */
export function startWounding(campaign: Campaign, of: number, random: Random): Wounding {
  if (!needsWounding(campaign, of)) throw new DomainError('Diesen Schaden verteilt die App.');
  return settled({ of, dice: damageDice(campaign, of, random), to: [] }, campaign, []);
}

/** Der nächste Block geht auf dieses Attribut; was danach nur noch auf eins gehen kann, gleich mit. */
export function assignWound(wounding: Wounding, campaign: Campaign, to: PhysicalCharacteristic): Wounding {
  if (!physical.includes(to)) throw new DomainError('Wunden gehen nur auf STR, DEX und END.');
  if (!woundingState(wounding, campaign).next) throw new DomainError('Alle Würfel sind verteilt.');
  return settled(wounding, campaign, [...wounding.to, to]);
}

/** Nimmt den zuletzt gewählten Block zurück, samt denen, die danach von selbst kamen. */
export function unassignWound(wounding: Wounding, campaign: Campaign): Wounding {
  let to = wounding.to;
  do {
    to = to.slice(0, -1);
  } while (to.length > 0 && woundingState({ ...wounding, to }, campaign).blocks.length > to.length);
  return { ...wounding, to };
}

/** Sind alle Würfel verteilt, wird daraus der Schadenswurf. */
export function confirmWounding(wounding: Wounding, campaign: Campaign, clock: Clock): DamageRoll {
  const state = woundingState(wounding, campaign);
  if (state.next) throw new DomainError('Erst jeden Würfel einem Attribut geben.');
  return damageRoll(campaign, wounding.of, wounding.dice, state.blocks, clock);
}
