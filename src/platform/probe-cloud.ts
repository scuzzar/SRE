import { CloudChanged, type Cloud } from '../model';

interface Stored {
  user?: string;
  counter: number;
  files: Record<string, { text: string; revision: string }>;
  /** Die Deckplan-Dateien unter „Entwurf/Platz“ (2026-11-17). */
  decks?: Record<string, { text: string; revision: string }>;
}

/**
 * Eine Probe-Wolke im `localStorage` des Browsers, zum Ausprobieren des Abgleichs ohne OneDrive und
 * für die GUI-Tests (Adresse mit `?probe-wolke`). Zwei Fenster desselben Browsers mit verschiedenen
 * Speichern (`&geraet=…`) verhalten sich wie zwei Geräte. Kein Ersatz für OneDrive: Sie verlässt den Browser nie.
 */
export function probeCloud(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage, name = 'sre-probe-wolke'): Cloud {
  const load = (): Stored => {
    try {
      return { counter: 0, files: {}, ...(JSON.parse(storage.getItem(name) ?? '{}') as Partial<Stored>) };
    } catch {
      return { counter: 0, files: {} };
    }
  };
  const save = (stored: Stored): void => storage.setItem(name, JSON.stringify(stored));
  return {
    async account() {
      return load().user;
    },
    async signIn() {
      save({ ...load(), user: 'Probe-Wolke' });
    },
    async signOut() {
      const stored = load();
      save({ counter: stored.counter, files: stored.files, ...(stored.decks ? { decks: stored.decks } : {}) });
    },
    async list() {
      return Object.entries(load().files).map(([key, file]) => ({ key, revision: file.revision }));
    },
    async read(key) {
      return load().files[key];
    },
    async write(key, text, revision) {
      const stored = load();
      if (stored.files[key]?.revision !== revision) throw new CloudChanged();
      const next = `r${stored.counter + 1}`;
      save({ ...stored, counter: stored.counter + 1, files: { ...stored.files, [key]: { text, revision: next } } });
      return next;
    },
    async remove(key, revision) {
      const stored = load();
      const file = stored.files[key];
      if (!file) return;
      if (file.revision !== revision) throw new CloudChanged();
      save({ ...stored, files: Object.fromEntries(Object.entries(stored.files).filter(([k]) => k !== key)) });
    },
    async listDeckPlans() {
      return Object.entries(load().decks ?? {}).map(([id, file]) => {
        const [design, name] = id.split('/') as [string, string];
        return { design, name, revision: file.revision };
      });
    },
    async readDeckPlan(design, name) {
      return load().decks?.[`${design}/${name}`];
    },
    async writeDeckPlan(design, name, text, revision) {
      const stored = load();
      const decks = stored.decks ?? {};
      if (decks[`${design}/${name}`]?.revision !== revision) throw new CloudChanged();
      const next = `r${stored.counter + 1}`;
      save({ ...stored, counter: stored.counter + 1, decks: { ...decks, [`${design}/${name}`]: { text, revision: next } } });
      return next;
    },
    async removeDeckPlan(design, name, revision) {
      const stored = load();
      const file = stored.decks?.[`${design}/${name}`];
      if (!file) return;
      if (file.revision !== revision) throw new CloudChanged();
      save({ ...stored, decks: Object.fromEntries(Object.entries(stored.decks ?? {}).filter(([k]) => k !== `${design}/${name}`)) });
    },
  };
}
