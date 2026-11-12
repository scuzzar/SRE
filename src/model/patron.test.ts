import { describe, expect, it } from 'vitest';
import { appendLog, createCampaign, type Campaign } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { patronDmParts, patronDms, patronOfRoll, patronRollOf, rollPatron } from './patron';
import { ref } from './reference';
import { fixedClock, fixedRandom } from './testing';

const withSoc = (campaign: Campaign, soc: number): Campaign => ({ ...campaign, characters: campaign.characters.map((c, i) => (i === 0 ? { ...c, upp: { ...c.upp, soc } } : c)) });

describe('Patron', () => {
  it('kennt beide Listen der Patron Encounters Matrix mit je 36 Zeilen', () => {
    expect(ref.encounters.patrons.filter((p) => p.list === 1)).toHaveLength(36);
    expect(ref.encounters.patrons.filter((p) => p.list === 2)).toHaveLength(36);
    expect(ref.encounters.patrons.filter((p) => p.rumor).map((p) => `${p.list}-${p.roll}`)).toEqual(['1-23', '1-36', '1-66']);
  });

  it('würfelt zwei Würfel nacheinander: der erste die Zehner, der zweite die Einer', () => {
    const campaign = createCampaign([]);
    const entry = rollPatron(campaign, 1, fixedRandom(1, 5), fixedClock());
    expect(entry).toEqual({ kind: 'patron', at: '2026-10-23T14:00:00.000Z', list: 1, dice: [1, 5], dms: [0, 0] });
    expect(patronRollOf(entry)).toBe(15);
    expect(patronOfRoll(entry).name).toBe('Smuggler');
  });

  it('nimmt die DMs der lebenden SC: Admin-1 gibt +1 auf den zweiten Würfel der Liste zwei', () => {
    // Jonas Reyl hat Admin-1.
    const campaign = createCampaign();
    expect(patronDmParts(campaign, 2)).toEqual([{ die: 1, label: 'Admin', dm: 1 }]);
    expect(patronDms(campaign, 1)).toEqual([0, 0]);
    const entry = rollPatron(campaign, 2, fixedRandom(3, 6), fixedClock());
    expect(entry.dms).toEqual([0, 1]);
    // 3 und 6 + 1 → auf 6 begrenzt: 36 Professor.
    expect(patronRollOf(entry)).toBe(36);
    expect(patronOfRoll(entry).name).toBe('Professor');
  });

  it('gibt einem Noble (SOC 11+) +1 auf den ersten Würfel der Liste eins', () => {
    expect(patronDmParts(withSoc(createCampaign(), 11), 1)).toEqual([{ die: 0, label: 'Noble (SOC 11+)', dm: 1 }]);
    expect(patronDmParts(withSoc(createCampaign(), 10), 1)).toEqual([]);
  });

  it('hält die DMs fest: Ändert sich der SC später, bleibt der Patron', () => {
    const entry = rollPatron(withSoc(createCampaign(), 12), 1, fixedRandom(6, 1), fixedClock());
    expect(entry.dms).toEqual([1, 0]);
    expect(patronOfRoll(entry).name).toBe('Noble');
  });

  it('kennt nur die Listen 1 und 2', () => {
    expect(() => rollPatron(createCampaign([]), 3, fixedRandom(), fixedClock())).toThrow(/Liste 3 gibt es nicht/);
  });

  it('übersteht die Kampagnendatei', () => {
    const campaign = appendLog(createCampaign(), rollPatron(createCampaign(), 2, fixedRandom(4, 2), fixedClock()));
    const loaded = fromCampaignFile(toCampaignFile(campaign), campaign.id);
    expect(loaded.log).toEqual(campaign.log);
  });
});
