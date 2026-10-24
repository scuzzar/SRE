import Dexie, { type EntityTable } from 'dexie';
import type { Campaign, CampaignRepository } from '../model';

interface StoredCampaign {
  readonly key: string;
  readonly campaign: Campaign;
}

/** In Version 1 gibt es genau eine Kampagne; sie liegt unter diesem Schlüssel. */
const KEY = 'current';

class SreDatabase extends Dexie {
  campaigns!: EntityTable<StoredCampaign, 'key'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ campaigns: 'key' });
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

  async load(): Promise<Campaign | undefined> {
    const stored = (await this.db.campaigns.get(KEY))?.campaign;
    return stored && upgraded(stored);
  }

  async save(campaign: Campaign): Promise<void> {
    await this.db.campaigns.put({ key: KEY, campaign });
  }
}

/**
 * Bringt einen älteren Spielstand auf den heutigen Aufbau. Vor den Paaren hielt ein `PickedItem`
 * genau einen Eintrag als Text (`picked: 'event.verb.3'`); heute ist es eine Liste.
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
  return { ...campaign, log };
}

/** Hält den Spielstand nur im Arbeitsspeicher; er geht beim Schließen verloren. */
export class MemoryCampaignRepository implements CampaignRepository {
  private campaign: Campaign | undefined;

  async load(): Promise<Campaign | undefined> {
    return this.campaign;
  }

  async save(campaign: Campaign): Promise<void> {
    this.campaign = campaign;
  }
}

/**
 * Öffnet den Speicher. Ist IndexedDB nicht verfügbar (privates Fenster, eingebettete Vorschau),
 * läuft die App mit einem Speicher im Arbeitsspeicher weiter.
 */
export async function openRepository(): Promise<{ repository: CampaignRepository; persistent: boolean }> {
  try {
    return { repository: await new DexieCampaignRepository().open(), persistent: true };
  } catch {
    return { repository: new MemoryCampaignRepository(), persistent: false };
  }
}
