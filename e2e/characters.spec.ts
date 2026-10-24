import { expect, test, type Page } from '@playwright/test';

async function openCharacters(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
}

const card = (page: Page, name: string) => page.getByRole('article', { name });
const dock = (page: Page) => page.getByRole('region', { name: 'Probe' });

test('Probe: Fertigkeit, dann Attribute, Schwierigkeit unten, Ergebnis als Popup, zurück zum Orakel', async ({ page }) => {
  await openCharacters(page);
  const kira = card(page, 'Kira Vant');
  await expect(dock(page).getByRole('button', { name: 'Probe würfeln' })).toBeDisabled();

  await expect(kira.getByRole('button', { name: 'Pilot-2' })).toHaveText('Pil-2');
  await kira.getByRole('button', { name: /Kira Vant/ }).click();
  await expect(kira.getByRole('button', { name: 'Pilot-2' })).toHaveText('Pilot-2');
  await expect(kira.getByRole('button', { name: /^DEX A/ })).toBeDisabled();
  await kira.getByRole('button', { name: 'Pilot-2' }).click();

  await expect(kira.getByRole('button', { name: /^DEX A: würde DM \+1/ })).toBeEnabled();
  await expect(kira.getByRole('button', { name: /^SOC 5: würde DM −1/ })).toBeEnabled();
  await expect(kira.getByRole('button', { name: /^END 8: kein Einfluss/ })).toBeDisabled();
  await kira.getByRole('button', { name: /^DEX A/ }).click();
  await expect(kira.getByRole('button', { name: /^DEX A: gewählt/ })).toHaveAttribute('aria-pressed', 'true');

  await dock(page).getByRole('radio', { name: '10+' }).click();
  await expect(dock(page)).toContainText('Pilot-2 · 10+');
  await expect(dock(page)).toContainText('2W6 +3 (DEX +1) · Braucht 7+');
  await expect(dock(page)).not.toContainText('%');
  await expect(dock(page)).not.toContainText('Kira Vant');

  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  const result = page.getByRole('alertdialog');
  await expect(result).toContainText('Kira Vant · Pilot-2 · 10+');
  await expect(result.getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
  await expect(result).toContainText(/2W6: [1-6] \+ [1-6] = \d+, DM \+3 → \d+/);

  await result.getByRole('button', { name: 'Weiter zum Orakel' }).click();
  await expect(page.getByRole('button', { name: 'Karte ziehen' })).toBeVisible();
  const entry = page.locator('.entry').last();
  await expect(entry).toContainText('Probe');
  await expect(entry).toContainText('Kira Vant · Pilot-2 · 10+');
});

test('Probe ohne Fertigkeit: direkt aus der Karte gestartet, unmöglich, aber würfelbar', async ({ page }) => {
  await openCharacters(page);
  await dock(page).getByRole('radio', { name: '10+' }).click();
  const jonas = card(page, 'Jonas Reyl');
  await jonas.getByRole('button', { name: 'Ohne (−3)' }).click();
  await expect(jonas.getByRole('button', { name: 'Bearbeiten' })).toBeHidden();
  await expect(jonas.getByRole('button', { name: 'Steward-1' })).toHaveText('Ste-1');
  await expect(dock(page)).toContainText('Ohne Fertigkeit · 10+');
  await expect(dock(page)).toContainText('2W6 −3 · Unmöglich');
  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  await expect(page.getByRole('alertdialog').getByRole('heading')).toHaveText('FEHLSCHLAG');
});

test('Charakter anlegen: Fehler im Editor, dann gespeichert', async ({ page }) => {
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
  await expect(mara.getByRole('button', { name: 'Medical-2' })).toBeVisible();
  await expect(mara.getByRole('button', { name: /^INT B/ })).toBeVisible();
  await expect(mara).toContainText('Cr 800');
});

test('Wer im Log vorkommt, wird ausgeblendet statt gelöscht und lässt sich wieder einblenden', async ({ page }) => {
  await openCharacters(page);
  const jonas = card(page, 'Jonas Reyl');
  await jonas.getByRole('button', { name: /Jonas Reyl/ }).click();
  await jonas.getByRole('button', { name: 'Steward-1' }).click();
  await dock(page).getByRole('button', { name: 'Probe würfeln' }).click();
  await page.getByRole('button', { name: 'Weiter zum Orakel' }).click();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();

  await jonas.getByRole('button', { name: /Jonas Reyl/ }).click();
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
  await kira.getByRole('button', { name: /Kira Vant/ }).click();
  await kira.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await editor.getByRole('button', { name: 'Löschen' }).click();
  await editor.getByRole('button', { name: 'Wirklich löschen?' }).click();
  await expect(kira).toBeHidden();
  await expect(page.getByText('Ausgeblendet')).toBeHidden();
});
