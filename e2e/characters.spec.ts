import { expect, test, type Page } from '@playwright/test';
import { host, openOracle, oracle } from './layout';

async function openCharacters(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
}

/** Die Leiste oben im Orakel-Screen; nur der Charakter oben ist für Screenreader und Tests sichtbar. */
const strip = (page: Page) => oracle(page).getByRole('region', { name: 'Spielercharaktere' });
const top = (page: Page, name: string) => strip(page).getByRole('article', { name });
const dock = (page: Page) => oracle(page).getByRole('region', { name: 'Orakel und Proben' });
const card = (page: Page, name: string) => host(page).getByRole('article', { name });

test('Probe oben im Orakel: Fertigkeit, dann Attribute, Stufe unten, Ergebnis als Popup, danach im Log', async ({ page }) => {
  await page.goto('/');
  const kira = top(page, 'Kira Vant');
  await expect(kira.getByRole('button', { name: 'Pilot-2' })).toHaveText('Pil-2');
  await expect(kira.getByRole('button', { name: /^DEX A/ })).toBeDisabled();
  await expect(dock(page).getByRole('button', { name: 'Probe würfeln' })).toBeHidden();
  await kira.getByRole('button', { name: 'Pilot-2' }).click();

  await expect(kira.getByRole('button', { name: /^DEX A: würde DM \+1/ })).toBeEnabled();
  await expect(kira.getByRole('button', { name: /^SOC 5: würde DM −1/ })).toBeEnabled();
  await expect(kira.getByRole('button', { name: /^END 8: kein Einfluss/ })).toBeDisabled();
  await kira.getByRole('button', { name: /^DEX A/ }).click();
  await expect(kira.getByRole('button', { name: /^DEX A: gewählt/ })).toHaveAttribute('aria-pressed', 'true');

  // Dieselbe Stufe gilt für Orakel und Probe: Gering heißt 25 % und 10+.
  await dock(page).getByRole('radio', { name: /Gering/ }).click();
  await expect(dock(page)).toContainText('Pilot-2 · 10+');
  await expect(dock(page)).toContainText('2W6 +3 (DEX +1) · Braucht 7+');
  await expect(dock(page).getByRole('button', { name: '2W6' })).toBeHidden();

  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  const result = page.getByRole('alertdialog');
  await expect(result).toContainText('Kira Vant · Pilot-2 · 10+');
  await expect(result.getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
  await expect(result).toContainText(/2W6: [1-6] \+ [1-6] = \d+, DM \+3 → \d+/);
  await expect(result.getByRole('button', { name: 'Zum Orakel' })).toHaveCount(0);

  await result.getByRole('button', { name: 'Weiter' }).click();
  await expect(result).toBeHidden();
  const entry = page.locator('.entry').last();
  await expect(entry).toContainText('Probe');
  await expect(entry).toContainText('Kira Vant · Pilot-2 · 10+');
  // Die Probe bleibt vorbereitet, bis man sie abbricht.
  await expect(dock(page)).toContainText('Pilot-2 · 10+');
  await dock(page).getByRole('button', { name: 'Probe abbrechen' }).click();
  await expect(dock(page).getByRole('button', { name: '2W6' })).toBeVisible();
});

test('Wischen stellt den nächsten Charakter nach oben; eine Probe ohne Fertigkeit ist unmöglich, aber würfelbar', async ({ page }, testInfo) => {
  await page.goto('/');
  await top(page, 'Kira Vant').getByRole('button', { name: 'Pilot-2' }).click();
  if (testInfo.project.name === 'desktop') {
    // Auf dem Desktop stehen die Karten nebeneinander: der Punkt stellt den nächsten nach oben.
    await strip(page).getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  } else {
    await page.locator('.strip-track').evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  }
  const jonas = top(page, 'Jonas Reyl');
  await expect(jonas).toBeVisible();
  await expect(top(page, 'Kira Vant')).toHaveCount(0);
  // Mit dem Wechsel endet die Probe für Kira.
  await expect(dock(page).getByRole('button', { name: '2W6' })).toBeVisible();

  await dock(page).getByRole('radio', { name: /Gering/ }).click();
  await jonas.getByRole('button', { name: 'Ohne (−3)' }).click();
  await expect(dock(page)).toContainText('Ohne Fertigkeit · 10+');
  await expect(dock(page)).toContainText('2W6 −3 · Unmöglich');
  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText('FEHLSCHLAG');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await expect(page.locator('.entry').last()).toContainText('Jonas Reyl');

  // Der Charakter oben übersteht einen Neustart; die Punkte holen Kira zurück.
  await page.reload();
  await expect(top(page, 'Jonas Reyl')).toBeVisible();
  await strip(page).getByRole('button', { name: 'Kira Vant nach oben' }).click();
  await expect(top(page, 'Kira Vant')).toBeVisible();
});

test('Leiste einklappen: nur noch der Name; bleibt nach dem Neustart zu', async ({ page }) => {
  await page.goto('/');
  const kira = top(page, 'Kira Vant');
  await kira.getByRole('button', { name: 'Leiste einklappen' }).click();
  await expect(kira.getByRole('button', { name: 'Pilot-2' })).toHaveCount(0);
  await page.reload();
  await expect(kira.getByRole('button', { name: 'Leiste aufklappen' })).toBeVisible();
  await kira.getByRole('button', { name: /Kira Vant/ }).first().click();
  await expect(kira.getByRole('button', { name: 'Pilot-2' })).toBeVisible();
});

test('Charakter-Screen zum Verwalten: Details aufklappen, keine Proben', async ({ page }) => {
  await openCharacters(page);
  const kira = card(page, 'Kira Vant');
  await expect(kira.getByLabel('Pilot-2')).toHaveText('Pil-2');
  await kira.getByRole('button', { name: /Kira Vant/ }).click();
  await expect(kira.getByLabel('Pilot-2')).toHaveText('Pilot-2');
  await expect(kira).toContainText('Ausrüstung');
  await expect(page.getByRole('button', { name: 'Probe würfeln' })).toHaveCount(0);
});

test('Charakter anlegen: Fehler im Editor, dann gespeichert; der Neue steht oben', async ({ page }) => {
  await openCharacters(page);
  await page.getByRole('button', { name: '+ Neuer Charakter' }).click();
  const editor = page.getByRole('dialog', { name: 'Neuer Charakter' });
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(editor.getByRole('alert')).toHaveText('Der Charakter braucht einen Namen.');

  await editor.getByLabel('Name').fill('Mara Quell');
  await editor.getByLabel('INT').selectOption('11');
  await editor.getByLabel('Fertigkeit hinzufügen').selectOption({ label: 'Medical' });
  await editor.getByLabel('Stufe Medical').fill('2');
  await editor.getByLabel('Credits').fill('800');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(editor).toBeHidden();

  const mara = card(page, 'Mara Quell');
  await mara.getByRole('button', { name: /Mara Quell/ }).click();
  await expect(mara.getByLabel('Medical-2')).toBeVisible();
  await expect(mara.getByLabel(/^INT B/)).toBeVisible();
  await expect(mara).toContainText('Cr 800');

  await openOracle(page);
  await expect(top(page, 'Mara Quell').getByRole('button', { name: 'Medical-2' })).toBeVisible();
});

test('Wer im Log vorkommt, wird ausgeblendet statt gelöscht und lässt sich wieder einblenden', async ({ page }) => {
  await page.goto('/');
  await strip(page).getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  await top(page, 'Jonas Reyl').getByRole('button', { name: 'Steward-1' }).click();
  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();

  const jonas = card(page, 'Jonas Reyl');
  await jonas.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await editor.getByRole('button', { name: 'Ausblenden' }).click();
  await editor.getByRole('button', { name: 'Wirklich ausblenden?' }).click();
  await expect(jonas).toBeHidden();

  await page.getByRole('button', { name: 'Einblenden' }).click();
  await expect(jonas).toBeVisible();
});

test('Wer nicht im Log vorkommt, wird gelöscht', async ({ page }) => {
  await openCharacters(page);
  const kira = card(page, 'Kira Vant');
  // Der Stift im Kopf öffnet den Editor, ohne die Details aufzuklappen.
  await kira.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await editor.getByRole('button', { name: 'Löschen' }).click();
  await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(kira).toBeHidden();
  await expect(page.getByText('Ausgeblendet')).toBeHidden();
});

test('Logeintrag löschen: lange drücken, dann bestätigen; danach lässt sich der Charakter löschen', async ({ page }) => {
  await page.goto('/');
  await strip(page).getByRole('button', { name: 'Jonas Reyl nach oben' }).click();
  await top(page, 'Jonas Reyl').getByRole('button', { name: 'Steward-1' }).click();
  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  // Erst das Urteil abwarten: Solange die Würfel rollen, überspringt ein Tippen nur die Animation.
  const result = page.getByRole('alertdialog');
  await expect(result.getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
  await result.getByRole('button', { name: 'Weiter' }).click();
  await expect(result).toBeHidden();
  await dock(page).getByRole('button', { name: 'Probe abbrechen' }).click();
  await page.getByRole('button', { name: '2W6' }).click();
  await expect(page.locator('.entry')).toHaveCount(2);
  await expect(page.locator('.dice-roll')).toBeHidden();

  const entry = page.locator('.entry').first();
  const box = (await entry.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 30);
  await page.mouse.down();
  await page.waitForTimeout(800);
  await page.mouse.up();
  const ask = entry.getByRole('group', { name: 'Eintrag löschen?' });
  await ask.getByRole('button', { name: 'Behalten' }).click();
  await expect(ask).toBeHidden();
  await expect(page.locator('.entry')).toHaveCount(2);

  await entry.dispatchEvent('contextmenu');
  await ask.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.locator('.entry')).toHaveCount(1);
  await expect(page.locator('.entry')).toContainText('Würfel · 2W6');

  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
  const jonas = card(page, 'Jonas Reyl');
  await jonas.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await editor.getByRole('button', { name: 'Löschen' }).click();
  await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(jonas).toBeHidden();
});

test('Tot: im Editor markieren, steht unter „Verstorben“, rückt oben weiter, lässt sich zurücknehmen', async ({ page }) => {
  await openCharacters(page);
  await card(page, 'Kira Vant').getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await editor.getByLabel(/^Tot/).check();
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(card(page, 'Kira Vant')).toBeHidden();
  const fallen = page.getByRole('listitem', { name: 'Kira Vant, tot' });
  await expect(fallen).toContainText('† Kira Vant');

  await openOracle(page);
  await expect(top(page, 'Jonas Reyl')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();

  await fallen.getByRole('button', { name: 'Bearbeiten' }).click();
  await editor.getByLabel(/^Tot/).uncheck();
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(card(page, 'Kira Vant')).toBeVisible();
  await expect(page.getByText('Verstorben')).toBeHidden();
});

test('Ohne lebenden Charakter bietet die Leiste an, einen anzulegen', async ({ page }) => {
  await openCharacters(page);
  for (const name of ['Kira Vant', 'Jonas Reyl']) {
    await card(page, name).getByRole('button', { name: 'Bearbeiten' }).click();
    const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
    await editor.getByRole('button', { name: 'Löschen' }).click();
    await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  }
  await openOracle(page);
  await strip(page).getByRole('button', { name: '+ Charakter anlegen' }).click();
  await expect(page.getByRole('dialog', { name: 'Neuer Charakter' })).toBeVisible();
});
