import { z } from 'zod';
import type { Section } from './schema';

/** Eine Tabelle aus Mythic GME 2e (Elements), übersetzt. Mythic zieht zwei Begriffe daraus. */
export const MythicTableSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Name der Tabelle in Mythic, zum Nachschlagen. */
  source: z.string().min(1),
  entries: z.array(z.string().min(1)).length(100),
});

/** Die Mythic-Tabellen eines Bereichs. Gibt es den Bereich noch nicht, braucht er einen Namen und wird ein Themen-Reiter. */
export const MythicSectionSchema = z.object({
  section: z.string().min(1),
  name: z.string().min(1).optional(),
  tables: z.array(MythicTableSchema).min(1),
});

export const MythicTablesSchema = z.array(MythicSectionSchema);

/** Wie oft aus jeder Tabelle gezogen wird: zwei Begriffe, wie bei Mythic. */
export const DRAWS_PER_TABLE = 2;

/**
 * Legt je Mythic-Tabelle zwei Felder mit gleicher Beschriftung an, jedes mit eigenen Einträgen
 * (`npc.appearance.1.mythic.5`), damit jeder Eintrag zu genau einem Feld gehört.
 */
export function withMythicTables(sections: readonly Section[], tables: z.infer<typeof MythicTablesSchema>): Section[] {
  const result = sections.map((s) => ({ ...s, slots: [...s.slots] }));
  for (const group of tables) {
    let section = result.find((s) => s.id === group.section);
    if (!section) {
      if (!group.name) throw new Error(`Den Bereich ${group.section} gibt es nicht; neue Bereiche brauchen einen Namen`);
      section = { id: group.section, name: group.name, kind: 'theme', slots: [] };
      result.push(section);
    }
    for (const table of group.tables) {
      for (let n = 1; n <= DRAWS_PER_TABLE; n++) {
        const id = `${group.section}.${table.id}.${n}`;
        section.slots.push({ id, label: table.label, entries: table.entries.map((text, i) => ({ id: `${id}.mythic.${i + 1}`, text, retired: false })) });
      }
    }
  }
  return result;
}
