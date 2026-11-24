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
    const own = (id: string) => id.includes('.mythic.') || /^npc\.names\.\w+\.(earthly|spacey)\.(first|last)\./.test(id);
    expect(visible.every((s) => s.columns.length === 2 && s.columns.flatMap(active).every((e) => own(e.id)))).toBe(true);
    expect(visible.slice(0, 4).map((s) => s.label)).toEqual(['Aktion', 'Beschreibung', 'Hören', 'Riechen']);
  });

  it('blenden den früheren Bereich Namen ganz aus; alte Ids bleiben mit ihrem Text', () => {
    for (const id of ['names.female', 'names.male', 'names.neutral']) {
      const [first, last] = slot(id).columns;
      expect(active(first!)).toEqual([]);
      expect(active(last!)).toEqual([]);
      expect(first!.entries.filter((e) => e.id.startsWith(`${id}.first.`))).toHaveLength(100);
      expect(last!.entries).toHaveLength(300);
    }
    expect(slot('names.female').columns[0]!.entries.find((e) => e.id === 'names.female.first.81')!.text).toBe('Aashira');
  });

  it('haben auf der Tafel NSC sechs Namensfelder: weiblich, männlich, neutral, je irdisch und spacig', () => {
    const npc = referenceData.sections.find((s) => s.id === 'npc')!;
    expect(npc.slots.slice(0, 6).map((s) => s.label)).toEqual(['Weiblich, irdisch', 'Männlich, irdisch', 'Neutral, irdisch', 'Weiblich, spacig', 'Männlich, spacig', 'Neutral, spacig']);
    for (const kind of ['female', 'male', 'neutral']) {
      for (const sound of ['earthly', 'spacey']) {
        const id = `npc.names.${kind}.${sound}`;
        const [first, last] = slot(id).columns;
        expect(first!.entries.every((e) => e.id.startsWith(`${id}.first.`) && !e.retired)).toBe(true);
        expect(last!.entries.every((e) => e.id.startsWith(`${id}.last.`) && !e.retired)).toBe(true);
      }
    }
    // Irdische Vornamen bekommen irdische Nachnamen, spacige spacige.
    expect(active(slot('npc.names.female.earthly').columns[1]!).map((e) => e.text)).toContain('Okonkwo');
    expect(active(slot('npc.names.female.spacey').columns[1]!).map((e) => e.text)).toContain('Bariikun');
    expect(active(slot('npc.names.female.spacey').columns[1]!).map((e) => e.text)).not.toContain('Okonkwo');
    // Jeder Vorname steht genau einmal: in einem Feld und einer Klangart.
    const firstNames = ['female', 'male', 'neutral'].flatMap((k) => ['earthly', 'spacey'].flatMap((sound) => active(slot(`npc.names.${k}.${sound}`).columns[0]!).map((e) => e.text)));
    expect(new Set(firstNames).size).toBe(firstNames.length);
    expect(active(slot('npc.names.male.spacey').columns[0]!).length).toBeGreaterThanOrEqual(40);
  });

  it('ordnen die Mythic-Tabellen den Themen zu', () => {
    const tables = (id: string) =>
      referenceData.sections
        .find((s) => s.id === id)!
        .slots.filter((s) => s.columns.every((c) => active(c).length > 0))
        .map((s) => s.label);
    expect(tables('npc').slice(6)).toEqual(['Aussehen', 'Persönlichkeit', 'Motivation', 'Hintergrund', 'Identität', 'Eigenschaft & Schwäche']);
    expect(tables('npc-actions')).toEqual(['Gespräch', 'Kampfaktion', 'Aktion']);
    expect(tables('world')).toEqual(['Ort', 'Stadt', 'Schiff', 'Zivilisation', 'Gelände', 'Behausung']);
    expect(tables('ship')).toEqual([]);
    expect(tables('creatures')).toEqual(['Spezies', 'Kreatur', 'Tierverhalten']);
    expect(tables('plot')).toEqual(['Wendung', 'Stimmung', 'Botschaft']);
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

  it('geben jedem Patron eine Laufbahn, den Gerüchten keine (docs/patron-nsc.md)', () => {
    const patrons = referenceData.encounters.patrons;
    for (const patron of patrons) expect(patron.career === undefined).toBe(patron.rumor);
    expect(patrons.find((p) => p.name === 'Smuggler')!.career).toBe('merchants');
    expect(patrons.filter((p) => p.name === 'Naval Officer').map((p) => p.career)).toEqual(['navy', 'navy', 'navy']);
    const broken = patrons.map((p) => (p.name === 'Smuggler' ? { ...p, career: 'jedi' } : p));
    expect(() => ReferenceDataSchema.parse({ ...referenceData, encounters: { ...referenceData.encounters, patrons: broken } })).toThrow(/Unbekannte Laufbahn jedi/);
  });

  it('geben jeder Waffe mit Gegenstand ein Mindest-SOC (0, 6, 10) und kennzeichnen die verbrecherischen Patrons (2026-11-14c)', () => {
    const shopWeapons = referenceData.weapons.filter((w) => referenceData.items.some((i) => i.weapon === w.id));
    // Ohne Mindest-SOC: Hände, Tierwaffen und die Bogenwaffen aus Supplement 4 (2026-11-24c).
    const bowWeapons = referenceData.cascades.find((c) => c.id === 'bow-combat')!.options;
    for (const w of shopWeapons) expect(w.minSoc === undefined).toBe(w.id === 'hands' || bowWeapons.includes(w.id));
    expect(referenceData.weapons.find((w) => w.id === 'dagger')!.minSoc).toBe(0);
    expect(referenceData.weapons.find((w) => w.id === 'automatic-pistol')!.minSoc).toBe(6);
    expect(referenceData.weapons.find((w) => w.id === 'laser-rifle')!.minSoc).toBe(10);
    expect(referenceData.weapons.find((w) => w.id === 'teeth')!.minSoc).toBeUndefined();
    const criminal = [...new Set(referenceData.encounters.patrons.filter((p) => p.criminal).map((p) => p.name))].sort();
    expect(criminal).toEqual(['Arsonist', 'Assassin', 'Cutthroat', 'Embezzler', 'Hijacker', 'Pirate', 'Rogue', 'Smuggler', 'Swindler', 'Terrorist', 'Underworld Leader']);
  });

  it('haben die Laufbahnen des Regelwerks und die zwölf aus Supplement 4 die Würfe der Prior Service Table', () => {
    const [navy, marines, army, scouts, merchants, other] = referenceData.services;
    expect(referenceData.services.map((s) => `${s.draft ?? '−'}:${s.name}`)).toEqual([
      '1:Navy', '2:Marines', '3:Army', '4:Scouts', '5:Merchants', '6:Other',
      '−:Pirate', '−:Bureaucrat', '−:Belter', '−:Sailor', '−:Diplomat', '−:Doctor', '−:Flyer',
      '−:Barbarian', '−:Rogue', '−:Noble', '−:Scientist', '−:Hunter',
    ]);
    expect(navy!.enlistment).toEqual({ target: 8, dms: [{ characteristic: 'INT', atLeast: 8, dm: 1 }, { characteristic: 'EDU', atLeast: 9, dm: 2 }] });
    expect(referenceData.services.map((s) => s.reenlist)).toEqual([6, 6, 7, 3, 4, 5, 7, 3, 7, 6, 5, 4, 6, 6, 5, 4, 5, 5]);
    expect(merchants!.ranks.map((r) => r.title)).toEqual(['4th Officer', '3rd Officer', '2nd Officer', '1st Officer', 'Captain']);
    expect(scouts!.commission).toBeUndefined();
    expect(scouts!.skillsPerTerm).toBe(2);
    expect(marines!.onEnlistment).toEqual({ id: 'marines.enlistment', skill: 'cutlass', weapon: false });
    expect(army!.ranks[0]!.grants).toEqual({ id: 'army.rank.1', skill: 'submachinegun', weapon: false });
    expect(other!.skills[0]!.rows[5]).toEqual({ id: 'other.personal.6', characteristic: 'SOC', change: -1, weapon: false });
    expect(navy!.cash.rows.map((r) => r.credits)).toEqual([1000, 5000, 5000, 10000, 20000, 50000, 50000]);
    expect(scouts!.benefits.rows.map((r) => r.item ?? r.choose ?? r.characteristic ?? r.ship ?? '-')).toEqual(['low-passage', 'INT', 'EDU', 'blade-combat', 'gun-combat', 'S', '-']);
    expect(scouts!.benefits.rows[5]).toMatchObject({ ship: 'S', shipDebtFree: true });
    expect(merchants!.benefits.rows[6]).toMatchObject({ ship: 'A' });
    expect(merchants!.benefits.rows[6]!.shipDebtFree).toBeUndefined();
  });

  it('haben die neuen Laufbahnen das, was Supplement 4 voraus hat', () => {
    const service = (id: string) => referenceData.services.find((s) => s.id === id)!;
    // Beltterer: Beginn mit 14, Überleben mit +1 je Term, Rangtafel und Patent gibt es nicht (B4 6).
    expect(service('belter')).toMatchObject({ startAge: 14 });
    expect(service('belter').survival).toEqual({ target: 9, dms: [], dmPerTerm: 1 });
    expect(service('belter').commission).toBeUndefined();
    expect(service('belter').ranks).toEqual([]);
    expect(service('belter').benefits.rows[5]).toMatchObject({ ship: 'J', shipDebtFree: true });
    // Barbar: kein Ruhestand, keine natürliche Schusswaffenkunde, nur zwei Rangstufen (B4 9).
    expect(service('barbarian')).toMatchObject({ startAge: 14, retirement: false, naturalGunSkill: false });
    expect(service('barbarian').ranks.map((r) => `${r.level}:${r.title}`)).toEqual(['2:Warrior', '5:Chief']);
    expect(service('barbarian').ranks[0]!.grants).toEqual({ id: 'barbarian.rank.2', choose: 'blade-combat', weapon: false });
    expect(service('barbarian').onEnlistment).toEqual({ id: 'barbarian.entry', skill: 'sword', weapon: false });
    // Adliger: Einstieg ohne Wurf allein aus Stand 10+ (B4 8).
    expect(service('noble').needs).toEqual({ characteristic: 'SOC', atLeast: 10 });
    expect(service('noble').ranks.map((r) => r.title)).toEqual(['B Knight', 'C Baron', 'D Marquis', 'E Count', 'F Duke']);
    expect(service('noble').benefits.rows[5]).toMatchObject({ ship: 'Y', shipDebtFree: true });
    // Arzt und Scientist: Sachwert Instruments und Laborschiff (B4 13 und 15).
    expect(service('doctor')).toMatchObject({ naturalGunSkill: false });
    expect(service('doctor').benefits.rows[4]).toMatchObject({ item: 'surgical-instruments' });
    expect(service('scientist').benefits.rows[5]).toMatchObject({ ship: 'L', shipDebtFree: true });
    expect(service('hunter').benefits.rows[5]).toMatchObject({ ship: 'K', shipDebtFree: true });
    // Der Flyer kommt mit einer Kaskade in die Laufbahn: Air Craft-1 (B4 7).
    expect(service('flyer').onEnlistment).toEqual({ id: 'flyer.entry', choose: 'air-craft', weapon: false });
  });

  it('haben die Bogenwaffen aus Supplement 4 ihre Werte ohne Magazin', () => {
    const weapon = (id: string) => referenceData.weapons.find((w) => w.id === id)!;
    // B4 S. 16: Schusswaffen ohne Magazin, Schleuder wirkt gegen jede Rüstung fast gleich.
    expect(weapon('sling')).toMatchObject({ attack: 'shot', uses: 'sling', required: 3, requiredDm: -2, advantageous: 11, advantageousDm: 1, wounds: 2 });
    for (const id of ['sling', 'short-bow', 'long-bow', 'sporting-crossbow', 'military-crossbow', 'repeating-crossbow']) {
      expect(weapon(id).rounds).toBeUndefined();
      expect(referenceData.items.find((i) => i.weapon === id)).toBeDefined();
    }
    expect(weapon('long-bow').vsArmor.map((d) => d.dm)).toEqual([1, 0, -3, -3, 1, -1, -5]);
    expect(weapon('repeating-crossbow').atRange.map((d) => d.dm ?? null)).toEqual([0, -2, 0, -10, null]);
    expect(referenceData.cascades.find((c) => c.id === 'bow-combat')!.options).toEqual(['sling', 'short-bow', 'long-bow', 'sporting-crossbow', 'military-crossbow', 'repeating-crossbow']);
  });

  it('haben jede Waffe aus Blade und Gun Combat genau einmal als Gegenstand', () => {
    const weapons = referenceData.items.filter((i) => i.kind === 'weapon');
    const uses = (id: string) => referenceData.weapons.find((w) => w.id === id)?.uses;
    expect(weapons.find((w) => w.weapon !== undefined && uses(w.weapon) === 'auto-pistol')).toMatchObject({ name: 'Automatic Pistol', tl: 5, weight: 0.75, price: 200 });
    expect(weapons.find((w) => w.name === 'Club')).toMatchObject({ tl: 0, weight: 1 });
    expect(weapons.find((w) => w.name === 'Club')!.price).toBeUndefined();
  });

  it('haben die Kampfwerte der Waffen aus den Charts (S. 4 und 6)', () => {
    const weapon = (id: string) => referenceData.weapons.find((w) => w.id === id)!;
    expect(weapon('rifle')).toMatchObject({ attack: 'shot', uses: 'rifle', required: 6, requiredDm: -2, advantageous: 8, advantageousDm: 1, wounds: 3 });
    expect(weapon('rifle').vsArmor).toEqual([
      { armor: 'nothing', dm: 3 },
      { armor: 'jack', dm: 3 },
      { armor: 'mesh', dm: 0 },
      { armor: 'cloth', dm: -3 },
      { armor: 'reflec', dm: 2 },
      { armor: 'ablat', dm: 1 },
      { armor: 'combat', dm: -5 },
    ]);
    expect(weapon('rifle').atRange.map((r) => r.dm)).toEqual([-4, 1, 0, -1, -3]);
    expect(weapon('body-pistol').atRange.map((r) => r.dm)).toEqual([2, 1, -6, undefined, undefined]);
    expect(weapon('hands')).toMatchObject({ attack: 'blow', uses: 'brawling', wounds: 1 });
    expect(weapon('club').uses).toBe('brawling');
    expect(weapon('broadsword').atRange.map((r) => r.dm)).toEqual([-8, 3, undefined, undefined, undefined]);
    expect(weapon('laser-rifle')).toMatchObject({ wounds: 5, advantageous: 11 });
    expect(referenceData.items.filter((i) => i.kind === 'weapon').every((i) => i.weapon === i.id)).toBe(true);
    expect(referenceData.items.some((i) => i.weapon === 'hands')).toBe(false);
  });

  it('rechnen Tonnen in kg und KCr bzw. MCr in Cr um', () => {
    const item = (id: string) => referenceData.items.find((i) => i.id === id)!;
    expect(item('vehicle-air-raft')).toMatchObject({ kind: 'vehicle', tl: 8, weight: 4000, price: 600_000 });
    expect(item('craft-ship-s-boat')).toMatchObject({ kind: 'ship', price: 16_000_000 });
    expect(item('craft-ship-s-boat').weight).toBeUndefined();
    expect(referenceData.ships.find((s) => s.code === 'A')).toMatchObject({ name: 'Free Trader', basePrice: 37_080_000, computer: 'model-1' });
    expect(referenceData.items.some((i) => i.id === 'scout-ship' || i.id === 'free-trader')).toBe(false);
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

  it('kennen die Standardentwürfe, Rechner und Programme aus SE 10 bis 13', () => {
    expect(referenceData.ships.filter((s) => s.kind === 'starship').map((s) => s.code)).toEqual(['S', 'A', 'R', 'M', 'Y', 'C', 'T', 'L', 'K', 'P', 'J']);
    // Der Seeker als Sachwert der Beltterer (B4 S. 15): ein geänderter Typ S mit Bergungslaser.
    expect(referenceData.ships.find((s) => s.code === 'J')).toMatchObject({ name: 'Seeker', hull: 100, jump: 2, maneuver: 1, cargo: 20, basePrice: 20_000_000, turrets: [{ type: 'single', weapons: ['pulse-laser'] }] });
    // Der Corsair als Sachwert der Piraten-Laufbahn (Supplement 4 S. 13).
    expect(referenceData.ships.find((s) => s.code === 'P')).toMatchObject({ name: 'Corsair', hull: 400, jump: 2, maneuver: 3, cargo: 160, lowBerths: 20, streamlined: false });
    // Die Small Craft aus SR 33–35 (2026-11-21b).
    expect(referenceData.ships.filter((s) => s.kind === 'smallCraft').map((s) => s.id)).toEqual(['launch', 'boat', 'slow-boat', 'pinnace', 'slow-pinnace', 'cutter', 'shuttle', 'fighter']);
    const design = (code: string) => referenceData.ships.find((s) => s.code === code)!;
    expect(design('S')).toMatchObject({ name: 'Scout/Courier', hull: 100, jump: 2, maneuver: 2, fuel: 40, computer: 'model-1bis', basePrice: 29_430_000, months: 9 });
    expect(design('C')).toMatchObject({ hardpoints: 8, cargo: 80, computer: 'model-5' });
    expect(referenceData.computers.map((c) => [c.name, c.jump])).toEqual([['Modell/1', 1], ['Modell/1bis', 2], ['Modell/2', 2], ['Modell/2bis', 3], ['Modell/3', 3], ['Modell/4', 4], ['Modell/5', 5], ['Modell/6', 6], ['Modell/7', 7]]);
    const kind = (k: (typeof referenceData.software)[number]['kind']) => referenceData.software.filter((s) => s.kind === k).length;
    expect([kind('offensive'), kind('defensive'), kind('routine')]).toEqual([15, 10, 11]);
    const program = (id: string) => referenceData.software.find((s) => s.id === id)!;
    expect(program('jump-2')).toMatchObject({ space: 2, price: 300_000, kind: 'routine' });
    expect(program('anti-hijack').effect).toMatch(/5−/);
  });

  it('weisen einen Schiffsentwurf mit unbekanntem Rechner und einen fremden Ship-Vorteil zurück', () => {
    const broken = { ...referenceData, ships: referenceData.ships.map((s) => (s.code === 'S' ? { ...s, computer: 'model-9' } : s)) };
    expect(() => ReferenceDataSchema.parse(broken)).toThrow(/Rechnermodell model-9/);
    const services = referenceData.services.map((s) => ({ ...s, benefits: { ...s.benefits, rows: s.benefits.rows.map((r) => (r.ship === 'S' ? { ...r, ship: 'X' } : r)) } }));
    expect(() => ReferenceDataSchema.parse({ ...referenceData, services })).toThrow(/Unbekannter Schiffsentwurf X/);
  });
});

describe('Tiere', () => {
  const animals = referenceData.encounters.animals;
  it('die Spalten der Tiertabelle: 2W6, Wurf 10 ist das Ereignis', () => {
    expect(animals.columns.map((c) => c[0]!.toUpperCase()).join('')).toBe('SOSOHHHCECC');
  });
  it('jede Zeile der Animal Types verweist auf eine Tierart ihrer Kategorie, je Kategorie 0 bis 13', () => {
    for (const row of animals.typeRows) expect(animals.types.find((t) => t.id === row.type)?.category).toBe(row.category);
    for (const category of ['herbivore', 'omnivore', 'carnivore', 'scavenger']) expect(animals.typeRows.filter((r) => r.category === category).map((r) => r.roll)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });
  it('Gelände: Tiere überall außer in Stadt, Gebäude und Arktis; die alten Geländearten bleiben', () => {
    const terrains = referenceData.encounters.terrains;
    expect(terrains.filter((t) => t.typeDm === undefined).map((t) => t.id)).toEqual(['arctic', 'city', 'interior']);
    expect(terrains.find((t) => t.id === 'depths' || t.id === 'maritime-subsurface')).toMatchObject({ dm: -1, typeDm: 2, sizeDm: 4, traits: 'sea' });
  });
  it('die Tierwaffen stehen in der Matrix, ohne Gegenstand im Shop', () => {
    const weapon = (id: string) => referenceData.weapons.find((w) => w.id === id)!;
    expect(weapon('claws')).toMatchObject({ wounds: 2 });
    expect(weapon('stinger').atRange.map((r) => r.dm)).toEqual([4, 2, undefined, undefined, undefined]);
    expect(referenceData.items.some((i) => ['claws', 'teeth', 'horns', 'hooves', 'stinger', 'thrasher'].includes(i.weapon ?? ''))).toBe(false);
  });
  it('Ereignisse: vier mit Rettungswurf, fünf für Welten ohne Leben', () => {
    expect(animals.events.filter((e) => e.save).map((e) => `${e.id} ${e.save} ${e.damage}`)).toEqual(['poisonous-pests DEX 3', 'stampede 8+ 2', 'flash-flood 9+ 3', 'seismic-quake STR 1']);
    expect(animals.events.filter((e) => e.lifeless)).toHaveLength(5);
  });
});
