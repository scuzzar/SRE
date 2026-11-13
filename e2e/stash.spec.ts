import { expect, test, type Page } from '@playwright/test';

// Ausrüstung und Gepäck auf dem Smartphone: Ziehen mit dem Finger heißt halten, dann ziehen;
// wischt der Finger gleich, scrollt die Seite und nichts wird gezogen. Touch-Ereignisse schickt der
// Test über das DevTools-Protokoll, weil Playwright kein Ziehen mit dem Finger kennt.

async function fingers(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  return (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
}

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== 'mobil', 'Ziehen mit dem Finger nur auf dem Smartphone');
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Charaktere', exact: true }).click();
  await page.locator('.stash').scrollIntoViewIfNeeded();
});

test('Halten, dann ziehen: der Vacc Suit aus dem Gepäck auf Jonas’ Rüstung', async ({ page }) => {
  const touch = await fingers(page);
  const item = (await page.locator('.stash-item', { hasText: 'Vacc Suit' }).boundingBox())!;
  const armor = (await page.getByLabel(/Jonas Reyl, Rüstung/).boundingBox())!;
  const [x0, y0, x1, y1] = [item.x + 40, item.y + item.height / 2, armor.x + armor.width / 2, armor.y + armor.height / 2];
  await touch('touchStart', x0, y0);
  await page.waitForTimeout(400);
  for (let i = 1; i <= 8; i++) await touch('touchMove', x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
  await expect(page.locator('.drag-ghost')).toHaveText('Vacc Suit (TL 12)');
  await touch('touchEnd');
  await expect(page.getByLabel(/Jonas Reyl, Rüstung/)).toContainText('Vacc Suit (TL 12)');
  // Seine Mesh liegt jetzt im Gepäck.
  await expect(page.getByRole('list', { name: 'Gepäck' })).toContainText('Mesh');
});

test('Wischen ohne Halten zieht nichts', async ({ page }) => {
  const touch = await fingers(page);
  const item = (await page.locator('.stash-item', { hasText: 'Vacc Suit' }).boundingBox())!;
  await touch('touchStart', item.x + 40, item.y + item.height / 2);
  for (let i = 1; i <= 6; i++) await touch('touchMove', item.x + 40, item.y + item.height / 2 - i * 30);
  await expect(page.locator('.drag-ghost')).toHaveCount(0);
  await touch('touchEnd');
  await expect(page.getByRole('list', { name: 'Gepäck' })).toContainText('Vacc Suit');
});
