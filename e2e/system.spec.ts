import { expect, test } from '@playwright/test';
import { openSector } from './layout';

test.use({ reducedMotion: 'reduce' });

test('Nebenwelt: aus der Systemübersicht öffnen, benennen, Oberfläche und Globus; Reise im System mit eigenem Schiff (2026-11-20d)', async ({ page }) => {
  await page.goto('/');
  await openSector(page);
  await page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: /^0405, Kessra: Weltkarte öffnen/ }).click();
  const kessra = page.getByRole('region', { name: 'Kessra · 0405' });
  const system = kessra.getByRole('region', { name: 'Sternsystem' });
  // Ein Tipp auf eine Welt der Übersicht öffnet ihre Weltkarte.
  await system.locator('.system-open').filter({ hasText: /^Welt / }).first().click();
  const sheet = page.locator('section[aria-label]').filter({ has: page.getByLabel('Name der Welt') }).first();
  await sheet.getByLabel('Name der Welt').fill('Tertius');
  await sheet.getByLabel('Name der Welt').blur();
  await expect(page.getByRole('region', { name: /^Tertius · 0405-/ })).toBeVisible();
  await page.getByRole('button', { name: 'Oberfläche würfeln' }).click();
  await expect(page.getByRole('region', { name: /^Tertius · 0405-/ }).getByRole('region', { name: 'Oberfläche' })).toBeVisible();
  await page.getByRole('button', { name: 'Globus erzeugen', exact: true }).click();
  const globe = page.getByRole('region', { name: 'Globus · Tertius' });
  await expect(globe).toBeVisible();
  // Schließen führt zum Subsektor; wieder an Kessra zeigt der Punkt am Namen, dass Tertius einen Globus hat.
  await globe.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: /^0405, Kessra: Weltkarte öffnen/ }).click();
  const tertius = kessra.getByRole('region', { name: 'Sternsystem' }).locator('.system-open').filter({ hasText: 'Tertius' });
  await expect(tertius.getByLabel('hat einen Globus')).toBeVisible();
  await tertius.click();

  // Hierher reisen: der Dialog der Reise im System, mit dem eigenen Schiff.
  await page.getByRole('button', { name: 'Hierher reisen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Reise im System: Kessra → Tertius/ });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('radio', { name: 'Eigenes Schiff' }).click();
  await expect(dialog).toContainText('Kestrel mit 2 G');
  await dialog.getByRole('button', { name: 'Reisen' }).click();
  await expect(page.getByRole('dialog', { name: /Angekommen: Kessra → Tertius/ })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
