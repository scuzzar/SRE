import { z } from 'zod';
import cityNamesJson from './city-names.json';

const names = z.array(z.string().min(1)).min(100);

/**
 * Städtenamen (Domänenmodell 2026-11-14k): eigene Namen, je Klangart irdisch (wie Kolonisten sie
 * vergeben) und fremdartig. Dazu Bausteine, aus denen weitere Namen entstehen, wenn die fertigen auf
 * einer großen Kampagne ausgehen. Erzeugt mit einem Skript aus handgeschriebenen Bausteinen.
 */
export const CityNamesSchema = z.object({
  earthly: names,
  alien: names,
  parts: z.object({
    roots: names,
    patterns: z.array(z.string().includes('{r}')).min(1),
    onsets: z.array(z.string().min(1)).min(1),
    nuclei: z.array(z.string().min(1)).min(1),
    codas: z.array(z.string().min(1)).min(1),
  }),
});

export type CityNames = z.infer<typeof CityNamesSchema>;

export const cityNames: CityNames = CityNamesSchema.parse(cityNamesJson);
