import {
  activeSkills,
  byName,
  canGoUnskilled,
  characterOf,
  characteristicDm,
  deadCharacters,
  isInLog,
  livingCharacters,
  isSuccess,
  isYes,
  inputOf,
  oddsOf,
  ref,
  retiredCharacters,
  sectionOfSlot,
  shownLevel,
  skillDm,
  skillOf,
  slotOf,
  stateOf,
  sum,
  totalOf,
  valueOf,
  entryOf,
  itemOf,
  type Campaign,
  type ItemKind,
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
import { canConfirm, characteristicOptions, drawnIn, evaluateTask, hasSkill, startTask, type Card, type CharacteristicOption, type Task, type WorldRoll } from '../model/draft';
import { careerLines, generationView, itemLabel, worldChoices, worldName, type CareerLine, type GenerationView, type WorldChoice } from './generation-view';
import { sectorView, selectedView, worldList, worldView, type HexView, type SelectedHexView, type WorldListItem, type WorldView } from './world-view';

/**
 * Was die View zu sehen bekommt: den Spielstand aus dem Model, schon ausgewertet, und den Zustand des
 * Controllers. Die View rechnet nichts aus, was eine Regel ist.
 */
export interface Snapshot {
  readonly ready: boolean;
  /** Die offene Kampagne. */
  readonly campaign: { readonly id: string; readonly name: string };
  /** Alle Kampagnen nach Namen, für die Kampagnenwahl. */
  readonly campaigns: readonly CampaignChoice[];
  /** Die Kampagnenwahl ist offen. */
  readonly campaignSheet: CampaignSheetView | undefined;
  /** Ob der Spielstand das Schließen der App übersteht. */
  readonly persistent: boolean;
  /** Ob der Browser zusagt, den Spielstand nicht zu löschen; `undefined`, solange er nicht geantwortet hat oder das nicht kennt. */
  readonly durable: boolean | undefined;
  readonly storageError: string | undefined;
  readonly screen: Screen;
  readonly odds: readonly OddsChoice[];
  /** In der Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige. */
  readonly log: readonly LogItem[];
  /** Die offene Inspirationskarte; solange es sie gibt, steht sie im Vordergrund. */
  readonly card: CardView | undefined;
  readonly characters: readonly CharacterView[];
  /** Die Toten unter „Verstorben“, getrennt von den Lebenden. */
  readonly dead: readonly { readonly id: string; readonly name: string; readonly background: string }[];
  readonly retired: readonly { readonly id: string; readonly name: string }[];
  readonly task: TaskView | undefined;
  /** Das Ergebnis-Popup nach einer Probe. */
  readonly result: TaskItem | undefined;
  readonly editor: EditorView | undefined;
  /** Die feste Liste der Fertigkeiten, für den Editor. */
  readonly skills: readonly SkillChoice[];
  /** Die feste Liste der Gegenstände, für den Editor. */
  readonly items: readonly ItemChoice[];
  /** Die Charaktererschaffung im Vordergrund, solange sie offen ist. */
  readonly generation: GenerationView | undefined;
  /** In der Kampagne läuft eine Charaktererschaffung (vielleicht gerade nicht im Vordergrund). */
  readonly generationRunning: boolean;
  /** Alle Felder des Subsektors, spaltenweise. */
  readonly sector: readonly HexView[];
  /** Die fertigen Welten, nach Feld. */
  readonly worlds: readonly WorldListItem[];
  /** Die Weltkarte im Vordergrund: eine Welt, die entsteht oder fertig ist. */
  readonly world: WorldView | undefined;
  /** Das gewählte Feld auf der Karte, mit seinem Vorkommen, sobald gewürfelt. */
  readonly selected: SelectedHexView | undefined;
  /** Die Karte steht im Vordergrund, um für die Charaktererschaffung eine Welt zu wählen oder zu erschaffen. */
  readonly picking: { readonly title: string } | undefined;
}

export interface SkillChoice extends Skill {
  /** Ob man eine Stufe eingibt; bei Jack-of-all-Trades nicht. */
  readonly leveled: boolean;
}

export interface ItemChoice {
  readonly id: string;
  /** Mit TL, wenn es den Gegenstand in mehreren TL gibt. */
  readonly label: string;
  readonly kind: ItemKind;
  readonly once: boolean;
}

export type Screen = 'oracle' | 'characters' | 'sector' | 'about';

export interface CampaignChoice {
  readonly id: string;
  readonly name: string;
  readonly open: boolean;
  readonly characters: number;
  readonly entries: number;
}

export interface CampaignSheetView {
  readonly error: string | undefined;
  /** Die letzte Kampagne lässt sich nicht löschen. */
  readonly canDelete: boolean;
}

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
  /** Je übernommenem Feld seine Texte: einer, beim Paar zwei. */
  readonly items: readonly { readonly sectionId: string; readonly section: string; readonly slot: string; readonly texts: readonly string[] }[];
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
  /** Ohne `level` bei Jack-of-all-Trades. */
  | { readonly kind: 'skill'; readonly name: string; readonly level: number | undefined; readonly dm: number }
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
    /** Was das Feld gezogen hat: einen Text, beim Paar zwei. */
    readonly texts: readonly string[];
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
  /** Ohne `level` bei Jack-of-all-Trades. */
  readonly skills: readonly { readonly of: string; readonly name: string; readonly short: string; readonly level: number | undefined; readonly chosen: boolean }[];
  readonly possessions: readonly { readonly name: string; readonly count: number }[];
  /** Der Lebenslauf, wenn der Charakter über die Charaktererschaffung entstanden ist. */
  readonly career: readonly CareerLine[] | undefined;
  /** Der Name der Heimatwelt. */
  readonly homeworld: string | undefined;
  /** Je Term der Name seiner Welt, aus dem Lebenslauf. */
  readonly termWorlds: readonly string[];
  /** „Ohne Fertigkeit“; fehlt, wenn der Charakter Jack-of-all-Trades hat. */
  readonly unskilled: { readonly dm: number; readonly chosen: boolean } | undefined;
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
  /** Die fertigen Welten des Subsektors, für die Heimatwelt. */
  readonly worlds: readonly WorldChoice[];
}

export interface ControllerState {
  /** Alle Kampagnen, die offene eingeschlossen. */
  readonly campaigns: readonly Campaign[];
  /** Die offene Kampagne. */
  readonly campaign: Campaign | undefined;
  readonly campaignSheet: { readonly error: string | undefined } | undefined;
  readonly persistent: boolean;
  readonly durable: boolean | undefined;
  readonly storageError: string | undefined;
  readonly screen: Screen;
  readonly card: Card | undefined;
  readonly task: Task | undefined;
  /** Die Details des Charakters der Probe (volle Namen, Ausrüstung, Notiz) sind aufgeklappt. */
  readonly details: boolean;
  /** Index des Logeintrags, dessen Ergebnis-Popup offen ist. */
  readonly result: number | undefined;
  readonly editor: { readonly id: string | undefined; readonly error: string | undefined } | undefined;
  /** Die Charaktererschaffung steht im Vordergrund. */
  readonly generating: boolean;
  readonly generationError: string | undefined;
  /** Das Feld, dessen Weltkarte offen ist, mit den Würfen, seit sie offen ist. */
  readonly world: OpenWorld | undefined;
  readonly worldError: string | undefined;
  /** Das gewählte Feld auf der Karte, nicht erzeugt oder leer; mit dem Vorkommen, wenn es gerade hier gewürfelt wurde. */
  readonly selected: { readonly column: number; readonly row: number; readonly occurrence?: WorldRoll } | undefined;
  /** Die Karte steht über der Charaktererschaffung, um eine Welt zu wählen. */
  readonly picking: boolean;
}

/** Eine offene Weltkarte. Ihre Würfe sind flüchtig: Sie gelten nur, solange sie offen ist. */
export interface OpenWorld {
  readonly column: number;
  readonly row: number;
  readonly rolls: readonly WorldRoll[];
}

const emptyInput: CharacterInput = {
  name: '',
  dead: false,
  background: '',
  equipment: '',
  credits: 0,
  note: '',
  upp: { str: 7, dex: 7, end: 7, int: 7, edu: 7, soc: 7 },
  skills: [],
  possessions: [],
};

function dmParts(character: Character, uses: string | undefined, unskilled: boolean, counts: readonly Characteristic[]): DmPart[] {
  const parts: DmPart[] = [];
  if (uses !== undefined) {
    const skill = character.skills.find((s) => s.of === uses);
    parts.push({ kind: 'skill', name: skillOf(uses).name, level: shownLevel({ of: uses, level: skill?.level ?? 0 }), dm: skill ? skillDm(skill) : 0 });
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
          const section = sectionOfSlot(slot.id);
          return { sectionId: section.id, section: section.name, slot: slot.label, texts: item.picked.map((e) => entryOf(e).text) };
        }),
      };
    case 'task':
      return taskItem(campaign, entry);
  }
}

function cardView(card: Card): CardView {
  return {
    question: card.question,
    // Ausgeblendete Felder hat die Karte nicht gezogen; sie fehlen, ebenso Bereiche ohne gezogenes Feld.
    sections: ref.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        kind: section.kind,
        slots: section.slots.flatMap((slot) => {
          const drawn = drawnIn(card, slot.id);
          return drawn.length > 0 ? [{ id: slot.id, label: slot.label, texts: drawn.map((e) => entryOf(e).text), picked: card.picked.includes(slot.id) }] : [];
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
      return { of: s.of, name: skill.name, short: skill.short, level: shownLevel(s), chosen: own?.uses === s.of };
    }),
    possessions: character.possessions.map((p) => ({ name: itemLabel(itemOf(p.of)), count: p.count })),
    career: character.career && careerLines(character.career),
    homeworld: character.homeworld === undefined ? undefined : worldName(campaign.hexes, character.homeworld),
    termWorlds: (character.career?.worlds ?? []).map((id) => worldName(campaign.hexes, id)),
    unskilled: canGoUnskilled(character.skills) ? { dm: ref.houseRules.unskilledDm, chosen: own?.unskilled ?? false } : undefined,
    characteristics: characteristicOptions(own ?? startTask(campaign, character.id), campaign),
    inLog: isInLog(campaign, character.id),
  };
}

function taskView(campaign: Campaign, task: Task): TaskView {
  const character = characterOf(campaign, task.for);
  return { character: character.name, ready: hasSkill(task), ...evaluateTask(task, campaign), parts: dmParts(character, task.uses, task.unskilled, task.counts) };
}

const skills: readonly SkillChoice[] = ref.skills.map((s) => ({ ...s, leveled: shownLevel({ of: s.id, level: 0 }) !== undefined }));
const items: readonly ItemChoice[] = ref.items.map((i) => ({ id: i.id, label: itemLabel(i), kind: i.kind, once: i.once }));

/** Die Karte zur Wahl einer Welt, solange die Erschaffung im Schritt Heimatwelt oder Welt eines Terms ist. */
function pickingView(state: ControllerState, campaign: Campaign): { readonly title: string } | undefined {
  if (!state.picking || !campaign.generation) return undefined;
  const generation = stateOf(campaign.generation);
  if (generation.step === 'homeworld') return { title: 'Heimatwelt wählen' };
  if (generation.step === 'world') return { title: `Welt für Term ${generation.terms} wählen` };
  return undefined;
}

export function buildSnapshot(state: ControllerState): Snapshot {
  const { campaign } = state;
  const base = { persistent: state.persistent, durable: state.durable, storageError: state.storageError, screen: state.screen, skills, items };
  if (!campaign) {
    return { ...base, ready: false, campaign: { id: '', name: '' }, campaigns: [], campaignSheet: undefined, odds: [], log: [], card: undefined, characters: [], dead: [], retired: [], task: undefined, result: undefined, editor: undefined, generation: undefined, generationRunning: false, sector: [], worlds: [], world: undefined, selected: undefined, picking: undefined };
  }
  const resultEntry = state.result === undefined ? undefined : campaign.log[state.result];
  const editing = state.editor?.id === undefined ? undefined : characterOf(campaign, state.editor.id);
  return {
    ...base,
    ready: true,
    campaign: { id: campaign.id, name: campaign.name },
    campaigns: byName(state.campaigns).map((c) => ({ id: c.id, name: c.name, open: c.id === campaign.id, characters: livingCharacters(c).length, entries: c.log.length })),
    campaignSheet: state.campaignSheet && { error: state.campaignSheet.error, canDelete: state.campaigns.length > 1 },
    odds: ref.odds.map((o) => ({ id: o.id, name: o.name, chance: o.chance, target: o.target, selected: o.id === campaign.odds })),
    log: campaign.log.map((entry) => logItem(campaign, entry)),
    card: state.card && cardView(state.card),
    characters: livingCharacters(campaign).map((c) => characterView(campaign, c, state.task, state.details)),
    dead: deadCharacters(campaign).map((c) => ({ id: c.id, name: c.name, background: c.background })),
    retired: retiredCharacters(campaign).map((c) => ({ id: c.id, name: c.name })),
    task: state.task && taskView(campaign, state.task),
    result: resultEntry?.kind === 'task' ? taskItem(campaign, resultEntry) : undefined,
    editor: state.editor && {
      id: state.editor.id,
      input: editing ? inputOf(editing) : emptyInput,
      error: state.editor.error,
      inLog: editing ? isInLog(campaign, editing.id) : false,
      worlds: worldChoices(campaign.hexes),
    },
    generation: state.generating && campaign.generation ? generationView(campaign.generation, campaign.hexes, state.generationError) : undefined,
    generationRunning: campaign.generation !== undefined,
    sector: sectorView(campaign.hexes),
    worlds: worldList(campaign.hexes),
    world: state.world && worldView(campaign.hexes, state.world.column, state.world.row, state.world.rolls, state.worldError),
    picking: pickingView(state, campaign),
    selected: state.selected && selectedView(campaign.hexes, state.selected.column, state.selected.row, state.selected.occurrence, state.world ? undefined : state.worldError),
  };
}
