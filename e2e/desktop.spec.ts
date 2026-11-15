import { expect, test, type Page, type TestInfo } from '@playwright/test';

// Der Desktop-Modus (ab 1024 px): links fest das Log-Panel mit den Reitern, dem Charakter oben und der
// Reihe Notiz, 2W6, Karte; ein Reiter öffnet daneben den Bereich als schließbares Panel; rechts die
// Grundkarte (Globus oder Subsektor). Diese Tests laufen nur im Projekt „desktop“.

const onlyDesktop = (testInfo: TestInfo) => testInfo.skip(testInfo.project.name !== 'desktop', 'nur im Desktop-Modus');
const areas = ['Begegnung', 'Kampf', 'Shop', 'Charaktere', 'NSC'];
const panel = (page: Page) => page.getByRole('complementary', { name: 'Log' });
const nav = (page: Page) => page.getByRole('navigation', { name: 'Bereiche' });
const strip = (page: Page) => panel(page).getByRole('region', { name: 'Spielercharaktere' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Links das Log mit den Reitern, daneben der Bereich als Panel, rechts die Grundkarte', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  // Beim Start: kein Bereich offen, der Subsektor füllt den Rest (die Demo-Welt hat noch keinen Globus).
  await expect(nav(page).getByRole('button', { name: 'Log', exact: true })).toHaveCount(0);
  await expect(nav(page).getByRole('button', { name: 'Sektor', exact: true })).toHaveCount(0);
  await expect(page.locator('.area-panel')).toHaveCount(0);
  const log = (await panel(page).boundingBox())!;
  const map = (await page.locator('.base').boundingBox())!;
  expect(map.x).toBeGreaterThanOrEqual(log.x + log.width - 1);
  await expect(page.locator('.sector-viewport')).toBeVisible();
  for (const name of areas) {
    await nav(page).getByRole('button', { name, exact: true }).click();
    const area = (await page.locator('.area-panel').boundingBox())!;
    const base = (await page.locator('.base').boundingBox())!;
    expect(area.x).toBeGreaterThanOrEqual(log.x + log.width - 1);
    expect(base.x).toBeGreaterThanOrEqual(area.x + area.width - 1);
    await expect(panel(page).getByRole('button', { name: 'Karte ziehen' })).toBeVisible();
    await expect(panel(page).getByRole('button', { name: '2W6' })).toBeVisible();
  }
  // Ein zweiter Klick auf den offenen Reiter schließt das Panel, ebenso ✕.
  await nav(page).getByRole('button', { name: 'NSC', exact: true }).click();
  await expect(page.locator('.area-panel')).toHaveCount(0);
  await nav(page).getByRole('button', { name: 'Shop', exact: true }).click();
  await page.getByRole('button', { name: 'Shop schließen' }).click();
  await expect(page.locator('.area-panel')).toHaveCount(0);
});

test('Ein Wurf landet im Log und bleibt beim Wechsel der Bereiche sichtbar', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await nav(page).getByRole('button', { name: 'Shop', exact: true }).click();
  await panel(page).getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await expect(panel(page).locator('.entry').last()).toContainText('Würfel · 2W6');
  await nav(page).getByRole('button', { name: 'Kampf', exact: true }).click();
  await expect(panel(page).locator('.entry').last()).toContainText('Würfel · 2W6');
  await expect(page.locator('.entry')).toHaveCount(1);
});

test('Deuten geht in jedem Bereich: der Knopf am Ergebnis öffnet das Blatt der Deutung', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await nav(page).getByRole('button', { name: 'Begegnung', exact: true }).click();
  await panel(page).getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await panel(page).getByRole('button', { name: 'Deuten' }).click();
  const reading = page.getByRole('dialog', { name: 'Deutung' });
  await reading.getByPlaceholder(/Was bedeutet das/).fill('Der Wurf ist gut.');
  await reading.getByRole('button', { name: 'Deuten' }).click();
  await expect(panel(page).locator('.entry', { hasText: 'Würfel · 2W6' }).locator('.interpretation')).toContainText('Der Wurf ist gut.');
  await expect(nav(page).getByRole('button', { name: 'Begegnung', exact: true })).toHaveAttribute('aria-current', 'page');
});

test('Eine Probe aus dem Charakter oben im Log lässt sich in jedem Bereich würfeln', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await nav(page).getByRole('button', { name: 'Begegnung', exact: true }).click();
  await strip(page).getByRole('article', { name: 'Kira Vant' }).getByRole('button', { name: 'Pilot-2' }).click();
  await panel(page).getByRole('button', { name: 'Probe würfeln' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await expect(panel(page).locator('.entry').last()).toContainText('Kira Vant · Pilot-2');
});

test('Die Sektor-Karte lässt sich mit dem Mausrad zoomen und mit der Maus verschieben', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const map = page.locator('.sector-viewport');
  const before = await map.evaluate((el) => el.scrollWidth);
  await map.hover();
  await page.mouse.wheel(0, -240);
  await expect.poll(() => map.evaluate((el) => el.scrollWidth)).toBeGreaterThan(before);
  // Verschieben: Maustaste halten und ziehen; dabei darf kein Feld ausgewählt werden.
  const leftBefore = await map.evaluate((el) => el.scrollLeft);
  const box = (await map.boundingBox())!;
  await page.mouse.move(box.x + 100, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 40, box.y + 80, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => map.evaluate((el) => el.scrollLeft)).toBeGreaterThan(leftBefore);
  await expect(page.locator('.hex-selected')).toHaveCount(0);
  // Die Auswahl funktioniert weiterhin, auch direkt nach dem Verschieben.
  await map.getByRole('button', { name: '0101, nicht erzeugt' }).click();
  await expect(page.locator('.sector-dock')).toContainText('Feld 0101');
});

test('Die Sektor-Karte passt ganz in die Grundkarte, auch mit dem Dock des gewählten Feldes', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const viewport = page.viewportSize()!;
  const map = (await page.locator('.sector-viewport').boundingBox())!;
  expect(map.y + map.height).toBeLessThanOrEqual(viewport.height);
  await page.locator('.sector-viewport').getByRole('button', { name: '0110, nicht erzeugt' }).click();
  const dock = (await page.locator('.sector-dock').boundingBox())!;
  // Die Karte rückt dafür zusammen.
  const smaller = (await page.locator('.sector-viewport').boundingBox())!;
  expect(smaller.y + smaller.height).toBeLessThanOrEqual(dock.y);
});

test('Kampf und Shop zeigen ihre SC selbst; ein Klick auf eine Karte holt sie nach oben', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const area = page.locator('.area-panel');
  // Im Kampf: Rüstung und Waffen; antippen nimmt die Waffe in die Hand.
  await nav(page).getByRole('button', { name: 'Kampf', exact: true }).click();
  const kira = area.getByRole('article', { name: 'Kira Vant' });
  await expect(kira).toContainText('Jack');
  await kira.getByRole('button', { name: /Automatic Pistol/ }).click();
  await expect(page.getByRole('heading', { name: 'Automatic Pistol' })).toBeVisible();
  // Im Shop: Credits; Jonas nach oben, dann kauft man für ihn.
  await nav(page).getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(area.getByRole('article', { name: 'Kira Vant' })).toContainText('Cr 12.400');
  await area.getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  await expect(area).toContainText('Jonas Reyl hat die Fertigkeit');
});

test('Die Ziffern wählen die Reiter', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await expect(nav(page)).toBeVisible();
  for (const [key, name] of [['1', 'Begegnung'], ['2', 'Kampf'], ['3', 'Shop'], ['4', 'Charaktere'], ['5', 'NSC']]) {
    await page.keyboard.press(key!);
    await expect(nav(page).getByRole('button', { name: name!, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  // In der Notiz gehören die Ziffern dem Text.
  await page.keyboard.press('n');
  const note = page.getByPlaceholder(/Was passiert/);
  await note.press('2');
  await expect(nav(page).getByRole('button', { name: 'NSC', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(note).toHaveValue('2');
});

test('Globus als Grundkarte: ein angetipptes Feld öffnet das Panel neben dem Log, ✕ führt zum Subsektor', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await page.getByRole('button', { name: /Aufenthaltsort Kessra.*Globus öffnen/ }).click();
  const globe = page.getByRole('region', { name: 'Globus · Kessra' });
  await expect(globe).toBeVisible();
  const canvas = globe.getByRole('img', { name: /Globus von Kessra/ });
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  const field = page.locator('.area-panel').getByRole('region', { name: 'Angetipptes Feld' });
  await expect(field).toContainText('°C im Jahresmittel');
  // Ein Reiter lässt das Feld los und zeigt den Bereich.
  await nav(page).getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(field).toHaveCount(0);
  await expect(page.locator('.area-panel')).toContainText('Cr ');
  // ✕ auf dem Globus führt zum Subsektor; neu geladen liegt der Globus von Kessra wieder unter allem.
  await globe.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.locator('.sector-viewport')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Globus · Kessra' })).toBeVisible();
  // Ganz herausgezoomt geht es mit − weiter zum Subsektor.
  await expect(async () => {
    await page.getByRole('button', { name: 'Herauszoomen' }).click();
    await expect(page.locator('.sector-viewport')).toBeVisible({ timeout: 1000 });
  }).toPass();
});

test('Ausrüstung und Gepäck: per Ziehen von SC zu SC und zurück ins Gepäck', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await nav(page).getByRole('button', { name: 'Charaktere', exact: true }).click();
  const kira = page.getByRole('group', { name: 'Ausrüstung von Kira Vant' });
  const jonas = page.getByRole('group', { name: 'Ausrüstung von Jonas Reyl' });
  const pack = page.getByRole('list', { name: 'Gepäck' });
  // Kiras Automatic Pistol auf Jonas' Primärwaffe: Seine Blade kommt ins Gepäck.
  await kira.getByLabel(/Kira Vant, Primär: Automatic Pistol/).dragTo(jonas.getByLabel(/Jonas Reyl, Primär/));
  await expect(jonas.getByLabel(/Jonas Reyl, Primär/)).toContainText('Automatic Pistol');
  await expect(kira.getByLabel(/Kira Vant, Primär/)).toContainText('Hände');
  await expect(pack).toContainText('Blade');
  // Zurück ins Gepäck ziehen legt sie ab.
  await jonas.getByLabel(/Jonas Reyl, Primär: Automatic Pistol/).dragTo(pack);
  await expect(pack).toContainText('Automatic Pistol');
  // Die Last steht als Balken über dem Gepäck.
  await expect(page.locator('.stash-load')).toContainText(/Last [\d,]+ \/ [\d,]+ kg/);
});
