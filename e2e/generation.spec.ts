import { expect, test, type Page } from '@playwright/test';
import { characters, host, wuerfelgleich } from './layout';

async function openCharacters(page: Page) {
  await page.goto('/');
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
}

test.use({ reducedMotion: 'reduce' });

/** Öffnet über die Kampagnenwahl eine neue Kampagne mit einer fertigen Welt Regina in 0101. */
async function campaignWithWorld(page: Page) {
  await page.goto('/');
  const regina = { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };
  const file = { format: 'solo-rpg-engine/kampagne', version: 1, campaign: { name: 'Mit Welt', odds: 'medium', characters: [], log: [], hexes: [regina] } };
  await page.getByRole('banner').getByRole('button', { name: 'Menü', exact: true }).click();
  await page.getByRole('navigation', { name: 'Menü' }).getByRole('button', { name: 'Kampagnen wechseln und verwalten' }).click();
  await page.getByRole('dialog', { name: 'Kampagnen' }).locator('input[type=file]').setInputFiles({ name: 'welt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(file)) });
  await expect(page.getByRole('dialog', { name: 'Kampagnen' })).toBeHidden();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
}

test('Charaktererschaffung: Attribute einzeln, Laufbahn, Terms, Abmusterung, Name', async ({ page }) => {
  await openCharacters(page);
  await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
  const prompt = dialog.locator('.generation-prompt');

  for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) {
    await expect(prompt).toContainText(`Attribute würfeln: ${c}`);
    await dialog.getByRole('button', { name: `${c} würfeln` }).click();
  }
  // Heimatwelt: auf der Karte ein freies Feld wählen, Vorkommen würfeln, bis es eine Welt gibt, sie erschaffen.
  await expect(prompt).toContainText('Heimatwelt');
  await dialog.getByRole('button', { name: /Auf der Karte wählen/ }).click();
  const picker = page.getByRole('dialog', { name: 'Heimatwelt wählen' });
  const map = picker.getByRole('group', { name: 'Karte des Subsektors' });
  for (const id of ['0101', '0202', '0303', '0404', '0505', '0606', '0707', '0408', '0109', '0210']) {
    // Untere Reihen liegen am Handy unter dem Ziehblatt; das Feld wird direkt angetippt.
    await map.getByRole('button', { name: `${id}, nicht erzeugt` }).dispatchEvent('click');
    await picker.getByRole('button', { name: /Vorkommen würfeln/ }).click();
    if (await picker.getByText('Kein System in diesem Feld').isVisible()) continue;
    await picker.getByRole('button', { name: 'Welt erschaffen' }).click();
    const world = page.getByRole('dialog', { name: `Weltenerschaffung ${id}` });
    for (let i = 0; i < 30 && (await world.locator('.generation-main').count()) > 0; i++) await world.locator('.generation-main').click();
    await world.getByLabel('Name der Welt').fill('Regina');
    await world.getByRole('button', { name: 'Übernehmen' }).click();
    break;
  }
  await expect(picker).toBeHidden();
  await expect(dialog.getByRole('article', { name: 'Neuer Charakter' })).toContainText('von Regina');
  await expect(prompt).toHaveText('Laufbahn wählen; dann wird die Musterung gewürfelt');
  // Die sechs des Regelwerks und die zwölf aus Supplement 4 (2026-11-24c).
  await expect(dialog.getByRole('group', { name: 'Laufbahn' }).getByRole('button')).toHaveCount(18);

  // Orakel und Karte gehen mitten in der Erschaffung; die Antwort steht auch im Log.
  await dialog.getByRole('button', { name: 'Karte', exact: true }).click();
  const asked = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await asked.locator('.sheet-foot .count').click();
  await asked.getByPlaceholder(/Frage an die Karte/).fill('Ist die Musterung gerecht?');
  await asked.getByRole('button', { name: /^Mittel, 50 %/ }).click();
  await asked.getByRole('button', { name: /in den Log übernehmen/ }).click();
  await expect(dialog.locator('.generation-oracle-answer')).toContainText(/(JA|NEIN)[!?]?/);
  await expect(dialog.locator('.generation-oracle-answer')).toContainText('Ist die Musterung gerecht?');
  // Deuten gilt dem neuesten Ergebnis, Notiz steht für sich; beides auch im Log.
  await dialog.getByRole('button', { name: 'Deuten' }).click();
  const reading = page.getByRole('dialog', { name: 'Deutung' });
  await expect(reading).toContainText(/zu (JA|NEIN)/);
  await reading.getByPlaceholder(/Was bedeutet das/).fill('Der Werber lächelt zu breit.');
  await reading.getByRole('button', { name: 'Deuten' }).click();
  await expect(dialog.locator('.generation-note')).toContainText('Deutung');
  await expect(dialog.locator('.generation-note')).toContainText('Der Werber lächelt zu breit.');
  await dialog.getByRole('button', { name: 'Notiz' }).click();
  const note = page.getByRole('dialog', { name: 'Notiz' });
  await note.getByPlaceholder(/Was passiert/).fill('Drei Wochen Wartezeit im Rekrutierungsbüro.');
  await note.getByRole('button', { name: 'Notieren' }).click();
  await expect(dialog.locator('.generation-note')).toContainText('Notiz');
  await dialog.getByRole('button', { name: 'Karte', exact: true }).click();
  const card = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await expect(card).toBeVisible();
  await card.getByRole('button', { name: 'Karte verwerfen' }).click();
  await expect(card).toBeHidden();

  // „Später weiter“ behält die Erschaffung.
  await dialog.getByRole('button', { name: 'Später weiter' }).click();
  await page.getByRole('button', { name: 'Erschaffung fortsetzen' }).click();
  await expect(prompt).toHaveText('Laufbahn wählen; dann wird die Musterung gewürfelt');

  await dialog.getByRole('button', { name: /^Other/ }).click();
  // Von hier an: immer der erste mögliche Knopf, bis der Charakter fertig oder tot ist; bei der Welt
  // eines Terms ist das „Wie zuletzt“.
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

  // Der neue Charakter steht oben im Orakel-Screen; die Details stehen im Charakter-Screen.
  await expect(characters(page).getByRole('region', { name: 'Spielercharaktere' }).getByRole('article', { name: 'Mara Quell' })).toBeVisible();
  await page.getByRole('navigation').getByRole('button', { name: 'Charaktere' }).click();
  const mara = host(page).getByRole('article', { name: 'Mara Quell' });
  // Bei einer 2 misslingt auch die Musterung für Other; dann wird man eingezogen.
  await expect(mara).toContainText(/Ex-\w+ · (.+ · )?\d+ Terms? · \d+ Jahre/);
  await mara.getByRole('button', { name: /Mara Quell/ }).click();
  await mara.getByText('Lebenslauf').click();
  await expect(mara.getByRole('region', { name: 'Lebenslauf' })).toContainText('Musterung Other');
  await expect(mara.getByRole('region', { name: 'Lebenslauf' })).toContainText('Term 1 · Regina');
  await expect(mara).toContainText('Heimatwelt');
});

test('Besitz: Gegenstand aus der Liste mit Anzahl; was der SC nicht ausrüstet, kommt ins Gepäck', async ({ page }) => {
  await openCharacters(page);
  const kira = host(page).getByRole('article', { name: 'Kira Vant' });
  await kira.getByRole('button', { name: 'Bearbeiten' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Gegenstand hinzufügen').selectOption({ label: 'Low Passage' });
  await editor.getByLabel('Anzahl Low Passage').fill('2');
  await editor.getByRole('button', { name: 'Speichern' }).click();
  await kira.getByRole('button', { name: /Kira Vant/ }).click();
  // Am SC bleibt, was er ausgerüstet hat (die Stellen in seiner Kachel); die Passagen kommen zum
  // Vacc Suit ins Gruppengepäck.
  const slots = kira.getByRole('group', { name: 'Ausrüstung von Kira Vant' });
  await expect(slots.getByLabel(/Primär/)).toContainText('Automatic Pistol');
  await expect(slots.getByLabel(/Rüstung/)).toContainText('Jack');
  const pack = page.getByRole('list', { name: 'Gepäck' });
  await expect(pack).toContainText('2 × Low Passage');
  await expect(pack).toContainText('Vacc Suit (TL 12)');
});

/** Drückt lange auf einen Knopf, bis er sich gefüllt hat. */
async function hold(page: Page, button: ReturnType<Page['getByRole']>) {
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(button).toHaveClass(/holding/);
  await page.waitForTimeout(1100);
  await page.mouse.up();
}

test('Lange drücken lässt die ganze Erschaffung durchlaufen, mit zufälligen Entscheidungen', async ({ page }) => {
  await campaignWithWorld(page);
  await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
  await hold(page, dialog.getByRole('button', { name: /STR würfeln/ }));
  await expect(dialog.locator('.generation-prompt')).toHaveText(/^(Fertig:|Gestorben)/);
  await expect(dialog.getByRole('article', { name: 'Neuer Charakter' })).toContainText('von Regina');
  // Kurz tippen nach dem Durchlauf ist wieder ein gewöhnliches Tippen: Kein Popup steht offen.
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test.describe('mit Animation', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('der gewürfelte Wert erscheint oben erst, wenn er unten feststeht', async ({ page }) => {
    await openCharacters(page);
    await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
    const str = dialog.locator('.upp-cell').first().locator('.upp-code');
    await dialog.getByRole('button', { name: 'STR würfeln' }).click();
    // Während des Wurfs: oben noch kein Wert, unten noch der alte Schritt, der nicht noch einmal würfelt.
    await expect(str).toHaveText('–');
    await expect(dialog.getByRole('button', { name: 'STR würfeln' })).toHaveAttribute('aria-disabled', 'true');
    await expect(str).toHaveText(/^[2-9A-C]$/);
    await expect(dialog.getByRole('button', { name: 'DEX würfeln' })).toBeEnabled();
  });

  test('noch einmal auf den Würfelknopf tippen überspringt die Animation', async ({ page }) => {
    await openCharacters(page);
    await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
    const str = dialog.locator('.upp-cell').first().locator('.upp-code');
    const button = dialog.getByRole('button', { name: 'STR würfeln' });
    await button.click();
    // Wie ein Mensch: sofort noch einmal tippen, ohne zu warten, bis der Knopf wieder bereit ist.
    await button.click({ force: true });
    // Sofort das Ergebnis, ohne zu warten, bis die Würfel liegen; gewürfelt wurde nur einmal.
    await expect(str).toHaveText(/^[2-9A-C]$/, { timeout: 400 });
    await expect(dialog.getByRole('button', { name: 'DEX würfeln' })).toBeEnabled({ timeout: 800 });
    await expect(dialog.locator('.career li')).toHaveCount(1);
  });

  test('Würfe mit Zielwert laufen groß als Popup; Tippen springt zum Urteil, noch ein Tippen schließt', async ({ page }) => {
    await campaignWithWorld(page);
    await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
    for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) {
      await dialog.getByRole('button', { name: `${c} würfeln` }).click();
      // Irgendwo tippen beendet die Animation sofort.
      await page.mouse.click(200, 150);
      await expect(dialog.getByRole('button', { name: /würfeln|^Regina/ }).first()).toBeEnabled();
    }
    // Die Heimatwelt aus der Liste: eine fertige Welt antippen.
    await dialog.getByRole('button', { name: /^Regina/ }).click();
    await dialog.getByRole('button', { name: /^Other/ }).click();
    const popup = page.getByRole('alertdialog');
    await expect(popup).toContainText('Musterung Other');
    await expect(popup).toContainText('Zielwert');
    await expect(dialog.locator('.generation-prompt')).toContainText('Laufbahn wählen');
    await popup.click();
    await expect(popup.getByRole('heading')).toHaveText(/ERFOLG|FEHLSCHLAG/);
    await popup.click();
    await expect(popup).toBeHidden();
    await expect(dialog.locator('.generation-prompt')).not.toContainText('Laufbahn wählen');
  });
});

test('Laufbahnen aus Supplement 4: Pirate und Bureaucrat in der Wahl, der Bürokrat braucht den gelungenen Wurf (2026-11-24a)', async ({ page }) => {
  // Fest gewürfelt (2026-11-26): Der Bürokrat überlebt den ersten Term jedes Mal.
  await wuerfelgleich(page);
  await campaignWithWorld(page);
  await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
  const prompt = dialog.locator('.generation-prompt');
  const popup = page.getByRole('alertdialog');
  for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) await dialog.getByRole('button', { name: `${c} würfeln` }).click();
  await dialog.getByRole('button', { name: /^Regina/ }).click();

  const services = dialog.getByRole('group', { name: 'Laufbahn' }).getByRole('button');
  await expect(services).toHaveCount(18);
  for (const [i, name] of [[6, 'Pirate'], [7, 'Bureaucrat'], [8, 'Belter'], [9, 'Sailor'], [10, 'Diplomat'], [11, 'Doctor'], [12, 'Flyer'], [13, 'Barbarian'], [14, 'Rogue'], [15, 'Noble'], [16, 'Scientist'], [17, 'Hunter']] as const) {
    await expect(services.nth(i)).toContainText(name);
  }
  // Der Adlige will Stand 10+: gesperrt ist er nur, wenn der gewürfelte Stand darunter bleibt.
  const socText = await dialog.locator('.upp-cell', { hasText: 'SOC' }).locator('.upp-code').innerText();
  const soc = parseInt(socText, 16);
  const noble = services.nth(15);
  await expect(noble).toContainText('SOC 10+');
  if (soc < 10) await expect(noble).toBeDisabled();
  else await expect(noble).toBeEnabled();

  /** Das Ergebnis des letzten Wurfs wegklicken, sonst der nächste mögliche Knopf. */
  async function weiter() {
    if (await popup.isVisible()) {
      await popup.click();
      if (await popup.isVisible()) await popup.click();
      return;
    }
    await dialog.locator('.generation-dock button:not([disabled])').first().click();
  }

  // Bewerben, bis es klappt: abgelehnt heißt hier „weiterbewerben“, die Einberufung gibt es nicht.
  for (let i = 0; i < 20; i++) {
    await services.nth(7).click();
    for (let k = 0; k < 4 && (await popup.isVisible()); k++) await popup.click();
    if (!(await prompt.innerText()).startsWith('Laufbahn wählen')) break;
    await expect(prompt).toHaveText('Laufbahn wählen; dann wird die Musterung gewürfelt');
  }

  // Bis zur ersten Weiterverpflichtung: immer der nächste Schritt. Der Rangwurf heißt hier
  // „Gehobener Dienst“, nicht „Offizierspatent“ (2026-11-24b).
  let rangwurf = '';
  for (let i = 0; i < 60; i++) {
    const text = await prompt.innerText();
    if (text.startsWith('Ende von Term 1')) break;
    expect(text, 'Mit diesen Würfeln überlebt der Bürokrat den ersten Term').not.toMatch(/^Gestorben/);
    if (text.includes('Gehobener Dienst')) rangwurf = text;
    await weiter();
  }
  expect(rangwurf).toContain('Gehobener Dienst');
  await expect(prompt).toContainText('Weg lässt dich hier nur der gelungene Wurf');
  await expect(dialog.getByRole('group', { name: 'Weiterverpflichtung' }).getByRole('button', { name: /Abmustern/ })).toContainText('nur der gelungene Wurf lässt dich weg');
});

test('Automatik der Musterung: der Flyer wählt sein Luftfahrzeug, ehe der Term beginnt (2026-11-24c)', async ({ page }) => {
  await campaignWithWorld(page);
  await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
  const prompt = dialog.locator('.generation-prompt');
  for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) await dialog.getByRole('button', { name: `${c} würfeln` }).click();
  await dialog.getByRole('button', { name: /^Regina/ }).click();

  // Flyer: die Automatik Air Craft-1 fragt sofort nach dem Luftfahrzeug. Die Musterung ist
  // gewürfelt; abgelehnt heißt weiterbewerben, also so oft, bis der Flyer ihn nimmt.
  const popup = page.getByRole('alertdialog');
  const rejected = dialog.getByText(/abgelehnt/);
  for (let i = 0; i < 20; i++) {
    if (await popup.isVisible()) await popup.click();
    const before = await rejected.count();
    await dialog.getByRole('group', { name: 'Laufbahn' }).getByRole('button').nth(12).click();
    await expect.poll(async () => (await prompt.innerText()).includes('Air Craft') || (await rejected.count()) > before).toBe(true);
    if ((await prompt.innerText()).includes('Air Craft')) break;
  }
  if (await popup.isVisible()) await popup.click();
  await expect(prompt).toContainText('Air Craft: Fertigkeit wählen');
  const craft = dialog.getByRole('group', { name: 'Air Craft' });
  await expect(craft.getByRole('button')).toHaveCount(3);
  await craft.getByRole('button', { name: /Helicopter/ }).click();
  // Erst die Wahl, dann der Term: die Welt des ersten Terms.
  await expect(prompt).toContainText('Auf welcher Welt');
  await dialog.getByRole('group', { name: 'Welt des Terms' }).getByRole('button', { name: /Wie zuletzt/ }).click();
  await expect(prompt).toContainText('Überleben');
});

test('Rangstufen des Barbars: Warrior auf Stufe 2 mit Blade Combat, dann Beförderung (2026-11-24c)', async ({ page }) => {
  // Fest gewürfelt (2026-11-26): Der Barbar erreicht jedes Mal die Position Warrior.
  await wuerfelgleich(page);
  await campaignWithWorld(page);
  await host(page).getByRole('button', { name: '+ Nach Regeln erschaffen' }).click();
  const dialog = page.getByRole('dialog', { name: 'Charaktererschaffung' });
  const prompt = dialog.locator('.generation-prompt');
  const popup = page.getByRole('alertdialog');
  const all = page.locator('body');
  for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) await dialog.getByRole('button', { name: `${c} würfeln` }).click();
  await dialog.getByRole('button', { name: /^Regina/ }).click();
  await dialog.getByRole('group', { name: 'Laufbahn' }).getByRole('button').nth(13).click();

  /** Das Ergebnis des letzten Wurfs wegklicken, sonst der nächste mögliche Knopf. */
  async function weiter() {
    if (await popup.isVisible()) {
      await popup.click();
      if (await popup.isVisible()) await popup.click();
      return;
    }
    // Abgelehnt heißt weiterbewerben: die Laufbahnwahl steht im Hauptfeld, nicht im Dock.
    const services = dialog.getByRole('group', { name: 'Laufbahn' });
    if (await services.isVisible().catch(() => false)) {
      await services.getByRole('button').nth(13).click();
      return;
    }
    // Weiterdienen, nicht abmustern: auch der Barbar darf gehen (2026-11-24e), soll hier aber bleiben.
    const stay = dialog.getByRole('button', { name: 'Weiterverpflichten' });
    if (await stay.isVisible().catch(() => false)) {
      await stay.click();
      return;
    }
    await dialog.locator('.generation-dock button:not([disabled])').first().click();
  }

  const seen: string[] = [];
  let warrior = false;
  let mustered = false;
  // Der Barbar würfelt frei: bis zu vier Läufe, bis einer eine Position erreicht. Neu beginnen gibt
  // es nur nach dem Tod; endet der Dienst mit der Abmusterung, ist Schluss.
  for (let attempt = 0; attempt < 4 && !warrior && !mustered; attempt++) {
    if (attempt > 0) {
      await dialog.getByRole('group', { name: 'Nach dem Tod' }).getByRole('button', { name: /Neu beginnen/ }).click();
      for (const c of ['STR', 'DEX', 'END', 'INT', 'EDU', 'SOC']) await dialog.getByRole('button', { name: `${c} würfeln` }).click();
      await dialog.getByRole('button', { name: /^Regina/ }).click();
      await dialog.getByRole('group', { name: 'Laufbahn' }).getByRole('button').nth(13).click();
    }
    for (let i = 0; i < 80; i++) {
      const text = await all.innerText();
      seen.push(text);
      if (text.includes('Warrior')) {
        warrior = true;
        break;
      }
      if (/Gestorben/.test(text)) break;
      if (/Übernehmen/.test(text)) {
        mustered = true;
        break;
      }
      await weiter();
    }
  }
  // Die Rangtafel des Barbars kennt nur Warrior und Chief; kein Rang einer anderen Laufbahn taucht auf.
  expect(seen.filter((t) => /Ensign|Clerk|Henchman|Lieutenant|Captain|Pilot ·/.test(t))).toEqual([]);
  expect(warrior, 'Mit diesen Würfeln erreicht der Barbar die Position Warrior').toBe(true);
  // Die Gabe des Warrior ist eine Gruppe: Blade Combat-1 fragt nach der Klinge.
  const blade = dialog.getByRole('group', { name: 'Blade Combat' });
  await expect(blade.getByRole('button').first()).toBeVisible();
  await blade.getByRole('button', { name: /Broadsword/ }).click();
  await expect(prompt).toContainText('Beförderung');
});

test('Inspirationskarte: Tippen, solange sie hereinkommt, zeigt sie sofort ganz und wählt nichts aus', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByRole('button', { name: /Karte ziehen/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Inspirationskarte' });
  await sheet.locator('.tile').first().click({ force: true });
  await expect(sheet).toContainText('Nichts ausgewählt');
  await expect(page.locator('.overlay.skip-animation')).toHaveCount(1);
});
