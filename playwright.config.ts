import { defineConfig, devices } from '@playwright/test';

/**
 * Auf den GitHub-Runnern läuft die Suite auf zwei Worker-Kernen und lädt die App als ein Bundle:
 * die 30 s Standard-Timeout pro Test und die 5 s einer Erwartung reichen dort nicht – die Läufe
 * fallen mit verschiedenen Tests um (`Test timeout of 30000ms exceeded`, leere Felder, "session
 * closed" beim Abriss). Lokal ist dieselbe Suite grün. Darum auf dem Runner das Drei- bis
 * Vierfache an Zeit; lokal bleibt alles knapp, damit langsame Stellen auffallen.
 */
const ci = process.env.CI !== undefined;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  timeout: ci ? 120_000 : 30_000,
  expect: { timeout: ci ? 20_000 : 5_000 },
  forbidOnly: !!process.env.CI,
  retries: ci ? 1 : 0,
  reporter: ci ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobil',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      // Der Desktop-Modus der App: ab 1024 px Breite links die Seitenspalte, rechts die Grundkarte.
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: ci ? 300_000 : 120_000,
  },
});
