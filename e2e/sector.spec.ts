import { expect, test } from '@playwright/test';
import { openOracle, openSector, oracle, openPeople, openHomeGlobe } from './layout';

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
    // Untere Reihen liegen am Handy unter dem Ziehblatt; das Feld wird direkt angetippt.
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).dispatchEvent('click');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const dock = page.locator('.sector-dock');
    await expect(dock).toContainText(`Feld ${id}`);
    await dock.getByRole('button', { name: /Vorkommen würfeln/ }).click();
    if (await dock.getByText('Kein System in diesem Feld').isVisible()) {
      await expect(map.getByRole('button', { name: `${id}, leer` })).toBeVisible();
      continue;
    }
    await dock.getByRole('button', { name: 'Welt erschaffen' }).click();
    // Die Weltkarte steht jetzt im Ziehblatt bzw. in der Seitenspalte, schiebbar wie jedes Feld.
    const dialog = page.getByRole('region', { name: `Weltenerschaffung ${id}` });
    // Der Hinweis und der Würfelknopf stehen in der Reihe unten, wie beim Orakel, nicht im Feld.
    await expect(page.locator('.generation-prompt')).toHaveText('Systeminhalt: Raumhafen');
    // „Später weiter“ behält die Welt in Erschaffung.
    await dialog.getByRole('button', { name: 'Später weiter' }).click();
    await map.getByRole('button', { name: `${id}, in Erschaffung: fortsetzen` }).click();
    await expect(dialog.getByRole('button', { name: 'Verwerfen' })).toBeVisible();
    // Nach dem TL steht die Oberfläche da, wo früher die Würfe standen; eine Liste der Würfe gibt es nicht.
    for (let i = 0; i < 30 && !(await page.getByRole('button', { name: 'Sternsystem würfeln' }).isVisible()); i++) await page.locator('.generation-main').click();
    await expect(dialog.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
    // Danach kommt das Sternsystem mit eigenem Knopf; die Übersicht zeigt Sterne und Bahnen.
    await expect(page.locator('.generation-prompt')).toContainText('Sternsystem nach Book 6');
    await page.getByRole('button', { name: 'Sternsystem würfeln' }).click();
    // Das System steht im eigenen Reiter der Weltkarte (Owner, 21. November 2026).
    await dialog.getByRole('tab', { name: 'System' }).click();
    await expect(dialog.getByRole('region', { name: 'Sternsystem' })).toContainText('Hauptstern');
    await expect(dialog.getByRole('region', { name: 'Sternsystem' })).toContainText('(Hauptwelt)');
    await dialog.getByRole('tab', { name: 'Welt' }).click();
    await expect(dialog.getByRole('region', { name: 'Würfe' })).toHaveCount(0);
    // Das Weltsymbol steht auf der Karte, nicht im Blatt.
    await expect(dialog.getByRole('img', { name: /^Weltsymbol von / })).toHaveCount(0);
    await page.getByLabel('Name der Welt').fill('Regina');
    await page.getByRole('button', { name: 'Übernehmen' }).click();
    const done = page.getByRole('region', { name: `Regina · ${id}` });
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-Z]{6}-[0-9A-Z]/);
    await expect(done.getByRole('article', { name: 'Welt' })).toContainText(/Temperatur(Gefroren|Kalt|Gemäßigt|Heiß|Kochend)/);
    await done.getByRole('button', { name: 'Schließen' }).click();
    await map.getByRole('button', { name: `${id}, Regina: Weltkarte öffnen` }).click();
    // Wieder geöffnet: erst die Weltkarte mit den Werten, kein Globus gleich.
    const sheet = page.getByRole('region', { name: `Regina · ${id}` });
    await expect(sheet.getByRole('article', { name: 'Welt' })).toBeVisible();
    await expect(sheet.getByRole('region', { name: 'Oberfläche' })).toContainText('einheimisches Leben');
    // Unten wie am Hexfeld des Globus: Hierher reisen, Gruppe platzieren, Globus erzeugen. Der Globus
    // entsteht nur auf Knopfdruck (2026-11-20d); oben klappen Name und UWP die Werte auf.
    await expect(page.getByRole('button', { name: 'Hierher reisen', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Öffnen', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Globus erzeugen', exact: true }).click();
    const globe = page.getByRole('region', { name: 'Globus · Regina' });
    // Der Name oben öffnet dieselbe Weltkarte wie im Subsektor, im Blatt unten (Owner, 21. November 2026).
    await globe.getByRole('button', { name: /^Regina, UWP / }).click();
    const reopened = page.getByRole('region', { name: `Regina · ${id}` });
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
    // Untere Reihen liegen am Handy unter dem Ziehblatt; das Feld wird direkt angetippt.
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).dispatchEvent('click');
    const button = page.locator('.sector-dock').getByRole('button', { name: /Vorkommen würfeln/ });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    if (await page.locator('.sector-dock').getByText('Kein System in diesem Feld').isVisible()) continue;
    const dialog = page.getByRole('region', { name: `Weltenerschaffung ${id}` });
    await expect(page.getByLabel('Name der Welt')).toBeVisible();
    await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText(/[A-EX][0-9A-Z]{6}-[0-9A-Z]/);
    // In Erschaffung gibt es keine Notiz; die fertige Welt bekommt eine, die Liste zeigt ihre erste Zeile.
    await expect(dialog.getByLabel('Notiz zur Welt')).toHaveCount(0);
    // Name von der Karte: Vor- und Nachnamen getrennt; ein Nachname allein geht auch.
    await page.getByRole('button', { name: 'Karte', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Name von der Karte' });
    await expect(picker.getByRole('group', { name: 'Vornamen' }).getByRole('button')).toHaveCount(12);
    const surname = picker.getByRole('group', { name: 'Nachnamen' }).getByRole('button').last();
    const text = await surname.innerText();
    await surname.click();
    await picker.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(picker).toBeHidden();
    await expect(page.getByLabel('Name der Welt')).toHaveValue(text);
    await page.getByLabel('Name der Welt').fill('Regina');
    await page.getByRole('button', { name: 'Übernehmen' }).click();
    const done = page.getByRole('region', { name: `Regina · ${id}` });
    await done.getByLabel('Notiz zur Welt').fill('Halveks Werft am Südpol.\nDer Zoll ist bestechlich.');
    await done.getByRole('button', { name: 'Schließen' }).click();
    await expect(done).toBeHidden();
    await page.getByRole('button', { name: /^Welten \d+/ }).click();
    await expect(page.locator('.world-list-note').filter({ hasText: 'Halvek' })).toHaveText('Halveks Werft am Südpol.');
    await page.reload();
    await openSector(page);
    await page.getByRole('button', { name: /^Welten \d+/ }).click();
    await page.locator('.world-list').getByRole('button', { name: /Regina/ }).click();
    // Die Weltkarte zeigt die Notiz gleich, ohne Umweg über den Globus.
    const sheet = page.getByRole('region', { name: `Regina · ${id}` });
    await expect(sheet.getByLabel('Notiz zur Welt')).toHaveValue('Halveks Werft am Südpol.\nDer Zoll ist bestechlich.');
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
  const dialog = page.getByRole('region', { name: 'Regina · 0101' });
  // Eine fertige Welt lässt sich nicht verwerfen, auch wenn sie noch etwas zu würfeln hat.
  await expect(dialog.getByRole('button', { name: 'Verwerfen' })).toHaveCount(0);
  await page.locator('.generation-main').click();
  await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText(/Temperatur(Gefroren|Kalt|Gemäßigt|Heiß|Kochend)/);
  await expect(dialog.getByRole('article', { name: 'Welt' })).toContainText('C788545-7');
  // Gleich danach entsteht die Oberfläche mit; zu würfeln bleibt nichts.
  await expect(dialog.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
  await expect(page.locator('.generation-main')).toHaveCount(0);
});

test('Sektor: Eine Welt doppelt antippen öffnet sie; einmal antippen zeigt nur die Weltkarte', async ({ page }) => {
  await page.goto('/');
  await openSector(page);
  const kessra = page.getByRole('group', { name: 'Karte des Subsektors' }).getByRole('button', { name: /^0405, Kessra: Weltkarte öffnen/ });
  await kessra.click();
  await expect(page.getByRole('region', { name: 'Kessra · 0405' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Globus · Kessra' })).toHaveCount(0);
  await page.getByRole('region', { name: 'Kessra · 0405' }).getByRole('button', { name: 'Schließen' }).click();
  // Ohne Globus öffnet auch doppelt antippen nur die Weltkarte; „Globus erzeugen“ macht ihn (2026-11-20d).
  await kessra.dblclick();
  await expect(page.getByRole('region', { name: 'Kessra · 0405' })).toBeVisible();
  await page.getByRole('button', { name: 'Globus erzeugen', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Globus · Kessra' })).toBeVisible();
  await page.getByRole('region', { name: 'Globus · Kessra' }).getByRole('button', { name: 'Schließen', exact: true }).click();
  await kessra.dblclick();
  await expect(page.getByRole('region', { name: 'Globus · Kessra' })).toBeVisible();
});

test('Globus: aus dem Subsektor öffnen, Feld antippen, zurück zum Subsektor', async ({ page }) => {
  await page.goto('/');
  // Die Demo-Kampagne steht auf Kessra; der Knopf ⌖ in der Leiste des Subsektors öffnet ihren Globus.
  await openHomeGlobe(page);
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
  // Unten beim Feld steht die Reihe des Felds: Hierhin reisen, Gruppe setzen, NSC platzieren.
  const actions = page.getByRole('region', { name: 'Am Feld' });
  await actions.getByRole('button', { name: 'Gruppe in diese Stadt setzen' }).click();
  await globe.getByRole('button', { name: 'Zur Gruppe' }).click();
  await expect(page.getByRole('region', { name: 'Angetipptes Feld' })).toContainText('Die Gruppe ist hier');
  await expect(actions.getByRole('button', { name: 'Hierhin reisen' })).toBeDisabled();
  await expect(actions.getByRole('button', { name: 'Gruppe in diese Stadt setzen' })).toBeDisabled();
  // Gewürfelt wird mit der Reihe im Log; der Wurf steht dann am Feld der Gruppe unter dem, was dort geschah.
  await openOracle(page);
  await oracle(page).getByRole('button', { name: '2W6', exact: true }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await globe.getByRole('button', { name: /^Orte/ }).click();
  await globe.getByRole('region', { name: 'Orte' }).getByRole('button', { name: /Die Gruppe/ }).click();
  const field = page.getByRole('region', { name: 'Angetipptes Feld' });
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
  // Der Name oben öffnet die Weltkarte im Blatt, wie im Subsektor, mit Oberfläche, Notiz und der Reihe unten.
  await globe.getByRole('button', { name: /^Kessra, UWP A766754-A/ }).click();
  const world = page.getByRole('region', { name: 'Kessra · 0405' });
  await expect(page.getByRole('region', { name: 'Angetipptes Feld' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gruppe platzieren' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Öffnen', exact: true })).toHaveCount(0);
  await expect(world.getByRole('article', { name: 'Welt' })).toContainText('Raumhafen');
  await expect(world.getByRole('region', { name: 'Oberfläche' })).toContainText('% Wasser');
  await expect(world.getByLabel('Notiz zur Welt')).toBeVisible();
  // Schließen führt zum Subsektor.
  await globe.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Karte des Subsektors' })).toBeVisible();
});

test('Globus: Beim angetippten Feld steht unten statt des Orakels die Reihe des Felds; NSC platzieren wählt in der NSC-Liste aus, Hierhin reisen plant die Route', async ({ page }) => {
  await page.goto('/');
  // Ein NSC auf Kessra, dem Aufenthaltsort, noch ohne Feld.
  await openPeople(page, 'NSC');
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  await page.getByRole('dialog', { name: 'Neuer NSC' }).getByLabel('Rolle').selectOption({ label: 'Kontakt' });
  await page.getByRole('button', { name: 'Leer anlegen' }).click();
  const editor = page.getByRole('dialog', { name: 'Neuer NSC' });
  await editor.getByLabel('Name').fill('Mara Voss');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(editor).toHaveCount(0);
  await openHomeGlobe(page);
  const globe = page.getByRole('region', { name: 'Globus · Kessra' });
  await expect(globe).toBeVisible();
  // Noch hat die Gruppe kein Feld: Die Reihe sagt, warum Hinreisen nicht geht.
  await globe.getByRole('button', { name: /^Orte/ }).click();
  await globe.getByRole('region', { name: 'Orte' }).getByRole('button', { name: /Hauptstadt ·/ }).click();
  await expect(page.getByRole('region', { name: 'Am Feld' })).toContainText('Die Gruppe hat noch kein Feld');
  // Die Gruppe kommt in die Hauptstadt; angetippt wird eine andere Stadt.
  const actions = page.getByRole('region', { name: 'Am Feld' });
  await actions.getByRole('button', { name: 'Gruppe in diese Stadt setzen' }).click();
  const canvas = globe.getByRole('img', { name: /Globus von Kessra/ });
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.35, y: box.height * 0.4 } });
  const field = page.getByRole('region', { name: 'Angetipptes Feld' });
  await expect(field).not.toContainText('Die Gruppe ist hier');
  await expect(actions).toBeVisible();
  // Auf dem Smartphone steht die Reihe des Felds an der Stelle des Orakels, im Desktop-Modus unter dem Feld.
  if (test.info().project.name === 'mobil') await expect(page.locator('.tray').getByRole('region', { name: 'Orakel und Proben' })).toHaveCount(0);
  await expect(actions.getByRole('button', { name: /Gruppe .* setzen/ })).toBeEnabled();
  await expect(actions).not.toContainText('kein Feld');
  // NSC platzieren öffnet die NSC-Liste mit Kästchen; Abbrechen führt zurück zum Feld, ohne etwas zu ändern.
  const placeNpcs = actions.getByRole('button', { name: 'NSC platzieren' });
  await placeNpcs.click();
  const placing = page.getByRole('region', { name: 'NSC auswählen' });
  await expect(page.getByText(/^Welche NSC kommen nach /)).toBeVisible();
  await expect(placing.getByRole('button', { name: 'OK' })).toBeDisabled();
  await placing.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(field).toBeVisible();
  await expect(field).not.toContainText('Mara Voss');
  // Angehakt und OK: Mara kommt aufs Feld; danach ist keiner mehr zu holen.
  await placeNpcs.click();
  await expect(page.getByRole('checkbox', { name: 'Alle zeigen' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Mara Voss wählen' }).check();
  await placing.getByRole('button', { name: /^OK, 1 NSC nach / }).click();
  await expect(field).toContainText('Mara Voss · NSC, Kontakt');
  // Danach ist keiner mehr zu holen: Ein Tippen tut nichts.
  await placeNpcs.click();
  await expect(placing).toHaveCount(0);
  await expect(field).toBeVisible();
  // Lange gedrückt erzeugt es einen neuen NSC aus einer Laufbahn, der hier lebt.
  const hold = (await placeNpcs.boundingBox())!;
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.up();
  const create = page.getByRole('dialog', { name: /^Neuer NSC (auf diesem Feld|in )/ });
  await expect(create.getByRole('button', { name: 'Leer anlegen' })).toHaveCount(0);
  await create.getByLabel('Rolle').selectOption({ label: 'Händler' });
  await create.getByRole('button', { name: 'Scouts', exact: true }).click();
  await page.getByRole('dialog', { name: 'Charakter bearbeiten' }).getByRole('button', { name: 'Schließen' }).click();
  await expect(field).toContainText('NSC, Händler');
  // Hierhin reisen plant die Route; dann stehen unten Abbrechen und Losfahren statt der Knöpfe des Felds.
  await actions.getByRole('button', { name: 'Hierhin reisen' }).click();
  await expect(actions.getByRole('button', { name: 'Hierhin reisen' })).toHaveCount(0);
  await expect(actions.getByRole('button', { name: /Gruppe .* setzen/ })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Route' }).getByRole('button', { name: 'Losfahren' })).toHaveCount(0);
  // Abbrechen führt zurück zu den Knöpfen des Felds.
  await actions.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByRole('region', { name: 'Route' })).toHaveCount(0);
  await actions.getByRole('button', { name: 'Hierhin reisen' }).click();
  // Losfahren öffnet den Reiter Begegnung: Dort unten ist Weiterfahren, die einzige Stelle dafür.
  await actions.getByRole('button', { name: 'Losfahren' }).click();
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  await expect(nav.getByRole('button', { name: 'Begegnung', exact: true })).toHaveAttribute('aria-current', 'page');
  const dock = page.getByRole('region', { name: 'Begegnung und Zeit' });
  await expect(dock.getByRole('button', { name: 'Weiterfahren' })).toBeVisible();
  await expect(dock.getByRole('button', { name: /Tage? vergehen/ })).toHaveCount(0);
  // Auf dem Globus steht nur ein Hinweis; er führt zurück in den Reiter Begegnung.
  if (test.info().project.name === 'mobil') await nav.getByRole('button', { name: 'Log', exact: true }).click();
  else await nav.getByRole('button', { name: 'Begegnung', exact: true }).click();
  await expect(globe.getByRole('button', { name: /Einen Tag fahren/ })).toHaveCount(0);
  await globe.getByRole('button', { name: /^Fahrt nach .* · Tag 1\// }).click();
  await expect(dock.getByRole('button', { name: 'Weiterfahren' })).toBeVisible();
});
