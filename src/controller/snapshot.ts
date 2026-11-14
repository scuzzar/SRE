import {
  deadNpcs,
  hexById,
  npcGroups,
  npcRoles,
  patronNpcBlocker,
  roleOf,
  type NpcRole,
  type PatronRoll,
  dateLabel,
  journeyBlocker,
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
  rumorOfRoll,
  rumorRollOf,
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
  type Possession,
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
  encounterNameOf,
  gamePricePerKg,
  possessionKey,
  itemAt,
  fits,
  isPc,
  loadOf,
  capacityOf,
  burdenOf,
  type EquipSlot,
  cannotButcher,
  cannotLoot,
  butchers,
  butcheringResult,
  lootValueOf,
  gameSaleTotal,
  FUR,
  MEAT,
  FUR_RATE,
  MEAT_RATE,
  type Butchering,
  isDead,
  damageVictim,
  eventOf,
  eventEntryAt,
  savesOf,
  savesUnder,
  saveSucceeds,
  type SaveRoll,
  isHeld,
  struggleNeed,
  fixedDamageOf,
  animalRowOf,
  hurtOf,
  hasAnimals,
  animalTableOf,
  animalName,
  animalEventOf,
  eventRowOf,
  encounterQuantityOf,
  encounterAnimalRow,
  isAnimalEncounter,
  behaviorOf,
  animalTypeOf,
  terrainOf,
  LURE_TARGET,
  type BehaviorView,
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
  choicesOf,
  localOf,
  type Conflict,
  type ConflictChoice,
} from '../model/draft';
import { careerLines, generationView, itemLabel, worldChoices, worldName, type CareerLine, type GenerationView, type WorldChoice } from './generation-view';
import { sectorView, selectedView, worldList, worldView, type HexView, type SelectedHexView, type WorldListItem, type WorldView } from './world-view';
import { checkItem, checksView, journeyItem, journeyView, legalView, timeItem, timeView, type CheckItem, type ChecksView, type JourneyDraft, type JourneyItem, type JourneyView, type LegalView, type TimeItem, type TimeView } from './time-view';

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
  /** Der Abgleich mit OneDrive: ob er eingerichtet ist, wer angemeldet ist, wie er steht. */
  readonly sync: SyncView;
  /** Kampagnen, die hier und in OneDrive geändert wurden; der Spieler wählt je eine Seite. */
  readonly conflicts: readonly ConflictView[];
  /** Ob der Spielstand das Schließen der App übersteht. */
  readonly persistent: boolean;
  /** Ob der Browser zusagt, den Spielstand nicht zu löschen; `undefined`, solange er nicht geantwortet hat oder das nicht kennt. */
  readonly durable: boolean | undefined;
  readonly storageError: string | undefined;
  readonly screen: Screen;
  readonly odds: readonly OddsChoice[];
  /** In der Reihenfolge der Ereignisse; dass das Neueste unten steht, ist Sache der Anzeige. */
  readonly log: readonly LogItem[];
  /** Je Logeintrag das Datum seines Spieltags („Montag, 002-1105“); fehlt bei Einträgen von vor der Spielzeit. */
  readonly logDays: readonly (string | undefined)[];
  /** Die Spielzeit oben im Reiter Begegnung; fehlt nur ohne Kampagne. */
  readonly time: TimeView | undefined;
  /** Je Test, wie oft er in seinem Zeitraum schon gewürfelt ist. */
  readonly checks: ChecksView | undefined;
  /** Die Begegnungsart Polizei. */
  readonly legal: LegalView | undefined;
  /** Der Dialog der Reise, solange er offen ist. */
  readonly journey: JourneyView | undefined;
  /** Auf der offenen Weltkarte: warum die Gruppe nicht hierher reisen kann; `undefined`, wenn sie kann. Fehlt ohne Weltkarte. */
  readonly travel: { readonly blocker: string | undefined } | undefined;
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
  /** Der Reiter NSC: die dauerhaften NSC, nach Welt und Rolle gruppiert. */
  readonly npcs: NpcScreenView;
  /** Die Toten unter „Verstorben“, getrennt von den Lebenden. */
  readonly dead: readonly { readonly id: string; readonly name: string; readonly background: string }[];
  readonly retired: readonly { readonly id: string; readonly name: string }[];
  readonly task: TaskView | undefined;
  /** Der Reiter Kampf für den Charakter oben; fehlt, wenn es keinen Lebenden gibt. */
  readonly combat: CombatView | undefined;
  /** Der Bereich Patron im Reiter Begegnung; fehlt nur ohne Kampagne. */
  readonly patron: PatronView | undefined;
  /** Die Begegnungsart Gerücht im Reiter Begegnung; fehlt nur ohne Kampagne. */
  readonly rumor: RumorView | undefined;
  /** Der Reiter Shop: Kasse und Angebot auf dem Aufenthaltsort. */
  readonly shop: ShopView | undefined;
  readonly stash: StashView;
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


/** Ob es auf dem Aufenthaltsort im Gelände Tiere geben kann; dann gehören die Tiere zu den täglichen Tests. */
function animalsPossible(campaign: Campaign): boolean {
  const terrain = campaign.terrain === undefined ? undefined : terrainOf(campaign.terrain);
  return locationOf(campaign) !== undefined && terrain !== undefined && hasAnimals(terrain);
}

/** Warum die Gruppe nicht dorthin reisen kann; ohne Aufenthaltsort oder auf dem Aufenthaltsort selbst kein Hinweis. */
function travelBlocker(campaign: Campaign, to: string): string | undefined {
  try {
    return journeyBlocker(campaign, to);
  } catch (error) {
    if (error instanceof DomainError) return error.message;
    throw error;
  }
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

export type Screen = 'oracle' | 'encounter' | 'combat' | 'shop' | 'characters' | 'npcs' | 'sector' | 'about';

/** Ein dauerhafter NSC im Reiter NSC. */
export interface NpcItem {
  readonly id: string;
  readonly name: string;
  readonly background: string;
  readonly role: NpcRole;
}

/** Der Reiter NSC (siehe domain-model.md, *Reiter NSC*). */
export interface NpcScreenView {
  /** „Alle zeigen“ ist an; beim Öffnen des Reiters ist es aus. */
  readonly all: boolean;
  /** Der Name des Aufenthaltsorts; fehlt er, zeigt der Reiter immer alle. */
  readonly here: string | undefined;
  /** Je Welt (ohne Ort: `name` fehlt) die NSC nach Rolle; ohne „Alle zeigen“ nur eine Gruppe. */
  readonly worlds: readonly { readonly key: string; readonly name: string | undefined; readonly roles: readonly { readonly role: NpcRole; readonly npcs: readonly NpcItem[] }[] }[];
  readonly dead: readonly NpcItem[];
  /** Wie viele lebende NSC es insgesamt gibt, auch auf anderen Welten. */
  readonly total: number;
}

export interface CampaignChoice {
  readonly id: string;
  readonly name: string;
  readonly open: boolean;
  readonly characters: number;
  readonly entries: number;
}

/**
 * Wie der Abgleich steht: `off` nicht eingerichtet (die App hat keine Wolke), `signedOut` nicht
 * angemeldet, `syncing` läuft, `synced` fertig, `offline` kein Netz, `expired` die Anmeldung ist
 * abgelaufen, `error` etwas anderes ging schief (`error` sagt was).
 */
export type SyncStatus = 'off' | 'signedOut' | 'syncing' | 'synced' | 'offline' | 'expired' | 'error';

export interface SyncView {
  readonly status: SyncStatus;
  readonly account: string | undefined;
  /** Wann zuletzt abgeglichen wurde. */
  readonly at: string | undefined;
  readonly error: string | undefined;
}

/** Ein Stand im Konflikt: wann zuletzt geändert, wie viele Logeinträge. */
export interface StandView {
  readonly changedAt: string;
  readonly entries: number;
}

export interface ConflictView {
  readonly key: string;
  readonly name: string;
  /** Fehlt, wenn die Kampagne hier gelöscht ist. */
  readonly local: StandView | undefined;
  /** Fehlt, wenn die Kampagne in OneDrive gelöscht ist. */
  readonly remote: StandView | undefined;
  readonly choices: readonly ConflictChoice[];
}

function conflictView(conflict: Conflict, campaigns: readonly Campaign[]): ConflictView {
  const local = localOf(conflict, campaigns);
  const stand = (c: Campaign | undefined): StandView | undefined => c && { changedAt: c.changedAt, entries: c.log.length };
  return { key: conflict.key, name: (local ?? conflict.remote)?.name ?? '', local: stand(local), remote: stand(conflict.remote), choices: choicesOf(conflict, campaigns) };
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

export type LogItem = OracleItem | DiceItem | CardItem | TaskItem | AttackItem | DamageItem | RecoveryItem | PatronItem | RumorItem | EventItem | SaveItem | ButcheringItem | CheckItem | TimeItem | JourneyItem | NoteItem;

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

/** Ein Gerüchte-Wurf: die Würfel, der Wurf 11–66 und das Gerücht der Rumor List. */
export interface RumorItem {
  readonly kind: 'rumor';
  readonly at: string;
  readonly dice: Dice;
  readonly roll: number;
  readonly letter: string;
  readonly text: string;
  /** Ein allgemeines Gerücht (U bis Z); sonst ein bestimmtes. */
  readonly general: boolean;
}

/** Die Begegnungsart Gerücht im Reiter Begegnung: der letzte Gerüchte-Wurf im Log und der Test des letzten Wurfs. */
export interface RumorView {
  readonly last: RumorItem | undefined;
  readonly note: string | undefined;
}

/** Der Bereich Patron im Reiter Begegnung: je Liste die DMs der lebenden SC, dazu der letzte Patron-Wurf im Log. */
export interface PatronView {
  readonly lists: readonly { readonly list: number; readonly parts: readonly { readonly die: 0 | 1; readonly label: string; readonly dm: number }[] }[];
  readonly last: PatronItem | undefined;
  /** Der Test des letzten Wurfs und was er brachte; fehlt, bis gewürfelt ist. */
  readonly note: string | undefined;
  /** Zum letzten Patron-Wurf einen NSC erzeugen: warum es nicht geht, oder `undefined`; fehlt ohne Patron-Wurf. */
  readonly npc: { readonly blocker: string | undefined } | undefined;
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
  | { readonly kind: 'evade'; readonly dm: number }
  /** Der DM eines Tierangriffs („claws +1“, SE 18). */
  | { readonly kind: 'natural'; readonly dm: number }
  /** Die Tierrüstung des Ziels („combat +4“): DM für den Angreifer (SE 18). */
  | { readonly kind: 'hide'; readonly dm: number };

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
  /** Der feste Schaden eines Tiers; dann gibt es keine Würfel. */
  readonly fixed: number | undefined;
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
  /** Ein Tier: seine Hits, der Schaden, den es genommen hat, und seine Geschwindigkeit; statt STR, DEX und END. */
  readonly animal: { readonly hits: readonly [number, number]; readonly hurt: number; readonly speed: number } | undefined;
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
  /** Festgehalten von Falle, Köder oder Filter. */
  readonly held: boolean;
  /** Bei einem NSC, der am Boden ist: „Beute“ (Person) oder „Ausweiden“ (Tier), und warum es nicht geht. */
  readonly loot: { readonly action: 'take' | 'butcher'; readonly blocked: string | undefined } | undefined;
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
/** Die Begegnungsart Tiere: ob man würfeln kann (und warum nicht), die Zeilen der Tiertabelle zum Wählen, der letzte Wurf. */
export interface AnimalsView {
  /** Warum man keine Tiere würfeln kann; fehlt, wenn es geht. */
  readonly blocked: string | undefined;
  /** Die Tierzeilen der Tiertabelle von Welt und Gelände, wenn es sie schon gibt; Ereignisse wählt man nicht. */
  readonly rows: readonly { readonly roll: number; readonly name: string; readonly quantity: number }[];
  readonly note: string | undefined;
  /** Der letzte Ereignis-Eintrag im Log. */
  readonly lastEvent: EventItem | undefined;
}

/** Ein Ereignis aus der Tiertabelle: Würfel, Name, Gruppe, Text und, wenn es einen gibt, der Rettungswurf mit Schaden. */
export interface EventItem {
  readonly kind: 'event';
  readonly at: string;
  readonly dice: Dice;
  readonly roll: number;
  readonly terrain: string;
  readonly name: string;
  readonly group: string;
  readonly text: string;
  readonly save: string | undefined;
  readonly damage: number | undefined;
  /** Die Stelle im Log und ob man die Rettungswürfe noch würfeln kann. */
  readonly index: number;
  readonly canSave: boolean;
}

/** Ein DM mit Grund in der Anzeige der Beute. */
export interface LootPart {
  readonly label: string;
  readonly dm: number;
}

/** Ein Ausweiden: Tier, essbar, Fleischwürfel mit DM, Fleisch und Fell in kg, die Werte mit allen DMs und was die Beute wert ist. */
export interface ButcheringItem {
  readonly kind: 'butchering';
  readonly at: string;
  readonly animal: string;
  readonly weight: number;
  readonly edible: boolean;
  readonly reason: string | undefined;
  readonly meatDie: number | undefined;
  readonly meatSkill: number;
  readonly furSkill: number;
  readonly meat: number;
  readonly fur: number;
  readonly furHalf: boolean;
  readonly hasFur: boolean;
  readonly market: number;
  readonly furParts: readonly LootPart[];
  readonly meatParts: readonly LootPart[];
  readonly furValue: number;
  readonly meatValue: number;
  readonly furPerKg: number;
  readonly meatPerKg: number;
  /** Listenpreis von Fleisch und Fell zusammen und der vorgeschlagene Erlös beim Verkauf. */
  readonly list: number;
  readonly sale: number;
}

/** Der Dialog „Beute nehmen“ bzw. „Ausweiden“: was es gibt, wer arbeitet, wer die Beute bekommen kann. */
export interface LootView {
  readonly id: string;
  readonly name: string;
  readonly animal: boolean;
  /** Bei einem NSC: seine Gegenstände mit Verkaufspreis und seine Kredite. */
  readonly items: readonly { readonly label: string; readonly count: number; readonly sale: number | undefined }[];
  readonly credits: number;
  /** Bei einem Tier: wer das Fleisch macht und wer das Fell abzieht, mit Fertigkeit und Stufe. */
  readonly meatWorker: string | undefined;
  readonly furWorker: string | undefined;
  readonly receivers: readonly { readonly id: string; readonly name: string }[];
  readonly blocked: string | undefined;
}

/** Ein Rettungswurf gegen ein Ereignis: wer, gegen welches, Würfel, Zielwert und Ergebnis. */
export interface SaveItem {
  readonly kind: 'save';
  readonly at: string;
  readonly name: string;
  readonly event: string;
  readonly dice: Dice;
  readonly target: number;
  /** Höchstens ein Attribut („DEX oder weniger“); sonst mindestens der Zielwert. */
  readonly under: boolean;
  readonly attribute: string | undefined;
  readonly success: boolean;
}

/** Die Werte der Tiere einer Tierbegegnung, ihr Verhalten und die Würfe dazu. */
export interface AnimalSimView {
  readonly weight: number;
  readonly hits: readonly [number, number];
  readonly armor: ArmorClass;
  readonly armorDm: number;
  readonly attacks: readonly { readonly name: string; readonly dm: number; readonly damage: number }[];
  readonly speed: number;
  readonly attack: { readonly dice: readonly [number, number]; readonly need: number | undefined; readonly word: string | undefined };
  readonly flee: { readonly dice: readonly [number, number]; readonly need: number | undefined; readonly word: string | undefined };
  readonly fleesFirst: boolean;
  readonly behavior: 'attacks' | 'flees' | 'nothing' | undefined;
  readonly special: 'filter' | 'trap' | 'lure' | undefined;
  /** Der Köder einer Siren: die Würfel und ob er auf Menschen wirkt. */
  readonly lure: { readonly dice: readonly [number, number]; readonly works: boolean } | undefined;
  readonly tableDice: readonly [number, number] | undefined;
  readonly terrain: string;
}

export interface SimView {
  readonly name: string;
  /** Die Reaktion; fehlt bei Tieren, dann steht ihr Verhalten in `reactionText`. */
  readonly reaction: number | undefined;
  readonly reactionText: string;
  /** Bei einer Tierbegegnung die Werte der Tiere; sonst fehlt es. */
  readonly animal: AnimalSimView | undefined;
  /** Die Würfel der Reaktion und ihr DM; fehlen bei Begegnungen von vorher. */
  readonly reactionDice: readonly number[] | undefined;
  readonly reactionDm: number;
  /** Die Zeile der Random Encounter List (11–56) bzw. der Tiertabelle (2–12), wie viele Würfel die Anzahl hat (0: ein Tier) und welcher (W6, W4, W3). */
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
        /** Er ist festgehalten (Falle, Köder, Filter): statt anzugreifen reißt er sich los, mit Zielwert und DM der Helfer. */
        readonly held: { readonly target: number; readonly dm: number; readonly helpers: number } | undefined;
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
  readonly damage: { readonly index: number; readonly weapon: string; readonly wounds: number; readonly victim: string | undefined; readonly left: number; readonly label: string } | undefined;
  /** Bei Schusswaffen: geladene Schuss, Größe des Magazins, wie viele Magazine (mit Namen) im Besitz sind. */
  readonly ammo: { readonly rounds: number; readonly capacity: number; readonly magazine: string; readonly magazines: number } | undefined;
  /** Kann der Angreifer angreifen (nicht bewusstlos, Ziel nicht tot, genug Schuss geladen)? */
  readonly canAttack: boolean;
  /** Feuerstoß oder Schrot der Waffe des Angreifers. */
  readonly fire: FireView | undefined;
  /** Die laufende Begegnung: Mit ihr zeigt der Reiter die Kampfsimulation statt der Waffentabelle. */
  readonly sim: SimView | undefined;
  /** Die Geländearten; `animals`: Gibt es dort Tiere? */
  readonly terrains: readonly { readonly id: string; readonly name: string; readonly dm: number; readonly animals: boolean }[];
  /** Das Gelände der Kampagne, für alle Begegnungsarten. */
  readonly terrain: string | undefined;
  /** Die Begegnungsart Tiere. */
  readonly animals: AnimalsView;
  /** Der offene Dialog „Beute nehmen“ bzw. „Ausweiden“. */
  readonly loot: LootView | undefined;
  /** Das eben gewürfelte Ausweiden im Vordergrund, mit den Namen derer, die gearbeitet haben. */
  readonly butchered: (ButcheringItem & { readonly meatWorker: string | undefined; readonly furWorker: string | undefined }) | undefined;
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
      /** Bei Jagdbeute: der Listenpreis je kg; `price` ist dann der Erlös für alles, `id` der Schlüssel des Besitzes. */
      readonly perKg: number | undefined;
    }[];
  }[];
  /** Was im Gruppengepäck verkäuflich ist, wie bei `members`; verkauft wird ohne Charakter. */
  readonly stash: readonly ShopView['members'][number]['sellable'][number][];
  readonly error: string | undefined;
}

/** Wo ein SC etwas ausgerüstet hat, für die Ansicht: Primärwaffe, Sekundärwaffe, getragene Rüstung. */
export interface EquipSlotView {
  readonly slot: EquipSlot;
  /** Der Gegenstand dort; fehlt, wenn die Stelle leer ist. */
  readonly item: string | undefined;
  readonly label: string | undefined;
  readonly inHand: boolean;
  /** Bei einer Schusswaffe: geladene Schuss von wie vielen. */
  readonly rounds: string | undefined;
}

/** Das Gruppengepäck: was drin ist, wer was ausgerüstet hat, Last und Traglast. */
export interface StashView {
  readonly items: readonly {
    /** Der Schlüssel des Besitzes (bei Jagdbeute mit Herkunft). */
    readonly key: string;
    readonly item: string;
    readonly label: string;
    readonly kind: ItemKind;
    readonly count: number;
    /** Gewicht aller Stück in kg, wenn es zur Last zählt; sonst `undefined`. */
    readonly weight: number | undefined;
    /** Wohin es passt: Waffe auf Primär oder Sekundär, Rüstung auf Rüstung; sonst nirgends. */
    readonly fits: readonly EquipSlot[];
    readonly rounds: string | undefined;
  }[];
  readonly members: readonly { readonly id: string; readonly name: string; readonly slots: readonly EquipSlotView[] }[];
  readonly load: number;
  readonly capacity: number;
  /** 0, 1 oder 2: um so viel zählen STR, DEX und END der SC niedriger. */
  readonly burden: number;
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
  /** Die fertigen Welten des Subsektors, für die Heimatwelt und den Ort eines NSC. */
  readonly worlds: readonly WorldChoice[];
  /** Die Rollen eines NSC, in ihrer Reihenfolge. */
  readonly roles: readonly NpcRole[];
}

export interface ControllerState {
  /** Alle Kampagnen, die offene eingeschlossen. */
  readonly campaigns: readonly Campaign[];
  /** Die offene Kampagne. */
  readonly campaign: Campaign | undefined;
  readonly campaignSheet: { readonly error: string | undefined } | undefined;
  /** Der Abgleich mit OneDrive. */
  readonly sync: SyncView;
  /** Die offenen Konflikte des Abgleichs. */
  readonly conflicts: readonly Conflict[];
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
  /** Der Dialog „Beute nehmen“ bzw. „Ausweiden“ ist für diesen NSC bzw. dieses Tier offen. */
  readonly lootOpen: string | undefined;
  /** Das eben gewürfelte Ausweiden steht im Vordergrund: Stelle im Log und wer gearbeitet hat (nur Anzeige). */
  readonly butchered: { readonly index: number; readonly meat: string | undefined; readonly fur: string | undefined } | undefined;
  /** Der Test des letzten Patron-Wurfs und was er brachte. */
  readonly patronNote: string | undefined;
  /** Der Test des letzten Tierwurfs und was er brachte. */
  readonly animalNote: string | undefined;
  /** Der Test des letzten Gerüchte-Wurfs und was er brachte. */
  readonly rumorNote: string | undefined;
  /** Der letzte Polizei-Test und was er brachte, oder was nicht ging. */
  readonly legalNote: string | undefined;
  /** Die Erinnerung an fehlende Tests oder was beim Vergehen der Zeit nicht ging. */
  readonly timeNote: string | undefined;
  /** Die Reise in Vorbereitung bzw. ihr Ergebnis. */
  readonly journey: JourneyDraft | undefined;
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
  readonly editor: { readonly id: string | undefined; readonly error: string | undefined; readonly npc?: boolean } | undefined;
  /** Der Reiter NSC zeigt alle NSC statt nur die des Aufenthaltsorts. */
  readonly npcAll: boolean;
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

function npcItem(c: Character): NpcItem {
  return { id: c.id, name: c.name, background: c.background, role: roleOf(c) };
}

function npcScreenView(campaign: Campaign, all: boolean): NpcScreenView {
  const here = campaign.location === undefined ? undefined : hexById(campaign.hexes, campaign.location)?.name;
  return {
    all,
    here,
    worlds: npcGroups(campaign, all).map((w) => ({ key: w.place ?? '-', name: w.name, roles: w.roles.map((r) => ({ role: r.role, npcs: r.npcs.map(npcItem) })) })),
    dead: deadNpcs(campaign).map(npcItem),
    total: npcCharacters(campaign).filter((c) => !c.dead).length,
  };
}

/** Der letzte Patron-Wurf im Log und ob sich dazu ein NSC erzeugen lässt. */
function patronNpcView(campaign: Campaign): PatronView['npc'] {
  const entry = campaign.log.findLast((e): e is PatronRoll => e.kind === 'patron');
  return entry && { blocker: patronNpcBlocker(campaign, entry) };
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
  extras: { readonly weakened: number; readonly parry: number; readonly evade?: number; readonly hide?: number } = { weakened: 0, parry: 0 },
): DmPart[] {
  const weapon = weaponOf(weaponId);
  const row = rowOf(weapon, burst);
  const characteristic = attackCharacteristic(weapon);
  const value = valueOf(attacker.fighting, characteristic);
  // Ein Tier greift ohne Fertigkeit und Attribut an, mit dem DM seines Tierangriffs.
  const hide = extras.hide ?? 0;
  if (attacker.animal) {
    return [
      { kind: 'natural', dm: attacker.natural },
      { kind: 'armor', armor, dm: armorDm(row, armor) },
      { kind: 'range', range, dm: rangeDm(row, range) ?? 0 },
      ...(hide !== 0 ? [{ kind: 'hide' as const, dm: hide }] : []),
      ...(extras.parry !== 0 ? [{ kind: 'parry' as const, dm: extras.parry }] : []),
      ...(extras.evade ? [{ kind: 'evade' as const, dm: extras.evade }] : []),
    ];
  }
  return [
    { kind: 'skill', name: skillOf(weapon.uses).name, level: attacker.skill, dm: attacker.skill },
    { kind: 'armor', armor, dm: armorDm(row, armor) },
    { kind: 'range', range, dm: rangeDm(row, range) ?? 0 },
    { kind: 'characteristic', characteristic, value, dm: characteristicAttackDm(weapon, value) },
    ...(neighbour && burst ? [{ kind: 'neighbour' as const, dm: BURST_NEIGHBOUR_DM }] : []),
    ...(extras.weakened !== 0 ? [{ kind: 'weakened' as const, dm: extras.weakened }] : []),
    ...(extras.parry !== 0 ? [{ kind: 'parry' as const, dm: extras.parry }] : []),
    ...(extras.evade ? [{ kind: 'evade' as const, dm: extras.evade }] : []),
    ...(hide !== 0 ? [{ kind: 'hide' as const, dm: hide }] : []),
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
  const victim = damageVictim(campaign.log, entry);
  // Schaden aus einem Ereignis steht im Kasten seines Rettungswurfs, mit dem Namen des Ereignisses.
  const source = entry.of !== undefined ? weaponName((campaign.log[entry.of] as AttackResult).with) : eventOf(campaign, eventEntryAt(campaign.log, (campaign.log[entry.after!] as SaveRoll).of)).name;
  return {
    kind: 'damage',
    at: entry.at,
    of: entry.of ?? entry.after!,
    weapon: source,
    victim: victim && nameOf(campaign, victim),
    dice: entry.dice,
    fixed: entry.fixed,
    blocks: entry.to === undefined ? undefined : blocksOf(entry),
    damage: damageOf(entry),
  };
}

/** Der anstehende Schaden: Waffe, Würfel, Ziel und wie viele Treffer der Garbe noch ohne Schaden sind (mit diesem). */
function damageView(campaign: Campaign, index: number, hit: AttackResult): NonNullable<CombatView['damage']> {
  const victim = victimOf(hit);
  const left = volleyOf(campaign.log, index).filter((i) => isSuccess(campaign.log[i] as AttackResult) && damageRollsOf(campaign.log, i).length === 0).length;
  const fixed = fixedDamageOf(campaign, index);
  const wounds = weaponOf(hit.with).wounds;
  return { index, weapon: weaponName(hit.with), wounds, victim: victim && nameOf(campaign, victim), left, label: fixed === undefined ? `${wounds}W6` : `fest ${fixed}` };
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

function combatView(campaign: Campaign, attack: Attack | undefined, wounding: Wounding | undefined, note: string | undefined, simTarget: string | undefined, intro: boolean, simBurst: boolean | undefined, simWeakened: boolean | undefined, surpriseShown = false, animalNote: string | undefined = undefined, log: readonly LogItem[] = [], lootOpen: string | undefined = undefined, butchered: ControllerState['butchered'] = undefined): CombatView | undefined {
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
  const ammo = ammoOf(character, campaign.stash);
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
    canAttack: canFight(attacker.state) && !(defender && isDead(defender.state)) && !(ammo !== undefined && ammo.rounds < roundsFor(weapon, burst)),
    fire: fireView(weapon, burst),
    damage: pendingHit && pending !== undefined ? damageView(campaign, pending, pendingHit) : undefined,
    ammo: ammo ? { rounds: ammo.rounds, capacity: ammo.capacity, magazine: itemLabel(itemOf(ammo.ammo)), magazines: ammo.magazines } : undefined,
    sim: encounter && simView(campaign, encounter, simTarget, simBurst, simWeakened),
    terrains: ref.encounters.terrains.map((t) => ({ id: t.id, name: t.name, dm: t.dm, animals: hasAnimals(t) })),
    terrain: campaign.terrain,
    animals: animalsView(campaign, animalNote, log),
    loot: lootView(campaign, lootOpen),
    butchered: butcheredView(campaign, butchered),
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

function butcheredView(campaign: Campaign, butchered: ControllerState['butchered']): CombatView['butchered'] {
  const entry = butchered === undefined ? undefined : campaign.log[butchered.index];
  if (!butchered || entry?.kind !== 'butchering') return undefined;
  return { ...butcheringItem(campaign, entry), meatWorker: butchered.meat, furWorker: butchered.fur };
}

function lootAction(campaign: Campaign, slot: FightSlot, state: WoundState): FighterView['loot'] {
  if (slot.side !== 'npcs' || state === 'unhurt' || state === 'wounded') return undefined;
  const npc = anyCharacterOf(campaign, slot.id);
  if (npc.animal !== undefined) return state === 'serious' ? undefined : { action: 'butcher', blocked: cannotButcher(campaign, slot.id) };
  // Den Zustand kennt der Aufrufer schon; hier bleibt nur, ob er noch etwas hat.
  return { action: 'take', blocked: npc.possessions.length === 0 && npc.credits === 0 ? `${npc.name} hat nichts mehr bei sich.` : undefined };
}

function butcheringItem(campaign: Campaign, entry: Butchering): ButcheringItem {
  const animal = anyCharacterOf(campaign, entry.of);
  const at = animal.animal!;
  const row = animalRowOf(campaign.hexes, at);
  const result = butcheringResult(campaign, entry);
  const value = lootValueOf(row, at)!;
  const furPerKg = value.furValue * FUR_RATE;
  const meatPerKg = value.meatValue * MEAT_RATE;
  const list = result.meat * meatPerKg + result.fur * furPerKg;
  const sale = (result.meat > 0 ? gameSaleTotal(campaign.hexes, MEAT, at, result.meat) : 0) + (result.fur > 0 ? gameSaleTotal(campaign.hexes, FUR, at, result.fur) : 0);
  return {
    kind: 'butchering',
    at: entry.at,
    animal: animal.name,
    weight: row.weight ?? 0,
    edible: result.edible,
    reason: result.reason,
    meatDie: entry.meatDie,
    meatSkill: entry.meatSkill,
    furSkill: entry.furSkill,
    meat: result.meat,
    fur: result.fur,
    furHalf: result.furHalf,
    hasFur: result.hasFur,
    market: value.market,
    furParts: value.fur,
    meatParts: value.meat,
    furValue: value.furValue,
    meatValue: value.meatValue,
    furPerKg,
    meatPerKg,
    list: Math.floor(list),
    sale,
  };
}

/** Wer arbeitet: „Jonas · Steward-1“; ohne Fertigkeit „Kira · ohne Fertigkeit“. */
function workerText(worker: { readonly name: string | undefined; readonly skill: string | undefined; readonly level: number }): string | undefined {
  if (worker.name === undefined) return undefined;
  return `${worker.name.split(' ')[0]} · ${worker.skill === undefined ? 'ohne Fertigkeit' : `${skillOf(worker.skill).name}-${worker.level}`}`;
}

function lootView(campaign: Campaign, id: string | undefined): LootView | undefined {
  if (id === undefined || !campaign.encounters.some((e) => e.npcs.some((n) => n.id === id))) return undefined;
  const npc = anyCharacterOf(campaign, id);
  const animal = npc.animal !== undefined;
  const workers = butchers(campaign);
  return {
    id,
    name: npc.name,
    animal,
    items: npc.possessions.map((p) => {
      const item = itemOf(p.of);
      return { label: itemLabel(item), count: p.count, sale: salePrice(item) };
    }),
    credits: npc.credits,
    meatWorker: workerText(workers.meat),
    furWorker: workerText(workers.fur),
    receivers: livingCharacters(campaign).map((c) => ({ id: c.id, name: c.name })),
    blocked: animal ? cannotButcher(campaign, id) : cannotLoot(campaign, id),
  };
}

function animalsView(campaign: Campaign, note: string | undefined, log: readonly LogItem[]): AnimalsView {
  const world = locationOf(campaign);
  const terrain = campaign.terrain === undefined ? undefined : terrainOf(campaign.terrain);
  const blocked = !world
    ? 'Erst den Aufenthaltsort wählen.'
    : !terrain
      ? 'Erst oben ein Gelände wählen: Tiere gibt es je Gelände.'
      : !hasAnimals(terrain)
        ? `Im Gelände ${terrain.name} gibt es keine Tiere.`
        : currentEncounter(campaign)
          ? 'Es läuft schon eine Begegnung.'
          : undefined;
  const table = world && terrain ? animalTableOf(world, terrain.id) : undefined;
  const rows = (table?.rows ?? []).filter((r) => r.event === undefined).map((r) => ({ roll: r.roll, name: animalName(r), quantity: r.quantity ?? 0 }));
  return { blocked, rows, note, lastEvent: log.findLast((item): item is EventItem => item.kind === 'event') };
}

/** Ein DM mit Vorzeichen: „+1“, „−2“, „±0“. */
function signedText(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0';
}

const behaviorWords: Record<string, string> = {
  possible: 'Greift an, wenn es kann.',
  surprise: 'Greift an, wenn es Überraschung hat.',
  surprised: 'Flieht, wenn es überrascht wird.',
  more: 'Greift an, wenn es mehr sind als Beute.',
};

/** Das Verhalten der Tiere in Worten: „Greift an.“, „Flieht.“, „Tut nichts.“ oder die Bedingung der Tierart. */
function behaviorText(view: BehaviorView | undefined): string {
  if (!view) return '';
  if (view.behavior === 'attacks') return 'Greift an.';
  if (view.behavior === 'flees') return 'Flieht.';
  if (view.behavior === 'nothing') return 'Tut nichts.';
  const word = (view.fleesFirst ? [view.flee, view.attack] : [view.attack, view.flee]).find((c) => c.word !== undefined)?.word;
  return behaviorWords[word ?? ''] ?? '';
}

function animalSimView(campaign: Campaign, encounter: Encounter): AnimalSimView | undefined {
  if (!isAnimalEncounter(encounter)) return undefined;
  const row = encounterAnimalRow(campaign, encounter);
  const behavior = behaviorOf(campaign, encounter)!;
  const lure = encounter.lureDice;
  return {
    weight: row.weight!,
    hits: row.hits!,
    armor: row.armor ?? 'nothing',
    armorDm: row.armorDm ?? 0,
    attacks: row.attacks!.map((a) => ({ name: weaponName(a.with), dm: a.dm, damage: a.damage })),
    speed: row.speed ?? 0,
    attack: behavior.attack,
    flee: behavior.flee,
    fleesFirst: behavior.fleesFirst,
    behavior: behavior.behavior,
    special: animalTypeOf(row.type!).special,
    lure: lure && { dice: lure, works: lure[0] + lure[1] >= LURE_TARGET },
    tableDice: encounter.tableDice,
    terrain: terrainOf(encounter.terrain!).name,
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
    skill: fighter.animal ? `Tier ${signedText(fighter.natural)}` : `${skillOf(fighter.weapon.uses).name}-${fighter.skill}`,
    armor: fighter.animal ? (fighter.armor === 'nothing' ? undefined : `${fighter.armor.charAt(0).toUpperCase()}${fighter.armor.slice(1)}${fighter.hide ? ` ${signedText(fighter.hide)}` : ''}`) : wears === undefined ? undefined : itemLabel(itemOf(wears)),
    armorClass: fighter.armor,
    upp: character.upp,
    current: fighter.upp,
    animal: character.animal ? { hits: animalRowOf(campaign.hexes, character.animal).hits!, hurt: hurtOf(campaign, slot.id), speed: animalRowOf(campaign.hexes, character.animal).speed ?? 0 } : undefined,
    state: fighter.state,
    acted: encounter.acted.includes(slot.id),
    turn: turn?.id === slot.id,
    targetable: turn !== undefined && turn.side !== slot.side && !isDead(fighter.state) && !isEscaped(campaign, slot.id),
    targeted: target === slot.id,
    neighbour: neighbours.includes(slot.id),
    healing: recoveryOptions(campaign, slot.id),
    blows: isMelee(fighter.weapon) ? blowsOf(campaign, slot.id) : undefined,
    evading: isEvading(campaign, slot.id),
    held: slot.side === 'pcs' && isHeld(campaign, slot.id),
    loot: lootAction(campaign, slot, fighter.state),
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
    const ammo = ammoOf(anyCharacterOf(campaign, turn.id), campaign.stash);
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
      held: turn.side === 'pcs' && isHeld(campaign, turn.id) ? struggleNeed(campaign, turn.id) : undefined,
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
    name: encounterNameOf(campaign, encounter),
    reaction: encounter.reaction,
    reactionText: encounter.reaction === undefined ? behaviorText(behaviorOf(campaign, encounter)) : reactionText(encounter.reaction),
    animal: animalSimView(campaign, encounter),
    reactionDice: encounter.reactionDice,
    reactionDm: reactionDm(campaign, encounter),
    roll: encounter.of ?? encounter.animal!,
    quantity: encounterQuantityOf(campaign, encounter),
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
  const weapons = armed.length < 2 && !character.animal ? [...armed, HANDS] : armed;
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
    const ammo = ammoOf(anyCharacterOf(temp, character.id), temp.stash);
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
    const who = damageVictim(campaign.log, entry);
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

/** Geladene Schuss eines Besitzes von wie vielen, bei Schusswaffen; ohne Angabe ist sie voll. */
function roundsOf(p: Possession): string | undefined {
  const weapon = itemOf(p.of).weapon;
  const capacity = weapon === undefined ? undefined : weaponOf(weapon).rounds;
  return capacity === undefined ? undefined : `${p.rounds ?? capacity}/${capacity}`;
}

/** Was eine Stelle eines SC hält, für die Ansicht. */
function slotView(c: Character, slot: EquipSlot): EquipSlotView {
  const item = itemAt(c, slot);
  const possession = item === undefined ? undefined : c.possessions.find((p) => p.of === item);
  return {
    slot,
    item,
    label: item === undefined ? undefined : itemLabel(itemOf(item)),
    inHand: slot !== 'wears' && c[slot] !== undefined && c.wields === c[slot],
    rounds: possession && roundsOf(possession),
  };
}

function stashView(campaign: Campaign, error: string | undefined): StashView {
  return {
    items: campaign.stash.map((p) => {
      const item = itemOf(p.of);
      const weight = loadOf({ ...campaign, stash: [p], characters: [] });
      const label = p.from === undefined ? itemLabel(item) : `${itemLabel(item)} · ${animalName(animalRowOf(campaign.hexes, p.from))}`;
      return {
        key: possessionKey(p),
        item: p.of,
        label,
        kind: item.kind,
        count: p.count,
        weight: weight > 0 ? weight : undefined,
        fits: (['primary', 'secondary', 'wears'] as const).filter((slot) => fits(p.of, slot)),
        rounds: roundsOf(p),
      };
    }),
    members: livingCharacters(campaign)
      .filter(isPc)
      .map((c) => ({ id: c.id, name: c.name, slots: (['primary', 'secondary', 'wears'] as const).map((slot) => slotView(c, slot)) })),
    load: loadOf(campaign),
    capacity: capacityOf(campaign),
    burden: burdenOf(campaign),
    error,
  };
}

function shopView(campaign: Campaign, error: string | undefined): ShopView {
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
    // Wie viele die Gruppe schon hat: im Gepäck und ausgerüstet.
    owned: [...campaign.stash, ...campaign.characters.filter(isPc).flatMap((c) => c.possessions)].filter((p) => p.of === o.item.id).reduce((sum, p) => sum + p.count, 0),
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
      sellable: sellables(campaign, c),
    })),
    stash: sellables(campaign, undefined),
    error,
  };
}

/** Was sich verkaufen lässt: aus dem Gepäck (`c` fehlt) oder was ein SC ausgerüstet hat. */
function sellables(campaign: Campaign, c: Character | undefined): ShopView['members'][number]['sellable'] {
  return (c ? c.possessions : campaign.stash).flatMap((p): ShopView['members'][number]['sellable'][number][] => {
        const item = itemOf(p.of);
        // Jagdbeute: Preis je kg aus der Tierart; verkauft wird nach kg, der Erlös für alle zusammen.
        if (p.from !== undefined) {
          const perKg = gamePricePerKg(campaign.hexes, p.of, p.from);
          const label = `${itemLabel(item)} · ${animalName(animalRowOf(campaign.hexes, p.from))}`;
          return [{ id: possessionKey(p), label, kind: item.kind, count: p.count, price: Math.max(1, Math.floor((perKg * p.count) / 2)), role: `Liste ${perKg.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Cr/kg`, perKg }];
        }
        const price = salePrice(item);
        if (price === undefined) return [];
        const role =
          c === undefined
            ? undefined
            : c.wears === item.id
              ? 'getragen'
              : item.weapon !== undefined && wieldedWeapon(c).id === item.weapon
                ? 'in der Hand'
                : item.weapon !== undefined && c.primary === item.weapon
                  ? 'Primärwaffe'
                  : item.weapon !== undefined && c.secondary === item.weapon
                    ? 'Sekundärwaffe'
                    : undefined;
        return [{ id: item.id, label: itemLabel(item), kind: item.kind, count: p.count, price, role, perKg: undefined }];
      });
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
    case 'event': {
      const event = animalEventOf(eventRowOf(campaign.hexes, entry).event!);
      const canSave = event.save !== undefined && savesOf(campaign.log, index).length === 0 && livingCharacters(campaign).length > 0;
      return { kind: 'event', at: entry.at, dice: entry.tableDice, roll: entry.tableDice[0] + entry.tableDice[1], terrain: terrainOf(entry.terrain).name, name: event.name, group: event.group, text: event.text, save: event.save, damage: event.damage, index, canSave };
    }
    case 'butchering':
      return butcheringItem(campaign, entry);
    case 'save': {
      const event = eventOf(campaign, eventEntryAt(campaign.log, entry.of));
      const under = savesUnder(event);
      return { kind: 'save', at: entry.at, name: nameOf(campaign, entry.for), event: event.name, dice: entry.dice, target: entry.target, under, attribute: under ? event.save : undefined, success: saveSucceeds(campaign, entry) };
    }
    case 'rumor': {
      const rumor = rumorOfRoll(entry);
      return { kind: 'rumor', at: entry.at, dice: entry.dice, roll: rumorRollOf(entry), letter: rumor.letter, text: rumor.text, general: rumor.general };
    }
    case 'check':
      return checkItem(entry);
    case 'time':
      return timeItem(entry);
    case 'journey':
      return journeyItem(campaign, entry, index);
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
  const base = { sync: state.sync, conflicts: state.conflicts.map((c) => conflictView(c, state.campaigns)), persistent: state.persistent, durable: state.durable, storageError: state.storageError, screen: state.screen, stripCollapsed: state.stripCollapsed, shopHintHidden: state.shopHintHidden, skills, items };
  if (!campaign) {
    return { ...base, ready: false, campaign: { id: '', name: '' }, campaigns: [], campaignSheet: undefined, odds: [], log: [], logDays: [], time: undefined, checks: undefined, legal: undefined, journey: undefined, travel: undefined, card: undefined, names: undefined, characters: [], focus: undefined, dead: [], npcs: { all: false, here: undefined, worlds: [], dead: [], total: 0 }, retired: [], task: undefined, combat: undefined, patron: undefined, rumor: undefined, shop: undefined, stash: { items: [], members: [], load: 0, capacity: 0, burden: 0, error: undefined }, location: undefined, result: undefined, editor: undefined, generation: undefined, generationRunning: false, sector: [], worlds: [], world: undefined, selected: undefined, picking: undefined };
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
    logDays: campaign.log.map((e) => (e.day === undefined ? undefined : dateLabel(e.day))),
    time: timeView(campaign, state.timeNote, animalsPossible(campaign)),
    checks: checksView(campaign),
    legal: legalView(
      campaign,
      log.findLast((item): item is CheckItem => item.kind === 'check' && item.check === 'legal'),
      state.legalNote,
    ),
    journey: state.journey && journeyView(campaign, state.journey),
    travel: state.world && { blocker: travelBlocker(campaign, hexId(state.world.column, state.world.row)) },
    card: state.card && cardView(state.card),
    names: state.names,
    characters: livingCharacters(campaign).map((c) => characterView(campaign, c, state)),
    focus: focusOf(campaign)?.id,
    dead: deadCharacters(campaign).map((c) => ({ id: c.id, name: c.name, background: c.background })),
    npcs: npcScreenView(campaign, state.npcAll),
    retired: retiredCharacters(campaign).map((c) => ({ id: c.id, name: c.name })),
    task: state.task && taskView(campaign, state.task),
    combat: combatView(campaign, state.attack, state.wounding, state.combatNote, state.simTarget, state.encounterIntro, state.simBurst, state.simWeakened, state.surpriseShown, state.animalNote, log, state.lootOpen, state.butchered),
    patron: {
      lists: patronLists.map((list) => ({ list, parts: patronDmParts(campaign, list) })),
      last: log.findLast((item): item is PatronItem => item.kind === 'patron'),
      note: state.patronNote,
      npc: patronNpcView(campaign),
    },
    rumor: { last: log.findLast((item): item is RumorItem => item.kind === 'rumor'), note: state.rumorNote },
    shop: shopView(campaign, state.shopError),
    stash: stashView(campaign, state.shopError),
    location: campaign.location,
    result: resultItem?.kind === 'task' || resultItem?.kind === 'attack' || resultItem?.kind === 'damage' ? resultItem : undefined,
    editor: state.editor && {
      id: state.editor.id,
      input: editing ? inputOf(editing) : state.editor.npc ? { ...emptyInput, npc: true, role: 'other', ...(campaign.location === undefined ? {} : { place: campaign.location }) } : emptyInput,
      error: state.editor.error,
      inLog: editing ? isInLog(campaign, editing.id) : false,
      worlds: worldChoices(campaign.hexes),
      roles: npcRoles,
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
