import { livingCharacters, type Campaign, type CharacterId } from './campaign';
import { animalEventOf, eventRowOf } from './animals';
import { DomainError } from './errors';
import { damageAfterOf, savesOf, type DamageRoll, type EventResult, type LogEntry, type SaveRoll } from './log';
import type { Clock, Random } from './ports';
import type { AnimalEvent } from './reference';
import { autoWounds, checkWoundsOn, markDeath, woundedUpp, woundsOf } from './wounds';

/** Das Ereignis eines Ereignis-Eintrags. */
export function eventOf(campaign: Campaign, entry: EventResult): AnimalEvent {
  return animalEventOf(eventRowOf(campaign.hexes, entry).event!);
}

/** Der Ereignis-Eintrag an der Stelle `index`. */
export function eventEntryAt(log: readonly LogEntry[], index: number): EventResult {
  const entry = log[index];
  if (entry?.kind !== 'event') throw new DomainError('An dieser Stelle steht kein Ereignis.');
  return entry;
}

/** Würfelt man beim Rettungswurf höchstens ein Attribut (DEX, STR, END)? Sonst mindestens den Zielwert („8+“). */
export function savesUnder(event: AnimalEvent): boolean {
  return event.save !== undefined && /^[A-Z]+$/.test(event.save);
}

/** `/success` eines Rettungswurfs: allein aus Würfeln und festgehaltenem Zielwert, nach der Art des Ereignisses. */
export function saveSucceeds(campaign: Campaign, save: SaveRoll): boolean {
  const event = eventOf(campaign, eventEntryAt(campaign.log, save.of));
  const total = save.dice[0] + save.dice[1];
  return savesUnder(event) ? total <= save.target : total >= save.target;
}

/** Der Zielwert eines SC für den Rettungswurf: bei „8+“ die Zahl, bei einem Attribut dessen heutiger Wert mit Wunden. */
function saveTarget(campaign: Campaign, event: AnimalEvent, who: CharacterId): number {
  const save = event.save!;
  if (!savesUnder(event)) return Number(save.replace('+', ''));
  const character = campaign.characters.find((c) => c.id === who)!;
  const upp = woundedUpp(character.upp, woundsOf(campaign, who));
  return upp[save.toLowerCase() as 'str' | 'dex' | 'end'];
}

/**
 * Die Rettungswürfe gegen das Ereignis an der Stelle `index` (SR 49): je lebendem SC 2W6 gegen seinen
 * Zielwert; wer ihn nicht schafft, bekommt den Schaden des Ereignisses (W6), den die App verteilt.
 * Je Ereignis nur einmal.
 */
export function rollEventSaves(campaign: Campaign, index: number, random: Random, clock: Clock): Campaign {
  const entry = eventEntryAt(campaign.log, index);
  const event = eventOf(campaign, entry);
  if (event.save === undefined || event.damage === undefined) throw new DomainError(`${event.name} hat keinen Rettungswurf.`);
  if (savesOf(campaign.log, index).length > 0) throw new DomainError(`Die Rettungswürfe gegen ${event.name} sind schon gewürfelt.`);
  let current = campaign;
  for (const pc of livingCharacters(campaign)) {
    const save: SaveRoll = { kind: 'save', at: clock.now(), for: pc.id, of: index, dice: [random.int(1, 6), random.int(1, 6)], target: saveTarget(current, event, pc.id) };
    current = { ...current, log: [...current.log, save] };
    if (saveSucceeds(current, save)) continue;
    const after = current.log.length - 1;
    const dice = Array.from({ length: event.damage }, () => random.int(1, 6));
    const blocks = autoWounds(current, pc.id, dice, random, true) ?? [];
    const damage: DamageRoll = { kind: 'damage', at: clock.now(), after, dice, to: blocks.map((b) => b.to), points: blocks.map((b) => b.points) };
    current = markDeath({ ...current, log: [...current.log, damage] }, pc.id);
  }
  return current;
}

/** Prüft einen Rettungswurf an der Stelle `at`: nach einem Ereignis mit Rettungswurf, für einen SC, je SC einmal. */
export function checkSave(campaign: Campaign, save: SaveRoll, at: number): void {
  if (!Number.isInteger(save.of) || save.of < 0 || save.of >= at) throw new DomainError('Ein Rettungswurf verweist auf keinen früheren Eintrag.');
  const event = eventOf(campaign, eventEntryAt(campaign.log, save.of));
  if (event.save === undefined) throw new DomainError(`${event.name} hat keinen Rettungswurf.`);
  if (!campaign.characters.some((c) => c.id === save.for)) throw new DomainError(`Ein Rettungswurf gilt einem SC, nicht ${save.for}.`);
  if (savesOf(campaign.log, save.of).some((i) => i !== at && (campaign.log[i] as SaveRoll).for === save.for)) throw new DomainError('Ein SC würfelt gegen ein Ereignis nur einmal.');
}

/** Prüft den Schaden nach einem Rettungswurf an der Stelle `at`: Der Wurf misslang, die Würfel passen zum Ereignis. */
export function checkEventDamage(campaign: Campaign, roll: DamageRoll, at: number): void {
  const index = roll.after;
  const save = index === undefined ? undefined : campaign.log[index];
  if (index === undefined || index >= at || save?.kind !== 'save') throw new DomainError('Ein Schaden aus einem Ereignis kommt nach einem Rettungswurf.');
  if (saveSucceeds(campaign, save)) throw new DomainError('Wer den Rettungswurf schafft, bekommt keinen Schaden.');
  if (damageAfterOf(campaign.log, index).some((i) => i !== at)) throw new DomainError('Für diesen Rettungswurf ist der Schaden schon gewürfelt.');
  const event = eventOf(campaign, eventEntryAt(campaign.log, save.of));
  if (roll.dice.length !== event.damage) throw new DomainError(`Der Schaden von ${event.name} sind ${event.damage}W6.`);
  checkWoundsOn(campaign.log.slice(0, at), roll, save.for);
}
