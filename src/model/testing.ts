import { livingCharacters, type Campaign } from './campaign';
import { currentEncounter, setDistance } from './encounter';
import { fightOrder, turnOf, withEncounter } from './fight';
import { CloudChanged, CloudOffline, type CampaignRepository, type Clock, type Cloud, type Download, type Keys, type Random } from './ports';
import type { SyncMark } from './sync';

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

/** Schlüssel für Tests: `key-1`, `key-2`, …, mit `prefix` davor unterscheidbar je Gerät. */
export function countingKeys(prefix = 'key'): Keys {
  let n = 0;
  return { next: () => `${prefix}-${++n}` };
}

/**
 * Eine Wolke im Arbeitsspeicher für Tests. Zwei Controller mit derselben Wolke sind zwei Geräte.
 * `offline` lässt jeden Zugriff scheitern; mit `signedIn = false` ist anfangs niemand angemeldet.
 */
export function memoryCloud(signedIn = true): Cloud & { readonly files: Map<string, { text: string; revision: string }>; offline: boolean; user: string | undefined } {
  let counter = 0;
  const files = new Map<string, { text: string; revision: string }>();
  const cloud = {
    files,
    offline: false,
    user: signedIn ? 'kira@example.com' : (undefined as string | undefined),
    check() {
      if (cloud.offline) throw new CloudOffline('offline');
    },
    async account() {
      return cloud.user;
    },
    async signIn() {
      cloud.user = 'kira@example.com';
    },
    async signOut() {
      cloud.user = undefined;
    },
    async list() {
      cloud.check();
      return [...files].map(([key, file]) => ({ key, revision: file.revision }));
    },
    async read(key: string) {
      cloud.check();
      const file = files.get(key);
      return file && { ...file };
    },
    async write(key: string, text: string, revision?: string) {
      cloud.check();
      if (files.get(key)?.revision !== revision) throw new CloudChanged();
      const next = `r${++counter}`;
      files.set(key, { text, revision: next });
      return next;
    },
    async remove(key: string, revision: string) {
      cloud.check();
      const file = files.get(key);
      if (file && file.revision !== revision) throw new CloudChanged();
      files.delete(key);
    },
  };
  return cloud;
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
  readonly marks: Map<string, SyncMark>;
} {
  return {
    marks: new Map(),
    async loadMarks() {
      return [...this.marks.values()];
    },
    async saveMark(mark) {
      this.marks.set(mark.key, mark);
    },
    async removeMark(key) {
      this.marks.delete(key);
    },
    async clearMarks() {
      this.marks.clear();
    },
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

/** Setzt die Entfernung aller SC, die kämpfen, frei auf ein Band; für Tests. */
export function allPcsAt(campaign: Campaign, band: number, close = false): Campaign {
  return livingCharacters(campaign).reduce((c, pc) => setDistance(c, pc.id, band, close), campaign);
}
