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
import { openRepository, requestDurable } from './platform/repository';
import { App } from './view/App';
import { GameProvider } from './view/game-context';
import './view/styles.css';

// Verdrahtung: Die Umsetzungen aus platform/ gehen in den Controller, der Controller in die View.
// Mit `?probe-wolke` in der Adresse gleicht die App mit einer Probe-Wolke im Browser ab statt mit
// OneDrive; `&geraet=name` gibt ihr dazu einen eigenen Speicher, als wäre sie ein zweites Gerät.
const query = new URLSearchParams(location.search);
const probe = query.has('probe-wolke');
const device = probe ? query.get('geraet') : null;
const { repository, persistent } = await openRepository(device ? `solo-rpg-engine-${device}` : undefined);

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
const game = new GameController({ repository, random: cryptoRandom, clock: systemClock, download: browserDownload, keys: cryptoKeys, ...(cloud ? { cloud } : {}), later, persistent, durable });
await game.init();

// Abgleichen, wenn die App wieder in den Vordergrund kommt oder das Netz zurück ist.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void game.sync();
});
window.addEventListener('online', () => void game.sync());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider value={game}>
      <App />
    </GameProvider>
  </StrictMode>,
);

// Offline: Der Service Worker legt die App ab, damit sie installiert auch ohne Netz startet.
// Nicht im Entwicklungsserver und nicht in der Einzeldatei (dist-single), die ohne Server läuft.
if (import.meta.env.PROD && import.meta.env.MODE !== 'single' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((error: unknown) => {
    console.warn('Service Worker nicht registriert, die App läuft ohne Offline-Ablage.', error);
  });
}
