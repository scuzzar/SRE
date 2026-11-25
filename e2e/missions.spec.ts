import { expect, test } from '@playwright/test';
import { openTab, revealed, openHomeGlobe, schwererLauf } from './layout';

// Missionen (2026-11-18): der Reiter Missionen mit Editor, Orte immer als Feld auf dem Globus, „Missionen
// hier“ am Feld.
test('Missionen: anlegen mit dem Feld der Gruppe und einem Ort vom Globus, am Feld wiederfinden', async ({ page }) => {
  // Globus, Editor und Globus-Auswahl: auf dem Desktop über 40 s, also schwer.
  schwererLauf(90_000);
  await page.goto('/');
  // Die Gruppe landet an einem Hafen von Kessra (Landeplatz, 2026-11-21); ohne Feld gäbe es keinen Aufenthaltsort als Missionsort.
  await openHomeGlobe(page);
  const globe = page.getByRole('region', { name: 'Globus · Kessra' });

  await openTab(page, 'Missionen');
  await expect(page.getByText(/Keine offene Mission/)).toBeVisible();
  await page.getByRole('button', { name: '+ Neue Mission' }).click();
  const editor = page.getByRole('dialog', { name: 'Neue Mission' });
  await editor.getByLabel('Titel').fill('Fracht nach Regina schmuggeln');
  await editor.getByLabel(/^Etikett für /).first().fill('Treffpunkt');
  await editor.getByLabel('Auftraggeber').selectOption({ label: 'keiner' });
  // „Karte ziehen“ unter dem Text: Die Auswahl der Karte hängt sich an den Text an, nicht an den Log.
  await editor.getByLabel('Text').fill('Ohne Zoll.');
  await editor.getByRole('button', { name: 'Karte ziehen' }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await revealed(card);
  await card.getByRole('group', { name: /^Orakel, W100 \d+$/ }).getByRole('button').nth(1).click();
  await card.getByRole('button', { name: /1 Eintrag in die Notiz übernehmen/ }).click();
  await expect(card).toBeHidden();
  await expect(editor.getByLabel('Text')).toHaveValue(/^Ohne Zoll\.\n.+/);
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
  // Beteiligte (2026-11-18b): ein SC oder NSC mit Etikett.
  await again.getByLabel('Beteiligten hinzufügen').selectOption({ label: 'Kira Vant' });
  await again.getByLabel('Etikett für Kira Vant').fill('Fahrerin');
  await again.getByRole('button', { name: 'Speichern' }).click();

  const mission = page.getByRole('listitem', { name: 'Fracht nach Regina schmuggeln' });
  await expect(mission).toContainText('hier');
  await expect(mission).toContainText('kein Auftraggeber');
  // Ein Tippen auf die Beteiligte öffnet sie im Charakter-Editor; dort steht die Mission.
  await mission.getByRole('button', { name: 'Fahrerin: Kira Vant öffnen' }).click();
  const character = page.getByRole('dialog', { name: 'Charakter bearbeiten' });
  await expect(character).toContainText('Missionen (1)');
  await expect(character).toContainText('Fahrerin · Offen');
  await character.getByRole('button', { name: 'Schließen' }).click();
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
