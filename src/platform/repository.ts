import Dexie, { type EntityTable, type Table } from 'dexie';
import { cryptoKeys } from './keys';
import { hexFromRolls, keepFocus, START_DAY, settleStash, upgradeDistances, upgradeNpcs, upgradeOracle, type Campaign, type CampaignId, type CampaignRepository, type DeckMark, type DeckPlan, type Encounter, type Hex, type LegacyWorldRoll, type SyncMark, type TrayStop, TRAY_STOPS } from '../model';

/** Eine Kampagne liegt unter ihrer Id. */
interface StoredCampaign {
  readonly key: string;
  readonly campaign: Campaign;
}

interface Setting {
  readonly key: string;
  readonly value: string;
}

/** Unter diesem Schlüssel steht, welche Kampagne zuletzt offen war. */
const OPEN = 'open';
/** Unter diesem Schlüssel steht, ob die Leiste mit dem Charakter oben eingeklappt ist. */
const STRIP = 'strip-collapsed';
const SHOP_HINT = 'shop-hint-hidden';
// Früher stand hier der Anteil der Höhe unter 'tray-height'; der neue Schlüssel lässt den alten Wert liegen.
const TRAY = 'tray-stop';

class SreDatabase extends Dexie {
  campaigns!: EntityTable<StoredCampaign, 'key'>;
  settings!: EntityTable<Setting, 'key'>;
  marks!: EntityTable<SyncMark, 'key'>;
  deckPlans!: Table<DeckPlan, [string, string]>;
  deckMarks!: Table<DeckMark, [string, string]>;

  constructor(name: string) {
    super(name);
    // Version 1 hatte genau eine Kampagne unter dem Schlüssel „current“; sie behält ihn als Id.
    this.version(1).stores({ campaigns: 'key' });
    this.version(2).stores({ campaigns: 'key', settings: 'key' });
    // Version 3: die Abgleichsmarken, je Kampagne eine unter ihrem Schlüssel.
    this.version(3).stores({ campaigns: 'key', settings: 'key', marks: 'key' });
    // Version 4: Deckpläne als Geräte-Daten, je Entwurf und Platz („Deck A“) – über Kampagnen hinweg.
    this.version(4).stores({ deckPlans: '[design+name], design' });
    // Version 5: Abgleichsmarken der Deckplan-Plätze (2026-11-17); Pläne von vorher bekommen ihren Schlüssel.
    this.version(5)
      .stores({ deckMarks: '[design+name]' })
      .upgrade((tx) =>
        tx
          .table('deckPlans')
          .toCollection()
          .modify((plan: { key?: string }) => {
            if (!plan.key) plan.key = cryptoKeys.next();
          }),
      );
  }
}

/** Speichert den Spielstand lokal in IndexedDB. */
export class DexieCampaignRepository implements CampaignRepository {
  private readonly db: SreDatabase;

  constructor(name = 'solo-rpg-engine') {
    this.db = new SreDatabase(name);
  }

  async open(): Promise<this> {
    await this.db.open();
    return this;
  }

  async list(): Promise<readonly Campaign[]> {
    return (await this.db.campaigns.toArray()).map((stored) => upgraded({ ...stored.campaign, id: stored.campaign.id ?? stored.key }));
  }

  async save(campaign: Campaign): Promise<void> {
    await this.db.campaigns.put({ key: campaign.id, campaign });
  }

  async remove(id: CampaignId): Promise<void> {
    await this.db.campaigns.delete(id);
  }

  async loadOpen(): Promise<CampaignId | undefined> {
    return (await this.db.settings.get(OPEN))?.value;
  }

  async saveOpen(id: CampaignId): Promise<void> {
    await this.db.settings.put({ key: OPEN, value: id });
  }

  async loadStripCollapsed(): Promise<boolean> {
    return (await this.db.settings.get(STRIP))?.value === 'true';
  }

  async saveStripCollapsed(collapsed: boolean): Promise<void> {
    await this.db.settings.put({ key: STRIP, value: String(collapsed) });
  }

  async loadShopHintHidden(): Promise<boolean> {
    return (await this.db.settings.get(SHOP_HINT))?.value === 'true';
  }

  async saveShopHintHidden(hidden: boolean): Promise<void> {
    await this.db.settings.put({ key: SHOP_HINT, value: String(hidden) });
  }

  async loadTrayStop(): Promise<TrayStop | undefined> {
    const value = (await this.db.settings.get(TRAY))?.value;
    return TRAY_STOPS.find((s) => s === value);
  }

  async saveTrayStop(stop: TrayStop): Promise<void> {
    await this.db.settings.put({ key: TRAY, value: stop });
  }

  async loadMarks(): Promise<readonly SyncMark[]> {
    return this.db.marks.toArray();
  }

  async saveMark(mark: SyncMark): Promise<void> {
    await this.db.marks.put(mark);
  }

  async removeMark(key: string): Promise<void> {
    await this.db.marks.delete(key);
  }

  async clearMarks(): Promise<void> {
    await this.db.marks.clear();
  }

  async loadDeckPlans(design: string): Promise<readonly DeckPlan[]> {
    return this.db.deckPlans.where('design').equals(design).toArray();
  }

  async saveDeckPlan(plan: DeckPlan): Promise<void> {
    await this.db.deckPlans.put(plan);
  }

  async removeDeckPlan(design: string, name: string): Promise<void> {
    await this.db.deckPlans.delete([design, name]);
  }

  async listDeckPlans(): Promise<readonly DeckPlan[]> {
    return this.db.deckPlans.toArray();
  }

  async loadDeckMarks(): Promise<readonly DeckMark[]> {
    return this.db.deckMarks.toArray();
  }

  async saveDeckMark(mark: DeckMark): Promise<void> {
    await this.db.deckMarks.put(mark);
  }

  async removeDeckMark(design: string, name: string): Promise<void> {
    await this.db.deckMarks.delete([design, name]);
  }

  async clearDeckMarks(): Promise<void> {
    await this.db.deckMarks.clear();
  }
}

/**
 * Bringt einen älteren Spielstand auf den heutigen Aufbau. Vor mehreren Kampagnen hatte die eine
 * Kampagne keine Id; sie bekommt den Schlüssel, unter dem sie lag. Vor „tot“ hatte ein Charakter kein
 * `dead`; er lebt. Vor den Gegenständen hatte er keinen Besitz. Vor den Paaren hielt ein `PickedItem`
 * genau einen Eintrag als Text (`picked: 'event.verb.3'`); heute ist es eine Liste. Vor dem
 * Subsektor hatte eine Kampagne keine Hexfelder; danach hielt ein Hexfeld eine Zeit lang seine Würfe
 * (`rolls`), heute seine Werte: Die Würfe werden nachgespielt. Vor dem Charakter oben hatte eine
 * Kampagne keinen; sie bekommt den ersten Lebenden. Vor dem Shop hatte sie keine Buchungen, vor den NSC keine Begegnungen, und ein Charakter war immer ein SC.
 * Vor der Spielzeit hatte eine Kampagne keinen Tag; sie beginnt am 001-1105.
 * Vor 2026-11-08c waren die NSC einer Begegnung eine eigene Art; heute sind sie Charaktere (`upgradeNpcs`).
 * Vor 2026-11-14d war eine Orakelantwort ein eigener Eintrag; heute steht sie in der Kartenauswahl (`upgradeOracle`).
 * Vor 2026-11-18 gab es keine Missionen; solche Kampagnen bekommen eine leere Liste. Vor 2026-11-18b
 * hatten Missionen keine Beteiligten; sie bekommen eine leere Liste.
 * Vor den Orten (2026-11-14j) waren Aufenthaltsort und Ort eines NSC nur die Welt als Text (0304);
 * heute sind sie ein Ort. Vor den Städtenamen (2026-11-14k) hatten Städte keinen Namen; sie heißen
 * „Stadt 1“, „Stadt 2“ usw.
 */
export function upgraded(campaign: Campaign): Campaign {
  const log = campaign.log.map((entry) => {
    if (entry.kind !== 'card') return entry;
    const items = entry.items.map((item) => {
      const picked: unknown = item.picked;
      return typeof picked === 'string' ? { picked: [picked] } : item;
    });
    return { ...entry, items };
  });
  // Charaktere von vor der Primär- und Sekundärwaffe: Die Waffe in der Hand wird die Primärwaffe.
  const characters = campaign.characters.map((c) => ({
    ...c,
    ...(typeof (c.place as unknown) === 'string' ? { place: { world: c.place as unknown as string } } : {}),
    dead: c.dead ?? false,
    npc: c.npc ?? false,
    possessions: c.possessions ?? [],
    ...(c.primary === undefined && c.secondary === undefined && c.wields !== undefined ? { primary: c.wields } : {}),
  }));
  const hexes = (campaign.hexes ?? []).map((hex): Hex => {
    const old = hex as Hex & { readonly rolls?: readonly LegacyWorldRoll[] };
    if (old.rolls) return hexFromRolls({ column: old.column, row: old.row, ...(old.name === undefined ? {} : { name: old.name }), rolls: old.rolls });
    const cities = hex.map?.cities;
    if (cities?.some((c) => !c.name)) return { ...hex, map: { ...hex.map!, cities: cities.map((c, i) => (c.name ? c : { ...c, name: `Stadt ${i + 1}` })) } };
    return hex;
  });
  const location = typeof (campaign.location as unknown) === 'string' ? { location: { world: campaign.location as unknown as string } } : {};
  // Begegnungen von vor den Range Bands bzw. von vor 2026-11-08d macht upgradeDistances zu solchen mit Startband.
  const encounters = (campaign.encounters ?? []).map((e): Encounter => ({ ...e, round: e.round ?? 1, acted: e.acted ?? [] }));
  // Spielstände von vor dem Gruppengepäck: Was ein SC nicht ausgerüstet hat, kommt ins Gepäck (settleStash).
  const upgraded = settleStash(upgradeDistances(upgradeNpcs(upgradeOracle({ ...campaign, ...location, characters, log, hexes, bookings: campaign.bookings ?? [], ships: campaign.ships ?? [], encounters, stash: campaign.stash ?? [], day: (campaign as Partial<Campaign>).day ?? START_DAY, missions: ((campaign as Partial<Campaign>).missions ?? []).map((m) => ({ ...m, people: (m as Partial<typeof m>).people ?? [] })) }))));
  return keepFocus(upgraded, upgraded);
}

/** Hält den Spielstand nur im Arbeitsspeicher; er geht beim Schließen verloren. */
export class MemoryCampaignRepository implements CampaignRepository {
  private readonly campaigns = new Map<CampaignId, Campaign>();
  private open: CampaignId | undefined;
  private collapsed = false;
  private hintHidden = false;
  private tray: TrayStop | undefined;
  private readonly marks = new Map<string, SyncMark>();
  private readonly deckPlans: DeckPlan[] = [];
  private readonly deckMarks: DeckMark[] = [];

  async list(): Promise<readonly Campaign[]> {
    return [...this.campaigns.values()];
  }

  async save(campaign: Campaign): Promise<void> {
    this.campaigns.set(campaign.id, campaign);
  }

  async remove(id: CampaignId): Promise<void> {
    this.campaigns.delete(id);
  }

  async loadOpen(): Promise<CampaignId | undefined> {
    return this.open;
  }

  async saveOpen(id: CampaignId): Promise<void> {
    this.open = id;
  }

  async loadStripCollapsed(): Promise<boolean> {
    return this.collapsed;
  }

  async saveStripCollapsed(collapsed: boolean): Promise<void> {
    this.collapsed = collapsed;
  }

  async loadShopHintHidden(): Promise<boolean> {
    return this.hintHidden;
  }

  async saveShopHintHidden(hidden: boolean): Promise<void> {
    this.hintHidden = hidden;
  }

  async loadTrayStop(): Promise<TrayStop | undefined> {
    return this.tray;
  }

  async saveTrayStop(stop: TrayStop): Promise<void> {
    this.tray = stop;
  }

  async loadMarks(): Promise<readonly SyncMark[]> {
    return [...this.marks.values()];
  }

  async saveMark(mark: SyncMark): Promise<void> {
    this.marks.set(mark.key, mark);
  }

  async removeMark(key: string): Promise<void> {
    this.marks.delete(key);
  }

  async clearMarks(): Promise<void> {
    this.marks.clear();
  }

  async loadDeckPlans(design: string): Promise<readonly DeckPlan[]> {
    return this.deckPlans.filter((p) => p.design === design);
  }

  async saveDeckPlan(plan: DeckPlan): Promise<void> {
    const at = this.deckPlans.findIndex((p) => p.design === plan.design && p.name === plan.name);
    if (at < 0) this.deckPlans.push(plan);
    else this.deckPlans[at] = plan;
  }

  async removeDeckPlan(design: string, name: string): Promise<void> {
    const at = this.deckPlans.findIndex((p) => p.design === design && p.name === name);
    if (at >= 0) this.deckPlans.splice(at, 1);
  }

  async listDeckPlans(): Promise<readonly DeckPlan[]> {
    return [...this.deckPlans];
  }

  async loadDeckMarks(): Promise<readonly DeckMark[]> {
    return [...this.deckMarks];
  }

  async saveDeckMark(mark: DeckMark): Promise<void> {
    const at = this.deckMarks.findIndex((m) => m.design === mark.design && m.name === mark.name);
    if (at < 0) this.deckMarks.push(mark);
    else this.deckMarks[at] = mark;
  }

  async removeDeckMark(design: string, name: string): Promise<void> {
    const at = this.deckMarks.findIndex((m) => m.design === design && m.name === name);
    if (at >= 0) this.deckMarks.splice(at, 1);
  }

  async clearDeckMarks(): Promise<void> {
    this.deckMarks.splice(0);
  }
}

/**
 * Bittet den Browser, den Speicher dauerhaft zu halten: Er löscht ihn dann nicht, wenn der Platz knapp
 * wird oder die App länger nicht benutzt wurde. Chrome und Safari entscheiden selbst (installiert sagen
 * sie eher zu), Firefox fragt den Spieler. Gibt zurück, ob der Browser zusagt, `undefined`, wo er das
 * nicht kennt.
 */
export async function requestDurable(
  storage: Pick<StorageManager, 'persist' | 'persisted'> | undefined = globalThis.navigator?.storage,
): Promise<boolean | undefined> {
  if (typeof storage?.persist !== 'function' || typeof storage.persisted !== 'function') return undefined;
  try {
    return (await storage.persisted()) || (await storage.persist());
  } catch {
    return undefined;
  }
}

/**
 * Öffnet den Speicher. Ist IndexedDB nicht verfügbar (privates Fenster, eingebettete Vorschau),
 * läuft die App mit einem Speicher im Arbeitsspeicher weiter. `name` wählt einen anderen Speicher als
 * den üblichen (für die Probe-Wolke: ein zweites „Gerät“ im selben Browser).
 */
export async function openRepository(name?: string): Promise<{ repository: CampaignRepository; persistent: boolean }> {
  try {
    return { repository: await new DexieCampaignRepository(name).open(), persistent: true };
  } catch {
    return { repository: new MemoryCampaignRepository(), persistent: false };
  }
}

/**
 * Die Spielstände, wie sie roh im Gerät liegen, ohne Umstellung und Prüfung: für den Notfall, wenn
 * die App mit ihnen nicht startet. Als JSON-Text zum Sichern.
 */
export async function rawCampaigns(name = 'solo-rpg-engine'): Promise<string> {
  const db = new SreDatabase(name);
  await db.open();
  const rows = await db.campaigns.toArray();
  db.close();
  return JSON.stringify(rows, null, 1);
}
