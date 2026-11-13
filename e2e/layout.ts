import type { Page } from '@playwright/test';

// Wo etwas steht, hängt vom Layout ab: Auf dem Smartphone ist das Orakel ein eigener Bereich, im
// Desktop-Modus die Spalte rechts neben jedem Bereich. Diese Helfer halten die Tests davon frei.

/** Der gerade gewählte Bereich: auf dem Smartphone der ganze Screen, im Desktop-Modus die Fläche links. */
export const host = (page: Page) => page.locator('.screen-host');

/** Das Orakel mit Charakterleiste, Log und Dock: die Orakel-Spalte, sonst der Orakel-Screen. */
export const oracle = (page: Page) => page.locator('.oracle-panel, .app:not(:has(.oracle-panel)) .screen-host');

/** Zum Orakel wechseln; im Desktop-Modus steht es schon da, dort gibt es den Reiter nicht. */
export async function openOracle(page: Page) {
  const tab = page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Orakel', exact: true });
  if ((await tab.count()) > 0) await tab.click();
}
