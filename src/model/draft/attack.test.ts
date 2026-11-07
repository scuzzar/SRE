import { describe, expect, it } from 'vitest';
import { appendLog, createCampaign, isSuccess, setFocus, setWields, type Campaign } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { attackTable, chooseTarget, evaluateAttack, keepTarget, rollAttack, startAttack } from './attack';

// Kira Vant (c1): UPP 7A8975, Auto Pistol-1, besitzt eine Automatic Pistol.
// Jonas Reyl (c2): UPP 687A88, Blade-1, besitzt eine Blade. Siehe README, „Beispiele“.
const kira: Campaign = setWields(createCampaign(), 'c1', 'automatic-pistol');
const jonas: Campaign = setWields(setFocus(createCampaign(), 'c2'), 'c2', 'blade');

describe('Angriff vorbereiten', () => {
  it('hat ohne Rüstung und Reichweite nichts zu würfeln', () => {
    const attack = startAttack(kira);
    expect(evaluateAttack(attack, kira)).toBeUndefined();
    expect(() => rollAttack(attack, kira, fixedRandom(), fixedClock())).toThrow(/Rüstung und Reichweite/);
  });

  it('Kira schießt mit der Automatic Pistol auf ein Ziel in Jack auf Short: Auto Pistol +1, Jack +1, Short +2, DEX A +1 → 3+', () => {
    const odds = evaluateAttack(chooseTarget(kira, 'jack', 'short'), kira)!;
    expect(odds.dm).toEqual({
      skill: 1,
      armor: 1,
      range: 2,
      characteristic: 1,
      total: 5,
    });
    expect(odds).toMatchObject({ target: 8, need: 3 });
    expect(Math.round(odds.chance)).toBe(97);
  });

  it('gegen Combat Armor auf Medium braucht sie 15+: unmöglich, würfeln geht trotzdem', () => {
    const attack = chooseTarget(kira, 'combat', 'medium');
    expect(evaluateAttack(attack, kira)).toMatchObject({ need: 15, chance: 0 });
    const result = rollAttack(attack, kira, fixedRandom(6, 6), fixedClock())[0]!;
    expect(result).toMatchObject({
      kind: 'attack',
      for: 'c1',
      with: 'automatic-pistol',
      uses: 'auto-pistol',
      armor: 'combat',
      range: 'medium',
      dice: [6, 6],
      dm: -7,
      target: 8,
    });
    expect(isSuccess(result)).toBe(false);
  });

  it('mit der Blade reicht Jonas nicht über Short hinaus', () => {
    expect(() => chooseTarget(jonas, 'nothing', 'medium')).toThrow(/kein Angriff/);
    expect(evaluateAttack(chooseTarget(jonas, 'nothing', 'close'), jonas)).toMatchObject({
      dm: { skill: 1, armor: 1, range: 1, characteristic: 0, total: 3 },
      need: 5,
    });
    const table = attackTable(jonas);
    expect(table).toHaveLength(7);
    expect(table[0]!.map((cell) => cell?.need)).toEqual([5, 5, undefined, undefined, undefined]);
  });

  it('ohne Waffe in der Hand kämpft man mit den Händen, ohne Brawling mit Stufe 0', () => {
    const campaign = createCampaign();
    const odds = evaluateAttack(chooseTarget(campaign, 'mesh', 'close'), campaign)!;
    expect(odds.dm).toEqual({
      skill: 0,
      armor: -4,
      range: 2,
      characteristic: 0,
      total: -2,
    });
    expect(rollAttack(chooseTarget(campaign, 'mesh', 'close'), campaign, fixedRandom(5, 5), fixedClock())[0]).not.toHaveProperty('uses');
  });

  it('das nötige Attribut kostet, das vorteilhafte bringt: Cutlass unter STR 7 −2, ab 11 +2', () => {
    // Jonas (STR 6) mit einer Cutlass aus dem Besitz.
    const withCutlass: Campaign = {
      ...jonas,
      characters: jonas.characters.map((c) =>
        c.id === 'c2'
          ? {
              ...c,
              possessions: [...c.possessions, { of: 'cutlass', count: 1 }],
              secondary: 'cutlass',
            }
          : c,
      ),
    };
    const armed = setWields(withCutlass, 'c2', 'cutlass');
    expect(evaluateAttack(chooseTarget(armed, 'nothing', 'short'), armed)!.dm).toMatchObject({ skill: 0, armor: 4, range: 2, characteristic: -2 });
  });

  it('nach einem Wechsel der Waffe bleibt das Ziel, außer die Reichweite geht nicht mehr', () => {
    const attack = chooseTarget(kira, 'cloth', 'long');
    const hands = setWields(kira, 'c1', 'hands');
    expect(keepTarget(attack, hands)).toEqual({ armor: 'cloth' });
    expect(keepTarget(chooseTarget(kira, 'cloth', 'close'), hands)).toEqual({
      armor: 'cloth',
      range: 'close',
    });
  });

  it('ein Angriff im Log ändert sich nicht, wenn sich der Charakter danach ändert', () => {
    const result = rollAttack(chooseTarget(kira, 'jack', 'short'), kira, fixedRandom(1, 1), fixedClock())[0]!;
    const later = setWields(appendLog(kira, result), 'c1', 'hands');
    expect(later.log[0]).toEqual(result);
    expect(isSuccess(result)).toBe(false);
  });
});
