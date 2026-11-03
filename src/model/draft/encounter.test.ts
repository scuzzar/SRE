import { describe, expect, it } from 'vitest';
import {
  adoptNpc,
  appendLog,
  characterOf,
  createCampaign,
  currentEncounter,
  endEncounter,
  fighterOf,
  focusOf,
  fromCampaignFile,
  markDeath,
  needsWounding,
  npcCharacters,
  rollDamage,
  rollEncounter,
  setHexes,
  setLocation,
  setWears,
  toCampaignFile,
  woundStateOf,
  woundsOf,
  type Campaign,
  type Hex,
} from '..';
import { fixedClock, fixedRandom } from '../testing';
import { aimAt, attackBy, chooseTarget, rollAttack, startAttack } from './attack';
import { assignWound, confirmWounding, startWounding } from './wounding';

// Regina: TL 7, Bevölkerung 5.
const regina: Hex = {
  column: 2,
  row: 7,
  empty: false,
  name: 'Regina',
  navalBase: false,
  scoutBase: true,
  gasGiant: true,
  uwp: { starport: 12, size: 7, atmosphere: 8, hydrographics: 8, population: 5, government: 4, law: 5, tech: 7 },
};
const there: Campaign = setLocation(setHexes(createCampaign(), [regina]), '0207');
const clock = fixedClock();

/**
 * Zwei Thugs (15: 2W6 Thugs, L): Der Anführer bekommt das Beste bis TL 7, Foil und Mesh; der zweite
 * die erste Klinge der Liste, den Club, ohne Rüstung. Alle übrigen Würfe zeigen das Kleinste, also
 * UPP 222222 und die Reaktion 2.
 */
function thugs(campaign: Campaign = there): Campaign {
  return rollEncounter(campaign, fixedRandom(1, 5), clock, undefined, 2).campaign;
}

describe('Begegnung', () => {
  it('würfelt Art, NSC mit UPP, Waffe und Rüstung nach TL, Anführer und Reaktion', () => {
    const encounter = currentEncounter(thugs())!;
    expect(encounter).toMatchObject({ id: 'e1', of: 15, in: '0207', reaction: 2, ended: false });
    expect(encounter.npcs.map((n) => [n.id, n.leader, n.skill, n.wields, n.wears])).toEqual([
      ['n1', true, 2, 'foil', 'mesh'],
      ['n2', false, 1, 'club', undefined],
    ]);
    expect(encounter.npcs[0]!.upp).toEqual({ str: 2, dex: 2, end: 2, int: 2, edu: 2, soc: 2 });
    expect(encounter.npcs[0]!.name).toMatch(/^\S+ \S+/);
  });

  it('die Zeilen 61–66 sind leer; ohne Aufenthaltsort und während einer Begegnung gibt es keine neue', () => {
    expect(rollEncounter(there, fixedRandom(6, 1), clock)).toMatchObject({ roll: 61, encounter: undefined });
    expect(() => rollEncounter(createCampaign(), fixedRandom(), clock)).toThrow(/auf keiner Welt/);
    expect(() => rollEncounter(thugs(), fixedRandom(), clock)).toThrow(/läuft schon/);
    expect(() => rollEncounter(there, fixedRandom(), clock, 62)).toThrow(/gibt es nicht/);
  });

  it('Schusswaffen (G) bis zum TL, Rüstung (A) für alle: Soldiers 21 auf TL 8', () => {
    const npcs = rollEncounter(there, fixedRandom(), clock, 21, 2).campaign.encounters[0]!.npcs;
    // Anführer: die beste Schusswaffe bis TL 8 (Laser Carbine) und die beste Rüstung (Mesh, TL 7).
    expect(npcs[0]).toMatchObject({ wields: 'laser-carbine', wears: 'mesh' });
    expect(npcs[1]).toMatchObject({ wields: 'body-pistol', wears: 'jack' });
  });

  it('beenden: ohne Verweis im Log ist sie weg, sonst bleibt sie beendet in der Kampagne', () => {
    expect(endEncounter(thugs()).encounters).toEqual([]);
    const fought = thugs();
    const attack = rollAttack(chooseTarget(fought, 'mesh', 'close', aimAt(startAttack(fought), fought, 'n1')), fought, fixedRandom(1, 1), clock);
    const ended = endEncounter(appendLog(fought, attack));
    expect(ended.encounters[0]).toMatchObject({ ended: true });
    expect(currentEncounter(ended)).toBeUndefined();
  });
});

describe('Angriff in beide Richtungen und Wunden', () => {
  it('Kira greift den Anführer an: seine Rüstung steht fest, der erste Schaden geht ganz auf ein Attribut', () => {
    let campaign = thugs();
    const attack = aimAt(startAttack(campaign), campaign, 'n1');
    expect(attack).toEqual({ against: 'n1', armor: 'mesh' });
    expect(() => chooseTarget(campaign, 'jack', 'close', attack)).toThrow(/trägt mesh/);
    const result = rollAttack(chooseTarget(campaign, 'mesh', 'close', attack), campaign, fixedRandom(6, 6), clock);
    expect(result).toMatchObject({ for: 'c1', against: 'n1', armor: 'mesh', range: 'close' });
    campaign = appendLog(campaign, result);
    // Hände: 1W6 Schaden; die 4 geht ganz auf DEX (zufällig das zweite Attribut).
    const damage = rollDamage(campaign, 0, fixedRandom(4, 1), clock);
    expect(damage).toMatchObject({ dice: [4], to: ['DEX'] });
    campaign = appendLog(campaign, damage);
    // DEX 2 kann nur 2 verlieren; der Rest verfällt.
    expect(woundsOf(campaign, { npc: 'n1' })).toEqual({ str: 0, dex: 2, end: 0 });
    expect(woundStateOf(campaign, { npc: 'n1' })).toBe('unconscious');
    expect(fighterOf(campaign, { npc: 'n1' }).upp.dex).toBe(0);
  });

  it('ein NSC greift Kira an: ihre getragene Rüstung zählt; nach dem ersten Treffer verteilt sie selbst', () => {
    let campaign = setWears(thugs(), 'c1', 'jack');
    const attack = attackBy(startAttack(campaign), campaign, 'n2');
    expect(attack).toEqual({ by: 'n2', armor: 'jack' });
    const hit = () => rollAttack(chooseTarget(campaign, 'jack', 'close', attack), campaign, fixedRandom(6, 6), clock);
    const first = hit();
    expect(first).toMatchObject({ by: 'n2', victim: 'c1', with: 'club' });
    expect(first).not.toHaveProperty('for');
    campaign = appendLog(campaign, first);
    expect(needsWounding(campaign, 0)).toBe(false);
    // Club: 2W6, beim ersten Treffer beide auf STR (zufällig das erste).
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(3, 2, 0), clock));
    expect(woundsOf(campaign, { pc: 'c1' })).toEqual({ str: 5, dex: 0, end: 0 });
    campaign = appendLog(campaign, hit());
    expect(needsWounding(campaign, 2)).toBe(true);
    expect(() => rollDamage(campaign, 2, fixedRandom(), clock)).toThrow(/verteilt der Spieler/);
    let wounding = startWounding(campaign, 2, fixedRandom(6, 6));
    wounding = assignWound(assignWound(wounding, 'DEX'), 'END');
    campaign = markDeath(appendLog(campaign, confirmWounding(wounding, campaign, clock)), { pc: 'c1' });
    expect(woundsOf(campaign, { pc: 'c1' })).toEqual({ str: 5, dex: 6, end: 6 });
    expect(woundStateOf(campaign, { pc: 'c1' })).toBe('wounded');
    // Bewusstlos greift Kira nicht an.
    const more = (c: Campaign) => appendLog(c, rollAttack(chooseTarget(c, 'jack', 'close', attack), c, fixedRandom(6, 6), clock));
    campaign = more(campaign);
    campaign = appendLog(campaign, confirmWounding(assignWound(assignWound(startWounding(campaign, 4, fixedRandom(6, 6)), 'STR'), 'DEX'), campaign, clock));
    expect(woundStateOf(campaign, { pc: 'c1' })).toBe('serious');
    expect(() => rollAttack(chooseTarget(campaign, 'mesh', 'close', aimAt(startAttack(campaign), campaign, 'n1')), campaign, fixedRandom(6, 6), clock)).toThrow(/bewusstlos/);
  });

  it('stirbt ein SC an seinen Wunden, ist er tot, und der nächste steht oben', () => {
    let campaign = thugs();
    const attack = attackBy(startAttack(campaign), campaign, 'n1');
    const hit = (c: Campaign) => appendLog(c, rollAttack(chooseTarget(c, 'nothing', 'close', attack), c, fixedRandom(6, 6), clock));
    campaign = hit(campaign);
    // Foil: 1W6; erster Treffer 6 auf STR (7 → 1).
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(6, 0), clock));
    for (const [i, to] of [
      [2, 'STR'],
      [4, 'DEX'],
      [6, 'DEX'],
      [8, 'END'],
      [10, 'END'],
    ] as const) {
      campaign = hit(campaign);
      campaign = markDeath(appendLog(campaign, confirmWounding(assignWound(startWounding(campaign, i - 1 + 1, fixedRandom(6)), to), campaign, clock)), { pc: 'c1' });
    }
    expect(woundStateOf(campaign, { pc: 'c1' })).toBe('dead');
    expect(characterOf(campaign, 'c1').dead).toBe(true);
    expect(focusOf(campaign)?.id).toBe('c2');
  });
});

describe('Übernehmen', () => {
  it('als SC: mit Waffe und Rüstung in der Hand bzw. angezogen; als NSC unter „NSC“', () => {
    const asPc = adoptNpc(thugs(), 'n1', false);
    const pc = asPc.characters.at(-1)!;
    expect(pc).toMatchObject({ npc: false, wields: 'foil', wears: 'mesh', skills: [{ of: 'foil', level: 2, retired: false }] });
    expect(pc.background).toBe('Thugs · Anführer');
    expect(currentEncounter(asPc)!.npcs[0]!.became).toBe(pc.id);
    expect(() => adoptNpc(asPc, 'n1', true)).toThrow(/schon übernommen/);
    expect(() => aimAt(startAttack(asPc), asPc, 'n1')).toThrow(/übernommen/);

    const asNpc = adoptNpc(thugs(), 'n2', true);
    expect(npcCharacters(asNpc).map((c) => c.wields)).toEqual(['club']);
    expect(focusOf(asNpc)?.id).toBe('c1');
  });
});

describe('Kampagnendatei mit Begegnung', () => {
  it('übernimmt Begegnung, NSC, Angreifer und Ziel und die Verteilung der Wunden unverändert', () => {
    let campaign = setWears(thugs(), 'c1', 'jack');
    campaign = appendLog(campaign, rollAttack(chooseTarget(campaign, 'jack', 'close', attackBy(startAttack(campaign), campaign, 'n1')), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(3, 1), clock));
    campaign = adoptNpc(campaign, 'n2', true);
    const back = fromCampaignFile(toCampaignFile(campaign), 'k2');
    expect(back.encounters).toEqual(campaign.encounters);
    expect(back.log).toEqual(campaign.log);
    expect(back.characters).toEqual(campaign.characters);
  });

  it('weist einen ersten Treffer zurück, der auf mehrere Attribute geht', () => {
    let campaign = thugs();
    campaign = appendLog(campaign, rollAttack(chooseTarget(campaign, 'nothing', 'close', attackBy(startAttack(campaign), campaign, 'n2')), campaign, fixedRandom(6, 6), clock));
    const json = JSON.parse(toCampaignFile(campaign));
    json.campaign.log.push({ kind: 'damage', at: '2026-11-03T10:00:00.000Z', of: 0, dice: [3, 4], to: ['STR', 'DEX'] });
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/ganz auf ein Attribut/);
  });
});
