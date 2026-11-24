import { defineConfig, devices } from '@playwright/test';

/**
 * Die Suite läuft nach jeder Änderung lokal. `CI` ist gesetzt, wo sie trotzdem irgendwo
 * automatisch läuft – auf einem Runner oder mit `CI=1 npx playwright test`, was hier ein
 * stehengebliebenes Vorschaufenster umgeht. Dort gilt pro Test das Vierfache und je Erwartung
 * das Vierfache, weil zwei Worker auf zwei Kernen die App als ein Bundle laden; lokal bleibt
 * alles knapp, damit langsame Stellen auffallen. Dazu auf dem Runner Chromium ohne
 * geteilten Speicher: `/dev/shm` ist dort 64 MB klein, und die App sprengt das, der Renderer
 * stirbt mitten im Test („session closed“).
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
    // Nur dort, wo die Suite automatisch läuft: `/dev/shm` ist auf Runern 64 MB klein, die App
    // als ein Bundle sprengt das und der Renderer stirbt mitten im Test („session closed“).
    // Ohne geteilten Speicher weicht Chromium auf die Festplatte aus; lokal ist das nicht nötig.
    launchOptions: { args: ci ? ['--disable-dev-shm-usage'] : [] },
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
