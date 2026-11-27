import { z } from 'zod';
import { DiceExprSchema } from './worlds';

/** Die Handelscodes, die beim Handel DMs geben (SE 22): Ag, Na, In, Ni, Ri, Po. */
export const tradeDmCodes = ['Ag', 'Na', 'In', 'Ni', 'Ri', 'Po'] as const;

/** Ein DM einer Ware je Handelscode der Welt (SE 22, Purchase bzw. Resale DMs). */
export const TradeDmSchema = z.object({
  code: z.enum(tradeDmCodes),
  dm: z.number().int(),
});

/**
 * Eine Zeile der Trade and Speculation Table (SE 22). `tonsPerItem`: nur bei Stückwaren (51–56),
 * Tonnen je Stück (E7); sonst gilt der Grundpreis je Tonne.
 */
export const TradeGoodSchema = z.object({
  roll: z.number().int().min(11).max(66),
  name: z.string().min(1),
  basePrice: z.number().int().min(1),
  purchase: z.array(TradeDmSchema),
  resale: z.array(TradeDmSchema),
  quantity: DiceExprSchema,
  tonsPerItem: z.number().min(0).optional(),
});

/** Die Actual Value Table (SE 22): modifizierter 2W6-Wurf → Prozent des Grundpreises. */
export const ActualValueSchema = z.object({
  roll: z.number().int(),
  percent: z.number().int().min(1),
});

/** Eine Zeile der Passagiertabelle (SE 9) nach der Bevölkerung der Herkunft; fehlt eine Klasse, gibt es keine. */
export const PassengerRowSchema = z.object({
  population: z.number().int().min(0).max(10),
  high: DiceExprSchema.optional(),
  middle: DiceExprSchema.optional(),
  low: DiceExprSchema.optional(),
});

/** Eine Zeile der Cargo-Tabelle (SE 9) nach der Bevölkerung der Herkunft. */
export const CargoRowSchema = z.object({
  population: z.number().int().min(0).max(10),
  major: DiceExprSchema.optional(),
  minor: DiceExprSchema.optional(),
  incidental: DiceExprSchema.optional(),
});

export const TradeTablesSchema = z
  .object({
    goods: z.array(TradeGoodSchema).length(36),
    actualValue: z.array(ActualValueSchema).length(14),
    passengers: z.array(PassengerRowSchema).length(11),
    cargo: z.array(CargoRowSchema).length(11),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    const rolls = [1, 2, 3, 4, 5, 6].flatMap((a) => [1, 2, 3, 4, 5, 6].map((b) => a * 10 + b));
    if (data.goods.some((g, i) => g.roll !== rolls[i])) issue('Die Trade and Speculation Table hat nicht die Würfe 11 bis 66 in Reihenfolge');
    if (data.goods.some((g) => (g.tonsPerItem !== undefined) !== (g.roll >= 51 && g.roll <= 56))) issue('Genau die Waren 51–56 sind Stückwaren mit Tonnen je Stück');
    if (data.actualValue.some((r, i) => r.roll !== i + 2)) issue('Die Actual Value Table hat nicht die Würfe 2 bis 15');
    if (data.passengers.some((r, i) => r.population !== i) || data.cargo.some((r, i) => r.population !== i)) issue('Passagier- und Cargo-Tabelle haben nicht die Bevölkerung 0 bis 10');
  });

export type TradeDm = z.infer<typeof TradeDmSchema>;
export type TradeGood = z.infer<typeof TradeGoodSchema>;
export type ActualValue = z.infer<typeof ActualValueSchema>;
export type PassengerRow = z.infer<typeof PassengerRowSchema>;
export type CargoRow = z.infer<typeof CargoRowSchema>;
export type TradeTables = z.infer<typeof TradeTablesSchema>;
