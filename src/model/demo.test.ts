import { describe, expect, it } from 'vitest';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { createDemoCampaign } from './demo';
import { locationOf } from './shop';
import { stepOf } from './sector';

describe('Demo-Kampagne', () => {
  it('hat Kira, Jonas und die fertige Startwelt, die Gruppe steht dort', () => {
    const demo = createDemoCampaign();
    expect(demo.name).toBe('Demo-Kampagne');
    expect(demo.characters.map((c) => c.name)).toEqual(['Kira Vant', 'Jonas Reyl']);
    expect(demo.hexes).toHaveLength(1);
    expect(stepOf(demo.hexes[0]!)).toBe('done');
    expect(locationOf(demo)?.name).toBe('Kessra');
  });

  it('übersteht Export und Import, also auch die Prüfung der Kampagnendatei', () => {
    const demo = createDemoCampaign();
    const back = fromCampaignFile(toCampaignFile(demo), 'k9');
    expect(back.hexes).toEqual(demo.hexes);
    expect(back.location).toBe('0405');
  });
});
