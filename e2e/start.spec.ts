import { expect, test } from '@playwright/test';

test('die App startet', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Solo RPG Engine' })).toBeVisible();
});
