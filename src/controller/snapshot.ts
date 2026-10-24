import {
  activeCharacters,
  activeSkills,
  characterOf,
  characteristicDm,
  isInLog,
  isSuccess,
  isYes,
  inputOf,
  oddsOf,
  ref,
  retiredCharacters,
  sectionOfSlot,
  skillOf,
  slotOf,
  sum,
  totalOf,
  valueOf,
  entryOf,
  type Campaign,
  type Character,
  type CharacterInput,
  type Characteristic,
  type Dice,
  type LogEntry,
  type SectionKind,
  type Skill,
  type TaskResult,
  type Upp,
} from '../model';
import { canConfirm, characteristicOptions, evaluateTask, hasSkill, startTask, type Card, type CharacteristicOption, type Task } from '../model/draft';

/**
 * Was die View zu sehen bekommt: den Spielstand aus dem Model, schon ausgewertet, und den Zustand des
 * Controllers. Die View rechnet nichts aus, was eine Regel ist.
 */
export interface Snapshot {
  readonly ready: boolean;
  /** Ob der Spielstand das Schließen der App übersteht. */
  readonly persistent: boolean;
  readonly storageError: string | undefined;
  readonly screen: Screen;
  readonly odds: readonly OddsChoice[];
  /** In der Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige. */
  readonly log: readonly LogItem[];
  /** Die offene Inspirationskarte; solange es sie gibt, steht sie im Vordergrund. */
  readonly card: CardView | undefined;
  readonly characters: readonly CharacterView[];
  readonly retired: readonly { readonly id: string; readonly name: string }[];
  readonly task: TaskView | undefined;
  /** Das Ergebnis-Popup nach einer Probe. */
  readonly result: TaskItem | undefined;
  readonly editor: EditorView | undefined;
  /** Die feste Liste der Fertigkeiten, für den Editor. */
  readonly skills: readonly Skill[];
}

export type Screen = 'oracle' | 'characters' | 'about';

export interface OddsChoice {
  readonly id: string;
  readonly name: string;
  readonly chance: number;
  readonly target: number;
  readonly selected: boolean;
}

export type LogItem = OracleItem | DiceItem | CardItem | TaskItem;

export interface OracleItem {
  readonly kind: 'oracle';
  readonly at: string;
  readonly question: string | undefined;
  readonly odds: string;
  readonly roll: number;
  readonly chance: number;
  readonly yes: boolean;
}

export interface DiceItem {
  readonly kind: 'dice';
  readonly at: string;
  readonly dice: Dice;
  readonly total: number;
}

export interface CardItem {
  readonly kind: 'card';
  readonly at: string;
  readonly question: string | undefined;
  readonly items: readonly { readonly section: string; readonly slot: string; readonly text: string }[];
}

export interface TaskItem {
  readonly kind: 'task';
  readonly at: string;
  readonly character: string;
  readonly target: number;
  readonly dice: Dice;
  readonly dm: number;
  /** Würfel + DM */
  readonly total: number;
  readonly success: boolean;
  /** Woraus der DM besteht, nach dem heutigen Stand von Charakter und Hausregeln. */
  readonly parts: readonly DmPart[];
}

export type DmPart =
  | { readonly kind: 'skill'; readonly name: string; readonly level: number; readonly dm: number }
  | { readonly kind: 'unskilled'; readonly dm: number }
  | { readonly kind: 'characteristic'; readonly characteristic: Characteristic; readonly value: number; readonly dm: number };

export interface CardView {
  readonly question: string | undefined;
  readonly sections: readonly CardSectionView[];
  readonly pickedCount: number;
  readonly canConfirm: boolean;
}

export interface CardSectionView {
  readonly id: string;
  readonly name: string;
  readonly kind: SectionKind;
  readonly slots: readonly {
    readonly id: string;
    readonly label: string;
    readonly entry: string;
    readonly text: string;
    readonly picked: boolean;
  }[];
}

export interface CharacterView {
  readonly id: string;
  readonly name: string;
  readonly background: string;
  readonly equipment: string;
  readonly credits: number;
  readonly note: string;
  readonly upp: Upp;
  /** Für diesen Charakter wird gerade eine Probe vorbereitet. */
  readonly chosen: boolean;
  /** Die Details sind aufgeklappt: volle Namen der Fertigkeiten, Ausrüstung, Credits, Notiz. */
  readonly open: boolean;
  readonly skills: readonly { readonly of: string; readonly name: string; readonly short: string; readonly level: number; readonly chosen: boolean }[];
  readonly unskilled: { readonly dm: number; readonly chosen: boolean };
  readonly characteristics: readonly CharacteristicOption[];
  /** Kommt im Log vor: Entfernen blendet aus, statt zu löschen. */
  readonly inLog: boolean;
}

export interface TaskView {
  readonly character: string;
  /** Ist eine Fertigkeit gewählt, gibt es etwas zu würfeln. */
  readonly ready: boolean;
  readonly dm: number;
  readonly target: number;
  readonly need: number;
  readonly chance: number;
  readonly parts: readonly DmPart[];
}

export interface EditorView {
  /** Fehlt bei einem neuen Charakter. */
  readonly id: string | undefined;
  readonly input: CharacterInput;
  readonly error: string | undefined;
  readonly inLog: boolean;
}

export interface ControllerState {
  readonly campaign: Campaign | undefined;
  readonly persistent: boolean;
  readonly storageError: string | undefined;
  readonly screen: Screen;
  readonly card: Card | undefined;
  readonly task: Task | undefined;
  /** Die Details des Charakters der Probe (volle Namen, Ausrüstung, Notiz) sind aufgeklappt. */
  readonly details: boolean;
  /** Index des Logeintrags, dessen Ergebnis-Popup offen ist. */
  readonly result: number | undefined;
  readonly editor: { readonly id: string | undefined; readonly error: string | undefined } | undefined;
}

const emptyInput: CharacterInput = {
  name: '',
  background: '',
  equipment: '',
  credits: 0,
  note: '',
  upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 },
  skills: [],
};

function dmParts(character: Character, uses: string | undefined, unskilled: boolean, counts: readonly Characteristic[]): DmPart[] {
  const parts: DmPart[] = [];
  if (uses !== undefined) {
    const level = character.skills.find((s) => s.of === uses)?.level ?? 0;
    parts.push({ kind: 'skill', name: skillOf(uses).name, level, dm: level });
  } else if (unskilled) {
    parts.push({ kind: 'unskilled', dm: ref.houseRules.unskilledDm });
  }
  for (const characteristic of counts) {
    const value = valueOf(character.upp, characteristic);
    parts.push({ kind: 'characteristic', characteristic, value, dm: characteristicDm(value, ref.houseRules) });
  }
  return parts;
}

function taskItem(campaign: Campaign, entry: TaskResult): TaskItem {
  const character = characterOf(campaign, entry.for);
  return {
    kind: 'task',
    at: entry.at,
    character: character.name,
    target: entry.target,
    dice: entry.dice,
    dm: entry.dm,
    total: sum(entry.dice) + entry.dm,
    success: isSuccess(entry),
    parts: dmParts(character, entry.uses, entry.uses === undefined, entry.counts),
  };
}

function logItem(campaign: Campaign, entry: LogEntry): LogItem {
  switch (entry.kind) {
    case 'oracle':
      return { kind: 'oracle', at: entry.at, question: entry.question, odds: oddsOf(entry.odds).name, roll: entry.roll, chance: entry.chance, yes: isYes(entry) };
    case 'dice':
      return { kind: 'dice', at: entry.at, dice: entry.dice, total: totalOf(entry) };
    case 'card':
      return {
        kind: 'card',
        at: entry.at,
        question: entry.question,
        items: entry.items.map((item) => {
          const slot = slotOf(item);
          return { section: sectionOfSlot(slot.id).name, slot: slot.label, text: entryOf(item.picked).text };
        }),
      };
    case 'task':
      return taskItem(campaign, entry);
  }
}

function cardView(card: Card): CardView {
  const drawn = new Set(card.drawn);
  return {
    question: card.question,
    // Ausgeblendete Felder hat die Karte nicht gezogen; sie fehlen, ebenso Bereiche ohne gezogenes Feld.
    sections: ref.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        kind: section.kind,
        slots: section.slots.flatMap((slot) => {
          const entry = slot.entries.find((e) => drawn.has(e.id));
          return entry ? [{ id: slot.id, label: slot.label, entry: entry.id, text: entry.text, picked: card.picked.includes(entry.id) }] : [];
        }),
      }))
      .filter((section) => section.slots.length > 0),
    pickedCount: card.picked.length,
    canConfirm: canConfirm(card),
  };
}

function characterView(campaign: Campaign, character: Character, task: Task | undefined, details: boolean): CharacterView {
  const own = task?.for === character.id ? task : undefined;
  return {
    id: character.id,
    name: character.name,
    background: character.background,
    equipment: character.equipment,
    credits: character.credits,
    note: character.note,
    upp: character.upp,
    chosen: own !== undefined,
    open: own !== undefined && details,
    skills: activeSkills(character).map((s) => {
      const skill = skillOf(s.of);
      return { of: s.of, name: skill.name, short: skill.short, level: s.level, chosen: own?.uses === s.of };
    }),
    unskilled: { dm: ref.houseRules.unskilledDm, chosen: own?.unskilled ?? false },
    characteristics: characteristicOptions(own ?? startTask(campaign, character.id), campaign),
    inLog: isInLog(campaign, character.id),
  };
}

function taskView(campaign: Campaign, task: Task): TaskView {
  const character = characterOf(campaign, task.for);
  return { character: character.name, ready: hasSkill(task), ...evaluateTask(task, campaign), parts: dmParts(character, task.uses, task.unskilled, task.counts) };
}

export function buildSnapshot(state: ControllerState): Snapshot {
  const { campaign } = state;
  const base = { persistent: state.persistent, storageError: state.storageError, screen: state.screen, skills: ref.skills };
  if (!campaign) {
    return { ...base, ready: false, odds: [], log: [], card: undefined, characters: [], retired: [], task: undefined, result: undefined, editor: undefined };
  }
  const resultEntry = state.result === undefined ? undefined : campaign.log[state.result];
  const editing = state.editor?.id === undefined ? undefined : characterOf(campaign, state.editor.id);
  return {
    ...base,
    ready: true,
    odds: ref.odds.map((o) => ({ id: o.id, name: o.name, chance: o.chance, target: o.target, selected: o.id === campaign.odds })),
    log: campaign.log.map((entry) => logItem(campaign, entry)),
    card: state.card && cardView(state.card),
    characters: activeCharacters(campaign).map((c) => characterView(campaign, c, state.task, state.details)),
    retired: retiredCharacters(campaign).map((c) => ({ id: c.id, name: c.name })),
    task: state.task && taskView(campaign, state.task),
    result: resultEntry?.kind === 'task' ? taskItem(campaign, resultEntry) : undefined,
    editor: state.editor && {
      id: state.editor.id,
      input: editing ? inputOf(editing) : emptyInput,
      error: state.editor.error,
      inLog: editing ? isInLog(campaign, editing.id) : false,
    },
  };
}
