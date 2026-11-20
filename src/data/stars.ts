import { z } from 'zod';

// Die Tabellen der Systemerschaffung aus Book 6 *Scouts* (GDW 1983), S. 28–31 und 36–37; übertragen in
// docs/regeln-sternsystem.md.

export const starTypes = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const;
export const StarTypeSchema = z.enum(starTypes);
export const starSizes = ['Ia', 'Ib', 'II', 'III', 'IV', 'V', 'VI', 'D'] as const;
export const StarSizeSchema = z.enum(starSizes);

/** Die Bahn eines Begleiters in der Tabelle System Features: nah, eine Bahn (vielleicht + 1W6) oder fern. */
const CompanionOrbitSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('close') }),
  z.object({ kind: z.literal('far') }),
  z.object({ kind: z.literal('orbit'), orbit: z.number().int().min(0), plusDie: z.boolean().optional() }),
]);

/** Eine Zeile der Tabelle System Features (B6 28): was 2W6 + DM in jeder Spalte ergeben. */
export const SystemFeaturesSchema = z.object({
  roll: z.number().int().min(0).max(12),
  nature: z.enum(['single', 'double', 'triple']),
  primaryType: StarTypeSchema,
  primarySize: StarSizeSchema,
  companionType: StarTypeSchema.optional(),
  companionSize: StarSizeSchema,
  companionOrbit: CompanionOrbitSchema,
  maxOrbits: z.number().int().min(0),
  /** Wie viele Gasriesen es gibt, wenn es welche gibt. */
  gasGiants: z.number().int().min(1).optional(),
});

/** Eine Zeile der Planetoidengürtel (B6 28): vorhanden und Anzahl. */
export const BeltRowSchema = z.object({ roll: z.number().int().min(0).max(12), present: z.boolean(), count: z.number().int().min(1) });

/** Eine Zeile der Tabelle Captured Planets and Empty Orbits (B6 29), 1W6. */
export const EmptyCapturedSchema = z.object({
  roll: z.number().int().min(1).max(6),
  captured: z.boolean(),
  capturedCount: z.number().int().min(1),
  empty: z.boolean(),
  emptyCount: z.number().int().min(1),
});

/** Die Zonen eines Sterns (Table of Zones, B6 29–31, verdichtet): erste verfügbare und bewohnbare Bahn. */
export const StarZonesSchema = z.object({
  type: StarTypeSchema,
  /** Zehntel 0 oder 5; weiße Zwerge (D) haben keins. */
  decimal: z.number().int().min(0).max(9).optional(),
  size: StarSizeSchema,
  firstOrbit: z.number().int().min(0),
  habitableOrbit: z.number().int().min(0).optional(),
});

/** Der Abstand einer Bahn vom Stern (Planetary Orbits, B6 28). */
export const OrbitDistanceSchema = z.object({ orbit: z.number().int().min(0), millionKm: z.number().positive(), au: z.number().positive() });

/** Eine Zeile der Bahnen von Monden (B6 28) in Radien des Körpers: Ring (1W6), nah, fern, extrem fern (2W6). */
export const MoonOrbitRowSchema = z.object({
  roll: z.number().int().min(1).max(12),
  ring: z.number().int().min(1).optional(),
  close: z.number().int().min(1).optional(),
  far: z.number().int().min(1).optional(),
  extreme: z.number().int().min(1).optional(),
});

export const StarTablesSchema = z
  .object({
    features: z.array(SystemFeaturesSchema).length(13),
    belts: z.array(BeltRowSchema).length(13),
    emptyCaptured: z.array(EmptyCapturedSchema).length(6),
    zones: z.array(StarZonesSchema).min(1),
    orbits: z.array(OrbitDistanceSchema).min(1),
    moonOrbits: z.array(MoonOrbitRowSchema).length(12),
  })
  .superRefine((data, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    data.features.forEach((row, i) => row.roll !== i && issue('System Features hat nicht die Zeilen 0 bis 12'));
    data.belts.forEach((row, i) => row.roll !== i && issue('Die Planetoidengürtel haben nicht die Zeilen 0 bis 12'));
    data.emptyCaptured.forEach((row, i) => row.roll !== i + 1 && issue('Captured Planets and Empty Orbits hat nicht die Zeilen 1 bis 6'));
    data.orbits.forEach((row, i) => row.orbit !== i && issue('Planetary Orbits hat nicht die Bahnen ab 0'));
    data.moonOrbits.forEach((row, i) => row.roll !== i + 1 && issue('Die Bahnen der Monde haben nicht die Zeilen 1 bis 12'));
    for (const z of data.zones) {
      if (z.habitableOrbit !== undefined && z.habitableOrbit < z.firstOrbit) issue(`Die Zonen von ${z.type}${z.decimal ?? ''} ${z.size}: bewohnbare Bahn vor der ersten`);
      if ((z.size === 'D') !== (z.decimal === undefined)) issue(`Die Zonen von ${z.type} ${z.size}: Zehntel nur ohne weißen Zwerg`);
    }
  });

export type StarType = z.infer<typeof StarTypeSchema>;
export type StarSize = z.infer<typeof StarSizeSchema>;
export type SystemFeatures = z.infer<typeof SystemFeaturesSchema>;
export type StarZones = z.infer<typeof StarZonesSchema>;
export type StarTables = z.infer<typeof StarTablesSchema>;
