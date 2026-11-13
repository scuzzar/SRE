import { useEffect, useRef } from 'react';

// Tastaturbedienung, reine Darstellung: Die Tasten lösen dieselben Knöpfe bzw. Handler aus wie ein
// Klick, der Controller sieht keinen Unterschied.

/** Ob gerade in ein Feld getippt wird; dann gehören die Tasten dem Feld, nicht den Kürzeln. */
function typing(e: KeyboardEvent): boolean {
  const el = e.target;
  return el instanceof HTMLElement && (el.isContentEditable || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement);
}

/** Das oberste offene Popup (Blätter und Ergebnisse); später geöffnete stehen im DOM weiter hinten. */
function topDialog(): HTMLElement | undefined {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]');
  return all[all.length - 1];
}

/** Ob ein Popup oder das Menü offen ist; dann gelten die Kürzel für Orakel und Bereiche nicht. */
function overlayOpen(): boolean {
  return topDialog() !== undefined || document.querySelector('.menu-layer') !== null;
}

/**
 * Ein Kürzel ohne Zusatztaste, solange weder getippt wird noch ein Popup offen ist. Der Handler wird
 * bei jedem Zeichnen neu übernommen, damit er immer den aktuellen Stand sieht.
 */
export function useShortcuts(handlers: Readonly<Record<string, () => void>>): void {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || typing(e) || overlayOpen()) return;
      const run = latest.current[e.key.toLowerCase()];
      if (!run) return;
      e.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

/**
 * Esc schließt das oberste Popup: Es drückt den Knopf, der dort mit `data-escape` markiert ist
 * (Schließen, Abbrechen, Weiter), wie ein Klick. Popups, die nur entschieden werden können (etwa
 * Wunden verteilen), haben keinen solchen Knopf; läuft dort noch ein Wurf, springt Esc wie ein
 * Tippen auf das Popup zum Ergebnis. Das Menü schließt sich selbst.
 */
export function useEscapeCloses(menuOpen: boolean): void {
  const menu = useRef(menuOpen);
  useEffect(() => {
    menu.current = menuOpen;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || menu.current) return;
      const dialog = topDialog();
      if (!dialog) return;
      e.preventDefault();
      const buttons = dialog.querySelectorAll<HTMLButtonElement>('button[data-escape]:not(:disabled)');
      const button = buttons[buttons.length - 1];
      (button ?? dialog).click();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
