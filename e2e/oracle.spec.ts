import { expect, test, type Locator } from '@playwright/test';

/** Solange die Karte hereinkommt, beendet ein Tippen nur die Animation; das Tippen auf die Überschrift tut sonst nichts. */
async function revealed(card: Locator) {
  await card.getByRole('heading', { name: 'Inspirationskarte' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Hauptscreen: leerer Log, Knöpfe im Daumenbereich, Stufe Mittel', async ({ page }) => {
  await expect(page.getByText('Noch nichts im Log.')).toBeVisible();
  await expect(page.getByRole('radio', { name: /Mittel/ })).toHaveAttribute('aria-checked', 'true');
  for (const name of [/Ja\/Nein/, /Karte ziehen/, /2W6/]) {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    expect(box.y).toBeGreaterThan(844 / 2);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
  }
});

test('Ja/Nein-Orakel: Frage und Antwort landen im Log, das Fragefeld ist danach leer', async ({ page }) => {
  await page.getByRole('radio', { name: /Gering/ }).click();
  await page.getByPlaceholder(/Frage/).fill('Ist Halvek ehrlich?');
  await page.getByRole('button', { name: /Ja\/Nein/ }).click();
  const entry = page.locator('.entry').last();
  await expect(entry).toContainText('Orakel · Gering');
  await expect(entry).toContainText('„Ist Halvek ehrlich?“');
  await expect(entry).toContainText(/^.*(JA|NEIN).*$/);
  await expect(entry).toContainText(/W100: \d+ · Ja bis 25/);
  await expect(page.getByPlaceholder(/Frage/)).toHaveValue('');
});

test('2W6: ein Wurf mit Summe und Einzelwürfeln', async ({ page }) => {
  await page.getByRole('button', { name: '2W6' }).click();
  const entry = page.locator('.entry').last();
  await expect(entry).toContainText('Würfel · 2W6');
  await expect(entry).toContainText(/\d+\s*[1-6] \+ [1-6]/);
});

test('Inspirationskarte: auswählen, bestätigen, nur die Auswahl kommt in den Log', async ({ page }) => {
  await page.getByPlaceholder(/Frage/).fill('Was steckt hinter dem Notsignal?');
  await page.getByRole('button', { name: 'Karte ziehen' }).click();

  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  await expect(card).toContainText('„Was steckt hinter dem Notsignal?“');
  await expect(card.getByRole('button', { name: /in den Log übernehmen/ })).toBeDisabled();
  await expect(page.locator('.entry')).toHaveCount(0);

  const action = card.getByRole('group', { name: 'Zufallsereignis' }).getByRole('button').first();
  // Ein Paar steht in einem Feld, jeder Begriff in einer eigenen Zeile; im Log in einer Zeile.
  const actionWords = await action.locator('.tile-line').allInnerTexts();
  expect(actionWords).toHaveLength(2);
  await action.click();
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  // Alle Themen-Tafeln stehen mit Überschrift auf einmal da, ohne Scrollen. Ein sehr langes Wort
  // (zufällig gezogen) kann auf drei Zeilen umbrechen; dafür bleibt eine Zeile Spielraum.
  await expect(card.getByRole('heading', { level: 3 })).toHaveText(['NSC', 'NSC-Aktionen', 'Welt', 'Wesen', 'Handlung']);
  await expect(card.locator('.theme-box')).toHaveCount(3);
  const body = card.locator('.sheet-body');
  expect(await body.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(16);
  await card.getByRole('group', { name: 'NSC', exact: true }).getByRole('button').first().click();
  await expect(card).toContainText('2 ausgewählt');

  await card.getByRole('button', { name: /2 Einträge in den Log übernehmen/ }).click();
  await expect(card).toBeHidden();
  const entry = page.locator('.entry').last();
  await expect(entry).toContainText('Karte');
  await expect(entry).toContainText('„Was steckt hinter dem Notsignal?“');
  await expect(entry.locator('dt')).toHaveText(['Zufallsereignis · Aktion', 'NSC · Aussehen']);
  await expect(entry.locator('dd').first()).toHaveText(actionWords.join(' · '));
  await expect(page.getByPlaceholder(/Frage/)).toHaveValue('');
});

test('Inspirationskarte: sechs Namen auf der Tafel NSC, im Log am Stück', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  const names = card.getByRole('group', { name: 'Namen' }).getByRole('button');
  await expect(names).toHaveCount(6);
  await expect(names.first()).toHaveAccessibleName(/^Weiblich, irdisch: \S+ \S+$/);
  await expect(names.nth(4)).toHaveAccessibleName(/^Männlich, spacig: \S+ \S+$/);
  const name = await names.nth(4).innerText();
  await names.nth(4).click();
  await card.getByRole('button', { name: /1 Eintrag in den Log übernehmen/ }).click();
  const entry = page.locator('.entry').last();
  await expect(entry.locator('dt')).toHaveText(['NSC · Männlich, spacig']);
  await expect(entry.locator('dd')).toHaveText(name);
});

test('Inspirationskarte: Wurffelder 1–10, Streuwürfel und Kartensymbol; im Log mit Bild', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  const rolls = card.getByRole('group', { name: 'Wurffelder' }).getByRole('button');
  await expect(rolls).toHaveCount(3);
  await expect(rolls.nth(0)).toHaveAccessibleName(/^1–10: (10|[1-9])$/);
  await expect(rolls.nth(1)).toHaveAccessibleName(/^Streuwürfel: (N|NO|O|SO|S|SW|W|NW|Volltreffer|Fehlschlag)$/);
  await expect(rolls.nth(2)).toHaveAccessibleName(/^Kartensymbol: /);
  const bell = (await rolls.nth(0).getAttribute('aria-label'))!.replace('1–10: ', '');
  await rolls.nth(0).click();
  await rolls.nth(2).click();
  await expect(card).toContainText('2 ausgewählt');
  await card.getByRole('button', { name: /2 Einträge in den Log übernehmen/ }).click();
  const entry = page.locator('.entry').last();
  await expect(entry.locator('dt')).toHaveText(['1–10', 'Kartensymbol']);
  await expect(entry.locator('dd').first()).toHaveText(bell);
  await expect(entry.getByRole('img', { name: /^Kartensymbol: / })).toBeVisible();
});

test('Inspirationskarte: verwerfen schreibt nichts in den Log, neu ziehen behält die Frage', async ({ page }) => {
  await page.getByPlaceholder(/Frage/).fill('Und jetzt?');
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  await card.locator('.tile').first().click();
  await expect(card).toContainText('1 ausgewählt');
  await card.getByRole('button', { name: 'Neu ziehen' }).click();
  await revealed(card);
  await expect(card).toContainText('Nichts ausgewählt');
  await expect(card).toContainText('„Und jetzt?“');
  await card.getByRole('button', { name: 'Karte verwerfen' }).click();
  await expect(card).toBeHidden();
  await expect(page.locator('.entry')).toHaveCount(0);
  await expect(page.getByPlaceholder(/Frage/)).toHaveValue('Und jetzt?');
});

test('Spielstand und Stufe überstehen einen Neustart', async ({ page }) => {
  await page.getByRole('radio', { name: /Hoch/ }).click();
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.entry')).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('radio', { name: /Hoch/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.entry')).toHaveCount(1);
});

test('Über: Quellenangaben und Links zum Projekt', async ({ page }) => {
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Über die App' }).click();
  await expect(page.getByText(/Traveller ist ein Markenzeichen von Far Future Enterprises/)).toBeVisible();
  await expect(page.getByText(/Larcenous Designs/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quellcode auf GitHub' })).toHaveAttribute('href', 'https://github.com/scuzzar/SRE');
  await expect(page.getByRole('link', { name: 'Fehler melden oder Idee vorschlagen' })).toHaveAttribute(
    'href',
    'https://github.com/scuzzar/SRE/issues/new',
  );
});

test('Über: wie man die App installiert und ob der Speicher bleibt', async ({ page }) => {
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Über die App' }).click();
  await expect(page.getByRole('heading', { name: 'Installieren' })).toBeVisible();
  await expect(page.getByText(/„App installieren“ oder „Zum Startbildschirm hinzufügen“/)).toBeVisible();
  await expect(page.getByText(/Der Spielstand liegt nur auf diesem Gerät/)).toBeVisible();
});

test('Über: auf dem iPhone der Weg über Teilen und der Hinweis auf den eigenen Speicher', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Über die App' }).click();
  await expect(page.getByText(/Teilen-Knopf tippen, dann „Zum Home-Bildschirm“/)).toBeVisible();
  await expect(page.getByText(/eigenen Speicher, getrennt von diesem Browser/)).toBeVisible();
  await context.close();
});

test('Vollbild: der Knopf neben dem i schaltet an und aus', async ({ page }) => {
  const header = page.getByRole('banner');
  await header.getByRole('button', { name: 'Vollbild' }).click();
  await expect(header.getByRole('button', { name: 'Vollbild beenden' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await header.getByRole('button', { name: 'Vollbild beenden' }).click();
  await expect(header.getByRole('button', { name: 'Vollbild' })).toHaveAttribute('aria-pressed', 'false');
});

test('Schreibzeile: Notiz für sich, Deutung im Kasten ihres Ergebnisses, Ergebnis antippen wählt das Ziel', async ({ page }) => {
  const line = page.getByPlaceholder(/Frage, Deutung, Notiz/);
  await page.getByRole('button', { name: /Ja\/Nein/ }).click();
  await page.getByRole('button', { name: /2W6/ }).click();

  await expect(page.getByRole('button', { name: 'Deuten' })).toBeDisabled();
  await line.fill('Wir landen auf Regina.');
  await page.getByRole('button', { name: 'Notiz' }).click();
  await expect(line).toHaveValue('');
  await expect(page.locator('.entry.note')).toContainText('Wir landen auf Regina.');

  // Ohne Antippen gilt die Deutung dem neuesten Ergebnis, dem Wurf.
  await line.fill('Glück gehabt.');
  await expect(page.locator('.target-line')).toContainText('Deutung zu 2W6');
  await page.getByRole('button', { name: 'Deuten' }).click();
  await expect(page.locator('.entry', { hasText: 'Würfel · 2W6' }).locator('.interpretation')).toContainText('Glück gehabt.');

  // Antippen des Orakels macht es zum Ziel.
  await line.fill('Halvek lügt.');
  await page.locator('.entry', { hasText: 'Orakel' }).click();
  await expect(page.locator('.target-line')).toContainText(/Deutung zu (JA|NEIN)/);
  await page.getByRole('button', { name: 'Deuten' }).click();
  const oracle = page.locator('.entry', { hasText: 'Orakel' });
  await expect(oracle.locator('.interpretation')).toContainText('Halvek lügt.');

  // Ein Ergebnis löschen löscht seine Deutung mit.
  await oracle.click({ button: 'right' });
  await expect(oracle).toContainText('Eintrag mit 1 Deutung endgültig löschen?');
  await oracle.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText('Halvek lügt.')).toHaveCount(0);
  await expect(page.getByText('Glück gehabt.')).toBeVisible();
});
