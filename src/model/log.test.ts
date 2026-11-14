import { describe, expect, it } from 'vitest';
import { answerOf, answerOfPick, editNote, isRandomEvent, isSuccess, isYesAnswer, rollDice, slotOf, totalOf, upgradeOracle, writeNote, type CardPick, type LogEntry, type TaskResult } from './log';
import { fixedClock, fixedRandom } from './testing';

describe('Orakel', () => {
  // Die Grenzen je Stufe: Ja! und Nein! nach Mythic (Chaosfaktor 5), Ja? und Nein? gespiegelt.
  const bands = (chance: number) => Array.from({ length: 100 }, (_, i) => answerOf(i + 1, chance)).reduce<Record<string, [number, number]>>((acc, a, i) => ({ ...acc, [a]: [acc[a]?.[0] ?? i + 1, i + 1] }), {});

  it('sagt Ja, wenn der Wurf höchstens die Chance ist', () => {
    expect(isYesAnswer(answerOf(50, 50))).toBe(true);
    expect(isYesAnswer(answerOf(51, 50))).toBe(false);
  });

  it('teilt jede Stufe in sechs Antworten wie in der Tabelle des Modells', () => {
    expect(bands(75)).toEqual({ yesStrong: [1, 15], yes: [16, 60], yesWeak: [61, 75], noWeak: [76, 80], no: [81, 95], noStrong: [96, 100] });
    expect(bands(50)).toEqual({ yesStrong: [1, 10], yes: [11, 40], yesWeak: [41, 50], noWeak: [51, 60], no: [61, 90], noStrong: [91, 100] });
    expect(bands(25)).toEqual({ yesStrong: [1, 5], yes: [6, 20], yesWeak: [21, 25], noWeak: [26, 40], no: [41, 85], noStrong: [86, 100] });
  });

  it('liest die Antwort einer Kartenauswahl aus Wurf und festgehaltener Chance; ohne Stufe keine', () => {
    const pick: CardPick = { kind: 'card', at: '2026-10-23T14:00:00.000Z', oracle: 61, odds: 'low', chance: 25, items: [] };
    expect(answerOfPick(pick)).toBe('no');
    expect(answerOfPick({ kind: 'card', at: '2026-10-23T14:00:00.000Z', items: [] })).toBeUndefined();
  });

  it('macht aus einer alten Orakelantwort eine Kartenauswahl an derselben Stelle, mit Frage, Wurf, Stufe und Chance', () => {
    const old = { kind: 'oracle', at: '2026-10-23T14:00:00.000Z', day: 3, question: 'Ist Halvek ehrlich?', roll: 61, chance: 25, odds: 'low' } as unknown as LogEntry;
    const note: LogEntry = { kind: 'note', at: '2026-10-23T14:01:00.000Z', text: 'Er lügt.', interprets: 0 };
    expect(upgradeOracle({ log: [old, note] }).log).toEqual([{ kind: 'card', at: '2026-10-23T14:00:00.000Z', day: 3, question: 'Ist Halvek ehrlich?', oracle: 61, odds: 'low', chance: 25, items: [] }, note]);
    const today = { log: [note] };
    expect(upgradeOracle(today)).toBe(today);
  });
});

describe('Zufallsereignis', () => {
  it('ist ein Pasch im Orakelwurf bis zum Chaosfaktor 5: 11, 22, 33, 44, 55', () => {
    expect(Array.from({ length: 100 }, (_, i) => i + 1).filter(isRandomEvent)).toEqual([11, 22, 33, 44, 55]);
  });
});

describe('Deutungen und Notizen', () => {
  const log: LogEntry[] = [
    { kind: 'card', at: '2026-10-23T14:00:00.000Z', oracle: 61, odds: 'low', chance: 25, items: [] },
    { kind: 'note', at: '2026-10-23T14:01:00.000Z', text: 'Wir landen auf Regina.' },
  ];

  it('schreibt eine Notiz ohne Verweis; Leerraum am Rand fällt weg', () => {
    expect(writeNote(log, '  Fracht an Bord.  ', fixedClock())).toEqual({ kind: 'note', at: '2026-10-23T14:00:00.000Z', text: 'Fracht an Bord.' });
  });

  it('ändert den Text einer Notiz; Zeitpunkt und Verweis bleiben, editedAt kommt dazu', () => {
    const withReading: LogEntry[] = [...log, { kind: 'note', at: '2026-10-23T14:02:00.000Z', text: 'Halvek lügt.', interprets: 0 }];
    expect(editNote(withReading, 2, '  Halvek lügt nicht.  ', fixedClock())).toEqual({ kind: 'note', at: '2026-10-23T14:02:00.000Z', text: 'Halvek lügt nicht.', interprets: 0, editedAt: '2026-10-23T14:00:00.000Z' });
    expect(editNote(withReading, 2, 'Halvek lügt.', fixedClock())).toBe(withReading[2]);
    expect(() => editNote(withReading, 2, '   ', fixedClock())).toThrow(/braucht Text/);
    expect(() => editNote(withReading, 0, 'Text', fixedClock())).toThrow(/nur der Text einer Notiz/);
  });

  it('schreibt eine Deutung zu einem früheren Ergebnis', () => {
    expect(writeNote(log, 'Halvek lügt.', fixedClock(), 0)).toMatchObject({ kind: 'note', text: 'Halvek lügt.', interprets: 0 });
  });

  it('kennt keine leere Notiz und deutet keine Notiz und nichts, was es nicht gibt', () => {
    expect(() => writeNote(log, '   ', fixedClock())).toThrow(/braucht Text/);
    expect(() => writeNote(log, 'So.', fixedClock(), 1)).toThrow(/nur ein Ergebnis/);
    expect(() => writeNote(log, 'So.', fixedClock(), 2)).toThrow(/gibt/);
    expect(() => writeNote(log, 'So.', fixedClock(), -1)).toThrow(/gibt/);
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
