import type { Page } from '@playwright/test';

// Wo etwas steht, hängt vom Layout ab: Auf dem Smartphone liegt unten das Ziehblatt mit den Reitern
// (Log ist einer davon) und der Reihe Notiz, 2W6, Karte; im Desktop-Modus steht links eine Spalte
// mit denselben Reitern, darunter das Log oder an seiner Stelle der Bereich. Diese Helfer halten die
// Tests davon frei.

/** Der gerade gewählte Bereich: auf dem Smartphone der Inhalt des Ziehblatts, im Desktop-Modus der Inhalt der Seitenspalte. */
export const host = (page: Page) => page.locator('.screen-host');

/** Log und die Reihe Notiz, 2W6, Karte: die Seitenspalte, sonst das Ziehblatt. */
export const oracle = (page: Page) => page.locator('.side-panel, .app:not(:has(.side-panel)) .tray');

/** Wo der Charakter oben steht: im gewählten Reiter, im Ziehblatt wie in der Seitenspalte. */
export const characters = (page: Page) => page.locator('.screen-host');

/** Zum Log mit dem Charakter oben wechseln, über den Reiter Log. */
export async function openOracle(page: Page) {
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Log', exact: true }).click();
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

/** Einen der fünf Reiter wählen: Log, Begegnung, Kampf, Schiff, Charaktere. */
export async function openTab(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name, exact: true }).click();
}

/** In einem Reiter mit Umschalter oben (Begegnung, Charaktere) einen Teil wählen; der Reiter öffnet sich dafür, wenn nötig. */
export async function openPart(page: Page, area: 'Begegnung' | 'Charaktere', part: string) {
  const tab = page.getByRole('tablist', { name: area }).getByRole('tab', { name: part, exact: true });
  if ((await tab.count()) === 0) await openTab(page, area);
  await tab.click();
}

/** Im Reiter Charaktere oben auf SC, NSC oder Kasse umschalten. */
export const openPeople = (page: Page, part: 'SC' | 'NSC' | 'Kasse') => openPart(page, 'Charaktere', part);

/** Im Reiter Begegnung oben auf Kampf umschalten. */
export const openCombat = (page: Page) => openPart(page, 'Begegnung', 'Kampf');

/**
 * Den Shop öffnen: im Subsektor die Welt der Gruppe antippen (in der Demo Kessra, 0405) und an ihrer
 * Weltkarte „Einkaufen“. Ist ein Globus offen, geht es erst zum Subsektor.
 */
export async function openShop(page: Page, world = '0405') {
  await openSector(page);
  await page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: new RegExp(`^${world}`) }).dispatchEvent('click');
  await page.getByRole('button', { name: 'Einkaufen', exact: true }).click();
}
