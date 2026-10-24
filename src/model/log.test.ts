import { describe, expect, it } from 'vitest';
import { askOracle, isSuccess, isYes, rollDice, slotOf, totalOf, type TaskResult } from './log';
import { fixedClock, fixedRandom } from './testing';

describe('Orakel', () => {
  it('sagt Ja, wenn der Wurf höchstens die Chance der Stufe ist', () => {
    const yes = askOracle('medium', fixedRandom(50), fixedClock());
    const no = askOracle('medium', fixedRandom(51), fixedClock());
    expect([yes.chance, isYes(yes)]).toEqual([50, true]);
    expect([no.chance, isYes(no)]).toEqual([50, false]);
  });

  it('hält Stufe und Chance zum Zeitpunkt des Wurfs fest', () => {
    const answer = askOracle('low', fixedRandom(61), fixedClock());
    expect(answer).toEqual({ kind: 'oracle', at: '2026-10-23T14:00:00.000Z', roll: 61, chance: 25, odds: 'low' });
  });

  it('nimmt eine Frage auf; eine leere Frage gibt es nicht', () => {
    expect(askOracle('high', fixedRandom(1), fixedClock(), '  Ist Halvek ehrlich?  ').question).toBe('Ist Halvek ehrlich?');
    expect('question' in askOracle('high', fixedRandom(1), fixedClock(), '   ')).toBe(false);
  });

  it('kennt keine unbekannte Stufe', () => {
    expect(() => askOracle('certain', fixedRandom(1), fixedClock())).toThrow(/gibt es nicht/);
  });
});

describe('Würfelwurf und Kartenauswahl', () => {
  it('speichert die Würfel, die Summe folgt daraus', () => {
    const roll = rollDice(fixedRandom(5, 4), fixedClock());
    expect(roll.dice).toEqual([5, 4]);
    expect(totalOf(roll)).toBe(9);
  });

  it('leitet das Feld eines übernommenen Eintrags ab', () => {
    expect(slotOf({ picked: ['situation.stakes.1'] }).label).toBe('Einsatz');
    expect(slotOf({ picked: ['event.action.1.mythic.1', 'event.action.2.mythic.1'] }).label).toBe('Aktion');
  });
});

describe('Probenergebnis', () => {
  const result: TaskResult = { kind: 'task', at: '', for: 'c1', counts: [], odds: 'low', dice: [4, 3], dm: 3, target: 10 };

  it('gelingt, wenn Würfel + DM den festgehaltenen Zielwert erreichen', () => {
    expect(isSuccess(result)).toBe(true);
    expect(isSuccess({ ...result, dice: [3, 3] })).toBe(false);
  });
});
