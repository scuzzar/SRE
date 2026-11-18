import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Systemflug: Raumkarte öffnen, Schub im Schubkreis setzen, Runde ausführen, beenden', async ({ page }) => {
  // Die Demo-Kampagne hat einen Scout im Hafen von Kessra (2026-11-18).
  await page.getByRole('button', { name: 'Aufenthaltsort Kessra, Globus öffnen' }).click();
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toBeVisible();
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(card).toContainText('Kestrel · Scout/Courier · 2 G');
  await expect(card).toContainText('kein Schub');

  // Das Schiff steht über der Welt; ein Tipp in seinen Schubkreis setzt den Schub vom Schiff zum Finger.
  const canvas = page.locator('canvas.globe-canvas');
  const box = (await canvas.boundingBox())!;
  const scale = Math.min(box.width, 0.6 * box.height) / 60_000;
  const ship = { x: box.x + box.width / 2, y: box.y + box.height / 2 - 0.17 * box.height - 11_200 * scale };
  await page.mouse.click(ship.x + 45, ship.y);
  await expect(card).toContainText(/1,0 G/);

  await page.getByRole('button', { name: 'Runde ausführen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  await expect(card).toContainText('kein Schub');

  await card.getByRole('button', { name: 'Systemflug beenden' }).click();
  await expect(page.getByRole('button', { name: 'Systemflug beginnen' })).toBeVisible();
  await page.getByRole('button', { name: 'Raumkarte schließen' }).first().click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toHaveCount(0);
});
