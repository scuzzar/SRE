import { describe, expect, it } from 'vitest';
import type { AnimalRow, AnimalTable } from './animals';
import { createCampaign, setHexes, type Campaign } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { damageDice } from './combat';
import { currentEncounter, distanceOf, rollAnimalEncounter, rollSurprise, setTerrain } from './encounter';
import { blowsOf } from './stamina';
import { encounterSpecial, filterDice, holdAfterAttack, isHeld, struggle, struggleNeed } from './hold';
import { ref } from './reference';
import { setLocation } from './shop';
import { fixedClock, fixedRandom } from './testing';
import type { AttackResult } from './log';

function animal(type: string, weight = 100): AnimalRow {
  return { roll: 7, type, weight, hits: [10, 10], attacks: [{ with: 'teeth', dm: 0, damage: 5 }], attack: 6, flee: 6, speed: 1 };
}

/** Eine Welt mit einer Tiertabelle im Gelände Clear, deren Zeile 7 dieses Tier ist. */
function withAnimal(row: AnimalRow): Campaign {
  const rows = Array.from({ length: 11 }, (_, i) => (i + 2 === 7 ? row : { roll: i + 2, event: 'tracks' }));
  const table: AnimalTable = { terrain: 'clear', rows };
  const hex = { ...ref.demoWorld, column: 1, row: 1, name: 'Regina', animals: [table] };
  return setTerrain(setLocation(setHexes(createCampaign(), [hex]), '0101'), 'clear');
}

describe('Falle und Köder', () => {
  it('haben Trapper Überraschung, ist jeder SC auf Band 0 bei 5+ festgehalten; Losreißen 9+, +1 je Helfer, kostet einen Schlag', () => {
    // Startband 0 (Close: 2W6 + 3 = 2 → auf 1 begrenzt … Short), A und F, dann ein Tier.
    const rolled = rollAnimalEncounter(withAnimal(animal('trapper')), fixedRandom(1, 1, 1, 1, 1, 1), fixedClock(), 7, 1);
    let campaign = rolled.campaign;
    expect(encounterSpecial(campaign)).toBe('trap');
    expect(currentEncounter(campaign)!.startBand).toBe(0);
    // Überraschung: SC 1, Tiere 6 → Überraschung der Tiere; dann Falle: Kira 3 + 2 (gefangen), Jonas 1 + 1 (frei).
    campaign = rollSurprise(campaign, fixedRandom(1, 6, 3, 2, 1, 1));
    expect(distanceOf(currentEncounter(campaign)!, 'c1')).toMatchObject({ trapDice: [3, 2], held: true });
    expect(isHeld(campaign, 'c1')).toBe(true);
    expect(isHeld(campaign, 'c2')).toBe(false);
    const before = blowsOf(campaign, 'c1')!;
    // Jonas steht nicht in Berührung: kein Helfer. 4 + 4 gegen 9: noch fest.
    expect(struggleNeed(campaign, 'c1')).toEqual({ target: 9, dm: 0, helpers: 0 });
    const failed = struggle(campaign, 'c1', fixedRandom(4, 4));
    expect(failed.freed).toBe(false);
    expect(blowsOf(failed.campaign, 'c1')).toBe(before - 1);
    const freed = struggle(failed.campaign, 'c1', fixedRandom(5, 4));
    expect(freed.freed).toBe(true);
    expect(isHeld(freed.campaign, 'c1')).toBe(false);
    // Die Felder überstehen die Kampagnendatei.
    expect(fromCampaignFile(toCampaignFile(failed.campaign), 'k1').encounters).toEqual(failed.campaign.encounters);
  });

  it('ohne Überraschung schnappt keine Falle zu', () => {
    const rolled = rollAnimalEncounter(withAnimal(animal('trapper')), fixedRandom(1, 1, 1, 1, 1, 1), fixedClock(), 7, 1);
    const campaign = rollSurprise(rolled.campaign, fixedRandom(6, 1));
    expect(distanceOf(currentEncounter(campaign)!, 'c1').held).toBeUndefined();
  });
});

describe('Filter', () => {
  it('ein gelungenes Einsaugen hält fest; der Schaden ist 1W6 je angefangene 50 kg', () => {
    expect([filterDice(1), filterDice(50), filterDice(51), filterDice(400)]).toEqual([1, 1, 2, 8]);
    const rolled = rollAnimalEncounter(withAnimal(animal('filter', 120)), fixedRandom(1, 1, 1, 1, 1, 1), fixedClock(), 7, 1);
    const npc = currentEncounter(rolled.campaign)!.npcs[0]!.id;
    const hit: AttackResult = { kind: 'attack', at: '2026-10-23T15:00:00.000Z', for: npc, against: 'c1', with: 'teeth', armor: 'jack', range: 'close', dice: [3, 4], dm: 0, target: 6 };
    const campaign = holdAfterAttack({ ...rolled.campaign, log: [...rolled.campaign.log, hit] }, [hit]);
    expect(isHeld(campaign, 'c1')).toBe(true);
    expect(damageDice(campaign, campaign.log.length - 1, fixedRandom())).toHaveLength(3);
  });
});
