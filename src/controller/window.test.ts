import { describe, expect, it } from 'vitest';
import { DomainError, type WindowLock } from '../model';
import { countingKeys, fixedClock, fixedRandom, memoryDownload, memoryRepository } from '../model/testing';
import { GameController } from './game';

/** Die Sperre aller Fenster eines Geräts: Wer sie hält, schreibt; `take` nimmt sie dem Halter weg. */
function sharedLock(): () => WindowLock {
  let holder: (() => void) | undefined;
  return () => ({
    async acquire(lost) {
      if (holder) return false;
      holder = lost;
      return true;
    },
    async take(lost) {
      holder?.();
      holder = lost;
    },
  });
}

describe('Zwei Fenster', () => {
  it('nur ein Fenster speichert; das zweite übernimmt mit dem neuesten Stand, das erste hört dann auf', async () => {
    const repository = memoryRepository();
    const lock = sharedLock();
    const window = () => new GameController({ repository, random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys(), lock: lock() });
    const first = window();
    await first.init();
    expect(first.snapshot().elsewhere).toBe(false);

    const second = window();
    await second.init();
    expect(second.snapshot().elsewhere).toBe(true);
    // Das zweite Fenster speichert nichts, auch wenn dort jemand tippt.
    second.writeNote('Im zweiten Fenster.');
    await second.whenSaved();
    expect(repository.saved?.log).toEqual([]);

    // Im ersten wird weitergespielt, dann übernimmt das zweite: Es lädt den Stand des ersten.
    first.writeNote('Im ersten Fenster.');
    await first.whenSaved();
    await second.takeOver();
    expect(second.snapshot().elsewhere).toBe(false);
    expect(second.snapshot().log.map((e) => e.kind === 'note' && e.text)).toEqual(['Im ersten Fenster.']);
    expect(first.snapshot().elsewhere).toBe(true);

    first.writeNote('Zu spät.');
    second.writeNote('Jetzt hier.');
    await first.whenSaved();
    await second.whenSaved();
    expect(repository.saved?.log.map((e) => e.kind === 'note' && e.text)).toEqual(['Im ersten Fenster.', 'Jetzt hier.']);
  });
});

describe('Hinweis nach einer Eingabe', () => {
  it('eine verletzte Regel steht mit ihrer Meldung da, jeder andere Fehler mit „Das ging nicht“; ✕ nimmt ihn weg', async () => {
    const game = new GameController({ repository: memoryRepository(), random: fixedRandom(), clock: fixedClock(), download: memoryDownload(), keys: countingKeys() });
    await game.init();
    expect(game.snapshot().notice).toBeUndefined();
    game.showError(new DomainError('Es ist keine Karte offen.'));
    expect(game.snapshot().notice).toBe('Es ist keine Karte offen.');
    game.showError(new TypeError('x is undefined'));
    expect(game.snapshot().notice).toBe('Das ging nicht: x is undefined');
    game.closeNotice();
    expect(game.snapshot().notice).toBeUndefined();
  });
});
