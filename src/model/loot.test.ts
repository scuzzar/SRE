import { describe, expect, it } from 'vitest';
import type { AnimalRow, AnimalTable } from './animals';
import { createCampaign, setHexes, type Campaign } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { currentEncounter, rollAnimalEncounter, rollEncounter, setTerrain } from './encounter';
import type { DamageRoll } from './log';
import { butcher, butcheringResult, butchers, cannotButcher, cannotLoot, gamePricePerKg, gameSaleTotal, lootValueOf, rarityDm, survivalGear, takeLoot } from './loot';
import { ref } from './reference';
import { sellGame, setLocation } from './shop';
import { fixedClock, fixedRandom } from './testing';
import { woundStateOf } from './wounds';
import type { Butchering } from './log';

/** Ein Grazer auf Zeile 11 (Seltenheit +2), 400 kg, ohne Rüstung, essbar, Marktwurf 10. */
function grazer(extra: Partial<AnimalRow> = {}): AnimalRow {
  return { roll: 11, type: 'grazer', weight: 400, hits: [10, 5], attacks: [{ with: 'hooves', dm: 0, damage: 6 }], attack: 6, flee: 3, speed: 2, market: 10, edible: true, ...extra };
}

function withAnimal(row: AnimalRow, terrain = 'mountain'): Campaign {
  const rows = Array.from({ length: 11 }, (_, i) => (i + 2 === row.roll ? row : { roll: i + 2, event: 'tracks' }));
  const table: AnimalTable = { terrain, rows };
  const hex = { ...ref.demoWorld, column: 1, row: 1, name: 'Regina', animals: [table] };
  return setTerrain(setLocation(setHexes(createCampaign(), [hex]), '0101'), terrain);
}

/** Die Kampagne mit einem toten Tier: Schaden in Höhe seiner Hits. */
function deadAnimal(row: AnimalRow, terrain = 'mountain'): { campaign: Campaign; animal: string } {
  const rolled = rollAnimalEncounter(withAnimal(row, terrain), fixedRandom(1, 1, 1, 1, 1, 1), fixedClock(), row.roll, 1);
  const animal = currentEncounter(rolled.campaign)!.npcs[0]!.id;
  const hit = { kind: 'attack' as const, at: '2026-10-23T15:00:00.000Z', for: 'c1', against: animal, with: 'hands', armor: 'nothing' as const, range: 'close' as const, dice: [6, 6] as const, dm: 0, target: 8 };
  const damage: DamageRoll = { kind: 'damage', at: '2026-10-23T15:01:00.000Z', of: rolled.campaign.log.length, dice: [], fixed: (row.hits![0] + row.hits![1]) };
  return { campaign: { ...rolled.campaign, log: [...rolled.campaign.log, hit, damage] }, animal };
}

describe('Werte der Tierbeute', () => {
  it('Seltenheit nach der Zeile: 2/12 +3, 3/11 +2, 4/10 +1', () => {
    expect([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(rarityDm)).toEqual([3, 2, 1, 0, 0, 0, 0, 0, 1, 2, 3]);
  });

  it('Fellwert: Marktwurf + Jagd-DM + Gefahr + Seltenheit; Fleischwert ohne Gefahr', () => {
    const at = { in: '0101', terrain: 'mountain', roll: 11 };
    const value = lootValueOf(grazer(), at)!;
    expect(value).toMatchObject({ market: 10, furValue: 10 + 2 + 0 + 2, meatValue: 10 + 2 + 2 });
    expect(value.fur.map((p) => `${p.label} ${p.dm}`)).toEqual(['Mountain 2', 'Herbivore 0', 'Zeile 11 2']);
    const killer = lootValueOf({ ...grazer(), type: 'killer' }, at)!;
    expect(killer.furValue).toBe(17);
  });
});

describe('Ausweiden', () => {
  it('der Beste, der wach ist, arbeitet: Fleisch Steward/Medical, Fell eine Klinge; die Beute kommt ins Gepäck', () => {
    const { campaign, animal } = deadAnimal(grazer());
    expect(woundStateOf(campaign, animal)).toBe('dead');
    // Jonas hat Steward-1 und Blade-1: Er macht beides.
    expect(butchers(campaign).meat).toMatchObject({ name: 'Jonas Reyl', skill: 'steward', level: 1 });
    expect(butchers(campaign).fur).toMatchObject({ name: 'Jonas Reyl', skill: 'blade', level: 1 });
    const done = butcher(campaign, animal, fixedRandom(4), fixedClock('2026-10-23T16:00:00.000Z'));
    const entry = done.log.at(-1) as Butchering;
    expect(entry).toMatchObject({ kind: 'butchering', of: animal, meatDie: 4, meatSkill: 1, furSkill: 1 });
    expect(entry).not.toHaveProperty('for');
    // Fleisch: (4 + 1) × 5 % von 400 kg = 100 kg; Fell: jedes kg Tier 1 kg Fell.
    expect(butcheringResult(done, entry)).toMatchObject({ edible: true, meat: 100, fur: 400, furHalf: false });
    expect(done.stash.filter((p) => p.from).map((p) => [p.of, p.count])).toEqual([
      ['meat', 100],
      ['fur', 400],
    ]);
    expect(cannotButcher(done, animal)).toMatch(/schon ausgeweidet/);
    // Ohne Klinge-1 gibt es nur halbes Fell.
    const noBlade = { ...campaign, characters: campaign.characters.map((c) => ({ ...c, skills: c.skills.filter((k) => k.of !== 'blade') })) };
    const half = butcher(noBlade, animal, fixedRandom(4), fixedClock('2026-10-23T16:00:00.000Z'));
    expect(butcheringResult(half, half.log.at(-1) as Butchering)).toMatchObject({ fur: 200, furHalf: true });
    // Preise: Fell (10 + 2 + 0 + 2) × 0,1 = 1,4 Cr/kg, Fleisch (10 + 2 + 2) × 0,5 = 7 Cr/kg.
    const at = { in: '0101', terrain: 'mountain', roll: 11 };
    expect(gamePricePerKg(done.hexes, 'fur', at)).toBeCloseTo(1.4);
    expect(gamePricePerKg(done.hexes, 'meat', at)).toBe(7);
    expect(gameSaleTotal(done.hexes, 'meat', at, 100)).toBe(350);
    // Übersteht die Kampagnendatei, und Jagdbeute lässt sich verkaufen.
    expect(fromCampaignFile(toCampaignFile(done), 'k1').stash).toEqual(done.stash);
    const sold = sellGame(done, 'meat|0101|mountain|11', 40, 140, fixedClock());
    expect(sold.stash.find((p) => p.of === 'meat')!.count).toBe(60);
    expect(sold.bookings.at(-1)).toMatchObject({ kind: 'sale', amount: 140, sold: 'meat', count: 40 });
  });

  it('ungenießbar: kein Fleischwürfel, kein Fleisch; gepanzerte Tiere haben kein Fell; zerstörte gar nichts', () => {
    const { campaign, animal } = deadAnimal(grazer({ edible: false, armor: 'mesh' }));
    const done = butcher(campaign, animal, fixedRandom(), fixedClock('2026-10-23T16:00:00.000Z'));
    const entry = done.log.at(-1) as Butchering;
    expect(entry.meatDie).toBeUndefined();
    expect(butcheringResult(done, entry)).toMatchObject({ edible: false, meat: 0, fur: 0, hasFur: false, reason: 'Wurf: ungenießbar' });
    const destroyed = deadAnimal(grazer());
    const more: DamageRoll = { kind: 'damage', at: '2026-10-23T15:02:00.000Z', of: destroyed.campaign.log.length - 2, dice: [], fixed: 1 };
    const twice = { ...destroyed.campaign, log: [...destroyed.campaign.log, { ...more, fixed: 15 }] };
    expect(woundStateOf(twice, destroyed.animal)).toBe('destroyed');
    expect(cannotButcher(twice, destroyed.animal)).toMatch(/zerstört/);
  });
});

describe('Beute der NSC', () => {
  const vacuum = { ...ref.demoWorld, column: 2, row: 2, name: 'Fels', uwp: { ...ref.demoWorld.uwp, atmosphere: 0, tech: 12 } };

  it('Überlebensausrüstung nach der Atmosphäre: Vacc Suit, Atemgerät, Filtermaske', () => {
    expect(survivalGear(0, 12)).toEqual(['vacc-suit-tl12']);
    expect(survivalGear(0, 5)).toEqual(['vacc-suit-tl8']);
    expect(survivalGear(2, 8)).toEqual(['respirator', 'filter-mask']);
    expect(survivalGear(7, 8)).toEqual(['filter-mask']);
    expect(survivalGear(6, 8)).toEqual([]);
  });

  it('NSC haben Kredite und Überlebensausrüstung; einem Bewusstlosen nimmt man alles ab: die Gegenstände ins Gepäck, die Kredite an einen SC', () => {
    const there = setLocation(setHexes(createCampaign(), [vacuum]), '0202');
    const rolled = rollEncounter(there, fixedRandom(), fixedClock(), 15, 2).campaign;
    const npc = currentEncounter(rolled)!.npcs[1]!;
    expect(npc.credits).toBe(10);
    expect(npc.possessions.some((p) => p.of.startsWith('vacc-suit-'))).toBe(true);
    expect(cannotLoot(rolled, npc.id)).toMatch(/wehrt sich/);
    // Bewusstlos schlagen: Schaden auf ein Attribut bis 0.
    const hit = { kind: 'attack' as const, at: '2026-10-23T15:00:00.000Z', for: 'c1', against: npc.id, with: 'hands', armor: 'nothing' as const, range: 'close' as const, dice: [6, 6] as const, dm: 0, target: 8 };
    const damage: DamageRoll = { kind: 'damage', at: '2026-10-23T15:01:00.000Z', of: rolled.log.length, dice: [6], to: ['STR', 'STR', 'STR', 'STR'], points: [npc.upp.str] };
    const down = { ...rolled, log: [...rolled.log, hit, { ...damage, dice: [npc.upp.str], to: ['STR'], points: [npc.upp.str] } as DamageRoll] };
    expect(woundStateOf(down, npc.id)).toBe('unconscious');
    const kiraBefore = down.characters.find((c) => c.id === 'c1')!;
    const looted = takeLoot(down, npc.id, 'c1');
    const kira = looted.characters.find((c) => c.id === 'c1')!;
    expect(kira.credits).toBe(kiraBefore.credits + 10);
    expect(kira.possessions).toEqual(kiraBefore.possessions);
    expect(looted.stash.length).toBeGreaterThan(down.stash.length);
    expect(looted.stash.find((p) => p.of.startsWith('vacc-suit-'))!.count).toBe(2);
    const after = currentEncounter(looted)!.npcs[1]!;
    expect(after).toMatchObject({ credits: 0, possessions: [] });
    expect(after.wields).toBeUndefined();
    expect(cannotLoot(looted, npc.id)).toMatch(/nichts mehr/);
  });
});
