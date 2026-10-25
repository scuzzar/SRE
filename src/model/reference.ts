import { referenceData, type Aging, type Cascade, type Entry, type Gain, type Item, type Odds, type Section, type Service, type Skill, type Slot, type Table } from '../data';
import { DomainError } from './errors';

export type { Aging, Cascade, Column, Entry, ExampleCharacter, Gain, HouseRules, Item, ItemKind, Odds, Rank, Section, SectionKind, Service, Skill, Slot, Table, Throw } from '../data';

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
const serviceById = new Map(ref.services.map((s) => [s.id, s]));
const cascadeById = new Map(ref.cascades.map((c) => [c.id, c]));
const agingById = new Map(ref.aging.map((a) => [a.id, a]));
const tableById = new Map<string, Table>();
const serviceByTable = new Map<string, Service>();
const gainById = new Map<string, Gain>();
for (const service of ref.services) {
  for (const table of [...service.skills, service.benefits, service.cash]) {
    tableById.set(table.id, table);
    serviceByTable.set(table.id, service);
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

export function agingOf(id: string): Aging {
  return found(agingById.get(id), 'Die Zeile der Aging Table', id);
}

export function tableOf(id: string): Table {
  return found(tableById.get(id), 'Die Tabelle', id);
}

/** Die Laufbahn, zu der eine Tabelle gehört. */
export function serviceOfTable(id: string): Service {
  return found(serviceByTable.get(id), 'Die Tabelle', id);
}

/** Eine Zeile einer Tabelle. */
export function gainOf(id: string): Gain {
  return found(gainById.get(id), 'Die Zeile', id);
}

/** Die Waffe, die eine Fertigkeit nutzt; für jede Waffe aus Blade und Gun Combat gibt es genau eine. */
export function weaponFor(skill: string): Item {
  return found(ref.items.find((i) => i.kind === 'weapon' && i.uses === skill), 'Die Waffe für', skill);
}
