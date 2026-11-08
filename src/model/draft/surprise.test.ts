import { describe, expect, it } from 'vitest';
import {
  alarmAfterAttack,
  appendLog,
  blowsOf,
  createCampaign,
  currentEncounter,
  endEncounter,
  endTurn,
  fighterOf,
  needsWounding,
  fightState,
  logDamage,
  rollDamage,
  rollEncounter,
  setHexes,
  setLocation,
  surprisingOf,
  turnOf,
  withEncounter,
  type Campaign,
  type Encounter,
  type Hex,
  type Side,
} from '..';
import { fixedClock, fixedRandom, onTurn } from '../testing';
import { aimAt, attackExtras, chooseTarget, chooseWeakened, evaluateAttack, rollAttack, turnAttack, type Attack } from './attack';

// Regina: TL 7. Zwei Thugs: n1 Anführer mit Body Pistol und Mesh, n2 mit Club; beide UPP 222222.
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
const clock = fixedClock();

function unarmored(campaign: Campaign): Campaign {
  return { ...campaign, characters: campaign.characters.map((c) => Object.fromEntries(Object.entries(c).filter(([key]) => key !== 'wears')) as typeof c) };
}

/** Die Begegnung ändern, wie ein Test sie braucht. */
function patch(campaign: Campaign, change: Partial<Encounter>): Campaign {
  return withEncounter(campaign, { ...currentEncounter(campaign)!, ...change });
}

/** Thugs auf Band 0 in Berührung; Kira (c1) mit den Händen, Jonas (c2) mit der Blade. Mit `side` hat diese Partei Überraschung. */
function thugs(side?: Side): Campaign {
  const there = setLocation(setHexes(unarmored(createCampaign()), [regina]), '0207');
  let campaign = rollEncounter(there, fixedRandom(1, 5), clock, undefined, 2).campaign;
  campaign = { ...campaign, characters: campaign.characters.map((c) => (c.id === 'c2' ? { ...c, wields: 'blade' } : c)) };
  const surprise = side === 'pcs' ? { pcSurprise: { die: 6, dm: 0 }, npcSurprise: { die: 1, dm: 0 } } : side === 'npcs' ? { pcSurprise: { die: 1, dm: 0 }, npcSurprise: { die: 6, dm: 0 } } : { pcSurprise: { die: 3, dm: 0 }, npcSurprise: { die: 3, dm: 0 } };
  return patch(campaign, { ...surprise, band: 0, close: true });
}

/** Wer für den Zug oben stehen muss, steht oben: der SC am Zug bzw. das Ziel des NSC. */
function ready(campaign: Campaign, target: string): Campaign {
  const turn = turnOf(campaign)!;
  return { ...campaign, focus: turn.side === 'pcs' ? turn.id : target };
}

/** Der Angriff dessen, der am Zug ist, auf dieses Ziel. */
function turn(campaign: Campaign, target: string): Attack {
  return turnAttack(ready(campaign, target), target);
}

/** Der Kämpfer am Zug greift an und der Alarm wird geprüft, wie im Controller. */
function attack(given: Campaign, target: string, dice: [number, number], change: Partial<Attack> = {}): Campaign {
  const campaign = ready(given, target);
  const prepared = { ...turnAttack(campaign, target), ...change };
  const results = rollAttack(prepared, campaign, fixedRandom(...dice), clock);
  return alarmAfterAttack(appendLog(campaign, ...results), results);
}

function state(campaign: Campaign): Encounter {
  return fightState(campaign, currentEncounter(campaign)!);
}

describe('Überraschung bis zum Alarm (SR 20)', () => {
  it('Schläge und Hiebe ohne Treffer geben keinen Alarm: Die Überraschung hält auch in Runde 2', () => {
    let campaign = thugs('pcs');
    expect(turnOf(campaign)?.id).toBe('c1');
    campaign = attack(campaign, 'n2', [1, 1]);
    expect(campaign.log.at(-1)).toMatchObject({ kind: 'attack', with: 'hands', strike: 'surprise' });
    campaign = endTurn(campaign);
    campaign = attack(campaign, 'n2', [1, 1]);
    campaign = endTurn(campaign);
    expect(state(campaign)).toMatchObject({ round: 2 });
    expect(state(campaign).alarm).toBeUndefined();
    expect(surprisingOf(state(campaign))).toBe('pcs');
    expect(turnOf(campaign)?.id).toBe('c1');
    // Schläge mit Überraschung kosten keine Ausdauer: Kira hat END 8.
    expect(blowsOf(campaign, 'c1')).toBe(8);
  });

  it('ein Schuss gibt Alarm; wer in der Runde noch dran ist, greift noch mit Überraschung an, danach ziehen beide', () => {
    let campaign = thugs('npcs');
    expect(turnOf(campaign)?.id).toBe('n1');
    campaign = attack(campaign, 'c1', [1, 1]);
    expect(state(campaign).alarm).toBe(1);
    campaign = endTurn(campaign);
    expect(turnOf(campaign)?.id).toBe('n2');
    expect(surprisingOf(state(campaign))).toBe('npcs');
    campaign = endTurn(campaign);
    expect(state(campaign).round).toBe(2);
    expect(surprisingOf(state(campaign))).toBeUndefined();
    campaign = endTurn(endTurn(campaign));
    expect(turnOf(campaign)?.id).toBe('c1');
  });

  it('bleibt das Ziel wach, schreit es: Alarm', () => {
    let campaign = attack(thugs('pcs'), 'n2', [6, 6]);
    // Hände: 1W6; die 1 geht auf STR (2 → 1), n2 bleibt wach.
    campaign = logDamage(campaign, rollDamage(campaign, 0, fixedRandom(1, 0), clock), fixedRandom());
    expect(state(campaign).alarm).toBe(1);
  });

  it('fällt das Ziel, sieht es bei 9+ ein Kamerad, der noch nicht angegriffen wurde; der Wurf steht am Schaden', () => {
    const hit = attack(thugs('pcs'), 'n2', [6, 6]);
    // Die 6 bringt n2 um (STR, DEX, END je 2).
    const roll = rollDamage(hit, 0, fixedRandom(6, 0, 0), clock);
    const seen = logDamage(hit, roll, fixedRandom(5, 4));
    expect(seen.log.at(-1)).toMatchObject({ kind: 'damage', alarmDice: [5, 4] });
    expect(state(seen).alarm).toBe(1);
    const unseen = logDamage(hit, roll, fixedRandom(4, 4));
    expect(unseen.log.at(-1)).toMatchObject({ alarmDice: [4, 4] });
    expect(state(unseen).alarm).toBeUndefined();
    expect(surprisingOf(state(unseen))).toBe('pcs');
  });

  it('wurde der Kamerad schon angegriffen, sieht keiner hin: kein Wurf', () => {
    let campaign = attack(thugs('pcs'), 'n1', [1, 1]);
    campaign = endTurn(campaign);
    campaign = attack(campaign, 'n2', [6, 6]);
    const at = campaign.log.length - 1;
    campaign = logDamage(campaign, rollDamage(campaign, at, fixedRandom(6, 6, 0, 0), clock), fixedRandom(6, 6));
    expect(campaign.log.at(-1)).not.toHaveProperty('alarmDice');
    expect(state(campaign).alarm).toBeUndefined();
  });
});

describe('Ausdauer (SR 20, 22)', () => {
  it('Combat-Schläge: END zu Beginn minus Combat-Schläge minus Läufe; danach geschwächt mit dem DM der Waffe', () => {
    let campaign = thugs();
    expect(turnOf(campaign)?.id).toBe('c1');
    campaign = endTurn(campaign);
    // Jonas: END 7, Blade.
    expect(blowsOf(campaign, 'c2')).toBe(7);
    const full = evaluateAttack(turn(campaign, 'n2'), ready(campaign, 'n2'))!;
    expect(attackExtras(turn(campaign, 'n2'), ready(campaign, 'n2')).strike).toBe('combat');
    campaign = attack(campaign, 'n2', [1, 1]);
    expect(campaign.log.at(-1)).toMatchObject({ strike: 'combat' });
    expect(blowsOf(campaign, 'c2')).toBe(6);
    // Jeder Lauf kostet jeden Kämpfer der Partei einen Combat-Schlag.
    campaign = patch(campaign, { pcRuns: 2 });
    expect(blowsOf(campaign, 'c2')).toBe(4);
    // Ohne Combat-Schläge ist jeder Schlag geschwächt: Blade −2.
    campaign = patch(campaign, { pcRuns: 20, round: 2, acted: ['c1'] });
    expect(blowsOf(campaign, 'c2')).toBe(0);
    expect(attackExtras(turn(campaign, 'n2'), ready(campaign, 'n2')).strike).toBe('weakened');
    expect(evaluateAttack(turn(campaign, 'n2'), ready(campaign, 'n2'))!.dm.total).toBe(full.dm.total - 2);
  });

  it('freiwillig geschwächt zählt nicht gegen die END; gegen Wehrlose ist der Schlag Special', () => {
    let campaign = endTurn(thugs());
    const weakened = chooseWeakened(turn(campaign, 'n2'), true);
    expect(attackExtras(weakened, ready(campaign, 'n2'))).toMatchObject({ strike: 'weakened', weakened: -2 });
    campaign = attack(campaign, 'n2', [1, 1], { weakened: true });
    expect(campaign.log.at(-1)).toMatchObject({ strike: 'weakened' });
    expect(blowsOf(campaign, 'c2')).toBe(7);
    // n2 bewusstlos (STR 2 → 0), dann ist ein Hieb auf ihn Special.
    campaign = patch(campaign, { round: 2, acted: ['c1', 'n1', 'n2'] });
    campaign = attack(campaign, 'n2', [6, 6]);
    const at = campaign.log.length - 1;
    campaign = logDamage(campaign, { kind: 'damage', at: '2026-10-23T15:00:00.000Z', of: at, dice: [2, 1], to: ['STR'], points: [2] }, fixedRandom());
    campaign = patch(campaign, { round: 3, acted: ['c1'] });
    expect(attackExtras(turn(campaign, 'n2'), ready(campaign, 'n2')).strike).toBe('special');
  });
});

describe('Parade (SR 22)', () => {
  it('wer mit Faust oder Klinge angegriffen wird und selbst eine führt, zieht seine Stufe ab; gegen Schüsse nicht', () => {
    let campaign = thugs();
    // n2 (Club, Brawling-1) greift Jonas an, der mit der Blade (Blade-1) pariert.
    const byN2 = onTurn(campaign, 'n2');
    expect(attackExtras(aimAt({}, byN2, 'c2'), byN2).parry).toBe(-1);
    // Gegen die Body Pistol des Anführers gibt es keine Parade.
    const byN1 = onTurn(campaign, 'n1');
    expect(attackExtras(aimAt({}, byN1, 'c2'), byN1).parry).toBe(0);
    // Kira mit den Händen hat kein Brawling: Stufe 0, keine Parade.
    expect(attackExtras(aimAt({}, byN2, 'c1'), byN2).parry).toBe(0);
    // Ein Gewehr pariert als Cudgel: mit Cudgel-2 −2.
    const rifle = onTurn({ ...campaign, characters: campaign.characters.map((c) => (c.id === 'c1' ? { ...c, wields: 'rifle', skills: [...c.skills, { of: 'cudgel', level: 2, retired: false }] } : c)) }, 'n2');
    expect(attackExtras(aimAt({}, rifle, 'c1'), rifle).parry).toBe(-2);
    // Jonas greift n2 an: der pariert mit seinem Club (Fertigkeit 1).
    campaign = endTurn(campaign);
    expect(attackExtras(turn(campaign, 'n2'), ready(campaign, 'n2')).parry).toBe(-1);
  });
});

describe('Wunden im laufenden Kampf (SR 21, Errata zu The Traveller Book S. 35–36)', () => {
  /** Ein NSC trifft Kira (ohne Rüstung) auf Close. */
  function clubOn(campaign: Campaign, npc: string) {
    const top = onTurn(campaign, npc);
    return rollAttack(chooseTarget(top, 'nothing', 'close', aimAt({}, top, 'c1')), top, fixedRandom(6, 6), clock);
  }

  /** n2 trifft Kira mit dem Club; der Schaden geht wie angegeben auf ihre Attribute. */
  function hitKira(campaign: Campaign, to: 'STR' | 'DEX' | 'END', points: number): Campaign {
    const at = campaign.log.length;
    const hit = clubOn(campaign, 'n2');
    const after = appendLog(campaign, ...hit);
    return appendLog(after, { kind: 'damage', at: clock.now(), of: at, dice: [points, 1], to: [to, to], points: [points, 1] });
  }

  it('Wunden aus dem laufenden Kampf senken STR und DEX für die DMs nicht, im nächsten Kampf schon', () => {
    // Kira: STR 7, mit den Händen (nötig 6, darunter −2).
    let campaign = hitKira(thugs(), 'STR', 1);
    expect(fighterOf(campaign, 'c1')).toMatchObject({ upp: { str: 5 }, fighting: { str: 7 } });
    // Nach dem Kampf zählen die Wunden: Ohne Begegnung ist STR 5 auch der Wert für die DMs.
    campaign = endEncounter(campaign);
    expect(fighterOf(campaign, 'c1').fighting.str).toBe(5);
    // In der nächsten Begegnung zählen die Wunden von vorher.
    campaign = rollEncounter(campaign, fixedRandom(1, 5), clock, undefined, 2).campaign;
    expect(fighterOf(campaign, 'c1').fighting.str).toBe(5);
  });

  it('die Regel für die erste Wunde gilt in jedem Kampf neu', () => {
    let campaign = hitKira(thugs(), 'DEX', 1);
    // Der nächste Treffer in derselben Begegnung ist kein erster: Kira verteilt selbst.
    campaign = appendLog(campaign, ...clubOn(campaign, 'n2'));
    expect(needsWounding(campaign, campaign.log.length - 1)).toBe(true);
    // In einer neuen Begegnung ist er wieder ein erster und geht von selbst auf ein Attribut.
    campaign = rollEncounter(endEncounter(campaign), fixedRandom(1, 5), clock, undefined, 2).campaign;
    campaign = patch(campaign, { band: 0, close: true, pcSurprise: { die: 3, dm: 0 }, npcSurprise: { die: 3, dm: 0 } });
    campaign = appendLog(campaign, ...clubOn(campaign, currentEncounter(campaign)!.npcs[1]!.id));
    expect(needsWounding(campaign, campaign.log.length - 1)).toBe(false);
  });
});
