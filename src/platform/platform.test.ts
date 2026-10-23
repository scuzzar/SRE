import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { appendLog, createCampaign } from '../model';
import { systemClock } from './clock';
import { cryptoRandom } from './random';
import { DexieCampaignRepository, MemoryCampaignRepository } from './repository';

describe('cryptoRandom', () => {
  it('bleibt im Bereich und trifft jeden Wert', () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const value = cryptoRandom.int(1, 6);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('weist leere Bereiche zurück', () => {
    expect(() => cryptoRandom.int(3, 2)).toThrow(RangeError);
  });
});

describe('systemClock', () => {
  it('liefert einen ISO-Zeitstempel', () => {
    expect(systemClock.now()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe.each([
  ['Dexie', () => new DexieCampaignRepository(`test-${Math.random()}`).open()],
  ['Arbeitsspeicher', async () => new MemoryCampaignRepository()],
])('Speicher (%s)', (_, open) => {
  it('ist anfangs leer und gibt den gespeicherten Stand zurück', async () => {
    const repository = await open();
    expect(await repository.load()).toBeUndefined();
    const campaign = appendLog(createCampaign(), { kind: 'dice', at: '2026-10-23T14:00:00.000Z', dice: [3, 4] });
    await repository.save(campaign);
    expect(await repository.load()).toEqual(campaign);
  });
});
