import { expect, test, type Page } from '@playwright/test';

async function openCharacters(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
}

test.use({ reducedMotion: 'reduce' });

test('Charaktererschaffung: Attribute einzeln, Laufbahn, Terms, Abmusterung, Name', async ({ page }) => {
  await openCharacters(page);
  await page.getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
  const prompt = dialog.locator('.generation-prompt');

  for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) {
    await expect(prompt).toContainText(`Attribute würfeln: ${c}`);
    await dialog.getByRole('button', { name: `${c} würfeln` }).click();
  }
  await expect(prompt).toHaveText('Laufbahn wählen; dann wird die Musterung gewürfelt');
  await expect(dialog.getByRole('group', { name: 'Laufbahn' }).getByRole('button')).toHaveCount(6);

  // „Später weiter“ behält die Erschaffung.
  await dialog.getByRole('button', { name: 'Später weiter' }).click();
  await page.getByRole('button', { name: 'Erschaffung fortsetzen' }).click();
  await expect(prompt).toHaveText('Laufbahn wählen; dann wird die Musterung gewürfelt');

  await dialog.getByRole('button', { name: /^Other/ }).click();
  // Von hier an: immer der erste mögliche Knopf, bis der Charakter fertig oder tot ist.
  for (let i = 0; i < 200; i++) {
    const text = await prompt.innerText();
    if (text.startsWith('Fertig:') || text.startsWith('Gestorben')) break;
    await dialog.locator('.generation-dock button:not([disabled])').first().click();
  }
  const text = await prompt.innerText();
  if (text.startsWith('Gestorben')) {
    await expect(dialog.getByRole('button', { name: 'Neu beginnen' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Verwerfen' }).last().click();
    await expect(dialog).toBeHidden();
    return;
  }
  await dialog.getByLabel('Name').fill('Mara Quell');
  await dialog.getByRole('button', { name: 'Übernehmen' }).click();
  await expect(dialog).toBeHidden();

  const mara = page.getByRole('article', { name: 'Mara Quell' });
  await expect(mara).toContainText(/Ex-Other · \d+ Terms? · \d+ Jahre/);
  await mara.getByRole('button', { name: /Mara Quell/ }).click();
  await mara.getByText('Lebenslauf').click();
  await expect(mara.getByRole('region', { name: 'Lebenslauf' })).toContainText('Musterung Other');
});

test('Besitz: Gegenstand aus der Liste mit Anzahl, in den Details', async ({ page }) => {
  await openCharacters(page);
  const kira = page.getByRole('article', { name: 'Kira Vant' });
  await kira.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Gegenstand hinzufügen').selectOption({ label: 'Low Passage' });
  await editor.getByLabel('Anzahl Low Passage').fill('2');
  await editor.getByLabel('Gegenstand hinzufügen').selectOption({ label: 'Vacc Suit (TL 12)' });
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await kira.getByRole('button', { name: /Kira Vant/ }).click();
  await expect(kira).toContainText('2 × Low Passage, Vacc Suit (TL 12)');
});
