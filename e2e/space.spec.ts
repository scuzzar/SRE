import { expect, test } from '@playwright/test';
import { openHomeGlobe, openTab } from './layout';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Systemflug: Raumkarte öffnen, Schub im Schubkreis setzen, Runde ausführen, beenden', async ({ page }) => {
  // Die Demo-Kampagne hat einen Scout im Hafen von Kessra (2026-11-18c).
  await openHomeGlobe(page);
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

test('Werft und Raumkampf: der Beam Laser des Demo-Scouts, ein fremdes Schiff von Hand, Feuer auf es (2026-11-21g/d)', async ({ page }) => {
  await openHomeGlobe(page);
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Werft', exact: true }).click();
  const yard = page.getByRole('region', { name: 'Werft' });
  await expect(yard).toContainText('Bewaffnung von Kestrel');
  // Die Demo bringt einen Beam Laser mit; ausbauen fragt erst nach.
  await expect(yard).toContainText('Beam Laser ✕');
  await yard.getByRole('button', { name: 'Beam Laser ✕' }).click();
  await expect(yard.getByRole('button', { name: /ausbauen\? \(kein Erlös\)/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Starten', exact: true }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await card.getByRole('button', { name: 'Von Hand …' }).click();
  await card.getByRole('combobox', { name: 'Entwurf des fremden Schiffs' }).selectOption('A');
  await card.getByRole('combobox', { name: 'Absicht' }).selectOption('ignore');
  await card.getByRole('button', { name: 'Auftauchen lassen' }).click();
  await expect(card).toContainText('Free Trader');
  // Feuer wird ausgelöst, sofort, und die Würfe rollen im Vordergrund (2026-11-21i).
  await page.getByRole('button', { name: 'Feuer auf Free Trader' }).click();
  const volley = page.locator('.space-volley');
  await expect(volley).toBeVisible();
  await expect(volley).toContainText('Beam Laser');
  while (await volley.isVisible()) await volley.click();
  await expect(card).toContainText('Raumrunde 1');
  // Einmal je Raumrunde: Der Knopf ist aus (oder das Schiff ist schon zerstört).
  const fire = page.getByRole('button', { name: 'Feuer auf Free Trader' });
  if ((await fire.count()) > 0) await expect(fire).toBeDisabled();
  await page.getByRole('button', { name: 'Runde ausführen' }).click();
  await expect(card).toContainText('Raumrunde 2');
});
