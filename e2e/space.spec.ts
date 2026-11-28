import { expect, test } from '@playwright/test';
import { expandTray, schwererLauf, openHomeGlobe, openPeople, openTab, wuerfelgleich } from './layout';

// Jeder Test lädt die App selbst (2026-11-26): Der letzte von ihnen würfelt fest und muss die
// Zahlenfolge setzen, bevor die App zum ersten Mal lädt.

// Die Raumkarte rechnet und zeichnet viel (Schubringe, Bahnen, Salven); zwei Tester nebeneinander
// brauchen schon mal das Doppelte der Zeit, darum hier mehr Luft als die 30 Sekunden Grundzeit.
schwererLauf(90_000);

test('Systemflug: Raumkarte öffnen, Schub im Schubkreis setzen, bewegen, beenden', async ({ page }) => {
  await page.goto('/');
  // Die Demo-Kampagne hat eine Yacht im Hafen von Kessra (2026-11-21b; vorher ein Scout).
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toBeVisible();
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(card).toContainText('Kestrel · Yacht · 1 G');
  await expect(card).toContainText('kein Schub');

  // Zieleingabe (2026-11-22): Ein Tipp in den Zielkreis um den Punkt „ohne Schub“ setzt das Ziel; halb zum Rand ist der halbe Schub.
  const canvas = page.locator('canvas.globe-canvas');
  await expect(canvas).toHaveAttribute('data-coast', /\d/);
  const box = (await canvas.boundingBox())!;
  const [cx, cy, r] = (await canvas.getAttribute('data-coast'))!.split(',').map(Number) as [number, number, number];
  await page.mouse.click(box.x + cx + Math.max(r / 2, 18), box.y + cy);
  await expect(card).toContainText(/\d,\d G/);
  await expect(card).not.toContainText('kein Schub');

  await page.getByRole('button', { name: 'Bewegen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  await expect(card).toContainText('kein Schub');

  await card.getByRole('button', { name: 'Systemflug beenden' }).click();
  await expect(page.getByRole('button', { name: 'Systemflug beginnen' })).toBeVisible();
  await page.getByRole('button', { name: 'Raumkarte schließen' }).first().click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toHaveCount(0);
});

test('Beiboot im Systemflug aussetzen und mit „Andocken“ wieder an Bord (2026-11-21b, der Andockflug 2026-11-23c)', async ({ page }) => {
  await page.goto('/');
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  const boot = (name: string | RegExp) => page.getByRole('button', { name });
  await card.getByRole('button', { name: 'Beiboot 1 aussetzen' }).click();
  await expect(card).toContainText("Beiboot 1 · Ship's Boat · 6 G");
  await expect(card).toContainText('Die Gruppe ist an Bord von Beiboot 1');
  // Am Platz des Launch-Knopfs sitzt jetzt „Andocken“: nah, freier Liegeplatz – es dockt sofort an.
  await expect(boot(/^Andocken/)).toBeEnabled();
  await expect(boot(/^Andocken/)).toHaveAttribute('title', /Beiboot 1 an Kestrel andocken/);
  await boot(/^Andocken/).click();
  await expect(card).toContainText('Kestrel · Yacht · 1 G');
  await expect(boot('Launch (1)')).toBeEnabled();

  // Zurückgeblieben: „Andocken“ bleibt frei, setzt aber den Andockflug und dockt erst mit der
  // nächsten Bewegung an – genug Schub vorausgesetzt (der Schubring hier: 6 G = 30.000 km).
  const canvas = page.locator('canvas.globe-canvas');
  const box = (await canvas.boundingBox())!;
  const [cx, cy, r] = (await canvas.getAttribute('data-coast'))!.split(',').map(Number) as [number, number, number];
  await boot('Launch (1)').click();
  await page.mouse.click(box.x + cx + Math.max(r / 2, 18), box.y + cy);
  await boot('Bewegen').click();
  await page.waitForTimeout(2200);
  await expect(boot(/^Andocken/)).toHaveAttribute('title', /G bis Kestrel, Beiboot 1 hat 6 G/);
  await boot(/^Andocken/).click();
  await expect(boot(/^Andocken ✓/)).toBeEnabled();
  await expect(card).toContainText('Andockflug');
  await boot('Bewegen').click();
  await page.waitForTimeout(2200);
  await expect(card).toContainText('Kestrel · Yacht · 1 G');
  await expect(boot('Launch (1)')).toBeEnabled();

  // Weit draußen reicht der Schub nicht: der Knopf sperrt und sagt, wie viel G fehlten.
  for (let i = 0; i < 3; i++) {
    await boot('Launch (1)').click();
    await page.mouse.click(box.x + cx + Math.min(box.width / 2 - 6, r * 0.9), box.y + cy);
    await boot('Bewegen').click();
    await page.waitForTimeout(2200);
    if (await boot(/^Andocken/).isDisabled()) break;
    await boot(/^Andocken/).click();
    await boot('Bewegen').click();
    await page.waitForTimeout(2200);
  }
  await expect(boot(/^Andocken/)).toBeDisabled();
  await expect(boot(/^Andocken/)).toHaveAttribute('title', /Zu weit weg/);
});

test('Systemflug aus dem Bereich Schiff: „Starten“ öffnet die Raumkarte, die Bedienung steht im Bereich Schiff (Owner, 21. November 2026)', async ({ page }) => {
  await page.goto('/');
  await openHomeGlobe(page);
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Starten', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toBeVisible();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(page.getByRole('navigation', { name: 'Bereiche' }).getByRole('button', { name: 'Schiff' })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Bewegen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  // Raumkarte zu: Der Flug läuft weiter, „Zum Flug“ holt ihn zurück.
  await page.getByRole('button', { name: 'Raumkarte schließen' }).first().click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kessra' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Zum Flug' }).click();
  await expect(card).toContainText('Raumrunde 2');
});

test('Raumkarte am Gasriesen: Kessra ist Mond eines Gasriesen; seine Raumkarte hat eigene Monde (2026-11-18d)', async ({ page }) => {
  await page.goto('/');
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  const choices = page.getByRole('group', { name: 'Raumkarte von' });
  await expect(choices.getByRole('button', { name: 'Kessra' })).toHaveAttribute('aria-pressed', 'true');
  await choices.getByRole('button', { name: 'Kleiner Gasriese' }).click();
  await expect(page.getByRole('region', { name: 'Raumkarte · Kleiner Gasriese' })).toBeVisible();
  await expect(page.getByText('Das Schiff startet auf einer Kreisbahn mit doppeltem Radius um Kleiner Gasriese.')).toBeVisible();
  // Der Systemflug darf am Gasriesen von der Welt der Gruppe aus beginnen.
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await expect(card).toContainText('Raumrunde 1');
  await expect(card).toContainText('Kleiner Gasriese');
  await page.getByRole('button', { name: 'Bewegen' }).click();
  await expect(card).toContainText('Raumrunde 2');
  await card.getByRole('button', { name: 'Systemflug beenden' }).click();
  await expect(page.getByRole('group', { name: 'Raumkarte von' })).toBeVisible();
});

test('Werft und Raumkampf: der Beam Laser der Demo-Yacht, ein fremdes Schiff von Hand, Feuer auf es (2026-11-21g/h)', async ({ page }) => {
  // Fest gewürfelt (2026-11-26): Der Schuss trifft immer gleich. Fiel das fremde Schiff mit echten
  // Würfeln schon nach dieser Salve aus, war danach „Kein Ziel“ übrig und der Hinweis „schon
  // gefeuert“ fehlte. Mit diesem Anfang überlebt das fremde Schiff die Salve.
  await wuerfelgleich(page);
  await page.goto('/');
  await openHomeGlobe(page);
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Werft', exact: true }).click();
  const yard = page.getByRole('region', { name: 'Werft' });
  await expect(yard).toContainText('Bewaffnung von Kestrel');
  // Die Demo bringt einen Beam Laser mit; ausbauen fragt erst nach.
  await expect(yard).toContainText('Beam Laser ✕');
  await yard.getByRole('button', { name: 'Beam Laser ✕' }).click();
  await expect(yard.getByRole('button', { name: /ausbauen\? \(kein Erlös\)/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Starten', exact: true }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await card.getByRole('button', { name: 'Von Hand …' }).click();
  await card.getByRole('combobox', { name: 'Entwurf des fremden Schiffs' }).selectOption('A');
  await card.getByRole('combobox', { name: 'Absicht' }).selectOption('ignore');
  await card.getByRole('button', { name: 'Auftauchen lassen' }).click();
  await expect(card).toContainText('F1 Free Trader');
  // 2026-11-23: Erst die Schubphase mit „Bewegen“, dann die Feuerphase mit den Hardpoints.
  const chip = page.getByRole('group', { name: 'Hardpoints' }).getByRole('button', { name: /Beam Laser/ });
  await expect(chip).toBeDisabled();
  await page.getByRole('button', { name: 'Bewegen' }).click();
  await expect(card).toContainText('· Feuer');
  await expect(chip).toBeEnabled();
  // Ein Tipp feuert sofort, die Würfe rollen im Vordergrund (2026-11-21i).
  await chip.click();
  const volley = page.locator('.space-volley');
  await expect(volley).toBeVisible();
  await expect(volley).toContainText('Beam Laser');
  while (await volley.isVisible()) await volley.click();
  await expect(card).toContainText('Raumrunde 1');
  // Jeder Hardpoint feuert einmal je Raumrunde.
  await expect(chip).toBeDisabled();
  await expect(chip).toHaveAttribute('title', /schon gefeuert/);
  // „End Turn“: die fremden Schiffe feuern, dann rückt die Raumrunde weiter.
  await page.getByRole('button', { name: 'End Turn' }).click();
  while (await volley.isVisible().catch(() => false)) await volley.click();
  await expect(card).toContainText('Raumrunde 2');
});

test('Werft: Bewaffnung sagt, wenn die Kasse nicht reicht, und baut mit Geld ein (2026-11-28)', async ({ page }) => {
  await page.goto('/');
  await openHomeGlobe(page);
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Werft', exact: true }).click();
  const yard = page.getByRole('region', { name: 'Werft' });
  // Die Demo hat Cr 5.000; der billigste Turret kostet Cr 200.000.
  await expect(yard).toContainText('In der Kasse: Cr 5.000. Für Turrets und Waffen reicht das nicht; das Billigste kostet Cr 200.000.');
  const weapon = yard.getByRole('combobox', { name: 'Waffe in Turret 1 einbauen' });
  await expect(weapon.locator('option', { hasText: 'Pulse Laser · MCr 0,50 · Kasse zu klein' })).toBeDisabled();
  await page.keyboard.press('Escape');

  await openPeople(page, 'Kasse');
  await page.getByRole('spinbutton').first().fill('1000000');
  await page.getByRole('button', { name: 'Einnahme buchen' }).click();
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Werft', exact: true }).click();
  await expect(yard).toContainText('In der Kasse: Cr 1.005.000. Ausgegraut ist, was die Kasse nicht hergibt.');
  await yard.getByRole('combobox', { name: 'Waffe in Turret 1 einbauen' }).selectOption('pulse-laser');
  await expect(yard.getByRole('button', { name: 'Pulse Laser ✕' })).toBeVisible();
  await expect(yard).toContainText('Double Turret (2/2)');
  await expect(yard).toContainText('In der Kasse: Cr 505.000.');
});

test('Schadenskontrolle: der Engineer flickt im Raumkampf einen Treffer, einmal je Raumrunde (2026-11-22d)', async ({ page }) => {
  await wuerfelgleich(page, 20261127);
  await page.goto('/');
  await openHomeGlobe(page);
  // Jonas Reyl wird Engineer (er bleibt Gunner; zwei Posten zählen je einen Punkt weniger).
  await openTab(page, 'Schiff');
  await expandTray(page);
  await page.getByRole('tablist', { name: 'Ansichten des Schiffs' }).getByRole('tab', { name: 'Crew', exact: true }).click();
  await page.getByRole('tabpanel', { name: 'Crew' }).getByRole('button', { name: /Engineer/ }).click();
  await page.getByRole('region', { name: 'Engineer besetzen' }).getByRole('button', { name: /Jonas Reyl/ }).click();
  await expect(page.getByRole('tabpanel', { name: 'Crew' }).getByRole('group', { name: 'Engineer' })).toContainText('Jonas Reyl');
  // Im Desktop-Modus bleibt der Bereich offen; ein zweiter Tipp auf „Schiff“ würde ihn schließen.
  const start = page.getByRole('button', { name: 'Starten', exact: true });
  if (!(await start.isVisible())) await openTab(page, 'Schiff');
  await start.click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await card.getByRole('button', { name: 'Von Hand …' }).click();
  await card.getByRole('combobox', { name: 'Entwurf des fremden Schiffs' }).selectOption('J');
  await card.getByRole('combobox', { name: 'Absicht' }).selectOption('attack');
  await card.getByRole('button', { name: 'Auftauchen lassen' }).click();
  const volley = page.locator('.space-volley');
  const repair = page.getByRole('group', { name: /^Schadenskontrolle / });
  // Raumrunden, bis das fremde Schiff die Yacht getroffen hat.
  for (let round = 0; round < 12 && !(await repair.isVisible()); round++) {
    await page.getByRole('button', { name: 'Bewegen' }).click();
    await expect(card).toContainText('· Feuer');
    if (await repair.isVisible()) break;
    await page.getByRole('button', { name: 'End Turn' }).click();
    while (await volley.isVisible().catch(() => false)) await volley.click();
  }
  if (!(await card.getByText('· Feuer').isVisible())) {
    await page.getByRole('button', { name: 'Bewegen' }).click();
    await expect(card).toContainText('· Feuer');
  }
  const chip = repair.getByRole('button').first();
  await expect(chip).toBeEnabled();
  await chip.click();
  await expect(volley).toContainText('SCHADENSKONTROLLE');
  while (await volley.isVisible().catch(() => false)) await volley.click();
  // Einmal je Raumrunde; der Versuch steht im Log.
  if (await repair.isVisible()) await expect(repair.getByRole('button').first()).toHaveAttribute('title', /schon geflickt/);
});

test('Detailseite Schaden: nach dem Kampf Treffer auswählen und in der Werft reparieren lassen (2026-11-27d)', async ({ page }) => {
  await wuerfelgleich(page, 20261127);
  await page.goto('/');
  await openHomeGlobe(page);
  await openTab(page, 'Schiff');
  await page.getByRole('button', { name: 'Starten', exact: true }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await card.getByRole('button', { name: 'Von Hand …' }).click();
  await card.getByRole('combobox', { name: 'Entwurf des fremden Schiffs' }).selectOption('J');
  await card.getByRole('combobox', { name: 'Absicht' }).selectOption('attack');
  await card.getByRole('button', { name: 'Auftauchen lassen' }).click();
  const volley = page.locator('.space-volley');
  // Raumrunden, bis das fremde Schiff die Yacht getroffen hat.
  for (let round = 0; round < 12 && !(await card.getByText(/^Treffer: /).isVisible()); round++) {
    await page.getByRole('button', { name: 'Bewegen' }).click();
    await expect(card).toContainText('· Feuer');
    await page.getByRole('button', { name: 'End Turn' }).click();
    while (await volley.isVisible().catch(() => false)) await volley.click();
  }
  await card.getByRole('button', { name: 'Systemflug beenden' }).click();
  await page.getByRole('button', { name: 'Raumkarte schließen' }).first().click();
  const open = page.getByRole('button', { name: 'Schaden: Treffer ansehen und reparieren' });
  if (!(await open.isVisible())) await openTab(page, 'Schiff');
  await open.click();
  const sheet = page.getByRole('region', { name: 'Schaden' });
  await expect(sheet).toContainText('Treffer · auswählen, was repariert wird');
  // In der Werft von Kessra (Raumhafen A): auswählen, die Werft nennt den Preis; die Kasse der Demo reicht nicht.
  const hit = sheet.getByRole('group', { name: 'Treffer' }).getByRole('button').first();
  await hit.click();
  await expect(hit).toHaveAttribute('aria-pressed', 'true');
  const yard = page.getByRole('button', { name: /^Werft · .*MCr/ });
  await expect(yard).toContainText('MCr 0,10');
  await expect(yard).toBeDisabled();
  // Selbst reparieren braucht Engineering-1; Kira Vant hat es nicht.
  await expandTray(page);
  await sheet.getByRole('group', { name: 'Wer repariert' }).getByRole('button', { name: /Kira Vant/ }).click();
  const self = page.getByRole('button', { name: /^Selbst reparieren/ });
  await expect(self).toBeDisabled();
  await expect(self).toHaveAttribute('title', /Engineering-1/);
});
