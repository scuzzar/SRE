import { referenceData, type Cascade, type Entry, type Gain, type Item, type Odds, type Section, type Service, type Skill, type Slot, type Table, type Weapon, type EncounterType, type Patron } from '../data';
import { DomainError } from './errors';

export { nameSlotIds, nameSounds, type NameSound } from '../data';
export { armorClasses, itemKinds, ranges } from '../data';
export type {
  Aging,
  ArmorClass,
  AttackKind,
  Cascade,
  Column,
  EncounterType,
  Entry,
  Patron,
  ExampleCharacter,
  Gain,
  HouseRules,
  Item,
  ItemKind,
  Odds,
  Range,
  Rank,
  Section,
  SectionKind,
  Service,
  Skill,
  Slot,
  Table,
  Throw,
  Weapon,
} from '../data';

/** Die Referenzdaten: feste Tabellen, in jeder Kampagne gleich. */
export const ref = referenceData;

const oddsById = new Map(ref.odds.map((o) => [o.id, o]));
const skillById = new Map(ref.skills.map((s) => [s.id, s]));
const slotById = new Map<string, Slot>();
const sectionBySlot = new Map<string, Section>();
const entryById = new Map<string, Entry>();
const slotByEntry = new Map<string, Slot>();
for (const section of ref.sections) {
  for (const slot of section.slots) {
    slotById.set(slot.id, slot);
    sectionBySlot.set(slot.id, section);
    for (const entry of slot.columns.flatMap((c) => c.entries)) {
      entryById.set(entry.id, entry);
      slotByEntry.set(entry.id, slot);
    }
  }
}

const itemById = new Map(ref.items.map((i) => [i.id, i]));
const weaponById = new Map(ref.weapons.map((w) => [w.id, w]));
const itemByWeapon = new Map(ref.items.flatMap((i) => (i.weapon === undefined ? [] : [[i.weapon, i] as const])));
const serviceById = new Map(ref.services.map((s) => [s.id, s]));
const cascadeById = new Map(ref.cascades.map((c) => [c.id, c]));
const tableById = new Map<string, Table>();
const gainById = new Map<string, Gain>();
for (const service of ref.services) {
  for (const table of [...service.skills, service.benefits, service.cash]) {
    tableById.set(table.id, table);
    for (const gain of table.rows) gainById.set(gain.id, gain);
  }
}

function found<T>(value: T | undefined, what: string, id: string): T {
  if (value === undefined) throw new DomainError(`${what} ${id} gibt es nicht`);
  return value;
}

export function oddsOf(id: string): Odds {
  return found(oddsById.get(id), 'Die Stufe', id);
}

export function skillOf(id: string): Skill {
  return found(skillById.get(id), 'Die Fertigkeit', id);
}

export function entryOf(id: string): Entry {
  return found(entryById.get(id), 'Den Eintrag', id);
}

/** Das Feld, zu dem ein Eintrag gehört. Jeder Eintrag gehört zu genau einer Spalte, jede Spalte zu genau einem Feld. */
export function slotOfEntry(entryId: string): Slot {
  return found(slotByEntry.get(entryId), 'Den Eintrag', entryId);
}

export function slotWithId(id: string): Slot {
  return found(slotById.get(id), 'Das Feld', id);
}

export function sectionOfSlot(slotId: string): Section {
  return found(sectionBySlot.get(slotId), 'Das Feld', slotId);
}

/** Mit dieser Stufe beginnt eine neue Kampagne: Mittel, der Standard des GMA. */
export const defaultOdds: Odds = oddsById.get('medium') ?? ref.odds[0]!;

export function itemOf(id: string): Item {
  return found(itemById.get(id), 'Den Gegenstand', id);
}

export function serviceOf(id: string): Service {
  return found(serviceById.get(id), 'Die Laufbahn', id);
}

export function cascadeOf(id: string): Cascade {
  return found(cascadeById.get(id), 'Die Kaskade', id);
}

export function tableOf(id: string): Table {
  return found(tableById.get(id), 'Die Tabelle', id);
}

/** Eine Zeile einer Tabelle. */
export function gainOf(id: string): Gain {
  return found(gainById.get(id), 'Die Zeile', id);
}

export function weaponOf(id: string): Weapon {
  return found(weaponById.get(id), 'Die Waffe', id);
}

/** Die Hände: die Waffe, die jeder hat und die zu keinem Gegenstand gehört. */
export const HANDS = 'hands';

/** Der Gegenstand, zu dem eine Waffe gehört; die Hände gehören zu keinem. */
export function itemOfWeapon(weapon: string): Item | undefined {
  return itemByWeapon.get(weapon);
}

/** `Item./uses`: die Fertigkeit eines Gegenstands, aus seiner Waffe. */
export function usesOf(item: Item): string | undefined {
  return item.weapon === undefined ? undefined : weaponOf(item.weapon).uses;
}

/** Der Gegenstand, dessen Waffe eine Fertigkeit nutzt; für jede Waffe aus Blade und Gun Combat gibt es genau einen. */
export function weaponFor(skill: string): Item {
  return found(ref.items.find((i) => usesOf(i) === skill), 'Die Waffe für', skill);
}

const encounterTypeByRoll = new Map(ref.encounters.types.map((t) => [t.roll, t]));

/** Die Art einer Begegnung zu einem Wurf 11–66; die Zeilen 61–66 sind leer. */
export function encounterTypeOf(roll: number): EncounterType | undefined {
  return encounterTypeByRoll.get(roll);
}

/** Die Zeile einer Patron-Liste (1 oder 2) zu einem Wurf 11–66. */
export function patronOf(list: number, roll: number): Patron {
  return found(ref.encounters.patrons.find((p) => p.list === list && p.roll === roll), 'Der Patron', `${list}-${roll}`);
}

/** Der Text der Reactions-Tabelle zu 2 bis 12. */
export function reactionText(roll: number): string {
  return found(ref.encounters.reactions.find((r) => r.roll === roll), 'Die Reaktion', String(roll)).text;
}
