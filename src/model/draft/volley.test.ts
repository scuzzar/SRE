import { describe, expect, it } from 'vitest';
import {
  ammoOf,
  appendLog,
  characterOf,
  createCampaign,
  fromCampaignFile,
  isNeighbour,
  pendingDamage,
  removeLogEntry,
  rollDamage,
  rollEncounter,
  setHexes,
  setLocation,
  spendRound,
  toCampaignFile,
  volleyOf,
  weaponOf,
  type Campaign,
  type Hex,
} from '..';
import { fixedClock, fixedRandom } from '../testing';
import { aimAt, attackBy, attackRounds, chooseFire, chooseTarget, evaluateAttack, firesBurst, neighbourTargets, rollAttack, startAttack } from './attack';

// Regina: TL 7. Vier Thugs (15, L): n1 Anführer mit Foil und Mesh, n2 bis n4 mit Club ohne Rüstung.
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

/** Kira Vant (c1, DEX A) bekommt diese Waffe geladen in die Hand und ein Magazin dazu. */
function armed(weapon: string, ammo: string, rounds?: number): Campaign {
  const there = setLocation(setHexes(createCampaign(), [regina]), '0207');
  const campaign = rollEncounter(there, fixedRandom(1, 5), clock, undefined, 4).campaign;
  return {
    ...campaign,
    characters: campaign.characters.map((c) =>
      c.id === 'c1'
        ? { ...c, possessions: [...c.possessions, { of: weapon, count: 1, ...(rounds === undefined ? {} : { rounds }) }, { of: ammo, count: 1 }], primary: weapon, wields: weapon }
        : c,
    ),
  };
}

const autoRifle = () => armed('auto-rifle', 'auto-rifle-ammo');

describe('Feuerstoß', () => {
  it('ist beim Automatic Rifle vorgewählt; zwei Würfe auf das Ziel, dazu der darüber und der darunter in der Liste mit DM −3', () => {
    const campaign = autoRifle();
    const attack = chooseTarget(campaign, 'nothing', 'medium', aimAt(startAttack(campaign), campaign, 'n2'));
    // Automatic Rifle gegen Nothing +6, Medium +2, DEX A +2, ohne Fertigkeit ±0.
    expect(evaluateAttack(attack, campaign)).toMatchObject({ need: -2 });
    const results = rollAttack(attack, campaign, fixedRandom(1, 1, 2, 2, 3, 3, 4, 4), clock);
    expect(results.map((r) => [r.against, r.armor, r.dm, r.volley, r.dice])).toEqual([
      ['n2', 'nothing', 10, undefined, [1, 1]],
      ['n2', 'nothing', 10, 0, [2, 2]],
      // n1 trägt Mesh: +2 statt +6, und −3 als Nachbar.
      ['n1', 'mesh', 3, 0, [3, 3]],
      ['n3', 'nothing', 7, 0, [4, 4]],
    ]);
    expect(attackRounds(attack, campaign)).toBe(4);
  });

  it('am Ende der Liste trifft er nur einen Nachbarn; Tote dazwischen überspringt er', () => {
    const campaign = autoRifle();
    expect(neighbourTargets(campaign, { npc: 'n4' }, weaponOf('auto-rifle'), true, fixedRandom())).toEqual([{ npc: 'n3' }]);
    // n3 stirbt: Für n4 ist dann n2 der Nachbar darüber.
    const dead = { ...campaign, encounters: campaign.encounters.map((e) => ({ ...e, npcs: e.npcs.map((n) => (n.id === 'n3' ? { ...n, upp: { ...n.upp, str: 0, dex: 0, end: 0 } } : n)) })) };
    expect(neighbourTargets(dead, { npc: 'n4' }, weaponOf('auto-rifle'), true, fixedRandom())).toEqual([{ npc: 'n2' }]);
  });

  it('braucht 4 Schuss; mit weniger geht nur der Einzelschuss', () => {
    const campaign = armed('auto-rifle', 'auto-rifle-ammo', 3);
    const attack = chooseTarget(campaign, 'nothing', 'medium', aimAt(startAttack(campaign), campaign, 'n2'));
    expect(() => rollAttack(attack, campaign, fixedRandom(), clock)).toThrow(/braucht 4 Schuss/);
    expect(() => spendRound(campaign, 'c1', 4)).toThrow(/braucht 4 Schuss/);
    const single = chooseFire(attack, campaign, false);
    expect(rollAttack(single, campaign, fixedRandom(), clock)).toHaveLength(1);
    expect(ammoOf(characterOf(spendRound(campaign, 'c1', attackRounds(single, campaign)), 'c1'))!.rounds).toBe(2);
  });

  it('der Einzelschuss des Automatic Rifle nimmt die Zeile des Rifle: ein Wurf, keine Nachbarn', () => {
    const campaign = autoRifle();
    const attack = chooseFire(chooseTarget(campaign, 'nothing', 'medium', aimAt(startAttack(campaign), campaign, 'n2')), campaign, false);
    expect(firesBurst(weaponOf('auto-rifle'), attack)).toBe(false);
    // Rifle gegen Nothing +3, Medium ±0, DEX A beim Automatic Rifle +2.
    expect(evaluateAttack(attack, campaign)!.dm.total).toBe(5);
    expect(rollAttack(attack, campaign, fixedRandom(), clock)).toMatchObject([{ against: 'n2', dm: 5 }]);
    expect(attackRounds(attack, campaign)).toBe(1);
  });

  it('die Submachinegun schießt nur Feuerstöße', () => {
    const campaign = armed('submachinegun', 'submachinegun-ammo');
    const attack = chooseTarget(campaign, 'mesh', 'short', aimAt(startAttack(campaign), campaign, 'n1'));
    expect(() => chooseFire(attack, campaign, false)).toThrow(/keine Wahl/);
    // n1 steht oben: nur n2 als Nachbar.
    expect(rollAttack(attack, campaign, fixedRandom(), clock).map((r) => r.against)).toEqual(['n1', 'n1', 'n2']);
  });

  it('ein NSC mit Feuerstoß trifft neben dem SC oben die SC darüber und darunter in der Kampagne', () => {
    const campaign = autoRifle();
    const soldier = { ...campaign, encounters: campaign.encounters.map((e) => ({ ...e, npcs: e.npcs.map((n) => (n.id === 'n2' ? { ...n, wields: 'submachinegun' } : n)) })) };
    const attack = chooseTarget(soldier, 'nothing', 'short', attackBy(startAttack(soldier), soldier, 'n2'));
    const results = rollAttack(attack, soldier, fixedRandom(), clock);
    expect(results.map((r) => [r.by, r.victim])).toEqual([
      ['n2', 'c1'],
      ['n2', 'c1'],
      ['n2', 'c2'],
    ]);
  });
});

describe('Schrotflinte', () => {
  it('ein Wurf auf das Ziel, dazu bis zu 3 ausgeloste Nachbarn ohne Abzug, jeder gegen seine Rüstung', () => {
    const campaign = armed('shotgun', 'shotgun-ammo');
    const attack = chooseTarget(campaign, 'nothing', 'short', aimAt(startAttack(campaign), campaign, 'n2'));
    // Ziel: 2 Würfel; dann drei Lose aus [n1, n3, n4]: Stelle 2 (n4), 0 (n1), 0 (n3); dann je 2 Würfel.
    const results = rollAttack(attack, campaign, fixedRandom(6, 6, 2, 0, 0), clock);
    // Shotgun gegen Nothing +5, Short +1, DEX A +1; gegen Mesh −1.
    expect(results.map((r) => [r.against, r.armor, r.dm, r.volley])).toEqual([
      ['n2', 'nothing', 7, undefined],
      ['n4', 'nothing', 7, 0],
      ['n1', 'mesh', 1, 0],
      ['n3', 'nothing', 7, 0],
    ]);
    expect(attackRounds(attack, campaign)).toBe(1);
  });

  it('ohne Ziel gibt es keine Nachbarn', () => {
    const campaign = armed('shotgun', 'shotgun-ammo');
    expect(rollAttack(chooseTarget(campaign, 'nothing', 'short'), campaign, fixedRandom(), clock)).toHaveLength(1);
  });
});

describe('Garbe im Log', () => {
  /** Ein Feuerstoß auf n2, der alles trifft. */
  function volley(): Campaign {
    const campaign = autoRifle();
    const attack = chooseTarget(campaign, 'nothing', 'medium', aimAt(startAttack(campaign), campaign, 'n2'));
    return appendLog(campaign, ...rollAttack(attack, campaign, fixedRandom(6, 6, 6, 6, 6, 6, 6, 6), clock));
  }

  it('Schaden steht der Reihe nach für jeden Treffer an; Nachbarn sind als solche erkennbar', () => {
    let campaign = volley();
    expect(volleyOf(campaign.log, 2)).toEqual([0, 1, 2, 3]);
    expect([0, 1, 2, 3].map((i) => isNeighbour(campaign.log, i))).toEqual([false, false, true, true]);
    for (const hit of [0, 1, 2, 3]) {
      expect(pendingDamage(campaign.log)).toBe(hit);
      campaign = appendLog(campaign, rollDamage(campaign, hit, fixedRandom(1, 1, 1), clock));
    }
    expect(pendingDamage(campaign.log)).toBeUndefined();
  });

  it('einen Wurf löschen löscht die ganze Garbe mit ihrem Schaden; spätere Verweise rücken nach', () => {
    let campaign = volley();
    campaign = appendLog(campaign, rollDamage(campaign, 2, fixedRandom(1, 1, 1), clock));
    campaign = appendLog(campaign, ...rollAttack(chooseTarget(campaign, 'nothing', 'medium', aimAt(startAttack(campaign), campaign, 'n3')), campaign, fixedRandom(), clock));
    const after = removeLogEntry(campaign, 3);
    expect(after.log).toHaveLength(4);
    expect(after.log.map((e) => (e.kind === 'attack' ? [e.against, e.volley] : e.kind))).toEqual([
      ['n3', undefined],
      ['n3', 0],
      ['n2', 0],
      ['n4', 0],
    ]);
  });

  it('übersteht die Kampagnendatei; eine Garbe, die nicht auf ihren ersten Wurf verweist, wird abgelehnt', () => {
    const campaign = volley();
    expect(fromCampaignFile(toCampaignFile(campaign), 'k1').log).toEqual(campaign.log);
    const file = JSON.parse(toCampaignFile(campaign)) as { campaign: { log: { volley?: number }[] } };
    file.campaign.log[3]!.volley = 1;
    expect(() => fromCampaignFile(JSON.stringify(file), 'k1')).toThrow(/ersten Wurf/);
    file.campaign.log[3]!.volley = 0;
    file.campaign.log.push({ ...file.campaign.log[3]! });
    expect(() => fromCampaignFile(JSON.stringify(file), 'k1')).toThrow(/höchstens 4 Würfe/);
  });
});
