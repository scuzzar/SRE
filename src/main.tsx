import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameController } from './controller';
import type { Cloud } from './model';
import { systemClock } from './platform/clock';
import { browserDownload } from './platform/download';
import { cryptoKeys } from './platform/keys';
import { oneDriveAuthority, oneDriveClientId, oneDriveRedirectUri } from './platform/onedrive-config';
import { probeCloud } from './platform/probe-cloud';
import { cryptoRandom } from './platform/random';
import { openRepository, rawCampaigns, requestDurable } from './platform/repository';
import { webWindowLock } from './platform/window-lock';
import { App } from './view/App';
import { GameProvider } from './view/game-context';
import { RenderGuard, StartError, type StartErrorActions } from './view/StartError';
import './view/styles.css';

// Verdrahtung: Die Umsetzungen aus platform/ gehen in den Controller, der Controller in die View.
// Mit `?probe-wolke` in der Adresse gleicht die App mit einer Probe-Wolke im Browser ab statt mit
// OneDrive; `&geraet=name` gibt ihr dazu einen eigenen Speicher, als wäre sie ein zweites Gerät.
const query = new URLSearchParams(location.search);
const probe = query.has('probe-wolke');
const device = probe ? query.get('geraet') : null;
// Jedes Gerät der Probe-Wolke hat seinen eigenen Speicher, also auch seine eigene Sperre.
const storeName = device ? `solo-rpg-engine-${device}` : 'solo-rpg-engine';
// Startet die App nicht, zeigt sie statt eines schwarzen Bildschirms die Meldung und bietet die rohen
// Spielstände zum Sichern an.
const root = createRoot(document.getElementById('root')!);
const actions: StartErrorActions = {
  saveRaw: () => {
    rawCampaigns(storeName)
      .then((text) => browserDownload.offer('spielstaende-roh.json', text, 'application/json'))
      .catch((error: unknown) => alert(`Sichern ging nicht: ${String(error)}`));
  },
};
try {
  const { repository, persistent } = await openRepository(storeName);

  /** OneDrive gibt es nur mit Client-ID und nur unter der registrierten Adresse (auch dort unter index.html). */
  async function openCloud(): Promise<Cloud | undefined> {
    if (probe) return probeCloud();
    if (!oneDriveClientId || !(location.origin + location.pathname).startsWith(oneDriveRedirectUri)) return undefined;
    try {
      // Erst hier laden: Ohne Client-ID braucht die App die Anmeldebibliothek nicht.
      const { openOneDrive } = await import('./platform/onedrive');
      return await openOneDrive(oneDriveClientId, oneDriveAuthority, oneDriveRedirectUri);
    } catch (error) {
      console.warn('OneDrive ließ sich nicht einrichten, die App läuft ohne Abgleich.', error);
      return undefined;
    }
  }
  const cloud = await openCloud();

  // Kurz nach einer Änderung abgleichen: erst, wenn eine Weile nichts mehr kam.
  let pending: ReturnType<typeof setTimeout> | undefined;
  const later = (run: () => void): void => {
    clearTimeout(pending);
    pending = setTimeout(run, probe ? 300 : 2000);
  };
  // Ob der Browser den Speicher dauerhaft hält, kommt später; Firefox fragt dafür erst den Spieler.
  const durable = persistent ? requestDurable() : Promise.resolve(undefined);
  // Nur ein Fenster der App schreibt; im Arbeitsspeicher teilt sich ohnehin keines etwas.
  const lock = persistent ? { lock: webWindowLock(storeName) } : {};
  const game = new GameController({ repository, random: cryptoRandom, clock: systemClock, download: browserDownload, keys: cryptoKeys, ...(cloud ? { cloud } : {}), later, persistent, durable, ...lock });
  await game.init();

  // Was nach einer Eingabe schiefgeht und niemand auffängt (auch Fehler in Klick-Handlern, die React
  // hierher meldet), zeigt der Controller als Hinweis, statt dass einfach nichts passiert. Ohne Fehler-
  // objekt (etwa Meldungen des ResizeObserver oder fremder Skripte) bleibt es still.
  window.addEventListener('error', (event) => {
    if (event.error instanceof Error) game.showError(event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof Error) game.showError(event.reason);
  });

  // Abgleichen, wenn die App wieder in den Vordergrund kommt oder das Netz zurück ist.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void game.sync();
  });
  window.addEventListener('online', () => void game.sync());

  root.render(
    <StrictMode>
      <RenderGuard actions={actions}>
        <GameProvider value={game}>
          <App />
        </GameProvider>
      </RenderGuard>
    </StrictMode>,
  );
} catch (error) {
  console.error(error);
  root.render(<StartError error={error} actions={actions} />);
}

// Offline: Der Service Worker legt die App ab, damit sie installiert auch ohne Netz startet.
// Nicht im Entwicklungsserver und nicht in der Einzeldatei (dist-single), die ohne Server läuft.
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
    console.warn('Service Worker nicht registriert, die App läuft ohne Offline-Ablage.', error);
  });
}
