import { expect, test } from '@playwright/test';
import { characters, entries, openOracle, oracle } from './layout';

// Tastatur: K zieht eine Karte, W würfelt 2W6, N öffnet die Notiz; Esc schließt das oberste Popup.
// Gilt in beiden Layouts, auf dem Smartphone im Orakel-Screen.

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await openOracle(page);
});

test('W würfelt 2W6 und N öffnet die Notiz; im Textfeld gehören die Tasten dem Text, Esc schließt das Blatt', async ({ page }) => {
  await page.keyboard.press('w');
  await expect(entries(page).last()).toContainText('Würfel · 2W6');
  await expect(page.locator('.dice-roll')).toBeHidden();
  await page.keyboard.press('n');
  const sheet = page.getByRole('dialog', { name: 'Notiz' });
  const input = sheet.getByPlaceholder(/Was passiert/);
  await expect(input).toBeFocused();
  await input.pressSequentially('kwn');
  await expect(input).toHaveValue('kwn');
  await expect(entries(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(entries(page)).toHaveCount(1);
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
  await expect(entries(page)).toHaveCount(0);

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

// Die Würfelbühne (Begegnung, Fahrt, Überraschung): Esc springt erst zum Ergebnis und schließt dann
// wie „Weiter“ bzw. „Abbrechen“ (GUI-Handbuch, *Blatt im Vordergrund*).
test('Esc schließt die Würfelbühne einer Begegnung, sobald der Wurf steht', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  await page.getByRole('region', { name: 'Begegnung und Zeit' }).getByRole('button', { name: /Patron würfeln/ }).click();
  const roll = page.getByRole('dialog', { name: 'Patron' });
  await expect(roll).toContainText(/\d \(5\+ nötig\) · /);
  await page.keyboard.press('Escape');
  await expect(roll).toBeHidden();
});
