import { expect, test, type Locator, type Page } from '@playwright/test';
import { expandTray, openPeople, openTab } from './layout';

// Crew und Rechner im Reiter Schiff (Änderung 2026-11-22d, SR 33 und SE 10–13). Die Demo-Yacht
// „Kestrel“ hat ein Geschütz, darum stehen Pilot und Gunner schon da; der Rechner Modell/1 hat zwei
// CPU-Plätze und vier Plätze im Speicher.

/** Den Reiter unter den Kacheln öffnen: Deckplan, Details, Crew oder Computer. */
async function openShipPart(page: Page, part: string) {
  await openTab(page, 'Schiff');
  await expandTray(page);
  await page.getByRole('tablist', { name: 'Ansichten des Schiffs' }).getByRole('tab', { name: part, exact: true }).click();
}

const crew = (page: Page): Locator => page.getByRole('tabpanel', { name: 'Crew' });
const computer = (page: Page): Locator => page.getByRole('tabpanel', { name: 'Computer' });

/** Zieht eine Karte oder ein Programm auf ein Feld: greifen, ein Stück tragen, über dem Ziel loslassen. */
async function dragTo(page: Page, from: Locator, to: Locator) {
  await from.scrollIntoViewIfNeeded();
  await to.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 30, a.y + 26, { steps: 6 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(350);
}

test('Crew: Posten aus dem Blatt besetzen, zweiter Posten mit Abzug, wieder freigeben', async ({ page }) => {
  await page.goto('/');
  await openShipPart(page, 'Crew');
  await expect(crew(page).getByRole('group', { name: 'Pilot' })).toContainText('Kira Vant');
  await expect(crew(page).getByRole('group', { name: 'Gunner 1' })).toContainText('Jonas Reyl');
  // Leere Posten stehen darunter, als schmale Zeile; der Grundwert aus SR 33 steht als Hinweis dabei.
  await expect(crew(page).getByRole('button', { name: /Navigator/ })).toBeVisible();
  await expect(crew(page).getByRole('button', { name: /Engineer/ })).toContainText('ab 1');

  await crew(page).getByRole('button', { name: /Navigator/ }).click();
  const sheet = page.getByRole('region', { name: 'Navigator besetzen' });
  await sheet.getByRole('button', { name: /Kira Vant/ }).click();
  // Sie behält den Pilotensitz; der zweite Posten zählt ein Punkt weniger (SE 11).
  await expect(crew(page).getByRole('group', { name: 'Navigator' })).toContainText('Kira Vant');
  await expect(crew(page).getByRole('group', { name: 'Navigator' }).getByRole('button', { name: /Kira Vant/ })).toContainText('DM 0');
  // Auch der erste Posten zählt einen Punkt weniger (SE 11).
  await expect(crew(page).getByRole('group', { name: 'Pilot' }).getByRole('button', { name: /Kira Vant/ })).toContainText('DM 1');

  await crew(page).getByRole('group', { name: 'Navigator' }).getByRole('button', { name: /Kira Vant/ }).click();
  const sheet2 = page.getByRole('region', { name: 'Navigator' });
  await expect(sheet2.getByRole('button', { name: /Kira Vant ·/ })).toBeVisible();
  // Der Knopf am Blatt steht im Dock darunter.
  await page.getByRole('button', { name: 'Posten freigeben' }).click();
  await expect(crew(page).getByRole('group', { name: 'Navigator' })).toHaveCount(0);
  await expect(crew(page).getByRole('button', { name: /Navigator/ })).toBeVisible();
});

test('Crew: mit dem Ziehen tauschen und sich ohne Posten setzen', async ({ page }) => {
  await page.goto('/');
  await openShipPart(page, 'Crew');
  await dragTo(page, crew(page).getByRole('group', { name: 'Pilot' }).getByRole('button', { name: /Kira Vant/ }), crew(page).getByRole('group', { name: 'Gunner 1' }));
  await expect(crew(page).getByRole('group', { name: 'Pilot' })).toContainText('Jonas Reyl');
  await expect(crew(page).getByRole('group', { name: 'Gunner 1' })).toContainText('Kira Vant');

  await dragTo(page, crew(page).getByRole('group', { name: 'Pilot' }).getByRole('button', { name: /Jonas Reyl/ }), crew(page).locator('.crew-idle'));
  await expect(crew(page).getByRole('group', { name: 'Pilot' })).toHaveCount(0);
  await expect(crew(page).getByRole('button', { name: /Pilot/ })).toBeVisible();
  await expect(crew(page).locator('.crew-idle')).toContainText('Jonas Reyl');

  // Wer keinen Posten hat, bekommt ihn aus dem Blatt: Tippen auf die Karte, dann den freien Posten.
  await crew(page).locator('.crew-idle').getByRole('button', { name: /Jonas Reyl ohne Posten/ }).click();
  const blatt = page.getByRole('region', { name: /Jonas Reyl · Posten/ });
  await blatt.getByRole('button', { name: 'Pilot' }).click();
  await expect(crew(page).getByRole('group', { name: 'Pilot' })).toContainText('Jonas Reyl');

  // ✕ im Kopf gibt einen Posten frei.
  await crew(page).getByRole('group', { name: 'Gunner 1' }).getByRole('button', { name: 'Gunner 1 aufgeben' }).click();
  await expect(crew(page).getByRole('group', { name: 'Gunner 1' })).toHaveCount(0);
});

test('Rechner: Pflicht in der CPU, Umstecken aus dem Blatt und per Zug, Kauf in der Werft', async ({ page }) => {
  await page.goto('/');
  await openPeople(page, 'Kasse');
  await page.getByRole('spinbutton').first().fill('1000000');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await openShipPart(page, 'Computer');
  await expect(computer(page).locator('.zone.cpu')).toContainText('Maneuver');
  await expect(computer(page).locator('.zone.cpu')).toContainText('Target');
  await expect(computer(page).locator('.zone.storage')).toContainText('Jump-1');

  // Ein Tippen aufs Programm öffnet das Blatt mit den drei Ablagen; von dort wandert es ins Archiv.
  await computer(page).locator('.zone.storage').getByRole('button', { name: /Navigation/ }).click();
  await page.getByRole('region', { name: 'Navigation' }).getByRole('button', { name: /Archiv/ }).click();
  await expect(computer(page).locator('.zone.archive')).toContainText('Navigation');

  // Die CPU ist voll; erst wird Target in den Speicher geräumt, dann zieht Navigation hinein.
  await computer(page).locator('.zone.cpu').getByRole('button', { name: /Target/ }).click();
  await page.getByRole('region', { name: 'Target' }).getByRole('button', { name: /Speicher/ }).click();
  await dragTo(page, computer(page).locator('.zone.archive').getByRole('button', { name: /Navigation/ }), computer(page).locator('.zone.cpu'));
  await expect(computer(page).locator('.zone.cpu')).toContainText('Navigation');
  // Ohne Target in der CPU feuert kein Geschütz; die Zeile unter dem Rechnernamen sagt es.
  await expect(computer(page).locator('.comp-warn')).toContainText('Target');

  // In eine volle Ablage lässt sich nichts legen: der Zug wird abgewiesen.
  await dragTo(page, computer(page).locator('.zone.storage').getByRole('button', { name: /Jump-1/ }), computer(page).locator('.zone.cpu'));
  await expect(computer(page).locator('.zone.cpu')).not.toContainText('Jump-1');

  // Die Werft: ein Tippen kauft bar aus der Kasse, das neue Programm liegt im Archiv.
  await computer(page).getByRole('button', { name: /Werft/ }).click();
  const yard = page.getByRole('region', { name: 'Werft · Software' });
  // Auto-Evade kostet Cr 500.000; so viel hat die Kasse nach der Einnahme.
  await yard.getByRole('button', { name: /Auto-Evade/ }).click();
  await expect(yard.getByRole('button', { name: /Auto-Evade/ })).toContainText('an Bord');
  await page.getByRole('button', { name: 'Werft · Software schließen' }).click();
  await expect(computer(page).locator('.zone.archive')).toContainText('Auto-Evade');
});
