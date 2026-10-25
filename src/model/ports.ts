import type { Campaign, CampaignId } from './campaign';

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

/** Der Speicher für den Spielstand: alle Kampagnen, und welche zuletzt offen war. */
export interface CampaignRepository {
  /** Alle gespeicherten Kampagnen, in keiner bestimmten Reihenfolge. */
  list(): Promise<readonly Campaign[]>;
  save(campaign: Campaign): Promise<void>;
  remove(id: CampaignId): Promise<void>;
  /** Welche Kampagne offen ist, merkt sich das Gerät; zum Spielstand gehört es nicht. */
  loadOpen(): Promise<CampaignId | undefined>;
  saveOpen(id: CampaignId): Promise<void>;
}

/** Gibt dem Spieler eine Datei zum Speichern, als Download. */
export interface Download {
  offer(fileName: string, content: string, type: string): void;
}
