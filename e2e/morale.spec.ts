import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openCombat, wuerfelgleich } from './layout';

/**
 * Der Kampf in der Datei `fixtures/moral-flucht.json` (S. 5, SR 23): vier Marines (Art 24 –
 * militärisch, mit Anführer), zwei von ihnen und einer von zwei SC sind bewusstlos, beide SC stehen
 * in Berührung, die Überraschung ist gewürfelt. Damit steht jede Partei bei 50 % Verlusten und
 * würfelt zu Beginn der neuen Runde auf die Moral. Die Datei erzeugt dieses Modell:
 * `MORAL_FIXTURE=1 npx vitest run src/model/fixture-moral.test.ts`; derselbe Test prüft die Datei
 * gegen das Modell, wenn ohne die Variable gelaufen wird.
 */
async function importFight(page: Page) {
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await expect(page.getByRole('dialog', { name: 'Kampagnen' })).toBeVisible();
  await page
    .getByRole('dialog', { name: 'Kampagnen' })
    .locator('input[type=file]')
    .setInputFiles({ name: 'moral-flucht.json', mimeType: 'application/json', buffer: readFileSync(new URL('fixtures/moral-flucht.json', import.meta.url)) });
  await expect(page.getByRole('dialog', { name: 'Kampagnen' })).toBeHidden();
}

const morale = (page: Page) => page.getByRole('dialog', { name: 'Moral' });
const passTurn = (page: Page) => page.locator('.fight-dock').getByRole('button', { name: /^(Ausweichen|Aussetzen)$/ });

/** Den Zug schließen, bis die nächste Runde beginnt; dabei die Moralbühne einklappen, wenn sie kommt. */
async function toNextRound(page: Page) {
  const head = page.locator('.fight-head');
  const round = Number(/Runde (\d+)/.exec(await head.innerText())?.[1]);
  for (let zug = 0; zug < 10; zug += 1) {
    if (await morale(page).isVisible().catch(() => false)) {
      await morale(page).getByRole('button', { name: 'Weiter' }).click();
      await expect(morale(page)).toBeHidden();
    }
    if (Number(/Runde (\d+)/.exec(await head.innerText())?.[1]) > round) return;
    await passTurn(page).click();
  }
  throw new Error(`Runde ${round + 1} kam nicht`);
}

test('Moral: ab der neuen Runde würfelt jede Partei ab 25 % Verlusten, die NSC-Partei flieht und rückt ab', async ({ page }) => {
  test.setTimeout(90_000);
  await wuerfelgleich(page);
  await page.goto('/');
  await importFight(page);
  await openCombat(page);

  // Der Kampf aus der Datei: Runde 1, zwei von vier NSC und einer von zwei SC sind bewusstlos.
  await expect(page.locator('.fight-head')).toContainText('Runde 1');
  await expect(page.locator('.fcard.npcs')).toHaveCount(4);
  await expect(page.locator('.fcard.npcs .state-icon.unconscious')).toHaveCount(2);
  await expect(page.locator('.fcard.pcs .state-icon.unconscious')).toHaveCount(1);
  // In der ersten Runde wird nicht gewürfelt: Da zählt nur die Überraschung.
  await expect(morale(page)).toHaveCount(0);

  // Die NSC haben die Überraschung, also setzen sie die erste Runde aus – dann kommt die Moralbühne.
  const dialog = morale(page);
  for (let zug = 0; zug < 6 && !(await dialog.isVisible().catch(() => false)); zug += 1) await passTurn(page).click();
  await expect(page.locator('.fight-head')).toContainText('Runde 2');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Moral je Partei · S. 5 · Runde 2');
  const sides = dialog.locator('.morale-side');
  await expect(sides).toHaveCount(2);
  // Die SC-Seite zuerst, dann die NSC: je Partei ihre DMs einzeln und ihr Anteil an Verlusten.
  await expect(sides.nth(0)).toContainText('SC');
  await expect(sides.nth(0)).toContainText('50 % Verluste');
  await expect(sides.nth(1)).toContainText('NSC');
  await expect(sides.nth(1)).toContainText('militärisch +1');
  await expect(sides.nth(1)).toContainText('Anführer +1');
  await expect(sides.nth(1)).toContainText('50 % Verluste');
  // Die SC-Seite hat verloren – bei ihr ist das nur die Empfehlung „Rückzug“, die NSC-Seite steht.
  await expect(dialog.locator('.surprise-verdict')).toHaveText('SC: Rückzug empfohlen · NSC: stehen');
  await dialog.getByRole('button', { name: 'Weiter' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.arena-side.pcs .arena-flag')).toHaveText('Rückzug empfohlen');
  await expect(page.locator('.arena-side.npcs .arena-flag')).toHaveCount(0);

  // Die NSC stehen erst mal: der Kampf geht weiter, bis ein späterer Wurf verliert (feste Würfel).
  const flees = page.locator('.arena-side.npcs .arena-flag');
  for (let runde = 3; runde <= 12 && (await flees.count()) === 0; runde += 1) await toNextRound(page);
  await expect(flees).toHaveText('⇉ flieht');
  // Im Wurf selbst rückt noch nichts: Die SC stehen weiter in Berührung.
  await expect(page.locator('.ray-now')).toContainText('Berührung');
  // Von da an rückt die fliehende Partei zu Beginn jeder neuen Runde 2 Bands weg und kämpft nicht mehr.
  await toNextRound(page);
  // Der erste Schritt löst nur die Berührung: von ihr aus führt der zweite Band nach Band 1.
  await expect(page.locator('.ray-now')).toContainText('Band 1');
  // Eine fliehende Partei kämpft nicht mehr: Ihre NSC sind nie am Zug, auch nicht auf dem Band.
  await expect(page.locator('.fcard.npcs .fcard-marker.turn')).toHaveCount(0);
  await toNextRound(page);
  await expect(page.locator('.ray-now')).toContainText('Band 3');
});

test('Moral: die fliehende NSC-Partei ist über 20 Bands weg und lässt nur noch das Beenden', async ({ page }) => {
  test.setTimeout(120_000);
  await wuerfelgleich(page);
  await page.goto('/');
  await importFight(page);
  await openCombat(page);

  // Über 30 Züge darf nichts schlagen: entkommen ist erst über 20 Bands, also ab der 13. Runde.
  const note = page.locator('.combat-pick', { hasText: 'Die NSC sind entkommen' });
  for (let runde = 2; runde <= 20 && (await note.count()) === 0; runde += 1) await toNextRound(page);
  await expect(note).toContainText('Die NSC sind entkommen: über 20 Bands weg.');
  await expect(page.locator('.ray-now')).toContainText('Entkommen');
  await expect(page.locator('.ray-now')).toContainText('über 20 Bands');
  // Kein Angriff mehr, kein Zug: in der Aktionsleiste bleibt nur das Beenden.
  await expect(page.locator('.fight-dock .atk')).toHaveCount(0);
  await expect(page.locator('.fight-dock').getByRole('button', { name: /^(Ausweichen|Aussetzen)$/ })).toHaveCount(0);
  await expect(page.locator('.fight-dock').getByRole('button', { name: 'Beenden' })).toBeVisible();
});
