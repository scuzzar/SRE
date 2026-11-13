import { describe, expect, it } from 'vitest';
import { createCampaign, EPOCH, stamped, type Campaign } from './campaign';
import { fromCampaignFile, fromCloudFile, toCampaignFile } from './campaign-file';
import { DomainError } from './errors';
import { copyOf, planSync, type SyncMark } from './sync';
import { countingKeys, fixedClock } from './testing';

const campaign = (changedAt = '2026-11-13T10:00:00.000Z'): Campaign => createCampaign([], 'Spinward Run', 'k1', { key: 'a', changedAt });
const mark = (rest: Partial<SyncMark> = {}): SyncMark => ({ key: 'a', changedAt: '2026-11-13T10:00:00.000Z', revision: 'r1', ...rest });
const file = (revision = 'r1') => ({ key: 'a', revision });
const later = '2026-11-13T11:00:00.000Z';

describe('planSync', () => {
  it.each([
    ['neu hier, fehlt dort: hochladen', [campaign()], [], [], 'upload'],
    ['fehlt hier, neu dort: herunterladen', [], [], [file()], 'download'],
    ['hier geändert, dort unverändert: hochladen', [campaign(later)], [mark()], [file()], 'upload'],
    ['hier unverändert, dort geändert: herunterladen', [campaign()], [mark()], [file('r2')], 'download'],
    ['hier gelöscht, dort unverändert: dort löschen', [], [mark({ deleted: true })], [file()], 'removeRemote'],
    ['hier unverändert, dort gelöscht: hier löschen', [campaign()], [mark()], [], 'removeLocal'],
    ['beide geändert: Konflikt', [campaign(later)], [mark()], [file('r2')], 'conflict'],
    ['hier geändert, dort gelöscht: Konflikt', [campaign(later)], [mark()], [], 'conflict'],
    ['hier gelöscht, dort geändert: Konflikt', [], [mark({ deleted: true })], [file('r2')], 'conflict'],
    ['beide gelöscht: nur die Marke geht', [], [mark({ deleted: true })], [], 'forget'],
    ['ohne Marke auf beiden Seiten: erst vergleichen', [campaign()], [], [file()], 'conflict'],
  ] as const)('%s', (_name, campaigns, marks, remote, kind) => {
    expect(planSync(campaigns, marks, remote)).toEqual([{ kind, key: 'a' }]);
  });

  it('tut nichts, wenn beide Seiten unverändert sind', () => {
    expect(planSync([campaign()], [mark()], [file()])).toEqual([]);
  });

  it('lässt Kampagnen mit offenem Konflikt in Ruhe', () => {
    expect(planSync([campaign(later)], [mark()], [file('r2')], ['a'])).toEqual([]);
  });
});

describe('Schlüssel und Änderungszeit', () => {
  it('gibt einer Kampagne von vor dem Abgleich einen Schlüssel und die Zeit ihres letzten Logeintrags', () => {
    const old = { ...campaign(), key: undefined, changedAt: undefined, log: [{ kind: 'dice' as const, at: '2026-10-01T08:00:00.000Z', dice: [1, 2] as const }] };
    const now = stamped(old as unknown as Campaign, countingKeys(), fixedClock());
    expect(now).toMatchObject({ key: 'key-1', changedAt: '2026-10-01T08:00:00.000Z' });
    expect(stamped(now, countingKeys(), fixedClock())).toBe(now);
  });

  it('„Beide behalten“ macht aus dem Stand von hier eine Kopie mit neuem Schlüssel und derselben Id', () => {
    expect(copyOf(campaign(), countingKeys('neu'), fixedClock())).toMatchObject({ id: 'k1', key: 'neu-1', name: 'Spinward Run (Kopie)', changedAt: '2026-10-23T14:00:00.000Z' });
  });

  it('die Datei aus der Wolke behält Schlüssel und Änderungszeit, ein Import nicht', () => {
    const text = toCampaignFile(campaign());
    expect(fromCloudFile(text, 'k5', 'a')).toMatchObject({ id: 'k5', key: 'a', changedAt: '2026-11-13T10:00:00.000Z' });
    expect(fromCampaignFile(text, 'k5', { key: 'b', changedAt: later })).toMatchObject({ key: 'b', changedAt: later });
    expect(fromCampaignFile(text, 'k5')).toMatchObject({ key: 'key-k5', changedAt: EPOCH });
  });

  it('weist eine Datei zurück, die unter einem fremden Schlüssel liegt oder keine Änderungszeit hat', () => {
    expect(() => fromCloudFile(toCampaignFile(campaign()), 'k5', 'b')).toThrow(DomainError);
    const json = JSON.parse(toCampaignFile(campaign()));
    delete json.campaign.changedAt;
    expect(() => fromCloudFile(JSON.stringify(json), 'k5', 'a')).toThrow(DomainError);
  });
});
