import { describe, expect, it } from 'vitest';
import { appendLog, createCampaign, removeLogEntry, type Campaign } from './campaign';
import { campaignFileName, fromCampaignFile, toCampaignFile } from './campaign-file';
import type { LogEntry } from './log';

const log: LogEntry[] = [
  { kind: 'oracle', at: '2026-10-23T14:00:00.000Z', question: 'Ist Halvek ehrlich?', roll: 61, chance: 25, odds: 'low' },
  { kind: 'dice', at: '2026-10-23T14:01:00.000Z', dice: [5, 4] },
  { kind: 'card', at: '2026-10-23T14:02:00.000Z', items: [{ picked: ['event.action.1.mythic.1', 'event.action.2.mythic.1'] }] },
  { kind: 'task', at: '2026-10-23T14:03:00.000Z', for: 'c1', uses: 'pilot', counts: ['DEX'], odds: 'low', dice: [4, 5], dm: 3, target: 10 },
  { kind: 'task', at: '2026-10-23T14:04:00.000Z', for: 'c2', counts: [], odds: 'medium', dice: [1, 1], dm: -3, target: 8 },
];

function campaign(): Campaign {
  return log.reduce(appendLog, createCampaign(undefined, 'Spinward Run'));
}

/** Die Datei als JSON, mit einer Änderung an der Kampagne darin. */
function fileWith(change: (c: Record<string, unknown>) => void): string {
  const file = JSON.parse(toCampaignFile(campaign())) as { campaign: Record<string, unknown> };
  change(file.campaign);
  return JSON.stringify(file);
}

describe('Kampagnendatei', () => {
  it('enthält alles, was an der Kampagne hängt, ohne Id, und liest sich unverändert zurück', () => {
    const original = campaign();
    const text = toCampaignFile(original);
    expect(JSON.parse(text)).toMatchObject({ format: 'solo-rpg-engine/kampagne', version: 1, campaign: { name: 'Spinward Run' } });
    expect(JSON.parse(text).campaign.id).toBeUndefined();
    expect(fromCampaignFile(text, 'k7')).toEqual({ ...original, id: 'k7' });
  });

  it('bekommt einen Dateinamen aus Name und Tag', () => {
    expect(campaignFileName(campaign(), '2026-10-25T08:00:00.000Z')).toBe('Spinward-Run-2026-10-25.json');
    expect(campaignFileName({ ...campaign(), name: '???' }, '2026-10-25T08:00:00.000Z')).toBe('Kampagne-2026-10-25.json');
  });

  it.each([
    ['kein JSON', () => 'Kampagne', /kein JSON/],
    ['eine andere Datei', () => JSON.stringify({ format: 'etwas', version: 1 }), /keine gültige Kampagnendatei/],
    ['ohne Namen', () => fileWith((c) => (c.name = ' ')), /braucht einen Namen/],
    ['mit unbekannter Stufe', () => fileWith((c) => (c.odds = 'sicher')), /Stufe sicher/],
    ['mit UPP über 15', () => fileWith((c) => ((c.characters as { upp: { str: number } }[])[0]!.upp.str = 16)), /zwischen 0 und 15/],
    ['mit unbekannter Fertigkeit', () => fileWith((c) => ((c.characters as { skills: { of: string }[] }[])[0]!.skills[0]!.of = 'zauberei')), /Fertigkeit zauberei/],
    ['mit unbekanntem Karteneintrag', () => fileWith((c) => ((c.log as { items?: { picked: string[] }[] }[])[2]!.items![0]!.picked = ['gibt.es.nicht'])), /Eintrag/],
    ['mit einer Probe für einen fremden Charakter', () => fileWith((c) => ((c.log as { for?: string }[])[3]!.for = 'c9')), /Charakter c9/],
    ['mit einem Würfel über 6', () => fileWith((c) => ((c.log as { dice?: number[] }[])[1]!.dice = [7, 1])), /keine gültige/],
  ])('weist eine Datei %s zurück', (_, text, message) => {
    expect(() => fromCampaignFile(text(), 'k2')).toThrow(message);
  });
});

describe('Logeintrag löschen', () => {
  it('nimmt genau den Eintrag heraus', () => {
    const after = removeLogEntry(campaign(), 1);
    expect(after.log.map((e) => e.kind)).toEqual(['oracle', 'card', 'task', 'task']);
    expect(() => removeLogEntry(campaign(), 5)).toThrow(/gibt es nicht/);
  });
});

describe('Kampagnendatei mit Subsektor', () => {
  it('liest eine Datei von vor dem Subsektor mit leerem Subsektor', () => {
    const text = fileWith((c) => delete c.hexes);
    expect(fromCampaignFile(text, 'k2').hexes).toEqual([]);
  });

  it('nimmt Welten als Werte mit und liest sie unverändert zurück', () => {
    const hex = { column: 2, row: 7, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 } };
    const text = fileWith((c) => (c.hexes = [hex, { column: 1, row: 1, empty: true, uwp: {} }]));
    expect(fromCampaignFile(text, 'k2').hexes).toEqual([hex, { column: 1, row: 1, empty: true, uwp: {} }]);
  });

  it('weist Hexfelder zurück, deren Werte nicht zu den Regeln passen', () => {
    const text = fileWith((c) => (c.hexes = [{ column: 1, row: 1, empty: false, uwp: { size: 5 } }]));
    expect(() => fromCampaignFile(text, 'k2')).toThrow(/verletzt eine Regel: .*Es fehlt starport/);
  });

  it('übernimmt Hexfelder mit gespeicherten Würfen aus älteren Dateien als Werte', () => {
    const rolls = [
      { kind: 'occurrence', dice: [5], dm: 0, target: 4 },
      { kind: 'starport', dice: [6, 6], dm: 0 },
    ];
    const text = fileWith((c) => (c.hexes = [{ column: 4, row: 4, rolls }]));
    expect(fromCampaignFile(text, 'k2').hexes).toEqual([{ column: 4, row: 4, empty: false, navalBase: false, scoutBase: false, uwp: { starport: 31 } }]);
    const wrong = fileWith((c) => (c.hexes = [{ column: 1, row: 1, rolls: [{ kind: 'size', dice: [3, 3], dm: -2 }] }]));
    expect(() => fromCampaignFile(wrong, 'k2')).toThrow(/verletzt eine Regel: .*Vorkommen/);
  });
});
