import { z } from 'zod';
import { WorldTablesSchema } from './worlds';

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

/** Eine Spalte eines Feldes: eine Liste von Einträgen. */
export const ColumnSchema = z.object({
  entries: z.array(EntrySchema).min(1),
});

/** Ein Feld hat eine oder zwei Spalten; mit zwei Spalten zieht es ein Paar. */
export const SlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  columns: z.array(ColumnSchema).min(1).max(2),
});

export const SectionKindSchema = z.enum(['card', 'theme']);

export const SectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: SectionKindSchema,
  slots: z.array(SlotSchema).min(1),
});

export const CharacteristicSchema = z.enum(['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']);

export const itemKinds = ['weapon', 'ammunition', 'armor', 'equipment', 'vehicle', 'ship', 'passage', 'membership'] as const;
export const ItemKindSchema = z.enum(itemKinds);

/** Ein Gegenstand aus den Charts, mit TL, Gewicht in kg und Preis in Cr, soweit die Charts sie angeben. */
export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: ItemKindSchema,
  tl: z.number().int().min(0).optional(),
  weight: z.number().min(0).optional(),
  price: z.number().int().min(0).optional(),
  /** Kann man nur einmal haben. */
  once: z.boolean().default(false),
  /** Bei Waffen: ihre Kampfwerte; die Fertigkeit, mit der man sie führt, folgt daraus. */
  weapon: z.string().min(1).optional(),
  /** Anmerkung zu den Daten, z. B. ein Druckfehler im Chart. */
  note: z.string().optional(),
});

/** Die Rüstungsklassen, in der Reihenfolge der Spalten der Weapons and Range Matrix (S. 6). */
export const armorClasses = ['nothing', 'jack', 'mesh', 'cloth', 'reflec', 'ablat', 'combat'] as const;
export const ArmorClassSchema = z.enum(armorClasses);

/** Die Reichweiten, von nah nach fern (S. 7). */
export const ranges = ['close', 'short', 'medium', 'long', 'veryLong'] as const;
export const RangeSchema = z.enum(ranges);

/** Schlag (Hände), Hieb (Klingen) oder Schuss (Schusswaffen); bei Schlag und Hieb zählt STR, beim Schuss DEX. */
export const AttackKindSchema = z.enum(['blow', 'swing', 'shot']);

/** Ein DM gegen eine Rüstungsklasse bzw. auf eine Reichweite; ohne `dm` geht auf diese Reichweite kein Angriff. */
export const ArmorDmSchema = z.object({
  armor: ArmorClassSchema,
  dm: z.number().int(),
});
export const RangeDmSchema = z.object({
  range: RangeSchema,
  dm: z.number().int().optional(),
});

/** In der Datei stehen die DMs knapp als Liste in der Reihenfolge der Matrix; `null` heißt „no“. */
function inMatrixOrder<K extends string>(keys: readonly K[], key: string) {
  return (value: unknown) =>
    Array.isArray(value) && value.every((v) => v === null || typeof v === 'number') ? value.map((dm: number | null, i) => (dm === null ? { [key]: keys[i] } : { [key]: keys[i], dm })) : value;
}

/** Die Kampfwerte einer Waffe (S. 4 und 6), die DMs in der Reihenfolge der Matrix. */
export const WeaponSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  attack: AttackKindSchema,
  uses: z.string().min(1),
  required: z.number().int(),
  requiredDm: z.number().int(),
  advantageous: z.number().int(),
  advantageousDm: z.number().int(),
  /** Schaden in W6. */
  wounds: z.number().int().min(1).max(5),
  /** Bei Schusswaffen: so viele Schuss fasst ein Magazin (`ammo`). */
  rounds: z.number().int().min(1).optional(),
  ammo: z.string().min(1).optional(),
  /** Ab dieser Gesetzesstufe ist die Waffe verboten (S. 14); fehlt bei den Händen. */
  law: z.number().int().min(1).max(15).optional(),
  vsArmor: z.preprocess(
    inMatrixOrder(armorClasses, 'armor'),
    z.array(ArmorDmSchema).refine((dms) => dms.length === armorClasses.length && dms.every((d, i) => d.armor === armorClasses[i]), 'Die DMs gegen Rüstung stehen nicht in der Reihenfolge der Matrix'),
  ),
  atRange: z.preprocess(
    inMatrixOrder(ranges, 'range'),
    z.array(RangeDmSchema).refine((dms) => dms.length === ranges.length && dms.every((d, i) => d.range === ranges[i]), 'Die DMs je Reichweite stehen nicht in der Reihenfolge der Matrix'),
  ),
  note: z.string().optional(),
});

/** Ein Sammelbegriff, aus dem man eine Fertigkeit wählt: Blade Combat, Gun Combat, Vehicle. */
export const CascadeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  options: z.array(z.string().min(1)).min(1),
});

/**
 * Ein Zugewinn: eine Zeile einer Tabelle oder was ein Rang bringt. Genau eins von Fertigkeit +1,
 * Wahl aus einer Kaskade, Attribut ± change, Gegenstand oder Geld; keins heißt: bringt nichts.
 */
export const GainSchema = z.object({
  id: z.string().min(1),
  skill: z.string().min(1).optional(),
  choose: z.string().min(1).optional(),
  /** Mit `choose`: bringt die Waffe, die die gewählte Fertigkeit nutzt, statt der Fertigkeit. */
  weapon: z.boolean().default(false),
  characteristic: CharacteristicSchema.optional(),
  change: z.number().int().optional(),
  item: z.string().min(1).optional(),
  credits: z.number().int().min(0).optional(),
});

export const TableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Nur mit mindestens diesem EDU. */
  minEdu: z.number().int().optional(),
  rows: z.array(GainSchema).min(6).max(7),
});

/** Ein 2W6-Wurf einer Laufbahn mit Zielwert und DMs: +dm, wenn das Attribut mindestens `atLeast` ist. */
export const ThrowSchema = z.object({
  target: z.number().int(),
  dms: z.array(z.object({ characteristic: CharacteristicSchema, atLeast: z.number().int(), dm: z.number().int() })).max(2),
});

export const RankSchema = z.object({
  level: z.number().int().min(1).max(6),
  title: z.string().min(1),
  grants: GainSchema.optional(),
});

/** Eine Laufbahn mit ihren Würfen, Rängen und Tabellen (Charts S. 2–3). */
export const ServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Die Zahl auf 1W6, mit der man bei der Einberufung hierher kommt. */
  draft: z.number().int().min(1).max(6),
  reenlist: z.number().int(),
  skillsPerTerm: z.number().int().min(1).optional(),
  enlistment: ThrowSchema,
  survival: ThrowSchema,
  commission: ThrowSchema.optional(),
  promotion: ThrowSchema.optional(),
  ranks: z.array(RankSchema).max(6),
  onEnlistment: GainSchema.optional(),
  skills: z.array(TableSchema).length(4),
  benefits: TableSchema,
  cash: TableSchema,
});

/** Eine Zeile der Aging Table: ab diesem Term kann das Attribut `loss` verlieren, Rettung ab `target`. */
export const AgingSchema = z.object({
  id: z.string().min(1),
  fromTerm: z.number().int().min(1),
  characteristic: CharacteristicSchema,
  loss: z.number().int().min(1),
  target: z.number().int(),
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
  /** Was er aus der Liste der Gegenstände besitzt. */
  possessions: z.array(z.object({ of: z.string().min(1), count: z.number().int().min(1) })).default([]),
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
    items: z.array(ItemSchema).min(1),
    weapons: z.array(WeaponSchema).min(1),
    services: z.array(ServiceSchema).min(1),
    cascades: z.array(CascadeSchema),
    aging: z.array(AgingSchema),
    /** Die Tabellen der Weltenerschaffung. */
    worlds: WorldTablesSchema,
  })
  .superRefine((data, ctx) => {
    const slots = data.sections.flatMap((s) => s.slots);
    uniqueIds(data.odds.map((o) => o.id), 'Stufe', ctx);
    uniqueIds(data.skills.map((s) => s.id), 'Fertigkeit', ctx);
    uniqueIds(data.skills.map((s) => s.short), 'Kürzel', ctx);
    uniqueIds(data.sections.map((s) => s.id), 'Bereich', ctx);
    uniqueIds(slots.map((s) => s.id), 'Feld', ctx);
    uniqueIds(slots.flatMap((s) => s.columns.flatMap((c) => c.entries.map((e) => e.id))), 'Eintrag', ctx);
    if (slots.every((slot) => slot.columns.some((c) => c.entries.every((e) => e.retired)))) {
      ctx.addIssue({ code: 'custom', message: 'Kein Feld ist sichtbar: Jedes hat eine Spalte nur mit ausgeblendeten Einträgen' });
    }
    const skillIds = new Set(data.skills.map((s) => s.id));
    checkCareerData(data, skillIds, ctx);
    for (const example of data.examples) {
      uniqueIds(example.skills.map((s) => s.of), `Fertigkeit bei ${example.name}:`, ctx);
      for (const s of example.skills) {
        if (!skillIds.has(s.of)) ctx.addIssue({ code: 'custom', message: `Unbekannte Fertigkeit ${s.of} bei ${example.name}` });
      }
      uniqueIds(example.possessions.map((p) => p.of), `Gegenstand bei ${example.name}:`, ctx);
      for (const p of example.possessions) {
        if (!data.items.some((i) => i.id === p.of)) ctx.addIssue({ code: 'custom', message: `Unbekannter Gegenstand ${p.of} bei ${example.name}` });
      }
    }
  });

interface CareerData {
  readonly items: readonly z.infer<typeof ItemSchema>[];
  readonly weapons: readonly z.infer<typeof WeaponSchema>[];
  readonly services: readonly z.infer<typeof ServiceSchema>[];
  readonly cascades: readonly z.infer<typeof CascadeSchema>[];
  readonly aging: readonly z.infer<typeof AgingSchema>[];
}

/** Verweise der Gegenstände und Laufbahnen; jede Zeile bringt höchstens eins. */
function checkCareerData(data: CareerData, skillIds: ReadonlySet<string>, ctx: z.RefinementCtx): void {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  const services = data.services;
  const tables = services.flatMap((s) => [...s.skills, s.benefits, s.cash]);
  const gains = [
    ...tables.flatMap((t) => t.rows),
    ...services.flatMap((s) => [...(s.onEnlistment ? [s.onEnlistment] : []), ...s.ranks.flatMap((r) => (r.grants ? [r.grants] : []))]),
  ];
  uniqueIds(data.items.map((i) => i.id), 'Gegenstand', ctx);
  uniqueIds(services.map((s) => s.id), 'Laufbahn', ctx);
  uniqueIds(services.map((s) => String(s.draft)), 'Einberufungszahl', ctx);
  uniqueIds(tables.map((t) => t.id), 'Tabelle', ctx);
  uniqueIds(gains.map((g) => g.id), 'Zugewinn', ctx);
  uniqueIds(data.cascades.map((c) => c.id), 'Kaskade', ctx);
  uniqueIds(data.aging.map((a) => a.id), 'Altern', ctx);
  const items = new Map(data.items.map((i) => [i.id, i]));
  const cascades = new Map(data.cascades.map((c) => [c.id, c]));
  uniqueIds(
    data.weapons.map((w) => w.id),
    'Waffe',
    ctx,
  );
  const weapons = new Map(data.weapons.map((w) => [w.id, w]));
  for (const weapon of data.weapons) {
    if (!skillIds.has(weapon.uses)) issue(`Unbekannte Fertigkeit ${weapon.uses} bei der Waffe ${weapon.id}`);
    if (weapon.required >= weapon.advantageous) issue(`Die Waffe ${weapon.id}: das nötige Attribut liegt nicht unter dem vorteilhaften`);
    if ((weapon.rounds === undefined) !== (weapon.ammo === undefined)) issue(`Die Waffe ${weapon.id}: Magazin und Schuss nur zusammen`);
    if ((weapon.rounds !== undefined) !== (weapon.attack === 'shot')) issue(`Die Waffe ${weapon.id}: genau die Schusswaffen haben ein Magazin`);
    if (weapon.ammo !== undefined && data.items.find((i) => i.id === weapon.ammo)?.kind !== 'ammunition') issue(`Die Waffe ${weapon.id}: ihr Magazin ${weapon.ammo} ist keine Munition`);
  }
  for (const item of data.items) {
    if ((item.kind === 'weapon') !== (item.weapon !== undefined)) issue(`Der Gegenstand ${item.id}: genau die Waffen haben Kampfwerte`);
    if (item.weapon !== undefined && !weapons.has(item.weapon)) issue(`Unbekannte Waffe ${item.weapon} bei ${item.id}`);
  }
  uniqueIds(
    data.items.flatMap((i) => (i.weapon === undefined ? [] : [i.weapon])),
    'Waffe eines Gegenstands:',
    ctx,
  );
  if (!weapons.has('hands')) issue('Die Hände fehlen unter den Waffen');
  if (data.items.some((i) => i.weapon === 'hands')) issue('Die Hände gehören zu keinem Gegenstand');
  for (const cascade of data.cascades) {
    for (const option of cascade.options) if (!skillIds.has(option)) issue(`Unbekannte Fertigkeit ${option} in ${cascade.id}`);
  }
  for (const gain of gains) {
    const effects = [gain.skill, gain.choose, gain.characteristic, gain.item, gain.credits].filter((e) => e !== undefined).length;
    if (effects > 1) issue(`Der Zugewinn ${gain.id} bringt mehr als eins`);
    if ((gain.characteristic === undefined) !== (gain.change === undefined)) issue(`Der Zugewinn ${gain.id} braucht Attribut und Änderung zusammen`);
    if (gain.skill !== undefined && !skillIds.has(gain.skill)) issue(`Unbekannte Fertigkeit ${gain.skill} in ${gain.id}`);
    if (gain.item !== undefined && !items.has(gain.item)) issue(`Unbekannter Gegenstand ${gain.item} in ${gain.id}`);
    if (gain.weapon && gain.choose === undefined) issue(`Der Zugewinn ${gain.id} ist eine Waffe ohne Kaskade`);
    if (gain.choose === undefined) continue;
    const cascade = cascades.get(gain.choose);
    if (!cascade) {
      issue(`Unbekannte Kaskade ${gain.choose} in ${gain.id}`);
      continue;
    }
    if (!gain.weapon) continue;
    for (const option of cascade.options) {
      const found = data.items.filter((i) => i.weapon !== undefined && weapons.get(i.weapon)?.uses === option);
      if (found.length !== 1) issue(`Für ${option} aus ${cascade.id} gibt es nicht genau eine Waffe`);
    }
  }
  for (const service of services) {
    for (const table of service.skills) if (table.rows.length !== 6) issue(`${table.id} hat nicht 6 Zeilen`);
    for (const table of [service.benefits, service.cash]) if (table.rows.length !== 7) issue(`${table.id} hat nicht 7 Zeilen`);
    if (service.cash.rows.some((r) => r.credits === undefined)) issue(`${service.cash.id} hat eine Zeile ohne Geld`);
    if (service.ranks.some((r, i) => r.level !== i + 1)) issue(`Die Ränge von ${service.id} sind nicht 1, 2, 3, …`);
    if ((service.commission === undefined) !== (service.ranks.length === 0)) issue(`${service.id}: Patent nur mit Rängen`);
    if ((service.commission === undefined) !== (service.promotion === undefined)) issue(`${service.id}: Patent und Beförderung nur zusammen`);
  }
}

export type Odds = z.infer<typeof OddsSchema>;
export type HouseRules = z.infer<typeof HouseRulesSchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type Entry = z.infer<typeof EntrySchema>;
export type Column = z.infer<typeof ColumnSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type SectionKind = z.infer<typeof SectionKindSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type ExampleCharacter = z.infer<typeof ExampleCharacterSchema>;
export type Characteristic = z.infer<typeof CharacteristicSchema>;
export type ItemKind = z.infer<typeof ItemKindSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ArmorClass = z.infer<typeof ArmorClassSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type AttackKind = z.infer<typeof AttackKindSchema>;
export type Weapon = z.infer<typeof WeaponSchema>;
export type ArmorDm = z.infer<typeof ArmorDmSchema>;
export type RangeDm = z.infer<typeof RangeDmSchema>;
export type Cascade = z.infer<typeof CascadeSchema>;
export type Gain = z.infer<typeof GainSchema>;
export type Table = z.infer<typeof TableSchema>;
export type Throw = z.infer<typeof ThrowSchema>;
export type Rank = z.infer<typeof RankSchema>;
export type Service = z.infer<typeof ServiceSchema>;
export type Aging = z.infer<typeof AgingSchema>;
export type ReferenceData = z.infer<typeof ReferenceDataSchema>;
