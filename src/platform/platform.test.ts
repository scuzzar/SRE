import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { appendLog, createCampaign, type Campaign, type LogEntry } from '../model';
import { systemClock } from './clock';
import { cryptoRandom } from './random';
import { DexieCampaignRepository, MemoryCampaignRepository, upgraded } from './repository';

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
  it('ist anfangs leer und gibt die gespeicherten Kampagnen zurück', async () => {
    const repository = await open();
    expect(await repository.list()).toEqual([]);
    expect(await repository.loadOpen()).toBeUndefined();
    const campaign = appendLog(createCampaign(), { kind: 'dice', at: '2026-10-23T14:00:00.000Z', dice: [3, 4] });
    const other = createCampaign([], 'Zweite', 'k2');
    await repository.save(campaign);
    await repository.save(other);
    await repository.saveOpen('k2');
    expect([...(await repository.list())].sort((a, b) => a.id.localeCompare(b.id))).toEqual([campaign, other]);
    expect(await repository.loadOpen()).toBe('k2');
    await repository.remove('k1');
    expect(await repository.list()).toEqual([other]);
  });
});

describe('Ältere Spielstände', () => {
  it('lesen eine Kartenauswahl mit einem Eintrag als Text noch ein', async () => {
    const old = { kind: 'card', at: '2026-10-23T14:00:00.000Z', items: [{ picked: 'event.verb.3' }] } as unknown as LogEntry;
    const campaign = appendLog(createCampaign(), old);
    expect(upgraded(campaign).log).toEqual([{ kind: 'card', at: '2026-10-23T14:00:00.000Z', items: [{ picked: ['event.verb.3'] }] }]);
    const repository = await new DexieCampaignRepository(`test-${Math.random()}`).open();
    await repository.save(campaign);
    expect((await repository.list())[0]?.log).toEqual(upgraded(campaign).log);
  });

  it('übernehmen die eine Kampagne aus der Zeit vor mehreren Kampagnen', async () => {
    const name = `test-${Math.random()}`;
    const old = new Dexie(name);
    old.version(1).stores({ campaigns: 'key' });
    const campaign: { -readonly [K in keyof Campaign]?: Campaign[K] } = createCampaign();
    delete campaign.id;
    await old.table('campaigns').put({ key: 'current', campaign });
    old.close();
    const repository = await new DexieCampaignRepository(name).open();
    const [loaded] = await repository.list();
    expect(loaded).toEqual({ ...campaign, id: 'current' });
    await repository.save({ ...loaded!, name: 'Spinward' });
    expect((await repository.list()).map((c) => [c.id, c.name])).toEqual([['current', 'Spinward']]);
  });
});
