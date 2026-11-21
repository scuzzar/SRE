import { expect, test } from '@playwright/test';
import { openSector } from './layout';

test.use({ reducedMotion: 'reduce' });

test('Nebenwelt aus dem Reiter System öffnen, benennen und mit dem eigenen Schiff hinreisen; dort entstehen Oberfläche und Globus, die Karte zeigt sie zuerst (2026-11-20d, 2026-11-21)', async ({ page }) => {
  await page.goto('/');
  await openSector(page);
  const kessraHex = page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: /^0405, Kessra: Weltkarte öffnen/ });
  await kessraHex.click();
  const kessra = page.getByRole('region', { name: 'Kessra · 0405' });
  // Das System ist ein eigener Reiter der Weltkarte; ein Tipp auf eine Welt öffnet ihre Weltkarte.
  await kessra.getByRole('tab', { name: 'System' }).click();
  await kessra.getByRole('region', { name: 'Sternsystem' }).locator('.system-open').filter({ hasText: /^Welt / }).first().click();
  const name = page.getByLabel('Name der Welt');
  await name.fill('Tertius');
  await name.blur();
  const tertius = page.getByRole('region', { name: /^Tertius · 0405-/ });
  await expect(tertius).toBeVisible();
  // Ohne Oberfläche kann man trotzdem hinreisen: Die Ankunft erzeugt sie.
  await expect(tertius.getByRole('region', { name: 'Oberfläche' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Hierher reisen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Reise im System: Kessra → Tertius/ });
  await dialog.getByRole('radio', { name: 'Eigenes Schiff' }).click();
  await expect(dialog).toContainText('Kestrel mit 2 G');
  await dialog.getByRole('button', { name: 'Reisen' }).click();
  await expect(page.getByRole('dialog', { name: /Angekommen: Kessra → Tertius/ })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter' }).click();

  // Im Subsektor öffnet das Feld jetzt zuerst die Welt der Gruppe, mit Oberfläche und Globus.
  await kessraHex.click();
  await expect(tertius.getByRole('region', { name: 'Oberfläche' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Öffnen', exact: true })).toBeVisible();
  await tertius.getByRole('tab', { name: 'System' }).click();
  await expect(tertius.getByRole('region', { name: 'Sternsystem' }).locator('.system-open').filter({ hasText: 'Tertius' }).getByLabel('hat einen Globus')).toBeVisible();
  await page.getByRole('button', { name: 'Öffnen', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Globus · Tertius' })).toBeVisible();
});
