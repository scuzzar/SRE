import { livingCharacters, type Campaign } from './campaign';
import { currentEncounter, setDistance } from './encounter';
import { fightOrder, turnOf, withEncounter } from './fight';
import { CloudChanged, CloudOffline, type CampaignRepository, type Clock, type Cloud, type Download, type Keys, type Random, type TrayStop } from './ports';
import type { DeckPlan } from './ship';
import type { DeckMark, SyncMark } from './sync';
import { voyageDay } from './voyage';

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

/** Eine Zufallsquelle mit festem Startwert (mulberry32): gleichverteilt, aber in jedem Lauf gleich. */
export function seededRandom(seed: number): Random {
  let a = seed >>> 0 || 1;
  return {
    int(min, max) {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const u = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return min + Math.floor(u * (max - min + 1));
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
export function memoryCloud(signedIn = true): Cloud & { readonly files: Map<string, { text: string; revision: string }>; readonly deckFiles: Map<string, { text: string; revision: string }>; offline: boolean; user: string | undefined } {
  let counter = 0;
  const files = new Map<string, { text: string; revision: string }>();
  /** Die Deckplan-Dateien, unter „Entwurf/Platz“. */
  const deckFiles = new Map<string, { text: string; revision: string }>();
  const deckId = (design: string, name: string) => `${design}/${name}`;
  const cloud = {
    files,
    deckFiles,
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
    async listDeckPlans() {
      cloud.check();
      return [...deckFiles].map(([id, file]) => {
        const [design, name] = id.split('/') as [string, string];
        return { design, name, revision: file.revision };
      });
    },
    async readDeckPlan(design: string, name: string) {
      cloud.check();
      const file = deckFiles.get(deckId(design, name));
      return file && { ...file };
    },
    async writeDeckPlan(design: string, name: string, text: string, revision?: string) {
      cloud.check();
      if (deckFiles.get(deckId(design, name))?.revision !== revision) throw new CloudChanged();
      const next = `r${++counter}`;
      deckFiles.set(deckId(design, name), { text, revision: next });
      return next;
    },
    async removeDeckPlan(design: string, name: string, revision: string) {
      cloud.check();
      const file = deckFiles.get(deckId(design, name));
      if (file && file.revision !== revision) throw new CloudChanged();
      deckFiles.delete(deckId(design, name));
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
  trayStop: TrayStop | undefined;
  readonly marks: Map<string, SyncMark>;
  readonly deckPlans: DeckPlan[];
  readonly deckMarks: DeckMark[];
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
    deckPlans: [],
    async loadDeckPlans(design) {
      return this.deckPlans.filter((p) => p.design === design);
    },
    async saveDeckPlan(plan) {
      const at = this.deckPlans.findIndex((p) => p.design === plan.design && p.name === plan.name);
      if (at < 0) this.deckPlans.push(plan);
      else this.deckPlans[at] = plan;
    },
    async removeDeckPlan(design, name) {
      const at = this.deckPlans.findIndex((p) => p.design === design && p.name === name);
      if (at >= 0) this.deckPlans.splice(at, 1);
    },
    async listDeckPlans() {
      return [...this.deckPlans];
    },
    deckMarks: [],
    async loadDeckMarks() {
      return [...this.deckMarks];
    },
    async saveDeckMark(mark) {
      const at = this.deckMarks.findIndex((m) => m.design === mark.design && m.name === mark.name);
      if (at < 0) this.deckMarks.push(mark);
      else this.deckMarks[at] = mark;
    },
    async removeDeckMark(design, name) {
      const at = this.deckMarks.findIndex((m) => m.design === design && m.name === name);
      if (at >= 0) this.deckMarks.splice(at, 1);
    },
    async clearDeckMarks() {
      this.deckMarks.splice(0);
    },
    saved: initial.at(-1),
    campaigns: new Map(initial.map((c) => [c.id, c])),
    open: undefined,
    stripCollapsed: false,
    shopHintHidden: false,
    trayStop: undefined,
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
    async loadTrayStop() {
      return this.trayStop;
    },
    async saveTrayStop(stop) {
      this.trayStop = stop;
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

/** Reist unterwegs Tag für Tag weiter, bis die Gruppe ankommt (2026-11-22c); ohne Reise unterwegs bleibt alles. */
export function arriveNow(campaign: Campaign, clock: Clock = fixedClock()): Campaign {
  let c = campaign;
  for (let i = 0; i < 400 && c.voyage !== undefined; i++) c = voyageDay(c, clock).campaign;
  return c;
}

/** Die letzte Reise im Log (Sprung oder Reise im System); nach ihr stehen unterwegs die Reisetage. */
export function lastJourney(campaign: Campaign): Campaign['log'][number] | undefined {
  return campaign.log.findLast((e) => e.kind === 'journey' || e.kind === 'systemJourney');
}
