import { describe, expect, it } from 'vitest';
import type { AnimalTable } from './animals';
import { createCampaign, removeLogEntry, setHexes, type Campaign } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { rollAnimalEncounter, setTerrain } from './encounter';
import { rollEventSaves, saveSucceeds } from './events';
import type { SaveRoll } from './log';
import { ref } from './reference';
import { setLocation } from './shop';
import { fixedClock, fixedRandom } from './testing';
import { woundsOf } from './wounds';

/** Eine Welt, deren Tiertabelle in Clear nur aus diesem Ereignis besteht. */
function withEvent(event: string): Campaign {
  const table: AnimalTable = { terrain: 'clear', rows: Array.from({ length: 11 }, (_, i) => ({ roll: i + 2, event })) };
  const hex = { ...ref.demoWorld, column: 1, row: 1, name: 'Regina', animals: [table] };
  return setTerrain(setLocation(setHexes(createCampaign(), [hex]), '0101'), 'clear');
}

describe('Ereignisse mit Rettungswurf', () => {
  it('Stampede: jeder SC 8+, sonst 2W6 Schaden, den die App verteilt; nur einmal je Ereignis', () => {
    const rolled = rollAnimalEncounter(withEvent('stampede'), fixedRandom(3, 4), fixedClock());
    expect(rolled.event).toMatchObject({ kind: 'event', tableDice: [3, 4] });
    // Kira 6 + 3 = 9: geschafft. Jonas 2 + 2 = 4: misslungen, 2W6 = 5 + 1, verteilt.
    const campaign = rollEventSaves(rolled.campaign, 0, fixedRandom(6, 3, 2, 2, 5, 1), fixedClock('2026-10-23T15:00:00.000Z'));
    const [, kira, jonas, damage] = campaign.log;
    expect(kira).toMatchObject({ kind: 'save', for: 'c1', of: 0, dice: [6, 3], target: 8 });
    expect(saveSucceeds(campaign, kira as SaveRoll)).toBe(true);
    expect(saveSucceeds(campaign, jonas as SaveRoll)).toBe(false);
    expect(damage).toMatchObject({ kind: 'damage', after: 2, dice: [5, 1] });
    const lost = woundsOf(campaign, 'c2');
    expect(lost.str + lost.dex + lost.end).toBe(6);
    expect(() => rollEventSaves(campaign, 0, fixedRandom(), fixedClock())).toThrow(/schon gewürfelt/);
    // Übersteht die Kampagnendatei.
    expect(fromCampaignFile(toCampaignFile(campaign), 'k1').log).toEqual(campaign.log);
    // Löscht man das Ereignis, gehen Rettungswürfe und Schaden mit.
    expect(removeLogEntry(campaign, 0).log).toEqual([]);
    // Löscht man einen Rettungswurf, geht sein Schaden mit; die Verweise rücken nach.
    const without = removeLogEntry(campaign, 1);
    expect(without.log.map((e) => e.kind)).toEqual(['event', 'save', 'damage']);
    expect(without.log[2]).toMatchObject({ after: 1 });
  });

  it('Seismic Quake: STR oder weniger schafft ihn', () => {
    const rolled = rollAnimalEncounter(withEvent('seismic-quake'), fixedRandom(3, 4), fixedClock());
    // Kira STR 7: 3 + 4 = 7 geschafft; Jonas STR 6: 4 + 3 = 7 misslungen, 1W6 = 4.
    const campaign = rollEventSaves(rolled.campaign, 0, fixedRandom(3, 4, 4, 3, 4), fixedClock('2026-10-23T15:00:00.000Z'));
    expect(campaign.log.map((e) => e.kind)).toEqual(['event', 'save', 'save', 'damage']);
    expect(campaign.log[1]).toMatchObject({ target: 7 });
    expect(campaign.log[2]).toMatchObject({ target: 6 });
  });

  it('ein Ereignis ohne Rettungswurf hat keinen', () => {
    const rolled = rollAnimalEncounter(withEvent('tracks'), fixedRandom(3, 4), fixedClock());
    expect(() => rollEventSaves(rolled.campaign, 0, fixedRandom(), fixedClock())).toThrow(/keinen Rettungswurf/);
  });
});
