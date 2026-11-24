import { expect, test, type Page } from '@playwright/test';

// Wo etwas steht, hängt vom Layout ab: Auf dem Smartphone liegt unten das Ziehblatt mit den Reitern
// (Log ist einer davon) und der Reihe Notiz, 2W6, Karte; im Desktop-Modus steht links eine Spalte
// mit denselben Reitern, darunter das Log oder an seiner Stelle der Bereich. Diese Helfer halten die
// Tests davon frei.

/**
 * Zeit für schwere Läufe (Globus, Shop mit vielen Gegenständen, Raumkarte). Lokal gilt der
 * Wert; auf dem Runner, wo die Suite auf zwei Kernen läuft und die App als ein Bundle lädt, das
 * Dreifache. Ein `test.setTimeout` allein überschreibt nämlich die Zeit aus
 * `playwright.config.ts` – und die ist auf dem Runner höher als die Grundzeit hier.
 */
export function schwererLauf(ms: number) {
  test.setTimeout(process.env.CI ? ms * 3 : ms);
}

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
 * Der Knopf ⌖ öffnet die Weltkarte des Aufenthaltsorts und, hat sie einen, den Globus; sonst erzeugt
 * ihn „Globus erzeugen“ (2026-11-20d: der Globus entsteht nur auf Knopfdruck).
 */
export async function openHomeGlobe(page: Page) {
  await page.getByRole('button', { name: /^Aufenthaltsort .*Globus öffnen/ }).click();
  const create = page.getByRole('button', { name: 'Globus erzeugen' });
  await expect(page.locator('.globe-full').or(create).first()).toBeVisible();
  const created = await create.isVisible();
  if (created) await create.click();
  await page.locator('.loading-overlay').waitFor({ state: 'detached', timeout: 30_000 });
  await expect(page.locator('.globe-full')).toBeVisible();
  // Mit dem neuen Globus wählt die Gruppe zuerst ihren Landeplatz (2026-11-21).
  if (created) await land(page);
  else await landAtFirstPort(page);
}

/** Fragt die App nach dem Landeplatz (2026-11-21), landet die Gruppe am ersten Hafen. */
export async function landAtFirstPort(page: Page) {
  const dialog = page.getByRole('dialog', { name: /^Landeplatz auf / });
  if (await dialog.isVisible()) await land(page);
}

/**
 * Wartet auf den Dialog Landeplatz (2026-11-21) und landet am ersten Hafen; hat die Welt keinen, an
 * einem beliebigen Ort (Mitte des Globus, „Hier landen“).
 */
export async function land(page: Page) {
  const dialog = page.getByRole('dialog', { name: /^Landeplatz auf / });
  await dialog.waitFor();
  const ports = dialog.getByRole('group', { name: 'Häfen' }).getByRole('button');
  if ((await ports.count()) > 0) {
    await ports.first().click();
  } else {
    await dialog.getByRole('button', { name: /Anderer Ort/ }).click();
    await page.locator('.loading-overlay').waitFor({ state: 'detached', timeout: 30_000 });
    const canvas = page.locator('.globe-full').getByRole('img', { name: /^Globus von / });
    const box = (await canvas.boundingBox())!;
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
    await page.getByRole('region', { name: 'Landeplatz' }).getByRole('button', { name: 'Hier landen' }).click();
  }
  await expect(dialog).toHaveCount(0);
}

/** Auf dem Globus des Aufenthaltsorts die Hauptstadt antippen (über „Orte“); öffnet erst den Globus, wenn nötig. */
export async function pickCapital(page: Page) {
  const globe = page.locator('.globe-full');
  if ((await globe.count()) === 0) await openHomeGlobe(page);
  await page.locator('.loading-overlay').waitFor({ state: 'detached', timeout: 30_000 });
  await page.locator('.globe-full').getByRole('button', { name: /^Orte/ }).click();
  await page.getByRole('region', { name: 'Orte' }).getByRole('button').filter({ has: page.locator('.globe-dot.capital') }).click();
}

/** Den Shop öffnen: Einkaufen geht nur in einer Stadt, also die Hauptstadt des Aufenthaltsorts antippen und dort „Einkaufen“. */
export async function openShop(page: Page) {
  await pickCapital(page);
  await page.getByRole('button', { name: 'Einkaufen', exact: true }).click();
}
