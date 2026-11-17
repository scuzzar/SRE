import { expect, test } from '@playwright/test';
import { characters, entries, openCombat, openPeople, oracle, revealed } from './layout';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Log: leer, vier gleich breite Knöpfe unten (Deuten erst mit einem Ergebnis), keine Stufe ohne Probe', async ({ page }) => {
  await expect(page.getByText('Noch nichts im Log.')).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  const viewport = page.viewportSize()!;
  const widths: number[] = [];
  await expect(oracle(page).getByRole('button', { name: 'Neuestes Ergebnis deuten' })).toBeDisabled();
  for (const name of ['Notiz', 'Neuestes Ergebnis deuten', '2W6', 'Karte ziehen']) {
    const box = (await oracle(page).getByRole('button', { name, exact: true }).boundingBox())!;
    expect(box.y).toBeGreaterThan(viewport.height / 2);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    widths.push(Math.round(box.width));
  }
  expect(new Set(widths).size).toBe(1);
});

test('Orakel auf der Karte: Frage auf die Karte, je Stufe eine Antwort, die gewählte kommt in den Log', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  const ask = card.getByPlaceholder(/Frage an die Karte/);
  await ask.fill('Ist Halvek ehrlich?');
  // Enter (✓ auf der Tastatur) fügt keine Zeile ein, sondern schließt die Tastatur.
  await ask.press('Enter');
  await expect(ask).not.toBeFocused();
  await expect(ask).toHaveValue('Ist Halvek ehrlich?');
  const oracleField = card.getByRole('group', { name: /^Orakel, W100 \d+$/ });
  const choices = oracleField.getByRole('button');
  await expect(choices).toHaveCount(3);
  for (const [i, name] of ['Hoch, 75 %', 'Mittel, 50 %', 'Gering, 25 %'].entries()) {
    await expect(choices.nth(i)).toHaveAccessibleName(new RegExp(`^${name}: (JA|NEIN)[!?]?$`));
  }
  await expect(card.getByRole('button', { name: /in den Log übernehmen/ })).toBeDisabled();
  await choices.nth(2).click();
  await expect(choices.nth(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toContainText('1 ausgewählt');
  await card.getByRole('button', { name: /1 Eintrag in den Log übernehmen/ }).click();
  await expect(card).toBeHidden();
  const entry = entries(page).last();
  await expect(entry).toContainText('Orakel · Gering');
  await expect(entry).toContainText('„Ist Halvek ehrlich?“');
  await expect(entry.locator('.verdict')).toHaveText(/^(JA|NEIN)[!?]?$/);
  await expect(entry).toContainText(/W100: \d+ · Ja bis 25/);
});

test('Inspirationskarte: auswählen, bestätigen, nur die Auswahl kommt in den Log', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();

  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  await card.getByPlaceholder(/Frage an die Karte/).fill('Was steckt hinter dem Notsignal?');
  await expect(card.getByRole('button', { name: /in den Log übernehmen/ })).toBeDisabled();
  await expect(entries(page)).toHaveCount(0);

  const action = card.getByRole('group', { name: 'Zufallsereignis' }).getByRole('button').first();
  // Ein Paar steht in einem Feld, jeder Begriff in einer eigenen Zeile; im Log in einer Zeile.
  const actionWords = await action.locator('.tile-line').allInnerTexts();
  expect(actionWords).toHaveLength(2);
  await action.click();
  await expect(action).toHaveAttribute('aria-pressed', 'true');
  // Die Karte passt ohne Scrollen auf den Bildschirm: Was nicht passt, steht als ganzzeiliger Knopf da.
  // Die Tafel NSC ist oben und bleibt offen; die drei Kästen sind entweder Tafel oder Knopf.
  await expect(card.locator('.theme-box, .theme-button')).toHaveCount(3);
  await expect(card.getByRole('heading', { level: 3, name: 'NSC', exact: true })).toBeVisible();
  const body = card.locator('.sheet-body');
  expect(await body.evaluate((el) => (el.querySelector('.card-flip') as HTMLElement).offsetHeight - el.clientHeight)).toBeLessThanOrEqual(0);
  await card.getByRole('group', { name: 'NSC', exact: true }).getByRole('button').first().click();
  await expect(card).toContainText('2 ausgewählt');

  await card.getByRole('button', { name: /2 Einträge in den Log übernehmen/ }).click();
  await expect(card).toBeHidden();
  const entry = entries(page).last();
  await expect(entry).toContainText('Karte');
  await expect(entry).toContainText('„Was steckt hinter dem Notsignal?“');
  await expect(entry.locator('dt')).toHaveText(['Zufallsereignis · Aktion', 'NSC · Aussehen']);
  await expect(entry.locator('dd').first()).toHaveText(actionWords.join(' · '));
});

test('Inspirationskarte: eine Tafel, die nicht passt, ist ein Knopf und klappt beim Antippen auf', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  const world = card.getByRole('button', { name: /Welt · Wesen/ });
  await expect(world).toBeVisible();
  await world.click();
  await expect(card.getByRole('heading', { level: 3, name: 'Welt' })).toBeVisible();
  await expect(card.getByRole('button', { name: /Welt · Wesen/ })).toHaveCount(0);
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
  const entry = entries(page).last();
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
  const entry = entries(page).last();
  await expect(entry.locator('dt')).toHaveText(['1–10', 'Kartensymbol']);
  await expect(entry.locator('dd').first()).toHaveText(bell);
  await expect(entry.getByRole('img', { name: /^Kartensymbol: / })).toBeVisible();
});

test('Inspirationskarte: verwerfen schreibt nichts in den Log, neu ziehen behält die Frage', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  const question = card.getByPlaceholder(/Frage an die Karte/);
  await question.fill('Und jetzt?');
  await card.locator('.tile').first().click();
  await expect(card).toContainText('1 ausgewählt');
  await card.getByRole('button', { name: 'Neu ziehen' }).click();
  await revealed(card);
  await expect(card).toContainText('Nichts ausgewählt');
  await expect(question).toHaveValue('Und jetzt?');
  await card.getByRole('button', { name: 'Karte verwerfen' }).click();
  await expect(card).toBeHidden();
  await expect(entries(page)).toHaveCount(0);
});

test('Spielstand und die Stufe der Proben überstehen einen Neustart; die Stufe steht erst mit der Probe da', async ({ page }) => {
  const kira = characters(page).getByRole('region', { name: 'Spielercharaktere' }).getByRole('article', { name: 'Kira Vant' });
  await kira.getByRole('button', { name: 'Pilot-2' }).click();
  await page.getByRole('radio', { name: /Hoch/ }).click();
  await page.getByRole('button', { name: 'Probe abbrechen' }).click();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(entries(page)).toHaveCount(1);
  await page.reload();
  await expect(entries(page)).toHaveCount(1);
  await kira.getByRole('button', { name: 'Pilot-2' }).click();
  await expect(page.getByRole('radio', { name: /Hoch/ })).toHaveAttribute('aria-checked', 'true');
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

test('Vollbild: der Knopf im Menü schaltet an und aus', async ({ page }) => {
  await page.getByRole('button', { name: 'Menü', exact: true }).click();
  const header = page.getByRole('navigation', { name: 'Menü' });
  await header.getByRole('button', { name: 'Vollbild' }).click();
  await expect(header.getByRole('button', { name: 'Vollbild beenden' })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
  await header.getByRole('button', { name: 'Vollbild beenden' }).click();
  await expect(header.getByRole('button', { name: 'Vollbild' })).toHaveAttribute('aria-pressed', 'false');
});

test('Notiz und Deutung im eigenen Blatt; Deuten am Ergebnis, ältere klappt man auf; Löschen nimmt die Deutungen mit', async ({ page }) => {
  // Eine Frage an die Karte, dann ein Wurf.
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  await card.getByPlaceholder(/Frage an die Karte/).fill('Ist Halvek ehrlich?');
  await card.getByRole('button', { name: /^Mittel, 50 %/ }).click();
  await card.getByRole('button', { name: /in den Log übernehmen/ }).click();
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();

  const sheet = page.getByRole('dialog', { name: 'Notiz' });
  await oracle(page).getByRole('button', { name: 'Notiz', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'Notieren' })).toBeDisabled();
  await sheet.getByPlaceholder(/Was passiert/).fill('Wir landen auf Regina.');
  await sheet.getByRole('button', { name: 'Notieren' }).click();
  await expect(sheet).toBeHidden();
  await expect(entries(page).last()).toContainText('Wir landen auf Regina.');

  // Der Wurf ist jetzt eine Zeile; aufklappen, dann deuten.
  const dice = entries(page).filter({ hasText: '2W6' });
  await dice.getByRole('button', { name: /2W6/ }).click();
  await dice.getByRole('button', { name: 'Deuten' }).click();
  const reading = page.getByRole('dialog', { name: 'Deutung' });
  await expect(reading).toContainText(/zu 2W6: \d+/);
  await reading.getByPlaceholder(/Was bedeutet das/).fill('Glück gehabt.');
  await reading.getByRole('button', { name: 'Deuten' }).click();
  await expect(reading).toBeHidden();
  await expect(oracle(page).locator('.entry', { hasText: 'Würfel · 2W6' }).locator('.interpretation')).toContainText('Glück gehabt.');

  // Die Antwort des Orakels deuten, dann mit ihrer Deutung löschen.
  const answer = entries(page).filter({ hasText: 'Ist Halvek ehrlich?' });
  await answer.getByRole('button', { name: /Ist Halvek ehrlich/ }).click();
  await answer.getByRole('button', { name: 'Deuten' }).click();
  await reading.getByPlaceholder(/Was bedeutet das/).fill('Halvek lügt.');
  await reading.getByRole('button', { name: 'Deuten' }).click();
  await expect(answer.locator('.interpretation')).toContainText('Halvek lügt.');
  await answer.getByRole('button', { name: 'Ergebnis löschen' }).click();
  await expect(answer).toContainText('Eintrag mit 1 Deutung endgültig löschen?');
  await answer.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByText('Halvek lügt.')).toHaveCount(0);
  await expect(page.getByText('Glück gehabt.')).toBeVisible();
});

test('Notiz ändern: der Stift öffnet das Blatt mit dem alten Text, der Log zeigt „geändert“', async ({ page }) => {
  await oracle(page).getByRole('button', { name: 'Notiz', exact: true }).click();
  await page.getByPlaceholder(/Was passiert/).fill('Wir landen auf Regina.');
  await page.getByRole('button', { name: 'Notieren' }).click();
  await oracle(page).getByRole('button', { name: 'Notiz ändern' }).click();
  const sheet = page.getByRole('dialog', { name: 'Notiz ändern' });
  await expect(sheet.getByPlaceholder(/Was passiert/)).toHaveValue('Wir landen auf Regina.');
  await sheet.getByPlaceholder(/Was passiert/).fill('Wir landen auf Mora.');
  await sheet.getByRole('button', { name: 'Speichern' }).click();
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page).last()).toContainText('Wir landen auf Mora.');
  await expect(entries(page).last()).toContainText(/geändert \d\d:\d\d/);
});

test('Zufallsereignis: bei einem Pasch bis 55 erst nach der Wahl der Stufe ein Band auf der Karte, dann im Log', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  const field = card.getByRole('group', { name: /^Orakel, W100/ });
  // Neu ziehen, bis der Orakelwurf ein Pasch ist (je Karte 5 %; 400 Versuche verfehlen fast nie).
  for (let i = 0; i < 400; i++) {
    const roll = Number((await field.getAttribute('aria-label'))!.match(/\d+$/)![0]);
    if (roll % 11 === 0 && roll <= 55) break;
    await card.getByRole('button', { name: 'Neu ziehen' }).click();
  }
  await expect(field).toHaveAttribute('aria-label', /W100 (11|22|33|44|55)$/);
  await revealed(card);
  await expect(card.locator('.card-event')).toHaveCount(0);
  await field.getByRole('button').first().click();
  await expect(card.locator('.card-event')).toContainText(/Zufallsereignis: \S/);
  await card.getByRole('button', { name: /in den Log übernehmen/ }).click();
  await expect(entries(page).last()).toContainText(/Zufallsereignis: \S/);
});

test('Gleiche Würfe in Folge stehen als eine Zeile; antippen faltet sie auf', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: '2W6', exact: true }).click();
    await expect(page.locator('.dice-roll')).toBeHidden();
  }
  // Die zwei älteren Würfe als eine Zeile, der neueste groß.
  await expect(entries(page)).toHaveCount(2);
  const merged = entries(page).first().getByRole('button', { name: /^2 Würfe 2W6/ });
  await expect(merged).toContainText('2W6 × 2');
  await merged.click();
  await expect(entries(page)).toHaveCount(3);
});

test('Eine ältere Karte ohne Frage zeigt ihre Felder in der Zeile nur einmal', async ({ page }) => {
  await page.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  await card.getByRole('group', { name: 'Zufallsereignis' }).getByRole('button').first().click();
  await card.getByRole('group', { name: 'NSC', exact: true }).getByRole('button').first().click();
  await card.getByRole('button', { name: /2 Einträge in den Log übernehmen/ }).click();
  await expect(card).toBeHidden();
  // Ein Wurf danach, dann steht die Karte als Zeile da.
  await oracle(page).getByRole('button', { name: '2W6', exact: true }).click();
  const row = entries(page).first();
  await expect(row.locator('.row-result')).toHaveText('Karte');
  await expect(row.locator('.row-picks span')).toHaveCount(2);
  await expect(row.locator('.row-what')).toHaveCount(0);
  await page.screenshot({ path: process.env.SHOT ?? 'test-results/karte-zeile.png' });
});

test('Deuten mit dem Knopf in der Reihe unten: gilt dem neuesten Ergebnis', async ({ page }) => {
  await oracle(page).getByRole('button', { name: '2W6', exact: true }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await oracle(page).getByRole('button', { name: 'Neuestes Ergebnis deuten' }).click();
  const reading = page.getByRole('dialog', { name: 'Deutung' });
  await expect(reading).toContainText(/zu 2W6: \d+/);
  await reading.getByPlaceholder(/Was bedeutet das/).fill('Die Tür ist offen.');
  await reading.getByRole('button', { name: 'Deuten' }).click();
  await expect(reading).toBeHidden();
  await expect(oracle(page).locator('.entry', { hasText: 'Würfel · 2W6' }).locator('.interpretation')).toContainText('Die Tür ist offen.');
});

test('Die Reihe unten steht auf dem Smartphone nur im Log', async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== 'mobil', 'Im Desktop-Modus steht sie unter jedem Bereich ohne eigene Reihe');
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  await expect(oracle(page).getByRole('button', { name: '2W6', exact: true })).toBeVisible();
  for (const name of ['Begegnung', 'Charaktere', 'Schiff']) {
    await nav.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('region', { name: 'Orakel und Proben' })).toHaveCount(0);
  }
  for (const part of ['NSC', 'Kasse'] as const) {
    await openPeople(page, part);
    await expect(page.getByRole('region', { name: 'Orakel und Proben' })).toHaveCount(0);
  }
  await openCombat(page);
  await expect(page.getByRole('region', { name: 'Orakel und Proben' })).toHaveCount(0);
});

test('Ziehblatt ganz hinunter: Reihe und Reiter rutschen mit hinaus, nur der Griff bleibt; ein Tippen holt es zurück', async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== 'mobil', 'Das Ziehblatt gibt es nur auf dem Smartphone');
  const viewport = page.viewportSize()!;
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  const grip = page.locator('.tray-grip');
  const box = (await grip.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, viewport.height - 2, { steps: 8 });
  await page.mouse.up();
  // Reiter und Würfel liegen unter dem Bildschirmrand, der Griff steht unten.
  await expect.poll(async () => (await nav.boundingBox())!.y).toBeGreaterThanOrEqual(viewport.height);
  await expect.poll(async () => (await oracle(page).getByRole('button', { name: '2W6', exact: true }).boundingBox())!.y).toBeGreaterThanOrEqual(viewport.height);
  expect((await grip.boundingBox())!.y).toBeLessThan(viewport.height);
  // Das Gerät merkt es sich, auch nach dem Neuladen.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Blatt hervorholen' })).toBeVisible();
  await page.getByRole('button', { name: 'Blatt hervorholen' }).click();
  await expect.poll(async () => { const b = (await nav.boundingBox())!; return b.y + b.height; }).toBeLessThanOrEqual(viewport.height + 1);
});
