import { expect, test } from '@playwright/test';

test('Begegnung: auf einer Welt wählen, einen NSC als Ziel nehmen, angreifen; ein NSC greift an', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  let world = undefined as undefined | ReturnType<typeof page.getByRole>;
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0808', '0109', '0210']) {
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).click();
    const button = page.locator('.sector-dock').getByRole('button', { name: /Vorkommen würfeln/ });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    if (await page.locator('.sector-dock').getByText('Kein System in diesem Feld').isVisible()) continue;
    const dialog = page.getByRole('dialog', { name: `Weltenerschaffung ${id}` });
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    world = page.getByRole('dialog', { name: `Regina · ${id}` });
    break;
  }
  await world!.getByRole('button', { name: 'Gruppe ist hier' }).click();
  await world!.getByRole('button', { name: 'Schließen' }).first().click();

  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
  await page.getByLabel('Begegnung wählen').selectOption('15');
  await expect(page.locator('.encounter-head')).toContainText('Thugs');
  const leader = page.locator('.npc').first();
  await expect(leader).toContainText('Anführer');

  // Kira zielt auf den Anführer; nur die Zeile seiner Rüstung ist wählbar.
  await leader.getByRole('button', { name: 'Ziel' }).click();
  await expect(page.locator('.combat-who')).toContainText('Ziel:');
  await page.locator('.combat-table tr.fixed .cell-button:not([disabled])').first().click();
  await page.getByRole('button', { name: 'Angreifen' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Kira Vant →');
  await dialog.click();
  await dialog.getByRole('button', { name: 'Weiter' }).click();

  // Ein Thug greift Kira an.
  const thug = page.locator('.npc').nth(1);
  await thug.getByRole('button', { name: 'Greift an' }).click();
  await expect(page.locator('.combat-who')).toContainText('greift Kira Vant an');
  await expect(page.getByRole('button', { name: /greift an$/ })).toBeVisible();

  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.getByRole('button', { name: 'Begegnung würfeln' })).toBeVisible();
});
