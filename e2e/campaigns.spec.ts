import { expect, test, type Page } from '@playwright/test';

const header = (page: Page) => page.getByRole('banner');
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Kampagnen' });
const pick = (page: Page, name: string) => sheet(page).locator('.campaign-pick', { hasText: name });

async function openCampaigns(page: Page) {
  await header(page).getByRole('button', { name: /^Kampagne / }).click();
  await expect(sheet(page)).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Kampagnen: anlegen, wechseln, umbenennen, löschen; jede hat ihren eigenen Log', async ({ page }) => {
  await expect(header(page)).toContainText('Kampagne');
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.entry')).toHaveCount(1);

  await openCampaigns(page);
  await sheet(page).getByLabel('Neue Kampagne').fill('Spinward Run');
  await sheet(page).getByRole('button', { name: 'Anlegen' }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(header(page)).toContainText('Spinward Run');
  await expect(page.getByText('Noch nichts im Log.')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
  await expect(page.getByRole('article')).toHaveCount(0);

  await openCampaigns(page);
  await pick(page, 'Kampagne').click();
  await expect(header(page)).toContainText('Kampagne');
  await expect(page.getByRole('article')).toHaveCount(2);

  await openCampaigns(page);
  await sheet(page).getByLabel('Name der offenen Kampagne').fill('Aramis');
  await sheet(page).getByRole('button', { name: 'Umbenennen' }).click();
  await expect(header(page)).toContainText('Aramis');

  // Nach dem Neuladen ist dieselbe Kampagne offen.
  await page.reload();
  await expect(header(page)).toContainText('Aramis');

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
  expect(download.suggestedFilename()).toMatch(/^Kampagne-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();

  await sheet(page).locator('input[type=file]').setInputFiles(path);
  await expect(sheet(page)).toBeHidden();
  await openCampaigns(page);
  await expect(pick(page, 'Kampagne')).toHaveCount(2);
  await expect(pick(page, 'Offen · 2 Charaktere · 1 Logeintrag')).toBeVisible();

  await sheet(page).locator('input[type=file]').setInputFiles({ name: 'falsch.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(sheet(page).getByRole('alert')).toContainText('keine gültige Kampagnendatei');
});
