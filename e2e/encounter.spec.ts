import { expect, test } from '@playwright/test';

test('Kampf: Waffentabelle ohne Begegnung; mit Begegnung die Simulation mit Runde, Entfernung und Zügen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  let world = undefined as undefined | ReturnType<typeof page.getByRole>;
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0808', '0109', '0210']) {
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).click();
    const button = page.locator('.sector-dock').getByRole('button', { name: /Vorkommen würfeln/ });
    const box = (await button.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1100);
    await page.mouse.up();
    if (await page.locator('.sector-dock').getByText('Kein System in diesem Feld').isVisible()) continue;
    const dialog = page.getByRole('dialog', { name: `Weltenerschaffung ${id}` });
    await dialog.getByLabel('Name der Welt').fill('Regina');
    await dialog.getByRole('button', { name: 'Übernehmen' }).click();
    world = page.getByRole('dialog', { name: `Regina · ${id}` });
    break;
  }
  // Den Aufenthaltsort wählt man diesmal im Kampf selbst.
  await world!.getByRole('button', { name: 'Schließen' }).first().click();

  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
  // Waffentabelle: ohne Begegnung; ohne Aufenthaltsort gesperrt, bis man die Welt wählt.
  await expect(page.locator('.combat-table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begegnung würfeln' })).toBeDisabled();
  await page.getByLabel(/Wo ist die Gruppe/).selectOption({ index: 1 });
  await expect(page.getByLabel('Die Gruppe ist auf')).toContainText('Regina');
  await page.getByLabel('Gelände (DM auf die Entfernung)').selectOption('city');
  await page.getByLabel('Begegnung wählen').selectOption('15');

  // Erst die Übersicht: wer kommt, und die Würfe für Reaktion, Entfernung und Überraschung.
  const intro = page.getByRole('dialog', { name: /Thugs/ });
  await expect(intro).toContainText('Reaktion (2W6');
  await expect(intro).toContainText('Entfernung:');
  await expect(intro).toContainText('Überraschung:');
  await expect(intro.locator('.intro-npcs li').first()).toContainText('Anführer');
  await intro.getByRole('button', { name: 'Zum Kampf' }).click();
  // In der Simulation fällt die Leiste oben weg; alle Kämpfer stehen in der Liste.
  await expect(page.locator('.strip')).toHaveCount(0);

  // Kampfsimulation: Runde, Entfernung, Kämpfer; die Tabelle ist weg.
  await expect(page.locator('.fight-head')).toContainText('Runde 1');
  await expect(page.locator('.fight-head')).toContainText('Thugs');
  await expect(page.locator('.combat-table')).toHaveCount(0);
  await expect(page.getByText(/Entfernung \(2W6: \d \+ \d, City −4\)/)).toBeVisible();
  await expect(page.locator('.fighter.turn')).toHaveCount(1);

  // Wer am Zug ist, hat ein Ziel; Close reicht für jede Waffe.
  await page.getByRole('radiogroup', { name: 'Entfernung' }).getByRole('radio', { name: 'Close' }).click();
  await expect(page.locator('.fight-turn')).toContainText('→');
  await page.getByRole('button', { name: 'Angreifen' }).click();
  const dialog = page.getByRole('alertdialog');
  await dialog.click();
  const hit = (await dialog.getByRole('heading').textContent()) === 'TREFFER';
  await dialog.getByRole('button', { name: 'Weiter' }).click();
  if (hit) {
    // Ein Treffer: Erst der Schaden, dann ist der Nächste dran.
    await page.getByRole('button', { name: /^Schaden/ }).click();
    const wounding = page.getByRole('dialog', { name: /·/ });
    if (await wounding.isVisible().catch(() => false)) await wounding.getByRole('button', { name: 'Übernehmen' }).click();
  }
  await page.getByRole('button', { name: 'Aussetzen' }).click();

  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.locator('.combat-table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begegnung würfeln' })).toBeVisible();
});
