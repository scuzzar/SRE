import { expect, test, type Page } from '@playwright/test';

// Zwei Fenster derselben App auf einem Gerät: Nur eines speichert (Web Locks); und was nach einer
// Eingabe schiefgeht, steht als Meldung da.

const elsewhere = (page: Page) => page.getByRole('alertdialog', { name: 'In einem anderen Fenster offen' });

test('Ein zweites Fenster speichert nicht, bis es übernimmt; dann steht das erste still', async ({ page, context }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Bereiche' })).toBeVisible();
  // Neu laden ist kein zweites Fenster.
  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Bereiche' })).toBeVisible();
  await page.waitForTimeout(2000);
  await expect(elsewhere(page)).toHaveCount(0);

  const second = await context.newPage();
  await second.goto('/');
  await expect(elsewhere(second)).toBeVisible();
  await second.getByRole('button', { name: 'Hier weiterspielen' }).click();
  await expect(elsewhere(second)).toHaveCount(0);
  await expect(elsewhere(page)).toBeVisible();
});

test('Ein Fehler, den niemand auffängt, steht oben als Meldung; ✕ nimmt sie weg', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Bereiche' })).toBeVisible();
  await page.evaluate(() => setTimeout(() => {
    throw new Error('Probefehler');
  }));
  const notice = page.locator('.notice-toast');
  await expect(notice).toContainText('Das ging nicht: Probefehler');
  await notice.getByRole('button', { name: 'Hinweis schließen' }).click();
  await expect(notice).toHaveCount(0);
});
