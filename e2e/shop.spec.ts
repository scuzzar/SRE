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

test('Shop: Die Demo-Kampagne steht auf Kessra; eine neue Kampagne ist auf keiner Welt und hat nur die Kasse', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Shop' }).click();
  await expect(page.locator('.shop-world')).toContainText('Kessra');
  await expect(page.getByRole('tab', { name: 'Waffen' })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('banner').getByRole('button', { name: /^Kampagne / }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  const sheet = page.getByRole('dialog', { name: 'Kampagnen' });
  await sheet.getByLabel('Neue Kampagne').fill('Leer');
  await sheet.getByRole('button', { name: 'Anlegen' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Shop' }).click();
  await expect(page.getByText('Auf keiner Welt', { exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Kasse' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('spinbutton').first().fill('5000');
  await page.getByPlaceholder(/Belohnung/).fill('Belohnung von Dr. Halvek');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.000');
  await expect(page.locator('.shop-booking').first()).toContainText('Belohnung von Dr. Halvek');
});

test('Shop: auf Kessra mit einem Tipp kaufen, Verbotenes erst nach Rückfrage, verkaufen und die Waffe in die Hand nehmen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Shop' }).click();
  await expect(page.locator('.shop-world')).toContainText('Kessra');
  // Die Demo-Kampagne bringt ein Startkapital mit; eingezahlt wird in der Kasse, vom Charakter oben.
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.000');
  await page.getByRole('tab', { name: 'Kasse' }).click();
  await page.getByRole('radio', { name: 'Einzahlung' }).click();
  await expect(page.locator('.shop-who')).toContainText('Kira Vant');
  await page.getByRole('spinbutton').first().fill('1000');
  await page.getByRole('button', { name: 'Einzahlung buchen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 6.000');

  // Ein Tipp kauft genau eins; das Abzeichen zählt, wie viele Kira hat. Zweimal Munition: zwei Magazine.
  await page.getByRole('tab', { name: 'Waffen' }).click();
  // Der Hinweis über den Waffen lässt sich wegklicken und bleibt weg.
  await page.getByRole('button', { name: 'Hinweis ausblenden' }).click();
  await expect(page.locator('.shop-hint-box')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Automatic Pistol kaufen' }).getByLabel('hat 1')).toBeVisible();
  await page.getByRole('button', { name: 'Spear kaufen' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Spear kaufen' }).getByLabel('hat 1')).toBeVisible();
  const ammo = page.getByRole('button', { name: /^Automatic Pistol Ammo.* kaufen$/ });
  await ammo.click();
  await ammo.click();
  await expect(ammo.getByLabel('hat 2')).toBeVisible();
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.970');

  // Gesetz 4 verbietet die Submachinegun: erst die Rückfrage, dann eins.
  await page.getByRole('button', { name: 'Submachinegun kaufen' }).click();
  const banned = page.getByRole('dialog', { name: 'Submachinegun' });
  await expect(banned).toContainText('verboten');
  await banned.getByRole('button', { name: 'Trotzdem kaufen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.470');
  await page.getByRole('tab', { name: 'Kasse' }).click();
  await expect(page.locator('.shop-booking').first()).toContainText('1 × Submachinegun für Kira Vant auf Kessra');

  // Jonas kommt oben in die Leiste und verkauft im Bereich Verkauf seine Blade; vorgeschlagen ist der halbe Preis, Cr 25.
  await page.getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  await page.getByRole('tab', { name: 'Verkauf' }).click();
  await expect(page.getByRole('row', { name: /Blade/ })).toContainText('Primärwaffe');
  await page.getByRole('button', { name: 'Blade verkaufen' }).click();
  const sale = page.getByRole('dialog', { name: 'Blade verkaufen' });
  await expect(sale.getByLabel('Erlös je Stück (Cr)')).toHaveValue('25');
  await sale.getByRole('button', { name: 'Verkaufen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.495');
  await page.getByRole('tab', { name: 'Kasse' }).click();
  await expect(page.locator('.shop-booking').first()).toContainText('1 × Blade von Jonas Reyl auf Kessra');
  await page.getByRole('button', { name: 'Kira Vant nach oben' }).click();

  // Kira hatte schon die Automatic Pistol; der Spear wird ihre Sekundärwaffe.
  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
  await page.getByRole('group', { name: 'Waffe in der Hand' }).first().getByRole('button', { name: /Spear/ }).click();
  await expect(page.getByRole('heading', { name: 'Spear' })).toBeVisible();
});

test('Shop: „Gruppe ist hier“ auf der Weltkarte bringt die Gruppe auf eine andere Welt', async ({ page }) => {
  await page.goto('/');
  const world = await makeWorld(page);
  await world.getByRole('button', { name: 'Gruppe ist hier' }).click();
  await expect(world.getByRole('button', { name: 'Die Gruppe ist hier' })).toBeVisible();
  await world.getByRole('button', { name: 'Schließen' }).first().click();
  await expect(page.locator('.world-list-here')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Shop' }).click();
  await expect(page.locator('.shop-world')).toContainText('Regina');
});
