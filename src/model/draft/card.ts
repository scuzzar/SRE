import { DomainError, ref, slotOfEntry, withQuestion, type CardPick, type Clock, type Column, type Entry, type Random, type Slot } from '..';

/** Die offene Inspirationskarte. Flüchtig: wird beim Bestätigen zum `CardPick`, nie gespeichert. */
export interface Card {
  readonly question?: string;
  /**
   * Je sichtbarem Feld aus jeder Spalte ein Eintrag, Themen-Reiter eingeschlossen, in der Reihenfolge
   * der Bereiche, Felder und Spalten. Ein Feld mit zwei Spalten steht hier mit seinem Paar.
   */
  readonly drawn: readonly string[];
  /** Die ausgewählten Felder; nur gezogene. Ein Feld nimmt man immer mit allem, was es gezogen hat. */
  readonly picked: readonly string[];
}

/** Die Einträge einer Spalte, die gezogen werden können: alle, die nicht ausgeblendet sind. */
export function drawableEntries(column: Column): readonly Entry[] {
  return column.entries.filter((e) => !e.retired);
}

/** Ein Feld ist ausgeblendet, wenn eine seiner Spalten nur ausgeblendete Einträge hat. */
export function isVisible(slot: Slot): boolean {
  return slot.columns.every((c) => drawableEntries(c).length > 0);
}

/**
 * Zieht eine Karte: für jedes Feld aller Bereiche aus jeder seiner Spalten einen nicht ausgeblendeten
 * Eintrag zufällig. Ausgeblendete Felder werden übergangen.
 */
export function drawCard(random: Random, question?: string): Card {
  const drawn = ref.sections.flatMap((section) =>
    section.slots.filter(isVisible).flatMap((slot) =>
      slot.columns.map((column) => {
        const entries = drawableEntries(column);
        return entries[random.int(0, entries.length - 1)]!.id;
      }),
    ),
  );
  return withQuestion({ drawn, picked: [] }, question);
}

/** Neu ziehen: eine neue Karte, die Auswahl geht verloren, die Frage bleibt. */
export function redrawCard(card: Card, random: Random): Card {
  return drawCard(random, card.question);
}

/** Was ein Feld auf der Karte gezogen hat: einen Eintrag, beim Paar beide in der Reihenfolge der Spalten. */
export function drawnIn(card: Card, slot: string): readonly string[] {
  return card.drawn.filter((e) => slotOfEntry(e).id === slot);
}

/** Nimmt ein gezogenes Feld mit allem, was es gezogen hat, in die Auswahl auf oder wieder heraus. */
export function togglePick(card: Card, slot: string): Card {
  if (drawnIn(card, slot).length === 0) throw new DomainError('Auswählen lässt sich nur, was gezogen wurde.');
  const picked = card.picked.includes(slot) ? card.picked.filter((s) => s !== slot) : [...card.picked, slot];
  return { ...card, picked };
}

export function canConfirm(card: Card): boolean {
  return card.picked.length > 0;
}

/** Bestätigen: ein `CardPick` mit der Frage der Karte und je ausgewähltem Feld seinen Einträgen, in der Reihenfolge der Karte. */
export function confirmCard(card: Card, clock: Clock): CardPick {
  if (!canConfirm(card)) throw new DomainError('Bestätigen geht erst, wenn mindestens ein Feld ausgewählt ist.');
  const slots = [...new Set(card.drawn.map((e) => slotOfEntry(e).id))].filter((s) => card.picked.includes(s));
  const items = slots.map((slot) => ({ picked: drawnIn(card, slot) }));
  const pick: CardPick = { kind: 'card', at: clock.now(), items };
  return withQuestion(pick, card.question);
}
