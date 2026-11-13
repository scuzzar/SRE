import { expect, test, type Page, type TestInfo } from '@playwright/test';

// Der Desktop-Modus (ab 1024 px): die Bereiche stehen als Reiterzeile unter der Kopfzeile, darunter
// drei Spalten: links das Orakel mit Log, daneben die Charakterspalte, rechts der gewählte Bereich.
// Diese Tests prüfen genau das und laufen nur im Projekt „desktop“; im Projekt „mobil“ werden sie
// übersprungen.

const onlyDesktop = (testInfo: TestInfo) => testInfo.skip(testInfo.project.name !== 'desktop', 'nur im Desktop-Modus');
const areas = ['Begegnung', 'Kampf', 'Shop', 'Charaktere', 'Sektor'];
const column = (page: Page) => page.getByRole('complementary', { name: 'Charakterspalte' }).getByRole('region', { name: 'Spielercharaktere' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Reiter oben; darunter links Orakel, daneben die Charaktere, rechts der Bereich – auf jedem Screen', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  const viewport = page.viewportSize()!;
  const navBox = (await nav.boundingBox())!;
  expect(navBox.y).toBeLessThan(viewport.height / 2);
  // Das Orakel ist kein Reiter mehr; beim Start steht der Bereich Sektor offen.
  await expect(nav.getByRole('button', { name: 'Orakel', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Sektor', exact: true })).toHaveAttribute('aria-current', 'page');
  const oracle = page.getByRole('complementary', { name: 'Orakel' });
  const chars = page.getByRole('complementary', { name: 'Charakterspalte' });
  for (const name of areas) {
    await nav.getByRole('button', { name, exact: true }).click();
    const o = (await oracle.boundingBox())!;
    const c = (await chars.boundingBox())!;
    const h = (await page.locator('.screen-host').boundingBox())!;
    expect(c.x).toBeGreaterThanOrEqual(o.x + o.width - 1);
    expect(h.x).toBeGreaterThanOrEqual(c.x + c.width - 1);
    // Log und Knöpfe im Orakel, die Charaktere nur in ihrer Spalte, keine Leiste im Bereich.
    await expect(oracle.getByRole('button', { name: 'Karte ziehen' })).toBeVisible();
    await expect(oracle.getByRole('button', { name: '2W6' })).toBeVisible();
    await expect(oracle.locator('.strip')).toHaveCount(0);
    await expect(column(page).getByRole('article')).toHaveCount(2);
    await expect(page.locator('.screen-host .strip')).toHaveCount(0);
  }
});

test('Ein Wurf landet im Log der Orakel-Spalte und bleibt beim Wechsel der Bereiche sichtbar', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const panel = page.getByRole('complementary', { name: 'Orakel' });
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Shop', exact: true }).click();
  await panel.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await expect(panel.locator('.entry').last()).toContainText('Würfel · 2W6');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Kampf', exact: true }).click();
  await expect(panel.locator('.entry').last()).toContainText('Würfel · 2W6');
  await expect(page.locator('.entry')).toHaveCount(1);
});

test('Deuten geht in jedem Bereich: das angetippte Ergebnis wird zum Ziel der Deutung', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const panel = page.getByRole('complementary', { name: 'Orakel' });
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Sektor', exact: true }).click();
  await panel.getByRole('button', { name: /Ja\/Nein/ }).click();
  await panel.getByPlaceholder(/Frage, Deutung, Notiz/).fill('Der Wurf ist gut.');
  await panel.locator('.entry', { hasText: 'Orakel' }).click();
  await expect(panel.locator('.target-line')).toContainText(/Deutung zu (JA|NEIN)/);
  await panel.getByRole('button', { name: 'Deuten' }).click();
  await expect(panel.locator('.entry', { hasText: 'Orakel' }).locator('.interpretation')).toContainText('Der Wurf ist gut.');
});

test('Eine Probe aus der Charakterspalte lässt sich in jedem Bereich würfeln', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const panel = page.getByRole('complementary', { name: 'Orakel' });
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Begegnung', exact: true }).click();
  await column(page).getByRole('article', { name: 'Kira Vant' }).getByRole('button', { name: 'Pilot-2' }).click();
  await panel.getByRole('button', { name: 'Probe würfeln' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await expect(panel.locator('.entry').last()).toContainText('Kira Vant · Pilot-2');
});

test('Die Sektor-Karte lässt sich mit dem Mausrad zoomen und mit der Maus verschieben', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Sektor', exact: true }).click();
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

test('Die Sektor-Karte passt ganz in den Screen, und der Screen wird nicht breiter als 960 px', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Sektor', exact: true }).click();
  const viewport = page.viewportSize()!;
  const map = (await page.locator('.sector-viewport').boundingBox())!;
  expect(map.y + map.height).toBeLessThanOrEqual(viewport.height);
  // Auch mit dem Dock des gewählten Feldes bleibt die unterste Reihe sichtbar.
  await page.locator('.sector-viewport').getByRole('button', { name: '0110, nicht erzeugt' }).click();
  const dock = (await page.locator('.sector-dock').boundingBox())!;
  expect(map.y + map.height).toBeLessThanOrEqual(dock.y);
  const host = (await page.locator('.screen-host').boundingBox())!;
  expect(host.width).toBeLessThanOrEqual(960);
});

test('Die Charakterspalte blendet ein, was der Bereich braucht; ein Klick auf eine Karte holt sie nach oben', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  const kira = column(page).getByRole('article', { name: 'Kira Vant' });
  const jonas = column(page).getByRole('article', { name: 'Jonas Reyl' });
  // Immer: beide untereinander mit Attributen und Fertigkeiten; Punkte und Einklappen gibt es nicht.
  const k = (await kira.boundingBox())!;
  expect((await jonas.boundingBox())!.y).toBeGreaterThan(k.y + k.height - 1);
  await expect(jonas).toContainText('Ste-1');
  await expect(column(page).getByRole('button', { name: 'Leiste einklappen' })).toHaveCount(0);
  await expect(kira.getByRole('group', { name: 'Waffe in der Hand' })).toHaveCount(0);

  // Im Kampf: Rüstung und Waffen; antippen nimmt die Waffe in die Hand.
  await nav.getByRole('button', { name: 'Kampf', exact: true }).click();
  await expect(kira).toContainText('Jack');
  await kira.getByRole('button', { name: /Automatic Pistol/ }).click();
  await expect(page.getByRole('heading', { name: 'Automatic Pistol' })).toBeVisible();

  // Im Shop: Credits und Besitz; Jonas per Klick auf seine Karte nach oben, dann kauft man für ihn.
  await nav.getByRole('button', { name: 'Shop', exact: true }).click();
  await expect(kira).toContainText('Cr 12.400');
  await expect(kira).toContainText('Besitz');
  await expect(jonas).toContainText('Blade');
  await jonas.locator('.upp').click();
  await expect(jonas).toHaveClass(/focus/);
  await expect(kira).not.toHaveClass(/focus/);
  await expect(page.locator('.screen-host')).toContainText('Jonas Reyl hat die Fertigkeit');
});

test('Die Ziffern wählen die Bereiche der Reiterzeile', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  await expect(nav).toBeVisible();
  for (const [key, name] of [['1', 'Begegnung'], ['2', 'Kampf'], ['3', 'Shop'], ['4', 'Charaktere'], ['5', 'Sektor']]) {
    await page.keyboard.press(key!);
    await expect(nav.getByRole('button', { name: name!, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  // Im Fragefeld gehören die Ziffern dem Text.
  await page.getByPlaceholder(/Frage, Deutung, Notiz/).fill('');
  await page.getByPlaceholder(/Frage, Deutung, Notiz/).press('2');
  await expect(nav.getByRole('button', { name: 'Sektor', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByPlaceholder(/Frage, Deutung, Notiz/)).toHaveValue('2');
});
