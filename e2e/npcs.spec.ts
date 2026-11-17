import { expect, test } from '@playwright/test';
import { openPeople } from './layout';

// NSC im Reiter Charaktere: neue NSC mit Rolle, leer oder aus einer Laufbahn erzeugt; sie stehen dort nach
// Rolle gruppiert, mit Attributen, nicht mehr im Charakter-Screen.
test('NSC: leer anlegen mit Rolle, er steht unter seiner Rolle', async ({ page }) => {
  await page.goto('/');
  await openPeople(page, 'NSC');
  await expect(page.getByRole('heading', { name: /^(NSC auf |Alle NSC)/ })).toBeVisible();
  await expect(page.getByText(/Noch keine NSC/)).toBeVisible();
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  await page.getByRole('dialog', { name: 'Neuer NSC' }).getByLabel('Rolle').selectOption({ label: 'Kontakt' });
  await page.getByRole('button', { name: 'Leer anlegen' }).click();
  const editor = page.getByRole('dialog', { name: 'Neuer NSC' });
  await expect(editor.getByLabel('Rolle')).toHaveValue('contact');
  await editor.getByLabel('Name').fill('Mara Voss');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { name: 'Kontakt' })).toBeVisible();
  await expect(page.getByRole('listitem', { name: 'Mara Voss, Kontakt' })).toContainText('STR 7 DEX 7');
  await openPeople(page, 'SC');
  await expect(page.getByText('Mara Voss')).toHaveCount(0);
});

test('NSC: aus einer Laufbahn erzeugen, danach steht er im Editor', async ({ page }) => {
  await page.goto('/');
  await openPeople(page, 'NSC');
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  const sheet = page.getByRole('dialog', { name: 'Neuer NSC' });
  await sheet.getByLabel('Rolle').selectOption({ label: 'Feind' });
  await sheet.getByRole('button', { name: 'Army', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await expect(editor.getByLabel('Rolle')).toHaveValue('enemy');
  await expect(editor.getByLabel('Herkunft')).toHaveValue(/^Ex-Army/);
  await editor.getByRole('button', { name: 'Schließen' }).click();
  await expect(page.getByRole('heading', { name: 'Feind' })).toBeVisible();
});

// Kampf mit dauerhaften NSC (2026-11-14g): Am NSC springt „In Begegnung“ in den Reiter Begegnung und
// wählt ihn vor; er kämpft auf der Seite der NSC und führt.
test('NSC: „In Begegnung“ nimmt den NSC zur Zufallsbegegnung dazu; er führt die NSC an', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  await openPeople(page, 'NSC');
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  await page.getByRole('dialog', { name: 'Neuer NSC' }).getByLabel('Rolle').selectOption({ label: 'Verbündeter' });
  await page.getByRole('button', { name: 'Leer anlegen' }).click();
  const editor = page.getByRole('dialog', { name: 'Neuer NSC' });
  await editor.getByLabel('Name').fill('Tenzin Thorsen');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await page.getByRole('button', { name: 'Tenzin Thorsen in Begegnung' }).click();

  // Im Reiter Begegnung steht, wer dazukommt; mit „Manuell wählen“ öffnet Zufall die Auswahl der Art.
  await expect(page.getByRole('status', { name: 'Kommen dazu' })).toContainText('Tenzin Thorsen · Anführer');
  await page.getByRole('checkbox', { name: /^Manuell wählen/ }).check();
  await page.getByRole('region', { name: 'Begegnung und Zeit' }).getByRole('button', { name: /^Zufallsbegegnung würfeln/ }).click();
  await page.getByRole('dialog', { name: 'Welche Begegnung?' }).getByRole('button', { name: /^23 · / }).click();

  const intro = page.getByRole('dialog', { name: /Tenzin Thorsen \+ \d+ × Police Patrol/ });
  await expect(intro).toBeVisible();
  await expect(intro.locator('.intro-npcs li').first()).toContainText('Tenzin Thorsen · Anführer');
  await intro.getByRole('button', { name: 'Weiter' }).click();
  await expect(page.locator('.encounter-running-title')).toHaveText(/^Tenzin Thorsen \+ \d+ × Police Patrol$/);
  // Läuft eine Begegnung, gibt es „In Begegnung“ nicht.
  await openPeople(page, 'NSC');
  await expect(page.getByRole('button', { name: 'Tenzin Thorsen in Begegnung' })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Kampf', exact: true }).click();
  await expect(page.locator('.fight-head-title')).toContainText('Tenzin Thorsen + ');
});

test('Zufallsbegegnung: mit Art „keine“ kommen nur die dazugenommenen NSC', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Bereiche' });
  await openPeople(page, 'NSC');
  await page.getByRole('button', { name: '+ Neuer NSC' }).click();
  await page.getByRole('button', { name: 'Leer anlegen' }).click();
  const editor = page.getByRole('dialog', { name: 'Neuer NSC' });
  await editor.getByLabel('Name').fill('Ilka Brand');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await nav.getByRole('button', { name: 'Begegnung', exact: true }).click();
  const random = page.getByRole('region', { name: 'Begegnung und Zeit' }).getByRole('button', { name: /^Zufallsbegegnung würfeln/ });
  // Ohne dazugenommene NSC gibt es die Art „keine“ nicht.
  await page.getByRole('checkbox', { name: /^Manuell wählen/ }).check();
  await random.click();
  const choice = page.getByRole('dialog', { name: 'Welche Begegnung?' });
  await expect(choice.getByRole('button', { name: 'keine · nur die NSC' })).toHaveCount(0);
  await choice.getByRole('button', { name: 'Abbrechen' }).click();
  // „NSC dazunehmen“: Zufall öffnet erst die NSC-Liste zum Auswählen, OK führt zur Auswahl der Art.
  await page.getByRole('checkbox', { name: /^NSC dazunehmen/ }).check();
  await random.click();
  await page.getByRole('checkbox', { name: 'Ilka Brand wählen' }).check();
  await page.getByRole('region', { name: 'NSC auswählen' }).getByRole('button', { name: /^OK, 1 NSC dazunehmen/ }).click();
  await choice.getByRole('button', { name: 'keine · nur die NSC' }).click();
  const intro = page.getByRole('dialog', { name: 'Ilka Brand' });
  await expect(intro).toContainText('Begegnung · nur NSC');
  await page.screenshot({ path: process.env.SHOT ?? 'test-results/nur-nsc.png' });
});
