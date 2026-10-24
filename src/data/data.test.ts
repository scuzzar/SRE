import { describe, expect, it } from 'vitest';
import { ReferenceDataSchema, referenceData } from './index';

describe('Referenzdaten', () => {
  it('sind gültig', () => {
    expect(referenceData.odds.map((o) => o.name)).toEqual(['Hoch', 'Mittel', 'Gering']);
    expect(referenceData.odds.map((o) => [o.chance, o.target])).toEqual([
      [75, 6],
      [50, 8],
      [25, 10],
    ]);
  });

  it('haben die Bereiche der GMA2e-Karte in Kartenreihenfolge, dann die Themen-Reiter', () => {
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
      'theme:Begegnung',
      'theme:Welt',
      'theme:Schiff',
      'theme:Handel',
      'theme:Wesen',
      'theme:Handlung',
    ]);
  });

  it('ziehen das Zufallsereignis aus den Mythic-Tabellen, die alten Einträge sind ausgeblendet', () => {
    const event = referenceData.sections[0]!;
    expect(event.slots.map((s) => [s.label, s.entries.filter((e) => !e.retired).length, s.entries.filter((e) => e.retired).length])).toEqual([
      ['Verb', 100, 12],
      ['Adjektiv', 100, 12],
      ['Substantiv', 100, 12],
    ]);
    expect(event.slots.map((s) => s.entries.find((e) => !e.retired)!.text)).toEqual(['aufgeben', 'abnorm', 'Vorteil']);
  });

  it('ziehen Hören und Riechen aus den Mythic-Tabellen, Sehen und Fühlen sind ausgeblendet', () => {
    const senses = referenceData.sections[1]!;
    expect(senses.slots.map((s) => [s.label, s.entries.filter((e) => !e.retired).length, s.entries.filter((e) => e.retired).length])).toEqual([
      ['Hören', 100, 8],
      ['Sehen', 0, 8],
      ['Fühlen', 0, 8],
      ['Riechen', 100, 8],
    ]);
    expect(senses.slots.map((s) => s.entries.find((e) => !e.retired)?.text)).toEqual(['Aktivität', undefined, undefined, 'beißend']);
  });

  it('haben nur in den Mythic-Feldern Einträge, die nicht ausgeblendet sind', () => {
    const drawable = referenceData.sections.flatMap((s) => s.slots).filter((slot) => slot.entries.some((e) => !e.retired));
    expect(drawable.every((slot) => slot.entries.filter((e) => !e.retired).every((e) => e.id.includes('.mythic.')))).toBe(true);
    expect(drawable.slice(0, 5).map((slot) => slot.id)).toEqual(['event.verb', 'event.adjective', 'event.noun', 'senses.hear', 'senses.smell']);
  });

  it('ordnen die Mythic-Tabellen den Themen zu, je Tabelle zwei Felder mit gleicher Beschriftung', () => {
    const tables = (id: string) => {
      const slots = referenceData.sections.find((s) => s.id === id)!.slots.filter((slot) => slot.id.endsWith('.1') || slot.id.endsWith('.2'));
      return slots.filter((_, i) => i % 2 === 0).map((slot) => slot.label);
    };
    expect(tables('npc')).toEqual([
      'Aussehen',
      'Persönlichkeit',
      'Motivation',
      'Hintergrund',
      'Identität',
      'Fertigkeit',
      'Eigenschaft & Schwäche',
      'Gespräch',
      'Kampfaktion',
      'Aktion',
    ]);
    expect(tables('world')).toEqual(['Zivilisation', 'Stadt', 'Gelände', 'Behausung', 'Ort']);
    expect(tables('ship')).toEqual(['Raumschiff']);
    expect(tables('creatures')).toEqual(['Spezies', 'Kreatur', 'Fähigkeit', 'Tierverhalten']);
    expect(tables('plot')).toEqual(['Wendung', 'Stimmung', 'Botschaft', 'Gegenstand', 'Fund']);
    const npc = referenceData.sections.find((s) => s.id === 'npc')!.slots;
    const [first, second] = [npc.find((s) => s.id === 'npc.appearance.1')!, npc.find((s) => s.id === 'npc.appearance.2')!];
    expect([first.label, second.label]).toEqual(['Aussehen', 'Aussehen']);
    expect(first.entries.map((e) => e.text)).toEqual(second.entries.map((e) => e.text));
    expect([first.entries[0]!.id, second.entries[0]!.id]).toEqual(['npc.appearance.1.mythic.1', 'npc.appearance.2.mythic.1']);
    expect(first.entries.slice(0, 3).map((e) => e.text)).toEqual(['abnorm', 'bewaffnet', 'aromatisch']);
  });

  it('verlangen mindestens ein Feld mit einem Eintrag, der nicht ausgeblendet ist', () => {
    const sections = referenceData.sections.map((section) => ({
      ...section,
      slots: section.slots.map((slot) => ({ ...slot, entries: slot.entries.map((e) => ({ ...e, retired: true })) })),
    }));
    expect(() => ReferenceDataSchema.parse({ ...referenceData, sections })).toThrow(/Kein Feld hat einen Eintrag/);
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
