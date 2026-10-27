import { z } from 'zod';
import type { Section } from './schema';

const names = z.array(z.string().min(1)).min(1);

/** Eigene Namen fürs Third Imperium: Vornamen je Namensfeld, Nachnamen für alle gemeinsam. */
export const NamesSchema = z.object({
  female: names,
  male: names,
  neutral: names,
  surnames: names,
});

/** Welche Liste zu welchem Feld des Bereichs `names` gehört. */
const firstNames = { 'names.female': 'female', 'names.male': 'male', 'names.neutral': 'neutral' } as const;

/**
 * Macht aus jedem Namensfeld ein Paar: Die erste Spalte behält die ausgeblendeten Platzhalter und
 * bekommt die Vornamen dazu (`names.female.first.3`), die zweite die Nachnamen, in jedem Feld mit
 * eigenen Einträgen (`names.female.last.17`). Die Ids hängen an der Stelle in der Liste; Namen werden
 * deshalb nur angehängt, nie umsortiert oder gelöscht.
 */
export function withNames(sections: readonly Section[], data: z.infer<typeof NamesSchema>): Section[] {
  const section = sections.find((s) => s.id === 'names');
  if (!section) throw new Error('Den Bereich names gibt es nicht');
  return sections.map((s) =>
    s !== section
      ? s
      : {
          ...s,
          slots: s.slots.map((slot) => {
            const list = firstNames[slot.id as keyof typeof firstNames];
            if (!list) throw new Error(`Für das Feld ${slot.id} gibt es keine Vornamen`);
            const placeholders = slot.columns[0]?.entries ?? [];
            const first = data[list].map((text, i) => ({ id: `${slot.id}.first.${i + 1}`, text, retired: false }));
            const last = data.surnames.map((text, i) => ({ id: `${slot.id}.last.${i + 1}`, text, retired: false }));
            return { ...slot, columns: [{ entries: [...placeholders, ...first] }, { entries: last }] };
          }),
        },
  );
}
