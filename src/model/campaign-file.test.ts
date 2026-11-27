import { describe, expect, it } from 'vitest';
import { appendLog, book, buyShip, createCampaign, createDemoCampaign, crewOf, hexFromFlat, removeCharacter, removeLogEntry, seat, type Campaign, type CharacterId, type FlatHex } from '.';
import { campaignFileName, fromCampaignFile, toCampaignFile } from './campaign-file';
import { fixedClock } from './testing';
import type { LogEntry } from './log';

const log: LogEntry[] = [
  { kind: 'card', at: '2026-10-23T14:00:00.000Z', question: 'Ist Halvek ehrlich?', oracle: 61, odds: 'low', chance: 25, items: [] },
  { kind: 'dice', at: '2026-10-23T14:01:00.000Z', dice: [5, 4] },
  { kind: 'card', at: '2026-10-23T14:02:00.000Z', items: [{ picked: ['event.action.1.mythic.1', 'event.action.2.mythic.1'] }] },
  { kind: 'task', at: '2026-10-23T14:03:00.000Z', for: 'c1', uses: 'pilot', counts: ['DEX'], odds: 'low', dice: [4, 5], dm: 3, target: 10 },
  { kind: 'task', at: '2026-10-23T14:04:00.000Z', for: 'c2', counts: [], odds: 'medium', dice: [1, 1], dm: -3, target: 8 },
  { kind: 'note', at: '2026-10-23T14:05:00.000Z', text: 'Halvek lügt, und er weiß, dass wir es wissen.', interprets: 0 },
  { kind: 'note', at: '2026-10-23T14:06:00.000Z', text: 'Wir landen auf Regina.' },
];

/** Kartenauswahlen mit Wurffeldern und einem Namen von der Tafel NSC. */
const rolled: LogEntry[] = [
  {
    kind: 'card',
    at: '2026-10-23T14:07:00.000Z',
    question: 'Wohin führt der Gang?',
    bell: 6,
    scatter: 'ne',
    map: { north: 'path', east: 'none', south: 'deadEnd', west: 'hidden', up: 'none', down: 'obstacle' },
    items: [{ picked: ['npc.names.male.spacey.first.3', 'npc.names.male.spacey.last.17'] }],
  },
  { kind: 'card', at: '2026-10-23T14:08:00.000Z', bell: 1, items: [] },
];

function campaign(): Campaign {
  return log.reduce((c, e) => appendLog(c, e), createCampaign(undefined, 'Spinward Run'));
}

/** Die Datei als JSON, mit einer Änderung an der Kampagne darin. */
function fileWith(change: (c: Record<string, unknown>) => void): string {
  const file = JSON.parse(toCampaignFile(campaign())) as { campaign: Record<string, unknown> };
  change(file.campaign);
  return JSON.stringify(file);
}

/** Eine Datei mit den Kartenauswahlen mit Wurffeldern, mit einer Änderung daran. */
function rolledWith(change: (log: { bell?: number; scatter?: string; map?: Record<string, string> }[]) => void): string {
  const file = JSON.parse(toCampaignFile(rolled.reduce((c, e) => appendLog(c, e), createCampaign(undefined, 'Tief unten')))) as { campaign: { log: [] } };
  change(file.campaign.log);
  return JSON.stringify(file);
}

describe('Kampagnendatei', () => {
  it('liest Kartenauswahlen mit Wurffeldern und Namen von der Tafel NSC unverändert zurück', () => {
    const original = rolled.reduce((c, e) => appendLog(c, e), createCampaign(undefined, 'Tief unten'));
    expect(fromCampaignFile(toCampaignFile(original), 'k8')).toEqual({ ...original, id: 'k8', key: 'key-k8' });
  });

  it('enthält alles, was an der Kampagne hängt, ohne Id, und liest sich unverändert zurück', () => {
    const original = campaign();
    const text = toCampaignFile(original);
    expect(JSON.parse(text)).toMatchObject({ format: 'solo-rpg-engine/kampagne', version: 1, campaign: { name: 'Spinward Run' } });
    expect(JSON.parse(text).campaign.id).toBeUndefined();
    expect(fromCampaignFile(text, 'k7')).toEqual({ ...original, id: 'k7', key: 'key-k7' });
  });

  it('bekommt einen Dateinamen aus Name und Tag', () => {
    expect(campaignFileName(campaign(), '2026-10-25T08:00:00.000Z')).toBe('Spinward-Run-2026-10-25.json');
    expect(campaignFileName({ ...campaign(), name: '???' }, '2026-10-25T08:00:00.000Z')).toBe('Kampagne-2026-10-25.json');
  });

  it.each([
    ['kein JSON', () => 'Kampagne', /kein JSON/],
    ['eine andere Datei', () => JSON.stringify({ format: 'etwas', version: 1 }), /keine gültige Kampagnendatei/],
    ['ohne Namen', () => fileWith((c) => (c.name = ' ')), /braucht einen Namen/],
    ['mit UPP über 15', () => fileWith((c) => ((c.characters as { upp: { str: number } }[])[0]!.upp.str = 16)), /zwischen 0 und 15/],
    ['mit unbekannter Fertigkeit', () => fileWith((c) => ((c.characters as { skills: { of: string }[] }[])[0]!.skills[0]!.of = 'zauberei')), /Fertigkeit zauberei/],
    ['mit unbekanntem Karteneintrag', () => fileWith((c) => ((c.log as { items?: { picked: string[] }[] }[])[2]!.items![0]!.picked = ['gibt.es.nicht'])), /Eintrag/],
    ['mit einer Probe für einen fremden Charakter', () => fileWith((c) => ((c.log as { for?: string }[])[3]!.for = 'c9')), /Charakter c9/],
    ['mit einer leeren Notiz', () => fileWith((c) => ((c.log as { text?: string }[])[6]!.text = '  ')), /keine gültige/],
    ['mit einer Deutung einer Notiz', () => fileWith((c) => ((c.log as { interprets?: number }[])[5]!.interprets = 6)), /Eintrag, den es davor nicht gibt/],
    ['mit einer Deutung einer Deutung', () => fileWith((c) => ((c.log as { interprets?: number }[])[6]!.interprets = 5)), /nur ein Ergebnis/],
    ['mit einer Deutung ins Leere', () => fileWith((c) => ((c.log as { interprets?: number }[])[5]!.interprets = 9)), /Eintrag, den es davor nicht gibt/],
    ['mit einem Würfel über 6', () => fileWith((c) => ((c.log as { dice?: number[] }[])[1]!.dice = [7, 1])), /keine gültige/],
    ['mit einer Kartenauswahl ohne alles', () => rolledWith((log) => delete log[1]!.bell), /ohne Feld, Wurffeld und Antwort/],
    ['mit einer Antwort ohne Stufe', () => fileWith((c) => delete (c.log as { odds?: string }[])[0]!.odds), /Wurf, Stufe und Chance/],
    ['mit einer Antwort einer unbekannten Stufe', () => fileWith((c) => ((c.log as { odds?: string }[])[0]!.odds = 'sicher')), /Stufe sicher/],
    ['mit einer Glockenzahl über 10', () => rolledWith((log) => (log[1]!.bell = 11)), /keine gültige/],
    ['mit einem unbekannten Streuwürfel', () => rolledWith((log) => (log[0]!.scatter = 'up')), /keine gültige/],
    [
      'mit einem Kartensymbol mit nur einem Weg',
      () => rolledWith((log) => (log[0]!.map = { north: 'path', east: 'none', south: 'none', west: 'none', up: 'none', down: 'none' })),
      /mindestens zwei Wege/,
    ],
  ])('weist eine Datei %s zurück', (_, text, message) => {
    expect(() => fromCampaignFile(text(), 'k2')).toThrow(message);
  });

  it('übergeht die gewählte Stufe aus Dateien von vor 2026-11-27', () => {
    const campaign = fromCampaignFile(fileWith((c) => (c.odds = 'low')), 'k2');
    expect('odds' in campaign).toBe(false);
    expect(JSON.parse(toCampaignFile(campaign)).campaign.odds).toBeUndefined();
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

describe('Kampagnendatei von vor 2026-11-14d', () => {
  it('macht aus einer alten Orakelantwort eine Kartenauswahl mit der Antwort; ihre Deutung bleibt', () => {
    const text = fileWith((c) => ((c.log as unknown[])[0] = { kind: 'oracle', at: '2026-10-23T14:00:00.000Z', question: 'Ist Halvek ehrlich?', roll: 61, chance: 25, odds: 'low' }));
    const read = fromCampaignFile(text, 'k9');
    expect(read.log[0]).toEqual({ kind: 'card', at: '2026-10-23T14:00:00.000Z', question: 'Ist Halvek ehrlich?', oracle: 61, odds: 'low', chance: 25, items: [] });
    expect(read.log[5]).toMatchObject({ kind: 'note', interprets: 0 });
  });
});

describe('Logeintrag löschen', () => {
  it('nimmt genau den Eintrag heraus', () => {
    const after = removeLogEntry(campaign(), 1);
    expect(after.log.map((e) => e.kind)).toEqual(['card', 'card', 'task', 'task', 'note', 'note']);
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
    expect(after.log.map((e) => e.kind)).toEqual(['card', 'dice', 'card', 'task', 'task', 'note']);
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
    const text = fileWith((c) => (c.hexes = [{ ...hex, note: 'Halveks Werft am Südpol.' }, old, { column: 1, row: 1, empty: true, uwp: {} }]));
    // Dateien von vor 2026-11-20b halten die Werte am Feld; sie wandern in die Hauptwelt mit der Id des Feldes.
    const read = fromCampaignFile(text, 'k2').hexes;
    expect(read).toEqual([hexFromFlat({ ...hex, note: 'Halveks Werft am Südpol.' } as FlatHex), hexFromFlat(old as unknown as FlatHex), { column: 1, row: 1, empty: true, worlds: [] }]);
    expect(read[0]!.main).toBe('0207');
    expect(read[0]!.worlds[0]).toMatchObject({ id: '0207', kind: 'world', name: 'Regina', note: 'Halveks Werft am Südpol.' });
    // Im neuen Format liest sie sich unverändert zurück.
    const again = fileWith((c) => (c.hexes = read));
    expect(fromCampaignFile(again, 'k2').hexes).toEqual(read);
  });

  it('weist eine Notiz an einem leeren Feld, einer Welt in Erschaffung oder ohne Text zurück', () => {
    for (const hex of [
      { column: 1, row: 1, empty: true, uwp: {}, note: 'Nichts.' },
      { column: 1, row: 1, empty: false, uwp: { starport: 12 }, note: 'Bald.' },
      { column: 1, row: 1, empty: false, name: 'Regina', navalBase: false, scoutBase: true, gasGiant: true, uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 }, note: '  ' },
    ]) {
      expect(() => fromCampaignFile(fileWith((c) => (c.hexes = [hex])), 'k2')).toThrow(/Notiz|leeres Feld/);
    }
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
    expect(fromCampaignFile(text, 'k2').hexes).toEqual([{ column: 4, row: 4, empty: false, navalBase: false, scoutBase: false, worlds: [{ id: '0404', kind: 'world', uwp: { starport: 31 } }], main: '0404' }]);
    const wrong = fileWith((c) => (c.hexes = [{ column: 1, row: 1, rolls: [{ kind: 'size', dice: [3, 3], dm: -2 }] }]));
    expect(() => fromCampaignFile(wrong, 'k2')).toThrow(/verletzt eine Regel: .*Vorkommen/);
  });
});

describe('Kampagnendatei mit Schiffen', () => {
  /** Eine Kampagne mit zwei gekauften Schiffen: das erste ausgeblendet, das zweite aktiv. */
  function withShips(): Campaign {
    const clock = fixedClock();
    const funds = book(createCampaign(undefined, 'Mit Schiff'), 'income', 120_000_000, clock, 'Testgeld');
    return buyShip(buyShip(funds, 'S', 'cash', clock), 'A', 'cash', clock);
  }

  it('nimmt Schiffe und Schiffs-Buchungen unverändert mit', () => {
    const original = withShips();
    const read = fromCampaignFile(toCampaignFile(original), 'k3');
    expect(read).toEqual({ ...original, id: 'k3', key: 'key-k3' });
    expect(read.ships.map((s) => s.retired)).toEqual([true, false]);
    expect(read.bookings.filter((b) => b.kind === 'ship')).toHaveLength(2);
  });

  it('liest eine Datei von vor den Schiffen mit leerer Schiffsliste', () => {
    const text = JSON.parse(toCampaignFile(withShips())) as { campaign: Record<string, unknown> };
    delete text.campaign.ships;
    text.campaign.bookings = (text.campaign.bookings as { kind: string }[]).filter((b) => b.kind !== 'ship');
    expect(fromCampaignFile(JSON.stringify(text), 'k3').ships).toEqual([]);
  });

  const idVon = (c: Campaign, name: string): CharacterId => c.characters.find((x) => x.name === name)!.id;

  /** Die Demo mit Yacht (Entwurf A, Rechner Modell/1: 2/4) und Beiboot. */
  function fahrt(): Campaign {
    return createDemoCampaign(fixedClock());
  }
  const yachtVon = (c: Campaign) => c.ships.find((s) => s.mother === undefined)!;

  it('legt die Ablagen von selbst hin, wenn eine Datei von vor 2026-11-22d keine kennt', () => {
    const text = JSON.parse(toCampaignFile(fahrt())) as { campaign: { ships: Record<string, unknown>[] } };
    for (const s of text.campaign.ships) {
      delete s.crew;
      s.software = (s.software as { program: string }[]).map((p) => ({ program: p.program }));
    }
    const yacht = yachtVon(fromCampaignFile(JSON.stringify(text), 'k3'));
    // Maneuver und Target laufen, der Rest liegt bereit, die Bibliothek ist angelegt; die Posten sind leer.
    expect(yacht.software.filter((p) => p.slot === 'cpu').map((p) => p.program).sort()).toEqual(['maneuver', 'target']);
    expect(yacht.software.filter((p) => p.slot === 'storage').map((p) => p.program).sort()).toEqual(['anti-hijack', 'generate', 'jump-1', 'navigation']);
    expect(yacht.software.filter((p) => p.slot === 'archive').map((p) => p.program)).toEqual(['library']);
    expect(crewOf(yacht).every((p) => p.who === undefined)).toBe(true);
  });

  it('gibt ein Schiff ohne Target wieder mit Target, weil es einen Turret hat', () => {
    let c = fahrt();
    const yacht = yachtVon(c);
    c = { ...c, ships: c.ships.map((s) => (s.id === yacht.id ? { ...s, software: s.software.filter((p) => p.program !== 'target') } : s)) };
    const gelesen = yachtVon(fromCampaignFile(toCampaignFile(c), 'k3'));
    expect(gelesen.software.some((p) => p.program === 'target' && p.slot === 'cpu')).toBe(true);
  });

  it('nimmt Crew und Ablagen unverändert mit', () => {
    const original = seat(fahrt(), yachtVon(fahrt()).id, 0, idVon(fahrt(), 'Jonas Reyl'));
    const read = fromCampaignFile(toCampaignFile(original), 'k3');
    expect(read.ships).toEqual(original.ships);
    expect(crewOf(yachtVon(read))[0]).toMatchObject({ post: 'pilot', who: idVon(original, 'Jonas Reyl') });
  });

  it('gibt einem gelöschten Charakter seine Posten zurück, die eine alte Datei noch nennt', () => {
    const text = JSON.parse(toCampaignFile(fahrt())) as { campaign: { ships: { crew?: unknown[] }[] } };
    for (const s of text.campaign.ships) s.crew = [{ post: 'pilot', who: 'wars-einmal' }];
    expect(crewOf(yachtVon(fromCampaignFile(JSON.stringify(text), 'k3')))[0]).toEqual({ post: 'pilot' });
  });

  it('löscht einen Charakter mitsamt seinen Posten', () => {
    const c = seat(fahrt(), yachtVon(fahrt()).id, 0, idVon(fahrt(), 'Jonas Reyl'));
    const read = fromCampaignFile(toCampaignFile(removeCharacter(c, idVon(c, 'Jonas Reyl'))), 'k3');
    expect(crewOf(yachtVon(read))[0]).toEqual({ post: 'pilot' });
  });

  it('legt eine Verteilung über dem Platz der CPU beim Lesen neu hin', () => {
    const text = JSON.parse(toCampaignFile(fahrt())) as { campaign: { ships: { software?: { slot: string }[] }[] } };
    for (const s of text.campaign.ships) for (const p of s.software ?? []) p.slot = 'cpu';
    const yacht = yachtVon(fromCampaignFile(JSON.stringify(text), 'k3'));
    expect(yacht.software.filter((p) => p.slot === 'cpu').map((p) => p.program).sort()).toEqual(['maneuver', 'target']);
  });

  it('weist ein Schiff mit unbekanntem Entwurf zurück', () => {
    const text = JSON.parse(toCampaignFile(withShips())) as { campaign: { ships: { design: string }[] } };
    text.campaign.ships[0]!.design = 'X';
    expect(() => fromCampaignFile(JSON.stringify(text), 'k3')).toThrow(/Schiffsentwurf|keine gültige/);
  });
});
