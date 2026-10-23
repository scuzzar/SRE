import type { Campaign } from './campaign';

/**
 * Was das Model von außen braucht. Das Model definiert die Schnittstellen, `platform/` setzt sie um,
 * `main.tsx` reicht die Umsetzungen in den Controller.
 */

/** Die Zufallsquelle. Physische Würfel (später) sind eine zweite Umsetzung. */
export interface Random {
  /** Eine ganze Zahl von `min` bis `max`, beide eingeschlossen. */
  int(min: number, max: number): number;
}

export interface Clock {
  /** Der jetzige Zeitpunkt als ISO-8601-Zeitstempel. */
  now(): string;
}

/** Der Speicher für den Spielstand. In Version 1 gibt es genau eine Kampagne. */
export interface CampaignRepository {
  load(): Promise<Campaign | undefined>;
  save(campaign: Campaign): Promise<void>;
}
