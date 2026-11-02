import { z } from 'zod';

// Die Tabellen der Weltenerschaffung aus den Charts der Starter Edition (S. 14–15), dazu die
// Temperatur nach Mongoose Traveller 2e (Core Rulebook S. 251–252) mit eigenen deutschen Texten.

/**
 * Die Ziffern des UWP in eHex: 0–9, dann A–Z ohne I und O. So ist der Raumhafen X die Ziffer 31,
 * und Werte über F (Gesetz, TL) haben eine Ziffer.
 */
export const EHEX = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Die Stellen des UWP, in seiner Reihenfolge. */
export const uwpKinds = ['starport', 'size', 'atmosphere', 'hydrographics', 'population', 'government', 'law', 'tech'] as const;
export const UwpKindSchema = z.enum(uwpKinds);

const digit = z.number().int().min(0).max(EHEX.length - 1);
const starportLetter = z
  .string()
  .length(1)
  .refine((s) => EHEX.includes(s), 'keine eHex-Ziffer');

/** Eine Zeile der System Contents Table: was 2W6 in jeder Spalte ergeben. Der Raumhafen als Buchstabe wie in den Charts. */
export const SystemContentsSchema = z.object({
  roll: z.number().int().min(2).max(12),
  starport: starportLetter,
  navalBase: z.boolean(),
  scoutBase: z.boolean(),
  gasGiant: z.boolean(),
});

/**
 * Eine Ziffer einer Stelle des UWP: ihr Text aus den Charts (falls es einen gibt), ihr DM auf den TL
 * und bei der Atmosphäre ihr DM auf die Temperatur.
 */
export const UwpDigitSchema = z.object({
  digit,
  text: z.string().min(1).optional(),
  techDm: z.number().int().default(0),
  temperatureDm: z.number().int().optional(),
});

/** Die Temperaturen einer Welt, vom kältesten zum heißesten. */
export const temperatureIds = ['frozen', 'cold', 'temperate', 'hot', 'boiling'] as const;
export const TemperatureIdSchema = z.enum(temperatureIds);

/**
 * Eine Zeile der Temperaturtabelle: welche Summe aus 2W6 + DM sie ergibt (`from` bis `to`, an den
 * Enden offen), ihr Name, die mittlere Temperatur, eine kurze Beschreibung und ihr DM auf die
 * Hydrographie.
 */
export const TemperatureSchema = z.object({
  id: TemperatureIdSchema,
  from: z.number().int().optional(),
  to: z.number().int().optional(),
  name: z.string().min(1),
  average: z.string().min(1),
  text: z.string().min(1),
  hydroDm: z.number().int(),
});

/** Eine Bedingung eines Handelscodes: Die Stelle `of` hat eine der Ziffern. */
export const TradeConditionSchema = z.object({
  of: UwpKindSchema,
  digits: z.array(digit).min(1),
});

export const TradeCodeSchema = z.object({
  /** Das Kürzel, z. B. Ag. */
  id: z.string().length(2),
  name: z.string().min(1),
  if: z.array(TradeConditionSchema).min(1),
});

export const WorldTablesSchema = z
  .object({
    systemContents: z.array(SystemContentsSchema).length(11),
    uwpDigits: z.object(Object.fromEntries(uwpKinds.map((k) => [k, z.array(UwpDigitSchema).min(1)])) as Record<(typeof uwpKinds)[number], z.ZodArray<typeof UwpDigitSchema>>),
    tradeCodes: z.array(TradeCodeSchema).min(1),
    temperatures: z.array(TemperatureSchema).length(temperatureIds.length),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    data.systemContents.forEach((row, i) => {
      if (row.roll !== i + 2) issue('Die System Contents Table hat nicht die Zeilen 2 bis 12');
    });
    for (const kind of uwpKinds) {
      const digits = data.uwpDigits[kind].map((d) => d.digit);
      if (new Set(digits).size !== digits.length) issue(`Eine Ziffer von ${kind} kommt doppelt vor`);
    }
    for (const row of data.systemContents) {
      if (!data.uwpDigits.starport.some((d) => d.digit === EHEX.indexOf(row.starport))) issue(`Den Raumhafen ${row.starport} gibt es nicht`);
    }
    const codes = data.tradeCodes.map((t) => t.id);
    if (new Set(codes).size !== codes.length) issue('Ein Handelscode kommt doppelt vor');
    // Die Temperaturen in ihrer Reihenfolge, lückenlos aneinander, nur die erste nach unten und die letzte nach oben offen.
    data.temperatures.forEach((t, i) => {
      if (t.id !== temperatureIds[i]) issue(`Die Temperatur an Stelle ${i + 1} sollte ${temperatureIds[i]} sein`);
      const first = i === 0;
      const last = i === data.temperatures.length - 1;
      if ((t.from === undefined) !== first || (t.to === undefined) !== last) issue(`Die Temperatur ${t.id} ist falsch begrenzt`);
      const before = data.temperatures[i - 1];
      if (before?.to !== undefined && t.from !== before.to + 1) issue(`Zwischen ${before.id} und ${t.id} ist eine Lücke`);
      if (t.from !== undefined && t.to !== undefined && t.from > t.to) issue(`Die Temperatur ${t.id} hat keine Summe`);
    });
    for (const d of data.uwpDigits.atmosphere) if (d.temperatureDm === undefined) issue(`Die Atmosphäre ${EHEX[d.digit]} hat keinen DM auf die Temperatur`);
    for (const kind of uwpKinds) {
      if (kind !== 'atmosphere' && data.uwpDigits[kind].some((d) => d.temperatureDm !== undefined)) issue(`Nur die Atmosphäre hat einen DM auf die Temperatur, nicht ${kind}`);
    }
  });

export type UwpKind = z.infer<typeof UwpKindSchema>;
export type SystemContents = z.infer<typeof SystemContentsSchema>;
export type UwpDigit = z.infer<typeof UwpDigitSchema>;
export type TradeCode = z.infer<typeof TradeCodeSchema>;
export type TradeCondition = z.infer<typeof TradeConditionSchema>;
export type TemperatureId = z.infer<typeof TemperatureIdSchema>;
export type Temperature = z.infer<typeof TemperatureSchema>;
export type WorldTables = z.infer<typeof WorldTablesSchema>;
