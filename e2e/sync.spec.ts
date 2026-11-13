import { expect, test, type Page } from '@playwright/test';

// Der Abgleich gegen die Probe-Wolke im Browser: Zwei Seiten desselben Browsers mit eigenem Speicher
// (`geraet`) sind zwei Geräte an derselben Wolke. Die Anmeldung bei Microsoft prüft das nicht.

const header = (page: Page) => page.getByRole('banner');
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Kampagnen' });
const pick = (page: Page, name: string) => sheet(page).locator('.campaign-pick', { hasText: name });
const syncPanel = (page: Page) => sheet(page).locator('.sync');

async function openCampaigns(page: Page) {
  await header(page).getByRole('button', { name: /^Kampagne / }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await expect(sheet(page)).toBeVisible();
}

/** Wie oft die Probe-Wolke schon geschrieben wurde. */
const writes = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('sre-probe-wolke') ?? '{}') as { counter?: number }).counter ?? 0);

async function rollAndWaitForSync(page: Page) {
  const before = await writes(page);
  await page.getByRole('button', { name: '2W6' }).click();
  await expect.poll(() => writes(page)).toBeGreaterThan(before);
}

test('Abgleich: anmelden, zweites Gerät bekommt die Kampagne, Konflikt mit „Beide behalten“', async ({ page, context }) => {
  // Ohne Probe-Wolke ist der Abgleich in dieser Fassung nicht eingerichtet.
  await page.goto('/');
  await openCampaigns(page);
  await expect(syncPanel(page)).toContainText('nicht eingerichtet');

  // Handy: anmelden, eine Kampagne anlegen.
  const suffix = test.info().project.name;
  await page.goto(`/?probe-wolke&geraet=handy-${suffix}`);
  await openCampaigns(page);
  await expect(syncPanel(page)).toContainText('Nicht angemeldet');
  await syncPanel(page).getByRole('button', { name: 'Bei OneDrive anmelden' }).click();
  await expect(syncPanel(page)).toContainText('Angemeldet als Probe-Wolke');
  await expect(syncPanel(page)).toContainText('Abgeglichen um');
  await sheet(page).getByLabel('Neue Kampagne').fill('Spinward Run');
  await sheet(page).getByRole('button', { name: 'Anlegen' }).click();
  await expect(header(page)).toContainText('Spinward Run');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('sre-probe-wolke') ?? '')).toContain('Spinward Run');

  // Tablet: ist schon angemeldet und bekommt die Kampagnen beim Start.
  const tablet = await context.newPage();
  await tablet.goto(`/?probe-wolke&geraet=tablet-${suffix}`);
  await openCampaigns(tablet);
  await expect(pick(tablet, 'Spinward Run')).toBeVisible();
  await expect(sheet(tablet).locator('.campaign-pick')).toHaveCount(3);
  await pick(tablet, 'Spinward Run').click();
  await expect(header(tablet)).toContainText('Spinward Run');

  // Eine Änderung am Handy kommt beim nächsten Start aufs Tablet.
  await rollAndWaitForSync(page);
  await tablet.reload();
  await expect(tablet.locator('.entry')).toHaveCount(1);

  // Beide ändern: Das Tablet gleicht zuletzt ab und fragt.
  await rollAndWaitForSync(page);
  await tablet.getByRole('button', { name: '2W6' }).click();
  const conflict = sheet(tablet).getByRole('group', { name: 'Konflikt: Spinward Run' });
  await expect(conflict).toBeVisible();
  await expect(conflict).toContainText('2 Logeinträge');
  await conflict.getByRole('button', { name: 'Beide behalten' }).click();
  await expect(conflict).toBeHidden();
  await expect(pick(tablet, 'Spinward Run (Kopie)')).toBeVisible();
  await expect(sheet(tablet).locator('.campaign-pick')).toHaveCount(4);
  await expect(header(tablet)).toContainText('Spinward Run (Kopie)');

  // Das Handy bekommt die Kopie daneben, ohne Konflikt.
  await expect.poll(() => tablet.evaluate(() => localStorage.getItem('sre-probe-wolke') ?? '')).toContain('Spinward Run (Kopie)');
  await page.reload();
  await openCampaigns(page);
  await expect(pick(page, 'Spinward Run (Kopie)')).toBeVisible();
  await expect(sheet(page).getByRole('group', { name: /^Konflikt/ })).toHaveCount(0);

  // Abmelden lässt die Kampagnen, wo sie sind.
  await syncPanel(page).getByRole('button', { name: 'Abmelden' }).click();
  await expect(syncPanel(page)).toContainText('Nicht angemeldet');
  await expect(sheet(page).locator('.campaign-pick')).toHaveCount(4);
});
