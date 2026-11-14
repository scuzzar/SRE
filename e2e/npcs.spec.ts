import { expect, test } from '@playwright/test';

// Der Reiter NSC: ein neuer NSC aus dem Reiter, mit Rolle; er steht dort nach Rolle gruppiert,
// nicht mehr im Charakter-Screen.
test('Reiter NSC: neuen NSC mit Rolle anlegen, er steht unter seiner Rolle', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'NSC', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^(NSC auf |Alle NSC)/ })).toBeVisible();
  await expect(page.getByText(/Noch keine NSC/)).toBeVisible();
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neuer NSC' });
  await dialog.getByLabel('Name').fill('Mara Voss');
  await dialog.getByLabel('Rolle').selectOption({ label: 'Kontakt' });
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Kontakt' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Mara Voss, Kontakt' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Charaktere', exact: true }).click();
  await expect(page.getByText('Mara Voss')).toHaveCount(0);
});
