import { expect, test, type Page } from '@playwright/test';
import { dock, entries, host, openOracle, openTaskPage, rollDice, rollTask, taskCard, taskPage } from './layout';

async function openCharacters(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
}

const card = (page: Page, name: string) => host(page).getByRole('article', { name });

test('Probe auf der Detailseite: Fertigkeit, dann Attribute, die Schwierigkeit würfelt; Ergebnis auf der Würfelbühne, danach im Log', async ({ page }) => {
  await page.goto('/');
  // Im Log steht keine Charakterleiste mehr (2026-11-27).
  await expect(host(page).getByRole('region', { name: 'Spielercharaktere' })).toHaveCount(0);
  await openTaskPage(page);
  const kira = taskCard(page, 'Kira Vant');
  await expect(taskCard(page, 'Jonas Reyl')).toBeVisible();
  await expect(kira.getByRole('button', { name: 'Pilot-2' })).toHaveText('Pil-2');
  // Ohne Fertigkeit stehen die Attribute als Zeile da; Knöpfe werden sie erst mit der Fertigkeit (2026-11-26).
  await expect(kira.getByRole('button', { name: /^DEX A/ })).toHaveCount(0);
  await expect(kira.getByLabel('Attribute')).toContainText('DEX A');
  await expect(dock(page)).toContainText('Erst eine Fertigkeit wählen');
  await expect(dock(page).getByRole('button', { name: 'Probe Schwer 10+' })).toBeDisabled();
  await kira.getByRole('button', { name: 'Pilot-2' }).click();

  await expect(kira.getByRole('button', { name: /^DEX A: würde DM \+1/ })).toBeEnabled();
  await expect(kira.getByRole('button', { name: /^SOC 5: würde DM −1/ })).toBeEnabled();
  await expect(kira.getByRole('button', { name: /^END 8: kein Einfluss/ })).toBeDisabled();
  await kira.getByRole('button', { name: /^DEX A/ }).click();
  await expect(kira.getByRole('button', { name: /^DEX A: gewählt/ })).toHaveAttribute('aria-pressed', 'true');

  // Über den Knöpfen: die Probe mit nötigem Wurf und Chance je Schwierigkeit.
  await expect(dock(page)).toContainText('Kira Vant · Pilot-2');
  await expect(dock(page)).toContainText('2W6 +3 (DEX +1) · Leicht 3+ 97 % · Mittel 5+ 83 % · Schwer 7+ 58 %');
  await dock(page).getByRole('button', { name: 'Probe Schwer 10+' }).click();
  await expect(taskPage(page)).toBeHidden();
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
  // Gewürfelt ist die Probe zu Ende; im Log steht wieder „2W6“.
  await expect(dock(page).getByRole('button', { name: '2W6', exact: true })).toBeVisible();
  await expect(dock(page).getByRole('button', { name: /^Probe Schwer/ })).toHaveCount(0);
});

test('Eine Fertigkeit eines anderen Charakters holt ihn nach oben; ohne Fertigkeit unmöglich, aber würfelbar; ✕ würfelt nicht', async ({ page }) => {
  await page.goto('/');
  await openTaskPage(page);
  await taskCard(page, 'Kira Vant').getByRole('button', { name: 'Pilot-2' }).click();
  await taskCard(page, 'Jonas Reyl').getByRole('button', { name: 'Ohne −3' }).click();
  // Die Wahl wechselt zu Jonas: Kiras Attribute sind wieder eine Zeile.
  await expect(taskCard(page, 'Kira Vant').getByRole('button', { name: /^DEX A/ })).toHaveCount(0);
  await expect(dock(page)).toContainText('Jonas Reyl · Ohne Fertigkeit');
  await expect(dock(page)).toContainText('2W6 −3 · Leicht 9+ 28 % · Mittel 11+ 8 % · Schwer unmöglich');
  await dock(page).getByRole('button', { name: 'Probe Schwer 10+' }).click();
  await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText('FEHLSCHLAG');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await expect(page.locator('.entry').last()).toContainText('Jonas Reyl');

  // ✕ schließt die Detailseite, ohne zu würfeln.
  await openTaskPage(page);
  await taskCard(page, 'Kira Vant').getByRole('button', { name: 'Pilot-2' }).click();
  await taskPage(page).getByRole('button', { name: 'Probe schließen' }).click();
  await expect(taskPage(page)).toBeHidden();
  await expect(entries(page)).toHaveCount(1);
});

test('2W6 lange drücken würfelt gleich, ohne die Detailseite', async ({ page }) => {
  await page.goto('/');
  const button = dock(page).getByRole('button', { name: '2W6', exact: true });
  await button.hover();
  await page.mouse.down();
  await expect(entries(page)).toHaveCount(1, { timeout: 3000 });
  await page.mouse.up();
  await expect(taskPage(page)).toHaveCount(0);
  await expect(entries(page)).toContainText('2W6');
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
  const editor = page.getByRole('region', { name: 'Neuer Charakter' });
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
  await openTaskPage(page);
  await expect(taskCard(page, 'Mara Quell').getByRole('button', { name: 'Medical-2' })).toBeVisible();
});

test('Wer im Log vorkommt, wird ausgeblendet statt gelöscht und lässt sich wieder einblenden', async ({ page }) => {
  await page.goto('/');
  await rollTask(page, 'Jonas Reyl', 'Steward-1');
  await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Weiter' }).click();
  await expect(page.getByRole('alertdialog')).toBeHidden();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();

  const jonas = card(page, 'Jonas Reyl');
  await jonas.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('region', { name: 'Charakter bearbeiten' });
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
  const editor = page.getByRole('region', { name: 'Charakter bearbeiten' });
  await editor.getByRole('button', { name: 'Löschen' }).click();
  await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(kira).toBeHidden();
  await expect(page.getByText('Ausgeblendet')).toBeHidden();
});

test('Logeintrag löschen: lange drücken, dann bestätigen; danach lässt sich der Charakter löschen', async ({ page }) => {
  await page.goto('/');
  await rollTask(page, 'Jonas Reyl', 'Steward-1');
  // Erst das Urteil abwarten: Solange die Würfel rollen, überspringt ein Tippen nur die Animation.
  const result = page.getByRole('alertdialog');
  await expect(result.getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
  await result.getByRole('button', { name: 'Weiter' }).click();
  await expect(result).toBeHidden();
  await rollDice(page);
  await expect(entries(page)).toHaveCount(2);
  await expect(page.locator('.dice-roll')).toBeHidden();

  // Die Probe ist jetzt eine Zeile: aufklappen, Löschen, erst behalten, dann wirklich löschen.
  const entry = entries(page).first();
  await entry.getByRole('button', { name: /Jonas Reyl/ }).click();
  await entry.getByRole('button', { name: 'Ergebnis löschen' }).click();
  const ask = entry.getByRole('group', { name: 'Eintrag löschen?' });
  await ask.getByRole('button', { name: 'Behalten' }).click();
  await expect(ask).toBeHidden();
  await expect(entries(page)).toHaveCount(2);

  await entry.getByRole('button', { name: 'Ergebnis löschen' }).click();
  await ask.getByRole('button', { name: 'Löschen' }).click();
  await expect(entries(page)).toHaveCount(1);
  await expect(entries(page)).toContainText('Würfel · 2W6');

  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
  const jonas = card(page, 'Jonas Reyl');
  await jonas.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('region', { name: 'Charakter bearbeiten' });
  await editor.getByRole('button', { name: 'Löschen' }).click();
  await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(jonas).toBeHidden();
});

test('Tot: im Editor markieren, steht unter „Verstorben“, rückt oben weiter, lässt sich zurücknehmen', async ({ page }) => {
  await openCharacters(page);
  await card(page, 'Kira Vant').getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('region', { name: 'Charakter bearbeiten' });
  await editor.getByLabel(/^Tot/).check();
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(card(page, 'Kira Vant')).toBeHidden();
  const fallen = page.getByRole('listitem', { name: 'Kira Vant, tot' });
  await expect(fallen).toContainText('† Kira Vant');

  await openOracle(page);
  await openTaskPage(page);
  await expect(taskCard(page, 'Kira Vant')).toHaveCount(0);
  await expect(taskCard(page, 'Jonas Reyl')).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();

  await fallen.getByRole('button', { name: 'Bearbeiten' }).click();
  await editor.getByLabel(/^Tot/).uncheck();
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(card(page, 'Kira Vant')).toBeVisible();
  await expect(page.getByText('Verstorben')).toBeHidden();
});

test('Ohne lebenden Charakter bietet die Detailseite Probe an, einen anzulegen', async ({ page }) => {
  await openCharacters(page);
  for (const name of ['Kira Vant', 'Jonas Reyl']) {
    await card(page, name).getByRole('button', { name: 'Bearbeiten' }).click();
    const editor = page.getByRole('region', { name: 'Charakter bearbeiten' });
    await editor.getByRole('button', { name: 'Löschen' }).click();
    await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  }
  await openOracle(page);
  await openTaskPage(page);
  await taskPage(page).getByRole('button', { name: '+ Charakter anlegen' }).click();
  await expect(page.getByRole('region', { name: 'Neuer Charakter' })).toBeVisible();
});
