import { DomainError, ref, withQuestion, type CardPick, type Clock, type Entry, type Random, type Slot } from '..';

/** Die offene Inspirationskarte. Flüchtig: wird beim Bestätigen zum `CardPick`, nie gespeichert. */
export interface Card {
  readonly question?: string;
  /** Je Feld mit nicht ausgeblendeten Einträgen ein Eintrag, Themen-Reiter eingeschlossen, in der Reihenfolge der Bereiche und Felder. */
  readonly drawn: readonly string[];
  /** Die ausgewählten Einträge; nur gezogene. */
  readonly picked: readonly string[];
}

/** Die Einträge eines Feldes, die gezogen werden können: alle, die nicht ausgeblendet sind. */
export function drawableEntries(slot: Slot): readonly Entry[] {
  return slot.entries.filter((e) => !e.retired);
}

/**
 * Zieht eine Karte: für jedes Feld aller Bereiche einen seiner nicht ausgeblendeten Einträge zufällig.
 * Ein Feld, dessen Einträge alle ausgeblendet sind, ist selbst ausgeblendet und wird übergangen.
 */
export function drawCard(random: Random, question?: string): Card {
  const drawn = ref.sections.flatMap((section) =>
    section.slots.flatMap((slot) => {
      const entries = drawableEntries(slot);
      return entries.length === 0 ? [] : [entries[random.int(0, entries.length - 1)]!.id];
    }),
  );
  return withQuestion({ drawn, picked: [] }, question);
}

/** Neu ziehen: eine neue Karte, die Auswahl geht verloren, die Frage bleibt. */
export function redrawCard(card: Card, random: Random): Card {
  return drawCard(random, card.question);
}

/** Nimmt einen gezogenen Eintrag in die Auswahl auf oder wieder heraus. */
export function togglePick(card: Card, entry: string): Card {
  if (!card.drawn.includes(entry)) throw new DomainError('Auswählen lässt sich nur, was gezogen wurde.');
  const picked = card.picked.includes(entry) ? card.picked.filter((e) => e !== entry) : [...card.picked, entry];
  return { ...card, picked };
}

export function canConfirm(card: Card): boolean {
  return card.picked.length > 0;
}

/** Bestätigen: ein `CardPick` mit der Frage der Karte und den ausgewählten Einträgen in der Reihenfolge der Karte. */
export function confirmCard(card: Card, clock: Clock): CardPick {
  if (!canConfirm(card)) throw new DomainError('Bestätigen geht erst, wenn mindestens ein Eintrag ausgewählt ist.');
  const items = card.drawn.filter((e) => card.picked.includes(e)).map((picked) => ({ picked }));
  const pick: CardPick = { kind: 'card', at: clock.now(), items };
  return withQuestion(pick, card.question);
}
