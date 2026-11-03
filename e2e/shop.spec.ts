import { expect, test, type Page } from '@playwright/test';

/** Eine fertige Welt im Subsektor, lange gedrückt durchgewürfelt und Regina genannt; ihre Weltkarte bleibt offen. */
async function makeWorld(page: Page) {
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
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
    return page.getByRole('dialog', { name: `Regina · ${id}` });
  }
  throw new Error('Keine Welt entstanden');
}

test('Shop: ohne Aufenthaltsort nur die Kasse; Einnahme buchen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Shop' }).click();
  await expect(page.getByText('Die Gruppe ist auf keiner Welt.')).toBeVisible();
  await page.getByRole('spinbutton').first().fill('5000');
  await page.getByPlaceholder(/Belohnung/).fill('Belohnung von Dr. Halvek');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.000');
  await expect(page.locator('.shop-booking').first()).toContainText('Belohnung von Dr. Halvek');
});

test('Shop: auf einer Welt einkaufen und die Waffe in die Hand nehmen', async ({ page }) => {
  await page.goto('/');
  const world = await makeWorld(page);
  await world.getByRole('button', { name: 'Gruppe ist hier' }).click();
  await expect(world.getByRole('button', { name: 'Die Gruppe ist hier' })).toBeVisible();
  await world.getByRole('button', { name: 'Schließen' }).first().click();
  await expect(page.locator('.world-list-here')).toBeVisible();

  await page.getByRole('navigation').getByRole('button', { name: 'Shop' }).click();
  await expect(page.locator('.shop-world')).toContainText('Regina');
  await page.getByRole('radio', { name: 'Einzahlung' }).click();
  await page.getByRole('spinbutton').first().fill('1000');
  await page.getByRole('button', { name: 'Einzahlung buchen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 1.000');

  // Den Spear gibt es ab TL 0 auf jeder Welt; ab Gesetz 8 ist er verboten, kaufen geht trotzdem.
  await page.getByRole('button', { name: 'Spear kaufen' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /^(Kaufen|Trotzdem kaufen)$/ }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 990');
  await expect(page.locator('.shop-booking').first()).toContainText('1 × Spear für Kira Vant auf Regina');

  // Jonas verkauft seine Blade; vorgeschlagen ist der halbe Preis, Cr 25.
  await page.getByLabel('Aus dem Besitz von').selectOption({ label: 'Jonas Reyl' });
  await page.getByRole('button', { name: 'Blade verkaufen' }).click();
  const sale = page.getByRole('dialog', { name: 'Blade verkaufen' });
  await expect(sale.getByLabel('Erlös je Stück (Cr)')).toHaveValue('25');
  await sale.getByRole('button', { name: 'Verkaufen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 1.015');
  await expect(page.locator('.shop-booking').first()).toContainText('1 × Blade von Jonas Reyl auf Regina');

  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
  await page.getByRole('group', { name: 'Waffe in der Hand' }).getByRole('button', { name: /Spear/ }).click();
  await expect(page.getByRole('heading', { name: 'Spear' })).toBeVisible();
});
