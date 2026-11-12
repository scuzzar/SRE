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
  hasRun,
  moveState,
  type MoveState,
  rowOf,
  roundsFor,
  neighboursOf,
  volleyOf,
  isNeighbour,
  BURST_NEIGHBOUR_DM,
  BURST_ROLLS,
  ranges,
  weaponOf,
  weaponSkill,
  armedWeaponsOf,
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
  patronDmParts,
  patronLists,
  patronOfRoll,
  patronRollOf,
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
  type Fighter,
  type PhysicalCharacteristic,
  type WoundState,
  canFight,
  currentEncounter,
  encounterRange,
  distanceOf,
  rangeOfBand,
  rangeOfDistance,
  ESCAPED_BAND,
  isEscaped,
  isEvading,
  evadeDmAt,
  encounterTypeOfEncounter,
  fighterOf,
  npcCharacters,
  anyCharacterOf,
  replaceCharacter,
  type CharacterId,
  reactionText,
  quantityDieOf,
  reactionDm,
  uppOf,
  historyOf,
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
  blocksOf,
  blowsOf,
  isMelee,
  parryDm,
  strikeDm,
  surprisingOf,
  encounterStart,
  needsSurprise,
  surpriseParts,
  type SurpriseDmPart,
  type RecoveryKind,
  type RecoveryOptions,
  type Strike,
  type WoundBlock,
} from '../model';
import {
  attackerOf,
  attackTable,
  turnAttack,
  defenderOf,
  type Wounding,
  attackExtras,
  unassignWound,
  woundingState,
  canConfirm,
  characteristicOptions,
  drawnIn,
  evaluateAttack,
  neighbourTargets,
  canChooseFire,
  firesBurst,
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
  /** Der Hinweis über den Waffen im Shop ist weggeklickt. */
  readonly shopHintHidden: boolean;
  /** Die dauerhaften NSC unter „NSC“, getrennt von den SC. */
  readonly npcs: readonly { readonly id: string; readonly name: string; readonly background: string; readonly dead: boolean }[];
  /** Die Toten unter „Verstorben“, getrennt von den Lebenden. */
  readonly dead: readonly { readonly id: string; readonly name: string; readonly background: string }[];
  readonly retired: readonly { readonly id: string; readonly name: string }[];
  readonly task: TaskView | undefined;
  /** Der Reiter Kampf für den Charakter oben; fehlt, wenn es keinen Lebenden gibt. */
  readonly combat: CombatView | undefined;
  /** Der Bereich Patron im Reiter Begegnung; fehlt nur ohne Kampagne. */
  readonly patron: PatronView | undefined;
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

export type Screen = 'oracle' | 'encounter' | 'combat' | 'shop' | 'characters' | 'sector' | 'about';

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

export type LogItem = OracleItem | DiceItem | CardItem | TaskItem | AttackItem | DamageItem | RecoveryItem | PatronItem | NoteItem;

/** Ein Patron-Wurf: Liste, Würfel mit DMs, der Wurf 11–66 und die Zeile der Liste. */
export interface PatronItem {
  readonly kind: 'patron';
  readonly at: string;
  readonly list: number;
  readonly dice: Dice;
  readonly dms: readonly [number, number];
  readonly roll: number;
  readonly name: string;
  /** Kein Patron, sondern ein Gerücht. */
  readonly rumor: boolean;
}

/** Der Bereich Patron im Reiter Begegnung: je Liste die DMs der lebenden SC, dazu der letzte Patron-Wurf im Log. */
export interface PatronView {
  readonly lists: readonly { readonly list: number; readonly parts: readonly { readonly die: 0 | 1; readonly label: string; readonly dm: number }[] }[];
  readonly last: PatronItem | undefined;
  /** Der Test des letzten Wurfs und was er brachte; fehlt, bis gewürfelt ist. */
  readonly note: string | undefined;
}

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
  | { readonly kind: 'range'; readonly range: Range; readonly dm: number }
  /** Ein Nachbar im Feuerstoß: DM −3 (Book 4). */
  | { readonly kind: 'neighbour'; readonly dm: number }
  /** Ein geschwächter Schlag oder Hieb: DM der Waffe (S. 4). */
  | { readonly kind: 'weakened'; readonly dm: number }
  /** Die Parade des Ziels mit seiner Stufe (SR 22). */
  | { readonly kind: 'parry'; readonly dm: number }
  /** Das Ziel weicht aus: DM nach der Reichweite (SR 20). */
  | { readonly kind: 'evade'; readonly dm: number };

/** Feuerstoß, Schrot oder Einzelschuss einer Waffe, die einen Feuerstoß kann, mit dem, was er bringt. */
export interface FireView {
  /** Feuerstoß (`true`) oder Einzelschuss. */
  readonly burst: boolean;
  /** Kann man zwischen Feuerstoß und Einzelschuss wählen (Automatic Rifle)? */
  readonly choosable: boolean;
  /** Wie viele Schuss der Angriff verbraucht. */
  readonly rounds: number;
  /** Würfe auf das Ziel: Feuerstoß 2, sonst 1. */
  readonly rolls: number;
  /** Höchstens so viele Nachbarn trifft er mit. */
  readonly neighbours: number;
  /** DM auf die Nachbarn. */
  readonly neighbourDm: number;
  /** Feuerstoß: die Nachbarn darüber und darunter in der Liste; Schrot: ausgelost. */
  readonly pick: 'list' | 'random';
  /** Die Waffe, deren Zeile der Einzelschuss nimmt (Rifle). */
  readonly single: string | undefined;
}

/** Ein gewürfelter Angriff; bei einem Treffer mit seinem Schaden, sobald gewürfelt. */
export interface AttackItem {
  readonly kind: 'attack';
  readonly at: string;
  /** Bei Schlägen und Hieben: wie der Schlag zählte. */
  readonly strike: Strike | undefined;
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
  /** Bei einem weiteren Wurf einer Garbe: die Stelle ihres ersten Wurfs. */
  readonly volley: number | undefined;
  /** Der Wurf trifft einen Nachbarn des Ziels. */
  readonly neighbour: boolean;
  /** Beim ersten Wurf einer Garbe: Feuerstoß oder Schrot. */
  readonly fire: 'burst' | 'shotgun' | undefined;
  /** Beim ersten Wurf einer Garbe: alle weiteren Würfe, der Reihe nach. */
  readonly rest: readonly AttackItem[];
  /** Beim ersten Wurf einer Garbe: Für irgendeinen ihrer Treffer steht der Schaden noch aus. */
  readonly volleyPending: boolean;
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
  /** Die Blöcke auf den Attributen der Reihe nach, wenn der Treffer ein Ziel hatte. */
  readonly blocks: readonly WoundBlock[] | undefined;
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
  /** Ein Feuerstoß auf das gewählte Ziel träfe ihn als Nachbarn mit (darüber oder darunter in der Liste). */
  readonly neighbour: boolean;
  readonly healing: HealingView;
  /** Bei einer Faust- oder Nahkampfwaffe: die Combat-Schläge, die er noch hat (fehlt bei Battle Dress). */
  readonly blows: number | undefined;
  /** Er weicht aus (SR 20), bis zu seinem nächsten Zug. */
  readonly evading: boolean;
  /** Ein SC über 20 Bands weg: kein Ziel, kein Angriff. */
  readonly escaped: boolean;
}

/**
 * Was der neueste Eintrag im Log einem Kämpfer getan hat, für eine kurze Animation: ein Treffer oder
 * Fehlschuss eines Angriffs, oder Schaden. `key` ist je Ereignis eindeutig.
 */
export interface Impact {
  readonly id: string;
  readonly kind: 'hit' | 'miss' | 'damage';
  readonly damage: number | undefined;
  /** Beim Schaden: was STR, DEX und END dadurch verloren haben (nach Überlauf und Kappung bei 0). */
  readonly lost: { readonly str: number; readonly dex: number; readonly end: number } | undefined;
  readonly key: string;
}

/** Die Kampfsimulation einer laufenden Begegnung. */
export interface SimView {
  readonly name: string;
  readonly reaction: number;
  readonly reactionText: string;
  /** Die Würfel der Reaktion und ihr DM; fehlen bei Begegnungen von vorher. */
  readonly reactionDice: readonly number[] | undefined;
  readonly reactionDm: number;
  /** Die Zeile der Random Encounter List (11–56), wie viele Würfel die Anzahl hat und welcher (W6, W4, W3). */
  readonly roll: number;
  readonly quantity: number;
  readonly quantityDie: number;
  readonly round: number;
  /**
   * Der vorgewählte SC: der SC am Zug, beim NSC-Zug sein Ziel (vor dem Wurf auf die Überraschung und
   * ohne Ziel der erste SC). Um seine Entfernung geht es im Zug.
   */
  readonly focus: string | undefined;
  /** Die Reichweite des vorgewählten SC; fehlt, wenn er entkommen ist. */
  readonly range: Range | undefined;
  /** Seine Entfernung in Range Bands: 0 bis 20, 21 entkommen; auf Band 0 in Berührung oder nicht. */
  readonly band: number;
  readonly close: boolean;
  readonly escaped: boolean;
  /** Das Startband: wo alle SC zu Beginn standen, und seine Reichweite. */
  readonly start: { readonly band: number; readonly close: boolean; readonly range: Range | undefined };
  /** Jeder SC, der kämpft, auf der Leiste: Band, Berührung, entkommen. Die NSC stehen immer auf Band 0. */
  readonly positions: readonly PcPosition[];
  readonly rangeDice: readonly number[] | undefined;
  /** Der Würfel des Startbands und wie viele Seiten er hatte (Medium 2, Long 8, Very Long 10). */
  readonly bandDie: { readonly die: number; readonly sides: number } | undefined;
  readonly terrain: { readonly name: string; readonly dm: number } | undefined;
  readonly surprise: Side | undefined;
  /** Die Überraschung ist noch nicht gewürfelt: Sie ist der erste Wurf im Kampf, vorher ist keiner am Zug. */
  readonly needsSurprise: boolean;
  /** Die DMs auf die Überraschung je Partei, einzeln, nach dem heutigen Stand. */
  readonly surpriseParts: { readonly pcs: readonly SurpriseDmPart[]; readonly npcs: readonly SurpriseDmPart[] };
  /** Die Partei, deren Überraschung noch hält (bis zum Alarm, SR 20). */
  readonly surprising: Side | undefined;
  /** Die Runde, in der Alarm gegeben wurde. */
  readonly alarm: number | undefined;
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
        /** Feuerstoß oder Schrot der Waffe am Zug. */
        readonly fire: FireView | undefined;
        /** Seine Partei ist in dieser Runde gelaufen: kein Angriff. */
        readonly ran: boolean;
        /** Bei einem Schlag oder Hieb: die Schlagart, die Combat-Schläge und ob er ihn schwächen kann (SR 22). */
        readonly melee: MeleeView | undefined;
        /**
         * Je Waffe ein Angriff: beim SC Primär- und Sekundärwaffe (ohne die zweite die Hände), beim NSC
         * seine Waffe. Ein Tipp wählt die Waffe und greift an.
         */
        readonly attacks: readonly AttackOption[];
      }
    | undefined;
  /** Ist eine Partei außer Gefecht, ist der Kampf entschieden. */
  readonly defeated: Side | undefined;
  /** Wie weit sich die Partei am Zug in dieser Runde noch bewegen kann; ohne Zug keine Bewegung. */
  readonly move: MoveState | undefined;
  /** Was der neueste Eintrag im Log den Kämpfern getan hat. */
  readonly impacts: readonly Impact[];
  /** Die Pfeile des letzten Angriffs in der Begegnung (eine Garbe hat mehrere). */
  readonly arrows: readonly AttackArrow[];
  /** Die Range Bands je Reichweite (erstes und letztes Band) und ob die Waffe dessen am Zug hinreicht. */
  readonly bands: readonly { readonly range: Range; readonly from: number; readonly to: number; readonly reaches: boolean }[];
}

/** Ein SC auf der Leiste der Entfernung. */
export interface PcPosition {
  readonly id: string;
  readonly name: string;
  /** Der Anfangsbuchstabe für die Marke. */
  readonly initial: string;
  readonly band: number;
  readonly close: boolean;
  readonly escaped: boolean;
  /** Er ist der vorgewählte SC. */
  readonly focus: boolean;
}

/** Ein möglicher Angriff dessen, der am Zug ist, mit einer seiner Waffen. */
export interface AttackOption {
  /** Primärwaffe, Sekundärwaffe, die Hände oder die Waffe eines NSC. */
  readonly slot: 'primary' | 'secondary' | 'hands';
  readonly weapon: string;
  readonly name: string;
  /** Mit Ziel: der nötige Wurf und die Chance; ohne Ziel fehlt beides. */
  readonly odds: { readonly need: number; readonly chance: number } | undefined;
  readonly reaches: boolean;
  /** Bei einer Schusswaffe eines SC: Schuss im Magazin und Magazine im Besitz. */
  readonly ammo: { readonly rounds: number; readonly capacity: number; readonly magazines: number } | undefined;
  /** Zu wenig Schuss geladen für den Angriff; dann bietet der Knopf das Nachladen an. */
  readonly empty: boolean;
  /** Die Waffe ist gerade in der Hand. */
  readonly wielded: boolean;
  /** Feuerstoß, Schrot oder Einzelschuss der Waffe. */
  readonly fire: FireView | undefined;
  /** Ein Schlag oder Hieb (Faust, Klinge, Stangenwaffe). */
  readonly melee: boolean;
}

/** Ein Pfeil des letzten Angriffs in der Begegnung: von wem zu wem, ob er traf. */
export interface AttackArrow {
  readonly from: string;
  readonly to: string;
  readonly hit: boolean;
  readonly key: string;
}

/** Schlag oder Hieb am Zug: wie er zählt und wie viel Ausdauer noch da ist. */
export interface MeleeView {
  /** Fehlt, solange kein Ziel gewählt ist. */
  readonly strike: Strike | undefined;
  /** Die Combat-Schläge, die noch übrig sind; fehlt bei Battle Dress (unbegrenzt). */
  readonly blows: number | undefined;
  readonly end: number;
  readonly weakenedDm: number;
  /** Der Spieler schwächt den Schlag freiwillig. */
  readonly weakened: boolean;
  /** Ein SC kann wählen, ob er voll oder geschwächt schlägt. */
  readonly canWeaken: boolean;
}

/** Schaden an einem SC, den der Spieler auf STR, DEX und END verteilt. */
export interface WoundingView {
  readonly victim: string;
  readonly weapon: string;
  readonly dice: readonly number[];
  /** Je Würfel seine Blöcke bis jetzt; ein Würfel, der übergelaufen ist, hat mehrere. */
  readonly blocks: readonly (readonly WoundBlock[])[];
  /** Der nächste Block: Würfel, Rest und die Attribute über 0; fehlt, wenn alles verteilt ist. */
  readonly next: { readonly die: number; readonly rest: number; readonly open: readonly PhysicalCharacteristic[] } | undefined;
  /** Ob der Spieler schon einen Block gewählt hat (Zurück geht). */
  readonly chosen: boolean;
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
  /** Wer angreift: der Charakter oben. */
  readonly attacker: string;
  /** Wer angegriffen wird, wenn das Ziel feststeht, mit seiner Rüstung. */
  readonly defender: { readonly name: string; readonly armor: ArmorClass } | undefined;
  readonly weapons: readonly WeaponChoice[];
  /** Was der Charakter oben anziehen kann; `worn` ist die getragene. */
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
  /** Der neueste Treffer ohne Schaden (bei einer Garbe der nächste): dafür lässt sich der Schaden würfeln, mit wen er trifft. */
  readonly damage: { readonly index: number; readonly weapon: string; readonly wounds: number; readonly victim: string | undefined; readonly left: number } | undefined;
  /** Bei Schusswaffen: geladene Schuss, Größe des Magazins, wie viele Magazine (mit Namen) im Besitz sind. */
  readonly ammo: { readonly rounds: number; readonly capacity: number; readonly magazine: string; readonly magazines: number } | undefined;
  /** Kann der Angreifer angreifen (nicht bewusstlos, Ziel nicht tot, genug Schuss geladen)? */
  readonly canAttack: boolean;
  /** Feuerstoß oder Schrot der Waffe des Angreifers. */
  readonly fire: FireView | undefined;
  /** Die laufende Begegnung: Mit ihr zeigt der Reiter die Kampfsimulation statt der Waffentabelle. */
  readonly sim: SimView | undefined;
  /** Die Geländearten zum Anlegen einer Begegnung. */
  readonly terrains: readonly { readonly id: string; readonly name: string; readonly dm: number }[];
  /** Eine Begegnung braucht einen Aufenthaltsort. */
  readonly canEncounter: boolean;
  /** Der Aufenthaltsort als Feld (0304), und welche fertigen Welten es dafür gibt. */
  readonly location: string | undefined;
  readonly worlds: readonly WorldChoice[];
  /** Die Übersicht der eben gewürfelten Begegnung steht im Vordergrund. */
  readonly intro: boolean;
  /** Der eben gewürfelte Wurf auf die Überraschung steht im Vordergrund. */
  readonly surpriseShown: boolean;
  /** Der Würfel der Anzahl für die nächste Begegnung: 6, 4 oder 3. */
  readonly quantityDie: number;
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
  /** Wie viele davon der Charakter oben besitzt. */
  readonly owned: number;
  /** Bei Rüstungen: Der Charakter oben trägt sie. */
  readonly worn: boolean;
}

/** Eine Waffe im Angebot, mit ihrem Magazin daneben und was sie dem Charakter oben taugt. */
export interface ShopWeapon {
  readonly item: ShopItem;
  /** Schlag, Hieb oder Schuss: Nahkampf oder Schusswaffe. */
  readonly attack: AttackKind;
  /** Schaden in W6. */
  readonly wounds: number;
  /** Das Magazin bzw. Power Pack, wenn sie eins hat, mit den Schuss je Magazin. */
  readonly ammo: (ShopItem & { readonly rounds: number }) | undefined;
  /** Die Fertigkeit des Charakters oben in dieser Waffe (Rifle-1); fehlt, wenn er sie nicht hat. */
  readonly skill: string | undefined;
  /** Der DM seines Attributs (STR beim Hieb, DEX beim Schuss), wenn er nicht 0 ist (DEX +1). */
  readonly characteristic: string | undefined;
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
  /** Der Charakter oben: für ihn kauft man, aus seinem Besitz verkauft man. Fehlt ohne Lebenden. */
  readonly owner: string | undefined;
  /** Die Waffen des Angebots, je mit Magazin; Magazine stehen nicht noch einmal einzeln. */
  readonly weapons: readonly ShopWeapon[];
  /** Die Rüstungen des Angebots. */
  readonly armor: readonly ShopItem[];
  /** Alles Übrige: Ausrüstung, Fahrzeuge, Passagen, je als Gruppe. */
  readonly gear: readonly { readonly kind: ItemKind; readonly items: readonly ShopItem[] }[];
  /** Die Buchungen, die neueste zuerst. */
  readonly bookings: readonly BookingItem[];
  /** Die Lebenden, für Kauf, Verkauf, Einzahlung und Auszahlung, mit ihren Credits und was sie verkaufen könnten. */
  readonly members: readonly {
    readonly id: string;
    readonly name: string;
    readonly credits: number;
    /** Gegenstände aus dem Besitz mit Preis, mit dem vorgeschlagenen Erlös je Stück (halber Preis). */
    readonly sellable: readonly {
      readonly id: string;
      readonly label: string;
      readonly kind: ItemKind;
      readonly count: number;
      readonly price: number;
      /** Was der Gegenstand ihm gerade ist: getragen, in der Hand, Primär- oder Sekundärwaffe. */
      readonly role: string | undefined;
    }[];
  }[];
  readonly error: string | undefined;
  /** Gleich nach dem Kauf einer Rüstung: Soll er sie anlegen? Mit dem, was er jetzt trägt. */
  readonly wearOffer: { readonly character: string; readonly item: string; readonly worn: string | undefined } | undefined;
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
  /** Die getragene Rüstung; fehlt, wenn er keine trägt. Anlegen lässt sie sich nur im Editor. */
  readonly armor: string | undefined;
  /** Primärwaffe, Sekundärwaffe und Hände, mit der in der Hand; für die Leiste im Kampf, auch auf den Nachbarkarten. */
  readonly weapons: readonly WeaponChoice[];
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
  /** Gleich nach dem Kauf einer Rüstung: wer sie gekauft hat, zum Anlegen. */
  readonly wearOffer: { readonly character: string; readonly item: string } | undefined;
  /** Schaden an einem SC, den der Spieler gerade verteilt. */
  readonly wounding: Wounding | undefined;
  /** Was beim Würfeln einer Begegnung herauskam, wenn es keine gibt, oder was nicht ging. */
  readonly combatNote: string | undefined;
  /** Der Test des letzten Patron-Wurfs und was er brachte. */
  readonly patronNote: string | undefined;
  /** Das Ziel dessen, der in der Kampfsimulation am Zug ist (Id eines SC oder NSC). */
  readonly simTarget: string | undefined;
  /** Feuerstoß oder Einzelschuss dessen, der in der Kampfsimulation am Zug ist; fehlt: vorgewählt. */
  readonly simBurst: boolean | undefined;
  /** Der SC am Zug schwächt seinen Schlag freiwillig; gilt nur für diesen Zug. */
  readonly simWeakened: boolean | undefined;
  /** Die Übersicht einer eben gewürfelten Begegnung steht im Vordergrund. */
  readonly encounterIntro: boolean;
  /** Der Wurf auf die Überraschung steht im Vordergrund. */
  readonly surpriseShown: boolean;
  /** Der Charakter, dessen Details im Charakter-Screen aufgeklappt sind. */
  readonly opened: string | undefined;
  /** Die Leiste mit dem Charakter oben ist eingeklappt; das Gerät merkt es sich. */
  readonly stripCollapsed: boolean;
  /** Der Hinweis über den Waffen im Shop ist weggeklickt; das Gerät merkt es sich. */
  readonly shopHintHidden: boolean;
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
  const upp = woundedUpp(character.upp, woundsOf(campaign, character.id));
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
function attackParts(
  attacker: Fighter,
  weaponId: string,
  armor: ArmorClass,
  range: Range,
  burst = true,
  neighbour = false,
  extras: { readonly weakened: number; readonly parry: number; readonly evade?: number } = { weakened: 0, parry: 0 },
): DmPart[] {
  const weapon = weaponOf(weaponId);
  const row = rowOf(weapon, burst);
  const characteristic = attackCharacteristic(weapon);
  const value = valueOf(attacker.fighting, characteristic);
  return [
    { kind: 'skill', name: skillOf(weapon.uses).name, level: attacker.skill, dm: attacker.skill },
    { kind: 'armor', armor, dm: armorDm(row, armor) },
    { kind: 'range', range, dm: rangeDm(row, range) ?? 0 },
    { kind: 'characteristic', characteristic, value, dm: characteristicAttackDm(weapon, value) },
    ...(neighbour && burst ? [{ kind: 'neighbour' as const, dm: BURST_NEIGHBOUR_DM }] : []),
    ...(extras.weakened !== 0 ? [{ kind: 'weakened' as const, dm: extras.weakened }] : []),
    ...(extras.parry !== 0 ? [{ kind: 'parry' as const, dm: extras.parry }] : []),
    ...(extras.evade ? [{ kind: 'evade' as const, dm: extras.evade }] : []),
  ];
}

/** Feuerstoß, Schrot oder Einzelschuss einer Waffe; `undefined` für Waffen ohne beides. */
function fireView(weapon: Weapon, burst: boolean): FireView | undefined {
  if (weapon.burst === undefined && weapon.neighbours === undefined) return undefined;
  return {
    burst,
    choosable: canChooseFire(weapon),
    rounds: roundsFor(weapon, burst),
    rolls: burst ? BURST_ROLLS : 1,
    neighbours: neighboursOf(weapon, burst),
    neighbourDm: burst ? BURST_NEIGHBOUR_DM : 0,
    pick: burst ? 'list' : 'random',
    single: weapon.single === undefined ? undefined : weaponOf(weapon.single).name,
  };
}

/** War der Angriff an der Stelle `index` Teil eines Feuerstoßes? Ein Feuerstoß hat immer mehr als einen Wurf. */
function wasBurst(log: readonly LogEntry[], index: number): boolean {
  const entry = log[index] as AttackResult;
  return weaponOf(entry.with).burst !== undefined && volleyOf(log, index).length > 1;
}

function nameOf(campaign: Campaign, who: CharacterId): string {
  return anyCharacterOf(campaign, who).name;
}

function attackItem(campaign: Campaign, entry: AttackResult, index: number): AttackItem {
  const attacker = fighterOf(campaign, entry.for);
  const victim = victimOf(entry);
  const success = isSuccess(entry);
  const log = campaign.log;
  const burst = wasBurst(log, index);
  const neighbour = isNeighbour(log, index);
  const group = volleyOf(log, index);
  const first = entry.volley === undefined;
  const rest = first ? group.slice(1).map((i) => attackItem(campaign, log[i] as AttackResult, i)) : [];
  const pendingIn = (i: number) => isSuccess(log[i] as AttackResult) && damageRollsOf(log, i).length === 0;
  return {
    volley: entry.volley,
    neighbour,
    fire: first && group.length > 1 ? (burst ? 'burst' : 'shotgun') : undefined,
    rest,
    volleyPending: first && group.some(pendingIn),
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
    parts: loggedParts(campaign, entry, attacker, burst || weaponOf(entry.with).single === undefined, neighbour),
    strike: entry.strike,
    wounds: weaponOf(entry.with).wounds,
    damagePending: success && damageRollsOf(campaign.log, index).length === 0,
  };
}

/**
 * Woraus der DM eines Angriffs im Log besteht. Das Ausweichen hält der Log nicht einzeln fest: Bleibt
 * zwischen dem gespeicherten DM und den übrigen Posten genau der DM des Ausweichens auf diese
 * Reichweite, steht er als eigener Posten da.
 */
function loggedParts(campaign: Campaign, entry: AttackResult, attacker: Fighter, burst: boolean, neighbour: boolean): DmPart[] {
  const extras = { weakened: strikeDm(weaponOf(entry.with), entry.strike), parry: neighbour ? 0 : parryDm(campaign, victimOf(entry), weaponOf(entry.with)) };
  const parts = attackParts(attacker, entry.with, entry.armor, entry.range, burst, neighbour, extras);
  const rest = entry.dm - parts.reduce((total, p) => total + p.dm, 0);
  return !neighbour && rest !== 0 && rest === evadeDmAt(entry.range) ? [...parts, { kind: 'evade', dm: rest }] : parts;
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
    blocks: entry.to === undefined ? undefined : blocksOf(entry),
    damage: damageOf(entry),
  };
}

/** Der anstehende Schaden: Waffe, Würfel, Ziel und wie viele Treffer der Garbe noch ohne Schaden sind (mit diesem). */
function damageView(campaign: Campaign, index: number, hit: AttackResult): NonNullable<CombatView['damage']> {
  const victim = victimOf(hit);
  const left = volleyOf(campaign.log, index).filter((i) => isSuccess(campaign.log[i] as AttackResult) && damageRollsOf(campaign.log, i).length === 0).length;
  return { index, weapon: weaponName(hit.with), wounds: weaponOf(hit.with).wounds, victim: victim && nameOf(campaign, victim), left };
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

function combatView(campaign: Campaign, attack: Attack | undefined, wounding: Wounding | undefined, note: string | undefined, simTarget: string | undefined, intro: boolean, simBurst: boolean | undefined, simWeakened: boolean | undefined, surpriseShown = false): CombatView | undefined {
  const character = focusOf(campaign);
  if (!character) return undefined;
  const current = attack ?? {};
  const attacker = attackerOf(current, campaign);
  const defender = defenderOf(current, campaign);
  const weapon = attacker.weapon;
  const burst = firesBurst(weapon, current);
  const row = rowOf(weapon, burst);
  const characteristic = attackCharacteristic(weapon);
  const value = valueOf(attacker.fighting, characteristic);
  const [skill, , , counted] = attackParts(attacker, weapon.id, 'nothing', 'close', burst);
  const table = attackTable(campaign, current);
  const target = attack ? evaluateAttack(attack, campaign) : undefined;
  const pending = pendingDamage(campaign.log);
  const pendingHit = pending === undefined ? undefined : (campaign.log[pending] as AttackResult);
  const encounter = currentEncounter(campaign);
  const pc = fighterOf(campaign, character.id);
  const ammo = ammoOf(character);
  return {
    character: character.name,
    attacker: attacker.name,
    defender: defender && { name: defender.name, armor: defender.armor },
    weapons: armedWeaponsOf(character).map((id) => weaponLabel(character, id)),
    state: pc.state,
    current: pc.upp,
    healing: recoveryOptions(campaign, character.id),
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
    ranges: ranges.map((range) => ({ range, dm: rangeDm(row, range) })),
    rows: armorClasses.map((armor, i) => ({
      armor,
      dm: armorDm(row, armor),
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
        ? { armor: attack.armor, range: attack.range, dm: target.dm.total, need: target.need, chance: target.chance, parts: attackParts(attacker, weapon.id, attack.armor, attack.range, burst, false, target.dm) }
        : undefined,
    canAttack: canFight(attacker.state) && defender?.state !== 'dead' && !(ammo !== undefined && ammo.rounds < roundsFor(weapon, burst)),
    fire: fireView(weapon, burst),
    damage: pendingHit && pending !== undefined ? damageView(campaign, pending, pendingHit) : undefined,
    ammo: ammo ? { rounds: ammo.rounds, capacity: ammo.capacity, magazine: itemLabel(itemOf(ammo.ammo)), magazines: ammo.magazines } : undefined,
    sim: encounter && simView(campaign, encounter, simTarget, simBurst, simWeakened),
    terrains: ref.encounters.terrains,
    canEncounter: campaign.location !== undefined,
    location: campaign.location,
    worlds: worldChoices(campaign.hexes),
    intro: intro && encounter !== undefined,
    surpriseShown: surpriseShown && encounter !== undefined && !needsSurprise(encounter),
    quantityDie: quantityDieOf(campaign),
    encounterTypes: ref.encounters.types.map((t) => ({ roll: t.roll, name: t.name, quantity: t.quantity })),
    wounding: wounding && woundingView(campaign, wounding),
    note,
  };
}

function fighterView(campaign: Campaign, slot: FightSlot, encounter: Encounter, turn: FightSlot | undefined, target: string | undefined, neighbours: readonly string[]): FighterView {
  const fighter = fighterOf(campaign, slot.id);
  const character = anyCharacterOf(campaign, slot.id);
  const wears = character.wears;
  return {
    id: slot.id,
    side: slot.side,
    name: fighter.name,
    leader: encounter.leader === slot.id,
    weapon: weaponName(fighter.weapon.id),
    skill: `${skillOf(fighter.weapon.uses).name}-${fighter.skill}`,
    armor: wears === undefined ? undefined : itemLabel(itemOf(wears)),
    armorClass: fighter.armor,
    upp: character.upp,
    current: fighter.upp,
    state: fighter.state,
    acted: encounter.acted.includes(slot.id),
    turn: turn?.id === slot.id,
    targetable: turn !== undefined && turn.side !== slot.side && fighter.state !== 'dead' && !isEscaped(campaign, slot.id),
    targeted: target === slot.id,
    neighbour: neighbours.includes(slot.id),
    healing: recoveryOptions(campaign, slot.id),
    blows: isMelee(fighter.weapon) ? blowsOf(campaign, slot.id) : undefined,
    evading: isEvading(campaign, slot.id),
    escaped: isEscaped(campaign, slot.id),
  };
}

function simView(campaign: Campaign, running: Encounter, target: string | undefined, simBurst: boolean | undefined, simWeakened: boolean | undefined): SimView {
  const turn = turnOf(campaign);
  const encounter = fightState(campaign, running);
  const order = fightOrder(campaign, encounter);
  const ground = encounter.terrain === undefined ? undefined : ref.encounters.terrains.find((t) => t.id === encounter.terrain);
  const pcs = order.filter((s) => s.side === 'pcs');
  const validTarget = turn !== undefined && target !== undefined && order.some((s) => s.id === target && s.side !== turn.side);
  const focus = turn?.side === 'pcs' ? turn.id : validTarget ? target : pcs[0]?.id;
  const focusDistance = focus === undefined ? { band: encounter.startBand, close: encounter.startClose } : distanceOf(encounter, focus);
  const range = rangeOfBand(focusDistance.band, focusDistance.close);
  let turnView: SimView['turn'];
  let weapon: Weapon | undefined;
  if (turn) {
    const attacker = fighterOf(campaign, turn.id);
    weapon = attacker.weapon;
    const burst = firesBurst(attacker.weapon, simBurst === undefined ? {} : { burst: simBurst });
    let odds: NonNullable<SimView['turn']>['odds'];
    let strike: Strike | undefined;
    const valid = validTarget;
    if (valid) {
      try {
        const attack = { ...turnAttack(campaign, target), burst, ...(simWeakened ? { weakened: true } : {}) };
        const evaluated = evaluateAttack(attack, campaign);
        if (evaluated && attack.armor !== undefined && attack.range !== undefined) {
          odds = { dm: evaluated.dm.total, need: evaluated.need, chance: evaluated.chance, parts: attackParts(attacker, attacker.weapon.id, attack.armor, attack.range, burst, false, evaluated.dm) };
        }
        strike = attackExtras(attack, campaign).strike;
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
      }
    }
    const ammo = ammoOf(anyCharacterOf(campaign, turn.id));
    const options = turnAttacks(campaign, turn, valid ? target : undefined, simBurst, simWeakened);
    turnView = {
      id: turn.id,
      side: turn.side,
      name: attacker.name,
      weapon: weaponName(attacker.weapon.id),
      target: valid ? target : undefined,
      odds,
      reaches: range !== undefined && rangeDm(rowOf(attacker.weapon, burst), range) !== undefined,
      ammo: ammo && { rounds: ammo.rounds, capacity: ammo.capacity, magazines: ammo.magazines },
      fire: fireView(attacker.weapon, burst),
      ran: hasRun(campaign, turn),
      melee: isMelee(attacker.weapon)
        ? {
            strike,
            blows: blowsOf(campaign, turn.id),
            end: attacker.fighting.end,
            weakenedDm: attacker.weapon.weakened ?? 0,
            weakened: simWeakened === true,
            canWeaken: turn.side === 'pcs' && (strike === 'combat' || (strike === 'weakened' && simWeakened === true)),
          }
        : options.melee,
      attacks: options.attacks,
    };
  }
  return {
    name: encounterTypeOfEncounter(encounter).name,
    reaction: encounter.reaction,
    reactionText: reactionText(encounter.reaction),
    reactionDice: encounter.reactionDice,
    reactionDm: reactionDm(campaign, encounter),
    roll: encounter.of,
    quantity: encounterTypeOfEncounter(encounter).quantity,
    quantityDie: encounter.quantityDie ?? 6,
    round: encounter.round,
    focus,
    range,
    band: focusDistance.band,
    close: focusDistance.close,
    escaped: focusDistance.band >= ESCAPED_BAND,
    start: { band: encounter.startBand, close: encounter.startClose, range: rangeOfBand(encounter.startBand, encounter.startClose) },
    positions: pcs.map((s) => {
      const d = distanceOf(encounter, s.id);
      const name = anyCharacterOf(campaign, s.id).name;
      return { id: s.id, name, initial: name.trim().charAt(0).toUpperCase(), band: d.band, close: d.close, escaped: d.band >= ESCAPED_BAND, focus: s.id === focus };
    }),
    rangeDice: encounter.rangeDice,
    bandDie: bandDieView(encounter),
    terrain: ground && { name: ground.name, dm: ground.dm },
    surprise: surpriseOf(encounter),
    needsSurprise: needsSurprise(encounter),
    surpriseParts: surpriseParts(campaign, encounter),
    surprising: surprisingOf(encounter),
    alarm: encounter.alarm,
    first: firstSide(encounter),
    pcSurprise: encounter.pcSurprise,
    npcSurprise: encounter.npcSurprise,
    fighters: order.map((slot) => fighterView(campaign, slot, encounter, turn, turnView?.target, previewNeighbours(campaign, order, turn, turnView?.target, simBurst))),
    turn: turnView,
    defeated: defeatedSide(campaign, encounter),
    move: moveState(campaign),
    impacts: impactsOf(campaign),
    arrows: arrowsOf(campaign, running),
    bands: ref.encounters.bands.map((b) => ({ range: b.range, from: b.from, to: b.to, reaches: weapon === undefined || rangeDm(weapon, b.range) !== undefined })),
  };
}

/** Der SC bzw. NSC mit dieser Waffe in der Hand, nur für die Berechnung; gespeichert wird nichts. */
function wielding(campaign: Campaign, id: string, weapon: string): Campaign {
  const rest = Object.fromEntries(Object.entries(anyCharacterOf(campaign, id)).filter(([key]) => key !== 'wields')) as Omit<Character, 'wields'>;
  return replaceCharacter(campaign, weapon === HANDS ? (rest as Character) : { ...rest, wields: weapon });
}

/** Die Waffen, mit denen der Kämpfer am Zug (SC oder NSC) angreifen kann: Primär und Sekundär, ohne zweite Waffe die Hände. */
function slotsOf(character: Character): readonly { readonly weapon: string; readonly slot: AttackOption['slot'] }[] {
  const armed = armedWeaponsOf(character).filter((w) => w !== HANDS).slice(0, 2);
  const weapons = armed.length < 2 ? [...armed, HANDS] : armed;
  return weapons.map((weapon) => ({ weapon, slot: weapon === HANDS ? 'hands' : weapon === character.primary ? 'primary' : 'secondary' }));
}

/** Je Waffe des Kämpfers am Zug ein Angriff auf das Ziel, und die Ausdauer, wenn eine davon schlägt oder haut. */
function turnAttacks(campaign: Campaign, turn: FightSlot, target: string | undefined, simBurst: boolean | undefined, simWeakened: boolean | undefined): { attacks: readonly AttackOption[]; melee: MeleeView | undefined } {
  const running = currentEncounter(campaign);
  const encounter = running && fightState(campaign, running);
  // Die Reichweite gilt zwischen dem SC und dem NSC: am SC-Zug seine, am NSC-Zug die des Ziels.
  const pc = turn.side === 'pcs' ? turn.id : target;
  const range = encounter && pc !== undefined ? rangeOfDistance(distanceOf(encounter, pc)) : undefined;
  const character = anyCharacterOf(campaign, turn.id);
  let melee: MeleeView | undefined;
  const attacks = slotsOf(character).map(({ weapon, slot }) => {
    const temp = wielding(campaign, character.id, weapon);
    const attacker = fighterOf(temp, turn.id);
    const burst = firesBurst(attacker.weapon, simBurst === undefined ? {} : { burst: simBurst });
    let odds: AttackOption['odds'];
    let strike: Strike | undefined;
    if (target !== undefined) {
      try {
        const attack = { ...turnAttack(temp, target), burst, ...(simWeakened ? { weakened: true } : {}) };
        const evaluated = evaluateAttack(attack, temp);
        if (evaluated) odds = { need: evaluated.need, chance: evaluated.chance };
        strike = attackExtras(attack, temp).strike;
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
      }
    }
    if (isMelee(attacker.weapon) && !melee) {
      melee = {
        strike,
        blows: blowsOf(temp, turn.id),
        end: attacker.fighting.end,
        weakenedDm: attacker.weapon.weakened ?? 0,
        weakened: simWeakened === true,
        canWeaken: turn.side === 'pcs' && (strike === 'combat' || (strike === 'weakened' && simWeakened === true)),
      };
    }
    const ammo = ammoOf(anyCharacterOf(temp, character.id));
    return {
      slot,
      weapon,
      name: weaponName(weapon),
      odds,
      reaches: range !== undefined && rangeDm(rowOf(attacker.weapon, burst), range) !== undefined,
      ammo: ammo && { rounds: ammo.rounds, capacity: ammo.capacity, magazines: ammo.magazines },
      empty: ammo !== undefined && ammo.rounds < roundsFor(attacker.weapon, burst),
      wielded: (character.wields ?? HANDS) === weapon,
      fire: fireView(attacker.weapon, burst),
      melee: isMelee(attacker.weapon),
    };
  });
  return { attacks, melee };
}

/** Die Pfeile des letzten Angriffs der laufenden Begegnung: von wem zu wem, je Wurf der Garbe. */
function arrowsOf(campaign: Campaign, encounter: Encounter): readonly AttackArrow[] {
  const log = campaign.log;
  const start = encounterStart(log, encounter);
  let last = -1;
  for (let i = log.length - 1; i >= start; i--) {
    if (log[i]!.kind === 'attack') {
      last = i;
      break;
    }
  }
  if (last < 0) return [];
  return volleyOf(log, last).flatMap((i) => {
    const roll = log[i] as AttackResult;
    const to = victimOf(roll);
    return to ? [{ from: roll.for, to, hit: isSuccess(roll), key: `a${i}` }] : [];
  });
}

/** Wen ein Feuerstoß auf das gewählte Ziel als Nachbarn mit träfe; die Schrotflinte lost erst beim Würfeln, also keinen. */
function previewNeighbours(campaign: Campaign, order: readonly FightSlot[], turn: FightSlot | undefined, target: string | undefined, simBurst: boolean | undefined): readonly string[] {
  const slot = target === undefined ? undefined : order.find((s) => s.id === target);
  if (!turn || !slot) return [];
  const weapon = fighterOf(campaign, turn.id).weapon;
  const burst = firesBurst(weapon, simBurst === undefined ? {} : { burst: simBurst });
  if (!burst) return [];
  return neighbourTargets(campaign, slot.id, weapon, true, { int: (min) => min });
}

/** Was der neueste Eintrag im Log angerichtet hat: Schaden an einem Kämpfer, oder Treffer und Fehlschüsse der neuesten Garbe. */
function impactsOf(campaign: Campaign): readonly Impact[] {
  const last = campaign.log.length - 1;
  const entry = campaign.log[last];
  if (entry?.kind === 'damage') {
    const who = victimOf(campaign.log[entry.of] as AttackResult);
    if (!who || entry.to === undefined) return [];
    const upp = uppOf(campaign, who);
    const before = historyOf(campaign.log, upp, who, last).wounds;
    const after = historyOf(campaign.log, upp, who, last + 1).wounds;
    const lost = { str: after.str - before.str, dex: after.dex - before.dex, end: after.end - before.end };
    return [{ id: who, kind: 'damage', damage: damageOf(entry), lost, key: `d${last}` }];
  }
  if (entry?.kind !== 'attack') return [];
  return volleyOf(campaign.log, last).flatMap((i) => {
    const roll = campaign.log[i] as AttackResult;
    const who = victimOf(roll);
    return who ? [{ id: who, kind: isSuccess(roll) ? ('hit' as const) : ('miss' as const), damage: undefined, lost: undefined, key: `a${i}` }] : [];
  });
}

/** Der Würfel des Startbands mit seinen Seiten: so viele Bands hat die gewürfelte Reichweite. */
function bandDieView(encounter: Encounter): SimView['bandDie'] {
  if (encounter.bandDie === undefined || encounter.rangeDice === undefined) return undefined;
  const ground = encounter.terrain === undefined ? undefined : ref.encounters.terrains.find((t) => t.id === encounter.terrain);
  const rolled = ref.encounters.bands.find((b) => b.range === encounterRange(encounter.rangeDice!, ground?.dm ?? 0))!;
  return { die: encounter.bandDie, sides: rolled.to - rolled.from + 1 };
}

/** Teilt die Blöcke auf die Würfel auf, der Reihe nach: Die Blöcke eines Würfels ergeben ihn (oder weniger, wenn sie ausgehen). */
function blocksPerDie(dice: readonly number[], blocks: readonly WoundBlock[]): readonly (readonly WoundBlock[])[] {
  let at = 0;
  return dice.map((d) => {
    const own: WoundBlock[] = [];
    let rest = d;
    while (rest > 0 && at < blocks.length) {
      own.push(blocks[at]!);
      rest -= blocks[at]!.points;
      at++;
    }
    return own;
  });
}

function woundingView(campaign: Campaign, wounding: Wounding): WoundingView {
  const hit = campaign.log[wounding.of] as AttackResult;
  const victim = victimOf(hit)!;
  const upp = uppOf(campaign, victim);
  const before = woundsOf(campaign, victim);
  const state = woundingState(wounding, campaign);
  return {
    victim: nameOf(campaign, victim),
    weapon: weaponName(hit.with),
    dice: wounding.dice,
    blocks: blocksPerDie(wounding.dice, state.blocks),
    next: state.next,
    chosen: woundingState(unassignWound(wounding, campaign), campaign).blocks.length < state.blocks.length,
    current: woundedUpp(upp, before),
    full: upp,
  };
}

/** Das Angebot, eine eben gekaufte Rüstung anzulegen, solange er sie hat und nicht schon trägt. */
function wearOfferView(campaign: Campaign, offer: ControllerState['wearOffer']): ShopView['wearOffer'] {
  const character = offer && campaign.characters.find((c) => c.id === offer.character);
  if (!offer || !character || character.wears === offer.item || !character.possessions.some((p) => p.of === offer.item)) return undefined;
  return { character: character.name, item: itemLabel(itemOf(offer.item)), worn: character.wears === undefined ? undefined : itemLabel(itemOf(character.wears)) };
}

function shopView(campaign: Campaign, error: string | undefined, offerToWear: ControllerState['wearOffer']): ShopView {
  const funds = fundsOf(campaign);
  const world = locationOf(campaign);
  const offer = world ? offerOf(world) : [];
  const kinds = itemKinds.filter((kind) => offer.some((o) => o.item.kind === kind));
  const name = (id: string | undefined) => (id === undefined ? undefined : campaign.characters.find((c) => c.id === id)?.name);
  const owner = focusOf(campaign);
  const shopItem = (o: (typeof offer)[number]): ShopItem => ({
    id: o.item.id,
    label: itemLabel(o.item),
    kind: o.item.kind,
    tl: o.item.tl,
    price: o.price,
    banned: o.banned,
    once: o.item.once,
    affordable: o.price <= funds,
    owned: owner?.possessions.find((p) => p.of === o.item.id)?.count ?? 0,
    worn: owner !== undefined && owner.wears === o.item.id,
  });
  const weapons = offer.flatMap((o): ShopWeapon[] => {
    if (o.item.weapon === undefined) return [];
    const weapon = weaponOf(o.item.weapon);
    const magazine = weapon.ammo === undefined ? undefined : offer.find((a) => a.item.id === weapon.ammo);
    const level = owner && weaponSkill(owner, weapon)?.level;
    const characteristic = attackCharacteristic(weapon);
    const dm = owner ? characteristicAttackDm(weapon, owner.upp[characteristic.toLowerCase() as keyof Upp]) : 0;
    return [
      {
        item: shopItem(o),
        attack: weapon.attack,
        wounds: weapon.wounds,
        ammo: magazine && weapon.rounds !== undefined ? { ...shopItem(magazine), rounds: weapon.rounds } : undefined,
        skill: level === undefined ? undefined : `${skillOf(weapon.uses).name}-${level}`,
        characteristic: dm === 0 ? undefined : `${characteristic} ${dm > 0 ? '+' : '−'}${Math.abs(dm)}`,
      },
    ];
  });
  const gearKinds: readonly ItemKind[] = ['equipment', 'vehicle', 'passage'];
  return {
    funds,
    world: world && { id: hexId(world.column, world.row), name: world.name, uwp: uwpCode(world.uwp), tech: ehex(world.uwp.tech ?? 0), law: ehex(world.uwp.law ?? 0) },
    offer: kinds.map((kind) => ({ kind, items: offer.filter((o) => o.item.kind === kind).map(shopItem) })),
    owner: owner?.id,
    weapons,
    armor: offer.filter((o) => o.item.kind === 'armor').map(shopItem),
    gear: gearKinds.flatMap((kind) => {
      const items = offer.filter((o) => o.item.kind === kind).map(shopItem);
      return items.length ? [{ kind, items }] : [];
    }),
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
        if (price === undefined) return [];
        const role =
          c.wears === item.id
            ? 'getragen'
            : item.weapon !== undefined && wieldedWeapon(c).id === item.weapon
              ? 'in der Hand'
              : item.weapon !== undefined && c.primary === item.weapon
                ? 'Primärwaffe'
                : item.weapon !== undefined && c.secondary === item.weapon
                  ? 'Sekundärwaffe'
                  : undefined;
        return [{ id: item.id, label: itemLabel(item), kind: item.kind, count: p.count, price, role }];
      }),
    })),
    error,
    wearOffer: wearOfferView(campaign, offerToWear),
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
      return { kind: 'recovery', at: entry.at, how: entry.how, patient: nameOf(campaign, entry.for), healer: entry.by === undefined ? undefined : characterOf(campaign, entry.by).name, days: daysOf(entry) };
    }
    case 'patron': {
      const patron = patronOfRoll(entry);
      return { kind: 'patron', at: entry.at, list: entry.list, dice: entry.dice, dms: entry.dms, roll: patronRollOf(entry), name: patron.name, rumor: patron.rumor };
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
    state: woundStateOf(campaign, character.id),
    current: woundedUpp(character.upp, woundsOf(campaign, character.id)),
    armor: character.wears === undefined ? undefined : itemLabel(itemOf(character.wears)),
    weapons: armedWeaponsOf(character).map((id) => weaponLabel(character, id)),
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
  const base = { persistent: state.persistent, durable: state.durable, storageError: state.storageError, screen: state.screen, stripCollapsed: state.stripCollapsed, shopHintHidden: state.shopHintHidden, skills, items };
  if (!campaign) {
    return { ...base, ready: false, campaign: { id: '', name: '' }, campaigns: [], campaignSheet: undefined, odds: [], log: [], card: undefined, names: undefined, characters: [], focus: undefined, dead: [], npcs: [], retired: [], task: undefined, combat: undefined, patron: undefined, shop: undefined, location: undefined, result: undefined, editor: undefined, generation: undefined, generationRunning: false, sector: [], worlds: [], world: undefined, selected: undefined, picking: undefined };
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
    combat: combatView(campaign, state.attack, state.wounding, state.combatNote, state.simTarget, state.encounterIntro, state.simBurst, state.simWeakened, state.surpriseShown),
    patron: {
      lists: patronLists.map((list) => ({ list, parts: patronDmParts(campaign, list) })),
      last: log.findLast((item): item is PatronItem => item.kind === 'patron'),
      note: state.patronNote,
    },
    shop: shopView(campaign, state.shopError, state.wearOffer),
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
