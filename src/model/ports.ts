import type { Campaign, CampaignId } from './campaign';
import type { DeckPlan } from './ship';
import type { CloudFile, DeckFile, DeckMark, SyncMark } from './sync';

/**
 * Was das Model von außen braucht. Das Model definiert die Schnittstellen, `platform/` setzt sie um,
 * `main.tsx` reicht die Umsetzungen in den Controller.
 */

/**
 * Die Stufen des Ziehblatts auf dem Smartphone, von unten nach oben: versteckt (nur der Griff),
 * eingeklappt (Kopf, Aktionsleiste und Navigationsleiste), halb und voll. Gemerkt wird die Stufe, nicht die Höhe in Pixeln:
 * Die rechnet die Ansicht jedes Mal aus dem Platz und dem Inhalt aus.
 */
export const TRAY_STOPS = ['hidden', 'collapsed', 'half', 'full'] as const;
export type TrayStop = (typeof TRAY_STOPS)[number];

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
  /** Ob die Charakterleiste eingeklappt ist, merkt sich das Gerät; zum Spielstand gehört es nicht. */
  loadStripCollapsed(): Promise<boolean>;
  saveStripCollapsed(collapsed: boolean): Promise<void>;
  /** Ob der Hinweis über den Waffen im Shop weggeklickt ist, merkt sich das Gerät; zum Spielstand gehört es nicht. */
  loadShopHintHidden(): Promise<boolean>;
  saveShopHintHidden(hidden: boolean): Promise<void>;
  /** Auf welcher Stufe das Ziehblatt steht, merkt sich das Gerät; zum Spielstand gehört es nicht. */
  loadTrayStop(): Promise<TrayStop | undefined>;
  saveTrayStop(stop: TrayStop): Promise<void>;
  /** Die Abgleichsmarken merkt sich das Gerät; zum Spielstand gehören sie nicht. */
  loadMarks(): Promise<readonly SyncMark[]>;
  saveMark(mark: SyncMark): Promise<void>;
  removeMark(key: string): Promise<void>;
  clearMarks(): Promise<void>;
  /**
   * Deckpläne hält das Gerät über Kampagnen hinweg je Entwurf (2026-11-16), nie in einer Kampagne;
   * der Abgleich bringt sie mit OneDrive auf denselben Stand (2026-11-17), der Export lässt sie liegen.
   */
  loadDeckPlans(design: string): Promise<readonly DeckPlan[]>;
  /** Alle Deckpläne aller Entwürfe, für den Abgleich. */
  listDeckPlans(): Promise<readonly DeckPlan[]>;
  saveDeckPlan(plan: DeckPlan): Promise<void>;
  removeDeckPlan(design: string, name: string): Promise<void>;
  /** Die Abgleichsmarken der Deckplan-Plätze merkt sich das Gerät, wie die der Kampagnen. */
  loadDeckMarks(): Promise<readonly DeckMark[]>;
  saveDeckMark(mark: DeckMark): Promise<void>;
  removeDeckMark(design: string, name: string): Promise<void>;
  clearDeckMarks(): Promise<void>;
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
  /** Die Deckplan-Dateien (2026-11-17), getrennt von den Kampagnendateien; je Entwurf und Platz eine. */
  listDeckPlans(): Promise<readonly DeckFile[]>;
  readDeckPlan(design: string, name: string): Promise<{ readonly text: string; readonly revision: string } | undefined>;
  /** Wie `write`: mit `revision` nur gegen diese Fassung, ohne nur, wenn es die Datei noch nicht gibt. */
  writeDeckPlan(design: string, name: string, text: string, revision?: string): Promise<string>;
  /** Wie `remove`. */
  removeDeckPlan(design: string, name: string, revision: string): Promise<void>;
}

/**
 * Wer den Spielstand schreiben darf: auf einem Gerät immer nur ein Fenster der App. Zwei offene
 * Fenster (etwa die installierte App und ein Tab im Browser) überschrieben sonst still gegenseitig
 * ihre Änderungen.
 */
export interface WindowLock {
  /**
   * Nimmt das Recht zu schreiben; `false`, wenn ein anderes Fenster es hält. `lost` wird gerufen,
   * wenn ein anderes Fenster es später übernimmt.
   */
  acquire(lost: () => void): Promise<boolean>;
  /** Nimmt das Recht dem anderen Fenster weg; dort wird dessen `lost` gerufen. */
  take(lost: () => void): Promise<void>;
}

/** Gibt dem Spieler eine Datei zum Speichern, als Download. */
export interface Download {
  offer(fileName: string, content: string, type: string): void;
}
