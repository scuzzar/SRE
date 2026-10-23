import { describe, expect, it } from 'vitest';
import { ref, slotOf } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { canConfirm, confirmCard, drawCard, redrawCard, togglePick } from './card';

const slots = ref.sections.flatMap((s) => s.slots);

describe('Karte ziehen', () => {
  it('zieht für jedes Feld aller Bereiche einen Eintrag, Themen-Reiter eingeschlossen, in Kartenreihenfolge', () => {
    const card = drawCard(fixedRandom());
    expect(card.drawn).toEqual(slots.map((slot) => slot.entries[0]!.id));
    expect(card.picked).toEqual([]);
  });

  it('nimmt eine gestellte Frage mit auf die Karte', () => {
    expect(drawCard(fixedRandom(), 'Was will der Kontakt?').question).toBe('Was will der Kontakt?');
    expect('question' in drawCard(fixedRandom(), '')).toBe(false);
  });

  it('zieht drei verschiedene Namen aus drei Feldern', () => {
    for (let i = 0; i < 12; i++) {
      const random = { int: (min: number, max: number) => Math.min(max, min + i) };
      const names = drawCard(random)
        .drawn.filter((e) => e.startsWith('names.'))
        .map((e) => ref.sections.find((s) => s.id === 'names')!.slots.flatMap((sl) => sl.entries).find((x) => x.id === e)!.text);
      expect(new Set(names).size).toBe(3);
    }
  });
});

describe('Auswahl auf der Karte', () => {
  const card = drawCard(fixedRandom());
  const [first, second, third] = card.drawn;

  it('nimmt Einträge auf und wieder heraus', () => {
    const once = togglePick(card, second!);
    expect(once.picked).toEqual([second]);
    expect(togglePick(once, second!).picked).toEqual([]);
  });

  it('lässt nur gezogene Einträge auswählen', () => {
    const notDrawn = slots[0]!.entries[1]!.id;
    expect(() => togglePick(card, notDrawn)).toThrow(/nur, was gezogen wurde/);
  });

  it('bestätigt erst mit Auswahl, dann in der Reihenfolge der Karte und mit der Frage', () => {
    const asked = { ...card, question: 'Wer steckt dahinter?' };
    expect(canConfirm(asked)).toBe(false);
    expect(() => confirmCard(asked, fixedClock())).toThrow(/mindestens ein Eintrag/);
    const picked = togglePick(togglePick(togglePick(asked, third!), first!), second!);
    const pick = confirmCard(picked, fixedClock());
    expect(pick).toEqual({
      kind: 'card',
      at: '2026-10-23T14:00:00.000Z',
      question: 'Wer steckt dahinter?',
      items: [{ picked: first }, { picked: second }, { picked: third }],
    });
    expect(pick.items.map((i) => slotOf(i).label)).toEqual(['Verb', 'Adjektiv', 'Substantiv']);
  });

  it('neu ziehen verliert die Auswahl und behält die Frage', () => {
    const picked = togglePick({ ...card, question: 'Und jetzt?' }, first!);
    const again = redrawCard(picked, fixedRandom(1));
    expect(again.picked).toEqual([]);
    expect(again.question).toBe('Und jetzt?');
    expect(again.drawn[0]).toBe(slots[0]!.entries[1]!.id);
  });
});
