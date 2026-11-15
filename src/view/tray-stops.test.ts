import { describe, expect, it } from 'vitest';
import { settleAt, step, type Heights } from './tray-stops';

// Ein Smartphone im Hochformat: Griff mit Rand 44, eingeklappt 160, halb 420, voll 775.
const heights: Heights = { hidden: 44, collapsed: 160, half: 420, full: 775 };

describe('Wo das Ziehblatt einrastet', () => {
  it('rastet ohne Schwung an der nächsten Stufe ein, nie dazwischen', () => {
    expect(settleAt(heights, 88, 0)).toBe('hidden');
    expect(settleAt(heights, 110, 0)).toBe('collapsed');
    expect(settleAt(heights, 300, 0.1)).toBe('half');
    expect(settleAt(heights, 700, -0.1)).toBe('full');
  });

  it('geht nach einem Wisch eine Stufe weiter in seine Richtung, auch nach kurzem Weg', () => {
    expect(settleAt(heights, 175, 0.8)).toBe('half');
    expect(settleAt(heights, 430, 0.8)).toBe('full');
    expect(settleAt(heights, 405, -0.8)).toBe('collapsed');
    expect(settleAt(heights, 150, -0.8)).toBe('hidden');
  });

  it('bleibt am Anschlag, wenn es in Wischrichtung keine Stufe mehr gibt', () => {
    expect(settleAt(heights, 775, 2)).toBe('full');
    expect(settleAt(heights, 44, -2)).toBe('hidden');
  });

  it('wechselt mit den Pfeiltasten eine Stufe und überspringt Stufen auf gleicher Höhe', () => {
    expect(step(heights, 'collapsed', 1)).toBe('half');
    expect(step(heights, 'collapsed', -1)).toBe('hidden');
    expect(step(heights, 'full', 1)).toBe('full');
    // Im Querformat fallen halb und voll zusammen.
    const flat: Heights = { hidden: 44, collapsed: 160, half: 340, full: 340 };
    expect(step(flat, 'collapsed', 1)).toBe('half');
    expect(step(flat, 'full', -1)).toBe('collapsed');
  });
});
