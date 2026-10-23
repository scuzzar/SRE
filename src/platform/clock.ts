import type { Clock } from '../model';

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};
