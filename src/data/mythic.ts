import { z } from 'zod';
import type { Section } from './schema';

const words = z.array(z.string().min(1)).length(100);

/**
 * Eine Bedeutungstabelle aus Mythic GME 2e, übersetzt. Actions und Descriptions haben zwei Spalten
 * (`entries`, `entries2`); aus einer Elements-Tabelle mit einer Spalte zieht Mythic zweimal.
 */
export const MythicTableSchema = z.object({
  /** Anfang der Ids ihrer Einträge (`npc.appearance`). Steht im Log und ändert sich nie, auch wenn die Tabelle umzieht. */
  id: z.string().min(1),
  label: z.string().min(1),
  /** Name der Tabelle in Mythic, zum Nachschlagen. */
  source: z.string().min(1),
  /** Nicht mehr auf der Karte; die Einträge bleiben für alte Logeinträge. */
  retired: z.boolean().default(false),
  entries: words,
  entries2: words.optional(),
});

/** Die Mythic-Tabellen eines Bereichs. Gibt es den Bereich noch nicht, braucht er einen Namen und wird eine Themen-Tafel. */
export const MythicSectionSchema = z.object({
  section: z.string().min(1),
  name: z.string().min(1).optional(),
  tables: z.array(MythicTableSchema).min(1),
});

export const MythicTablesSchema = z.array(MythicSectionSchema);

/**
 * Legt je Mythic-Tabelle ein Feld mit zwei Spalten an (`mythic.npc.appearance`), damit die Karte ein
 * Paar zieht. Hat die Tabelle nur eine Spalte, bekommen beide Spalten ihren Inhalt, jede mit eigenen
 * Einträgen (`npc.appearance.1.mythic.5`, `npc.appearance.2.mythic.5`). Ein neuer Bereich kommt
 * direkt hinter den Bereich der Tabellen davor.
 */
export function withMythicTables(sections: readonly Section[], tables: z.infer<typeof MythicTablesSchema>): Section[] {
  const result = sections.map((s) => ({ ...s, slots: [...s.slots] }));
  let previous = -1;
  for (const group of tables) {
    let index = result.findIndex((s) => s.id === group.section);
    if (index < 0) {
      if (!group.name) throw new Error(`Den Bereich ${group.section} gibt es nicht; neue Bereiche brauchen einen Namen`);
      index = previous + 1;
      result.splice(index, 0, { id: group.section, name: group.name, kind: 'theme', slots: [] });
    }
    previous = index;
    const section = result[index]!;
    for (const table of group.tables) {
      const columns = [table.entries, table.entries2 ?? table.entries].map((texts, c) => ({
        entries: texts.map((text, i) => ({ id: `${table.id}.${c + 1}.mythic.${i + 1}`, text, retired: table.retired })),
      }));
      section.slots.push({ id: `mythic.${table.id}`, label: table.label, columns });
    }
  }
  return result;
}
