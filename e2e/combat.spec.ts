import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
});

test('Kampf: Kira zieht die Pistole, wählt das Ziel in der Tabelle und greift an', async ({ page }) => {
  const weapons = page.getByRole('group', { name: 'Waffe in der Hand' });
  await expect(weapons.getByRole('button', { name: /Hände/ })).toHaveAttribute('aria-pressed', 'true');
  await weapons.getByRole('button', { name: /Automatic Pistol/ }).click();
  await expect(page.getByRole('heading', { name: 'Automatic Pistol' })).toBeVisible();

  // Auto Pistol-1 +1, DEX A +1, Jack +1, Short +2 → 8 − 5 = 3+.
  await expect(page.getByRole('button', { name: 'Angreifen' })).toBeDisabled();
  await page.getByRole('button', { name: 'Jack, Short: braucht 3+, 97 %' }).click();
  await expect(page.getByRole('button', { name: 'Jack, Short: braucht 3+, 97 %' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Very Long: kein Angriff').first()).toBeVisible();

  await page.getByRole('button', { name: 'Angreifen' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Angriff');
  await dialog.click();
  const verdict = await dialog.getByRole('heading').textContent();
  if (verdict === 'TREFFER') {
    await dialog.getByRole('button', { name: 'Schaden würfeln (3W6)' }).click();
    // Der Schaden rollt im Vordergrund; ein Tippen überspringt, ein zweites schließt.
    const roll = page.locator('.dice-roll');
    await expect(roll).toContainText('SCHADEN · Automatic Pistol · 3W6');
    await roll.click();
    await roll.click();
    await expect(roll).toBeHidden();
    await expect(page.locator('.combat-recent-item').first()).toContainText(/Schaden 3W6: [1-6] \+ [1-6] \+ [1-6] = \d+/);
  } else {
    await dialog.getByRole('button', { name: 'Weiter' }).click();
    await expect(page.locator('.combat-recent-item').first()).toContainText('DANEBEN');
  }

  await page.getByRole('navigation').getByRole('button', { name: 'Orakel' }).click();
  await expect(page.locator('.entry').last()).toContainText('Kira Vant · Automatic Pistol · Jack, Short');
});

test('Kampf: die Tabelle passt auf ein Handy, ohne seitlich zu scrollen', async ({ page }) => {
  const table = (await page.locator('.combat-table').boundingBox())!;
  expect(table.x).toBeGreaterThanOrEqual(0);
  expect(table.x + table.width).toBeLessThanOrEqual(390);
  const attack = (await page.getByRole('button', { name: 'Angreifen' }).boundingBox())!;
  expect(attack.y + attack.height).toBeLessThanOrEqual(844);
});
