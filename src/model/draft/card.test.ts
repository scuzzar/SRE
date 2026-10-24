import { describe, expect, it } from 'vitest';
import { entryOf, ref, slotOf, slotWithId } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { canConfirm, confirmCard, drawableEntries, drawCard, drawnIn, isVisible, redrawCard, togglePick } from './card';

const visible = ref.sections.flatMap((s) => s.slots).filter(isVisible);
const firstOf = (slot: string) => slotWithId(slot).columns.map((c) => drawableEntries(c)[0]!.id);

describe('Karte ziehen', () => {
  it('zieht für jedes sichtbare Feld aus jeder Spalte einen Eintrag, in Kartenreihenfolge', () => {
    const card = drawCard(fixedRandom());
    expect(card.drawn).toEqual(visible.flatMap((slot) => slot.columns.map((c) => drawableEntries(c)[0]!.id)));
    expect(card.picked).toEqual([]);
  });

  it('zieht aus jeder Mythic-Tabelle ein Paar', () => {
    const card = drawCard(fixedRandom());
    expect(drawnIn(card, 'event.mythic.action').map((e) => entryOf(e).text)).toEqual(['aufgeben', 'Vorteil']);
    expect(drawnIn(card, 'event.mythic.description').map((e) => entryOf(e).text)).toEqual(['abenteuerlustig', 'abnorm']);
    expect(drawnIn(card, 'npc.mythic.appearance')).toEqual(['npc.appearance.1.mythic.1', 'npc.appearance.2.mythic.1']);
  });

  it('nimmt eine gestellte Frage mit auf die Karte', () => {
    expect(drawCard(fixedRandom(), 'Was will der Kontakt?').question).toBe('Was will der Kontakt?');
    expect('question' in drawCard(fixedRandom(), '')).toBe(false);
  });

  it('übergeht Felder, in denen eine Spalte nur ausgeblendete Einträge hat', () => {
    const drawnSlots = [...new Set(drawCard(fixedRandom()).drawn.map((e) => slotOf({ picked: [e] }).id))];
    expect(drawnSlots.slice(0, 4)).toEqual(['event.mythic.action', 'event.mythic.description', 'senses.mythic.sounds', 'senses.mythic.smells']);
    expect(drawnSlots).not.toContain('event.verb');
    expect(drawnSlots).not.toContain('npc.occupation');
  });

  it('zieht nie einen ausgeblendeten Eintrag, auch nicht mit dem größten Wurf', () => {
    const highest = { int: (_min: number, max: number) => max };
    const retired = new Set(
      ref.sections.flatMap((s) => s.slots.flatMap((slot) => slot.columns.flatMap((c) => c.entries.filter((e) => e.retired).map((e) => e.id)))),
    );
    expect(retired.size).toBeGreaterThan(0);
    for (const random of [fixedRandom(), highest]) {
      expect(drawCard(random).drawn.filter((e) => retired.has(e))).toEqual([]);
    }
  });

  it('behält ausgetauschte Einträge für alte Logeinträge', () => {
    expect(entryOf('event.verb.3')).toMatchObject({ text: 'suchen', retired: true });
    expect(slotOf({ picked: ['event.verb.3'] }).label).toBe('Verb');
    expect(slotOf({ picked: ['npc.appearance.2.mythic.5'] }).id).toBe('npc.mythic.appearance');
  });
});

describe('Auswahl auf der Karte', () => {
  const card = drawCard(fixedRandom());

  it('nimmt ein Feld mit seinem ganzen Paar auf und wieder heraus', () => {
    const once = togglePick(card, 'event.mythic.description');
    expect(once.picked).toEqual(['event.mythic.description']);
    expect(togglePick(once, 'event.mythic.description').picked).toEqual([]);
  });

  it('lässt nur gezogene Felder auswählen', () => {
    expect(() => togglePick(card, 'event.verb')).toThrow(/nur, was gezogen wurde/);
  });

  it('bestätigt erst mit Auswahl, dann je Feld beide Einträge, in der Reihenfolge der Karte und mit der Frage', () => {
    const asked = { ...card, question: 'Wer steckt dahinter?' };
    expect(canConfirm(asked)).toBe(false);
    expect(() => confirmCard(asked, fixedClock())).toThrow(/mindestens ein Feld/);
    const picked = togglePick(togglePick(asked, 'npc.mythic.appearance'), 'event.mythic.action');
    const pick = confirmCard(picked, fixedClock());
    expect(pick).toEqual({
      kind: 'card',
      at: '2026-10-23T14:00:00.000Z',
      question: 'Wer steckt dahinter?',
      items: [{ picked: firstOf('event.mythic.action') }, { picked: firstOf('npc.mythic.appearance') }],
    });
    expect(pick.items.map((i) => slotOf(i).label)).toEqual(['Aktion', 'Aussehen']);
  });

  it('neu ziehen verliert die Auswahl und behält die Frage', () => {
    const picked = togglePick({ ...card, question: 'Und jetzt?' }, 'event.mythic.action');
    const again = redrawCard(picked, fixedRandom(1));
    expect(again.picked).toEqual([]);
    expect(again.question).toBe('Und jetzt?');
    expect(entryOf(again.drawn[0]!).text).toBe('begleiten');
  });
});
