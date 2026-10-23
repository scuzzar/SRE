import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GameController } from './controller';
import { systemClock } from './platform/clock';
import { cryptoRandom } from './platform/random';
import { openRepository } from './platform/repository';
import { App } from './view/App';
import { GameProvider } from './view/game-context';
import './view/styles.css';

// Verdrahtung: Die Umsetzungen aus platform/ gehen in den Controller, der Controller in die View.
const { repository, persistent } = await openRepository();
const game = new GameController({ repository, random: cryptoRandom, clock: systemClock, persistent });
await game.init();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider value={game}>
      <App />
    </GameProvider>
  </StrictMode>,
);
