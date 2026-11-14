import {
  DomainError,
  isRandomEvent,
  oddsOf,
  nameSlotIds,
  nameSounds,
  ref,
  rollBell,
  rollMap,
  rollScatter,
  slotOfEntry,
  slotWithId,
  withQuestion,
  type CardPick,
  type CardRoll,
  type Clock,
  type Column,
  type Entry,
  type MapIcon,
  type NameSound,
  type Random,
  type Scatter,
  type Slot,
} from '..';

/** Die offene Inspirationskarte. Flüchtig: wird beim Bestätigen zum `CardPick`, nie gespeichert. */
export interface Card {
  readonly question?: string;
  /**
   * Je sichtbarem Feld aus jeder Spalte ein Eintrag, Themen-Tafeln eingeschlossen, in der Reihenfolge
   * der Bereiche, Felder und Spalten. Ein Feld mit zwei Spalten steht hier mit seinem Paar.
   */
  readonly drawn: readonly string[];
  /** Die ausgewählten Felder; nur gezogene. Ein Feld nimmt man immer mit allem, was es gezogen hat. */
  readonly picked: readonly string[];
  /** Die Wurffelder: Glockenzahl 1–10, Streuwürfel und Kartensymbol. */
  readonly bell: number;
  readonly scatter: Scatter;
  readonly map: MapIcon;
  /** Die ausgewählten Wurffelder. */
  readonly pickedRolls: readonly CardRoll[];
  /** Der Wurf 1–100 fürs Orakelfeld; daraus folgt die Antwort für jede Stufe. */
  readonly oracle: number;
  /** Die Stufe, die man im Orakelfeld angetippt hat; höchstens eine. */
  readonly pickedOdds?: string;
  /** Der Wurf 1–100 auf den Ereignisfokus; nur, wenn der Orakelwurf ein Zufallsereignis ist. */
  readonly eventFocus?: number;
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
  // Die Wurffelder nach den Feldern und der Orakelwurf zuletzt, damit die Einträge immer mit denselben
  // Würfen gezogen werden.
  const bell = rollBell(random);
  const scatter = rollScatter(random);
  const map = rollMap(random);
  const oracle = random.int(1, 100);
  // Bei einem Zufallsereignis gleich danach der Ereignisfokus; sonst würfelt die Karte nichts weiter.
  const event = isRandomEvent(oracle) ? { eventFocus: random.int(1, 100) } : {};
  return withQuestion({ drawn, picked: [], bell, scatter, map, pickedRolls: [], oracle, ...event }, question);
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

/** Nimmt ein Wurffeld in die Auswahl auf oder wieder heraus. */
export function toggleRoll(card: Card, roll: CardRoll): Card {
  const pickedRolls = card.pickedRolls.includes(roll) ? card.pickedRolls.filter((r) => r !== roll) : [...card.pickedRolls, roll];
  return { ...card, pickedRolls };
}

/** Wählt im Orakelfeld eine Stufe oder nimmt sie wieder heraus; eine andere ersetzt die gewählte. */
export function toggleOdds(card: Card, oddsId: string): Card {
  const odds = oddsOf(oddsId);
  const { pickedOdds, ...rest } = card;
  return pickedOdds === odds.id ? rest : { ...rest, pickedOdds: odds.id };
}

/** Die Frage auf der offenen Karte; eine leere gibt es nicht. */
export function askCard(card: Card, question: string | undefined): Card {
  const { question: old, ...rest } = card;
  return old === question ? card : withQuestion(rest, question);
}

/** Wie viel ausgewählt ist: Felder, Wurffelder und die Stufe im Orakelfeld. */
export function pickedCount(card: Card): number {
  return card.picked.length + card.pickedRolls.length + (card.pickedOdds === undefined ? 0 : 1);
}

export function canConfirm(card: Card): boolean {
  return pickedCount(card) > 0;
}

/** Bestätigen: ein `CardPick` mit der Frage der Karte und je ausgewähltem Feld seinen Einträgen, in der Reihenfolge der Karte. */
export function confirmCard(card: Card, clock: Clock): CardPick {
  if (!canConfirm(card)) throw new DomainError('Bestätigen geht erst, wenn mindestens ein Feld oder eine Stufe ausgewählt ist.');
  const slots = [...new Set(card.drawn.map((e) => slotOfEntry(e).id))].filter((s) => card.picked.includes(s));
  const items = slots.map((slot) => ({ picked: drawnIn(card, slot) }));
  const rolled = card.pickedRolls;
  const pick: CardPick = {
    kind: 'card',
    at: clock.now(),
    ...(rolled.includes('bell') ? { bell: card.bell } : {}),
    ...(rolled.includes('scatter') ? { scatter: card.scatter } : {}),
    ...(rolled.includes('map') ? { map: card.map } : {}),
    ...(card.pickedOdds === undefined ? {} : { oracle: card.oracle, odds: card.pickedOdds, chance: oddsOf(card.pickedOdds).chance }),
    // Das Zufallsereignis gilt nur für eine Frage: ohne gewählte Stufe kommt es nicht in den Log.
    ...(card.pickedOdds !== undefined && card.eventFocus !== undefined ? { eventFocus: card.eventFocus } : {}),
    items,
  };
  return withQuestion(pick, card.question);
}

/** Ein Name zur Wahl: der Text und das Namensfeld, aus dem er kommt. */
export interface NameChoice {
  readonly text: string;
  /** Die Beschriftung des Namensfeldes, z. B. „Weiblich, spacig“. */
  readonly label: string;
  readonly sound: NameSound;
}

/** Die Namenswahl beim Benennen von Charakteren und Welten: Vornamen und Nachnamen getrennt. */
export interface NameChoices {
  readonly first: readonly NameChoice[];
  readonly last: readonly NameChoice[];
}

/** Die Klangart eines Namensfeldes steht am Ende seiner Id (`npc.names.female.spacey`). */
function soundOf(slotId: string): NameSound {
  return nameSounds.find((sound) => slotId.endsWith(`.${sound}`)) ?? 'earthly';
}

/** So oft zieht die Namenswahl jedes Namensfeld. */
export const nameDraws = 2;

/**
 * Name von der Karte: zieht jedes der sechs Namensfelder der Tafel NSC zweimal, nach denselben Regeln
 * wie *Karte ziehen*, aber je Feld zwei verschiedene Vornamen und zwei verschiedene Nachnamen.
 * Reihenfolge wie auf der Tafel: erst die irdischen, dann die spacigen Felder, jedes Feld zweimal
 * hintereinander. Nichts davon kommt in den Log.
 */
export function drawNames(random: Random): NameChoices {
  const slots = nameSlotIds.map(slotWithId).filter(isVisible);
  const distinct = (column: Column): string[] => {
    const entries = [...drawableEntries(column)];
    return Array.from({ length: Math.min(nameDraws, entries.length) }, () => entries.splice(random.int(0, entries.length - 1), 1)[0]!.text);
  };
  // Derselbe Nachname kann in mehreren Feldern gezogen werden; zur Wahl steht er nur einmal.
  const choices = (column: 0 | 1) =>
    slots
      .flatMap((slot) => distinct(slot.columns[column]!).map((text) => ({ text, label: slot.label, sound: soundOf(slot.id) })))
      .filter((choice, i, all) => all.findIndex((c) => c.text === choice.text) === i);
  return { first: choices(0), last: choices(1) };
}
