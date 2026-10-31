import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('Sektor: Hex-Karte, Weltenerschaffung Wurf für Wurf, Welt öffnen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  await expect(map.getByRole('button', { name: /nicht erzeugt/ })).toHaveCount(80);

  // Würfeln, bis eine Welt entsteht; ein leeres Feld lässt sich danach nicht mehr öffnen.
  let named = false;
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0808', '0109', '0210']) {
    await map.getByRole('button', { name: `${id}, nicht erzeugt: Welt erschaffen` }).click();
    const dialog = page.getByRole('dialog', { name: `Weltenerschaffung ${id}` });
    await expect(dialog.locator('.generation-prompt')).toHaveText('Gibt es hier eine Welt? Bei 4+ ja');
    await dialog.getByRole('button', { name: /Vorkommen würfeln/ }).click();
    if (await page.getByRole('dialog', { name: `Leer · ${id}` }).isVisible()) {
      await page.getByRole('button', { name: 'Schließen' }).last().click();
      await expect(map.getByRole('img', { name: `${id}, leer` })).toBeVisible();
      continue;
    }
    // „Später weiter“ behält die Welt in Erschaffung.
    await dialog.getByRole('button', { name: 'Später weiter' }).click();
    await map.getByRole('button', { name: `${id}, in Erschaffung: fortsetzen` }).click();
    for (let i = 0; i < 12 && (await dialog.locator('.generation-main').count()) > 0; i++) await dialog.locator('.generation-main').click();
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    const done = page.getByRole('dialog', { name: `Regina · ${id}` });
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-F]{6}-[0-9A-Z]/);
    await done.getByRole('button', { name: 'Schließen' }).first().click();
    await map.getByRole('button', { name: `${id}, Regina: Weltkarte öffnen` }).click();
    await expect(page.getByRole('dialog', { name: `Regina · ${id}` })).toBeVisible();
    await page.getByRole('button', { name: 'Schließen' }).first().click();
    await expect(page.locator('.world-list')).toContainText('Regina');
    named = true;
    break;
  }
  expect(named).toBe(true);
});
