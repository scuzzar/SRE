import { describe, expect, it } from 'vitest';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { createDemoCampaign, DEMO_FUNDS } from './demo';
import { fundsOf, locationOf } from './shop';
import { fixedClock } from './testing';
import { stepOf } from './sector';

describe('Demo-Kampagne', () => {
  it('hat Kira, Jonas und die fertige Startwelt, die Gruppe steht dort', () => {
    const demo = createDemoCampaign(fixedClock());
    expect(demo.name).toBe('Demo-Kampagne');
    expect(demo.characters.map((c) => c.name)).toEqual(['Kira Vant', 'Jonas Reyl']);
    expect(demo.hexes).toHaveLength(1);
    expect(stepOf(demo.hexes[0]!)).toBe('done');
    expect(locationOf(demo)?.name).toBe('Kessra');
  });

  it('hat ein Startkapital in der Gruppenkasse, als Einnahme im Kassenbuch', () => {
    const demo = createDemoCampaign(fixedClock());
    expect(fundsOf(demo)).toBe(DEMO_FUNDS);
    expect(demo.bookings).toMatchObject([{ kind: 'income', amount: DEMO_FUNDS, text: 'Startkapital' }]);
  });

  it('übersteht Export und Import, also auch die Prüfung der Kampagnendatei', () => {
    const demo = createDemoCampaign(fixedClock());
    const back = fromCampaignFile(toCampaignFile(demo), 'k9');
    expect(back.hexes).toEqual(demo.hexes);
    expect(back.location).toBe('0405');
    expect(back.bookings).toEqual(demo.bookings);
  });
});
