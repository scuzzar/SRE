import { z } from 'zod';

// Die Tabellen der Weltenerschaffung aus den Charts der Starter Edition (S. 14–15).

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

/** Eine Ziffer einer Stelle des UWP: ihr Text aus den Charts (falls es einen gibt) und ihr DM auf den TL. */
export const UwpDigitSchema = z.object({
  digit,
  text: z.string().min(1).optional(),
  techDm: z.number().int().default(0),
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
  });

export type UwpKind = z.infer<typeof UwpKindSchema>;
export type SystemContents = z.infer<typeof SystemContentsSchema>;
export type UwpDigit = z.infer<typeof UwpDigitSchema>;
export type TradeCode = z.infer<typeof TradeCodeSchema>;
export type TradeCondition = z.infer<typeof TradeConditionSchema>;
export type WorldTables = z.infer<typeof WorldTablesSchema>;
