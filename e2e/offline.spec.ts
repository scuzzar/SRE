import { expect, test } from '@playwright/test';

// Installieren: Manifest mit PNG-Icons, und der Service Worker lässt die App ohne Netz starten.

test('Manifest und Icons: alle Icons sind da, eines davon maskierbar', async ({ page, request }) => {
  await page.goto('/');
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifestUrl = new URL(manifestHref!, page.url());
  const manifest = (await (await request.get(manifestUrl.href)).json()) as {
    icons: { src: string; sizes: string; type: string; purpose: string }[];
  };

  expect(manifest.icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  const appleHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  for (const src of [...manifest.icons.map((icon) => icon.src), appleHref!]) {
    const response = await request.get(new URL(src, manifestUrl).href);
    expect(response.ok(), src).toBe(true);
  }
});

test('Offline: nach dem ersten Start lädt die App ohne Netz, mit ihrem Spielstand', async ({ page, context }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.entry')).toHaveCount(1);
  // Warten, bis der Service Worker die App abgelegt hat und die Seite steuert.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('banner')).toContainText('Kampagne');
  await expect(page.locator('.entry')).toHaveCount(1);
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.entry')).toHaveCount(2);
});
