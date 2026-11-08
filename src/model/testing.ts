import type { Campaign } from './campaign';
import { currentEncounter } from './encounter';
import { fightOrder, turnOf, withEncounter } from './fight';
import type { CampaignRepository, Clock, Download, Random } from './ports';

/** Eine Zufallsquelle für Tests: liefert die vorgegebenen Zahlen der Reihe nach, danach immer `min`. */
export function fixedRandom(...values: number[]): Random & { readonly calls: number } {
  const queue = [...values];
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    int(min, max) {
      calls++;
      const value = queue.shift() ?? min;
      if (value < min || value > max) throw new Error(`fixedRandom: ${value} liegt nicht in ${min}–${max}`);
      return value;
    },
  };
}

/** Eine Uhr für Tests, die bei jedem Aufruf eine Minute weiterläuft. */
export function fixedClock(start = '2026-10-23T14:00:00.000Z'): Clock {
  let time = Date.parse(start);
  return {
    now() {
      const now = new Date(time).toISOString();
      time += 60_000;
      return now;
    },
  };
}

/** Ein Speicher im Arbeitsspeicher für Tests. `saved` ist die zuletzt gespeicherte Kampagne. */
export function memoryRepository(...initial: Campaign[]): CampaignRepository & {
  saved: Campaign | undefined;
  readonly campaigns: Map<string, Campaign>;
  open: string | undefined;
  stripCollapsed: boolean;
  shopHintHidden: boolean;
} {
  return {
    saved: initial.at(-1),
    campaigns: new Map(initial.map((c) => [c.id, c])),
    open: undefined,
    stripCollapsed: false,
    shopHintHidden: false,
    async list() {
      return [...this.campaigns.values()];
    },
    async save(campaign) {
      this.saved = campaign;
      this.campaigns.set(campaign.id, campaign);
    },
    async remove(id) {
      this.campaigns.delete(id);
    },
    async loadOpen() {
      return this.open;
    },
    async saveOpen(id) {
      this.open = id;
    },
    async loadStripCollapsed() {
      return this.stripCollapsed;
    },
    async saveStripCollapsed(collapsed) {
      this.stripCollapsed = collapsed;
    },
    async loadShopHintHidden() {
      return this.shopHintHidden;
    },
    async saveShopHintHidden(hidden) {
      this.shopHintHidden = hidden;
    },
  };
}

/** Eine Download-Stelle für Tests: merkt sich, was angeboten wurde. */
export function memoryDownload(): Download & { readonly files: { fileName: string; content: string; type: string }[] } {
  return {
    files: [],
    offer(fileName, content, type) {
      this.files.push({ fileName, content, type });
    },
  };
}

/**
 * Die Kampagne, in der dieser Kämpfer der laufenden Begegnung am Zug ist: Alle vor ihm in der
 * Zugreihenfolge waren in dieser Runde schon dran. Nur für Tests; die Überraschung muss gewürfelt sein.
 */
export function onTurn(campaign: Campaign, id: string): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new Error('onTurn: Es läuft keine Begegnung.');
  const order = fightOrder(campaign, encounter);
  const at = order.findIndex((s) => s.id === id);
  if (at < 0) throw new Error(`onTurn: ${id} kämpft nicht in der Begegnung.`);
  const after = withEncounter(campaign, { ...encounter, acted: order.slice(0, at).map((s) => s.id) });
  if (turnOf(after)?.id !== id) throw new Error(`onTurn: ${id} kommt nicht an den Zug (Überraschung, bewusstlos?).`);
  return after;
}
