import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { land, openOracle, openSector, pickCapital, wuerfelgleich } from './layout';

/** Die Kampagnen-Verwaltung im Menü. */
async function openCampaigns(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
}

/**
 * Die Demo mit einer Nachbarwelt in Sprungweite der Yacht: exportiert, um Nachbar (0406, eine Kopie
 * der Werte von Kessra ohne Karte und Bahn) ergänzt und wieder importiert.
 */
async function withNeighbour(page: Page) {
  await page.goto('/');
  await openCampaigns(page);
  const sheet = page.getByRole('dialog', { name: 'Kampagnen' });
  const downloading = page.waitForEvent('download');
  await sheet.getByRole('button', { name: 'Kampagne exportieren' }).click();
  const file = JSON.parse(readFileSync(await (await downloading).path(), 'utf8')) as { campaign: { name: string; hexes: { row: number; main?: string; system?: unknown; worlds: Record<string, unknown>[] }[] } };
  const kessra = file.campaign.hexes.find((h) => h.main === '0405')!;
  const world = { ...kessra.worlds.find((w) => w.id === '0405')! };
  for (const key of ['map', 'moonOf', 'orbit', 'angle']) delete world[key];
  const { system: _s, ...hex } = kessra;
  void _s;
  file.campaign.hexes.push({ ...hex, row: kessra.row + 1, main: '0406', worlds: [{ ...world, id: '0406', name: 'Nachbar' }] });
  file.campaign.name = 'Handel';
  await sheet.locator('input[type=file]').setInputFiles({ name: 'handel.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(sheet).toBeHidden();
}

/** Lässt die Begegnungsprüfung aus (langes Drücken auf „Abbrechen“), wenn sie kommt. */
async function skipCheck(page: Page) {
  const check = page.getByRole('dialog', { name: 'Schiffsbegegnung' });
  if (!(await check.isVisible())) return;
  await check.getByRole('button', { name: 'Abbrechen' }).hover();
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await expect(check).toHaveCount(0);
}

test('Markt: Warenkarten mit den Handelscodes der Welt; Antippen würfelt Menge und Preis, Abbrechen lässt los', async ({ page }) => {
  await wuerfelgleich(page);
  await page.goto('/');
  await pickCapital(page);
  await page.getByRole('button', { name: 'Markt', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Markt · Kessra/ })).toBeVisible();
  // Kessra ist Ag und Ri: die Codes stehen oben, die passenden DMs der Waren sind markiert.
  await expect(page.locator('.trade-codes .dm-chip')).toHaveText(['Ag', 'Ri']);
  const cards = page.locator('.goods-card');
  await expect(cards).toHaveCount(3);
  await cards.first().click();
  await expect(cards.first().locator('.goods-percent')).toContainText('%');
  const dock = page.locator('.trade-actions');
  await expect(dock.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await dock.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(dock).toHaveCount(0);
  // Der Kaufpreis steht im Log.
  await page.getByRole('button', { name: /^Markt · Kessra schließen/ }).click();
  // Im Desktop-Modus steht das Log schon in der Seitenspalte.
  const log = page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Log', exact: true });
  if (await log.count()) await openOracle(page);
  await expect(page.getByText(/^Kaufpreis /).first()).toBeVisible();
});

test('Aufträge: Fracht annehmen, springen, landen – die Abrechnung kommt nach der Landung', async ({ page }) => {
  test.slow();
  await wuerfelgleich(page);
  await withNeighbour(page);
  await openSector(page);
  await page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: /^0406/ }).dispatchEvent('click');
  await page.getByRole('button', { name: 'Fracht', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fracht nach Nachbar' })).toBeVisible();
  const accept = page.getByRole('button', { name: /^Annehmen/ });
  await expect(accept).toHaveText(/Annehmen 0/);
  // Zu viel für den Laderaum: Annehmen gesperrt.
  const lots = page.locator('.trade-check');
  await lots.first().click();
  await lots.nth(1).click();
  await expect(accept).toBeDisabled();
  await lots.first().click();
  await lots.nth(1).click();
  // Das kleinste Los passt in die 11 t der Yacht.
  const names = await page.getByRole('checkbox').evaluateAll((boxes) => boxes.map((b) => b.closest('label')?.textContent ?? ''));
  const tons = names.map((n) => Number(/(\d+) t/.exec(n)?.[1] ?? 999));
  await lots.nth(tons.indexOf(Math.min(...tons))).click();
  await expect(accept).toHaveText(/Annehmen 1/);
  await accept.click();
  // Zurück an der Welt; die Fracht steht im Laderaum.
  await expect(page.getByRole('button', { name: 'Hierher reisen', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hierher reisen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Kessra → Nachbar/ });
  await dialog.getByRole('radio', { name: 'Eigenes Schiff' }).click();
  await dialog.getByRole('button', { name: /^Springen|^Reisen/ }).click();
  await skipCheck(page);
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await openOracle(page);
  const travelOn = page.getByRole('region', { name: 'Orakel und Proben' }).getByRole('button', { name: 'Weiterreisen' });
  const arrived = page.getByRole('dialog', { name: /Angekommen: Kessra → Nachbar/ });
  for (let i = 0; i < 10 && !(await arrived.isVisible()); i++) await travelOn.click();
  await expect(arrived).toBeVisible();
  // Bei der Ankunft noch keine Einnahmen.
  await expect(arrived.getByText('Einnahmen am Ziel')).toHaveCount(0);
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await skipCheck(page);
  await land(page);
  const settlement = page.getByRole('dialog', { name: 'Abrechnung in Nachbar' });
  await expect(settlement).toContainText(/Fracht \d+ t geliefert/);
  await settlement.getByRole('button', { name: 'Weiter' }).click();
  await expect(settlement).toHaveCount(0);
});
