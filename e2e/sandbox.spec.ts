import { expect, test } from '@playwright/test';

// In einem abgeschotteten Rahmen ohne `allow-forms` (etwa die Vorschau in der Claude-App) sperrt der
// Browser das Abschicken von Formularen. Namen übernehmen und Speichern müssen trotzdem gehen.
test('Im abgeschotteten Rahmen: Welt benennen und Charakter speichern', async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}/" sandbox="allow-scripts allow-same-origin" style="border:0;width:390px;height:844px"></iframe>`);
  const app = page.frameLocator('iframe');

  await app.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = app.getByRole('group', { name: 'Karte des Subsektors' });
  let named = false;
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0808', '0109', '0210']) {
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).click();
    const button = app.locator('.sector-dock').getByRole('button', { name: /Vorkommen würfeln/ });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    if (await app.locator('.sector-dock').getByText('Kein System in diesem Feld').isVisible()) continue;
    const dialog = app.getByRole('dialog', { name: `Weltenerschaffung ${id}` });
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(app.getByRole('dialog', { name: `Regina · ${id}` })).toBeVisible();
    // Enter im Namensfeld übernimmt ebenso: Das prüft der Charakter unten.
    await app.getByRole('dialog', { name: `Regina · ${id}` }).getByRole('button', { name: 'Schließen' }).first().click();
    named = true;
    break;
  }
  expect(named).toBe(true);

  await app.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
  await app.locator('article', { hasText: 'Kira Vant' }).first().getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = app.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await editor.getByLabel('Name', { exact: true }).fill('Kira Vantos');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(editor).toBeHidden();
  await expect(app.getByText('Kira Vantos').first()).toBeVisible();

  await app.locator('article', { hasText: 'Kira Vantos' }).first().getByRole('button', { name: 'Bearbeiten' }).click();
  await editor.getByLabel('Name', { exact: true }).fill('Kira Vant');
  await editor.getByLabel('Name', { exact: true }).press('Enter');
  await expect(editor).toBeHidden();
});
