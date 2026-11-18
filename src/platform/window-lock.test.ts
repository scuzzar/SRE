import { describe, expect, it } from 'vitest';
import { webWindowLock, type Locks } from './window-lock';

/** Eine Sperre wie `navigator.locks`, im Arbeitsspeicher: ein Halter, `steal` nimmt sie ihm weg. */
function fakeLocks(): Locks {
  let holder: ((error: unknown) => void) | undefined;
  const request = (name: string, options: LockOptions, callback: (lock: Lock | null) => unknown) =>
    new Promise((resolve, reject) => {
      const grant = () => {
        holder = reject;
        Promise.resolve(callback({ name, mode: 'exclusive' })).then(resolve, reject);
      };
      if (options.steal) {
        holder?.(new DOMException('übernommen', 'AbortError'));
        return grant();
      }
      if (!holder) return grant();
      options.signal?.addEventListener('abort', () => reject(new DOMException('abgebrochen', 'AbortError')));
    });
  return { request } as unknown as Locks;
}

describe('webWindowLock', () => {
  it('das erste Fenster bekommt die Sperre, das zweite nicht; übernimmt es, erfährt das erste davon', async () => {
    const locks = fakeLocks();
    const lost: string[] = [];
    const first = webWindowLock('sre', locks, 20);
    const second = webWindowLock('sre', locks, 20);
    expect(await first.acquire(() => lost.push('erstes'))).toBe(true);
    expect(await second.acquire(() => lost.push('zweites'))).toBe(false);
    await second.take(() => lost.push('zweites'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(lost).toEqual(['erstes']);
  });

  it('ohne Sperren im Browser, oder wenn er sie verweigert, schreibt jedes Fenster', async () => {
    expect(await webWindowLock('sre', undefined).acquire(() => undefined)).toBe(true);
    const refusing = { request: () => Promise.reject(new DOMException('nicht hier', 'SecurityError')) } as unknown as Locks;
    expect(await webWindowLock('sre', refusing).acquire(() => undefined)).toBe(true);
  });
});
