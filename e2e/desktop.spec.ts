import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { openPeople, openShop, openCombat } from './layout';

// Der Desktop-Modus (ab 1024 px): links eine Spalte mit den Reitern, darunter das Log mit dem Charakter
// oben oder an seiner Stelle der gewählte Bereich bzw. das angetippte Feld; unten die Reihe Notiz,
// Deuten, 2W6, Karte, wo der Bereich keine eigene hat; rechts die Grundkarte (Globus oder Subsektor).
// Diese Tests laufen nur im Projekt „desktop“.

const onlyDesktop = (testInfo: TestInfo) => testInfo.skip(testInfo.project.name !== 'desktop', 'nur im Desktop-Modus');
const areas = ['Charaktere', 'Schiff'];
const panel = (page: Page) => page.getByRole('complementary', { name: 'Seitenspalte' });
const head = (page: Page) => panel(page).locator('.area-head');
const nav = (page: Page) => page.getByRole('navigation', { name: 'Bereiche' });
const strip = (page: Page) => panel(page).getByRole('region', { name: 'Spielercharaktere' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Links eine Spalte: das Log, an seiner Stelle der Bereich; rechts die Grundkarte', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  // Beim Start: das Log mit dem Charakter oben, der Subsektor füllt den Rest (die Demo-Welt hat noch keinen Globus).
  await expect(nav(page).getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(nav(page).getByRole('button', { name: 'Sektor', exact: true })).toHaveCount(0);
  await expect(strip(page)).toBeVisible();
  await expect(head(page)).toHaveCount(0);
  const side = (await panel(page).boundingBox())!;
  const map = (await page.locator('.base').boundingBox())!;
  expect(map.x).toBeGreaterThanOrEqual(side.x + side.width - 1);
  await expect(page.locator('.sector-viewport')).toBeVisible();
  for (const name of areas) {
    await nav(page).getByRole('button', { name, exact: true }).click();
    // Der Bereich steht an der Stelle des Logs, in derselben Spalte; die Grundkarte bleibt, wo sie war.
    await expect(head(page)).toContainText(name);
    await expect(panel(page).locator('.log')).toHaveCount(0);
    expect((await panel(page).boundingBox())!.width).toBe(side.width);
    expect((await page.locator('.base').boundingBox())!.x).toBe(map.x);
    await expect(panel(page).getByRole('button', { name: 'Karte ziehen' })).toBeVisible();
    await expect(panel(page).getByRole('button', { name: '2W6' })).toBeVisible();
  }
  // Ein zweiter Klick auf den offenen Reiter führt zurück zum Log, auch unter NSC; ebenso ✕ und der Reiter Log.
  await openPeople(page, 'NSC');
  await expect(head(page)).toContainText('Charaktere');
  await nav(page).getByRole('button', { name: 'Charaktere', exact: true }).click();
  await expect(strip(page)).toBeVisible();
  await nav(page).getByRole('button', { name: 'Schiff', exact: true }).click();
  await page.getByRole('button', { name: 'Schiff schließen' }).click();
  await expect(strip(page)).toBeVisible();
  await nav(page).getByRole('button', { name: 'Schiff', exact: true }).click();
  await nav(page).getByRole('button', { name: 'Log', exact: true }).click();
  await expect(strip(page)).toBeVisible();
  await expect(head(page)).toHaveCount(0);
});

test('Ein Wurf in einem Bereich landet im Log', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await nav(page).getByRole('button', { name: 'Schiff', exact: true }).click();
  await panel(page).getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await expect(nav(page).getByRole('button', { name: 'Schiff', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav(page).getByRole('button', { name: 'Log', exact: true }).click();
  await expect(panel(page).locator('.entry').last()).toContainText('Würfel · 2W6');
  await expect(page.locator('.entry')).toHaveCount(1);
});

test('Deuten geht auch in einem Bereich: der Knopf am Ergebnis öffnet das Blatt der Deutung', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await nav(page).getByRole('button', { name: 'Schiff', exact: true }).click();
  await panel(page).getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await panel(page).getByRole('button', { name: 'Neuestes Ergebnis deuten' }).click();
  const reading = page.getByRole('dialog', { name: 'Deutung' });
  await reading.getByPlaceholder(/Was bedeutet das/).fill('Der Wurf ist gut.');
  await reading.getByRole('button', { name: 'Deuten' }).click();
  await expect(nav(page).getByRole('button', { name: 'Schiff', exact: true })).toHaveAttribute('aria-current', 'page');
  await nav(page).getByRole('button', { name: 'Log', exact: true }).click();
  await expect(panel(page).locator('.entry', { hasText: 'Würfel · 2W6' }).locator('.interpretation')).toContainText('Der Wurf ist gut.');
});

test('Eine Probe aus dem Charakter oben lässt sich auch in einem Bereich würfeln', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await strip(page).getByRole('article', { name: 'Kira Vant' }).getByRole('button', { name: 'Pilot-2' }).click();
  await nav(page).getByRole('button', { name: 'Schiff', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Probe würfeln' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await nav(page).getByRole('button', { name: 'Log', exact: true }).click();
  await expect(panel(page).locator('.entry').last()).toContainText('Kira Vant · Pilot-2');
});

test('Die Sektor-Karte lässt sich mit dem Mausrad zoomen und mit der Maus verschieben, ohne Bildlaufleisten', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const map = page.locator('.sector-viewport');
  const svg = page.getByRole('group', { name: 'Karte des Subsektors' });
  const box = async () => (await svg.getAttribute('viewBox'))!.split(' ').map(Number);
  const before = await box();
  await map.hover();
  await page.mouse.wheel(0, -240);
  await expect.poll(async () => (await box())[2]!).toBeLessThan(before[2]!);
  // Verschieben: Maustaste halten und ziehen; dabei darf kein Feld ausgewählt werden.
  const zoomed = await box();
  const r = (await map.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width / 2 - 40, r.y + r.height / 2 - 120, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => (await box())[1]!).toBeGreaterThan(zoomed[1]!);
  await expect(page.locator('.hex-selected')).toHaveCount(0);
  expect(await map.evaluate((el) => [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight])).toEqual([0, 0]);
  // Die Auswahl funktioniert weiterhin, auch direkt nach dem Verschieben.
  const kessra = page.getByRole('button', { name: '0405, Kessra: Weltkarte öffnen' });
  await expect(kessra).toBeVisible();
  await page.getByRole('button', { name: '0406, nicht erzeugt' }).click();
  await expect(page.locator('.sector-dock')).toContainText('Feld 0406');
});

test('Die Sektor-Karte füllt die Grundkarte und passt ganz hinein; das gewählte Feld schwebt darüber', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const viewport = page.viewportSize()!;
  const base = (await page.locator('.base').boundingBox())!;
  const map = (await page.getByRole('group', { name: 'Karte des Subsektors' }).boundingBox())!;
  // Die Fläche der Karte reicht über die ganze Breite und fast die ganze Höhe der Grundkarte.
  expect(map.width).toBeGreaterThan(base.width - 20);
  expect(map.height).toBeGreaterThan(base.height - 80);
  expect(await page.locator('.base .sector').evaluate((el) => el.scrollHeight - el.clientHeight)).toBe(0);
  // Die unterste Reihe ist zu sehen, auch mit dem gewählten Feld darüber.
  const corner = page.getByRole('button', { name: '0110, nicht erzeugt' });
  expect(((await corner.boundingBox())!.y + (await corner.boundingBox())!.height)).toBeLessThanOrEqual(viewport.height);
  await page.getByRole('button', { name: '0310, nicht erzeugt' }).click();
  await expect(page.locator('.sector-dock')).toContainText('Feld 0310');
  expect((await page.getByRole('group', { name: 'Karte des Subsektors' }).boundingBox())!.height).toBe(map.height);
});

test('Kampf und Shop zeigen ihre SC selbst; ein Klick auf eine Karte holt sie nach oben; ✕ am Shop führt zur Weltkarte zurück', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const area = panel(page);
  // Im Kampf: Rüstung und Waffen; antippen nimmt die Waffe in die Hand.
  await openCombat(page);
  const kira = area.getByRole('article', { name: 'Kira Vant' });
  await expect(kira).toContainText('Jack');
  await kira.getByRole('button', { name: /Automatic Pistol/ }).click();
  await expect(page.getByRole('heading', { name: 'Automatic Pistol' })).toBeVisible();
  // Im Shop (Einkaufen an der Weltkarte von Kessra): Credits; Jonas nach oben, dann kauft man für ihn.
  await openShop(page);
  await expect(head(page)).toContainText('Shop');
  await expect(area.getByRole('article', { name: 'Kira Vant' })).toContainText('Cr 12.400');
  await area.getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  await expect(area).toContainText('Jonas Reyl hat die Fertigkeit');
  // Keiner der Reiter ist dabei gewählt; ✕ im Kopf führt zur Weltkarte zurück.
  await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Shop schließen' }).click();
  await expect(area.getByRole('button', { name: 'Einkaufen', exact: true })).toBeVisible();
});

test('Die Ziffern wählen die Reiter', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await expect(nav(page)).toBeVisible();
  for (const [key, name] of [['2', 'Begegnung'], ['3', 'Charaktere'], ['4', 'Schiff'], ['1', 'Log']]) {
    await page.keyboard.press(key!);
    await expect(nav(page).getByRole('button', { name: name!, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  // In der Notiz gehören die Ziffern dem Text.
  await page.keyboard.press('n');
  const note = page.getByPlaceholder(/Was passiert/);
  await note.press('2');
  await expect(nav(page).getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(note).toHaveValue('2');
});

test('Globus als Grundkarte: ein angetipptes Feld steht in der Seitenspalte, ✕ führt zum Subsektor', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  // Der Globus wird zweimal aufgebaut (öffnen und nach dem Neuladen); das dauert ohne Grafikkarte.
  test.setTimeout(90_000);
  await page.getByRole('button', { name: /Aufenthaltsort Kessra.*Globus öffnen/ }).click();
  const globe = page.getByRole('region', { name: 'Globus · Kessra' });
  await expect(globe).toBeVisible();
  const canvas = globe.getByRole('img', { name: /Globus von Kessra/ });
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
  const field = panel(page).getByRole('region', { name: 'Angetipptes Feld' });
  await expect(field).toContainText('°C im Jahresmittel');
  // Einkaufen zeigt den Shop an der Stelle des Felds; ✕ führt zum Feld zurück.
  await panel(page).getByRole('button', { name: 'Einkaufen', exact: true }).click();
  await expect(field).toHaveCount(0);
  await expect(panel(page).locator('.shop-world')).toContainText('Kessra');
  await page.getByRole('button', { name: 'Shop schließen' }).click();
  await expect(field).toContainText('°C im Jahresmittel');
  // Ein Reiter lässt das Feld los und zeigt den Bereich.
  await nav(page).getByRole('button', { name: 'Charaktere', exact: true }).click();
  await expect(field).toHaveCount(0);
  await expect(head(page)).toContainText('Charaktere');
  // ✕ auf dem Globus führt zum Subsektor; neu geladen liegt der Globus von Kessra wieder unter allem.
  await globe.getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.locator('.sector-viewport')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', { name: 'Globus · Kessra' })).toBeVisible();
  // Ganz herausgezoomt geht es mit − weiter zum Subsektor: erst bis zum Anschlag, dann hinaus.
  await expect(page.locator('.loading-overlay')).toHaveCount(0, { timeout: 30_000 });
  const out = page.getByRole('button', { name: 'Herauszoomen' });
  await expect(async () => {
    if ((await out.count()) > 0) await out.click();
    await expect(page.locator('.sector-viewport')).toBeVisible({ timeout: 5000 });
  }).toPass({ timeout: 45_000 });
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
  // Zurück ins Gepäck ziehen legt sie ab; das Gepäck steht weiter unten in der Spalte, erst hinscrollen.
  await pack.scrollIntoViewIfNeeded();
  await jonas.getByLabel(/Jonas Reyl, Primär: Automatic Pistol/).dragTo(pack);
  await expect(pack).toContainText('Automatic Pistol');
  // Die Last steht als Balken über dem Gepäck.
  await expect(page.locator('.stash-load')).toContainText(/Last [\d,]+ \/ [\d,]+ kg/);
});
