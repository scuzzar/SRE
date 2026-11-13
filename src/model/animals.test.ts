import { describe, expect, it } from 'vitest';
import { animalName, animalTableOf, generateAnimalTable, hasLife, withAnimalTable } from './animals';
import { createCampaign, setHexes, type Campaign } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { behaviorOf, rollAnimalEncounter, setTerrain } from './encounter';
import type { Random } from './ports';
import type { Hex } from './sector';
import { ref } from './reference';
import { setLocation } from './shop';
import { fixedClock } from './testing';

const regina: Hex = { ...ref.demoWorld, column: 1, row: 1, name: 'Regina' };
const rock: Hex = { ...ref.demoWorld, column: 2, row: 2, name: 'Fels', uwp: { ...ref.demoWorld.uwp, size: 3, atmosphere: 0 }, surface: { ...ref.demoWorld.surface!, life: false } };

/** Eine Zufallsquelle, die reihum gleichverteilt würfelt (deterministisch). */
function cycling(seed = 1): Random {
  let n = seed;
  return {
    int(min, max) {
      n = (n * 1103515245 + 12345) % 2147483648;
      return min + (n % (max - min + 1));
    },
  };
}

function onWorld(hex: Hex, terrain?: string): Campaign {
  const campaign = setLocation(setHexes(createCampaign(), [hex]), `${String(hex.column).padStart(2, '0')}${String(hex.row).padStart(2, '0')}`);
  return terrain === undefined ? campaign : setTerrain(campaign, terrain);
}

describe('Tiertabelle', () => {
  it('hat elf Zeilen 2 bis 12; Zeile 10 ist ein Ereignis, die übrigen sind Tiere mit allen Werten', () => {
    const table = generateAnimalTable(regina, 'clear', cycling());
    expect(table.rows.map((r) => r.roll)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(table.rows.filter((r) => r.event !== undefined).map((r) => r.roll)).toEqual([10]);
    for (const row of table.rows.filter((r) => r.event === undefined)) {
      expect(row.type).toBeDefined();
      expect(row.weight).toBeGreaterThan(0);
      expect(row.hits).toHaveLength(2);
      expect(row.attacks!.length).toBeGreaterThan(0);
      for (const a of row.attacks!) expect(a.damage).toBeGreaterThanOrEqual(1);
      expect(row.speed).toBeGreaterThanOrEqual(0);
    }
  });

  it('die Kategorie folgt den Encounter Columns: Zeile 6 bis 8 Pflanzenfresser, 9, 11, 12 Fleischfresser', () => {
    for (let seed = 1; seed < 30; seed++) {
      const rows = generateAnimalTable(regina, 'forest', cycling(seed)).rows;
      const category = (roll: number) => categoryOf(rows.find((r) => r.roll === roll)!.type!);
      expect([6, 7, 8].map(category)).toEqual(['herbivore', 'herbivore', 'herbivore']);
      expect([9, 11, 12].map(category)).toEqual(['carnivore', 'carnivore', 'carnivore']);
    }
  });

  it('eine Welt ohne Leben hat nur Ereignisse für Welten ohne Leben', () => {
    expect(hasLife(rock)).toBe(false);
    const table = generateAnimalTable(rock, 'crater', cycling());
    expect(table.rows.every((r) => r.event !== undefined && ['dust-pool', 'solar-storm', 'magnetic-anomaly', 'tracks', 'pressure-tent'].includes(r.event))).toBe(true);
  });

  it('entsteht einmal je Gelände und bleibt dann; in Stadt und Gebäude gibt es keine Tiere', () => {
    const once = withAnimalTable(regina, 'clear', cycling(3));
    expect(withAnimalTable(once, 'clear', cycling(9))).toBe(once);
    expect(withAnimalTable(once, 'forest', cycling(9)).animals).toHaveLength(2);
    expect(() => generateAnimalTable(regina, 'city', cycling())).toThrow(/keine Tiere/);
  });

  it('Flieger und Triphibien haben nie Rüstung; Namen nennen die Besonderheit', () => {
    for (let seed = 1; seed < 40; seed++) {
      for (const row of generateAnimalTable(regina, 'beach', cycling(seed)).rows) {
        if (row.trait === 'flyer' || row.trait === 'triphibian') expect(row.armor).toBeUndefined();
        if (row.trait === 'flyer') expect(animalName(row)).toMatch(/^Flying /);
      }
    }
  });
});

describe('Tierbegegnung', () => {
  it('braucht ein Gelände mit Tieren; legt beim ersten Wurf die Tabelle an', () => {
    expect(() => rollAnimalEncounter(onWorld(regina), cycling(), fixedClock())).toThrow(/Gelände wählen/);
    expect(() => rollAnimalEncounter(onWorld(regina, 'city'), cycling(), fixedClock())).toThrow(/keine Tiere/);
    const rolled = rollAnimalEncounter(onWorld(regina, 'clear'), cycling(5), fixedClock(), 7);
    expect(animalTableOf(rolled.campaign.hexes[0]!, 'clear')).toBeDefined();
    expect(rolled.encounter).toMatchObject({ animal: 7, terrain: 'clear', in: '0101' });
    expect(rolled.encounter!.of).toBeUndefined();
    expect(rolled.encounter!.reaction).toBeUndefined();
  });

  it('die Tiere sind Charaktere der Begegnung mit Verweis auf ihre Zeile und den Tierangriffen als Waffen', () => {
    const rolled = rollAnimalEncounter(onWorld(regina, 'clear'), cycling(5), fixedClock(), 7, 2);
    const row = rolled.row;
    expect(rolled.encounter!.npcs.map((n) => n.name)).toEqual([`${animalName(row)} 1`, `${animalName(row)} 2`]);
    for (const npc of rolled.encounter!.npcs) {
      expect(npc.animal).toEqual({ in: '0101', terrain: 'clear', roll: 7 });
      expect(npc.primary).toBe(row.attacks![0]!.with);
      expect(npc.possessions).toEqual([]);
    }
    expect(behaviorOf(rolled.campaign, rolled.encounter!)).toBeDefined();
  });

  it('ein Ereignis legt keine Begegnung an, sondern einen Eintrag im Log', () => {
    let campaign = onWorld(regina, 'clear');
    // Zeile 10 ist immer ein Ereignis: würfeln, bis sie fällt.
    for (let seed = 1; seed < 200; seed++) {
      const rolled = rollAnimalEncounter(campaign, cycling(seed), fixedClock());
      if (rolled.event) {
        expect(rolled.encounter).toBeUndefined();
        expect(rolled.campaign.log.at(-1)).toMatchObject({ kind: 'event', in: '0101', terrain: 'clear' });
        campaign = rolled.campaign;
        break;
      }
    }
    expect(campaign.log.length).toBe(1);
    // Tabelle, Gelände und Ereignis überstehen die Kampagnendatei.
    const loaded = fromCampaignFile(toCampaignFile(campaign), campaign.id);
    expect(loaded.hexes).toEqual(campaign.hexes);
    expect(loaded.terrain).toBe('clear');
    expect(loaded.log).toEqual(campaign.log);
  });

  it('eine laufende Tierbegegnung übersteht die Kampagnendatei', () => {
    const rolled = rollAnimalEncounter(onWorld(regina, 'forest'), cycling(11), fixedClock(), 9);
    const loaded = fromCampaignFile(toCampaignFile(rolled.campaign), rolled.campaign.id);
    expect(loaded.encounters).toEqual(rolled.campaign.encounters);
  });
});

function categoryOf(type: string): string {
  return { filter: 'herbivore', intermittent: 'herbivore', grazer: 'herbivore', gatherer: 'omnivore', hunter: 'omnivore', eater: 'omnivore', pouncer: 'carnivore', chaser: 'carnivore', trapper: 'carnivore', siren: 'carnivore', killer: 'carnivore', hijacker: 'scavenger', intimidator: 'scavenger', 'carrion-eater': 'scavenger', reducer: 'scavenger' }[type]!;
}
