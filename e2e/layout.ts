import type { Page } from '@playwright/test';

// Wo etwas steht, hängt vom Layout ab: Auf dem Smartphone ist das Orakel ein eigener Bereich und die
// Charaktere stehen als Leiste oben im Screen; im Desktop-Modus stehen Orakel und Charakterspalte
// links neben jedem Bereich. Diese Helfer halten die Tests davon frei.

/** Der gerade gewählte Bereich: auf dem Smartphone der ganze Screen, im Desktop-Modus die Fläche links. */
export const host = (page: Page) => page.locator('.screen-host');

/** Das Orakel mit Log und Dock: die Orakel-Spalte, sonst der Orakel-Screen. */
export const oracle = (page: Page) => page.locator('.oracle-panel, .app:not(:has(.oracle-panel)) .screen-host');

/** Wo die Charaktere stehen: die Charakterspalte, sonst die Leiste im Screen. */
export const characters = (page: Page) => page.locator('.character-panel, .app:not(:has(.character-panel)) .screen-host');

/**
 * Zum Orakel mit den Charakteren wechseln. Im Desktop-Modus gibt es den Reiter nicht: Orakel und
 * Charakterspalte stehen neben jedem Bereich, nur nicht neben dem Bereich Charaktere; von dort geht
 * es zur Begegnung.
 */
export async function openOracle(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  // Erst wenn die App geladen ist, steht die Leiste da; vorher lässt sich der Reiter nicht zählen.
  await nav.waitFor();
  const tab = nav.getByRole('button', { name: 'Orakel', exact: true });
  if ((await tab.count()) > 0) return tab.click();
  const characters = nav.getByRole('button', { name: 'Charaktere', exact: true });
  if ((await characters.getAttribute('aria-current')) === 'page') await nav.getByRole('button', { name: 'Begegnung', exact: true }).click();
}
