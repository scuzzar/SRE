import { expect, test } from '@playwright/test';

test('Begegnung im eigenen Reiter; Kampf: Waffentabelle ohne Begegnung, mit Begegnung die Simulation mit Runde, Entfernung und Zügen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Sektor' }).click();
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  let world = undefined as undefined | ReturnType<typeof page.getByRole>;
  let worldId = '';
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
    worldId = id;
    break;
  }
  // Die Demo-Kampagne steht auf Kessra; den neuen Aufenthaltsort wählt man im Reiter Begegnung.
  await world!.getByRole('button', { name: 'Schließen' }).first().click();

  // Kampf ohne Begegnung: nur die Waffentabelle, keine Begegnungsauswahl.
  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
  await expect(page.locator('.combat-table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Begegnung würfeln' })).toHaveCount(0);
  // Begegnung: Die Gruppe ist auf Kessra und zieht nach Regina um.
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  await expect(page.getByLabel('Die Gruppe ist auf')).toHaveValue('0405');
  await page.getByLabel('Die Gruppe ist auf').selectOption(worldId);
  await expect(page.getByLabel('Die Gruppe ist auf')).toHaveValue(worldId);
  await page.getByLabel('Gelände (DM auf die Entfernung)').selectOption('city');
  // Der Würfel der Anzahl: W3 statt W6, auch in der Liste der Arten.
  await page.getByLabel('Würfel der Anzahl').selectOption('3');
  await expect(page.getByLabel('Begegnung wählen')).toContainText('15 · 2W3 Thugs');
  await page.getByLabel('Begegnung wählen').selectOption('15');

  // Erst die Übersicht: wer kommt, und die Würfe für Reaktion und Entfernung; die Überraschung kommt erst im Kampf.
  const intro = page.getByRole('dialog', { name: /Thugs/ });
  await expect(intro).toContainText('(2W3)');
  await expect(intro).toContainText('Reaktion (2W6');
  await expect(intro).toContainText(/Entfernung: \S.*\(2W6: \d \+ \d, City −4/);
  await expect(intro).not.toContainText('Überraschung:');
  await expect(intro.locator('.intro-npcs li').first()).toContainText('Anführer');
  const npcs = await intro.locator('.intro-npcs li').count();
  await intro.getByRole('button', { name: 'Weiter' }).click();
  // „Weiter“ führt zurück in den Reiter Begegnung; nicht jede Begegnung wird ein Kampf. Erst „Zum Kampf“ wechselt.
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Begegnung' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.encounter-running')).toContainText('Thugs');
  await page.locator('.encounter-running').getByRole('button', { name: 'Zum Kampf' }).click();
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Kampf' })).toHaveAttribute('aria-current', 'page');
  // Zwei Spalten: links die SC, rechts die NSC; die Leiste oben gibt es im Kampf nicht.
  await expect(page.locator('.strip')).toHaveCount(0);
  await expect(page.locator('.fcard.pcs')).toHaveCount(2);
  await expect(page.locator('.fcard.npcs')).toHaveCount(npcs);

  // Kampfsimulation: Runde, Entfernung, Kämpfer; die Tabelle ist weg.
  await expect(page.locator('.fight-head')).toContainText('Runde 1');
  await expect(page.locator('.fight-head')).toContainText('Thugs');
  await expect(page.locator('.combat-table')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /^Entfernung: / })).toBeVisible();
  // Der erste Wurf im Kampf ist die Überraschung: zwei Würfel, SC weiß, NSC schwarz, mit DMs.
  await expect(page.locator('.fight-who-row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Überraschung würfeln' }).click();
  const surprise = page.getByRole('dialog', { name: 'Überraschung' });
  await expect(surprise.locator('.die-white')).toHaveCount(1);
  await expect(surprise.locator('.die-black')).toHaveCount(1);
  await expect(surprise).toContainText('Anführer +1');
  await surprise.getByRole('button', { name: 'Kampf beginnen' }).click();
  await expect(page.locator('.fight-who-row')).toBeVisible();

  // Langes Drücken links auf den Strahl unten im Zug setzt die Entfernung frei auf Berührung; Close reicht für jede Waffe.
  const ray = page.getByRole('img', { name: /^Entfernung: / });
  const pressAt = async (x: number) => {
    const box = (await ray.boundingBox())!;
    await page.mouse.move(box.x + x, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
  };
  await pressAt(4);
  await expect(page.getByRole('img', { name: /^Entfernung: Close, Berührung/ })).toBeVisible();
  // Die Partei am Zug geht ein Band (nach den Regeln); ein zweites wäre Laufen ohne Angriff.
  await page.getByRole('button', { name: 'Ein Band weiter weg' }).click();
  await expect(page.getByRole('img', { name: /^Entfernung: Short, Band 0/ })).toBeVisible();
  await expect(page.locator('.ray-move')).toContainText('gegangen');
  await pressAt(4);
  await expect(page.getByRole('img', { name: /^Entfernung: Close, Berührung/ })).toBeVisible();
  await expect(page.locator('.fight-who-row')).toContainText('→');
  // Angegriffen wird mit dem Knopf der Waffe (beim SC Primär oder Sekundär, beim NSC seine Waffe).
  await page.locator('.fight-dock .atk:not(:disabled)').first().click();
  const dialog = page.getByRole('alertdialog');
  await dialog.click();
  // Erst das Urteil abwarten; vorher steht in der Überschrift noch nichts Entscheidendes.
  await expect(dialog.getByRole('heading')).toHaveText(/TREFFER|DANEBEN/);
  const hit = (await dialog.getByRole('heading').textContent()) === 'TREFFER';
  await dialog.getByRole('button', { name: 'Weiter' }).click();
  if (hit) {
    // Ein Treffer: Erst der Schaden, dann ist der Nächste dran.
    await page.getByRole('button', { name: /^Schaden/ }).click();
    const wounding = page.getByRole('dialog', { name: /·/ });
    if (await wounding.isVisible().catch(() => false)) await wounding.getByRole('button', { name: 'Übernehmen' }).click();
  }
  await page.getByRole('button', { name: 'Aussetzen' }).click();

  // Übernehmen: Langes Drücken auf einen NSC öffnet die Auswahl mit Haken; unten stehen dann
  // „Als SC“ und „Als NSC“ statt der Zugknöpfe. Antippen hakt weitere an.
  const alive = page.locator('.fcard.npcs:not(.out) .fcard-main');
  const before = await page.locator('.fcard.npcs').count();
  const box = (await alive.first().boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  const adopt = page.getByRole('region', { name: 'Übernehmen' });
  await expect(adopt).toContainText('1 NSC übernehmen');
  await expect(page.locator('.atk')).toHaveCount(0);
  await expect(alive.first()).toHaveAttribute('aria-checked', 'true');
  const chosen = (await alive.count()) > 1 ? 2 : 1;
  if (chosen === 2) await alive.nth(1).click();
  await expect(adopt).toContainText(`${chosen} NSC übernehmen`);
  await adopt.getByRole('button', { name: 'Als NSC' }).click();
  await expect(page.locator('.fcard.npcs')).toHaveCount(before - chosen);
  await expect(page.getByRole('region', { name: 'Übernehmen' })).toHaveCount(0);

  // Im Reiter Begegnung steht die laufende Begegnung knapp; „Zum Kampf“ führt zurück.
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  await expect(page.locator('.encounter-running')).toContainText('Thugs');
  await page.locator('.encounter-running').getByRole('button', { name: 'Zum Kampf' }).click();
  await expect(page.locator('.fight-head')).toBeVisible();

  await page.getByRole('button', { name: 'Beenden' }).click();
  await expect(page.locator('.combat-table')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  await expect(page.getByRole('button', { name: 'Begegnung würfeln' })).toBeVisible();
});
