import { expect, test } from '@playwright/test';
import { openHomeGlobe, openTab } from './layout';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

// Die Raumkarte rechnet und zeichnet viel (Schubringe, Bahnen, Salven); zwei Tester nebeneinander
// brauchen schon mal das Doppelte der Zeit, darum hier mehr Luft als die 30 Sekunden Grundzeit.
test.setTimeout(90_000);

test('Systemflug: Raumkarte öffnen, Schub im Schubkreis setzen, bewegen, beenden', async ({ page }) => {
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

test('Beiboot im Systemflug aussetzen und mit „Andocken“ wieder an Bord (2026-11-21b, der Knopf 2026-11-23)', async ({ page }) => {
  await openHomeGlobe(page);
  await page.getByRole('button', { name: 'Raumkarte' }).click();
  await page.getByRole('button', { name: 'Systemflug beginnen' }).click();
  const card = page.getByRole('region', { name: 'Systemflug' });
  await card.getByRole('button', { name: 'Beiboot 1 aussetzen' }).click();
  await expect(card).toContainText("Beiboot 1 · Ship's Boat · 6 G");
  await expect(card).toContainText('Die Gruppe ist an Bord von Beiboot 1');
  // Am Platz des Launch-Knopfs sitzt jetzt „Andocken“: nah, gleicher Kurs, freier Liegeplatz.
  const landen = page.getByRole('button', { name: 'Andocken', exact: true });
  await expect(landen).toBeEnabled();
  await expect(landen).toHaveAttribute('title', /Beiboot 1 an Kestrel andocken/);
  await landen.click();
  await expect(card).toContainText('Kestrel · Yacht · 1 G');
  await expect(page.getByRole('button', { name: 'Launch (1)' })).toBeEnabled();

  // Eigenen Schub gegeben, bleibt das Beiboot zurück: „Andocken“ ist gesperrt und sagt warum.
  await page.getByRole('button', { name: 'Launch (1)' }).click();
  const canvas = page.locator('canvas.globe-canvas');
  const box = (await canvas.boundingBox())!;
  const [cx, cy, r] = (await canvas.getAttribute('data-coast'))!.split(',').map(Number) as [number, number, number];
  await page.mouse.click(box.x + cx + Math.max(r / 2, 18), box.y + cy);
  await page.getByRole('button', { name: 'Bewegen' }).click();
  await expect(landen).toBeDisabled();
  await expect(landen).toHaveAttribute('title', /100 km|angleichen/);
});

test('Systemflug aus dem Reiter Schiff: „Starten“ öffnet die Raumkarte, die Bedienung steht im Reiter Schiff (Owner, 21. November 2026)', async ({ page }) => {
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
