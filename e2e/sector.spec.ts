import { expect, test } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

test('Sektor: Hex-Karte, Weltenerschaffung Wurf für Wurf, Welt öffnen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  // Die Demo-Kampagne hat schon die Startwelt Kessra auf 0405.
  await expect(map.getByRole('button', { name: /nicht erzeugt/ })).toHaveCount(79);

  // Das Vorkommen wird im Subsektor gewürfelt, nicht auf der Weltkarte.
  let named = false;
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0808', '0109', '0210']) {
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const dock = page.locator('.sector-dock');
    await expect(dock).toContainText(`Feld ${id}`);
    await dock.getByRole('button', { name: /Vorkommen würfeln/ }).click();
    if (await dock.getByText('Kein System in diesem Feld').isVisible()) {
      await expect(map.getByRole('button', { name: `${id}, leer` })).toBeVisible();
      continue;
    }
    await dock.getByRole('button', { name: 'Welt erschaffen' }).click();
    const dialog = page.getByRole('dialog', { name: `Weltenerschaffung ${id}` });
    await expect(dialog.locator('.generation-prompt')).toHaveText('Systeminhalt: Raumhafen');
    // „Später weiter“ behält die Welt in Erschaffung.
    await dialog.getByRole('button', { name: 'Später weiter' }).click();
    await map.getByRole('button', { name: `${id}, in Erschaffung: fortsetzen` }).click();
    await expect(dialog.getByRole('button', { name: 'Verwerfen' })).toBeVisible();
    for (let i = 0; i < 14 && (await dialog.locator('.generation-main').count()) > 0; i++) await dialog.locator('.generation-main').click();
    // Nach dem TL steht die Oberfläche da, wo früher die Würfe standen; eine Liste der Würfe gibt es nicht.
    await expect(dialog.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
    await expect(dialog.getByRole('region', { name: 'Würfe' })).toHaveCount(0);
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    const done = page.getByRole('dialog', { name: `Regina · ${id}` });
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-F]{6}-[0-9A-Z]/);
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/Temperatur(Gefroren|Kalt|Gemäßigt|Heiß|Kochend)/);
    await done.getByRole('button', { name: 'Schließen' }).first().click();
    await map.getByRole('button', { name: `${id}, Regina: Weltkarte öffnen` }).click();
    // Wieder geöffnet: die Werte mit der Oberfläche.
    const reopened = page.getByRole('dialog', { name: `Regina · ${id}` });
    await expect(reopened.getByRole('article', { name: 'Welt' })).toBeVisible();
    await expect(reopened.getByRole('region', { name: 'Oberfläche' })).toContainText(/einheimisches Leben/);
    await page.getByRole('button', { name: 'Schließen' }).first().click();
    await expect(page.locator('.world-list')).toContainText('Regina');
    named = true;
    break;
  }
  expect(named).toBe(true);
});

test('Sektor: Die Karte lässt sich vergrößern und wieder verkleinern', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const viewport = page.locator('.sector-viewport');
  const canvas = page.locator('.sector-canvas');
  const out = page.getByRole('button', { name: 'Verkleinern' });
  await expect(out).toBeDisabled();
  const before = (await canvas.boundingBox())!.width;
  const width = async () => (await canvas.boundingBox())!.width;
  // Je Tippen ein Schritt (× 1,5); gemessen wird, wenn die Karte neu gezeichnet ist.
  await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect.poll(width).toBeGreaterThan(before * 1.4);
  await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect.poll(width).toBeGreaterThan(before * 2);
  // Größer als der Ausschnitt: verschieben geht durch Scrollen.
  expect(await viewport.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  // Auch vergrößert lässt sich ein Feld antippen.
  await page.getByRole('button', { name: /, nicht erzeugt$/ }).first().click();
  await expect(page.locator('.sector-dock')).toBeVisible();
  await out.click();
  await out.click();
  await expect(out).toBeDisabled();
});

test('Sektor: Lange drücken auf „Vorkommen würfeln“ würfelt die Welt bis zum Namen; die fertige Welt bekommt eine Notiz', async ({ page }) => {
  await page.goto('/');
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
    await expect(dialog.getByLabel('Name der Welt')).toBeVisible();
    await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-F]{6}-[0-9A-Z]/);
    // In Erschaffung gibt es keine Notiz; die fertige Welt bekommt eine, die Liste zeigt ihre erste Zeile.
    await expect(dialog.getByLabel('Notiz zur Welt')).toHaveCount(0);
    // Name von der Karte: Vor- und Nachnamen getrennt; ein Nachname allein geht auch.
    await dialog.getByRole('button', { name: 'Karte' }).click();
    const picker = page.getByRole('dialog', { name: 'Name von der Karte' });
    await expect(picker.getByRole('group', { name: 'Vornamen' }).getByRole('button')).toHaveCount(12);
    const surname = picker.getByRole('group', { name: 'Nachnamen' }).getByRole('button').last();
    const text = await surname.innerText();
    await surname.click();
    await picker.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(picker).toBeHidden();
    await expect(dialog.getByLabel('Name der Welt')).toHaveValue(text);
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    const done = page.getByRole('dialog', { name: `Regina · ${id}` });
    await done.getByLabel('Notiz zur Welt').fill('Halveks Werft am Südpol.\nDer Zoll ist bestechlich.');
    await done.getByRole('button', { name: 'Schließen' }).first().click();
    await expect(done).toBeHidden();
    await expect(page.locator('.world-list-note').filter({ hasText: 'Halvek' })).toHaveText('Halveks Werft am Südpol.');
    await page.reload();
    await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
    await page.locator('.world-list').getByRole('button', { name: /Regina/ }).click();
    await expect(page.getByRole('dialog', { name: `Regina · ${id}` }).getByLabel('Notiz zur Welt')).toHaveValue('Halveks Werft am Südpol.\nDer Zoll ist bestechlich.');
    return;
  }
  throw new Error('Kein Feld mit Welt gefunden');
});

test('Sektor: UWP und Handelscodes erscheinen auf der Karte, sobald sie beim Zoomen lesbar sind', async ({ page }) => {
  await page.goto('/');
  const efate = { column: 2, row: 1, empty: false, name: 'Efate', navalBase: false, scoutBase: false, gasGiant: true, uwp: { starport: 10, size: 6, atmosphere: 4, hydrographics: 6, population: 6, government: 2, law: 4, tech: 12 } };
  const file = { format: 'solo-rpg-engine/kampagne', version: 1, campaign: { name: 'Karte', odds: 'medium', characters: [], log: [], hexes: [efate] } };
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await page.getByRole('dialog', { name: 'Kampagnen' }).locator('input[type=file]').setInputFiles({ name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const world = page.getByRole('button', { name: '0201, Efate: Weltkarte öffnen' });
  await expect(world).toBeVisible();
  // Ganz herausgezoomt: nur Zeichen und Name. Das gilt auch im Desktop-Modus, seit die Karte dort
  // in die Höhe des Screens eingepasst ist statt die volle Breite zu füllen.
  await expect(world.locator('.hex-uwp')).toHaveCount(0);
  await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect(world.locator('.hex-uwp')).toHaveText('A646624-C');
  await expect(world.locator('.hex-trade')).toHaveCount(0);
  await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect(world.locator('.hex-trade')).toHaveText('Ag Ni');
});

test('Sektor: Eine ältere Welt ohne Temperatur würfelt sie auf der Weltkarte nach', async ({ page }) => {
  await page.goto('/');
  const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };
  const file = { format: 'solo-rpg-engine/kampagne', version: 1, campaign: { name: 'Alte Welt', odds: 'medium', characters: [], log: [], hexes: [regina] } };
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await page.getByRole('dialog', { name: 'Kampagnen' }).locator('input[type=file]').setInputFiles({ name: 'welt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(page.getByRole('dialog', { name: 'Kampagnen' })).toBeHidden();
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  await page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: '0101, Regina: Weltkarte öffnen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Regina · 0101' });
  // Eine fertige Welt lässt sich nicht verwerfen, auch wenn sie noch etwas zu würfeln hat.
  await expect(dialog.getByRole('button', { name: 'Verwerfen' })).toHaveCount(0);
  await dialog.locator('.generation-main').click();
  await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText(/Temperatur(Gefroren|Kalt|Gemäßigt|Heiß|Kochend)/);
  await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText('C788545-7');
  // Gleich danach entsteht die Oberfläche mit; zu würfeln bleibt nichts.
  await expect(dialog.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
  await expect(dialog.locator('.generation-main')).toHaveCount(0);
});
