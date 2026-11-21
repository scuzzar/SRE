import { expect, test } from '@playwright/test';
import { openHomeGlobe, openTab } from './layout';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Systemflug: Raumkarte öffnen, Schub im Schubkreis setzen, Runde ausführen, beenden', async ({ page }) => {
  // Die Demo-Kampagne hat eine Yacht im Hafen von Kessra (2026-11-21b; vorher ein Scout).
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toBeVisible();
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(card).toContainText('Kestrel · Yacht · 1 G');
  await expect(card).toContainText('kein Schub');

  // Das Schiff steht über der Welt; ein Tipp in seinen Schubkreis setzt den Schub vom Schiff zum Finger.
  const canvas = page.locator('canvas.globe-canvas');
  const box = (await canvas.boundingBox())!;
  const scale = Math.min(box.width, 0.6 * box.height) / 60_000;
  const ship = { x: box.x + box.width / 2, y: box.y + box.height / 2 - 0.17 * box.height - 11_200 * scale };
  await page.mouse.click(ship.x + 45, ship.y);
  await expect(card).toContainText(/0,5 G/);

  await page.getByRole('button', { name: 'Runde ausführen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  await expect(card).toContainText('kein Schub');

  await card.getByRole('button', { name: 'Systemflug beenden' }).click();
  await expect(page.getByRole('button', { name: 'Systemflug beginnen' })).toBeVisible();
  await page.getByRole('button', { name: 'Raumkarte schließen' }).first().click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toHaveCount(0);
});

test('Beiboot im Systemflug aussetzen und wieder andocken (2026-11-21b)', async ({ page }) => {
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await card.getByRole('button', { name: 'Beiboot 1 aussetzen' }).click();
  await expect(card).toContainText("Beiboot 1 · Ship's Boat · 6 G");
  await expect(card).toContainText('Die Gruppe ist an Bord von Beiboot 1');
  await card.getByRole('button', { name: 'Beiboot 1 andocken' }).click();
  await expect(card).toContainText('Kestrel · Yacht · 1 G');
  await expect(card.getByRole('button', { name: 'Beiboot 1 aussetzen' })).toBeVisible();
});

test('Systemflug aus dem Reiter Schiff: „Starten“ öffnet die Raumkarte, die Bedienung steht im Reiter Schiff (Owner, 21. November 2026)', async ({ page }) => {
  await openHomeGlobe(page);
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toBeVisible();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Schiff' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Runde ausführen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  // Raumkarte zu: Der Flug läuft weiter, „Zum Flug“ holt ihn zurück.
  await page.getByRole('button', { name: 'Raumkarte schließen' }).first().click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Zum Flug' }).click();
  await expect(card).toContainText('Raumrunde 2');
});

test('Raumkarte am Gasriesen: Kessra ist Mond eines Gasriesen; seine Raumkarte hat eigene Monde (2026-11-18d)', async ({ page }) => {
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  const choices = page.getByRole('group', { name: 'Raumkarte von' });
  await expect(choices.getByRole('button', { name: 'Kessra' })).toHaveAttribute('aria-pressed', 'true');
  await choices.getByRole('button', { name: 'Kleiner Gasriese' }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kleiner Gasriese' })).toBeVisible();
  await expect(page.getByText('Das Schiff startet auf einer Kreisbahn mit doppeltem Radius um Kleiner Gasriese.')).toBeVisible();
  // Der Systemflug darf am Gasriesen von der Welt der Gruppe aus beginnen.
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(card).toContainText('Kleiner Gasriese');
  await page.getByRole('button', { name: 'Runde ausführen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  await card.getByRole('button', { name: 'Systemflug beenden' }).click();
  await expect(page.getByRole('group', { name: 'Raumkarte von' })).toBeVisible();
});
