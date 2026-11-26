import { expect, test, type Page } from '@playwright/test';
import { land, openOracle, openSector } from './layout';

test.use({ reducedMotion: 'reduce' });

test('Nebenwelt aus dem Unterreiter System öffnen, benennen und mit dem eigenen Schiff hinreisen; dort entsteht der Globus, die Karte zeigt sie zuerst (2026-11-20d, 2026-11-21)', async ({ page }) => {
  await page.goto('/');
  await openSector(page);
  const kessraHex = page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: /^0405, Kessra: Weltkarte öffnen/ });
  await kessraHex.click();
  const kessra = page.getByRole('region', { name: 'Kessra · 0405' });
  // Das System ist ein eigener Unterreiter der Weltkarte; ein Tipp auf eine Welt öffnet ihre Weltkarte.
  await kessra.getByRole('tab', { name: 'System' }).click();
  await kessra.getByRole('region', { name: 'Sternsystem' }).locator('.system-open').filter({ hasText: /^Welt / }).first().click();
  const name = page.getByLabel('Name der Welt');
  await name.fill('Tertius');
  await name.blur();
  const tertius = page.getByRole('region', { name: /^Tertius · 0405-/ });
  await expect(tertius).toBeVisible();
  // Die Oberfläche kam mit der Welt (21. November 2026), den Globus gibt es noch nicht: Die Ankunft erzeugt ihn.
  await expect(tertius.getByRole('region', { name: 'Oberfläche' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Oberfläche würfeln' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Globus erzeugen', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Hierher reisen', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Reise im System: Kessra → Tertius/ });
  await dialog.getByRole('radio', { name: 'Eigenes Schiff' }).click();
  await expect(dialog).toContainText('Kestrel mit 1 G');
  await dialog.getByRole('button', { name: 'Reisen' }).click();
  // Mit dem eigenen Schiff erst die Begegnungsprüfung beim Start (2026-11-22b): Zielwert, und lang
  // gedrücktes „Abbrechen“ lässt den Wurf aus.
  const check = page.getByRole('dialog', { name: 'Schiffsbegegnung' });
  await expect(check).toContainText('Start von Kessra');
  await expect(check).toContainText(/Schiff bei \d/);
  await skipCheck(page);
  // Unterwegs (2026-11-22c): Die Tage vergehen mit „Weiterreisen“ in der Aktionsleiste unter dem Log.
  await expect(page.getByRole('dialog', { name: /Unterwegs: Kessra → Tertius/ })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  await openOracle(page);
  const travelOn = page.getByRole('region', { name: 'Orakel und Proben' }).getByRole('button', { name: 'Weiterreisen' });
  for (let i = 0; i < 30 && !(await page.getByRole('dialog', { name: /Angekommen: Kessra → Tertius/ }).isVisible()); i++) await travelOn.click();
  await expect(page.getByRole('dialog', { name: /Angekommen: Kessra → Tertius/ })).toBeVisible();
  await page.getByRole('button', { name: 'Weiter', exact: true }).click();
  // Danach die Prüfung der Ankunft.
  await expect(check).toContainText('Ankunft in Tertius');
  await skipCheck(page);
  // Mit dem eigenen Schiff gelandet: Der Dialog Landeplatz bietet auch einen beliebigen Ort (2026-11-21).
  const landing = page.getByRole('dialog', { name: 'Landeplatz auf Tertius' });
  await expect(landing.getByRole('button', { name: /Anderer Ort/ })).toBeVisible();
  await land(page);
  // Ohne Hafen landet die Gruppe auf dem Globus; der bleibt dann offen.
  const tertiusGlobe = page.getByRole('region', { name: 'Globus · Tertius' });
  if (await tertiusGlobe.isVisible()) await tertiusGlobe.getByRole('button', { name: 'Schließen', exact: true }).click();

  // Im Subsektor öffnet das Feld jetzt zuerst die Welt der Gruppe, mit Oberfläche und Globus.
  await kessraHex.click();
  await expect(tertius.getByRole('region', { name: 'Oberfläche' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Öffnen', exact: true })).toBeVisible();
  await tertius.getByRole('tab', { name: 'System' }).click();
  await expect(tertius.getByRole('region', { name: 'Sternsystem' }).locator('.system-open').filter({ hasText: 'Tertius' }).getByLabel('hat einen Globus')).toBeVisible();
  await page.getByRole('button', { name: 'Öffnen', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Globus · Tertius' })).toBeVisible();
});

/** Lang gedrücktes „Abbrechen“ in der Begegnungsprüfung: Der Wurf fällt aus. */
async function skipCheck(page: Page): Promise<void> {
  await page.getByRole('dialog', { name: 'Schiffsbegegnung' }).getByRole('button', { name: 'Abbrechen' }).hover();
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Schiffsbegegnung' })).toHaveCount(0);
}
