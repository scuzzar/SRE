import { expect, test, type TestInfo } from '@playwright/test';

// Der Desktop-Modus (ab 1024 px): die Bereiche stehen als Reiterzeile unter der Kopfzeile, und
// das Orakel steht als Spalte rechts neben jedem Bereich – mit Charakteren, Log, Orakel und Proben.
// Diese Tests prüfen genau das und laufen nur im Projekt „desktop“; im Projekt „mobil“ werden sie
// übersprungen.

const onlyDesktop = (testInfo: TestInfo) => testInfo.skip(testInfo.project.name !== 'desktop', 'nur im Desktop-Modus');
const areas = ['Begegnung', 'Kampf', 'Shop', 'Charaktere', 'Sektor'];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Die Bereiche stehen oben als Reiter, das Orakel steht rechts – auf jedem Screen', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  const viewport = page.viewportSize()!;
  const navBox = (await nav.boundingBox())!;
  expect(navBox.y).toBeLessThan(viewport.height / 2);
  // Das Orakel ist kein Reiter mehr; beim Start steht der Bereich Charaktere offen.
  await expect(nav.getByRole('button', { name: 'Orakel', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Charaktere', exact: true })).toHaveAttribute('aria-current', 'page');
  const panel = page.getByRole('complementary', { name: 'Orakel' });
  for (const name of areas) {
    await nav.getByRole('button', { name, exact: true }).click();
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    const host = (await page.locator('.screen-host').boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(host.x + host.width - 1);
    expect(box.width).toBeGreaterThanOrEqual(400);
    // Charaktere, Log und die Knöpfe des Orakels stehen in der Spalte.
    await expect(panel.getByRole('region', { name: 'Spielercharaktere' })).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Karte ziehen' })).toBeVisible();
    await expect(panel.getByRole('button', { name: '2W6' })).toBeVisible();
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

test('Eine Probe aus der Orakel-Spalte lässt sich in jedem Bereich würfeln', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const panel = page.getByRole('complementary', { name: 'Orakel' });
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Begegnung', exact: true }).click();
  await panel.getByRole('article', { name: 'Kira Vant' }).getByRole('button', { name: 'Pilot-2' }).click();
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

