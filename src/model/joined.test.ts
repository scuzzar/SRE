import { describe, expect, it } from 'vitest';
import { addCharacter, createCampaign, removeCharacter, setHexes, updateCharacter, inputOf, characterOf, type Campaign, type CharacterInput } from './campaign';
import { fromCampaignFile, toCampaignFile } from './campaign-file';
import { autoWounds } from './wounds';
import { currentEncounter, endEncounter, joinableNpcs, npcSideIds, npcSideOf, npcSurpriseParts, rollEncounter } from './encounter';
import { fightOrder, sideOf } from './fight';
import { cannotLoot } from './loot';
import { ref } from './reference';
import { setLocation } from './shop';
import { fixedClock, fixedRandom } from './testing';

const npcInput = (name: string, place: string | undefined): CharacterInput => ({
  name,
  background: 'Ex-Merchants',
  equipment: '',
  credits: 0,
  note: '',
  npc: true,
  role: 'ally',
  ...(place === undefined ? {} : { place }),
  upp: { str: 9, dex: 7, end: 9, int: 7, edu: 3, soc: 8 },
  skills: [{ of: 'blade', level: 1 }],
  possessions: [{ of: 'dagger', count: 1 }],
  primary: 'dagger',
  wields: 'dagger',
});

/** Regina (0101) als Aufenthaltsort, dazu Tenzin dort, Ilka ohne Ort und Oren auf einer anderen Welt. */
function setup(): { campaign: Campaign; tenzin: string; ilka: string; oren: string } {
  const regina = { ...ref.demoWorld, column: 1, row: 1, name: 'Regina' };
  const other = { ...ref.demoWorld, column: 2, row: 1, name: 'Sora' };
  let campaign = setLocation(setHexes(createCampaign(), [regina, other]), '0101');
  const t = addCharacter(campaign, npcInput('Tenzin Thorsen', '0101'));
  const i = addCharacter(t.campaign, npcInput('Ilka Brand', undefined));
  const o = addCharacter(i.campaign, npcInput('Oren Vale', '0201'));
  campaign = o.campaign;
  return { campaign, tenzin: t.id, ilka: i.id, oren: o.id };
}

describe('Dazugenommene NSC (2026-11-14g)', () => {
  it('Dazunehmen lassen sich nur lebende dauerhafte NSC vom Aufenthaltsort', () => {
    const { campaign, tenzin, ilka, oren } = setup();
    expect(joinableNpcs(campaign).map((c) => c.id)).toEqual([tenzin]);
    expect(() => rollEncounter(campaign, fixedRandom(), fixedClock(), 15, 2, undefined, [ilka])).toThrow(/Aufenthaltsort/);
    expect(() => rollEncounter(campaign, fixedRandom(), fixedClock(), 15, 2, undefined, [oren])).toThrow(/Aufenthaltsort/);
    expect(() => rollEncounter(campaign, fixedRandom(), fixedClock(), 15, 2, undefined, [tenzin, tenzin])).toThrow(/nur einmal/);
  });

  it('NSC plus Art: die dazugenommenen vorn auf der Seite der NSC, der erste führt, die Art bekommt keinen Anführer', () => {
    const { campaign, tenzin } = setup();
    const rolled = rollEncounter(campaign, fixedRandom(), fixedClock(), 15, 3, undefined, [tenzin]);
    const encounter = currentEncounter(rolled.campaign)!;
    expect(encounter.joined).toEqual([tenzin]);
    expect(encounter.leader).toBe(tenzin);
    expect(encounter.npcs).toHaveLength(3);
    expect(encounter.npcs.every((n) => !n.background.includes('Anführer'))).toBe(true);
    expect(encounter.npcs.every((n) => n.skills[0]!.level === 1)).toBe(true);
    // Er bleibt in der Kampagne und wird nicht kopiert.
    expect(rolled.campaign.characters.some((c) => c.id === tenzin)).toBe(true);
    expect(encounter.npcs.some((n) => n.id === tenzin)).toBe(false);
    expect(npcSideIds(encounter)).toEqual([tenzin, ...encounter.npcs.map((n) => n.id)]);
    expect(npcSideOf(rolled.campaign, encounter)[0]!.name).toBe('Tenzin Thorsen');
    expect(sideOf(rolled.campaign, tenzin)).toBe('npcs');
    expect(sideOf(rolled.campaign, 'c1')).toBe('pcs');
    expect(fightOrder(rolled.campaign, encounter).filter((s) => s.side === 'npcs').map((s) => s.id)).toEqual(npcSideIds(encounter));
    expect(npcSurpriseParts(rolled.campaign, encounter).map((p) => p.label)).toContain('Anführer');
  });

  it('Art „keine“ und eine leere Zeile: nur die dazugenommenen NSC; ohne NSC gibt es dann keine Begegnung', () => {
    const { campaign, tenzin } = setup();
    const none = currentEncounter(rollEncounter(campaign, fixedRandom(), fixedClock(), 'none', undefined, undefined, [tenzin]).campaign)!;
    expect(none.of).toBeUndefined();
    expect(none.npcs).toEqual([]);
    expect(none.joined).toEqual([tenzin]);
    expect(none.reaction).toBeDefined();
    // Würfel 6 und 3: Zeile 63 ist leer.
    const blank = rollEncounter(campaign, fixedRandom(6, 3), fixedClock(), undefined, undefined, undefined, [tenzin]);
    expect(blank.roll).toBe(63);
    expect(currentEncounter(blank.campaign)!.npcs).toEqual([]);
    expect(rollEncounter(campaign, fixedRandom(6, 3), fixedClock()).encounter).toBeUndefined();
    expect(() => rollEncounter(campaign, fixedRandom(), fixedClock(), 'none')).toThrow(/dazugenommene NSC/);
  });

  it('Treffer verteilt die App wie bei jedem NSC; Beute geht; zum SC machen und Löschen erst nach dem Ende', () => {
    const { campaign, tenzin } = setup();
    const rolled = rollEncounter(campaign, fixedRandom(), fixedClock(), 'none', undefined, undefined, [tenzin]).campaign;
    expect(autoWounds(rolled, tenzin, [3], fixedRandom())).toBeDefined();
    expect(cannotLoot(rolled, tenzin)).toMatch(/wehrt sich/);
    expect(cannotLoot(campaign, tenzin)).toMatch(/kein NSC einer Begegnung/);
    expect(() => updateCharacter(rolled, tenzin, { ...inputOf(characterOf(rolled, tenzin)), npc: false })).toThrow(/laufenden Begegnung/);
    expect(() => removeCharacter(rolled, tenzin)).toThrow(/laufenden Begegnung/);
    const ended = endEncounter(rolled);
    expect(ended.characters.find((c) => c.id === tenzin)).toEqual(rolled.characters.find((c) => c.id === tenzin));
    expect(characterOf(updateCharacter(ended, tenzin, { ...inputOf(characterOf(ended, tenzin)), npc: false }), tenzin).npc).toBe(false);
  });

  it('Die Kampagnendatei hält den Verweis und prüft ihn', () => {
    const { campaign, tenzin } = setup();
    const rolled = rollEncounter(campaign, fixedRandom(), fixedClock(), 15, 2, undefined, [tenzin]).campaign;
    const back = fromCampaignFile(toCampaignFile(rolled), 'k1');
    expect(currentEncounter(back)!.joined).toEqual([tenzin]);
    expect(currentEncounter(back)!.leader).toBe(tenzin);
    const broken = { ...rolled, encounters: rolled.encounters.map((e) => ({ ...e, joined: ['c1'] })) };
    expect(() => fromCampaignFile(toCampaignFile(broken), 'k1')).toThrow(/kein dauerhafter NSC/);
  });
});
