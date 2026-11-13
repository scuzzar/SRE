import Dexie, { type EntityTable } from 'dexie';
import { hexFromRolls, keepFocus, settleStash, upgradeDistances, upgradeNpcs, type Campaign, type CampaignId, type CampaignRepository, type Encounter, type Hex, type LegacyWorldRoll, type SyncMark } from '../model';

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

class SreDatabase extends Dexie {
  campaigns!: EntityTable<StoredCampaign, 'key'>;
  settings!: EntityTable<Setting, 'key'>;
  marks!: EntityTable<SyncMark, 'key'>;

  constructor(name: string) {
    super(name);
    // Version 1 hatte genau eine Kampagne unter dem Schlüssel „current“; sie behält ihn als Id.
    this.version(1).stores({ campaigns: 'key' });
    this.version(2).stores({ campaigns: 'key', settings: 'key' });
    // Version 3: die Abgleichsmarken, je Kampagne eine unter ihrem Schlüssel.
    this.version(3).stores({ campaigns: 'key', settings: 'key', marks: 'key' });
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
}

/**
 * Bringt einen älteren Spielstand auf den heutigen Aufbau. Vor mehreren Kampagnen hatte die eine
 * Kampagne keine Id; sie bekommt den Schlüssel, unter dem sie lag. Vor „tot“ hatte ein Charakter kein
 * `dead`; er lebt. Vor den Gegenständen hatte er keinen Besitz. Vor den Paaren hielt ein `PickedItem`
 * genau einen Eintrag als Text (`picked: 'event.verb.3'`); heute ist es eine Liste. Vor dem
 * Subsektor hatte eine Kampagne keine Hexfelder; danach hielt ein Hexfeld eine Zeit lang seine Würfe
 * (`rolls`), heute seine Werte: Die Würfe werden nachgespielt. Vor dem Charakter oben hatte eine
 * Kampagne keinen; sie bekommt den ersten Lebenden. Vor dem Shop hatte sie keine Buchungen, vor den NSC keine Begegnungen, und ein Charakter war immer ein SC.
 * Vor 2026-11-08c waren die NSC einer Begegnung eine eigene Art; heute sind sie Charaktere (`upgradeNpcs`).
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
    dead: c.dead ?? false,
    npc: c.npc ?? false,
    possessions: c.possessions ?? [],
    ...(c.primary === undefined && c.secondary === undefined && c.wields !== undefined ? { primary: c.wields } : {}),
  }));
  const hexes = (campaign.hexes ?? []).map((hex): Hex => {
    const old = hex as Hex & { readonly rolls?: readonly LegacyWorldRoll[] };
    return old.rolls ? hexFromRolls({ column: old.column, row: old.row, ...(old.name === undefined ? {} : { name: old.name }), rolls: old.rolls }) : hex;
  });
  // Begegnungen von vor den Range Bands bzw. von vor 2026-11-08d macht upgradeDistances zu solchen mit Startband.
  const encounters = (campaign.encounters ?? []).map((e): Encounter => ({ ...e, round: e.round ?? 1, acted: e.acted ?? [] }));
  // Spielstände von vor dem Gruppengepäck: Was ein SC nicht ausgerüstet hat, kommt ins Gepäck (settleStash).
  const upgraded = settleStash(upgradeDistances(upgradeNpcs({ ...campaign, characters, log, hexes, bookings: campaign.bookings ?? [], encounters, stash: campaign.stash ?? [] })));
  return keepFocus(upgraded, upgraded);
}

/** Hält den Spielstand nur im Arbeitsspeicher; er geht beim Schließen verloren. */
export class MemoryCampaignRepository implements CampaignRepository {
  private readonly campaigns = new Map<CampaignId, Campaign>();
  private open: CampaignId | undefined;
  private collapsed = false;
  private hintHidden = false;
  private readonly marks = new Map<string, SyncMark>();

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
