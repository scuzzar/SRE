import { expect, test } from '@playwright/test';
import { openSector, oracle } from './layout';

test.use({ reducedMotion: 'reduce' });

test('Sektor: Hex-Karte, Weltenerschaffung Wurf für Wurf, Welt öffnen', async ({ page }) => {
  await page.goto('/');
  await openSector(page);
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  // Die Demo-Kampagne hat schon die Startwelt Kessra auf 0405.
  await expect(map.getByRole('button', { name: /nicht erzeugt/ })).toHaveCount(79);

  // Das Vorkommen wird im Subsektor gewürfelt, nicht auf der Weltkarte.
  let named = false;
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0408', '0109', '0210']) {
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
    // Das Weltsymbol erscheint erst mit der Größe.
    await expect(dialog.getByRole('img', { name: /^Weltsymbol von / })).toHaveCount(0);
    for (let i = 0; i < 14 && (await dialog.locator('.generation-main').count()) > 0; i++) await dialog.locator('.generation-main').click();
    // Nach dem TL steht die Oberfläche da, wo früher die Würfe standen; eine Liste der Würfe gibt es nicht.
    await expect(dialog.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
    await expect(dialog.getByRole('region', { name: 'Würfe' })).toHaveCount(0);
    await expect(dialog.getByRole('img', { name: `Weltsymbol von ${id}` })).toBeVisible();
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    const done = page.getByRole('dialog', { name: `Regina · ${id}` });
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-Z]{6}-[0-9A-Z]/);
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/Temperatur(Gefroren|Kalt|Gemäßigt|Heiß|Kochend)/);
    await done.getByRole('button', { name: 'Schließen' }).first().click();
    await map.getByRole('button', { name: `${id}, Regina: Weltkarte öffnen` }).click();
    // Wieder geöffnet: Eine fertige Welt mit Oberfläche zeigt ihren Globus; oben klappen Name und UWP die Werte auf.
    const globe = page.getByRole('region', { name: 'Globus · Regina' });
    await globe.getByRole('button', { name: /^Regina, UWP / }).click();
    const reopened = globe.getByRole('region', { name: 'Die Welt' });
    await expect(reopened.getByRole('article', { name: 'Welt' })).toBeVisible();
    await expect(reopened.getByRole('region', { name: 'Oberfläche' })).toContainText(/einheimisches Leben/);
    await globe.getByRole('button', { name: 'Schließen', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    // Die Welten klappen oben über der Karte auf.
    await page.getByRole('button', { name: /^Welten \d+/ }).click();
    await expect(page.locator('.world-list')).toContainText('Regina');
    named = true;
    break;
  }
  expect(named).toBe(true);
});

test('Sektor: Die Karte lässt sich vergrößern und wieder verkleinern, ohne Bildlaufleisten', async ({ page }) => {
  await page.goto('/');
  await openSector(page);
  const viewport = page.locator('.sector-viewport');
  const svg = page.getByRole('group', { name: 'Karte des Subsektors' });
  const width = async () => Number((await svg.getAttribute('viewBox'))!.split(' ')[2]);
  const out = page.getByRole('button', { name: 'Verkleinern' });
  await expect(out).toBeDisabled();
  const before = await width();
  // Je Tippen ein Schritt (× 1,5): Der Ausschnitt der Zeichnung wird kleiner.
  await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect.poll(width).toBeLessThan(before / 1.4);
  await page.getByRole('button', { name: 'Vergrößern' }).click();
  await expect.poll(width).toBeLessThan(before / 2);
  // Verschoben wird durch Ziehen, nicht durch Scrollen: Bildlaufleisten gibt es nicht.
  expect(await viewport.evaluate((e) => [e.scrollWidth - e.clientWidth, e.scrollHeight - e.clientHeight])).toEqual([0, 0]);
  // Auch vergrößert lässt sich ein Feld antippen.
  await page.getByRole('button', { name: '0404, nicht erzeugt' }).click();
  await expect(page.locator('.sector-dock')).toBeVisible();
  await out.click();
  await out.click();
  await expect(out).toBeDisabled();
});

test('Sektor: Lange drücken auf „Vorkommen würfeln“ würfelt die Welt bis zum Namen; die fertige Welt bekommt eine Notiz', async ({ page }) => {
  // Am Ende entsteht der Globus der neuen Welt; ohne Grafikkarte und neben anderen Tests dauert das.
  test.setTimeout(60_000);
  await page.goto('/');
  await openSector(page);
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0408', '0109', '0210']) {
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
    await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-Z]{6}-[0-9A-Z]/);
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
    await page.getByRole('button', { name: /^Welten \d+/ }).click();
    await expect(page.locator('.world-list-note').filter({ hasText: 'Halvek' })).toHaveText('Halveks Werft am Südpol.');
    await page.reload();
    await openSector(page);
    await page.getByRole('button', { name: /^Welten \d+/ }).click();
    await page.locator('.world-list').getByRole('button', { name: /Regina/ }).click();
    const globe = page.getByRole('region', { name: 'Globus · Regina' });
    await globe.getByRole('button', { name: /^Regina, UWP / }).click();
    await expect(globe.getByLabel('Notiz zur Welt')).toHaveValue('Halveks Werft am Südpol.\nDer Zoll ist bestechlich.');
    return;
  }
  throw new Error('Kein Feld mit Welt gefunden');
});

test('Sektor: UWP und Handelscodes erscheinen auf der Karte, sobald sie beim Zoomen lesbar sind', async ({ page }, testInfo) => {
  await page.goto('/');
  const efate = { column: 2, row: 1, empty: false, name: 'Efate', navalBase: false, scoutBase: false, gasGiant: true, uwp: { starport: 10, size: 6, atmosphere: 4, hydrographics: 6, population: 6, government: 2, law: 4, tech: 12 } };
  const file = { format: 'solo-rpg-engine/kampagne', version: 1, campaign: { name: 'Karte', odds: 'medium', characters: [], log: [], hexes: [efate] } };
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await page.getByRole('dialog', { name: 'Kampagnen' }).locator('input[type=file]').setInputFiles({ name: 'k.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await openSector(page);
  const world = page.getByRole('button', { name: '0201, Efate: Weltkarte öffnen' });
  await expect(world).toBeVisible();
  // In der Mitte des Feldes steht das Weltsymbol.
  await expect(world.locator('.hex-icon')).toHaveCount(1);
  await expect(world.locator('.hex-icon')).toHaveAttribute('href', /^data:image\/png/);
  // Ganz herausgezoomt auf dem Smartphone: nur Zeichen und Name. Im Desktop-Modus hat die Karte den
  // Bereich für sich und ist so groß, dass das UWP schon zu lesen ist. Vergrößern zeigt erst das UWP,
  // dann die Handelscodes.
  if (testInfo.project.name !== 'desktop') await expect(world.locator('.hex-uwp')).toHaveCount(0);
  const zoomIn = page.getByRole('button', { name: 'Vergrößern' });
  for (let i = 0; i < 4 && (await world.locator('.hex-uwp').count()) === 0; i++) await zoomIn.click();
  await expect(world.locator('.hex-uwp')).toHaveText('A646624-C');
  await expect(world.locator('.hex-trade')).toHaveCount(0);
  for (let i = 0; i < 4 && (await world.locator('.hex-trade').count()) === 0; i++) await zoomIn.click();
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
  await openSector(page);
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

test('Globus: aus dem Subsektor öffnen, Feld antippen, zurück zum Subsektor', async ({ page }) => {
  await page.goto('/');
  // Die Demo-Kampagne steht auf Kessra; der Knopf ⌖ in der Leiste des Subsektors öffnet ihren Globus.
  await page.getByRole('button', { name: /Aufenthaltsort Kessra.*Globus öffnen/ }).click();
  const globe = page.getByRole('region', { name: 'Globus · Kessra' });
  await expect(globe).toBeVisible();
  // Oben klappt die Liste der Orte auf, mit Maßstab und Städten; ein Tippen fliegt hin und zeigt unten das Feld.
  await globe.getByRole('button', { name: /^Orte/ }).click();
  const places = globe.getByRole('region', { name: 'Orte' });
  await expect(places).toContainText('1 Feld ≈ 251 km');
  await places.getByRole('button', { name: /Hauptstadt ·/ }).click();
  await expect(places).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Angetipptes Feld' })).toContainText('°C im Jahresmittel');
  // „Zur Gruppe“ gibt es, sobald die Gruppe ein Feld auf dieser Welt hat; wie im Navi führt er zu ihr zurück.
  await expect(globe.getByRole('button', { name: 'Zur Gruppe' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Gruppe in diese Stadt' }).click();
  await globe.getByRole('button', { name: 'Zur Gruppe' }).click();
  await expect(page.getByRole('region', { name: 'Angetipptes Feld' })).toContainText('Die Gruppe ist hier');
  // Gewürfelt wird mit der Reihe unten, ohne den Globus zu verlassen; der Wurf steht dann unter dem, was hier geschah.
  const field = page.getByRole('region', { name: 'Angetipptes Feld' });
  await oracle(page).getByRole('button', { name: '2W6', exact: true }).click();
  await expect(field).toContainText('Was hier geschah');
  await expect(field.locator('.happened')).toContainText('2W6');
  // Die Liste der Felder mit Einträgen: der Wurf eben, am Feld der Gruppe.
  await globe.getByRole('button', { name: /^Einträge/ }).click();
  await expect(globe.getByRole('region', { name: 'Felder mit Einträgen' })).toContainText('1 Eintrag');
  // Antippen der Karte wählt ein anderes Feld (die Mitte ist die Hauptstadt; nochmal antippen hebt die Wahl auf).
  const canvas = globe.getByRole('img', { name: /Globus von Kessra/ });
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.35, y: box.height * 0.4 } });
  await expect(page.getByRole('region', { name: 'Angetipptes Feld' })).toContainText('°C im Jahresmittel');
  // Oben klappen Name und UWP die Welt im Klartext auf, mit Oberfläche und Notiz.
  await globe.getByRole('button', { name: /^Kessra, UWP A766754-A/ }).click();
  const world = globe.getByRole('region', { name: 'Die Welt' });
  await expect(world.getByRole('article', { name: 'Welt' })).toContainText('Raumhafen');
  await expect(world.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
  await expect(world.getByLabel('Notiz zur Welt')).toBeVisible();
  // Schließen führt zum Subsektor.
  await globe.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Karte des Subsektors' })).toBeVisible();
});
