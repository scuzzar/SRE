import type { Campaign } from './campaign';
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
} {
  return {
    saved: initial.at(-1),
    campaigns: new Map(initial.map((c) => [c.id, c])),
    open: undefined,
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
