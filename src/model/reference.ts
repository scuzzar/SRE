import { referenceData, type Entry, type Odds, type Section, type Skill, type Slot } from '../data';
import { DomainError } from './errors';

export type { Entry, ExampleCharacter, HouseRules, Odds, Section, SectionKind, Skill, Slot } from '../data';

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
    for (const entry of slot.entries) {
      entryById.set(entry.id, entry);
      slotByEntry.set(entry.id, slot);
    }
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

/** Das Feld, zu dem ein Eintrag gehört. Jeder Eintrag gehört zu genau einem Feld. */
export function slotOfEntry(entryId: string): Slot {
  return found(slotByEntry.get(entryId), 'Den Eintrag', entryId);
}

export function sectionOfSlot(slotId: string): Section {
  return found(sectionBySlot.get(slotId), 'Das Feld', slotId);
}

/** Mit dieser Stufe beginnt eine neue Kampagne: Mittel, der Standard des GMA. */
export const defaultOdds: Odds = oddsById.get('medium') ?? ref.odds[0]!;
