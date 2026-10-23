import { createContext, useContext, useSyncExternalStore } from 'react';
import type { GameController, Snapshot } from '../controller';

const GameContext = createContext<GameController | null>(null);

export const GameProvider = GameContext.Provider;

/** Der Controller: Jede Eingabe geht an genau eine seiner Methoden. */
export function useGame(): GameController {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame braucht einen GameProvider.');
  return game;
}

/** Der Snapshot des Controllers; die View zeichnet neu, wenn er sich ändert. */
export function useSnapshot(): Snapshot {
  const game = useGame();
  return useSyncExternalStore(game.subscribe, game.snapshot);
}
