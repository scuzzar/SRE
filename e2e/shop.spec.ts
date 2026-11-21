import { expect, test, type Page } from '@playwright/test';
import { characters, openPeople, openSector, openShop, openCombat, land } from './layout';

/** Eine fertige Welt im Subsektor, lange gedrückt durchgewürfelt und Regina genannt; ihre Weltkarte bleibt offen. */
async function makeWorld(page: Page) {
  await openSector(page);
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0408', '0109', '0210']) {
    // Untere Reihen liegen am Handy unter dem Ziehblatt; das Feld wird direkt angetippt.
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).dispatchEvent('click');
    const button = page.locator('.sector-dock').getByRole('button', { name: /Vorkommen würfeln/ });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    if (await page.locator('.sector-dock').getByText('Kein System in diesem Feld').isVisible()) continue;
    await page.getByLabel('Name der Welt').fill('Regina');
    await page.getByRole('button', { name: 'Übernehmen' }).click();
    const world = page.getByRole('region', { name: `Regina · ${id}` });
    // Ein Asteroidengürtel hat keinen Globus, eine dünn besiedelte Welt oft keine Stadt; dann die nächste Welt.
    const uwp = (await world.getByRole('article', { name: 'Welt' }).locator('p').first().innerText()).match(/· [A-EX](\w)\w\w(\w)/);
    if (!uwp || uwp[1] === '0' || !/[4-9A]/.test(uwp[2]!)) {
      await world.getByRole('button', { name: 'Schließen' }).click();
      continue;
    }
    return world;
  }
  throw new Error('Keine Welt entstanden');
}

test('Shop: Einkaufen an Kessra öffnet den Shop; die Kasse im Reiter Charaktere geht auch auf keiner Welt', async ({ page }) => {
  await page.goto('/');
  await openShop(page);
  await expect(page.locator('.shop-world')).toContainText('Kessra');
  await expect(page.getByRole('tab', { name: 'Waffen' })).toHaveAttribute('aria-selected', 'true');
  // Die Kasse steht nicht im Shop, sondern im Reiter Charaktere.
  await expect(page.getByRole('tab', { name: 'Kasse' })).toHaveCount(0);
  // Fahrzeuge haben eine eigene Theke; unter Sonstiges stehen sie nicht mehr.
  await page.getByRole('tab', { name: 'Fahrzeuge' }).click();
  await expect(page.getByRole('button', { name: 'Air/Raft kaufen' })).toBeVisible();
  await page.getByRole('tab', { name: 'Sonstiges' }).click();
  await expect(page.getByRole('button', { name: 'Air/Raft kaufen' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Passagen' })).toBeVisible();

  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  const sheet = page.getByRole('dialog', { name: 'Kampagnen' });
  await sheet.getByLabel('Neue Kampagne').fill('Leer');
  await sheet.getByRole('button', { name: 'Anlegen' }).click();
  // Die neue Kampagne ist auf keiner Welt: Der Shop ist zu, die Kasse geht trotzdem.
  await expect(page.locator('.shop-world')).toHaveCount(0);
  await openPeople(page, 'Kasse');
  await page.getByRole('spinbutton').first().fill('5000');
  await page.getByPlaceholder(/Belohnung/).fill('Belohnung von Dr. Halvek');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await expect(page.locator('.funds-total')).toContainText('Cr 5.000');
  await expect(page.locator('.shop-booking').first()).toContainText('Belohnung von Dr. Halvek');
});

test('Shop: auf Kessra mit einem Tipp kaufen, Verbotenes erst nach Rückfrage, verkaufen und die Waffe in die Hand nehmen', async ({ page }) => {
  await page.goto('/');
  // Die Demo-Kampagne bringt ein Startkapital mit; eingezahlt wird in der Kasse im Reiter Charaktere,
  // vorgewählt vom Charakter oben.
  await openPeople(page, 'Kasse');
  await expect(page.locator('.funds-total')).toContainText('Cr 5.000');
  await page.getByRole('radio', { name: 'Einzahlung' }).click();
  await expect(page.getByLabel('Von')).toHaveValue('c1');
  await expect(page.getByLabel('Von').locator('option:checked')).toContainText('Kira Vant');
  await page.getByRole('spinbutton').first().fill('1000');
  await page.getByRole('button', { name: 'Einzahlung buchen' }).click();
  await expect(page.locator('.funds-total')).toContainText('Cr 6.000');
  await openShop(page);
  await expect(page.locator('.shop-world')).toContainText('Kessra');
  await expect(page.locator('.shop-funds')).toContainText('Cr 6.000');

  // Ein Tipp kauft genau eins; das Abzeichen zählt, wie viele die Gruppe hat. Zweimal Munition: zwei Magazine.
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

  // Jonas kommt oben in die Leiste und verkauft im Bereich Verkauf seine Blade; vorgeschlagen ist der halbe Preis, Cr 25.
  await characters(page).getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  await page.getByRole('tab', { name: 'Verkauf' }).click();
  await expect(page.getByRole('row', { name: /Blade/ })).toContainText('Primärwaffe');
  await page.getByRole('button', { name: 'Blade verkaufen' }).click();
  const sale = page.getByRole('dialog', { name: 'Blade verkaufen' });
  await expect(sale.getByLabel('Erlös je Stück (Cr)')).toHaveValue('25');
  await sale.getByRole('button', { name: 'Verkaufen' }).click();
  await expect(page.locator('.shop-funds')).toContainText('Cr 5.495');
  await characters(page).getByRole('button', { name: 'Kira Vant nach oben' }).click();
  // Im Kassenbuch (Reiter Charaktere, Kasse) stehen Kauf und Verkauf, das Neueste zuerst.
  await openPeople(page, 'Kasse');
  await expect(page.locator('.shop-booking').nth(0)).toContainText('1 × Blade von Jonas Reyl auf Kessra');
  await expect(page.locator('.shop-booking').nth(1)).toContainText('1 × Submachinegun für Kira Vant auf Kessra');

  // Jede gekaufte Waffe wurde Kiras Primärwaffe: zuletzt die Submachinegun, in der Hand. Spear und
  // Automatic Pistol liegen im Gepäck; die Spear rüstet sie dort als Sekundärwaffe aus.
  await openCombat(page);
  await expect(page.getByRole('heading', { name: 'Submachinegun' })).toBeVisible();
  await openPeople(page, 'SC');
  const pack = page.getByRole('list', { name: 'Gepäck' });
  await expect(pack).toContainText('Automatic Pistol');
  await page.getByLabel('Spear ausrüsten').selectOption({ label: 'Kira · Sekundär' });
  await expect(page.getByRole('group', { name: 'Ausrüstung von Kira Vant' })).toContainText('Spear');
  await expect(pack).not.toContainText('Spear');
  await openCombat(page);
  await page.getByRole('group', { name: 'Waffe in der Hand' }).first().getByRole('button', { name: /Spear/ }).click();
  await expect(page.getByRole('heading', { name: 'Spear' })).toBeVisible();
});

test('Shop: „Gruppe platzieren“ auf der Weltkarte bringt die Gruppe auf eine andere Welt', async ({ page }) => {
  await page.goto('/');
  const world = await makeWorld(page);
  await page.getByRole('button', { name: 'Gruppe platzieren' }).click();
  // Mit der Gruppe entsteht der Globus; sie wählt zuerst ihren Landeplatz (2026-11-21).
  await land(page);
  // Wie „Gruppe setzen“ am Hexfeld des Globus: Ist die Gruppe hier, ist der Knopf ausgegraut, das Blatt sagt es.
  await expect(page.getByRole('button', { name: 'Gruppe platzieren' })).toBeDisabled();
  await expect(world).toContainText('Die Gruppe ist hier');
  await world.getByRole('button', { name: 'Schließen' }).click();
  await page.getByRole('button', { name: /^Welten \d+/ }).click();
  await expect(page.locator('.world-list-here')).toBeVisible();
  await page.getByRole('button', { name: /^Welten \d+/ }).click();
  // Der Knopf ⌖ in der Leiste des Subsektors öffnet den Globus des Aufenthaltsorts; in seiner Hauptstadt kauft man ein.
  await openShop(page);
  await expect(page.locator('.shop-world')).toContainText('Regina');
  await page.getByRole('button', { name: 'Shop schließen' }).click();
  const globe = page.getByRole('region', { name: 'Globus · Regina' });
  // Der Name oben öffnet die Weltkarte im Blatt; dort steht, dass die Gruppe hier ist.
  await globe.getByRole('button', { name: /^Regina, UWP / }).click();
  await expect(page.getByRole('region', { name: /^Regina · / })).toContainText('Die Gruppe ist hier');
  await expect(page.getByRole('button', { name: 'Gruppe platzieren' })).toBeDisabled();
});
