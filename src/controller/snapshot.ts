import {
  activeSkills,
  ammoOf,
  fundsOf,
  hexId,
  itemKinds,
  locationOf,
  offerOf,
  salePrice,
  ehex,
  uwpCode,
  armorClasses,
  armorDm,
  attackCharacteristic,
  byName,
  characteristicAttackDm,
  damageOf,
  damageRollsOf,
  pendingDamage,
  rangeDm,
  ranges,
  weaponOf,
  weaponSkill,
  weaponsOf,
  wieldedWeapon,
  canGoUnskilled,
  characterOf,
  characteristicDm,
  deadCharacters,
  focusOf,
  HANDS,
  isInLog,
  livingCharacters,
  isSuccess,
  isYes,
  inputOf,
  oddsOf,
  bellWeights,
  nameSlotIds,
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
  type ArmorClass,
  type AttackKind,
  type AttackResult,
  type BookingKind,
  type Campaign,
  type DamageRoll,
  type ItemKind,
  type Range,
  type Character,
  type CharacterInput,
  type Characteristic,
  type Dice,
  type LogEntry,
  type MapIcon,
  type Scatter,
  type SectionKind,
  type Skill,
  type TaskResult,
  type Upp,
  type Combatant,
  type Fighter,
  type PhysicalCharacteristic,
  type WoundState,
  armorsOf,
  canFight,
  currentEncounter,
  encounterTypeOfEncounter,
  fighterOf,
  npcCharacters,
  npcOf,
  reactionText,
  uppOf,
  victimOf,
  woundedUpp,
  woundsOf,
  woundStateOf,
  daysOf,
  DomainError,
  defeatedSide,
  fightOrder,
  fightState,
  firstSide,
  surpriseOf,
  turnOf,
  type Encounter,
  type FightSlot,
  type Side,
  type Weapon,
  recoveryOptions,
  type RecoveryKind,
  type RecoveryOptions,
} from '../model';
import {
  attackerOf,
  attackTable,
  turnAttack,
  defenderOf,
  type Wounding,
  canConfirm,
  characteristicOptions,
  drawnIn,
  evaluateAttack,
  evaluateTask,
  hasSkill,
  pickedCount,
  type Attack,
  type Card,
  type CharacteristicOption,
  type NameChoices,
  type Task,
  type WorldRoll,
} from '../model/draft';
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
  /** Die offene Namenswahl (Name von der Karte); solange es sie gibt, steht sie im Vordergrund. */
  readonly names: NameChoices | undefined;
  /** Die Lebenden, die nicht ausgeblendet sind, in der Reihenfolge der Kampagne. */
  readonly characters: readonly CharacterView[];
  /** Der Charakter oben im Orakel-Screen; fehlt, wenn es keinen Lebenden gibt. */
  readonly focus: string | undefined;
  /** Die Leiste mit dem Charakter oben ist eingeklappt. */
  readonly stripCollapsed: boolean;
  /** Die dauerhaften NSC unter „NSC“, getrennt von den SC. */
  readonly npcs: readonly { readonly id: string; readonly name: string; readonly background: string; readonly dead: boolean }[];
  /** Die Toten unter „Verstorben“, getrennt von den Lebenden. */
  readonly dead: readonly { readonly id: string; readonly name: string; readonly background: string }[];
  readonly retired: readonly { readonly id: string; readonly name: string }[];
  readonly task: TaskView | undefined;
  /** Der Reiter Kampf für den Charakter oben; fehlt, wenn es keinen Lebenden gibt. */
  readonly combat: CombatView | undefined;
  /** Der Reiter Shop: Kasse und Angebot auf dem Aufenthaltsort. */
  readonly shop: ShopView | undefined;
  /** Der Aufenthaltsort der Gruppe, als Feld (0304). */
  readonly location: string | undefined;
  /** Das Ergebnis-Popup nach einer Probe oder einem Angriff, bzw. der Schadenswurf im Vordergrund. */
  readonly result: TaskItem | AttackItem | DamageItem | undefined;
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
  /** Bei Waffen: die Waffe, die man damit in die Hand nehmen kann. */
  readonly weapon: string | undefined;
  /** Bei Rüstungen und Anzügen: lässt sich anziehen. */
  readonly armor: boolean;
}

export type Screen = 'oracle' | 'combat' | 'shop' | 'characters' | 'sector' | 'about';

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

export type LogItem = OracleItem | DiceItem | CardItem | TaskItem | AttackItem | DamageItem | RecoveryItem | NoteItem;

/** Eine Notiz, oder mit `interprets` eine Deutung zum Ergebnis an dieser Stelle des Logs. */
export interface NoteItem {
  readonly kind: 'note';
  readonly at: string;
  readonly text: string;
  readonly interprets: number | undefined;
}

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
  /** Die übernommenen Wurffelder; nicht übernommene fehlen. */
  readonly bell: number | undefined;
  readonly scatter: Scatter | undefined;
  readonly map: MapIcon | undefined;
  /** Je übernommenem Feld seine Texte: einer, beim Paar zwei; ein Name aus Vor- und Nachname. */
  readonly items: readonly { readonly section: string; readonly slot: string; readonly texts: readonly string[]; readonly name: boolean }[];
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
  | { readonly kind: 'characteristic'; readonly characteristic: Characteristic; readonly value: number; readonly dm: number }
  | { readonly kind: 'armor'; readonly armor: ArmorClass; readonly dm: number }
  | { readonly kind: 'range'; readonly range: Range; readonly dm: number };

/** Ein gewürfelter Angriff; bei einem Treffer mit seinem Schaden, sobald gewürfelt. */
export interface AttackItem {
  readonly kind: 'attack';
  readonly at: string;
  /** Wer angreift: SC oder NSC. */
  readonly character: string;
  /** Wer getroffen werden soll, wenn es ein Ziel gibt. */
  readonly victim: string | undefined;
  readonly weapon: string;
  readonly armor: ArmorClass;
  readonly range: Range;
  readonly target: number;
  readonly dice: Dice;
  readonly dm: number;
  /** Würfel + DM */
  readonly total: number;
  /** Was auf 2W6 nötig war: Zielwert minus DM, wie in der Tabelle. */
  readonly need: number;
  readonly success: boolean;
  /** Woraus der DM besteht: Fertigkeit, Rüstung, Reichweite, Attribut, nach dem heutigen Stand des Charakters. */
  readonly parts: readonly DmPart[];
  /** Wie viele W6 Schaden die Waffe macht. */
  readonly wounds: number;
  /** Für einen Treffer, für den noch kein Schaden gewürfelt ist. */
  readonly damagePending: boolean;
}

/** Ein Schadenswurf; er steht im Kasten seines Treffers (`of`). */
export interface DamageItem {
  readonly kind: 'damage';
  readonly at: string;
  readonly of: number;
  readonly weapon: string;
  /** Wen der Schaden trifft, wenn der Treffer ein Ziel hatte. */
  readonly victim: string | undefined;
  readonly dice: readonly number[];
  /** Je Würfel das Attribut, auf das er ging. */
  readonly to: readonly PhysicalCharacteristic[] | undefined;
  readonly damage: number;
}

/** Eine Heilung: wer, wie, durch wen, wie lange, und wie die Werte danach sind. */
export interface RecoveryItem {
  readonly kind: 'recovery';
  readonly at: string;
  readonly how: RecoveryKind;
  readonly patient: string;
  readonly healer: string | undefined;
  /** Bei einer schweren Wunde: 5W6 Tage. */
  readonly days: number | undefined;
}

/** Was an Heilung geht, für die Anzeige. */
export type HealingView = RecoveryOptions;

/** Ein Kämpfer der Simulation: SC oder NSC. */
export interface FighterView {
  readonly id: string;
  readonly side: Side;
  readonly name: string;
  readonly leader: boolean;
  readonly weapon: string;
  readonly skill: string;
  readonly armor: string | undefined;
  readonly armorClass: ArmorClass;
  readonly upp: Upp;
  readonly current: Upp;
  readonly state: WoundState;
  /** In dieser Runde schon dran gewesen. */
  readonly acted: boolean;
  readonly turn: boolean;
  /** Kann Ziel dessen sein, der am Zug ist. */
  readonly targetable: boolean;
  readonly targeted: boolean;
  readonly healing: HealingView;
}

/** Die Kampfsimulation einer laufenden Begegnung. */
export interface SimView {
  readonly name: string;
  readonly reaction: number;
  readonly reactionText: string;
  readonly round: number;
  readonly range: Range;
  readonly rangeDice: readonly number[] | undefined;
  readonly terrain: { readonly name: string; readonly dm: number } | undefined;
  readonly surprise: Side | undefined;
  readonly first: Side;
  readonly pcSurprise: { readonly die: number; readonly dm: number } | undefined;
  readonly npcSurprise: { readonly die: number; readonly dm: number } | undefined;
  /** Alle Kämpfer in Zugreihenfolge. */
  readonly fighters: readonly FighterView[];
  /** Wer am Zug ist, mit Waffe und, wenn ein Ziel gewählt ist, nötigem Wurf. */
  readonly turn:
    | {
        readonly id: string;
        readonly side: Side;
        readonly name: string;
        readonly weapon: string;
        readonly target: string | undefined;
        readonly odds: { readonly dm: number; readonly need: number; readonly chance: number; readonly parts: readonly DmPart[] } | undefined;
        /** Reicht die Waffe auf die Entfernung? */
        readonly reaches: boolean;
        /** Bei einer Schusswaffe eines SC. */
        readonly ammo: { readonly rounds: number; readonly capacity: number; readonly magazines: number } | undefined;
      }
    | undefined;
  /** Ist eine Partei außer Gefecht, ist der Kampf entschieden. */
  readonly defeated: Side | undefined;
  /** Je Entfernung, ob die Waffe dessen am Zug hinreicht. */
  readonly ranges: readonly { readonly range: Range; readonly reaches: boolean }[];
}

/** Schaden an einem SC, den der Spieler auf STR, DEX und END verteilt. */
export interface WoundingView {
  readonly victim: string;
  readonly weapon: string;
  readonly dice: readonly number[];
  readonly to: readonly PhysicalCharacteristic[];
  /** Die Werte vor diesem Schaden, mit den früheren Wunden. */
  readonly current: Upp;
  readonly full: Upp;
}

/** Eine Waffe, die der Charakter oben führen kann, mit der Fertigkeit, die sie nutzt. */
export interface WeaponChoice {
  readonly id: string;
  readonly name: string;
  /** Die Fertigkeit mit Stufe; ohne zählt Stufe 0: „Brawling-0“. */
  readonly skill: string;
  /** Dasselbe mit Kürzel: „Brw-0“. */
  readonly short: string;
  readonly wielded: boolean;
}

export interface CombatCell {
  readonly range: Range;
  /** Fehlt, wo die Waffe nicht hinreicht. */
  readonly odds: { readonly dm: number; readonly need: number; readonly chance: number } | undefined;
  readonly chosen: boolean;
  /** Wählbar: Die Waffe reicht hin, und steht das Ziel fest, ist es seine Rüstung. */
  readonly open: boolean;
}

export interface CombatView {
  /** Der Charakter oben. */
  readonly character: string;
  /** Wer angreift: der Charakter oben oder ein NSC. */
  readonly attacker: string;
  readonly npcAttacks: boolean;
  /** Wer angegriffen wird, wenn das Ziel feststeht, mit seiner Rüstung. */
  readonly defender: { readonly name: string; readonly armor: ArmorClass } | undefined;
  readonly weapons: readonly WeaponChoice[];
  /** Was der Charakter oben anziehen kann; `worn` ist die getragene. */
  readonly armors: readonly { readonly id: string; readonly label: string; readonly worn: boolean }[];
  /** Zustand und UPP mit Wunden des Charakters oben, und was an Heilung geht. */
  readonly state: WoundState;
  readonly current: Upp;
  readonly healing: HealingView;
  readonly weapon: {
    readonly id: string;
    readonly name: string;
    readonly attack: AttackKind;
    readonly wounds: number;
    readonly characteristic: Characteristic;
    readonly value: number;
    readonly required: number;
    readonly requiredDm: number;
    readonly advantageous: number;
    readonly advantageousDm: number;
  };
  /** Der Teil des DM, der in jeder Zelle gleich ist: Fertigkeit und Attribut. */
  readonly base: readonly DmPart[];
  /** Die Spalten: je Reichweite der DM der Waffe; ohne DM reicht sie nicht hin. */
  readonly ranges: readonly { readonly range: Range; readonly dm: number | undefined }[];
  /** Die Zeilen: je Rüstung der DM der Waffe und die Zellen; `fixed` ist die Rüstung des feststehenden Ziels. */
  readonly rows: readonly { readonly armor: ArmorClass; readonly dm: number; readonly fixed: boolean; readonly cells: readonly CombatCell[] }[];
  /** Das gewählte Ziel mit DM, nötigem Wurf und Chance; erst dann lässt sich angreifen. */
  readonly target: { readonly armor: ArmorClass; readonly range: Range; readonly dm: number; readonly need: number; readonly chance: number; readonly parts: readonly DmPart[] } | undefined;
  /** Der neueste Treffer ohne Schaden: dafür lässt sich der Schaden würfeln. */
  readonly damage: { readonly index: number; readonly weapon: string; readonly wounds: number } | undefined;
  /** Die letzten Angriffe des Logs, das Neueste zuletzt, mit ihrem Schaden. */
  readonly recent: readonly { readonly index: number; readonly item: AttackItem; readonly damage: DamageItem | undefined }[];
  /** Bei Schusswaffen: geladene Schuss, Größe des Magazins, wie viele Magazine (mit Namen) im Besitz sind. */
  readonly ammo: { readonly rounds: number; readonly capacity: number; readonly magazine: string; readonly magazines: number } | undefined;
  /** Kann der Angreifer angreifen (nicht bewusstlos, Ziel nicht tot, Magazin nicht leer)? */
  readonly canAttack: boolean;
  /** Die laufende Begegnung: Mit ihr zeigt der Reiter die Kampfsimulation statt der Waffentabelle. */
  readonly sim: SimView | undefined;
  /** Die Geländearten zum Anlegen einer Begegnung. */
  readonly terrains: readonly { readonly id: string; readonly name: string; readonly dm: number }[];
  /** Eine Begegnung braucht einen Aufenthaltsort. */
  readonly canEncounter: boolean;
  /** Die Arten der Random Encounter List, zum Wählen. */
  readonly encounterTypes: readonly { readonly roll: number; readonly name: string; readonly quantity: number }[];
  /** Schaden, den der Spieler gerade verteilt. */
  readonly wounding: WoundingView | undefined;
  /** Was beim Würfeln einer Begegnung herauskam oder nicht ging. */
  readonly note: string | undefined;
}

export interface ShopItem {
  readonly id: string;
  readonly label: string;
  readonly kind: ItemKind;
  readonly tl: number | undefined;
  readonly price: number;
  /** Ab welcher Gesetzesstufe verboten, wenn das Gesetz der Welt ihn verbietet; kaufen geht trotzdem. */
  readonly banned: number | undefined;
  readonly once: boolean;
  /** Reicht die Kasse für einen? */
  readonly affordable: boolean;
}

export interface BookingItem {
  readonly at: string;
  readonly kind: BookingKind;
  readonly amount: number;
  readonly text: string | undefined;
  readonly character: string | undefined;
  readonly item: string | undefined;
  readonly count: number | undefined;
  readonly world: string | undefined;
}

export interface ShopView {
  /** Der Stand der Gruppenkasse in Cr. */
  readonly funds: number;
  /** Der Aufenthaltsort; ohne ihn gibt es kein Angebot. */
  readonly world: { readonly id: string; readonly name: string; readonly uwp: string; readonly tech: string; readonly law: string } | undefined;
  /** Das Angebot nach Art des Gegenstands, in der Reihenfolge der Liste. */
  readonly offer: readonly { readonly kind: ItemKind; readonly items: readonly ShopItem[] }[];
  /** Die Buchungen, die neueste zuerst. */
  readonly bookings: readonly BookingItem[];
  /** Die Lebenden, für Kauf, Verkauf, Einzahlung und Auszahlung, mit ihren Credits und was sie verkaufen könnten. */
  readonly members: readonly {
    readonly id: string;
    readonly name: string;
    readonly credits: number;
    /** Gegenstände aus dem Besitz mit Preis, mit dem vorgeschlagenen Erlös je Stück (halber Preis). */
    readonly sellable: readonly { readonly id: string; readonly label: string; readonly count: number; readonly price: number }[];
  }[];
  readonly error: string | undefined;
}

export interface CardView {
  readonly question: string | undefined;
  /** Die Wurffelder mit ihrem Wert und ob sie ausgewählt sind. */
  readonly bell: { readonly value: number; readonly picked: boolean; readonly weights: readonly number[] };
  readonly scatter: { readonly value: Scatter; readonly picked: boolean };
  readonly map: { readonly value: MapIcon; readonly picked: boolean };
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
    /** Ein Namensfeld: Vor- und Nachname, am Stück zu lesen. */
    readonly name: boolean;
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
  /** Der Charakter oben: Für ihn würfelt man Proben. */
  readonly focus: boolean;
  /** Im Charakter-Screen sind die Details aufgeklappt: volle Namen der Fertigkeiten, Ausrüstung, Credits, Notiz. */
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
  /** Zustand nach Wunden und das UPP mit Wunden. */
  readonly state: WoundState;
  readonly current: Upp;
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
  /** Die offene Namenswahl. */
  readonly names: NameChoices | undefined;
  readonly task: Task | undefined;
  /** Der Angriff in Vorbereitung, für den Charakter oben. */
  readonly attack: Attack | undefined;
  /** Was im Shop zuletzt nicht ging. */
  readonly shopError: string | undefined;
  /** Schaden an einem SC, den der Spieler gerade verteilt. */
  readonly wounding: Wounding | undefined;
  /** Was beim Würfeln einer Begegnung herauskam, wenn es keine gibt, oder was nicht ging. */
  readonly combatNote: string | undefined;
  /** Das Ziel dessen, der in der Kampfsimulation am Zug ist (Id eines SC oder NSC). */
  readonly simTarget: string | undefined;
  /** Der Charakter, dessen Details im Charakter-Screen aufgeklappt sind. */
  readonly opened: string | undefined;
  /** Die Leiste mit dem Charakter oben ist eingeklappt; das Gerät merkt es sich. */
  readonly stripCollapsed: boolean;
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

function dmParts(campaign: Campaign, character: Character, uses: string | undefined, unskilled: boolean, counts: readonly Characteristic[]): DmPart[] {
  // Wunden senken STR, DEX und END auch für Proben.
  const upp = woundedUpp(character.upp, woundsOf(campaign, { pc: character.id }));
  const parts: DmPart[] = [];
  if (uses !== undefined) {
    const skill = character.skills.find((s) => s.of === uses);
    parts.push({ kind: 'skill', name: skillOf(uses).name, level: shownLevel({ of: uses, level: skill?.level ?? 0 }), dm: skill ? skillDm(skill) : 0 });
  } else if (unskilled) {
    parts.push({ kind: 'unskilled', dm: ref.houseRules.unskilledDm });
  }
  for (const characteristic of counts) {
    const value = valueOf(upp, characteristic);
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
    parts: dmParts(campaign, character, entry.uses, entry.uses === undefined, entry.counts),
  };
}

/** Die Teile des DM eines Angriffs, nach dem heutigen Stand des Angreifers; Rüstung und Reichweite aus den Referenzdaten. */
function attackParts(attacker: Fighter, weaponId: string, armor: ArmorClass, range: Range): DmPart[] {
  const weapon = weaponOf(weaponId);
  const characteristic = attackCharacteristic(weapon);
  const value = valueOf(attacker.upp, characteristic);
  return [
    { kind: 'skill', name: skillOf(weapon.uses).name, level: attacker.skill, dm: attacker.skill },
    { kind: 'armor', armor, dm: armorDm(weapon, armor) },
    { kind: 'range', range, dm: rangeDm(weapon, range) ?? 0 },
    { kind: 'characteristic', characteristic, value, dm: characteristicAttackDm(weapon, value) },
  ];
}

function attackerOfEntry(entry: AttackResult): Combatant {
  return entry.by !== undefined ? { npc: entry.by } : { pc: entry.for! };
}

function nameOf(campaign: Campaign, who: Combatant): string {
  return 'pc' in who ? characterOf(campaign, who.pc).name : npcOf(campaign, who.npc).name;
}

function attackItem(campaign: Campaign, entry: AttackResult, index: number): AttackItem {
  const attacker = fighterOf(campaign, attackerOfEntry(entry));
  const victim = victimOf(entry);
  const success = isSuccess(entry);
  return {
    kind: 'attack',
    at: entry.at,
    character: attacker.name,
    victim: victim && nameOf(campaign, victim),
    weapon: weaponName(entry.with),
    armor: entry.armor,
    range: entry.range,
    target: entry.target,
    dice: entry.dice,
    dm: entry.dm,
    total: sum(entry.dice) + entry.dm,
    need: entry.target - entry.dm,
    success,
    parts: attackParts(attacker, entry.with, entry.armor, entry.range),
    wounds: weaponOf(entry.with).wounds,
    damagePending: success && damageRollsOf(campaign.log, index).length === 0,
  };
}

function damageItem(campaign: Campaign, entry: DamageRoll): DamageItem {
  const hit = campaign.log[entry.of] as AttackResult;
  const victim = victimOf(hit);
  return {
    kind: 'damage',
    at: entry.at,
    of: entry.of,
    weapon: weaponName(hit.with),
    victim: victim && nameOf(campaign, victim),
    dice: entry.dice,
    to: entry.to,
    damage: damageOf(entry),
  };
}

function weaponLabel(character: Character, weaponId: string): WeaponChoice {
  const weapon = weaponOf(weaponId);
  const level = weaponSkill(character, weapon)?.level ?? 0;
  const skill = skillOf(weapon.uses);
  return {
    id: weapon.id,
    name: weaponName(weapon.id),
    skill: `${skill.name}-${level}`,
    short: `${skill.short}-${level}`,
    wielded: wieldedWeapon(character).id === weapon.id,
  };
}

/** Die Hände heißen auf Deutsch so; alle anderen Waffen wie in den Charts. */
function weaponName(id: string): string {
  return id === HANDS ? 'Hände' : weaponOf(id).name;
}

function combatView(campaign: Campaign, attack: Attack | undefined, log: readonly LogItem[], wounding: Wounding | undefined, note: string | undefined, simTarget: string | undefined): CombatView | undefined {
  const character = focusOf(campaign);
  if (!character) return undefined;
  const current = attack ?? {};
  const attacker = attackerOf(current, campaign);
  const defender = defenderOf(current, campaign);
  const weapon = attacker.weapon;
  const characteristic = attackCharacteristic(weapon);
  const value = valueOf(attacker.upp, characteristic);
  const [skill, , , counted] = attackParts(attacker, weapon.id, 'nothing', 'close');
  const table = attackTable(campaign, current);
  const target = attack ? evaluateAttack(attack, campaign) : undefined;
  const pending = pendingDamage(campaign.log);
  const pendingHit = pending === undefined ? undefined : (campaign.log[pending] as AttackResult);
  const recent = log
    .flatMap((item, index) => (item.kind === 'attack' ? [{ index, item }] : []))
    .slice(-3)
    .map(({ index, item }) => {
      const damage = log.find((d): d is DamageItem => d.kind === 'damage' && d.of === index);
      return { index, item, damage };
    });
  const encounter = currentEncounter(campaign);
  const pc = fighterOf(campaign, { pc: character.id });
  const ammo = ammoOf(character);
  return {
    character: character.name,
    attacker: attacker.name,
    npcAttacks: current.by !== undefined,
    defender: defender && { name: defender.name, armor: defender.armor },
    weapons: weaponsOf(character).map((id) => weaponLabel(character, id)),
    armors: armorsOf(character).map((id) => ({ id, label: itemLabel(itemOf(id)), worn: character.wears === id })),
    state: pc.state,
    current: pc.upp,
    healing: recoveryOptions(campaign, { pc: character.id }),
    weapon: {
      id: weapon.id,
      name: weaponName(weapon.id),
      attack: weapon.attack,
      wounds: weapon.wounds,
      characteristic,
      value,
      required: weapon.required,
      requiredDm: weapon.requiredDm,
      advantageous: weapon.advantageous,
      advantageousDm: weapon.advantageousDm,
    },
    base: [skill!, counted!],
    ranges: ranges.map((range) => ({ range, dm: rangeDm(weapon, range) })),
    rows: armorClasses.map((armor, i) => ({
      armor,
      dm: armorDm(weapon, armor),
      fixed: defender?.armor === armor,
      cells: ranges.map((range, j) => {
        const odds = table[i]![j];
        return {
          range,
          odds: odds && { dm: odds.dm.total, need: odds.need, chance: odds.chance },
          chosen: attack?.armor === armor && attack.range === range,
          open: odds !== undefined && (defender === undefined || defender.armor === armor),
        };
      }),
    })),
    target:
      attack?.armor !== undefined && attack.range !== undefined && target
        ? { armor: attack.armor, range: attack.range, dm: target.dm.total, need: target.need, chance: target.chance, parts: attackParts(attacker, weapon.id, attack.armor, attack.range) }
        : undefined,
    canAttack: canFight(attacker.state) && defender?.state !== 'dead' && !(current.by === undefined && ammo?.rounds === 0),
    damage: pendingHit && pending !== undefined ? { index: pending, weapon: weaponName(pendingHit.with), wounds: weaponOf(pendingHit.with).wounds } : undefined,
    recent,
    ammo: current.by === undefined && ammo ? { rounds: ammo.rounds, capacity: ammo.capacity, magazine: itemLabel(itemOf(ammo.ammo)), magazines: ammo.magazines } : undefined,
    sim: encounter && simView(campaign, encounter, simTarget),
    terrains: ref.encounters.terrains,
    canEncounter: campaign.location !== undefined,
    encounterTypes: ref.encounters.types.map((t) => ({ roll: t.roll, name: t.name, quantity: t.quantity })),
    wounding: wounding && woundingView(campaign, wounding),
    note,
  };
}

function fighterView(campaign: Campaign, slot: FightSlot, encounter: Encounter, turn: FightSlot | undefined, target: string | undefined): FighterView {
  const fighter = fighterOf(campaign, slot.who);
  const npc = 'npc' in slot.who ? npcOf(campaign, slot.who.npc) : undefined;
  const character = 'pc' in slot.who ? characterOf(campaign, slot.who.pc) : undefined;
  const wears = npc?.wears ?? character?.wears;
  return {
    id: slot.id,
    side: slot.side,
    name: fighter.name,
    leader: npc?.leader ?? false,
    weapon: weaponName(fighter.weapon.id),
    skill: `${skillOf(fighter.weapon.uses).name}-${fighter.skill}`,
    armor: wears === undefined ? undefined : itemLabel(itemOf(wears)),
    armorClass: fighter.armor,
    upp: npc?.upp ?? character!.upp,
    current: fighter.upp,
    state: fighter.state,
    acted: encounter.acted.includes(slot.id),
    turn: turn?.id === slot.id,
    targetable: turn !== undefined && turn.side !== slot.side && fighter.state !== 'dead',
    targeted: target === slot.id,
    healing: recoveryOptions(campaign, slot.who),
  };
}

function simView(campaign: Campaign, running: Encounter, target: string | undefined): SimView {
  const turn = turnOf(campaign);
  const encounter = fightState(campaign, running);
  const order = fightOrder(campaign, encounter);
  const ground = encounter.terrain === undefined ? undefined : ref.encounters.terrains.find((t) => t.id === encounter.terrain);
  let turnView: SimView['turn'];
  let weapon: Weapon | undefined;
  if (turn) {
    const attacker = fighterOf(campaign, turn.who);
    weapon = attacker.weapon;
    let odds: NonNullable<SimView['turn']>['odds'];
    const valid = target !== undefined && order.some((s) => s.id === target && s.side !== turn.side);
    if (valid) {
      try {
        // Für den Zug steht der SC am Zug bzw. das Ziel des NSC oben; der Controller holt ihn beim Angriff nach oben.
        const top = turn.side === 'pcs' ? turn.id : target;
        const ready = focusOf(campaign)?.id === top ? campaign : { ...campaign, focus: top };
        const attack = turnAttack(ready, target);
        const evaluated = evaluateAttack(attack, ready);
        if (evaluated && attack.armor !== undefined && attack.range !== undefined) {
          odds = { dm: evaluated.dm.total, need: evaluated.need, chance: evaluated.chance, parts: attackParts(attacker, attacker.weapon.id, attack.armor, attack.range) };
        }
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
      }
    }
    const character = 'pc' in turn.who ? characterOf(campaign, turn.who.pc) : undefined;
    const ammo = character && ammoOf(character);
    turnView = {
      id: turn.id,
      side: turn.side,
      name: attacker.name,
      weapon: weaponName(attacker.weapon.id),
      target: valid ? target : undefined,
      odds,
      reaches: rangeDm(attacker.weapon, encounter.range) !== undefined,
      ammo: ammo && { rounds: ammo.rounds, capacity: ammo.capacity, magazines: ammo.magazines },
    };
  }
  return {
    name: encounterTypeOfEncounter(encounter).name,
    reaction: encounter.reaction,
    reactionText: reactionText(encounter.reaction),
    round: encounter.round,
    range: encounter.range,
    rangeDice: encounter.rangeDice,
    terrain: ground && { name: ground.name, dm: ground.dm },
    surprise: surpriseOf(encounter),
    first: firstSide(encounter),
    pcSurprise: encounter.pcSurprise,
    npcSurprise: encounter.npcSurprise,
    fighters: order.map((slot) => fighterView(campaign, slot, encounter, turn, turnView?.target)),
    turn: turnView,
    defeated: defeatedSide(campaign, encounter),
    ranges: ranges.map((range) => ({ range, reaches: weapon === undefined || rangeDm(weapon, range) !== undefined })),
  };
}

function woundingView(campaign: Campaign, wounding: Wounding): WoundingView {
  const hit = campaign.log[wounding.of] as AttackResult;
  const victim = victimOf(hit)!;
  const upp = uppOf(campaign, victim);
  const before = woundsOf(campaign, victim);
  return {
    victim: nameOf(campaign, victim),
    weapon: weaponName(hit.with),
    dice: wounding.dice,
    to: wounding.to,
    current: woundedUpp(upp, before),
    full: upp,
  };
}

function shopView(campaign: Campaign, error: string | undefined): ShopView {
  const funds = fundsOf(campaign);
  const world = locationOf(campaign);
  const offer = world ? offerOf(world) : [];
  const kinds = itemKinds.filter((kind) => offer.some((o) => o.item.kind === kind));
  const name = (id: string | undefined) => (id === undefined ? undefined : campaign.characters.find((c) => c.id === id)?.name);
  return {
    funds,
    world: world && { id: hexId(world.column, world.row), name: world.name, uwp: uwpCode(world.uwp), tech: ehex(world.uwp.tech ?? 0), law: ehex(world.uwp.law ?? 0) },
    offer: kinds.map((kind) => ({
      kind,
      items: offer
        .filter((o) => o.item.kind === kind)
        .map((o) => ({ id: o.item.id, label: itemLabel(o.item), kind, tl: o.item.tl, price: o.price, banned: o.banned, once: o.item.once, affordable: o.price <= funds })),
    })),
    bookings: [...campaign.bookings].reverse().map((b) => ({
      at: b.at,
      kind: b.kind,
      amount: b.amount,
      text: b.text,
      character: name(b.for),
      item: b.bought ?? b.sold ? itemLabel(itemOf((b.bought ?? b.sold)!)) : undefined,
      count: b.count,
      world: b.in === undefined ? undefined : (campaign.hexes.find((h) => hexId(h.column, h.row) === b.in)?.name ?? b.in),
    })),
    members: livingCharacters(campaign).map((c) => ({
      id: c.id,
      name: c.name,
      credits: c.credits,
      sellable: c.possessions.flatMap((p) => {
        const item = itemOf(p.of);
        const price = salePrice(item);
        return price === undefined ? [] : [{ id: item.id, label: itemLabel(item), count: p.count, price }];
      }),
    })),
    error,
  };
}

function logItem(campaign: Campaign, entry: LogEntry, index: number): LogItem {
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
        bell: entry.bell,
        scatter: entry.scatter,
        map: entry.map,
        items: entry.items.map((item) => {
          const slot = slotOf(item);
          const section = sectionOfSlot(slot.id);
          return { section: section.name, slot: slot.label, texts: item.picked.map((e) => entryOf(e).text), name: isNameSlot(slot.id) };
        }),
      };
    case 'task':
      return taskItem(campaign, entry);
    case 'attack':
      return attackItem(campaign, entry, index);
    case 'damage':
      return damageItem(campaign, entry);
    case 'recovery': {
      const patient: Combatant = entry.for !== undefined ? { pc: entry.for } : { npc: entry.npc! };
      return { kind: 'recovery', at: entry.at, how: entry.how, patient: nameOf(campaign, patient), healer: entry.by === undefined ? undefined : characterOf(campaign, entry.by).name, days: daysOf(entry) };
    }
    case 'note':
      return { kind: 'note', at: entry.at, text: entry.text, interprets: entry.interprets };
  }
}

/** Ein Namensfeld: die sechs auf der Tafel NSC und die drei des früheren Bereichs *Namen*. */
function isNameSlot(slotId: string): boolean {
  return nameSlotIds.includes(slotId) || sectionOfSlot(slotId).id === 'names';
}

function cardView(card: Card): CardView {
  return {
    question: card.question,
    bell: { value: card.bell, picked: card.pickedRolls.includes('bell'), weights: bellWeights },
    scatter: { value: card.scatter, picked: card.pickedRolls.includes('scatter') },
    map: { value: card.map, picked: card.pickedRolls.includes('map') },
    // Ausgeblendete Felder hat die Karte nicht gezogen; sie fehlen, ebenso Bereiche ohne gezogenes Feld.
    sections: ref.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        kind: section.kind,
        slots: section.slots.flatMap((slot) => {
          const drawn = drawnIn(card, slot.id);
          return drawn.length > 0 ? [{ id: slot.id, label: slot.label, texts: drawn.map((e) => entryOf(e).text), picked: card.picked.includes(slot.id), name: isNameSlot(slot.id) }] : [];
        }),
      }))
      .filter((section) => section.slots.length > 0),
    pickedCount: pickedCount(card),
    canConfirm: canConfirm(card),
  };
}

function characterView(campaign: Campaign, character: Character, state: ControllerState): CharacterView {
  const focus = focusOf(campaign)?.id === character.id;
  const own = focus ? state.task : undefined;
  return {
    id: character.id,
    name: character.name,
    background: character.background,
    equipment: character.equipment,
    credits: character.credits,
    note: character.note,
    upp: character.upp,
    focus,
    open: state.opened === character.id,
    skills: activeSkills(character).map((s) => {
      const skill = skillOf(s.of);
      return { of: s.of, name: skill.name, short: skill.short, level: shownLevel(s), chosen: own?.uses === s.of };
    }),
    possessions: character.possessions.map((p) => ({ name: itemLabel(itemOf(p.of)), count: p.count })),
    career: character.career && careerLines(character.career),
    homeworld: character.homeworld === undefined ? undefined : worldName(campaign.hexes, character.homeworld),
    termWorlds: (character.career?.worlds ?? []).map((id) => worldName(campaign.hexes, id)),
    unskilled: canGoUnskilled(character.skills) ? { dm: ref.houseRules.unskilledDm, chosen: own?.unskilled ?? false } : undefined,
    characteristics: characteristicOptions(own, campaign, character),
    inLog: isInLog(campaign, character.id),
    state: woundStateOf(campaign, { pc: character.id }),
    current: woundedUpp(character.upp, woundsOf(campaign, { pc: character.id })),
  };
}

function taskView(campaign: Campaign, task: Task): TaskView {
  const character = focusOf(campaign)!;
  return { character: character.name, ready: hasSkill(task), ...evaluateTask(task, campaign), parts: dmParts(campaign, character, task.uses, task.unskilled, task.counts) };
}

const skills: readonly SkillChoice[] = ref.skills.map((s) => ({ ...s, leveled: shownLevel({ of: s.id, level: 0 }) !== undefined }));
const items: readonly ItemChoice[] = ref.items.map((i) => ({ id: i.id, label: itemLabel(i), kind: i.kind, once: i.once, weapon: i.weapon, armor: i.armor !== undefined }));

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
  const base = { persistent: state.persistent, durable: state.durable, storageError: state.storageError, screen: state.screen, stripCollapsed: state.stripCollapsed, skills, items };
  if (!campaign) {
    return { ...base, ready: false, campaign: { id: '', name: '' }, campaigns: [], campaignSheet: undefined, odds: [], log: [], card: undefined, names: undefined, characters: [], focus: undefined, dead: [], npcs: [], retired: [], task: undefined, combat: undefined, shop: undefined, location: undefined, result: undefined, editor: undefined, generation: undefined, generationRunning: false, sector: [], worlds: [], world: undefined, selected: undefined, picking: undefined };
  }
  const editing = state.editor?.id === undefined ? undefined : characterOf(campaign, state.editor.id);
  const log = campaign.log.map((entry, index) => logItem(campaign, entry, index));
  const resultItem = state.result === undefined ? undefined : log[state.result];
  return {
    ...base,
    ready: true,
    campaign: { id: campaign.id, name: campaign.name },
    campaigns: byName(state.campaigns).map((c) => ({ id: c.id, name: c.name, open: c.id === campaign.id, characters: livingCharacters(c).length, entries: c.log.length })),
    campaignSheet: state.campaignSheet && { error: state.campaignSheet.error, canDelete: state.campaigns.length > 1 },
    odds: ref.odds.map((o) => ({ id: o.id, name: o.name, chance: o.chance, target: o.target, selected: o.id === campaign.odds })),
    log,
    card: state.card && cardView(state.card),
    names: state.names,
    characters: livingCharacters(campaign).map((c) => characterView(campaign, c, state)),
    focus: focusOf(campaign)?.id,
    dead: deadCharacters(campaign).map((c) => ({ id: c.id, name: c.name, background: c.background })),
    npcs: npcCharacters(campaign).map((c) => ({ id: c.id, name: c.name, background: c.background, dead: c.dead })),
    retired: retiredCharacters(campaign).map((c) => ({ id: c.id, name: c.name })),
    task: state.task && taskView(campaign, state.task),
    combat: combatView(campaign, state.attack, log, state.wounding, state.combatNote, state.simTarget),
    shop: shopView(campaign, state.shopError),
    location: campaign.location,
    result: resultItem?.kind === 'task' || resultItem?.kind === 'attack' || resultItem?.kind === 'damage' ? resultItem : undefined,
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
