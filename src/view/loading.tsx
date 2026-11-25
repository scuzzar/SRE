import { useSyncExternalStore, type CSSProperties } from 'react';

// Reine Darstellung: ein kurzer Ladebalken für Arbeit, die die Seite eine Weile blockiert, etwa wenn
// eine Welt zum ersten Mal ihre Oberflächenkarte bekommt und der Globus seine Grafik aufbaut. Der
// Glanz auf dem Balken läuft als CSS-Animation weiter, auch während gerechnet wird.

interface Loading {
  readonly label: string;
  /** 0 bis 1. */
  readonly progress: number;
}

let current: Loading | undefined;
let owner: string | undefined;
const listeners = new Set<() => void>();

function set(next: Loading | undefined): void {
  current = next;
  for (const listener of listeners) listener();
}

/** Zeigt den Balken oder rückt ihn weiter; `who` übernimmt ihn (z. B. der Globus beim Aufbau). */
export function showLoading(label: string, progress: number, who?: string): void {
  if (who) owner = who;
  set({ label, progress: Math.max(current?.progress ?? 0, progress) });
}

/** Blendet den Balken aus; mit `who` nur, wenn er diesem gehört. */
export function hideLoading(who?: string): void {
  if (who && owner !== who) return;
  owner = undefined;
  set(undefined);
}

/** Zwei Bilder warten, damit der Balken zu sehen ist, bevor die Arbeit die Seite blockiert. */
export function afterPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/**
 * Für Eingaben, die eine Welt öffnen: erst den Balken zeigen, dann die Controller-Methode aufrufen.
 * Öffnet sie einen Globus, übernimmt dieser den Balken und blendet ihn aus, wenn er steht; sonst
 * verschwindet er gleich wieder.
 */
export function withLoading(label: string, action: () => void): void {
  owner = undefined;
  showLoading(label, 0.08);
  void afterPaint().then(() => {
    try {
      action();
    } finally {
      showLoading(label, 0.4);
      void afterPaint().then(() => {
        if (!owner) hideLoading();
      });
    }
  });
}

export function LoadingOverlay() {
  const loading = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
  if (!loading) return null;
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-card">
        <span className="loading-label">{loading.label}</span>
        <span className="loading-track" aria-hidden>
          <span className="loading-bar" style={{ '--progress': `${Math.max(0.04, loading.progress)}` } as CSSProperties} />
          <span className="loading-shine" />
        </span>
      </div>
    </div>
  );
}
