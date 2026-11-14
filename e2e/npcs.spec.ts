import { expect, test } from '@playwright/test';

// Der Reiter NSC: neue NSC mit Rolle, leer oder aus einer Laufbahn erzeugt; sie stehen dort nach
// Rolle gruppiert, mit Attributen, nicht mehr im Charakter-Screen.
test('Reiter NSC: leer anlegen mit Rolle, er steht unter seiner Rolle', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'NSC', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^(NSC auf |Alle NSC)/ })).toBeVisible();
  await expect(page.getByText(/Noch keine NSC/)).toBeVisible();
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  await page.getByRole('dialog', { name: 'Neuer NSC' }).getByLabel('Rolle').selectOption({ label: 'Kontakt' });
  await page.getByRole('button', { name: 'Leer anlegen' }).click();
  const editor = page.getByRole('dialog', { name: 'Neuer NSC' });
  await expect(editor.getByLabel('Rolle')).toHaveValue('contact');
  await editor.getByLabel('Name').fill('Mara Voss');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Kontakt' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Mara Voss, Kontakt' })).toContainText('STR 7 DEX 7');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Charaktere', exact: true }).click();
  await expect(page.getByText('Mara Voss')).toHaveCount(0);
});

test('Reiter NSC: aus einer Laufbahn erzeugen, danach steht er im Editor', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'NSC', exact: true }).click();
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  const sheet = page.getByRole('dialog', { name: 'Neuer NSC' });
  await sheet.getByLabel('Rolle').selectOption({ label: 'Feind' });
  await sheet.getByRole('button', { name: 'Army', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await expect(editor.getByLabel('Rolle')).toHaveValue('enemy');
  await expect(editor.getByLabel('Herkunft')).toHaveValue(/^Ex-Army/);
  await editor.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByRole('heading', { name: 'Feind' })).toBeVisible();
});
