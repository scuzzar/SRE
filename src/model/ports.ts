import type { Campaign, CampaignId } from './campaign';
import type { CloudFile, SyncMark } from './sync';

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

/** Die Quelle der Schlüssel: jeder Aufruf gibt einen neuen, weltweit eindeutigen. */
export interface Keys {
  next(): string;
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
  /** Ob die Leiste mit dem Charakter oben eingeklappt ist, merkt sich das Gerät; zum Spielstand gehört es nicht. */
  loadStripCollapsed(): Promise<boolean>;
  saveStripCollapsed(collapsed: boolean): Promise<void>;
  /** Ob der Hinweis über den Waffen im Shop weggeklickt ist, merkt sich das Gerät; zum Spielstand gehört es nicht. */
  loadShopHintHidden(): Promise<boolean>;
  saveShopHintHidden(hidden: boolean): Promise<void>;
  /** Die Abgleichsmarken merkt sich das Gerät; zum Spielstand gehören sie nicht. */
  loadMarks(): Promise<readonly SyncMark[]>;
  saveMark(mark: SyncMark): Promise<void>;
  removeMark(key: string): Promise<void>;
  clearMarks(): Promise<void>;
}

/** Die Fassung in der Wolke ist nicht mehr die erwartete: Dort hat inzwischen jemand geändert. */
export class CloudChanged extends Error {}

/** Die Wolke ist nicht erreichbar (kein Netz); der nächste Abgleich holt nach. */
export class CloudOffline extends Error {}

/** Die Anmeldung ist abgelaufen; der Spieler muss sich neu anmelden. */
export class CloudExpired extends Error {}

/**
 * Der Ort, an dem die Kampagnen für den Abgleich liegen (OneDrive): je Kampagne eine Datei unter
 * ihrem Schlüssel. Jede Fassung einer Datei hat eine `revision`; ändert sich die Datei, ändert sie sich.
 */
export interface Cloud {
  /** Wer angemeldet ist, als Name zum Anzeigen; `undefined`: niemand. */
  account(): Promise<string | undefined>;
  /** Meldet an. Darf die Seite dafür verlassen; dann kommt die Antwort beim nächsten Start über `account`. */
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  list(): Promise<readonly CloudFile[]>;
  /** Der Inhalt einer Datei mit ihrer Fassung; `undefined`, wenn es sie nicht gibt. */
  read(key: string): Promise<{ readonly text: string; readonly revision: string } | undefined>;
  /**
   * Schreibt die Datei und gibt ihre neue Fassung zurück. Mit `revision` nur, wenn die Datei noch
   * diese Fassung hat, ohne nur, wenn es sie noch nicht gibt; sonst `CloudChanged`.
   */
  write(key: string, text: string, revision?: string): Promise<string>;
  /** Löscht die Datei, wenn sie noch diese Fassung hat; sonst `CloudChanged`. Fehlt sie schon, ist es gut. */
  remove(key: string, revision: string): Promise<void>;
}

/** Gibt dem Spieler eine Datei zum Speichern, als Download. */
export interface Download {
  offer(fileName: string, content: string, type: string): void;
}
