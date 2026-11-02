import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameController } from './controller';
import { systemClock } from './platform/clock';
import { browserDownload } from './platform/download';
import { cryptoRandom } from './platform/random';
import { openRepository, requestDurable } from './platform/repository';
import { App } from './view/App';
import { GameProvider } from './view/game-context';
import './view/styles.css';

// Verdrahtung: Die Umsetzungen aus platform/ gehen in den Controller, der Controller in die View.
const { repository, persistent } = await openRepository();
// Ob der Browser den Speicher dauerhaft hält, kommt später; Firefox fragt dafür erst den Spieler.
const durable = persistent ? requestDurable() : Promise.resolve(undefined);
const game = new GameController({ repository, random: cryptoRandom, clock: systemClock, download: browserDownload, persistent, durable });
await game.init();

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
