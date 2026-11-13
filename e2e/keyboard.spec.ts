import { expect, test } from '@playwright/test';
import { characters, openOracle, oracle } from './layout';

// Tastatur: K zieht eine Karte, W würfelt 2W6, J fragt das Orakel; Esc schließt das oberste Popup.
// Gilt in beiden Layouts, auf dem Smartphone im Orakel-Screen.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openOracle(page);
});

test('W würfelt 2W6 und J fragt das Orakel; im Fragefeld gehören die Tasten dem Text', async ({ page }) => {
  await page.keyboard.press('w');
  await expect(oracle(page).locator('.entry').last()).toContainText('Würfel · 2W6');
  await expect(page.locator('.dice-roll')).toBeHidden();
  await page.keyboard.press('j');
  await expect(oracle(page).locator('.entry').last()).toContainText('Orakel');
  await expect(oracle(page).locator('.entry')).toHaveCount(2);

  const input = oracle(page).getByPlaceholder(/Frage, Deutung, Notiz/);
  await input.fill('');
  await input.pressSequentially('kwj');
  await expect(input).toHaveValue('kwj');
  await expect(oracle(page).locator('.entry')).toHaveCount(2);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('K zieht eine Karte, Esc verwirft sie; Esc schließt auch den Editor', async ({ page }) => {
  await page.keyboard.press('k');
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await expect(card).toBeVisible();
  // Solange die Karte offen ist, ziehen K und W nichts Neues.
  await page.keyboard.press('w');
  // Esc wirkt wie ein Tippen: Deckt die Karte sich noch auf, springt das erste Esc zum Ende,
  // das nächste verwirft sie.
  await expect(async () => {
    await page.keyboard.press('Escape');
    await expect(card).toBeHidden({ timeout: 500 });
  }).toPass();
  await expect(oracle(page).locator('.entry')).toHaveCount(0);

  await characters(page).getByRole('button', { name: 'Kira Vant bearbeiten' }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await expect(editor).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
});

test('Esc schließt das Ergebnis einer Probe wie „Weiter“', async ({ page }) => {
  await characters(page).getByRole('region', { name: 'Spielercharaktere' }).getByRole('article', { name: 'Kira Vant' }).getByRole('button', { name: 'Pilot-2' }).click();
  await page.keyboard.press('w');
  const result = page.getByRole('alertdialog');
  await expect(result.getByRole('button', { name: 'Weiter' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(result).toBeHidden();
  await expect(oracle(page).locator('.entry').last()).toContainText('Kira Vant · Pilot-2');
});
