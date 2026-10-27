import { describe, expect, it } from 'vitest';
import { ReferenceDataSchema, referenceData, type Column } from './index';

describe('Referenzdaten', () => {
  it('sind gültig', () => {
    expect(referenceData.odds.map((o) => o.name)).toEqual(['Hoch', 'Mittel', 'Gering']);
    expect(referenceData.odds.map((o) => [o.chance, o.target])).toEqual([
      [75, 6],
      [50, 8],
      [25, 10],
    ]);
  });

  it('haben die Bereiche der GMA2e-Karte in Kartenreihenfolge, dann die Themen-Tafeln', () => {
    expect(referenceData.sections.map((s) => `${s.kind}:${s.name}`)).toEqual([
      'card:Zufallsereignis',
      'card:Sinneseindrücke',
      'card:Szenentyp',
      'card:Besitz',
      'card:Situation',
      'card:Namen',
      'card:Merkmale',
      'card:Flavortext',
      'theme:Auftrag',
      'theme:NSC',
      'theme:NSC-Aktionen',
      'theme:Begegnung',
      'theme:Welt',
      'theme:Wesen',
      'theme:Handlung',
      'theme:Schiff',
      'theme:Handel',
    ]);
  });

  const slot = (id: string) => referenceData.sections.flatMap((s) => s.slots).find((s) => s.id === id)!;
  const active = (column: Column) => column.entries.filter((e) => !e.retired);

  it('machen aus jeder Mythic-Tabelle ein Feld mit zwei Spalten, Actions und Descriptions mit verschiedenen Spalten', () => {
    const event = referenceData.sections[0]!.slots.filter((s) => s.columns.every((c) => active(c).length > 0));
    expect(event.map((s) => [s.label, s.columns.map((c) => active(c)[0]!.text)])).toEqual([
      ['Aktion', ['aufgeben', 'Vorteil']],
      ['Beschreibung', ['abenteuerlustig', 'abnorm']],
    ]);
    const appearance = slot('mythic.npc.appearance');
    expect(appearance.columns.map((c) => c.entries.length)).toEqual([100, 100]);
    expect(appearance.columns[0]!.entries.map((e) => e.text)).toEqual(appearance.columns[1]!.entries.map((e) => e.text));
    expect(appearance.columns.map((c) => c.entries[0]!.id)).toEqual(['npc.appearance.1.mythic.1', 'npc.appearance.2.mythic.1']);
  });

  it('blenden die Felder aus der Zeit vor den Paaren aus', () => {
    for (const id of ['event.verb', 'event.adjective', 'event.noun', 'senses.hear', 'senses.see', 'senses.feel', 'senses.smell', 'npc.occupation', 'mythic.npc.skills', 'mythic.creatures.ability']) {
      expect(slot(id).columns.flatMap(active)).toEqual([]);
    }
  });

  it('ziehen nur Paare: aus Mythic und die Namen', () => {
    const visible = referenceData.sections.flatMap((s) => s.slots).filter((s) => s.columns.every((c) => active(c).length > 0));
    const own = (id: string) => id.includes('.mythic.') || /^names\.\w+\.(first|last)\./.test(id);
    expect(visible.every((s) => s.columns.length === 2 && s.columns.flatMap(active).every((e) => own(e.id)))).toBe(true);
    expect(visible.slice(0, 4).map((s) => s.label)).toEqual(['Aktion', 'Beschreibung', 'Hören', 'Riechen']);
  });

  it('ziehen je Namensfeld Vor- und Nachname; die Platzhalter bleiben ausgeblendet', () => {
    for (const id of ['names.female', 'names.male', 'names.neutral']) {
      const [first, last] = slot(id).columns;
      expect(active(first!)).toHaveLength(100);
      expect(first!.entries.filter((e) => e.retired)).toHaveLength(12);
      expect(active(last!)).toHaveLength(300);
      expect(last!.entries.every((e) => e.id.startsWith(`${id}.last.`))).toBe(true);
    }
    // Die drei Felder haben verschiedene Vornamen, aber dieselben Nachnamen.
    const firstNames = (id: string) => active(slot(id).columns[0]!).map((e) => e.text);
    const all = [...firstNames('names.female'), ...firstNames('names.male'), ...firstNames('names.neutral')];
    expect(new Set(all).size).toBe(300);
    expect(active(slot('names.female').columns[1]!).map((e) => e.text)).toEqual(active(slot('names.male').columns[1]!).map((e) => e.text));
  });

  it('ordnen die Mythic-Tabellen den Themen zu', () => {
    const tables = (id: string) =>
      referenceData.sections
        .find((s) => s.id === id)!
        .slots.filter((s) => s.columns.every((c) => active(c).length > 0))
        .map((s) => s.label);
    expect(tables('npc')).toEqual(['Aussehen', 'Persönlichkeit', 'Motivation', 'Hintergrund', 'Identität', 'Eigenschaft & Schwäche']);
    expect(tables('npc-actions')).toEqual(['Gespräch', 'Kampfaktion', 'Aktion']);
    expect(tables('world')).toEqual(['Ort', 'Stadt', 'Schiff', 'Zivilisation', 'Gelände', 'Behausung']);
    expect(tables('ship')).toEqual([]);
    expect(tables('creatures')).toEqual(['Spezies', 'Kreatur', 'Tierverhalten']);
    expect(tables('plot')).toEqual(['Wendung', 'Stimmung', 'Botschaft', 'Gegenstand', 'Fund']);
    expect(active(slot('mythic.npc.appearance').columns[0]!).slice(0, 3).map((e) => e.text)).toEqual(['abnorm', 'bewaffnet', 'aromatisch']);
  });

  it('behalten die Ids der Einträge, auch wenn eine Tabelle in einen anderen Bereich umzieht', () => {
    const conversation = slot('mythic.npc.conversation');
    expect(referenceData.sections.find((s) => s.slots.includes(conversation))!.name).toBe('NSC-Aktionen');
    expect(conversation.columns.map((c) => c.entries[0]!.id)).toEqual(['npc.conversation.1.mythic.1', 'npc.conversation.2.mythic.1']);
  });

  it('verlangen mindestens ein sichtbares Feld', () => {
    const sections = referenceData.sections.map((section) => ({
      ...section,
      slots: section.slots.map((s) => ({ ...s, columns: s.columns.map((c, i) => (i === 0 ? { entries: c.entries.map((e) => ({ ...e, retired: true })) } : c)) })),
    }));
    expect(() => ReferenceDataSchema.parse({ ...referenceData, sections })).toThrow(/Kein Feld ist sichtbar/);
  });

  it('erlauben höchstens zwei Spalten je Feld', () => {
    const [first, ...rest] = referenceData.sections;
    const [s0, ...others] = first!.slots;
    const three = { ...s0!, columns: [...s0!.columns, ...s0!.columns.slice(0, 1)] };
    expect(() => ReferenceDataSchema.parse({ ...referenceData, sections: [{ ...first!, slots: [three, ...others] }, ...rest] })).toThrow();
  });

  it('weisen doppelte Ids zurück', () => {
    const broken = { ...referenceData, skills: [...referenceData.skills, { id: 'pilot', name: 'Noch ein Pilot', short: 'NeP' }] };
    expect(() => ReferenceDataSchema.parse(broken)).toThrow(/pilot kommt doppelt vor/);
  });

  it('verlangen für jede Fertigkeit ein eigenes Kürzel aus drei Zeichen', () => {
    const twice = { ...referenceData, skills: [...referenceData.skills, { id: 'piloting', name: 'Piloting', short: 'Pil' }] };
    expect(() => ReferenceDataSchema.parse(twice)).toThrow(/Kürzel Pil kommt doppelt vor/);
    const long = { ...referenceData, skills: [...referenceData.skills, { id: 'piloting', name: 'Piloting', short: 'Pilo' }] };
    expect(() => ReferenceDataSchema.parse(long)).toThrow();
  });

  it('weisen Beispielcharaktere mit unbekannter Fertigkeit zurück', () => {
    const [kira] = referenceData.examples;
    const broken = { ...referenceData, examples: [{ ...kira!, skills: [{ of: 'telepathy', level: 1 }] }] };
    expect(() => ReferenceDataSchema.parse(broken)).toThrow(/Unbekannte Fertigkeit telepathy/);
  });

  it('weisen Beispielcharaktere mit unbekanntem Gegenstand zurück', () => {
    const [kira] = referenceData.examples;
    const broken = { ...referenceData, examples: [{ ...kira!, possessions: [{ of: 'lightsaber', count: 1 }] }] };
    expect(() => ReferenceDataSchema.parse(broken)).toThrow(/Unbekannter Gegenstand lightsaber/);
  });

  it('haben die sechs Laufbahnen des Regelwerks mit den Würfen der Prior Service Table', () => {
    const [navy, marines, army, scouts, merchants, other] = referenceData.services;
    expect(referenceData.services.map((s) => `${s.draft}:${s.name}`)).toEqual(['1:Navy', '2:Marines', '3:Army', '4:Scouts', '5:Merchants', '6:Other']);
    expect(navy!.enlistment).toEqual({ target: 8, dms: [{ characteristic: 'INT', atLeast: 8, dm: 1 }, { characteristic: 'EDU', atLeast: 9, dm: 2 }] });
    expect(referenceData.services.map((s) => s.reenlist)).toEqual([6, 6, 7, 3, 4, 5]);
    expect(merchants!.ranks.map((r) => r.title)).toEqual(['4th Officer', '3rd Officer', '2nd Officer', '1st Officer', 'Captain']);
    expect(scouts!.commission).toBeUndefined();
    expect(scouts!.skillsPerTerm).toBe(2);
    expect(marines!.onEnlistment).toEqual({ id: 'marines.enlistment', skill: 'cutlass', weapon: false });
    expect(army!.ranks[0]!.grants).toEqual({ id: 'army.rank.1', skill: 'submachinegun', weapon: false });
    expect(other!.skills[0]!.rows[5]).toEqual({ id: 'other.personal.6', characteristic: 'SOC', change: -1, weapon: false });
    expect(navy!.cash.rows.map((r) => r.credits)).toEqual([1000, 5000, 5000, 10000, 20000, 50000, 50000]);
    expect(scouts!.benefits.rows.map((r) => r.item ?? r.choose ?? r.characteristic ?? '-')).toEqual(['low-passage', 'INT', 'EDU', 'blade-combat', 'gun-combat', 'scout-ship', '-']);
  });

  it('haben jede Waffe aus Blade und Gun Combat genau einmal als Gegenstand', () => {
    const weapons = referenceData.items.filter((i) => i.kind === 'weapon');
    expect(weapons.find((w) => w.uses === 'auto-pistol')).toMatchObject({ name: 'Automatic Pistol', tl: 5, weight: 0.75, price: 200 });
    expect(weapons.find((w) => w.name === 'Club')).toMatchObject({ tl: 0, weight: 1 });
    expect(weapons.find((w) => w.name === 'Club')!.price).toBeUndefined();
  });

  it('rechnen Tonnen in kg und KCr bzw. MCr in Cr um', () => {
    const item = (id: string) => referenceData.items.find((i) => i.id === id)!;
    expect(item('vehicle-air-raft')).toMatchObject({ kind: 'vehicle', tl: 8, weight: 4000, price: 600_000 });
    expect(item('craft-ship-s-boat')).toMatchObject({ kind: 'ship', price: 16_000_000 });
    expect(item('craft-ship-s-boat').weight).toBeUndefined();
    expect(item('free-trader')).toMatchObject({ price: 37_080_000, once: false });
    expect(item('travellers-aid-society')).toMatchObject({ kind: 'membership', once: true });
    expect(item('vehicle-grav-belt').note).toMatch(/Druckfehler/);
    expect(referenceData.items.filter((i) => i.name === 'Vacc Suit').map((i) => i.tl)).toEqual([8, 9, 10, 11, 12, 13]);
  });

  it('weisen einen Zugewinn zurück, der mehr als eins bringt', () => {
    const [navy, ...rest] = referenceData.services;
    const rows = navy!.cash.rows.map((r, i) => (i === 0 ? { ...r, item: 'low-passage' } : r));
    const broken = { ...referenceData, services: [{ ...navy!, cash: { ...navy!.cash, rows } }, ...rest] };
    expect(() => ReferenceDataSchema.parse(broken)).toThrow(/navy.cash.1 bringt mehr als eins/);
  });
});
