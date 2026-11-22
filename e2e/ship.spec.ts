import { expect, test, type Page } from '@playwright/test';
import { openPeople } from './layout';

/** Ein Bild aus dem Browser, als Datei für das Feld: `type` PNG oder JPEG, in der Größe `width` × `height`. */
async function picture(page: Page, width: number, height: number, type: 'image/png' | 'image/jpeg'): Promise<Buffer> {
  const base64 = await page.evaluate(
    ({ width, height, type }) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d')!;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#2a6');
      gradient.addColorStop(1, '#fd4');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
      return canvas.toDataURL(type, 0.95).split(',')[1]!;
    },
    { width, height, type },
  );
  return Buffer.from(base64, 'base64');
}

/** Öffnet den Reiter; im Desktop-Modus schlösse ein zweiter Klick auf den offenen Reiter das Panel. */
async function openTab(page: Page, name: string) {
  const tab = page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name, exact: true });
  if ((await tab.getAttribute('aria-current')) !== 'page') await tab.click();
}

/**
 * Geld in die Kasse und einen Scout/Courier bar kaufen; der Reiter Schiff bleibt offen. Die
 * Demo-Kampagne hat schon die Yacht „Kestrel“ (2026-11-21b), darum heißt der Knopf dann nur „Werft“.
 */
async function buyScout(page: Page) {
  await openPeople(page, 'Kasse');
  await page.getByRole('spinbutton').first().fill('30000000');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: /^Werft( öffnen)?$/ }).click();
  const yard = page.getByRole('region', { name: 'Werft' });
  await yard.getByRole('row', { name: /Scout\/Courier/ }).locator('.shop-price').click();
  await page.getByRole('button', { name: 'Bar kaufen' }).click();
}

test('Schiff: Werft und Bestellung sind Felder im Ziehblatt, kein Dialog; ✕ und Esc schließen', async ({ page }) => {
  await page.goto('/');
  await openPeople(page, 'Kasse');
  await page.getByRole('spinbutton').first().fill('30000000');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: /^Werft( öffnen)?$/ }).click();
  const yard = page.getByRole('region', { name: 'Werft' });
  await expect(yard).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // Am Handy steht das Feld im Ziehblatt, das sich ziehen lässt; im Desktop-Modus in der Seitenspalte.
  const host = test.info().project.name === 'desktop' ? page.locator('.side-panel') : page.getByRole('region', { name: 'Ziehblatt' });
  await expect(host.getByRole('region', { name: 'Werft' })).toBeVisible();

  await yard.getByRole('row', { name: /Scout\/Courier/ }).locator('.shop-price').click();
  const order = page.getByRole('region', { name: 'Scout/Courier (S) kaufen' });
  await expect(order).toBeVisible();
  await page.getByRole('button', { name: '← Werft' }).click();
  await expect(yard).toBeVisible();
  await yard.getByRole('button', { name: 'Werft schließen' }).click();
  await expect(yard).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Werft( öffnen)?$/ })).toBeVisible();

  await page.getByRole('button', { name: /^Werft( öffnen)?$/ }).click();
  await expect(yard).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(yard).toHaveCount(0);
});

test('Schiff: Deckpläne hochladen, große Fotos verkleinert, Löschen erst nach Rückfrage, über Kampagnen hinweg', async ({ page }) => {
  await page.goto('/');
  await buyScout(page);
  await expect(page.locator('.deck-empty')).toHaveText('Noch 3 von 3 Plätzen frei');

  // Ein kleiner Plan als PNG bleibt, wie er ist.
  const [upload] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'PNG hochladen' }).click()]);
  await upload.setFiles({ name: 'deck.png', mimeType: 'image/png', buffer: await picture(page, 600, 300, 'image/png') });
  const first = page.locator('.deck-card').first();
  await expect(first).toContainText('Deck A');
  expect(await first.locator('img').evaluate((img: HTMLImageElement) => [img.src.slice(0, 15), img.naturalWidth])).toEqual(['data:image/png;', 600]);

  // Ein großes Foto wird auf 2048 Pixel verkleinert und als JPEG abgelegt.
  const [photo] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Kamera' }).click()]);
  await photo.setFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: await picture(page, 4000, 3000, 'image/jpeg') });
  const second = page.locator('.deck-card').nth(1);
  await expect(second).toContainText('Deck B');
  expect(await second.locator('img').evaluate((img: HTMLImageElement) => [img.src.slice(0, 16), img.naturalWidth, img.naturalHeight])).toEqual(['data:image/jpeg;', 2048, 1536]);
  await expect(page.locator('.deck-empty')).toHaveText('Noch 1 von 3 Plätzen frei');

  // Der Mülleimer fragt erst; „Behalten“ lässt den Plan stehen.
  await second.getByRole('button', { name: 'Deck B löschen' }).click();
  await second.getByRole('button', { name: 'Behalten' }).click();
  await expect(page.locator('.deck-card')).toHaveCount(2);
  await second.getByRole('button', { name: 'Deck B löschen' }).click();
  await second.getByRole('button', { name: 'Löschen?' }).click();
  await expect(page.locator('.deck-card')).toHaveCount(1);

  // Eine zweite Kampagne mit demselben Entwurf sieht denselben Plan, und zurück in der ersten ist er noch da.
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  const sheet = page.getByRole('dialog', { name: 'Kampagnen' });
  await sheet.getByLabel('Neue Kampagne').fill('Zweite');
  await sheet.getByRole('button', { name: 'Anlegen' }).click();
  await buyScout(page);
  await expect(page.locator('.deck-card')).toHaveCount(1);
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await sheet.getByText('Demo-Kampagne', { exact: true }).click();
  await openTab(page, 'Schiff');
  await expect(page.locator('.deck-card')).toHaveCount(1);
  await expect(page.locator('.deck-card').first()).toContainText('Deck A');
});

test('Schiff: Deckpläne kommen über den Abgleich aufs andere Gerät, Löschen reist mit', async ({ page, context }) => {
  // Zwei Seiten mit eigenem Speicher (`geraet`) an derselben Probe-Wolke sind zwei Geräte.
  const suffix = test.info().project.name;
  await page.goto(`/?probe-wolke&geraet=handy-deck-${suffix}`);
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  const sheet = page.getByRole('dialog', { name: 'Kampagnen' });
  await expect(sheet.locator('.sync')).toContainText('Kampagnen und Deckpläne');
  await sheet.locator('.sync').getByRole('button', { name: 'Bei OneDrive anmelden' }).click();
  await expect(sheet.locator('.sync')).toContainText('Abgeglichen um');
  await sheet.getByRole('button', { name: 'Schließen' }).first().click();

  await buyScout(page);
  const [upload] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'PNG hochladen' }).click()]);
  await upload.setFiles({ name: 'deck.png', mimeType: 'image/png', buffer: await picture(page, 600, 300, 'image/png') });
  await expect(page.locator('.deck-card')).toHaveCount(1);
  const cloudHas = (p: Page) => p.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('sre-probe-wolke') ?? '{}') as { decks?: object }).decks ?? {}));
  await expect.poll(() => cloudHas(page)).toEqual(['S/Deck A']);

  // Das Tablet ist schon angemeldet; sein Scout zeigt denselben Plan.
  const tablet = await context.newPage();
  await tablet.goto(`/?probe-wolke&geraet=tablet-deck-${suffix}`);
  await buyScout(tablet);
  await expect(tablet.locator('.deck-card')).toHaveCount(1);
  await expect(tablet.locator('.deck-card').first()).toContainText('Deck A');

  // Am Tablet gelöscht, ist er nach dem nächsten Abgleich auch am Handy weg.
  await tablet.locator('.deck-card').first().getByRole('button', { name: 'Deck A löschen' }).click();
  await tablet.locator('.deck-card').first().getByRole('button', { name: 'Löschen?' }).click();
  await expect.poll(() => cloudHas(tablet)).toEqual([]);
  await page.reload();
  await openTab(page, 'Schiff');
  await expect(page.locator('.deck-empty')).toHaveText('Noch 3 von 3 Plätzen frei');
  await expect(page.locator('.deck-card')).toHaveCount(0);
});

test('Monatsabrechnung: nach vier Wochen mit Schiff steht sie im Log, mit Liegegebühren', async ({ page }) => {
  await page.goto('/');
  await buyScout(page);
  await openTab(page, 'Begegnung');
  const dock = page.getByRole('region', { name: 'Begegnung und Zeit' });
  // Lange gedrückt beendet „Woche beenden“ die Woche ohne Erinnerung an fehlende Tests.
  for (let week = 0; week < 4; week++) {
    await dock.getByRole('button', { name: /Woche beenden/ }).hover();
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
  }
  await expect(page.getByRole('region', { name: 'Spielzeit' })).toContainText('029-1105');
  await openTab(page, 'Log');
  await expect(page.getByText('Monatsabrechnung · Monat 1 · 1105')).toBeVisible();
  await expect(page.getByText(/Liegegebühren Cr 2\.200/)).toBeVisible();
});

test('Schiff von Hand ausblenden: der Stift am Namen, erst der zweite Tipper; danach kein Schiff', async ({ page }) => {
  await page.goto('/');
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Schiff umbenennen' }).click();
  const retire = page.getByRole('button', { name: /ausblenden\??$/ });
  await retire.click();
  await expect(retire).toHaveText(/wirklich ausblenden\?/);
  await retire.click();
  await expect(page.getByRole('button', { name: 'Schiff umbenennen' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Werft( öffnen)?$/ })).toBeVisible();
});
