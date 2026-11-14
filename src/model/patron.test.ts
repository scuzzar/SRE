import { describe, expect, it } from 'vitest';
import { addCharacter, appendLog, createCampaign, inputOf, roleOf, setGeneration, setHexes, updateCharacter, type Campaign, type NpcRole } from './campaign';
import { replay } from './career';
import { adoptNpc, currentEncounter, rollEncounter } from './encounter';
import { startGeneration } from './generation';
import type { PatronRoll } from './log';
import type { Random } from './ports';
import { setLocation } from './shop';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { allowedWeapons, armGenerated, generateNpc, npcGroups } from './npcs';
import { createPatronNpc, patronDmParts, patronDms, patronNpcBlocker, patronOfRoll, patronRollOf, rollPatron, rollRumor, rumorOfRoll, rumorRollOf } from './patron';
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

  it('Gerücht: die Rumors Matrix führt jeden Wurf 11 bis 66 auf ein Gerücht A bis Z, der erste Würfel ist die Spalte', () => {
    expect(ref.encounters.rumors.map((r) => r.letter).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(ref.encounters.rumors.filter((r) => r.general).map((r) => r.letter).join('')).toBe('UVWXYZ');
    const at = (first: number, second: number) => rumorOfRoll(rollRumor(fixedRandom(first, second), fixedClock())).letter;
    // Die Zeilen der Matrix (2. Würfel 1 bis 6), je von links nach rechts (1. Würfel 1 bis 6).
    expect([1, 2, 3, 4, 5, 6].map((second) => [1, 2, 3, 4, 5, 6].map((first) => at(first, second)).join(''))).toEqual(['ABCDEF', 'GUUWWH', 'IUYYWJ', 'KXZZVL', 'MXXVVN', 'OPQRST']);
    expect(rumorRollOf(rollRumor(fixedRandom(6, 2), fixedClock()))).toBe(62);
  });

  it('übersteht die Kampagnendatei', () => {
    const campaign = appendLog(createCampaign(), rollPatron(createCampaign(), 2, fixedRandom(4, 2), fixedClock()), rollRumor(fixedRandom(3, 3), fixedClock('2026-10-23T15:00:00.000Z')));
    const loaded = fromCampaignFile(toCampaignFile(campaign), campaign.id);
    expect(loaded.log).toEqual(campaign.log);
  });
});

/** Ein reproduzierbarer Zufall für ganze Läufe der Charaktererschaffung. */
function seeded(start: number): Random {
  let seed = start;
  return {
    int(min: number, max: number) {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return min + (Math.floor(seed / 65536) % (max - min + 1));
    },
  };
}

/** Eine Kampagne auf der Welt 0101 mit einem Patron-Wurf auf Liste `list`, Würfel `a` und `b`, an Stelle 0 des Logs. */
function withPatron(list: 1 | 2, a: number, b: number, located = true): Campaign {
  const hexes = [{ ...ref.demoWorld, column: 1, row: 1, name: 'Regina' }, { ...ref.demoWorld, column: 2, row: 2, name: 'Fels' }];
  const placed = setHexes(createCampaign([]), hexes);
  const campaign = located ? setLocation(placed, '0101') : placed;
  return appendLog(campaign, { kind: 'patron', at: '2026-10-23T14:00:00.000Z', list, dice: [a, b], dms: [0, 0] });
}

describe('Patron als NSC (2026-11-14, Laufbahn 2026-11-14b)', () => {
  it('erzeugt einen dauerhaften NSC in der Laufbahn des Patrons, mit Rolle Patron, Ort und Verweis', () => {
    // Liste eins, 15: Smuggler, Laufbahn Merchants.
    const { campaign, id } = createPatronNpc(withPatron(1, 1, 5), 0, seeded(7));
    const npc = campaign.characters.find((c) => c.id === id)!;
    expect(npc).toMatchObject({ npc: true, role: 'patron', place: '0101', patron: { list: 1, roll: 15 } });
    expect(npc.background).toMatch(/^Smuggler · Ex-Merchants · /);
    expect(npc.name).not.toBe('');
    const state = replay(npc.career!);
    expect(state.step).toBe('name');
    expect(state.service?.id).toBe('merchants');
    expect(['0101', '0202']).toContain(npc.homeworld);
    // Ein NSC steht nicht oben.
    expect(campaign.focus).toBeUndefined();
  });

  it('beginnt von vorn, bis er in seiner Laufbahn gedient und überlebt hat: immer Navy beim Naval Officer', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { campaign, id } = createPatronNpc(withPatron(2, 1, 1), 0, seeded(seed));
      const npc = campaign.characters.find((c) => c.id === id)!;
      expect(replay(npc.career!).service?.id).toBe('navy');
      expect(replay(npc.career!).drafted).toBe(false);
      expect(npc.dead).toBe(false);
      // Eine Waffe aus der Abmusterung ist seine Primärwaffe und in der Hand.
      expect(npc.wields).toBe(npc.primary);
    }
  });

  it('lässt die offene Charaktererschaffung der Kampagne in Ruhe', () => {
    const open = setGeneration(withPatron(1, 1, 5), startGeneration());
    const { campaign } = createPatronNpc(open, 0, seeded(3));
    expect(campaign.generation).toEqual(open.generation);
  });

  it('geht nicht bei einem Gerücht, ohne Aufenthaltsort oder ohne Patron-Wurf an der Stelle', () => {
    expect(() => createPatronNpc(withPatron(1, 2, 3), 0, seeded(1))).toThrow(/Gerücht/);
    const nowhere = withPatron(1, 1, 5, false);
    expect(patronNpcBlocker(nowhere, nowhere.log[0] as PatronRoll)).toMatch(/Aufenthaltsort/);
    expect(() => createPatronNpc(nowhere, 0, seeded(1))).toThrow(/Aufenthaltsort/);
    expect(() => createPatronNpc(withPatron(1, 1, 5), 1, seeded(1))).toThrow(/kein Patron-Wurf/);
  });

  it('bleibt beim Export und Import mit Rolle, Ort und Patron erhalten; ein SC mit Rolle ist ungültig', () => {
    const { campaign, id } = createPatronNpc(withPatron(1, 1, 5), 0, seeded(5));
    const back = fromCampaignFile(toCampaignFile(campaign), 'k9');
    expect(back.characters.find((c) => c.id === id)).toEqual(campaign.characters.find((c) => c.id === id));
    const pc = { ...campaign, characters: campaign.characters.map((c) => (c.id === id ? { ...c, npc: false } : c)) };
    expect(() => fromCampaignFile(toCampaignFile(pc), 'k9')).toThrow(/kein NSC/);
  });
});

describe('Rolle und Ort eines NSC', () => {
  const hexes = [{ ...ref.demoWorld, column: 1, row: 1, name: 'Regina' }];
  const base = setLocation(setHexes(createCampaign([]), hexes), '0101');
  const input = { name: 'Mara', background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [] };

  it('gibt einem neuen NSC ohne Angabe die Rolle Sonstige; NSC von früher gelten als Sonstige', () => {
    const { campaign, id } = addCharacter(base, { ...input, npc: true });
    const npc = campaign.characters.find((c) => c.id === id)!;
    expect(npc.role).toBe('other');
    expect(npc.place).toBeUndefined();
    const old = Object.fromEntries(Object.entries(npc).filter(([key]) => key !== 'role')) as unknown as typeof npc;
    expect(roleOf(old)).toBe('other');
  });

  it('nimmt Rolle und Ort weg, wenn der NSC zum SC wird; der Patron bleibt; zurück zum NSC ist er Sonstige', () => {
    const { campaign, id } = addCharacter(base, { ...input, npc: true, role: 'ally', place: '0101', patron: { list: 1, roll: 15 } });
    const asPc = updateCharacter(campaign, id, { ...inputOf(campaign.characters.find((c) => c.id === id)!), npc: false });
    const pc = asPc.characters.find((c) => c.id === id)!;
    expect(pc.role).toBeUndefined();
    expect(pc.place).toBeUndefined();
    expect(pc.patron).toEqual({ list: 1, roll: 15 });
    const back = updateCharacter(asPc, id, { ...inputOf(pc), npc: true });
    expect(back.characters.find((c) => c.id === id)!.role).toBe('other');
  });

  it('weist eine Welt zurück, die es nicht gibt, und eine unbekannte Rolle', () => {
    expect(() => addCharacter(base, { ...input, npc: true, place: '0808' })).toThrow();
    expect(() => addCharacter(base, { ...input, npc: true, role: 'jedi' as NpcRole })).toThrow(/Rolle jedi/);
  });

  it('übernimmt einen NSC der Begegnung als dauerhaften NSC mit Rolle Begegnung auf dem Aufenthaltsort', () => {
    const rolled = rollEncounter(base, fixedRandom(1, 1), fixedClock(), 11, 2);
    const [first, second] = currentEncounter(rolled.campaign)!.npcs;
    let campaign = adoptNpc(rolled.campaign, first!.id, true);
    campaign = adoptNpc(campaign, second!.id, false);
    expect(campaign.characters.find((c) => c.id === first!.id)).toMatchObject({ npc: true, role: 'encounter', place: '0101' });
    const pc = campaign.characters.find((c) => c.id === second!.id)!;
    expect(pc.npc).toBe(false);
    expect(pc.role).toBeUndefined();
  });
});

describe('Reiter NSC: Filter und Gruppen', () => {
  const hexes = [
    { ...ref.demoWorld, column: 1, row: 1, name: 'Regina' },
    { ...ref.demoWorld, column: 2, row: 2, name: 'Efate' },
  ];
  const input = (name: string, role: NpcRole, place?: string) => ({ name, background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 }, skills: [], npc: true, role, ...(place ? { place } : {}) });
  let campaign = setLocation(setHexes(createCampaign([]), hexes), '0101');
  for (const i of [input('Zora', 'patron', '0101'), input('Abel', 'patron', '0101'), input('Kim', 'crew'), input('Ugo', 'enemy', '0101'), input('Bea', 'merchant', '0202')]) campaign = addCharacter(campaign, i).campaign;
  const names = (groups: ReturnType<typeof npcGroups>) => groups.map((w) => [w.name ?? '–', w.roles.map((r) => [r.role, r.npcs.map((n) => n.name)])]);

  it('zeigt vorgegeben die NSC des Aufenthaltsorts und die ohne Ort, nach Rolle und darin nach Namen', () => {
    expect(names(npcGroups(campaign, false))).toEqual([['Regina', [['patron', ['Abel', 'Zora']], ['enemy', ['Ugo']], ['crew', ['Kim']]]]]);
  });

  it('zeigt mit „Alle zeigen“ alle nach Welt, ohne Ort am Ende; ohne Aufenthaltsort ebenso', () => {
    const all = [
      ['Efate', [['merchant', ['Bea']]]],
      ['Regina', [['patron', ['Abel', 'Zora']], ['enemy', ['Ugo']]]],
      ['–', [['crew', ['Kim']]]],
    ];
    expect(names(npcGroups(campaign, true))).toEqual(all);
    const nowhere = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'location')) as unknown as typeof campaign;
    expect(names(npcGroups(nowhere, false))).toEqual(all);
  });
});

describe('Waffen erzeugter NSC (2026-11-14c)', () => {
  // Demo-Welt mit TL 12 und Gesetz 0 als Grundlage.
  const world = (tech: number, law: number) => ({ ...ref.demoWorld, column: 1, row: 1, name: 'Regina', uwp: { ...ref.demoWorld.uwp, tech, law } });
  const npc = (soc: number, skills: { of: string; level: number }[] = []) => ({ name: 'Ilse', background: '', equipment: '', credits: 0, note: '', upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc }, skills });
  const ids = (soc: number, tech = 12, law = 0, ignore = false) => allowedWeapons(soc, world(tech, law), ignore).map((w) => w.id);

  it('erlaubt nach SOC: bis 5 billige Nahkampfwaffen, ab 6 Pistolen und Klingen, ab 10 Gewehre und Laser', () => {
    expect(ids(5)).toEqual(['club', 'dagger', 'blade', 'spear', 'pike', 'cudgel']);
    expect(ids(6)).toEqual(expect.arrayContaining(['automatic-pistol', 'revolver', 'shotgun', 'cutlass']));
    expect(ids(6)).not.toContain('rifle');
    expect(ids(10)).toEqual(expect.arrayContaining(['rifle', 'auto-rifle', 'laser-rifle']));
  });

  it('schränkt nach TL und Gesetz der Welt ein; wer das Gesetz ignoriert, hat wieder alles', () => {
    expect(ids(12, 7)).not.toContain('laser-carbine');
    expect(ids(12, 12, 5)).not.toContain('automatic-pistol');
    expect(ids(12, 12, 5)).toContain('shotgun');
    expect(ids(12, 12, 9)).toEqual([]);
    expect(ids(12, 12, 9, true)).toContain('laser-rifle');
  });

  it('nimmt die Waffe der höchsten erlaubten Waffenfertigkeit, mit 1W4 Magazinen, als Primärwaffe in der Hand', () => {
    // Gesetzwurf 1 (gilt), dann Magazine 3. Rifle-2 geht mit SOC 7 nicht, also Auto Pistol-1.
    const armed = armGenerated(npc(7, [{ of: 'rifle', level: 2 }, { of: 'auto-pistol', level: 1 }]), world(12, 0), false, fixedRandom(1, 3));
    expect(armed).toMatchObject({ primary: 'automatic-pistol', wields: 'automatic-pistol' });
    expect(armed.possessions).toEqual([{ of: 'automatic-pistol', count: 1 }, { of: 'automatic-pistol-ammo', count: 3 }]);
  });

  it('ohne passende Fertigkeit die teuerste erlaubte Waffe der höchsten SOC-Stufe; ist keine erlaubt, keine', () => {
    expect(armGenerated(npc(4), world(12, 0), false, fixedRandom(1)).primary).toBe('blade');
    expect(armGenerated(npc(11), world(12, 0), false, fixedRandom(1, 1)).primary).toBe('laser-rifle');
    expect(armGenerated(npc(11), world(12, 9), false, fixedRandom(1)).primary).toBeUndefined();
  });

  it('ignoriert das Gesetz bei 6+ auf 1W6: Streetwise +2, verbrecherisch +2', () => {
    // Gesetz 9 verbietet alles. Wurf 2 + Streetwise 2 + verbrecherisch 2 = 6: Das Gesetz gilt nicht.
    const outlaw = armGenerated(npc(7, [{ of: 'streetwise', level: 0 }]), world(12, 9), true, fixedRandom(2, 1));
    expect(outlaw.primary).toBe('body-pistol');
    expect(armGenerated(npc(7, [{ of: 'streetwise', level: 0 }]), world(12, 9), false, fixedRandom(3, 1)).primary).toBeUndefined();
  });

  it('erzeugt einen NSC aus einer Laufbahn mit der gewählten Rolle, ohne Patron; ein Feind gilt als verbrecherisch', () => {
    const hexes = [{ ...ref.demoWorld, column: 1, row: 1, name: 'Regina' }];
    const base = setLocation(setHexes(createCampaign([]), hexes), '0101');
    const { campaign, id } = generateNpc(base, { service: 'army', role: 'enemy' }, seeded(9));
    const made = campaign.characters.find((c) => c.id === id)!;
    expect(made).toMatchObject({ npc: true, role: 'enemy', place: '0101' });
    expect(made.patron).toBeUndefined();
    expect(made.background).toMatch(/^Ex-Army/);
    expect(replay(made.career!).service?.id).toBe('army');
    expect(() => generateNpc(setHexes(createCampaign([]), hexes), { service: 'army', role: 'enemy' }, seeded(9))).toThrow(/Aufenthaltsort/);
  });
});
