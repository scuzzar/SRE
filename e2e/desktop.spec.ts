import { expect, test, type TestInfo } from '@playwright/test';

// Der Desktop-Modus (ab 1024 px): die Bereiche stehen als Reiterzeile unter der Kopfzeile, und
// der Log steht links auf jedem Screen. Diese Tests prüfen genau das und laufen nur im Projekt
// „desktop“; im Projekt „mobil“ werden sie übersprungen.

const onlyDesktop = (testInfo: TestInfo) => testInfo.skip(testInfo.project.name !== 'desktop', 'nur im Desktop-Modus');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('Die Bereiche stehen oben als Reiter, der Log steht links – auf jedem Screen', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  const viewport = page.viewportSize()!;
  const navBox = (await nav.boundingBox())!;
  expect(navBox.y).toBeLessThan(viewport.height / 2);
  for (const name of ['Orakel', 'Begegnung', 'Kampf', 'Shop', 'Charaktere', 'Sektor']) {
    await nav.getByRole('button', { name, exact: true }).click();
    const panel = page.locator('.log-panel');
    await expect(panel).toBeVisible();
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeLessThan(100);
    expect(box.y).toBeLessThan(viewport.height / 2);
  }
});

test('Ein Wurf landet im Log links und bleibt beim Wechsel der Bereiche sichtbar', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.dice-roll')).toBeHidden();
  await expect(page.locator('.log-panel .entry').last()).toContainText('Würfel · 2W6');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Kampf', exact: true }).click();
  await expect(page.locator('.log-panel .entry').last()).toContainText('Würfel · 2W6');
  await expect(page.locator('.log-panel .entry')).toHaveCount(1);
});

test('Deuten über den Log links: das angetippte Ergebnis wird zum Ziel der Deutung', async ({ page }, testInfo) => {
  onlyDesktop(testInfo);
  await page.getByRole('button', { name: /Ja\/Nein/ }).click();
  await page.getByPlaceholder(/Frage, Deutung, Notiz/).fill('Der Wurf ist gut.');
  await page.locator('.log-panel .entry', { hasText: 'Orakel' }).click();
  await expect(page.locator('.target-line')).toContainText(/Deutung zu (JA|NEIN)/);
  await page.getByRole('button', { name: 'Deuten' }).click();
  await expect(page.locator('.log-panel .entry', { hasText: 'Orakel' }).locator('.interpretation')).toContainText('Der Wurf ist gut.');
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
