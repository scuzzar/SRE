import { z } from 'zod';
import type { Section } from './schema';

const words = z.array(z.string().min(1)).length(100);

/**
 * Eine Bedeutungstabelle aus Mythic GME 2e, übersetzt. Actions und Descriptions haben zwei Spalten
 * (`entries`, `entries2`); aus einer Elements-Tabelle mit einer Spalte zieht Mythic zweimal.
 */
export const MythicTableSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  /** Name der Tabelle in Mythic, zum Nachschlagen. */
  source: z.string().min(1),
  entries: words,
  entries2: words.optional(),
});

/** Die Mythic-Tabellen eines Bereichs. Gibt es den Bereich noch nicht, braucht er einen Namen und wird ein Themen-Reiter. */
export const MythicSectionSchema = z.object({
  section: z.string().min(1),
  name: z.string().min(1).optional(),
  tables: z.array(MythicTableSchema).min(1),
});

export const MythicTablesSchema = z.array(MythicSectionSchema);

/**
 * Legt je Mythic-Tabelle ein Feld mit zwei Spalten an (`npc.mythic.appearance`), damit die Karte ein
 * Paar zieht. Hat die Tabelle nur eine Spalte, bekommen beide Spalten ihren Inhalt, jede mit eigenen
 * Einträgen (`npc.appearance.1.mythic.5`, `npc.appearance.2.mythic.5`). Diese Ids stehen im Log und
 * bleiben, wie sie sind; die Ids der Felder speichert niemand.
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
      const prefix = `${group.section}.${table.id}`;
      const columns = [table.entries, table.entries2 ?? table.entries].map((texts, c) => ({
        entries: texts.map((text, i) => ({ id: `${prefix}.${c + 1}.mythic.${i + 1}`, text, retired: false })),
      }));
      section.slots.push({ id: `${group.section}.mythic.${table.id}`, label: table.label, columns });
    }
  }
  return result;
}
