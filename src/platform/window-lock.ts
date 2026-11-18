import type { WindowLock } from '../model';

/** So lange wartet der Start auf das Recht zu schreiben: Beim Neuladen gibt die alte Seite es erst kurz danach frei. */
const WAIT_MS = 1500;

/** Was hier von `navigator.locks` gebraucht wird. */
export type Locks = Pick<LockManager, 'request'>;

/**
 * Das Recht zu schreiben über die Web Locks API: Ein Fenster hält die Sperre, solange es offen ist;
 * schließt es, gibt der Browser sie frei. Wo der Browser keine Sperren kennt oder sie verweigert
 * (abgeschotteter Rahmen, lokal geöffnete Datei), darf jedes Fenster schreiben, wie bisher.
 */
export function webWindowLock(name: string, locks: Locks | undefined = globalThis.navigator?.locks, wait = WAIT_MS): WindowLock {
  function hold(options: LockOptions, lost: () => void): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof locks?.request !== 'function') return resolve(true);
      let granted = false;
      locks
        .request(name, options, (lock) => {
          if (!lock) return resolve(false);
          granted = true;
          resolve(true);
          // Gehalten, bis das Fenster zugeht oder ein anderes sie übernimmt.
          return new Promise<void>(() => undefined);
        })
        .catch(() => {
          // Übernommen: Das andere Fenster schreibt jetzt. Vor dem Erhalt abgebrochen heißt: Ein anderes
          // Fenster hält sie. Jeder andere Fehler: Der Browser kann keine Sperren, dann schreibt jedes Fenster.
          if (granted) lost();
          else resolve(!options.signal?.aborted);
        });
    });
  }

  return {
    acquire(lost) {
      const stop = new AbortController();
      const timer = setTimeout(() => stop.abort(), wait);
      return hold({ signal: stop.signal }, lost).finally(() => clearTimeout(timer));
    },
    async take(lost) {
      await hold({ steal: true }, lost);
    },
  };
}
