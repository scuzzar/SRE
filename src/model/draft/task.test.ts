import { describe, expect, it } from 'vitest';
import { createCampaign, inputOf, isSuccess, removeCharacter, appendLog, setFocus, setOdds, updateCharacter, characterOf, type Campaign } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { characteristicOptions, chooseSkill, evaluateTask, hasSkill, rollTask, startTask, toggleCharacteristic, type Task } from './task';

// Kira Vant (c1), UPP 7A8975, Pilot-2; Jonas Reyl (c2), UPP 687A88, ohne Pilot. Siehe README, „Beispiele“.
// Oben steht zuerst Kira; für Jonas wischt man weiter.
const hard: Campaign = setOdds(createCampaign(), 'low');
const jonas: Campaign = setFocus(hard, 'c2');

describe('Probe vorbereiten', () => {
  it('hat ohne Fertigkeit nichts zu würfeln und keine wählbaren Attribute', () => {
    const task = startTask(hard);
    expect(hasSkill(task)).toBe(false);
    expect(characteristicOptions(task, hard).some((o) => o.selectable)).toBe(false);
    expect(() => toggleCharacteristic(task, hard, 'DEX')).toThrow(/Erst eine Fertigkeit/);
    expect(() => rollTask(task, hard, fixedRandom(), fixedClock())).toThrow(/Erst eine Fertigkeit/);
  });

  it('zeigt nach der Fertigkeit, welche Attribute +1 oder −1 brächten; ±0 ist nicht wählbar', () => {
    const task = chooseSkill(startTask(hard), hard, 'pilot');
    const options = characteristicOptions(task, hard).map((o) => [o.characteristic, o.dm, o.selectable]);
    expect(options).toEqual([
      ['STR', 0, false],
      ['DEX', 1, true],
      ['END', 0, false],
      ['INT', 1, true],
      ['EDU', 0, false],
      ['SOC', -1, true],
    ]);
    expect(() => toggleCharacteristic(task, hard, 'END')).toThrow(/keinen Einfluss/);
  });

  it('Kira fliegt ein Stunt-Manöver: Schwierig 10+, Pilot +2, DEX A +1 → braucht 7+ (58 %)', () => {
    const task = toggleCharacteristic(chooseSkill(startTask(hard), hard, 'pilot'), hard, 'DEX');
    const odds = evaluateTask(task, hard);
    expect(odds).toMatchObject({ dm: 3, target: 10, need: 7 });
    expect(Math.round(odds.chance)).toBe(58);
  });

  it('Jonas ohne Pilot im Asteroidenfeld: ohne Fertigkeit −3 → braucht 13+ (unmöglich), würfeln geht trotzdem', () => {
    const task = chooseSkill(startTask(jonas), jonas, null);
    expect(evaluateTask(task, jonas)).toEqual({ dm: -3, target: 10, need: 13, chance: 0 });
    const result = rollTask(task, jonas, fixedRandom(6, 6), fixedClock());
    expect(isSuccess(result)).toBe(false);
    expect('uses' in result).toBe(false);
  });

  it('Jack-of-all-Trades zählt als Stufe 0, egal welche Stufe, und ersetzt „ohne Fertigkeit“', () => {
    const reyl = characterOf(jonas, 'c2');
    const campaign = updateCharacter(jonas, 'c2', { ...inputOf(reyl), skills: [...inputOf(reyl).skills, { of: 'jack-of-all-trades', level: 2 }] });
    const task = chooseSkill(startTask(campaign), campaign, 'jack-of-all-trades');
    expect(evaluateTask(task, campaign)).toMatchObject({ dm: 0, target: 10, need: 10 });
    expect(rollTask(task, campaign, fixedRandom(5, 5), fixedClock())).toMatchObject({ uses: 'jack-of-all-trades', dm: 0 });
    expect(() => chooseSkill(startTask(campaign), campaign, null)).toThrow(/Jack-of-all-Trades/);
    // Eine vorbereitete Probe ohne Fertigkeit lässt sich nicht mehr würfeln, sobald er JoT hat.
    const unskilled = chooseSkill(startTask(jonas), jonas, null);
    expect(() => rollTask(unskilled, campaign, fixedRandom(), fixedClock())).toThrow(/Jack-of-all-Trades/);
  });

  it('nimmt die Wahl zurück, wenn man dieselbe Fertigkeit noch einmal wählt', () => {
    const chosen = toggleCharacteristic(chooseSkill(startTask(hard), hard, 'pilot'), hard, 'DEX');
    expect(chooseSkill(chosen, hard, 'pilot')).toEqual({ unskilled: false, counts: [] });
  });

  it('behält die Attribute, wenn man die Fertigkeit wechselt, und zählt sie in UPP-Reihenfolge', () => {
    let task: Task = chooseSkill(startTask(hard), hard, 'pilot');
    task = toggleCharacteristic(toggleCharacteristic(task, hard, 'INT'), hard, 'DEX');
    task = chooseSkill(task, hard, null);
    expect(task).toEqual({ unskilled: true, counts: ['DEX', 'INT'] });
  });

  it('lässt nur Fertigkeiten des Charakters zu', () => {
    expect(() => chooseSkill(startTask(jonas), jonas, 'pilot')).toThrow(/hat Pilot nicht/);
  });

  it('gilt immer dem Charakter oben; ohne Lebenden gibt es keine Probe', () => {
    const task = chooseSkill(startTask(hard), hard, 'pilot');
    expect(rollTask(task, hard, fixedRandom(3, 3), fixedClock()).for).toBe('c1');
    // Jonas wird ausgeblendet, Kira gelöscht: Niemand steht oben.
    const campaign = removeCharacter(removeCharacter(appendLog(hard, { kind: 'task', at: '', for: 'c2', counts: [], odds: 'low', dice: [1, 1], dm: 0, target: 10 }), 'c2'), 'c1');
    expect(() => startTask(campaign)).toThrow(/keinen lebenden Charakter/);
  });
});

describe('Probe würfeln', () => {
  it('hält Würfel, DM und Zielwert fest; der Erfolg hängt nicht vom heutigen Stand ab', () => {
    const task = toggleCharacteristic(chooseSkill(startTask(hard), hard, 'pilot'), hard, 'DEX');
    const result = rollTask(task, hard, fixedRandom(4, 3), fixedClock());
    expect(result).toEqual({
      kind: 'task',
      at: '2026-10-23T14:00:00.000Z',
      for: 'c1',
      uses: 'pilot',
      counts: ['DEX'],
      odds: 'low',
      dice: [4, 3],
      dm: 3,
      target: 10,
    });
    expect(isSuccess(result)).toBe(true);
  });

  it('nutzt den Zielwert der gewählten Stufe', () => {
    const easy = setOdds(jonas, 'high');
    const task = chooseSkill(startTask(easy), easy, 'steward');
    expect(evaluateTask(task, easy)).toMatchObject({ dm: 1, target: 6, need: 5 });
  });
});
