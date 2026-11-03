import { describe, expect, it } from 'vitest';
import { entryOf, ref, slotOf, slotWithId } from '..';
import { fixedClock, fixedRandom } from '../testing';
import { canConfirm, confirmCard, drawableEntries, drawCard, drawNames, drawnIn, isVisible, pickedCount, redrawCard, togglePick, toggleRoll } from './card';
import { bellWeights, pathCount, rollBell, rollMap, rollScatter, scatters } from '../card-roll';

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
    expect(drawnIn(card, 'mythic.event.action').map((e) => entryOf(e).text)).toEqual(['aufgeben', 'Vorteil']);
    expect(drawnIn(card, 'mythic.event.description').map((e) => entryOf(e).text)).toEqual(['abenteuerlustig', 'abnorm']);
    expect(drawnIn(card, 'mythic.npc.appearance')).toEqual(['npc.appearance.1.mythic.1', 'npc.appearance.2.mythic.1']);
  });

  it('nimmt eine gestellte Frage mit auf die Karte', () => {
    expect(drawCard(fixedRandom(), 'Was will der Kontakt?').question).toBe('Was will der Kontakt?');
    expect('question' in drawCard(fixedRandom(), '')).toBe(false);
  });

  it('übergeht Felder, in denen eine Spalte nur ausgeblendete Einträge hat', () => {
    const drawnSlots = [...new Set(drawCard(fixedRandom()).drawn.map((e) => slotOf({ picked: [e] }).id))];
    expect(drawnSlots.slice(0, 4)).toEqual(['mythic.event.action', 'mythic.event.description', 'mythic.senses.sounds', 'mythic.senses.smells']);
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
    expect(slotOf({ picked: ['npc.appearance.2.mythic.5'] }).id).toBe('mythic.npc.appearance');
  });
});

describe('Auswahl auf der Karte', () => {
  const card = drawCard(fixedRandom());

  it('nimmt ein Feld mit seinem ganzen Paar auf und wieder heraus', () => {
    const once = togglePick(card, 'mythic.event.description');
    expect(once.picked).toEqual(['mythic.event.description']);
    expect(togglePick(once, 'mythic.event.description').picked).toEqual([]);
  });

  it('lässt nur gezogene Felder auswählen', () => {
    expect(() => togglePick(card, 'event.verb')).toThrow(/nur, was gezogen wurde/);
  });

  it('bestätigt erst mit Auswahl, dann je Feld beide Einträge, in der Reihenfolge der Karte und mit der Frage', () => {
    const asked = { ...card, question: 'Wer steckt dahinter?' };
    expect(canConfirm(asked)).toBe(false);
    expect(() => confirmCard(asked, fixedClock())).toThrow(/mindestens ein Feld/);
    const picked = togglePick(togglePick(asked, 'mythic.npc.appearance'), 'mythic.event.action');
    const pick = confirmCard(picked, fixedClock());
    expect(pick).toEqual({
      kind: 'card',
      at: '2026-10-23T14:00:00.000Z',
      question: 'Wer steckt dahinter?',
      items: [{ picked: firstOf('mythic.event.action') }, { picked: firstOf('mythic.npc.appearance') }],
    });
    expect(pick.items.map((i) => slotOf(i).label)).toEqual(['Aktion', 'Aussehen']);
  });

  it('neu ziehen verliert die Auswahl und behält die Frage', () => {
    const picked = togglePick({ ...card, question: 'Und jetzt?' }, 'mythic.event.action');
    const again = redrawCard(picked, fixedRandom(1));
    expect(again.picked).toEqual([]);
    expect(again.question).toBe('Und jetzt?');
    expect(entryOf(again.drawn[0]!).text).toBe('begleiten');
  });
});

describe('Wurffelder der Karte', () => {
  it('würfelt die Glockenzahl nach Gewichten: 1 und 10 je 1 von 200, 5 und 6 je 47', () => {
    expect(bellWeights.reduce((a, b) => a + b, 0)).toBe(200);
    expect(rollBell(fixedRandom(1))).toBe(1);
    expect(rollBell(fixedRandom(2))).toBe(2);
    expect(rollBell(fixedRandom(53))).toBe(4);
    expect(rollBell(fixedRandom(54))).toBe(5);
    expect(rollBell(fixedRandom(200))).toBe(10);
  });

  it('würfelt den Streuwürfel: zehn gleich wahrscheinliche Werte', () => {
    expect(scatters).toHaveLength(10);
    expect(rollScatter(fixedRandom(0))).toBe('n');
    expect(rollScatter(fixedRandom(8))).toBe('hit');
    expect(rollScatter(fixedRandom(9))).toBe('miss');
  });

  it('würfelt das Kartensymbol neu, bis es mindestens zwei Wege hat', () => {
    // Erster Versuch: N Weg (1), sonst kein Weg (8 auf der Ebene, 3 für oben und unten) – zu wenig.
    const random = fixedRandom(1, 8, 8, 8, 3, 3, 8, 1, 15, 17, 3, 20);
    const map = rollMap(random);
    expect(map).toEqual({ north: 'none', east: 'path', south: 'deadEnd', west: 'hidden', up: 'none', down: 'obstacle' });
    expect(random.calls).toBe(12);
    expect(pathCount(map)).toBe(4);
  });

  it('zieht die Wurffelder mit jeder Karte, nach den Feldern', () => {
    const card = drawCard(fixedRandom());
    expect(card).toMatchObject({ bell: 1, scatter: 'n', pickedRolls: [] });
    expect(pathCount(card.map)).toBe(6);
  });

  it('wählt Wurffelder aus wie Felder; bestätigen geht auch nur mit einem Wurffeld', () => {
    const card = drawCard(fixedRandom());
    expect(canConfirm(card)).toBe(false);
    const picked = toggleRoll(toggleRoll(card, 'map'), 'bell');
    expect(pickedCount(picked)).toBe(2);
    expect(toggleRoll(picked, 'map').pickedRolls).toEqual(['bell']);
    const pick = confirmCard({ ...picked, question: 'Wohin?' }, fixedClock());
    expect(pick).toEqual({ kind: 'card', at: '2026-10-23T14:00:00.000Z', question: 'Wohin?', bell: 1, map: card.map, items: [] });
  });
});

describe('Name von der Karte', () => {
  it('zieht je Namensfeld zwei verschiedene Vornamen und Nachnamen, irdisch vor spacig', () => {
    const names = drawNames(fixedRandom());
    expect(names.first.map((n) => n.label)).toEqual([
      'Weiblich, irdisch',
      'Weiblich, irdisch',
      'Männlich, irdisch',
      'Männlich, irdisch',
      'Neutral, irdisch',
      'Neutral, irdisch',
      'Weiblich, spacig',
      'Weiblich, spacig',
      'Männlich, spacig',
      'Männlich, spacig',
      'Neutral, spacig',
      'Neutral, spacig',
    ]);
    expect(names.first.slice(0, 2).map((n) => n.text)).toEqual(['Ada', 'Aiko']);
    expect(names.first[6]).toEqual({ text: 'Aashira', label: 'Weiblich, spacig', sound: 'spacey' });
    // Derselbe Nachname steht nur einmal zur Wahl.
    expect(names.last.map((n) => n.text)).toEqual(['Abara', 'Achterberg', 'Aarkhashi', 'Akiirun']);
  });
});
