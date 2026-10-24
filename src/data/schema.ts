import { z } from 'zod';

/** Eine Stufe: die eine Auswahl für Orakel (Chance auf Ja) und Proben (Zielwert). */
export const OddsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  chance: z.number().int().min(0).max(100),
  target: z.number().int(),
});

export const HouseRulesSchema = z.object({
  unskilledDm: z.number().int(),
  bonusFrom: z.number().int(),
  malusUpTo: z.number().int(),
});

export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Drei Zeichen für die knappe Anzeige, z. B. Pil. */
  short: z.string().length(3),
});

export const EntrySchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  /** Ausgetauscht: wird nicht mehr gezogen, bleibt aber für alte Logeinträge in den Daten. */
  retired: z.boolean().default(false),
});

export const SlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  entries: z.array(EntrySchema).min(1),
});

export const SectionKindSchema = z.enum(['card', 'theme']);

export const SectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: SectionKindSchema,
  slots: z.array(SlotSchema).min(1),
});

const level = z.number().int().min(0);
const characteristicValue = z.number().int().min(0).max(15);

export const UppSchema = z.object({
  str: characteristicValue,
  dex: characteristicValue,
  end: characteristicValue,
  int: characteristicValue,
  edu: characteristicValue,
  soc: characteristicValue,
});

/** Ein Beispielcharakter, mit dem eine neue Kampagne beginnt. */
export const ExampleCharacterSchema = z.object({
  name: z.string().min(1),
  background: z.string(),
  upp: UppSchema,
  skills: z.array(z.object({ of: z.string().min(1), level })),
  equipment: z.string(),
  credits: z.number().int(),
  note: z.string(),
});

function uniqueIds(ids: readonly string[], what: string, ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) ctx.addIssue({ code: 'custom', message: `${what} ${id} kommt doppelt vor` });
    seen.add(id);
  }
}

export const ReferenceDataSchema = z
  .object({
    odds: z.array(OddsSchema).min(1),
    houseRules: HouseRulesSchema,
    skills: z.array(SkillSchema).min(1),
    sections: z.array(SectionSchema).min(1),
    examples: z.array(ExampleCharacterSchema),
  })
  .superRefine((data, ctx) => {
    const slots = data.sections.flatMap((s) => s.slots);
    uniqueIds(data.odds.map((o) => o.id), 'Stufe', ctx);
    uniqueIds(data.skills.map((s) => s.id), 'Fertigkeit', ctx);
    uniqueIds(data.skills.map((s) => s.short), 'Kürzel', ctx);
    uniqueIds(data.sections.map((s) => s.id), 'Bereich', ctx);
    uniqueIds(slots.map((s) => s.id), 'Feld', ctx);
    uniqueIds(slots.flatMap((s) => s.entries.map((e) => e.id)), 'Eintrag', ctx);
    if (slots.every((slot) => slot.entries.every((e) => e.retired))) {
      ctx.addIssue({ code: 'custom', message: 'Kein Feld hat einen Eintrag, der nicht ausgeblendet ist' });
    }
    const skillIds = new Set(data.skills.map((s) => s.id));
    for (const example of data.examples) {
      uniqueIds(example.skills.map((s) => s.of), `Fertigkeit bei ${example.name}:`, ctx);
      for (const s of example.skills) {
        if (!skillIds.has(s.of)) ctx.addIssue({ code: 'custom', message: `Unbekannte Fertigkeit ${s.of} bei ${example.name}` });
      }
    }
  });

export type Odds = z.infer<typeof OddsSchema>;
export type HouseRules = z.infer<typeof HouseRulesSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type SectionKind = z.infer<typeof SectionKindSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type ExampleCharacter = z.infer<typeof ExampleCharacterSchema>;
export type ReferenceData = z.infer<typeof ReferenceDataSchema>;
