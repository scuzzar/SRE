import { z } from 'zod';
import type { Section } from './schema';

const names = z.array(z.string().min(1)).min(1);
const bySound = z.object({ earthly: names, spacey: names });

/**
 * Eigene Namen fürs Third Imperium, je Klangart: irdisch (von der Erde) und spacig (erfunden, fremd
 * klingend). Vornamen je Namensfeld, Nachnamen für alle gemeinsam. `legacy` sind die Listen des
 * früheren Bereichs `names`; sie bleiben nur für alte Logeinträge und werden nicht mehr gezogen.
 */
export const NamesSchema = z.object({
  legacy: z.object({ female: names, male: names, neutral: names, surnames: names }),
  female: bySound,
  male: bySound,
  neutral: bySound,
  surnames: bySound,
});

type Names = z.infer<typeof NamesSchema>;

/** Die Klangarten der Namen, in der Reihenfolge der Tafel: oben irdisch, unten spacig. */
export const nameSounds = ['earthly', 'spacey'] as const;
export type NameSound = (typeof nameSounds)[number];

const kinds = [
  ['female', 'Weiblich'],
  ['male', 'Männlich'],
  ['neutral', 'Neutral'],
] as const;

const soundLabel: Record<NameSound, string> = { earthly: 'irdisch', spacey: 'spacig' };

/** Die Ids der sechs Namensfelder auf der Tafel NSC, in der Reihenfolge der Tafel. */
export const nameSlotIds: readonly string[] = nameSounds.flatMap((sound) => kinds.map(([kind]) => `npc.names.${kind}.${sound}`));

/** Welche Liste des früheren Bereichs `names` zu welchem Feld gehört. */
const legacyFirstNames = { 'names.female': 'female', 'names.male': 'male', 'names.neutral': 'neutral' } as const;

/**
 * Hängt die Namen an die Bereiche:
 * - Die Tafel `npc` bekommt vorn sechs Namensfelder, je weiblich, männlich, neutral, einmal irdisch
 *   und einmal spacig. Jedes ist ein Paar: Vornamen (`npc.names.female.spacey.first.3`) und Nachnamen
 *   derselben Klangart, in jedem Feld mit eigenen Einträgen (`npc.names.female.spacey.last.17`).
 * - Der frühere Bereich `names` behält seine drei Felder mit den alten Listen, alle ausgeblendet, damit
 *   alte Logeinträge ihre Namen behalten (`names.female.first.3`).
 * Die Ids hängen an der Stelle in der Liste; Namen werden deshalb nur angehängt, nie umsortiert oder gelöscht.
 */
export function withNames(sections: readonly Section[], data: Names): Section[] {
  if (!sections.some((s) => s.id === 'names')) throw new Error('Den Bereich names gibt es nicht');
  if (!sections.some((s) => s.id === 'npc')) throw new Error('Die Tafel npc gibt es nicht');
  const entries = (prefix: string, list: readonly string[], retired: boolean) => list.map((text, i) => ({ id: `${prefix}.${i + 1}`, text, retired }));
  const nameSlots = nameSounds.flatMap((sound) =>
    kinds.map(([kind, label]) => {
      const id = `npc.names.${kind}.${sound}`;
      return {
        id,
        label: `${label}, ${soundLabel[sound]}`,
        columns: [{ entries: entries(`${id}.first`, data[kind][sound], false) }, { entries: entries(`${id}.last`, data.surnames[sound], false) }],
      };
    }),
  );
  return sections.map((s) => {
    if (s.id === 'npc') return { ...s, slots: [...nameSlots, ...s.slots] };
    if (s.id !== 'names') return s;
    return {
      ...s,
      slots: s.slots.map((slot) => {
        const list = legacyFirstNames[slot.id as keyof typeof legacyFirstNames];
        if (!list) throw new Error(`Für das Feld ${slot.id} gibt es keine Vornamen`);
        const placeholders = slot.columns[0]?.entries ?? [];
        return {
          ...slot,
          columns: [{ entries: [...placeholders, ...entries(`${slot.id}.first`, data.legacy[list], true)] }, { entries: entries(`${slot.id}.last`, data.legacy.surnames, true) }],
        };
      }),
    };
  });
}
