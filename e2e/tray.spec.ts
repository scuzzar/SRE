import { expect, test, type Page } from '@playwright/test';
import { openSector, oracle, openCombat } from './layout';

// Das Ziehblatt gibt es nur auf dem Smartphone: Es rastet auf vier Stufen ein (versteckt,
// eingeklappt, halb, voll) und merkt sich die Stufe, nicht die Höhe.

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.skip(testInfo.project.name !== 'mobil', 'Das Ziehblatt gibt es nur auf dem Smartphone');
  await page.goto('/');
  await openSector(page);
});

const tray = (page: Page) => page.locator('.tray');
const grip = (page: Page) => page.locator('.tray-grip');
const nav = (page: Page) => page.getByRole('navigation', { name: 'Bereiche' });
/** Die Oberkante des Blatts, wenn es eingerastet ist (es gleitet kurz). */
async function trayTop(page: Page): Promise<number> {
  let top = -1;
  await expect.poll(async () => {
    const was = top;
    top = (await tray(page).boundingBox())!.y;
    return Math.abs(top - was) < 0.5;
  }).toBe(true);
  return top;
}
/** Zieht am Griff mit der Maus um `dy` Pixel, langsam (kein Wisch). */
async function dragGrip(page: Page, dy: number) {
  const box = (await grip(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + (dy * i) / 10);
    await page.waitForTimeout(30);
  }
  await page.waitForTimeout(150);
  await page.mouse.up();
}

test('Die Stufe bleibt beim Wechsel des Reiters und bei anderer Fenstergröße: Reiter und Reihe stehen immer ganz da', async ({ page }) => {
  const viewport = page.viewportSize()!;
  await openCombat(page);
  await page.getByRole('button', { name: 'Blatt einklappen' }).click();
  await expect(page.getByRole('button', { name: 'Blatt hochziehen' })).toBeVisible();
  // Im Log ist der Fuß höher (die Reihe Notiz, 2W6, Karte); eingeklappt steht er trotzdem ganz da.
  await nav(page).getByRole('button', { name: 'Log', exact: true }).click();
  await expect.poll(async () => { const b = (await nav(page).boundingBox())!; return b.y + b.height; }).toBeLessThanOrEqual(viewport.height + 1);
  await expect(oracle(page).getByRole('button', { name: '2W6', exact: true })).toBeInViewport({ ratio: 1 });
  // In einem anderen Fenster (etwa Split-Screen) bleibt es eingeklappt.
  await page.setViewportSize({ width: viewport.height, height: viewport.width });
  await expect.poll(async () => { const b = (await nav(page).boundingBox())!; return b.y + b.height; }).toBeLessThanOrEqual(viewport.width + 1);
  await expect(oracle(page).getByRole('button', { name: '2W6', exact: true })).toBeInViewport({ ratio: 1 });
});

test('Losgelassen zwischen zwei Stufen rastet es ein, nie dazwischen', async ({ page }) => {
  await page.getByRole('button', { name: 'Blatt einklappen' }).click();
  const collapsed = await trayTop(page);
  // 60 Pixel über „eingeklappt“: zurück auf eingeklappt.
  await dragGrip(page, -60);
  expect(Math.abs((await trayTop(page)) - collapsed)).toBeLessThan(2);
  await expect(page.getByRole('button', { name: 'Blatt hochziehen' })).toBeVisible();
  // Ein Stück über die Mitte zu halb: halb.
  await dragGrip(page, -(collapsed - page.viewportSize()!.height / 2) + 40);
  await expect(page.getByRole('button', { name: 'Blatt einklappen' })).toBeVisible();
});

test('Mit dem Griff im Fokus wechseln Pfeil hoch und runter die Stufe; voll gehen die Zoom-Knöpfe weg', async ({ page }) => {
  await grip(page).focus();
  await expect(grip(page)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: 'Blatt verkleinern' })).toBeVisible();
  await expect(page.locator('.sector-zoom')).toHaveCSS('opacity', '0');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Blatt hochziehen' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.sector-zoom')).toHaveCSS('opacity', '1');
  // Ein Tippen auf den Griff geht von voll eine Stufe zurück auf halb.
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await grip(page).click();
  await expect(page.getByRole('button', { name: 'Blatt einklappen' })).toBeVisible();
});

test('Ein angetipptes Feld bleibt sichtbar: Die Karte gleitet es über das Blatt; eingeklappt steht seine Kopfzeile da', async ({ page }) => {
  await page.getByRole('button', { name: 'Blatt einklappen' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  const hex = map.getByRole('button', { name: '0609, nicht erzeugt' });
  await hex.click();
  await expect(page.getByRole('button', { name: 'Blatt einklappen' })).toBeVisible();
  const top = await trayTop(page);
  await expect.poll(async () => { const b = (await hex.boundingBox())!; return b.y + b.height; }).toBeLessThan(top);
  // Eingeklappt bleibt „Feld 0609“ mit dem Kreuz zu sehen.
  await page.getByRole('button', { name: 'Blatt einklappen' }).click();
  await trayTop(page);
  await expect(page.locator('.sector-dock-head')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.sector-dock-head')).toContainText('Feld 0609');
  await expect(page.getByRole('button', { name: 'Feld abwählen' })).toBeInViewport({ ratio: 1 });
});

test('Im Inhalt zieht ein Wisch nach unten das Blatt mit, wenn der Inhalt ganz oben steht; nach oben scrollt er nur', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (x: number, from: number, to: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: from + ((to - from) * i) / 12 }] });
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(150);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await grip(page).focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', { name: 'Blatt verkleinern' })).toBeVisible();
  const full = await trayTop(page);
  // Nach oben wischen bewegt das Blatt nicht.
  await swipe(200, 600, 400);
  expect(Math.abs((await trayTop(page)) - full)).toBeLessThan(2);
  // Der leere Log steht ganz oben: Ein langer Zug nach unten bringt das Blatt auf halb.
  await swipe(200, 400, 680);
  await expect(page.getByRole('button', { name: 'Blatt einklappen' })).toBeVisible();
});
