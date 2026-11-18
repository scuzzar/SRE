import { expect, test } from '@playwright/test';
import { openTab } from './layout';

// Missionen (2026-11-18): der Reiter Missionen mit Editor, Orte immer als Feld auf dem Globus, „Missionen
// hier“ am Feld.
test('Missionen: anlegen mit dem Feld der Gruppe und einem Ort vom Globus, am Feld wiederfinden', async ({ page }) => {
  await page.goto('/');
  // Die Gruppe kommt in die Hauptstadt von Kessra; ohne Feld gäbe es keinen Aufenthaltsort als Missionsort.
  await page.getByRole('button', { name: /Aufenthaltsort Kessra.*Globus öffnen/ }).click();
  const globe = page.getByRole('region', { name: 'Globus · Kessra' });
  await globe.getByRole('button', { name: /^Orte/ }).click();
  await globe.getByRole('region', { name: 'Orte' }).getByRole('button', { name: /Hauptstadt ·/ }).click();
  await page.getByRole('region', { name: 'Am Feld' }).getByRole('button', { name: 'Gruppe in diese Stadt setzen' }).click();

  await openTab(page, 'Missionen');
  await expect(page.getByText(/Keine offene Mission/)).toBeVisible();
  await page.getByRole('button', { name: '+ Neue Mission' }).click();
  const editor = page.getByRole('dialog', { name: 'Neue Mission' });
  await editor.getByLabel('Titel').fill('Fracht nach Regina schmuggeln');
  await editor.getByLabel(/^Etikett für /).first().fill('Treffpunkt');
  await editor.getByLabel('Auftraggeber').selectOption({ label: 'keiner' });
  // Ein zweiter Ort vom Globus: Der Editor tritt zurück, ein Feld antippen, „OK“.
  await editor.getByRole('button', { name: '+ Auf dem Globus' }).click();
  await expect(editor).toHaveCount(0);
  const canvas = globe.getByRole('img', { name: /Globus von Kessra/ });
  const box = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: box.width * 0.35, y: box.height * 0.4 } });
  await page.getByRole('region', { name: 'Am Feld' }).getByRole('button', { name: /^OK, .* als Missionsort/ }).click();
  const again = page.getByRole('dialog', { name: 'Neue Mission' });
  await expect(again.getByLabel('Titel')).toHaveValue('Fracht nach Regina schmuggeln');
  await expect(again.getByLabel(/^Etikett für /)).toHaveCount(2);
  await expect(again.getByLabel(/^Etikett für /).first()).toHaveValue('Treffpunkt');
  await again.getByRole('button', { name: 'Speichern' }).click();

  const mission = page.getByRole('listitem', { name: 'Fracht nach Regina schmuggeln' });
  await expect(mission).toContainText('hier');
  await expect(mission).toContainText('kein Auftraggeber');
  // Der Chip öffnet den Globus am Feld; dort steht die Mission unter „Missionen hier“.
  await mission.getByRole('button', { name: /^Treffpunkt: .* auf dem Globus zeigen/ }).click();
  const field = page.getByRole('region', { name: 'Angetipptes Feld' });
  await expect(field).toContainText('Missionen hier (1)');
  await field.getByRole('button', { name: 'Mission Fracht nach Regina schmuggeln öffnen' }).click();
  const edit = page.getByRole('dialog', { name: 'Mission bearbeiten' });
  await edit.getByRole('radio', { name: 'Erledigt' }).click();
  await edit.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Offene Missionen (0)')).toBeVisible();
  await expect(page.getByText('Erledigt (1)')).toBeVisible();
});
