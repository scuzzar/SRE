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
  recover,
  recoveryOptions,
  isFirstHit,
  encounterRange,
  endTurn,
  fightOrder,
  firstSide,
  surpriseOf,
  turnOf,
  defeatedSide,
  setBand,
  moveBand,
  startBand,
  firstBand,
  rangeOfBand,
  encounterRangeOf,
  isEscaped,
  ESCAPED_BAND,
  setFocus,
  book,
  removeCharacter,
  rollDamage,
  rollEncounter,
  rollSurprise,
  needsSurprise,
  surpriseParts,
  reactionOf,
  setGeneration,
  setQuantityDie,
  veteranDm,
  setHexes,
  setLocation,
  setWears,
  toCampaignFile,
  woundStateOf,
  woundsOf,
  upgradeNpcs,
  type Campaign,
  type Hex,
} from '..';
import { fixedClock, fixedRandom, onTurn } from '../testing';
import { cascadeOptions, chooseCascade, enlist, finishGeneration, muster, reenlist, rollNext, rollSkill, stateOf, tableOptions, type Generation } from '../generation';
import type { Random } from '../ports';
import { aimAt, chooseTarget, rollAttack, startAttack, turnAttack } from './attack';
import { assignWound, confirmWounding, startWounding, unassignWound, woundingState } from './wounding';
import { checkDamageRoll } from '../combat';
import type { DamageRoll } from '../log';
import { characteristicOptions } from './task';

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
/** Die Beispiel-Charaktere ohne Rüstung, damit die Zahlen der Tests einfach bleiben. */
function unarmored(campaign: Campaign): Campaign {
  return { ...campaign, characters: campaign.characters.map((c) => Object.fromEntries(Object.entries(c).filter(([key]) => key !== 'wears')) as typeof c) };
}
const there: Campaign = setLocation(setHexes(unarmored(createCampaign()), [regina]), '0207');
const clock = fixedClock();

/**
 * Zwei Thugs (15: 2W6 Thugs, L): Der Anführer bekommt das Beste bis TL 7, Body Pistol und Mesh; der zweite
 * die erste Klinge der Liste, den Club, ohne Rüstung. Alle übrigen Würfe zeigen das Kleinste, also
 * UPP 222222 und die Reaktion 2.
 */
function thugs(campaign: Campaign = there): Campaign {
  return rollSurprise(rollEncounter(campaign, fixedRandom(1, 5), clock, undefined, 2).campaign, fixedRandom());
}

describe('Begegnung', () => {
  it('würfelt Art, NSC mit UPP, Waffe und Rüstung nach TL, Anführer und Reaktion', () => {
    const encounter = currentEncounter(thugs())!;
    expect(encounter).toMatchObject({ id: 'e1', of: 15, in: '0207', reaction: 2, ended: false, leader: 'n1' });
    expect(encounter.npcs.map((n) => [n.id, n.skills.map((k) => `${k.of}-${k.level}`), n.primary, n.wields, n.wears])).toEqual([
      ['n1', ['body-pistol-2'], 'body-pistol', 'body-pistol', 'mesh'],
      ['n2', ['brawling-1'], 'club', 'club', undefined],
    ]);
    // Jeder NSC ist ein vollständiger Charakter: kein SC, Herkunft die Art, Waffe (mit 1W4 Magazinen) und Rüstung im Besitz.
    expect(encounter.npcs[0]).toMatchObject({ npc: true, background: 'Thugs · Anführer', credits: 0, dead: false, retired: false });
    expect(encounter.npcs[0]!.possessions).toEqual([
      { of: 'body-pistol', count: 1 },
      { of: 'body-pistol-ammo', count: 1 },
      { of: 'mesh', count: 1 },
    ]);
    expect(encounter.npcs[1]!.possessions).toEqual([{ of: 'club', count: 1 }]);
    expect(encounter.npcs[0]!.upp).toEqual({ str: 2, dex: 2, end: 2, int: 2, edu: 2, soc: 2 });
    expect(encounter.npcs[0]!.name).toMatch(/^\S+ \S+/);
  });

  it('der Anführer trägt immer Schusswaffe und Rüstung; Combat Armor und Battle Dress nur Soldaten und Anführer (SR 50)', () => {
    // Thugs haben weder G noch A; ihr Anführer bekommt trotzdem die beste Schusswaffe und Rüstung bis TL 7.
    expect(currentEncounter(thugs())!.npcs[0]).toMatchObject({ wields: 'body-pistol', wears: 'mesh' });
    // Auf einer Welt mit TL 13 wählt jeder Wurf das Letzte der Liste: die Polizei (23, nicht militärisch)
    // bekommt höchstens Ablat, die Security Troops (25, militärisch) Battle Dress.
    const high = setLocation(setHexes(unarmored(createCampaign()), [{ ...regina, uwp: { ...regina.uwp, tech: 13 } }]), '0207');
    const last: Random = { int: (_min, max) => max };
    const wears = (roll: number) => currentEncounter(rollEncounter(high, last, clock, roll, 3).campaign)!.npcs.map((n) => n.wears);
    expect(wears(23)).toEqual(['ablat', 'ablat', 'ablat']);
    expect(wears(25)).toEqual(['battle-dress', 'battle-dress', 'battle-dress']);
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
    const fought = onTurn(thugs(), 'c1');
    const attack = rollAttack(chooseTarget(fought, 'mesh', 'close', aimAt(startAttack(fought), fought, 'n1')), fought, fixedRandom(1, 1), clock)[0]!;
    const ended = endEncounter(appendLog(fought, attack));
    expect(ended.encounters[0]).toMatchObject({ ended: true });
    expect(currentEncounter(ended)).toBeUndefined();
  });
});

describe('Angriff in beide Richtungen und Wunden', () => {
  it('Kira greift den Anführer an: seine Rüstung steht fest, der erste Schaden geht auf ein Attribut und läuft über', () => {
    let campaign = onTurn(thugs(), 'c1');
    const attack = aimAt(startAttack(campaign), campaign, 'n1');
    expect(attack).toEqual({ against: 'n1', armor: 'mesh' });
    expect(() => chooseTarget(campaign, 'jack', 'close', attack)).toThrow(/trägt mesh/);
    const result = rollAttack(chooseTarget(campaign, 'mesh', 'close', attack), campaign, fixedRandom(6, 6), clock)[0]!;
    expect(result).toMatchObject({ for: 'c1', against: 'n1', armor: 'mesh', range: 'close' });
    campaign = appendLog(campaign, result);
    // Hände: 1W6 Schaden; die 4 geht auf DEX (zufällig das zweite Attribut). DEX 2 nimmt nur 2 auf;
    // der Rest läuft zufällig über (SR 21), hier auf STR (das erste der beiden übrigen).
    const damage = rollDamage(campaign, 0, fixedRandom(4, 1, 0), clock);
    expect(damage).toMatchObject({ dice: [4], to: ['DEX', 'STR'], points: [2, 2] });
    // Ein Schadenswurf von vor dem Überlauf hat keine Punkte: je Würfel ein Block, der Rest bleibt verfallen.
    const legacy: DamageRoll = { kind: 'damage', at: damage.at, of: 0, dice: [4], to: ['DEX'] };
    expect(woundsOf(appendLog(campaign, legacy), 'n1')).toEqual({ str: 0, dex: 2, end: 0 });
    // Blöcke, die mehr als ihren Würfel ergeben, gibt es nicht.
    const bad: DamageRoll = { ...damage, to: ['DEX'], points: [5] };
    expect(() => checkDamageRoll([...campaign.log, bad], bad, 1)).toThrow(/mehr als den Würfel/);
    campaign = appendLog(campaign, damage);
    expect(woundsOf(campaign, 'n1')).toEqual({ str: 2, dex: 2, end: 0 });
    expect(woundStateOf(campaign, 'n1')).toBe('serious');
    expect(fighterOf(campaign, 'n1').upp.dex).toBe(0);
  });

  it('ein NSC greift Kira an: ihre getragene Rüstung zählt; nach dem ersten Treffer verteilt sie selbst', () => {
    let campaign = onTurn(setWears(thugs(), 'c1', 'jack'), 'n2');
    const attack = aimAt(startAttack(campaign), campaign, 'c1');
    expect(attack).toEqual({ against: 'c1', armor: 'jack' });
    expect(() => aimAt(startAttack(campaign), campaign, 'n1')).toThrow(/eigenen Partei/);
    const hit = () => rollAttack(chooseTarget(campaign, 'jack', 'close', attack), campaign, fixedRandom(6, 6), clock)[0]!;
    const first = hit();
    // Ein NSC greift an wie ein SC: Angreifer `for`, Ziel `against`, mit seiner Fertigkeitsstufe.
    expect(first).toMatchObject({ for: 'n2', against: 'c1', with: 'club', uses: 'brawling' });
    campaign = appendLog(campaign, first);
    expect(needsWounding(campaign, 0)).toBe(false);
    // Club: 2W6, beim ersten Treffer beide auf STR (zufällig das erste).
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(3, 2, 0), clock));
    expect(woundsOf(campaign, 'c1')).toEqual({ str: 5, dex: 0, end: 0 });
    campaign = appendLog(campaign, hit());
    expect(needsWounding(campaign, 2)).toBe(true);
    expect(() => rollDamage(campaign, 2, fixedRandom(), clock)).toThrow(/verteilt der Spieler/);
    let wounding = startWounding(campaign, 2, fixedRandom(6, 6));
    wounding = assignWound(assignWound(wounding, campaign, 'DEX'), campaign, 'END');
    campaign = markDeath(appendLog(campaign, confirmWounding(wounding, campaign, clock)), 'c1');
    expect(woundsOf(campaign, 'c1')).toEqual({ str: 5, dex: 6, end: 6 });
    expect(woundStateOf(campaign, 'c1')).toBe('wounded');
    // Bewusstlos greift Kira nicht an.
    const more = (c: Campaign) => appendLog(c, ...rollAttack(chooseTarget(c, 'jack', 'close', attack), c, fixedRandom(6, 6), clock));
    campaign = more(campaign);
    // 4 auf STR (noch 2): 2 auf STR, der Rest 2 läuft über, Kira wählt END (noch 2). Die 2 danach
    // kann nur noch auf DEX gehen; das nimmt die App von selbst.
    let third = assignWound(startWounding(campaign, 4, fixedRandom(4, 2)), campaign, 'STR');
    expect(woundingState(third, campaign).next).toEqual({ die: 0, rest: 2, open: ['DEX', 'END'] });
    expect(() => assignWound(third, campaign, 'STR')).toThrow(/schon auf 0/);
    third = assignWound(third, campaign, 'END');
    expect(third.to).toEqual(['STR', 'END', 'DEX']);
    expect(unassignWound(third, campaign).to).toEqual(['STR']);
    const roll = confirmWounding(third, campaign, clock);
    expect(roll).toMatchObject({ dice: [4, 2], to: ['STR', 'END', 'DEX'], points: [2, 2, 2] });
    campaign = appendLog(campaign, roll);
    expect(woundsOf(campaign, 'c1')).toEqual({ str: 7, dex: 8, end: 8 });
    expect(woundStateOf(campaign, 'c1')).toBe('serious');
    // Bewusstlos ist Kira nie am Zug; auch ohne Begegnung greift sie nicht an.
    expect(fightOrder(campaign, currentEncounter(campaign)!).map((s) => s.id)).toContain('c1');
    const later = endEncounter(campaign);
    expect(() => rollAttack(chooseTarget(later, 'nothing', 'close'), later, fixedRandom(6, 6), clock)).toThrow(/bewusstlos/);
  });

  it('stirbt ein SC an seinen Wunden, ist er tot, und der nächste steht oben', () => {
    let campaign = onTurn(thugs(), 'n1');
    const attack = aimAt(startAttack(campaign), campaign, 'c1');
    const hit = (c: Campaign) => appendLog(c, ...rollAttack(chooseTarget(c, 'nothing', 'close', attack), c, fixedRandom(6, 6), clock));
    campaign = hit(campaign);
    // Body Pistol des Anführers: 3W6; erster Treffer 1, 1, 1 auf STR (7 → 4). Dann 4, 6, 6: 4 auf STR
    // (→ 0), 6 auf DEX (10 → 4), 6 auf DEX (→ 0) und der Rest 2 von selbst auf END (8 → 6). Dann ist nur
    // END über 0, und die App verteilt von selbst: 6 auf END (→ 0), der Rest verfällt: tot.
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(1, 1, 1, 0), clock));
    for (const [i, dice, choices] of [
      [2, [4, 6, 6], ['STR', 'DEX', 'DEX']],
      [4, [6, 6, 6], []],
    ] as const) {
      campaign = hit(campaign);
      let wounding = startWounding(campaign, i, fixedRandom(...dice));
      for (const to of choices) wounding = assignWound(wounding, campaign, to);
      campaign = markDeath(appendLog(campaign, confirmWounding(wounding, campaign, clock)), 'c1');
    }
    expect(woundStateOf(campaign, 'c1')).toBe('dead');
    expect(characterOf(campaign, 'c1').dead).toBe(true);
    expect(focusOf(campaign)?.id).toBe('c2');
  });
});

describe('Übernehmen', () => {
  it('als SC: mit Waffe und Rüstung in der Hand bzw. angezogen; als NSC unter „NSC“', () => {
    const asPc = adoptNpc(thugs(), 'n1', false);
    // Er wird umgehängt: derselbe Charakter mit derselben Id, jetzt in der Kampagne und oben.
    const pc = asPc.characters.at(-1)!;
    expect(pc.id).toBe('n1');
    expect(pc).toMatchObject({ npc: false, primary: 'body-pistol', wields: 'body-pistol', wears: 'mesh', skills: [{ of: 'body-pistol', level: 2, retired: false }] });
    expect(pc.background).toBe('Thugs · Anführer');
    expect(focusOf(asPc)?.id).toBe('n1');
    expect(currentEncounter(asPc)!.npcs.map((n) => n.id)).toEqual(['n2']);
    expect(currentEncounter(asPc)).not.toHaveProperty('leader');
    expect(() => adoptNpc(asPc, 'n1', true)).toThrow(/gibt es nicht/);
    // Als SC kämpft er jetzt auf der Seite der SC.
    expect(fightOrder(asPc, currentEncounter(asPc)!).find((s) => s.id === 'n1')?.side).toBe('pcs');

    const asNpc = adoptNpc(thugs(), 'n2', true);
    expect(npcCharacters(asNpc).map((c) => c.wields)).toEqual(['club']);
    expect(focusOf(asNpc)?.id).toBe('c1');
  });

  it('er behält seine Wunden, und die Ids neuer NSC bleiben eindeutig', () => {
    let campaign = onTurn(thugs(), 'c1');
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'nothing', 'close', aimAt(startAttack(campaign), campaign, 'n2')), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, { kind: 'damage', at: clock.now(), of: 0, dice: [2], to: ['STR'], points: [2] });
    const adopted = adoptNpc(campaign, 'n2', true);
    expect(woundsOf(adopted, 'n2')).toEqual({ str: 2, dex: 0, end: 0 });
    const next = rollEncounter(endEncounter(adopted), fixedRandom(1, 5), clock, undefined, 2).campaign;
    expect(currentEncounter(next)!.npcs.map((n) => n.id)).toEqual(['n3', 'n4']);
  });
});

describe('Kampagnendatei mit Begegnung', () => {
  it('liest Spielstände von vor 2026-11-08c: NSC werden Charaktere der Begegnung, by, victim und npc werden for und against', () => {
    const json = JSON.parse(toCampaignFile(thugs()));
    const upp = { str: 2, dex: 2, end: 2, int: 2, edu: 2, soc: 2 };
    const at = '2026-11-03T10:00:00.000Z';
    const encounter = json.campaign.encounters[0];
    delete encounter.leader;
    encounter.npcs = [
      { id: 'n1', name: 'Ada Abara', leader: true, skill: 2, upp, wields: 'body-pistol', wears: 'mesh' },
      { id: 'n2', name: 'Bo Berg', leader: false, skill: 1, upp, wields: 'club' },
      { id: 'n3', name: 'Cy Cole', leader: false, skill: 1, upp, wields: 'club', became: 'c3' },
    ];
    json.campaign.characters.push({ ...json.campaign.characters[1], id: 'c3', name: 'Cy Cole', npc: true });
    json.campaign.log = [
      { kind: 'attack', at, by: 'n2', victim: 'c1', with: 'club', armor: 'nothing', range: 'close', dice: [6, 6], dm: 0, target: 8 },
      { kind: 'attack', at, for: 'c1', against: 'n3', with: 'hands', armor: 'nothing', range: 'close', dice: [1, 1], dm: 0, target: 8 },
      { kind: 'recovery', at, how: 'wake', npc: 'n3' },
    ];
    const back = fromCampaignFile(JSON.stringify(json), 'k2');
    const npcs = back.encounters[0]!.npcs;
    expect(npcs.map((n) => n.id)).toEqual(['n1', 'n2']);
    expect(back.encounters[0]!.leader).toBe('n1');
    expect(npcs[0]).toMatchObject({ name: 'Ada Abara', npc: true, background: 'Thugs · Anführer', primary: 'body-pistol', wields: 'body-pistol', wears: 'mesh', skills: [{ of: 'body-pistol', level: 2, retired: false }] });
    // Zwei Magazine, fest: Das Laden würfelt nicht.
    expect(npcs[0]!.possessions).toEqual([
      { of: 'body-pistol', count: 1 },
      { of: 'body-pistol-ammo', count: 2 },
      { of: 'mesh', count: 1 },
    ]);
    expect(back.log).toEqual([
      { kind: 'attack', at, for: 'n2', against: 'c1', with: 'club', armor: 'nothing', range: 'close', dice: [6, 6], dm: 0, target: 8 },
      // Der übernommene NSC: Der Log verweist auf den Charakter, der er wurde.
      { kind: 'attack', at, for: 'c1', against: 'c3', with: 'hands', armor: 'nothing', range: 'close', dice: [1, 1], dm: 0, target: 8 },
      { kind: 'recovery', at, how: 'wake', for: 'c3' },
    ]);
    // Ein heutiger Spielstand bleibt beim Umschreiben, wie er ist.
    expect(upgradeNpcs(back)).toEqual(back);
  });

  it('übernimmt Begegnung, NSC, Angreifer und Ziel und die Verteilung der Wunden unverändert', () => {
    let campaign = onTurn(setWears(thugs(), 'c1', 'jack'), 'n1');
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'jack', 'close', aimAt(startAttack(campaign), campaign, 'c1')), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(3, 1), clock));
    campaign = adoptNpc(campaign, 'n2', true);
    const back = fromCampaignFile(toCampaignFile(campaign), 'k2');
    expect(back.encounters).toEqual(campaign.encounters);
    expect(back.log).toEqual(campaign.log);
    expect(back.characters).toEqual(campaign.characters);
  });

  it('weist einen ersten Treffer zurück, der auf mehrere Attribute geht', () => {
    let campaign = onTurn(thugs(), 'n2');
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'nothing', 'close', aimAt(startAttack(campaign), campaign, 'c1')), campaign, fixedRandom(6, 6), clock));
    const json = JSON.parse(toCampaignFile(campaign));
    json.campaign.log.push({ kind: 'damage', at: '2026-11-03T10:00:00.000Z', of: 0, dice: [3, 4], to: ['STR', 'DEX'] });
    expect(() => fromCampaignFile(JSON.stringify(json), 'k2')).toThrow(/ganz auf ein Attribut/);
  });
});

describe('Heilung', () => {
  /** Kira mit Medical-1 und Medical Kit, Jonas mit Medical-3; zwei Thugs. */
  function medics(): Campaign {
    const campaign = thugs();
    return {
      ...campaign,
      characters: campaign.characters.map((c) =>
        c.id === 'c1'
          ? { ...c, skills: [...c.skills, { of: 'medical', level: 1, retired: false }], possessions: [...c.possessions, { of: 'medical-kit', count: 1 }] }
          : { ...c, skills: [...c.skills, { of: 'medical', level: 3, retired: false }] },
      ),
    };
  }

  /** Ein Treffer des Thugs n2 auf Jonas mit diesem Schaden auf diese Attribute. */
  function hitJonas(campaign: Campaign, dice: number[], to: ('STR' | 'DEX' | 'END')[]): Campaign {
    const focused = onTurn({ ...campaign, focus: 'c2' }, 'n2');
    const attack = aimAt(startAttack(focused), focused, 'c2');
    let after = appendLog(focused, ...rollAttack(chooseTarget(focused, 'nothing', 'close', attack), focused, fixedRandom(6, 6), clock));
    const of = after.log.length - 1;
    after = appendLog(after, { kind: 'damage', at: clock.now(), of, dice, to });
    return { ...after, focus: 'c1' };
  }

  it('Aufwachen nach einem Attribut auf 0: die Mitte zwischen verwundet und voll, abgerundet', () => {
    // Jonas: STR 6, DEX 8, END 7. Erster Treffer 6 auf STR → 0, bewusstlos.
    let campaign = hitJonas(medics(), [6, 6], ['STR', 'STR']);
    expect(woundStateOf(campaign, 'c2')).toBe('unconscious');
    expect(recoveryOptions(campaign, 'c2')).toMatchObject({ wake: true, rest: true, serious: false, treatable: true });
    campaign = appendLog(campaign, recover(campaign, 'wake', 'c2', fixedRandom(), clock));
    expect(woundsOf(campaign, 'c2')).toEqual({ str: 3, dex: 0, end: 0 });
    expect(woundStateOf(campaign, 'c2')).toBe('wounded');
    expect(() => recover(campaign, 'wake', 'c2', fixedRandom(), clock)).toThrow(/nicht bewusstlos/);
  });

  it('leichte Wunden: Behandlung mit Medical-1 und Medical Kit oder 3 Tage Ruhe heilt ganz; danach ist der nächste Treffer wieder ein erster', () => {
    let campaign = hitJonas(medics(), [3, 2], ['DEX', 'DEX']);
    expect(recoveryOptions(campaign, 'c2').healers).toEqual([
      { id: 'c1', name: 'Kira Vant', able: true },
      { id: 'c2', name: 'Jonas Reyl', able: false, why: 'braucht ein Medical Kit' },
    ]);
    const treated = recover(campaign, 'treatment', 'c2', fixedRandom(), clock, 'c1');
    expect(treated).toMatchObject({ kind: 'recovery', how: 'treatment', for: 'c2', by: 'c1' });
    expect(treated).not.toHaveProperty('dice');
    expect(isFirstHit(campaign.log, 'c2')).toBe(false);
    campaign = appendLog(campaign, treated);
    expect(woundsOf(campaign, 'c2')).toEqual({ str: 0, dex: 0, end: 0 });
    expect(isFirstHit(campaign.log, 'c2')).toBe(true);
    const rested = hitJonas(medics(), [1, 1], ['END', 'END']);
    expect(woundsOf(appendLog(rested, recover(rested, 'rest', 'c2', fixedRandom(), clock)), 'c2').end).toBe(0);
  });

  it('schwere Wunden: Aufwachen auf mindestens 1, keine Ruhe, Behandlung nur mit Medical-3 in einer Einrichtung, 5W6 Tage', () => {
    let campaign = hitJonas(medics(), [6, 6], ['STR', 'STR']);
    campaign = hitJonas(campaign, [6, 6], ['DEX', 'DEX']);
    expect(woundStateOf(campaign, 'c2')).toBe('serious');
    campaign = appendLog(campaign, recover(campaign, 'wake', 'c2', fixedRandom(), clock));
    expect(woundsOf(campaign, 'c2')).toEqual({ str: 5, dex: 7, end: 0 });
    const options = recoveryOptions(campaign, 'c2');
    expect(options).toMatchObject({ serious: true, rest: false, treatable: true });
    expect(options.healers[0]).toEqual({ id: 'c1', name: 'Kira Vant', able: false, why: 'braucht Medical-3' });
    expect(() => recover(campaign, 'rest', 'c2', fixedRandom(), clock)).toThrow(/heilt ohne Behandlung nicht/);
    expect(() => recover(campaign, 'treatment', 'c2', fixedRandom(), clock, 'c1')).toThrow(/Medical-3/);
    expect(() => recover(campaign, 'treatment', 'c2', fixedRandom(), clock, 'c2')).toThrow(/Einrichtung/);
    const treated = recover(campaign, 'treatment', 'c2', fixedRandom(3, 4, 5, 6, 2), clock, 'c2', true);
    expect(treated.dice).toEqual([3, 4, 5, 6, 2]);
    campaign = appendLog(campaign, treated);
    expect(woundStateOf(campaign, 'c2')).toBe('unhurt');
    expect(fromCampaignFile(toCampaignFile(campaign), 'k2').log).toEqual(campaign.log);
  });

  it('auch ein NSC der laufenden Begegnung lässt sich wecken und behandeln, ein toter nicht', () => {
    let campaign = onTurn(medics(), 'c1');
    const attack = aimAt(startAttack(campaign), campaign, 'n2');
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'nothing', 'close', attack), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(2, 0), clock));
    expect(woundStateOf(campaign, 'n2')).toBe('unconscious');
    campaign = appendLog(campaign, recover(campaign, 'wake', 'n2', fixedRandom(), clock));
    campaign = appendLog(campaign, recover(campaign, 'treatment', 'n2', fixedRandom(), clock, 'c1'));
    expect(woundStateOf(campaign, 'n2')).toBe('unhurt');
  });
});

describe('Kampfsimulation', () => {
  it('beim Anlegen nur die Entfernung; die Überraschung ist der erste Wurf im Kampf, vorher ist keiner am Zug', () => {
    const fresh = rollEncounter(there, fixedRandom(1, 5), clock, undefined, 2).campaign;
    expect(currentEncounter(fresh)).not.toHaveProperty('pcSurprise');
    expect(needsSurprise(currentEncounter(fresh)!)).toBe(true);
    expect(turnOf(fresh)).toBeUndefined();
    const rolled = rollSurprise(fresh, fixedRandom(5, 2));
    // Thugs mit Anführer: NSC +1; die SC haben keine DMs. 5 gegen 2 + 1: keine Überraschung, die SC zuerst.
    expect(currentEncounter(rolled)).toMatchObject({ pcSurprise: { die: 5, dm: 0 }, npcSurprise: { die: 2, dm: 1 } });
    expect(surpriseParts(rolled, currentEncounter(rolled)!)).toEqual({ pcs: [], npcs: [{ label: 'Anführer', dm: 1 }] });
    expect(turnOf(rolled)?.id).toBe('c1');
    expect(() => rollSurprise(rolled, fixedRandom())).toThrow(/schon gewürfelt/);
  });

  it('würfelt Entfernung (2W6 + Gelände) und, als ersten Wurf im Kampf, Überraschung je Partei mit DMs', () => {
    const encounter = currentEncounter(thugs())!;
    // Alle Würfe zeigen das Kleinste: Entfernung 1 + 1 = 2 → Close; Überraschung SC 1 ± 0, Thugs 1 + 1 (Anführer).
    expect(encounter).toMatchObject({ rangeDice: [1, 1], band: 0, close: true, pcSurprise: { die: 1, dm: 0 }, npcSurprise: { die: 1, dm: 1 }, round: 1, acted: [] });
    expect(encounter.bandDie).toBeUndefined();
    expect(encounterRangeOf(encounter)).toBe('close');
    expect(surpriseOf(encounter)).toBeUndefined();
    expect(firstSide(encounter)).toBe('npcs');
    const inside = rollEncounter(there, fixedRandom(), clock, 15, 2, 'interior').campaign.encounters[0]!;
    expect(inside).toMatchObject({ terrain: 'interior', band: 0, close: false });
    expect(encounterRangeOf(inside)).toBe('short');
    expect([2, 4, 7, 8, 10, 12].map((n) => encounterRange([1, n - 1] as const, 0))).toEqual(['close', 'medium', 'medium', 'long', 'veryLong', 'veryLong']);
    expect(encounterRange([6, 6], 4)).toBe('veryLong');
  });

  it('würfelt das Startband gleichverteilt innerhalb der Reichweite: Medium 1W2, Long 1W8, Very Long 1W10', () => {
    expect(startBand('close', fixedRandom())).toEqual({ band: 0, close: true });
    expect(startBand('short', fixedRandom())).toEqual({ band: 0, close: false });
    expect(startBand('medium', fixedRandom(1))).toEqual({ band: 1, close: false, bandDie: 1 });
    expect(startBand('medium', fixedRandom(2))).toEqual({ band: 2, close: false, bandDie: 2 });
    expect(startBand('long', fixedRandom(1))).toEqual({ band: 3, close: false, bandDie: 1 });
    expect(startBand('long', fixedRandom(8))).toEqual({ band: 10, close: false, bandDie: 8 });
    expect(startBand('veryLong', fixedRandom(1))).toEqual({ band: 11, close: false, bandDie: 1 });
    expect(startBand('veryLong', fixedRandom(10))).toEqual({ band: 20, close: false, bandDie: 10 });
    expect(() => startBand('long', fixedRandom(9))).toThrow();
    // Wüste +4: 1 + 1 + 4 = 6 → Medium; der Würfel des Startbands (1W2) zeigt 2 → Band 2.
    const twoOnD2 = { int: (min: number, max: number) => (min === 1 && max === 2 ? 2 : min) };
    const rolled = rollEncounter(there, twoOnD2, clock, 15, 2, 'desert').campaign.encounters[0]!;
    expect(rolled.rangeDice).toEqual([1, 1]);
    expect(rolled).toMatchObject({ band: 2, close: false, bandDie: 2 });
    expect(encounterRangeOf(rolled)).toBe('medium');
  });

  it('die Reichweite folgt aus dem Band; über 20 sind die Parteien entkommen', () => {
    expect([0, 1, 2, 3, 10, 11, 20].map((b) => rangeOfBand(b, false))).toEqual(['short', 'medium', 'medium', 'long', 'long', 'veryLong', 'veryLong']);
    expect(rangeOfBand(0, true)).toBe('close');
    expect(rangeOfBand(21, false)).toBeUndefined();
    expect(firstBand('long')).toEqual({ band: 3, close: false });
    expect(firstBand('close')).toEqual({ band: 0, close: true });
  });

  it('bewegt die Parteien Schritt für Schritt: Berührung, Band 0, Band 1 … 20, entkommen', () => {
    let campaign = thugs();
    expect(() => moveBand(campaign, -1)).toThrow(/Näher als in Berührung/);
    const steps: string[] = [];
    for (let i = 0; i < 4; i++) {
      campaign = moveBand(campaign, 1);
      const e = currentEncounter(campaign)!;
      steps.push(`${e.band}${e.close ? 'c' : ''}`);
    }
    expect(steps).toEqual(['0', '1', '2', '3']);
    campaign = moveBand(moveBand(campaign, -1), -1);
    campaign = moveBand(campaign, -1);
    expect(currentEncounter(campaign)).toMatchObject({ band: 0, close: false });
    campaign = moveBand(campaign, -1);
    expect(currentEncounter(campaign)).toMatchObject({ band: 0, close: true });
    campaign = setBand(campaign, 20);
    campaign = moveBand(campaign, 1);
    expect(isEscaped(currentEncounter(campaign)!)).toBe(true);
    expect(encounterRangeOf(currentEncounter(campaign)!)).toBeUndefined();
    expect(() => moveBand(campaign, 1)).toThrow(/schon entkommen/);
    expect(currentEncounter(moveBand(campaign, -1))).toMatchObject({ band: 20 });
    expect(() => setBand(campaign, 3, true)).toThrow(/nur auf Band 0/);
    expect(() => setBand(campaign, 22)).toThrow(/gibt es nicht/);
  });

  it('nimmt das Band in die Kampagnendatei mit; ältere Dateien mit Reichweite bekommen deren erstes Band', () => {
    const campaign = setBand(thugs(), 4);
    expect(currentEncounter(fromCampaignFile(toCampaignFile(campaign), 'k2'))).toMatchObject({ band: 4, close: false });
    const old = (range?: string, extra: Record<string, unknown> = {}) => {
      const json = JSON.parse(toCampaignFile(thugs())) as { campaign: { encounters: Record<string, unknown>[] } };
      const rest = Object.fromEntries(Object.entries(json.campaign.encounters[0]!).filter(([key]) => key !== 'band' && key !== 'close'));
      json.campaign.encounters[0] = { ...rest, ...(range === undefined ? {} : { range }), ...extra };
      return currentEncounter(fromCampaignFile(JSON.stringify(json), 'k3'))!;
    };
    expect(old('long')).toMatchObject({ band: 3, close: false });
    expect(old('veryLong')).toMatchObject({ band: 11, close: false });
    expect(old('close')).toMatchObject({ band: 0, close: true });
    expect(old(undefined)).toMatchObject({ band: 0, close: false });
    expect(() => old(undefined, { band: 3, close: true })).toThrow(/keine gültige Kampagnendatei \(campaign\.encounters\.0\)/);
  });

  it('entkommen: Der Zug hat keine Reichweite, ein Angriff geht nicht', () => {
    let campaign = setBand(thugs(), ESCAPED_BAND);
    campaign = endTurn(endTurn(campaign));
    expect(turnAttack(campaign, 'n1')).toEqual({ against: 'n1', armor: 'mesh' });
  });

  it('zieht Partei für Partei, die mit dem höheren Wurf zuerst; nach allen beginnt die nächste Runde', () => {
    let campaign = thugs();
    const encounter = currentEncounter(campaign)!;
    expect(fightOrder(campaign, encounter).map((s) => s.id)).toEqual(['n1', 'n2', 'c1', 'c2']);
    const turns: string[] = [];
    for (let i = 0; i < 5; i++) {
      turns.push(`${currentEncounter(campaign)!.round}:${turnOf(campaign)!.id}`);
      campaign = endTurn(campaign);
    }
    expect(turns).toEqual(['1:n1', '1:n2', '1:c1', '1:c2', '2:n1']);
  });

  it('mit Überraschung zieht in Runde 1 nur die überraschende Partei', () => {
    const campaign = thugs();
    const surprised: Campaign = { ...campaign, encounters: campaign.encounters.map((e) => ({ ...e, pcSurprise: { die: 6, dm: 0 }, npcSurprise: { die: 2, dm: 1 } })) };
    expect(surpriseOf(currentEncounter(surprised)!)).toBe('pcs');
    let c = surprised;
    const turns: string[] = [];
    for (let i = 0; i < 4; i++) {
      turns.push(`${currentEncounter(c)!.round}:${turnOf(c)!.id}`);
      c = endTurn(c);
    }
    expect(turns).toEqual(['1:c1', '1:c2', '2:c1', '2:c2']);
  });

  it('wer bewusstlos ist, kommt nicht dran; ist eine Partei außer Gefecht, ist keiner mehr dran', () => {
    let campaign = onTurn(thugs(), 'c1');
    // Kira schlägt den Anführer bewusstlos (Hände, 1W6: 4 auf DEX).
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'mesh', 'close', aimAt(startAttack(campaign), campaign, 'n1')), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, rollDamage(campaign, 0, fixedRandom(4, 1), clock));
    // In der nächsten Runde kommt der Anführer nicht dran.
    campaign = endTurn(endTurn(campaign));
    expect(currentEncounter(campaign)!.round).toBe(2);
    expect(turnOf(campaign)!.id).toBe('n2');
    campaign = onTurn(campaign, 'c1');
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'nothing', 'close', aimAt(startAttack(campaign), campaign, 'n2')), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, rollDamage(campaign, 2, fixedRandom(6, 0), clock));
    expect(defeatedSide(campaign, currentEncounter(campaign)!)).toBe('npcs');
    expect(turnOf(campaign)).toBeUndefined();
  });

  it('im Zug: nur das Ziel wählen, Rüstung und Entfernung stehen fest', () => {
    let campaign = setBand(thugs(), 0);
    expect(turnOf(campaign)!.id).toBe('n1');
    // Der Anführer greift an, wie ein SC: nur das Ziel, eines aus der anderen Partei.
    expect(turnAttack(campaign, 'c1')).toEqual({ against: 'c1', armor: 'nothing', range: 'short' });
    expect(() => turnAttack(campaign, 'n2')).toThrow(/eigenen Partei/);
    campaign = endTurn(endTurn(campaign));
    expect(turnOf(campaign)!.id).toBe('c1');
    expect(turnAttack(campaign, 'n1')).toEqual({ against: 'n1', armor: 'mesh', range: 'short' });
    // Angreifen tut, wer am Zug ist, gleich wer oben steht.
    expect(turnAttack(setFocus(campaign, 'c2'), 'n1')).toEqual({ against: 'n1', armor: 'mesh', range: 'short' });
  });
});

describe('Fehler, die der Fuzz-Test gefunden hat', () => {
  it('fällt der Letzte der Runde außerhalb seines Zugs weg, beginnt die nächste Runde statt stehenzubleiben', () => {
    let campaign = thugs();
    campaign = endTurn(endTurn(endTurn(campaign)));
    expect(turnOf(campaign)!.id).toBe('c2');
    // Jonas wird NSC: In Runde 1 ist keiner mehr übrig, also ist Runde 2 dran.
    campaign = { ...campaign, characters: campaign.characters.map((c) => (c.id === 'c2' ? { ...c, npc: true } : c)) };
    expect(turnOf(campaign)!.id).toBe('n1');
    campaign = endTurn(campaign);
    expect(currentEncounter(campaign)).toMatchObject({ round: 2, acted: ['n1'] });
  });

  it('wer im Kassenbuch steht, wird beim Entfernen ausgeblendet statt gelöscht', () => {
    const paid = book(there, 'deposit', 100, clock, undefined, 'c2');
    expect(characterOf(removeCharacter(paid, 'c2'), 'c2').retired).toBe(true);
    expect(removeCharacter(there, 'c2').characters.map((c) => c.id)).toEqual(['c1']);
  });

  it('Wunden senken STR, DEX und END auch in Proben', () => {
    // Jonas: DEX 8, eine Wunde von 4 auf DEX → 4, also −1 statt ±0.
    let campaign = onTurn(setFocus(thugs(), 'c2'), 'n2');
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'nothing', 'close', aimAt(startAttack(campaign), campaign, 'c2')), campaign, fixedRandom(6, 6), clock));
    campaign = appendLog(campaign, { kind: 'damage', at: clock.now(), of: 0, dice: [2, 2], to: ['DEX', 'DEX'] });
    expect(characteristicOptions(undefined, campaign).find((o) => o.characteristic === 'DEX')).toMatchObject({ value: 4, dm: -1 });
  });
});

/** Würfelt immer das Höchste: Überleben, Patent, Beförderung, Weiterverpflichtung und Altern gelingen. */
const high: Random = { int: (_min, max) => max };

/**
 * Ein SC, der `terms` Terms in `service` gedient hat: Alles gelingt, Fertigkeiten von der ersten
 * Tabelle, nach dem letzten Term geht er ab (mit 1+1, sonst zwingt eine 12 zum Bleiben).
 */
function veteran(campaign: Campaign, service: string, terms: number): Campaign {
  let g: Generation = { career: { rolls: [] } };
  for (let i = 0; i < 6; i++) g = rollNext(g, high);
  g = enlist(g, service, high);
  for (let step = stateOf(g).step; step !== 'name'; step = stateOf(g).step) {
    if (step === 'skill') g = rollSkill(g, tableOptions(stateOf(g)).find((o) => o.available)!.table.id, high);
    else if (step === 'cascade') g = chooseCascade(g, cascadeOptions(g)[0]!.skill);
    else if (step === 'reenlist') g = stateOf(g).terms < terms ? reenlist(g, true, high) : reenlist(g, false, fixedRandom(1, 1));
    else if (step === 'muster') g = muster(g, 'benefit', fixedRandom(1));
    else g = rollNext(g, high);
  }
  expect(stateOf(g)).toMatchObject({ terms, service: { id: service } });
  return finishGeneration(setGeneration(campaign, g), 'Veteran').campaign;
}

describe('Würfel der Anzahl', () => {
  it('würfelt die Anzahl mit dem Würfel der Kampagne; W6 ist die Regel und wird nicht gespeichert', () => {
    const w3 = setQuantityDie(there, 3);
    expect(w3.quantityDie).toBe(3);
    // 14: 3W6 Rowdies, hier 3W3; ein Wurf über 3 ginge nicht.
    const encounter = rollEncounter(w3, fixedRandom(3, 3, 2), clock, 14).encounter!;
    expect(encounter).toMatchObject({ quantityDie: 3 });
    expect(encounter.npcs).toHaveLength(8);
    expect(() => rollEncounter(w3, fixedRandom(4), clock, 14)).toThrow(/nicht in 1–3/);
    expect(rollEncounter(there, fixedRandom(6, 6), clock, 15).encounter).toMatchObject({ quantityDie: 6, npcs: { length: 12 } });
    expect(setQuantityDie(w3, 6)).not.toHaveProperty('quantityDie');
    expect(() => setQuantityDie(there, 5)).toThrow(/W5/);
  });

  it('übersteht die Kampagnendatei, an der Kampagne und an der Begegnung', () => {
    const rolled = rollEncounter(setQuantityDie(there, 4), fixedRandom(4), clock, 23).campaign;
    const back = fromCampaignFile(toCampaignFile(rolled), rolled.id);
    expect(back.quantityDie).toBe(4);
    expect(back.encounters[0]).toMatchObject({ quantityDie: 4, npcs: { length: 4 } });
  });
});

describe('Reaktion', () => {
  it('eine echte 2 oder 12 gilt ohne DM, sonst begrenzt auf 3 bis 12 (S. 21)', () => {
    expect(reactionOf([5, 6], 1)).toBe(12);
    expect(reactionOf([6, 6], -1)).toBe(12);
    expect(reactionOf([1, 1], 1)).toBe(2);
    expect(reactionOf([1, 2], -1)).toBe(3);
    expect(reactionOf([3, 4], 0)).toBe(7);
  });

  it('DM +1 für einen lebenden SC mit 5 oder mehr Terms in Army, Navy, Scouts oder Marines', () => {
    expect(veteranDm(there)).toBe(0);
    const army = veteran(there, 'army', 5);
    expect(veteranDm(army)).toBe(1);
    expect(veteranDm(veteran(there, 'scouts', 5))).toBe(1);
    expect(veteranDm(veteran(there, 'army', 4))).toBe(0);
    expect(veteranDm(veteran(there, 'merchants', 5))).toBe(0);
    expect(veteranDm({ ...army, characters: army.characters.map((c) => ({ ...c, dead: true })) })).toBe(0);
  });

  it('hält den DM an der Begegnung fest; Bevölkerung 9+ gleicht ihn aus', () => {
    const army = veteran(there, 'army', 5);
    expect(rollEncounter(army, fixedRandom(), clock, 15, 2).encounter).toMatchObject({ reactionDm: 1 });
    const crowded = setLocation(setHexes(army, [{ ...regina, uwp: { ...regina.uwp, population: 9 } }]), '0207');
    expect(rollEncounter(crowded, fixedRandom(), clock, 15, 2).encounter).toMatchObject({ reactionDm: 0 });
  });
});
