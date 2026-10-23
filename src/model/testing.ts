import type { Campaign } from './campaign';
import type { CampaignRepository, Clock, Random } from './ports';

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

/** Ein Speicher im Arbeitsspeicher für Tests. */
export function memoryRepository(initial?: Campaign): CampaignRepository & { saved: Campaign | undefined } {
  return {
    saved: initial,
    async load() {
      return this.saved;
    },
    async save(campaign) {
      this.saved = campaign;
    },
  };
}
