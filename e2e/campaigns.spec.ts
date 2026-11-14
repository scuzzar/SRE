import { expect, test, type Page } from '@playwright/test';
import { host } from './layout';

const header = (page: Page) => page.getByRole('banner');
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Kampagnen' });
const pick = (page: Page, name: string) => sheet(page).locator('.campaign-pick', { hasText: name });

async function openCampaigns(page: Page) {
  await header(page).getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await expect(sheet(page)).toBeVisible();
}

/** Der Name der offenen Kampagne steht oben im Menü. */
async function expectCampaign(page: Page, name: string) {
  await header(page).getByRole('button', { name: 'Menü', exact: true }).click();
  await expect(page.locator('.menu-campaign')).toContainText(name);
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Menü schließen' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Kampagnen: anlegen, wechseln, umbenennen, löschen; jede hat ihren eigenen Log', async ({ page }) => {
  await expectCampaign(page, 'Kampagne');
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.entry')).toHaveCount(1);

  await openCampaigns(page);
  await sheet(page).getByLabel('Neue Kampagne').fill('Spinward Run');
  await sheet(page).getByRole('button', { name: 'Anlegen' }).click();
  await expect(sheet(page)).toBeHidden();
  await expectCampaign(page, 'Spinward Run');
  await expect(page.getByText('Noch nichts im Log.')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
  await expect(host(page).getByRole('article')).toHaveCount(0);

  await openCampaigns(page);
  await pick(page, 'Kampagne').click();
  await expectCampaign(page, 'Kampagne');
  await expect(host(page).getByRole('article')).toHaveCount(2);

  await openCampaigns(page);
  await sheet(page).getByLabel('Name der offenen Kampagne').fill('Aramis');
  await sheet(page).getByRole('button', { name: 'Umbenennen' }).click();
  await sheet(page).getByRole('button', { name: 'Schließen' }).click();
  await expectCampaign(page, 'Aramis');

  // Nach dem Neuladen ist dieselbe Kampagne offen.
  await page.reload();
  await expectCampaign(page, 'Aramis');

  await openCampaigns(page);
  await sheet(page).getByRole('button', { name: 'Spinward Run löschen' }).click();
  await sheet(page).getByRole('button', { name: 'Löschen?' }).click();
  await expect(pick(page, 'Spinward Run')).toHaveCount(0);
  await expect(sheet(page).getByRole('button', { name: 'Aramis löschen' })).toBeDisabled();
});

test('Kampagne exportieren kommt als Download, Import legt sie neu an', async ({ page }) => {
  await page.getByRole('button', { name: '2W6' }).click();
  await openCampaigns(page);
  const downloading = page.waitForEvent('download');
  await sheet(page).getByRole('button', { name: 'Kampagne exportieren' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^Demo-Kampagne-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();

  await sheet(page).locator('input[type=file]').setInputFiles(path);
  await expect(sheet(page)).toBeHidden();
  await openCampaigns(page);
  await expect(pick(page, 'Kampagne')).toHaveCount(2);
  await expect(pick(page, 'Offen · 2 Charaktere · 1 Logeintrag')).toBeVisible();

  await sheet(page).locator('input[type=file]').setInputFiles({ name: 'falsch.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(sheet(page).getByRole('alert')).toContainText('keine gültige Kampagnendatei');
});

test('Ohne dauerhaften Speicher steht oben ein Hinweis', async ({ page }) => {
  // Ohne IndexedDB (etwa bei einer lokal geöffneten Datei auf manchen Handys) läuft die App im Arbeitsspeicher.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('speichert hier nichts dauerhaft');
});

test('Mit dauerhaftem Speicher gibt es den Hinweis nicht', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation')).toBeVisible();
  await expect(page.getByText('speichert hier nichts dauerhaft')).toHaveCount(0);
});
