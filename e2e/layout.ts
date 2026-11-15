import type { Page } from '@playwright/test';

// Wo etwas steht, hängt vom Layout ab: Auf dem Smartphone liegt unten das Ziehblatt mit den Reitern
// (Log ist einer davon) und der Reihe Notiz, 2W6, Karte; im Desktop-Modus steht links fest das
// Log-Panel mit dem Charakter oben, daneben der Bereich. Diese Helfer halten die Tests davon frei.

/** Der gerade gewählte Bereich: auf dem Smartphone der Inhalt des Ziehblatts, im Desktop-Modus das Panel neben dem Log. */
export const host = (page: Page) => page.locator('.screen-host');

/** Log und die Reihe Notiz, 2W6, Karte: das Log-Panel, sonst das Ziehblatt. */
export const oracle = (page: Page) => page.locator('.oracle-panel, .app:not(:has(.oracle-panel)) .tray');

/** Wo der Charakter oben steht: im Log-Panel, sonst im gewählten Reiter des Ziehblatts. */
export const characters = (page: Page) => page.locator('.oracle-panel, .app:not(:has(.oracle-panel)) .screen-host');

/** Zum Log mit dem Charakter oben wechseln. Im Desktop-Modus steht es links; ein offener Bereich daneben geht zu. */
export async function openOracle(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  // Erst wenn die App geladen ist, stehen die Reiter da; vorher lässt sich der Reiter nicht zählen.
  await nav.waitFor();
  const tab = nav.getByRole('button', { name: 'Log', exact: true });
  if ((await tab.count()) > 0) return tab.click();
  const close = page.locator('.area-head').getByRole('button', { name: /schließen$/ });
  if ((await close.count()) > 0) await close.click();
}

/**
 * Zieht das Ziehblatt ganz hoch (nur auf dem Smartphone), damit Gesten wie langes Drücken oder Ziehen
 * den ganzen Bereich erreichen. Im Desktop-Modus tut es nichts.
 */
export async function expandTray(page: Page) {
  const grip = page.locator('.tray-grip');
  if ((await grip.count()) === 0) return;
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, 0, { steps: 8 });
  await page.mouse.up();
}

/** Zum Subsektor: Er ist die Grundkarte, solange kein Globus offen ist; ✕ auf dem Globus führt hin. */
export async function openSector(page: Page) {
  const close = page.locator('.globe-full').getByRole('button', { name: 'Schließen', exact: true });
  if ((await close.count()) > 0) await close.click();
  await page.getByRole('group', { name: 'Karte des Subsektors' }).waitFor();
}

/** Die Einträge des Logs: das Neueste als Kasten, Älteres als Zeile; ohne die Trennzeilen der Spieltage. */
export const entries = (page: Page) => oracle(page).locator('.log ol > li:not(.log-day)');

/** Solange die Karte hereinkommt, beendet ein Tippen nur die Animation; das Tippen auf die Zählung tut sonst nichts. */
export async function revealed(card: ReturnType<Page['getByRole']>) {
  await card.locator('.sheet-foot .count').click();
}
