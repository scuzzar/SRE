import { expect, test, type Locator, type Page } from '@playwright/test';
import { entries, expandTray, host, openOracle, openSector } from './layout';

test('Begegnung im eigenen Reiter; Kampf: Waffentabelle ohne Begegnung, mit Begegnung die Simulation mit Runde, Entfernung und Zügen', async ({ page }) => {
  // Ein langer Ablauf mit vielen Würfen und Zügen.
  test.setTimeout(60_000);
  await page.goto('/');
  await openSector(page);
  const map = page.getByRole('group', { name: 'Karte des Subsektors' });
  let world = undefined as undefined | ReturnType<typeof page.getByRole>;
  let worldId = '';
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0408', '0109', '0210']) {
    // Untere Reihen liegen am Handy unter dem Ziehblatt; das Feld wird direkt angetippt.
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).dispatchEvent('click');
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
  // Die Demo-Kampagne steht auf Kessra; „Gruppe ist hier“ auf der Weltkarte bringt sie nach Regina.
  await world!.getByRole('button', { name: 'Gruppe ist hier' }).click();
  await world!.getByRole('button', { name: 'Schließen' }).first().click();

  // Kampf ohne Begegnung: nur die Waffentabelle, keine Begegnungsauswahl.
  await page.getByRole('navigation').getByRole('button', { name: 'Kampf' }).click();
  await expect(page.locator('.combat-table')).toBeVisible();
  await expect(dock(page)).toHaveCount(0);
  // Begegnung: Gelände und Würfel stehen auf dem Blatt, der Ort steht schon (kein Auswahlfeld mehr).
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  await expect(page.getByLabel('Die Gruppe ist auf')).toHaveCount(0);
  expect(worldId).not.toBe('');
  await page.getByLabel('Gelände', { exact: true }).selectOption('city');
  // Der Würfel der Anzahl: W3 statt W6, auch in der Liste der Arten; „Manuell wählen“ öffnet sie statt des Wurfs.
  await page.getByLabel('Würfel der Anzahl').selectOption('3');
  await page.getByRole('checkbox', { name: /^Manuell wählen/ }).check();
  await dock(page).getByRole('button', { name: /^Zufallsbegegnung würfeln/ }).click();
  await page.getByRole('dialog', { name: 'Welche Begegnung?' }).getByRole('button', { name: '15 · 2W3 Thugs' }).click();

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
  await expect(host(page).locator('.strip')).toHaveCount(0);
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

  // Langes Drücken rechts auf die Leiste (an den NSC) setzt den vorgewählten SC frei in die Berührung; Close reicht für jede Waffe.
  const ray = page.getByRole('img', { name: /^Entfernung: / });
  const now = page.locator('.ray-now');
  const pressAt = async (fromRight: number) => {
    const box = (await ray.boundingBox())!;
    await page.mouse.move(box.x + box.width - fromRight, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
  };
  await pressAt(4);
  await expect(now).toContainText('Close');
  await expect(now).toContainText('Berührung');
  // Wer am Zug ist, geht ein Band (nach den Regeln): ein SC für sich, die NSC als Gruppe; ein zweites wäre Laufen ohne Angriff.
  await page.getByRole('button', { name: /ein Band weiter weg$/i }).click();
  await expect(now).toContainText('Short');
  await expect(now).toContainText('Band 0');
  await expect(page.locator('.ray-move')).toContainText('gegangen');
  await pressAt(4);
  await expect(now).toContainText('Berührung');
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
  // Auf dem Smartphone das Ziehblatt ganz hoch, damit der Finger den NSC erreicht.
  await expandTray(page);
  await alive.first().scrollIntoViewIfNeeded();
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
  await expect(dock(page).getByRole('button', { name: /^Zufallsbegegnung würfeln/ })).toBeEnabled();
});

test('Patron und Gerücht: unten würfeln, das Würfelfenster zeigt Test und Ergebnis; erst der Test, beim Patron wählt ein Würfel die Liste; die Würfe stehen im Log', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  // Die Würfe stehen unten in der Reihe; das Blatt hat nur noch die Einstellungen.
  await expect(dock(page).getByRole('button', { name: /^Zufallsbegegnung würfeln/ })).toBeVisible();
  // Jonas Reyl hat Admin-1: Der Patron-Wurf zählt es mit (steht im Log).
  // Der Test besteht bei 5+ auf 1W6; das Würfelfenster zeigt Würfel und Ergebnis. Würfeln, bis ein Patron kommt.
  // Der erste Test der Woche geht mit Tippen, jeder weitere nur lange gedrückt.
  const roll = page.getByRole('dialog', { name: 'Patron' });
  await dock(page).getByRole('button', { name: /Patron würfeln/ }).click();
  await expect(roll).toContainText(/\d \(5\+ nötig\) · /);
  // Unten knapp „Woche 1×“, der volle Name sagt „diese Woche 1×“.
  await expect(dock(page).getByRole('button', { name: /Patron würfeln/ })).toContainText('Woche 1×');
  await expect(dock(page).getByRole('button', { name: 'Patron würfeln, diese Woche 1×' })).toBeVisible();
  // Fällt der Patron auf eine Gerücht-Zeile, zeigt das Fenster das Gerücht; dann weiter, bis ein Patron kommt.
  const found = roll.locator('.patron-last', { hasText: /Liste [12]/ });
  for (let i = 0; i < 60 && !(await found.isVisible()); i++) {
    await roll.getByRole('button', { name: 'Weiter' }).click();
    await hold(page, dock(page).getByRole('button', { name: /Patron würfeln/ }));
    await expect(roll).toContainText(/\(5\+ nötig\)/);
  }
  await expect(found).toContainText(/Liste [12] · \d und \d.* → \d\d/);
  // Beim Patron stehen „Abbrechen“ und „Als NSC“; „Als NSC“ legt ihn an und schließt das Fenster.
  await expect(roll.getByRole('button', { name: 'Weiter' })).toHaveCount(0);
  await expect(roll.getByRole('button', { name: 'Abbrechen' })).toBeVisible();
  await roll.getByRole('button', { name: 'Als NSC' }).click();
  await expect(roll).toBeHidden();
  // Gerücht: Test 7+ auf 2W6, dann die Art nach der Rumors Matrix.
  const rumor = page.getByRole('dialog', { name: 'Gerücht' });
  for (let i = 0; i < 60 && !(await rumor.locator('.patron-last').isVisible()); i++) {
    if (await rumor.isVisible()) await rumor.getByRole('button', { name: 'Weiter' }).click();
    await hold(page, dock(page).getByRole('button', { name: /Gerücht würfeln/ }));
    await expect(rumor).toContainText(/\(7\+ nötig\)/);
  }
  await expect(rumor.locator('.patron-last')).toContainText(/[A-Z] · .+ (allgemein|bestimmt) · \d und \d → \d\d/);
  await rumor.getByRole('button', { name: 'Weiter' }).click();
  // Der Wurf liegt im Log als Ergebnis.
  await openOracle(page);
  await expect(entries(page).filter({ hasText: /Liste [12] · \d und \d/ }).first()).toBeVisible();
  await expect(entries(page).filter({ hasText: /allgemein|bestimmt/ }).first()).toBeVisible();
});

test('Tiere: Gelände auf dem Blatt; die Tiertabelle entsteht beim ersten Wurf, danach wählt man die Zeile mit „Manuell wählen“', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  const settings = page.getByRole('region', { name: 'Einstellungen der Begegnungen' });
  const animals = dock(page).getByRole('button', { name: /^Tiere würfeln/ });
  await expect(settings).toContainText('Erst oben ein Gelände wählen');
  await expect(animals).toBeDisabled();
  await page.getByLabel('Gelände', { exact: true }).selectOption('city');
  await expect(settings).toContainText('gibt es keine Tiere');
  await page.getByLabel('Gelände', { exact: true }).selectOption('clear');
  // Manuell wählen geht erst, wenn es die Tabelle gibt.
  await page.getByRole('checkbox', { name: /^Manuell wählen/ }).check();
  await animals.click();
  const choice = page.getByRole('dialog', { name: 'Welche Tiere?' });
  await expect(choice).toContainText('entsteht beim ersten Wurf');
  await choice.getByRole('button', { name: 'Abbrechen' }).click();
  await page.getByRole('checkbox', { name: /^Manuell wählen/ }).uncheck();
  // Würfeln, bis der Test besteht; dann gibt es die Tabelle (Tier mit Übersicht oder Ereignis).
  const roll = page.getByRole('dialog', { name: 'Tiere' });
  let table = false;
  for (let i = 0; i < 60 && !table; i++) {
    await hold(page, animals);
    await expect(roll).toContainText(/\(5\+ nötig\)/);
    table = (await roll.textContent())!.includes('Wurf');
    if (await roll.getByRole('button', { name: 'Zur Begegnung' }).isVisible()) {
      await roll.getByRole('button', { name: 'Zur Begegnung' }).click();
      const intro = page.getByRole('dialog');
      await expect(intro).toContainText('Tiere · Clear');
      await expect(intro).toContainText(/Hits \d+\/\d+/);
      await intro.getByRole('button', { name: 'Weiter' }).click();
      await page.locator('.encounter-running').getByRole('button', { name: 'Beenden' }).click();
    } else await roll.getByRole('button', { name: 'Weiter' }).click();
  }
  // Eine Zeile wählen: ohne Test eine Begegnung mit Übersicht.
  await page.getByRole('checkbox', { name: /^Manuell wählen/ }).check();
  await animals.click();
  const first = choice.getByRole('button').first();
  const option = (await first.textContent())!.split(' · ')[0];
  await first.click();
  await expect(page.getByRole('dialog')).toContainText(`Wurf ${option}`);
});

/** Die Reihe unten im Reiter Begegnung: die Würfe der Begegnungen und die Zeit bzw. Weiterfahren. */
const dock = (page: Page) => page.getByRole('region', { name: 'Begegnung und Zeit' });

/** Langes Drücken auf einen Knopf (HoldButton): drücken, warten, bis er sich gefüllt hat, loslassen. */
async function hold(page: Page, button: Locator): Promise<void> {
  await button.hover();
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
}

test('Zeit und Reise: Woche beenden erinnert an Tests, lange gedrückt geht es weiter; Reise mit Passage dauert eine Woche', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Begegnung' }).click();
  const time = page.getByRole('region', { name: 'Spielzeit' });
  await expect(time).toContainText('001-1105');
  await dock(page).getByRole('button', { name: /Woche beenden/ }).click();
  await expect(time.getByRole('status')).toContainText('Noch nicht getestet');
  await hold(page, dock(page).getByRole('button', { name: /Woche beenden/ }));
  await expect(time).toContainText('Sonntag, 008-1105');
});
