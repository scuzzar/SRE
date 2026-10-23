import type { Random } from '../model';

/** Zufall aus `crypto.getRandomValues`, gleichverteilt (Verwerfungsmethode statt Modulo). */
export const cryptoRandom: Random = {
  int(min, max) {
    const range = max - min + 1;
    if (!Number.isInteger(min) || !Number.isInteger(max) || range < 1) throw new RangeError(`Ungültiger Bereich ${min}–${max}`);
    const limit = Math.floor(0x1_0000_0000 / range) * range;
    const buffer = new Uint32Array(1);
    for (;;) {
      crypto.getRandomValues(buffer);
      const value = buffer[0]!;
      if (value < limit) return min + (value % range);
    }
  },
};
