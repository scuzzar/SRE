import { activeSkills, adoptCharacter, livingCharacters, type Campaign, type Character, type CharacterId, type Possession, type Upp } from './campaign';
import { replay } from './career';
import { DomainError } from './errors';
import type { EventResult, LogEntry } from './log';
import type { Clock, Random } from './ports';
import { animalName, animalRowOf, animalTypeOf, hasAnimals, terrainOf, withAnimalTable, type AnimalRef, type AnimalRow } from './animals';
import { springTrap } from './hold';
import { survivalGear } from './loot';
import { encounterTypeOf, itemOf, nameSlotIds, ref, slotWithId, weaponOf, type EncounterType, type Item, type Range } from './reference';
import { locationOf } from './shop';

/** Der Würfel der Anzahl: W6 nach den Regeln, W4 oder W3 zum Ausgleichen. */
export const quantityDice = [6, 4, 3] as const;
export type QuantityDie = (typeof quantityDice)[number];

/** Eine Begegnung nach der Random Encounter List (S. 21). */
export interface Encounter {
  readonly id: string;
  /** Zeitpunkt als ISO-8601-Zeitstempel. */
  readonly at: string;
  /** Der Würfel, mit dem die Anzahl gewürfelt wurde; fehlt bei Begegnungen von vorher: W6. */
  readonly quantityDie?: QuantityDie;
  /** Die Art: der Wurf 11–56 auf der Liste; fehlt bei einer Tierbegegnung. */
  readonly of?: number;
  /** Bei einer Tierbegegnung: der Wurf 2–12 auf die Tiertabelle der Welt (`in`) im Gelände (`terrain`); im Code der Verweis auf die Zeile. */
  readonly animal?: number;
  /** Die 2W6 auf die Tiertabelle; fehlen, wenn man die Zeile gewählt hat. */
  readonly tableDice?: readonly [number, number];
  /** Bei einer Tierbegegnung: 2W6 gegen A und 2W6 gegen F der Zeile (SE 19). */
  readonly attackDice?: readonly [number, number];
  readonly fleeDice?: readonly [number, number];
  /** Bei einer Siren: 2W6 für den Köder; bei 11+ wirkt er auch auf Menschen (SR 48). */
  readonly lureDice?: readonly [number, number];
  /** Die Welt, auf der sie stattfindet, als Spalte und Zeile (0304). */
  readonly in?: string;
  /** Der Wurf auf die Reactions-Tabelle, 2 bis 12, mit DMs; die Würfel fehlen bei Begegnungen von vorher. Tiere haben keine Reaktion. */
  readonly reaction?: number;
  readonly reactionDice?: readonly [number, number];
  /** Der DM auf die Reaktion, beim Würfeln festgehalten; fehlt bei Begegnungen von vorher: der DM der Welt. */
  readonly reactionDm?: number;
  readonly ended: boolean;
  /** Die NSC der Begegnung: vollständige Charaktere, die an ihr hängen, nicht an der Kampagne. */
  readonly npcs: readonly Character[];
  /** Der Anführer: einer der NSC; fehlt, wenn die Begegnung keinen hat oder er übernommen ist. */
  readonly leader?: CharacterId;
  /** Der Wurf auf die Encounter Ranges (mit dem DM des Geländes); fehlt bei Begegnungen von vorher. */
  readonly rangeDice?: readonly [number, number];
  /** Der Würfel für das Startband innerhalb der Reichweite; fehlt bei Close und Short. */
  readonly bandDie?: number;
  /** Das Startband: wo alle SC zu Beginn stehen, 0 bis 20; ändert sich nach dem Würfeln nicht mehr. */
  readonly startBand: number;
  /** Auf dem Startband 0 in Berührung (Close); sonst ist Band 0 Short. */
  readonly startClose: boolean;
  /** Die Entfernung je SC zur NSC-Gruppe; fehlt sie einem SC, steht er auf dem Startband. */
  readonly distances?: readonly Distance[];
  /** Wer gerade ausweicht (SR 20): bis zu seinem nächsten Zug. */
  readonly evading?: readonly CharacterId[];
  /** Verweis auf das Gelände; fehlt es, ±0. */
  readonly terrain?: string;
  /** Wie viele Bands die NSC-Gruppe in dieser Runde schon gegangen ist (0–2); fehlt: 0. */
  readonly npcMoved?: number;
  /** Wie oft die NSC-Gruppe in der Begegnung gelaufen ist (2 Bands in einer Runde); fehlt: 0. Kostet je Lauf jeden NSC einen Combat-Schlag. */
  readonly npcRuns?: number;
  /** Die Runde, in der die überraschte Partei Alarm gegeben hat (SR 20); danach hält die Überraschung nicht mehr. */
  readonly alarm?: number;
  /** Die Überraschung je Partei: 1W6 und DM (S. 5). Fehlt, bis sie zu Beginn des Kampfs gewürfelt ist. */
  readonly pcSurprise?: SurpriseRoll;
  readonly npcSurprise?: SurpriseRoll;
  /** Die Kampfrunde, ab 1, und wer in ihr schon dran war (Verweise auf SC und NSC). */
  readonly round: number;
  readonly acted: readonly CharacterId[];
}

/**
 * Die Entfernung eines SC zur NSC-Gruppe, die immer auf Band 0 steht: das Band (0 bis 20; 21 heißt
 * mehr als 20, entkommen) und auf Band 0 die Berührung. Dazu, wie viele Bands er in dieser Runde
 * gegangen ist und wie oft er in der Begegnung gelaufen ist.
 */
export interface Distance {
  readonly of: CharacterId;
  readonly band: number;
  readonly close: boolean;
  /** Bands in dieser Runde (0–2); fehlt: 0. */
  readonly moved?: number;
  /** Läufe in der Begegnung; fehlt: 0. Kostet je Lauf einen Combat-Schlag. */
  readonly runs?: number;
  /** Die 2W6, ob die Falle eines Trappers oder einer Siren ihn fängt (5+, SR 48). */
  readonly trapDice?: readonly [number, number];
  /** Festgehalten von Falle, Köder oder Filter, bis er sich losreißt. */
  readonly held?: boolean;
  /** Wie oft er versucht hat, sich loszureißen; kostet je Versuch einen Combat-Schlag. */
  readonly struggles?: number;
}

export interface SurpriseRoll {
  readonly die: number;
  readonly dm: number;
}

export function encounterTypeOfEncounter(encounter: Encounter): EncounterType {
  const type = encounter.of === undefined ? undefined : encounterTypeOf(encounter.of);
  if (!type) throw new DomainError(`Eine Begegnung ${encounter.of} gibt es nicht.`);
  return type;
}

/** Die Stelle des ersten Logeintrags der Begegnung: der erste, der nicht vor ihr liegt. */
export function encounterStart(log: readonly LogEntry[], encounter: Encounter): number {
  const at = log.findIndex((e) => e.at >= encounter.at);
  return at < 0 ? log.length : at;
}

/** Die laufende Begegnung; es gibt höchstens eine. */
export function currentEncounter(campaign: Campaign): Encounter | undefined {
  return campaign.encounters.find((e) => !e.ended);
}

/** Der NSC zu einer Id, in welcher Begegnung auch immer. */
export function npcOf(campaign: Campaign, id: string): Character {
  for (const encounter of campaign.encounters) {
    const npc = encounter.npcs.find((n) => n.id === id);
    if (npc) return npc;
  }
  throw new DomainError(`Den NSC ${id} gibt es nicht.`);
}

/** Die Begegnung, zu der ein NSC gehört. */
export function encounterOfNpc(campaign: Campaign, id: string): Encounter {
  const encounter = campaign.encounters.find((e) => e.npcs.some((n) => n.id === id));
  if (!encounter) throw new DomainError(`Den NSC ${id} gibt es nicht.`);
  return encounter;
}

function d6(random: Random, count = 1, sides = 6): number {
  let sum = 0;
  for (let i = 0; i < count; i++) sum += random.int(1, sides);
  return sum;
}

/** Der Würfel der Anzahl der Kampagne; fehlt er, W6. */
export function quantityDieOf(campaign: Campaign): QuantityDie {
  return campaign.quantityDie ?? 6;
}

/** Stellt den Würfel der Anzahl für kommende Begegnungen ein; W6 ist die Regel und wird nicht gespeichert. */
export function setQuantityDie(campaign: Campaign, die: number): Campaign {
  if (!quantityDice.includes(die as QuantityDie)) throw new DomainError(`Einen Würfel W${die} für die Anzahl gibt es nicht; W6, W4 oder W3.`);
  const rest = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'quantityDie')) as Omit<Campaign, 'quantityDie'>;
  return die === 6 ? rest : { ...rest, quantityDie: die as QuantityDie };
}

/** Stellt das Gelände der Kampagne ein, für alle Begegnungsarten; ohne Gelände ±0 und keine Tiere. */
export function setTerrain(campaign: Campaign, terrain: string | undefined): Campaign {
  if (terrain === undefined) {
    const rest = Object.fromEntries(Object.entries(campaign).filter(([key]) => key !== 'terrain')) as Omit<Campaign, 'terrain'>;
    return rest;
  }
  return { ...campaign, terrain: terrainOf(terrain).id };
}

/** Ein Name von der Tafel NSC: ein Namensfeld zufällig, daraus Vor- und Nachname. */
export function npcName(random: Random): string {
  const slot = slotWithId(nameSlotIds[random.int(0, nameSlotIds.length - 1)]!);
  return slot.columns
    .map((column) => {
      const entries = column.entries.filter((e) => !e.retired);
      return entries[random.int(0, entries.length - 1)]!.text;
    })
    .join(' ');
}

/** Das Beste bis zum TL: der höchste TL, bei Gleichstand der höchste Preis. */
function best(items: readonly Item[]): Item | undefined {
  return [...items].sort((a, b) => (b.tl ?? 0) - (a.tl ?? 0) || (b.price ?? 0) - (a.price ?? 0))[0];
}

function pick<T>(items: readonly T[], random: Random): T | undefined {
  return items.length === 0 ? undefined : items[random.int(0, items.length - 1)];
}

/**
 * Die Waffen bis zum TL der Gruppe (Available Weapons by TL, S. 21): ohne G Klingen, mit G
 * Schusswaffen; gibt es bis zum TL keine Schusswaffe, bleiben die Klingen.
 */
function weaponsUpTo(tl: number, guns: boolean): readonly Item[] {
  const all = ref.items.filter((i) => i.kind === 'weapon' && i.weapon !== undefined && (i.tl ?? 0) <= tl);
  const attack = (i: Item) => ref.weapons.find((w) => w.id === i.weapon)!.attack;
  const shots = all.filter((i) => attack(i) === 'shot');
  return guns && shots.length > 0 ? shots : all.filter((i) => attack(i) === 'swing');
}

/**
 * Die Rüstungen bis zum TL der Gruppe. Combat Armor und Battle Dress (Rüstungsklasse Combat) tragen
 * nur Soldaten und Anführer (SR 50); für alle anderen fallen sie weg.
 */
function armorsUpTo(tl: number, heavy: boolean): readonly Item[] {
  return ref.items.filter((i) => i.kind === 'armor' && (i.tl ?? 0) <= tl && (heavy || i.armor !== 'combat'));
}

function nextNumber(ids: readonly string[], prefix: string): number {
  const numbers = ids.filter((id) => id.startsWith(prefix)).map((id) => Number(id.slice(prefix.length))).filter(Number.isFinite);
  return Math.max(0, ...numbers) + 1;
}

/** So viele Magazine bekommt ein NSC zu seiner Schusswaffe: 1W4 (Hausregel; SR 50 sagt nichts). */
const NPC_MAGAZINE_DIE = 4;

/** Was einen NSC der Begegnung ausmacht, bevor er ein Charakter wird. */
interface NpcSetup {
  readonly id: CharacterId;
  readonly name: string;
  readonly type: EncounterType;
  readonly leader: boolean;
  readonly skill: number;
  readonly upp: Upp;
  /** Der Gegenstand seiner Waffe. */
  readonly weapon: string;
  readonly armor?: string;
  /** Wie viele Magazine er zu einer Schusswaffe hat. */
  readonly magazines: number;
  /** Seine Kredite (Hausregel) und die Überlebensausrüstung, die die Welt verlangt. */
  readonly credits?: number;
  readonly gear?: readonly string[];
}

/**
 * Ein NSC der Begegnung als vollständiger Charakter: Herkunft die Art der Begegnung, kein SC, die
 * Fertigkeit seiner Waffe als Stufe, Waffe, Magazine und Rüstung im Besitz, die Waffe als
 * Primärwaffe in der Hand, die Rüstung angezogen.
 */
function npcCharacter(setup: NpcSetup): Character {
  const weapon = weaponOf(itemOf(setup.weapon).weapon!);
  const possessions: Possession[] = [
    { of: setup.weapon, count: 1 },
    ...(weapon.ammo !== undefined && setup.magazines > 0 ? [{ of: weapon.ammo, count: setup.magazines }] : []),
    ...(setup.armor === undefined ? [] : [{ of: setup.armor, count: 1 }]),
    ...(setup.gear ?? []).filter((g) => g !== setup.armor).map((of) => ({ of, count: 1 })),
  ];
  return {
    id: setup.id,
    name: setup.name,
    background: `${setup.type.name}${setup.leader ? ' · Anführer' : ''}`,
    equipment: '',
    credits: setup.credits ?? 0,
    note: '',
    dead: false,
    retired: false,
    npc: true,
    upp: setup.upp,
    skills: [{ of: weapon.uses, level: setup.skill, retired: false }],
    possessions,
    primary: weapon.id,
    wields: weapon.id,
    ...(setup.armor === undefined ? {} : { wears: setup.armor }),
  };
}

/** Was eine Begegnung würfelt: die Art (11–66) und, wenn es eine gibt, die Kampagne mit der neuen Begegnung. */
export interface EncounterRoll {
  readonly roll: number;
  readonly campaign: Campaign;
  readonly encounter: Encounter | undefined;
}

/**
 * Würfelt eine Begegnung auf dem Aufenthaltsort: die Art nach der Random Encounter List (oder
 * vorgegeben), die Anzahl mit dem Würfel der Anzahl der Kampagne, je NSC UPP, Name, Waffe und
 * Rüstung nach dem TL der Gruppe, dazu die Reaktion. Die Zeilen 61–66 sind leer: dann gibt es keine.
 * `count` gibt die Anzahl fest vor; das nutzen nur Tests.
 */
export function rollEncounter(campaign: Campaign, random: Random, clock: Clock, chosen?: number, count?: number, terrain: string | undefined = campaign.terrain): EncounterRoll {
  if (currentEncounter(campaign)) throw new DomainError('Es läuft schon eine Begegnung; erst sie beenden.');
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  const roll = chosen ?? d6(random) * 10 + d6(random);
  if (chosen !== undefined && !encounterTypeOf(chosen)) throw new DomainError(`Eine Begegnung ${chosen} gibt es nicht.`);
  const type = encounterTypeOf(roll);
  if (!type) return { roll, campaign, encounter: undefined };
  if (count !== undefined && (!Number.isInteger(count) || count < 1)) throw new DomainError('Eine Begegnung hat mindestens einen NSC.');
  const quantityDie = quantityDieOf(campaign);
  const size = count ?? Math.max(1, d6(random, type.quantity, quantityDie));
  const tl = Math.max(0, (world.uwp.tech ?? 0) + type.tl);
  const blades = weaponsUpTo(tl, false);
  const weapons = weaponsUpTo(tl, type.guns);
  const guns = weaponsUpTo(tl, true);
  const armors = armorsUpTo(tl, type.military === true);
  const heavyArmors = armorsUpTo(tl, true);
  // Die Überlebensausrüstung, die die Welt verlangt (Charts S. 21).
  const gear = survivalGear(world.uwp.atmosphere ?? 0, tl);
  // Die Ids der NSC bleiben über alle Begegnungen eindeutig, auch wenn einer übernommen ist.
  const first = nextNumber([...campaign.characters.map((c) => c.id), ...campaign.encounters.flatMap((e) => e.npcs.map((n) => n.id))], 'n');
  const npcs: Character[] = Array.from({ length: size }, (_, i) => {
    const leader = type.leader && i === 0;
    const upp: Upp = { str: d6(random, 2), dex: d6(random, 2), end: d6(random, 2), int: d6(random, 2), edu: d6(random, 2), soc: d6(random, 2) };
    const name = npcName(random);
    // Ein Anführer trägt immer eine Schusswaffe und Rüstung, auch ohne G und A (SR 50).
    const weapon = (leader ? best(guns) : pick(weapons, random)) ?? pick(blades, random)!;
    const armor = leader ? best(heavyArmors) : type.armor ? pick(armors, random) : undefined;
    const magazines = weaponOf(weapon.weapon!).ammo === undefined ? 0 : random.int(1, NPC_MAGAZINE_DIE);
    // Kredite nach der Art (Hausregel): 1W6 × Stufe, der Anführer das Zehnfache.
    const credits = d6(random) * type.credits * (leader ? 10 : 1);
    return npcCharacter({ id: `n${first + i}`, name, type, leader, skill: leader ? 2 : 1, upp, weapon: weapon.id, ...(armor ? { armor: armor.id } : {}), magazines, credits, gear });
  });
  const reactionDice = [d6(random), d6(random)] as const;
  const dm = populationDm(world.uwp.population) + veteranDm(campaign);
  const reaction = reactionOf(reactionDice, dm);
  const ground = terrain === undefined ? undefined : ref.encounters.terrains.find((t) => t.id === terrain);
  if (terrain !== undefined && !ground) throw new DomainError(`Das Gelände ${terrain} gibt es nicht.`);
  const rangeDice = [d6(random), d6(random)] as const;
  const start = startBand(encounterRange(rangeDice, ground?.dm ?? 0), random);
  const encounter: Encounter = {
    id: `e${nextNumber(
      campaign.encounters.map((e) => e.id),
      'e',
    )}`,
    at: clock.now(),
    quantityDie,
    of: roll,
    in: campaign.location,
    reaction,
    reactionDice,
    reactionDm: dm,
    ended: false,
    npcs,
    ...(type.leader ? { leader: npcs[0]!.id } : {}),
    rangeDice,
    startBand: start.band,
    startClose: start.close,
    ...(start.bandDie === undefined ? {} : { bandDie: start.bandDie }),
    ...(ground ? { terrain: ground.id } : {}),
    round: 1,
    acted: [],
  };
  return { roll, campaign: { ...campaign, encounters: [...campaign.encounters, encounter] }, encounter };
}

/** Eine Tierbegegnung verweist auf eine Zeile der Tiertabelle statt auf eine Art der Random Encounter List. */
export function isAnimalEncounter(encounter: Encounter): boolean {
  return encounter.animal !== undefined;
}

/** Der Verweis einer Tierbegegnung auf ihre Zeile: Welt, Gelände und Wurf. */
export function animalRefOf(encounter: Encounter): AnimalRef {
  if (encounter.animal === undefined || encounter.in === undefined || encounter.terrain === undefined) throw new DomainError('Das ist keine Tierbegegnung.');
  return { in: encounter.in, terrain: encounter.terrain, roll: encounter.animal };
}

/** Die Zeile der Tiertabelle einer Tierbegegnung. */
export function encounterAnimalRow(campaign: Campaign, encounter: Encounter): AnimalRow {
  return animalRowOf(campaign.hexes, animalRefOf(encounter));
}

/** Der Name einer Begegnung: die Art der Random Encounter List oder das Tier. */
export function encounterNameOf(campaign: Campaign, encounter: Encounter): string {
  return isAnimalEncounter(encounter) ? animalName(encounterAnimalRow(campaign, encounter)) : encounterTypeOfEncounter(encounter).name;
}

/** Wie viele Würfel die Anzahl hat; bei einem einzelnen Tier 0. */
export function encounterQuantityOf(campaign: Campaign, encounter: Encounter): number {
  return isAnimalEncounter(encounter) ? (encounterAnimalRow(campaign, encounter).quantity ?? 0) : encounterTypeOfEncounter(encounter).quantity;
}

/** Was eine Tierbegegnung würfelt: der Wurf 2–12 und die Kampagne mit Tiertabelle; mit Begegnung oder, bei einem Ereignis, ohne. */
export interface AnimalRoll {
  readonly roll: number;
  /** Die Kampagne mit Tiertabelle und neuer Begegnung bzw., bei einem Ereignis, mit dem Ereignis im Log. */
  readonly campaign: Campaign;
  readonly encounter: Encounter | undefined;
  readonly event: EventResult | undefined;
  /** Die Zeile, auf die der Wurf fiel. */
  readonly row: AnimalRow;
}

const EMPTY_UPP: Upp = { str: 0, dex: 0, end: 0, int: 0, edu: 0, soc: 0 };

/** Ein Tier der Begegnung als Charakter: ohne UPP, Fertigkeiten und Besitz; die Tierangriffe als Primär- und Sekundärwaffe. */
function animalCharacter(id: CharacterId, name: string, at: AnimalRef, row: AnimalRow): Character {
  const [first, second] = row.attacks!;
  return {
    id,
    name,
    background: `${animalName(row)} · Tier`,
    equipment: '',
    credits: 0,
    note: '',
    dead: false,
    retired: false,
    npc: true,
    upp: EMPTY_UPP,
    skills: [],
    possessions: [],
    primary: first!.with,
    ...(second === undefined || second.with === first!.with ? {} : { secondary: second.with }),
    wields: first!.with,
    animal: at,
  };
}

/**
 * Würfelt eine Tierbegegnung im Gelände der Kampagne (SE 18–19): legt die Tiertabelle der Welt in
 * diesem Gelände an, wenn es sie noch nicht gibt, und würfelt 2W6 auf sie (oder nimmt die gewählte
 * Zeile). Ein Ereignis legt keine Begegnung an. Sonst die Anzahl mit dem Würfel der Anzahl, die
 * Entfernung mit dem DM des Geländes, je 2W6 gegen A und F, bei einer Siren der Köder.
 */
export function rollAnimalEncounter(campaign: Campaign, random: Random, clock: Clock, chosen?: number, count?: number): AnimalRoll {
  if (currentEncounter(campaign)) throw new DomainError('Es läuft schon eine Begegnung; erst sie beenden.');
  const world = locationOf(campaign);
  if (!world || campaign.location === undefined) throw new DomainError('Die Gruppe ist auf keiner Welt; erst auf der Sektorkarte den Aufenthaltsort wählen.');
  if (campaign.terrain === undefined) throw new DomainError('Erst ein Gelände wählen: Tiere gibt es je Gelände.');
  const ground = terrainOf(campaign.terrain);
  if (!hasAnimals(ground)) throw new DomainError(`Im Gelände ${ground.name} gibt es keine Tiere.`);
  if (chosen !== undefined && (!Number.isInteger(chosen) || chosen < 2 || chosen > 12)) throw new DomainError(`Eine Tierzeile ${chosen} gibt es nicht; 2 bis 12.`);
  const hex = withAnimalTable(world, ground.id, random);
  const withTable: Campaign = hex === world ? campaign : { ...campaign, hexes: campaign.hexes.map((h) => (h === world ? hex : h)) };
  const tableDice = chosen === undefined ? ([d6(random), d6(random)] as const) : undefined;
  const roll = chosen ?? tableDice![0] + tableDice![1];
  const at: AnimalRef = { in: campaign.location, terrain: ground.id, roll };
  const row = animalRowOf(withTable.hexes, at);
  if (row.event !== undefined) {
    if (!tableDice) throw new DomainError('Ein Ereignis wählt man nicht; man würfelt es.');
    const event: EventResult = { kind: 'event', at: clock.now(), in: campaign.location, terrain: ground.id, tableDice };
    return { roll, campaign: { ...withTable, log: [...withTable.log, event] }, encounter: undefined, event, row };
  }
  if (count !== undefined && (!Number.isInteger(count) || count < 1)) throw new DomainError('Eine Begegnung hat mindestens ein Tier.');
  const quantityDie = quantityDieOf(campaign);
  const size = count ?? (row.quantity === undefined ? 1 : Math.max(1, d6(random, row.quantity, quantityDie)));
  const first = nextNumber([...campaign.characters.map((c) => c.id), ...campaign.encounters.flatMap((e) => e.npcs.map((n) => n.id))], 'n');
  const name = animalName(row);
  const npcs = Array.from({ length: size }, (_, i) => animalCharacter(`n${first + i}`, size === 1 ? name : `${name} ${i + 1}`, at, row));
  const rangeDice = [d6(random), d6(random)] as const;
  const attackDice = [d6(random), d6(random)] as const;
  const fleeDice = [d6(random), d6(random)] as const;
  const lure = animalTypeOf(row.type!).special === 'lure';
  const lureDice = lure ? ([d6(random), d6(random)] as const) : undefined;
  // Wirkt der Köder einer Siren auch auf Menschen (11+), beginnt die Begegnung in Berührung (SR 48).
  const start = lureDice && lureDice[0] + lureDice[1] >= LURE_TARGET ? { band: 0, close: true } : startBand(encounterRange(rangeDice, ground.dm), random);
  const encounter: Encounter = {
    id: `e${nextNumber(
      campaign.encounters.map((e) => e.id),
      'e',
    )}`,
    at: clock.now(),
    quantityDie,
    animal: roll,
    ...(tableDice ? { tableDice } : {}),
    in: campaign.location,
    attackDice,
    fleeDice,
    ...(lureDice ? { lureDice } : {}),
    ended: false,
    npcs,
    rangeDice,
    startBand: start.band,
    startClose: start.close,
    ...('bandDie' in start && start.bandDie !== undefined ? { bandDie: start.bandDie } : {}),
    terrain: ground.id,
    round: 1,
    acted: [],
  };
  return { roll, campaign: { ...withTable, encounters: [...withTable.encounters, encounter] }, encounter, event: undefined, row };
}

/** Der Köder einer Siren wirkt bei 11+ auch auf Menschen (SR 48). */
export const LURE_TARGET = 11;

/** Was die Tiere nach A und F tun; fehlt, wenn ein Wort statt einer Zahl entscheidet. */
export type Behavior = 'attacks' | 'flees' | 'nothing';

/** Ein Wurf gegen A oder F: die Würfel und der nötige Wurf, oder das Wort der Tierart. */
export interface BehaviorCheck {
  readonly dice: readonly [number, number];
  readonly need: number | undefined;
  readonly word: string | undefined;
}

export interface BehaviorView {
  readonly attack: BehaviorCheck;
  readonly flee: BehaviorCheck;
  readonly fleesFirst: boolean;
  readonly behavior: Behavior | undefined;
}

/**
 * `/behavior` (SE 19): Fleischfresser und die meisten prüfen erst den Angriff, Pflanzenfresser erst
 * die Flucht; der erste Wurf, der seinen Wert erreicht, entscheidet, sonst tun sie nichts. Steht ein
 * Wort statt einer Zahl, entscheidet man selbst: Das Verhalten fehlt.
 */
export function behaviorOf(campaign: Campaign, encounter: Encounter): BehaviorView | undefined {
  if (!isAnimalEncounter(encounter) || !encounter.attackDice || !encounter.fleeDice) return undefined;
  const row = encounterAnimalRow(campaign, encounter);
  const type = animalTypeOf(row.type!);
  const word = (text: string) => (/^1D/.test(text) ? undefined : text);
  const attack: BehaviorCheck = { dice: encounter.attackDice, need: word(type.attack) ? undefined : row.attack, word: word(type.attack) };
  const flee: BehaviorCheck = { dice: encounter.fleeDice, need: word(type.flee) ? undefined : row.flee, word: word(type.flee) };
  const order: readonly (readonly [BehaviorCheck, Behavior])[] = type.fleesFirst ? [[flee, 'flees'], [attack, 'attacks']] : [[attack, 'attacks'], [flee, 'flees']];
  let behavior: Behavior | undefined = 'nothing';
  for (const [check, result] of order) {
    if (check.word !== undefined) {
      behavior = undefined;
      break;
    }
    if (check.dice[0] + check.dice[1] >= check.need!) {
      behavior = result;
      break;
    }
  }
  return { attack, flee, fleesFirst: type.fleesFirst, behavior };
}

/** Die Entfernung nach den Encounter Ranges (S. 5): 2W6 plus DM des Geländes, auf 1 bis 12 begrenzt. */
export function encounterRange(dice: readonly [number, number], dm: number): Range {
  const roll = Math.min(12, Math.max(1, dice[0] + dice[1] + dm));
  return ref.encounters.ranges.find((r) => r.roll === roll)!.range;
}

/** Mehr als 20 Bands: Die Parteien sind entkommen (Book 1, S. 33). */
export const ESCAPED_BAND = 21;

/** Wo eine Begegnung steht: Band und Berührung, mit dem Würfel des Startbands. */
export interface BandPosition {
  readonly band: number;
  readonly close: boolean;
  readonly bandDie?: number;
}

/**
 * Das Startband einer gewürfelten Reichweite (Hausregel, gleichverteilt): Close Band 0 mit
 * Berührung, Short Band 0 ohne; sonst ein Würfel über die Bands der Reichweite, Medium 1W2,
 * Long 1W8, Very Long 1W10.
 */
export function startBand(range: Range, random: Random): BandPosition {
  if (range === 'close') return { band: 0, close: true };
  const { from, to } = ref.encounters.bands.find((b) => b.range === range)!;
  if (from === to) return { band: from, close: false };
  const bandDie = random.int(1, to - from + 1);
  return { band: from - 1 + bandDie, close: false, bandDie };
}

/** Das erste Band einer Reichweite, für Begegnungen von vor den Range Bands. */
export function firstBand(range: Range): BandPosition {
  return range === 'close' ? { band: 0, close: true } : { band: ref.encounters.bands.find((b) => b.range === range)!.from, close: false };
}

/** Die Reichweite eines Bands nach den Range Bands; über 20 gibt es keine. */
export function rangeOfBand(band: number, close: boolean): Range | undefined {
  if (band > 20) return undefined;
  if (band === 0) return close ? 'close' : 'short';
  return ref.encounters.bands.find((b) => b.from <= band && band <= b.to)!.range;
}

/** Die Entfernung dieses SC in der Begegnung; ohne eigene steht er auf dem Startband. */
export function distanceOf(encounter: Encounter, pc: CharacterId): Distance {
  return encounter.distances?.find((d) => d.of === pc) ?? { of: pc, band: encounter.startBand, close: encounter.startClose };
}

/** `/range` einer Entfernung; fehlt, wenn der SC entkommen ist. */
export function rangeOfDistance(distance: Distance): Range | undefined {
  return rangeOfBand(distance.band, distance.close);
}

/** `/escaped`: mehr als 20 Bands, der SC hat die NSC verloren. */
export function isEscapedDistance(distance: Distance): boolean {
  return distance.band >= ESCAPED_BAND;
}

/** Die Begegnung mit dieser Entfernung (ersetzt die alte des SC). */
export function withDistance(encounter: Encounter, distance: Distance): Encounter {
  const others = (encounter.distances ?? []).filter((d) => d.of !== distance.of);
  return { ...encounter, distances: [...others, distance] };
}

/** Der SC eines Paars aus SC und NSC: Angriffe gibt es nur zwischen den Parteien. */
function pcOfPair(campaign: Campaign, a: CharacterId, b: CharacterId): CharacterId | undefined {
  const isPc = (id: CharacterId) => campaign.characters.some((c) => c.id === id);
  if (isPc(a) === isPc(b)) return undefined;
  return isPc(a) ? a : b;
}

/** Die Reichweite zwischen einem SC und einem NSC: die Entfernung des SC; fehlt, wenn er entkommen ist. */
export function rangeBetween(campaign: Campaign, encounter: Encounter, a: CharacterId, b: CharacterId): Range | undefined {
  const pc = pcOfPair(campaign, a, b);
  return pc === undefined ? undefined : rangeOfDistance(distanceOf(encounter, pc));
}

/**
 * Ein Schritt näher (−1) oder weiter weg (+1). Die Schritte sind: Berührung, Band 0, Band 1 … 20,
 * entkommen. `undefined`, wenn es in diese Richtung nicht weitergeht.
 */
export function steppedPosition(band: number, close: boolean, step: -1 | 1): { readonly band: number; readonly close: boolean } | undefined {
  const at = (close ? 0 : band + 1) + step;
  if (at < 0 || at > ESCAPED_BAND + 1) return undefined;
  return at === 0 ? { band: 0, close: true } : { band: at - 1, close: false };
}

/** Prüft ein Band: 0 bis 21, Berührung nur auf Band 0. */
function checkBand(band: number, close: boolean): void {
  if (!Number.isInteger(band) || band < 0 || band > ESCAPED_BAND) throw new DomainError(`Ein Band ${band} gibt es nicht.`);
  if (close && band !== 0) throw new DomainError('In Berührung ist ein SC nur auf Band 0.');
}

/** Setzt die Entfernung eines SC frei (Ermessen der Spielleitung); das zählt nicht als Bewegung. */
export function setDistance(campaign: Campaign, pc: CharacterId, band: number, close = false): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new DomainError('Es läuft keine Begegnung.');
  checkBand(band, close);
  if (!livingCharacters(campaign).some((c) => c.id === pc)) throw new DomainError('Eine Entfernung hat nur ein SC, der kämpft.');
  const distance = { ...distanceOf(encounter, pc), band, close };
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? withDistance(e, distance) : e)) };
}

/** Ein Spielstand von vor 2026-11-08d: ein Band für alle, Bewegung und Läufe je Partei. */
interface LegacyBands {
  readonly band?: number;
  readonly close?: boolean;
  readonly range?: Range;
  readonly pcMoved?: number;
  readonly pcRuns?: number;
}

/**
 * Schreibt Begegnungen von vor 2026-11-08d um: Das eine Band wird das Startband (bei Begegnungen von
 * vor den Range Bands das erste Band ihrer Reichweite). Sind die SC in der laufenden Begegnung schon
 * gegangen oder gelaufen, bekommt jeder SC, der kämpft, seine Entfernung mit dem Band und diesen
 * Zahlen. Eine heutige Begegnung bleibt, wie sie ist.
 */
export function upgradeDistances(campaign: Campaign): Campaign {
  const encounters = campaign.encounters.map((encounter): Encounter => {
    const old = encounter as Encounter & LegacyBands;
    if (old.band === undefined && old.range === undefined && old.pcMoved === undefined && old.pcRuns === undefined && encounter.startBand !== undefined) return encounter;
    const { band, close, range, pcMoved, pcRuns, ...rest } = old;
    const start = encounter.startBand !== undefined ? { band: encounter.startBand, close: encounter.startClose } : band !== undefined ? { band, close: close ?? false } : firstBand(range ?? 'short');
    const upgraded: Encounter = { ...rest, startBand: start.band, startClose: start.close };
    if (encounter.ended || (!pcMoved && !pcRuns)) return upgraded;
    const distances = livingCharacters(campaign).map((c): Distance => ({ of: c.id, band: start.band, close: start.close, ...(pcMoved ? { moved: pcMoved } : {}), ...(pcRuns ? { runs: pcRuns } : {}) }));
    return { ...upgraded, distances };
  });
  return { ...campaign, encounters };
}

const BATTLE_DRESS = 'battle-dress';

/** Ein DM auf die Überraschung mit seinem Grund, für die Anzeige. */
export interface SurpriseDmPart {
  readonly label: string;
  readonly dm: number;
}

function partsWith(entries: readonly (readonly [boolean, string, number])[]): readonly SurpriseDmPart[] {
  return entries.filter(([applies]) => applies).map(([, label, dm]) => ({ label, dm }));
}

/** Die DMs der SC auf die Überraschung (S. 5): Battle Dress +2, Leader +1, Tactics +1, Army oder Marines +1, 8 oder mehr −1. */
export function pcSurpriseParts(campaign: Campaign): readonly SurpriseDmPart[] {
  const pcs = livingCharacters(campaign);
  const skill = (id: string) => pcs.some((c) => activeSkills(c).some((s) => s.of === id && s.level >= 1));
  const military = pcs.some((c) => c.career !== undefined && ['army', 'marines'].includes(replay(c.career).service?.id ?? ''));
  return partsWith([
    [pcs.some((c) => c.wears === BATTLE_DRESS), 'Battle Dress', 2],
    [skill('leader'), 'Leader', 1],
    [skill('tactics'), 'Tactics', 1],
    [military, 'Army/Marines', 1],
    [pcs.length >= 8, '8 oder mehr', -1],
  ]);
}

/** Die DMs der NSC auf die Überraschung: Battle Dress +2, Anführer +1, militärische Art +1, Fahrzeug −1, 8 oder mehr −1. */
export function npcSurpriseParts(encounter: Encounter): readonly SurpriseDmPart[] {
  const npcs = encounter.npcs;
  // Tiere haben nur den DM für die Gruppengröße.
  if (isAnimalEncounter(encounter)) return partsWith([[npcs.length >= 8, '8 oder mehr', -1]]);
  const type = encounterTypeOfEncounter(encounter);
  return partsWith([
    [npcs.some((n) => n.wears === BATTLE_DRESS), 'Battle Dress', 2],
    [encounter.leader !== undefined, 'Anführer', 1],
    [type.military === true, 'militärisch', 1],
    [type.vehicle, 'Fahrzeug', -1],
    [npcs.length >= 8, '8 oder mehr', -1],
  ]);
}

const sumOf = (parts: readonly SurpriseDmPart[]) => parts.reduce((total, p) => total + p.dm, 0);

/** DM der SC auf die Überraschung. */
export function pcSurpriseDm(campaign: Campaign): number {
  return sumOf(pcSurpriseParts(campaign));
}

/** DM der NSC auf die Überraschung. */
export function npcSurpriseDm(encounter: Encounter): number {
  return sumOf(npcSurpriseParts(encounter));
}

/** Die DMs auf die Überraschung je Partei, nach dem heutigen Stand der Parteien. */
export function surpriseParts(campaign: Campaign, encounter: Encounter): { readonly pcs: readonly SurpriseDmPart[]; readonly npcs: readonly SurpriseDmPart[] } {
  return { pcs: pcSurpriseParts(campaign), npcs: npcSurpriseParts(encounter) };
}

/** Ist die Überraschung der laufenden Begegnung noch nicht gewürfelt? Dann ist sie der erste Wurf im Kampf. */
export function needsSurprise(encounter: Encounter): boolean {
  return encounter.pcSurprise === undefined || encounter.npcSurprise === undefined;
}

/**
 * Der erste Wurf im Kampf (S. 5): 1W6 je Partei, mit den DMs, die die Parteien jetzt haben; beides
 * bleibt an der Begegnung. Erst danach ist jemand am Zug.
 */
export function rollSurprise(campaign: Campaign, random: Random): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new DomainError('Es läuft keine Begegnung.');
  if (!needsSurprise(encounter)) throw new DomainError('Die Überraschung ist schon gewürfelt.');
  const pcSurprise = { die: d6(random), dm: pcSurpriseDm(campaign) };
  const npcSurprise = { die: d6(random), dm: npcSurpriseDm(encounter) };
  // Mit dem ersten Wurf im Kampf bekommt jeder SC, der kämpft, seine Entfernung: das Startband.
  const distances = livingCharacters(campaign).map((c) => distanceOf(encounter, c.id));
  const rolled: Encounter = { ...encounter, pcSurprise, npcSurprise, distances };
  // Haben Tiere mit Falle Überraschung, schnappt sie bei jedem SC auf Close oder Short zu (SR 48).
  const surprised = npcSurprise.die + npcSurprise.dm - (pcSurprise.die + pcSurprise.dm) >= 3;
  const trapped = springTrap(campaign, rolled, surprised, random);
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? trapped : e)) };
}

/** Verweist ein Angriff im Log auf einen NSC dieser Begegnung? */
function isEncounterInLog(campaign: Campaign, encounter: Encounter): boolean {
  const ids = new Set(encounter.npcs.map((n) => n.id));
  return campaign.log.some((e) => (e.kind === 'attack' && (ids.has(e.for) || (e.against !== undefined && ids.has(e.against)))) || (e.kind === 'recovery' && ids.has(e.for)));
}

/** Beendet die laufende Begegnung; verweist der Log nicht auf sie, ist sie danach weg. */
export function endEncounter(campaign: Campaign): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new DomainError('Es läuft keine Begegnung.');
  if (!isEncounterInLog(campaign, encounter)) return { ...campaign, encounters: campaign.encounters.filter((e) => e.id !== encounter.id) };
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? { ...e, ended: true } : e)) };
}

/**
 * Übernimmt einen NSC der Begegnung in die Kampagne, als SC oder als dauerhaften NSC: Er wird
 * umgehängt, mit allem, was er hat, auch seinen Wunden. Er bleibt derselbe Charakter, der Log
 * verweist also weiter auf ihn. War er der Anführer, hat die Begegnung keinen mehr.
 */
export function adoptNpc(campaign: Campaign, id: string, asNpc: boolean): Campaign {
  const npc = npcOf(campaign, id);
  if (npc.animal) throw new DomainError(`${npc.name} ist ein Tier; Tiere übernimmt man nicht.`);
  const encounter = encounterOfNpc(campaign, id);
  const rest = Object.fromEntries(Object.entries(encounter).filter(([key]) => key !== 'leader' || encounter.leader !== id)) as unknown as Encounter;
  const without: Encounter = { ...rest, npcs: encounter.npcs.filter((n) => n.id !== id) };
  // Als dauerhafter NSC hat er die Rolle Begegnung und lebt auf dem Aufenthaltsort (2026-11-14).
  const adopted: Character = asNpc ? { ...npc, npc: true, role: 'encounter', ...(campaign.location === undefined ? {} : { place: campaign.location }) } : { ...npc, npc: false };
  return adoptCharacter({ ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? without : e)) }, adopted);
}

/** Ein NSC aus Spielständen von vor 2026-11-08c: kein Charakter, sondern eine eigene Art. */
interface LegacyNpc {
  readonly id: string;
  readonly name: string;
  readonly leader: boolean;
  readonly skill: number;
  readonly upp: Upp;
  /** Der Gegenstand seiner Waffe. */
  readonly wields: string;
  readonly wears?: string;
  readonly became?: CharacterId;
}

/** So viele Magazine bekommt ein NSC aus einem alten Spielstand: fest, damit das Laden nicht würfelt. */
const LEGACY_MAGAZINES = 2;

function isLegacyNpc(npc: unknown): npc is LegacyNpc {
  return typeof npc === 'object' && npc !== null && 'skill' in npc && !('skills' in npc);
}

/**
 * Schreibt einen Spielstand von vor 2026-11-08c um: Jeder NSC wird ein Charakter der Begegnung mit
 * derselben Id (Fertigkeit als Stufe, Waffe, zwei Magazine und Rüstung im Besitz), der Anführer zum
 * Verweis der Begegnung. Ein schon übernommener NSC fällt aus der Begegnung; der Log verweist dann
 * auf den Charakter, der er wurde. Im Angriff wird `by` zu `for` und `victim` zu `against`, in der
 * Heilung `npc` zu `for`. Ein heutiger Spielstand bleibt, wie er ist.
 */
export function upgradeNpcs(campaign: Campaign): Campaign {
  const became = new Map<string, CharacterId>();
  const encounters = campaign.encounters.map((encounter): Encounter => {
    const npcs: readonly unknown[] = encounter.npcs;
    if (!npcs.some(isLegacyNpc)) return encounter;
    const type = encounterTypeOfEncounter(encounter);
    let leader: CharacterId | undefined;
    const characters = npcs.flatMap((npc): Character[] => {
      if (!isLegacyNpc(npc)) return [npc as Character];
      if (npc.became !== undefined) {
        became.set(npc.id, npc.became);
        return [];
      }
      if (npc.leader) leader = npc.id;
      const magazines = weaponOf(itemOf(npc.wields).weapon!).ammo === undefined ? 0 : LEGACY_MAGAZINES;
      return [npcCharacter({ id: npc.id, name: npc.name, type, leader: npc.leader, skill: npc.skill, upp: npc.upp, weapon: npc.wields, ...(npc.wears === undefined ? {} : { armor: npc.wears }), magazines })];
    });
    return { ...encounter, npcs: characters, ...(leader === undefined ? {} : { leader }) };
  });
  const to = (id: string) => became.get(id) ?? id;
  const log = campaign.log.map((entry): LogEntry => {
    const old = entry as LogEntry & { readonly by?: string; readonly victim?: string; readonly npc?: string };
    if (entry.kind === 'attack' && (old.by !== undefined || old.victim !== undefined || became.size > 0)) {
      const { by, victim, ...rest } = old as typeof old & { readonly kind: 'attack' };
      const attacker = to(by ?? rest.for);
      const target = victim ?? rest.against;
      return { ...rest, for: attacker, ...(target === undefined ? {} : { against: to(target) }) };
    }
    if (entry.kind === 'recovery' && (old.npc !== undefined || became.size > 0)) {
      const { npc, ...rest } = old as typeof old & { readonly kind: 'recovery' };
      return { ...rest, for: to(npc ?? rest.for) };
    }
    return entry;
  });
  return { ...campaign, encounters, log };
}

/** Die Reaktion aus 2W6 und DM (S. 21): Eine echte 2 oder 12 gilt ohne DM, sonst 3 bis 12. */
export function reactionOf(dice: readonly [number, number], dm: number): number {
  const raw = dice[0] + dice[1];
  return raw === 2 || raw === 12 ? raw : Math.min(12, Math.max(3, raw + dm));
}

const VETERAN_SERVICES = ['army', 'navy', 'scouts', 'marines'];

/** −1 auf einer Welt mit Bevölkerung 9 oder mehr (S. 21). */
function populationDm(population: number | undefined): number {
  return (population ?? 0) >= 9 ? -1 : 0;
}

/** +1, wenn ein lebender SC nach seinem Lebenslauf 5 oder mehr Terms in Army, Navy, Scouts oder Marines gedient hat (S. 21). */
export function veteranDm(campaign: Campaign): number {
  const veteran = livingCharacters(campaign).some((c) => {
    if (c.career === undefined) return false;
    const state = replay(c.career);
    return VETERAN_SERVICES.includes(state.service?.id ?? '') && state.terms >= 5;
  });
  return veteran ? 1 : 0;
}

/**
 * Der DM auf die Reaktion: wie beim Würfeln festgehalten; bei Begegnungen von vorher der DM der
 * Welt, −1 bei Bevölkerung 9 oder mehr (S. 21).
 */
export function reactionDm(campaign: Campaign, encounter: Encounter): number {
  if (encounter.reactionDm !== undefined) return encounter.reactionDm;
  const world = encounter.in === undefined ? undefined : campaign.hexes.find((h) => `${String(h.column).padStart(2, '0')}${String(h.row).padStart(2, '0')}` === encounter.in);
  return populationDm(world?.uwp.population);
}
