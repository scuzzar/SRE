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
      'theme:Schiff',
      'theme:Wesen',
      'theme:Handlung',
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
    for (const id of ['event.verb', 'event.adjective', 'event.noun', 'senses.hear', 'senses.see', 'senses.feel', 'senses.smell', 'npc.occupation', 'mythic.npc.skills']) {
      expect(slot(id).columns.flatMap(active)).toEqual([]);
    }
  });

  it('ziehen nur Paare aus Mythic', () => {
    const visible = referenceData.sections.flatMap((s) => s.slots).filter((s) => s.columns.every((c) => active(c).length > 0));
    expect(visible.every((s) => s.columns.length === 2 && s.columns.flatMap(active).every((e) => e.id.includes('.mythic.')))).toBe(true);
    expect(visible.slice(0, 4).map((s) => s.label)).toEqual(['Aktion', 'Beschreibung', 'Hören', 'Riechen']);
  });

  it('ordnen die Mythic-Tabellen den Themen zu', () => {
    const tables = (id: string) =>
      referenceData.sections
        .find((s) => s.id === id)!
        .slots.filter((s) => s.columns.every((c) => active(c).length > 0))
        .map((s) => s.label);
    expect(tables('npc')).toEqual(['Aussehen', 'Persönlichkeit', 'Motivation', 'Hintergrund', 'Identität', 'Eigenschaft & Schwäche']);
    expect(tables('npc-actions')).toEqual(['Gespräch', 'Kampfaktion', 'Aktion']);
    expect(tables('world')).toEqual(['Zivilisation', 'Stadt', 'Gelände', 'Behausung', 'Ort']);
    expect(tables('ship')).toEqual(['Raumschiff']);
    expect(tables('creatures')).toEqual(['Spezies', 'Kreatur', 'Fähigkeit', 'Tierverhalten']);
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
});
