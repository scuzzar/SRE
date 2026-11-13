import { CloudChanged, type Cloud } from '../model';

interface Stored {
  user?: string;
  counter: number;
  files: Record<string, { text: string; revision: string }>;
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
      save({ counter: stored.counter, files: stored.files });
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
  };
}
