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
  { kind: 'note', at: '2026-10-23T14:05:00.000Z', text: 'Halvek lügt, und er weiß, dass wir es wissen.', interprets: 0 },
  { kind: 'note', at: '2026-10-23T14:06:00.000Z', text: 'Wir landen auf Regina.' },
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
    ['mit einer leeren Notiz', () => fileWith((c) => ((c.log as { text?: string }[])[6]!.text = '  ')), /keine gültige/],
    ['mit einer Deutung einer Notiz', () => fileWith((c) => ((c.log as { interprets?: number }[])[5]!.interprets = 6)), /Eintrag, den es davor nicht gibt/],
    ['mit einer Deutung einer Deutung', () => fileWith((c) => ((c.log as { interprets?: number }[])[6]!.interprets = 5)), /nur ein Ergebnis/],
    ['mit einer Deutung ins Leere', () => fileWith((c) => ((c.log as { interprets?: number }[])[5]!.interprets = 9)), /Eintrag, den es davor nicht gibt/],
    ['mit einem Würfel über 6', () => fileWith((c) => ((c.log as { dice?: number[] }[])[1]!.dice = [7, 1])), /keine gültige/],
  ])('weist eine Datei %s zurück', (_, text, message) => {
    expect(() => fromCampaignFile(text(), 'k2')).toThrow(message);
  });
});

describe('Kampagnendatei mit Charakter oben', () => {
  it('nimmt den Charakter oben mit', () => {
    const text = fileWith((c) => (c.focus = 'c2'));
    expect(fromCampaignFile(text, 'k9').focus).toBe('c2');
  });

  it('gibt Dateien von vor dieser Regel den ersten Lebenden', () => {
    const text = fileWith((c) => delete c.focus);
    expect(fromCampaignFile(text, 'k9').focus).toBe('c1');
  });

  it('weist einen Charakter oben zurück, den es nicht gibt oder der tot ist', () => {
    expect(() => fromCampaignFile(fileWith((c) => (c.focus = 'c7')), 'k9')).toThrow(/Charakter oben \(c7\)/);
    const dead = fileWith((c) => {
      c.focus = 'c2';
      (c.characters as { dead: boolean }[])[1]!.dead = true;
    });
    expect(() => fromCampaignFile(dead, 'k9')).toThrow(/lebt nicht/);
  });
});

describe('Logeintrag löschen', () => {
  it('nimmt genau den Eintrag heraus', () => {
    const after = removeLogEntry(campaign(), 1);
    expect(after.log.map((e) => e.kind)).toEqual(['oracle', 'card', 'task', 'task', 'note', 'note']);
    expect(() => removeLogEntry(campaign(), 7)).toThrow(/gibt es nicht/);
  });

  it('löscht ein Ergebnis mit seinen Deutungen; andere Deutungen zeigen weiter auf ihr Ergebnis', () => {
    const withMore = appendLog(campaign(), { kind: 'note', at: '2026-10-23T14:07:00.000Z', text: 'Ein Paar zum Verrat.', interprets: 2 });
    const after = removeLogEntry(withMore, 0);
    expect(after.log.map((e) => e.kind)).toEqual(['dice', 'card', 'task', 'task', 'note', 'note']);
    expect(after.log.at(-1)).toMatchObject({ text: 'Ein Paar zum Verrat.', interprets: 1 });
    expect(after.log[1]?.kind).toBe('card');
  });

  it('löscht eine Deutung allein; ihr Ergebnis bleibt', () => {
    const after = removeLogEntry(campaign(), 5);
    expect(after.log.map((e) => e.kind)).toEqual(['oracle', 'dice', 'card', 'task', 'task', 'note']);
  });
});

describe('Kampagnendatei mit Subsektor', () => {
  it('liest eine Datei von vor dem Subsektor mit leerem Subsektor', () => {
    const text = fileWith((c) => delete c.hexes);
    expect(fromCampaignFile(text, 'k2').hexes).toEqual([]);
  });

  it('nimmt Welten als Werte mit und liest sie unverändert zurück', () => {
    const hex = { column: 2, row: 7, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 }, temperature: 'temperate', surface: { water: 80, plates: 8, majorContinents: 1, minorContinents: 4, majorIslands: 5, archipelagos: 7, majorOceans: 0, minorOceans: 0, smallSeas: 0, scatteredLakes: 0, life: true } };
    // Eine Welt von vor der Temperatur hat keine, und damit auch keine Oberfläche.
    const old: Record<string, unknown> = { ...hex, column: 3 };
    delete old.temperature;
    delete old.surface;
    const text = fileWith((c) => (c.hexes = [hex, old, { column: 1, row: 1, empty: true, uwp: {} }]));
    expect(fromCampaignFile(text, 'k2').hexes).toEqual([hex, old, { column: 1, row: 1, empty: true, uwp: {} }]);
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
