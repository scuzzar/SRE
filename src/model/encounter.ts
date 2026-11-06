import { activeSkills, addCharacter, characterOf, livingCharacters, type Campaign, type CharacterId, type Upp } from './campaign';
import { replay } from './career';
import { DomainError } from './errors';
import type { Clock, Random } from './ports';
import { encounterTypeOf, nameSlotIds, ref, slotWithId, type EncounterType, type Item, type Range } from './reference';
import { locationOf } from './shop';

/** Ein NSC einer Begegnung: Gegner oder Fremder, getrennt von den Charakteren der Kampagne. */
export interface Npc {
  readonly id: string;
  readonly name: string;
  readonly leader: boolean;
  /** Die Stufe in der Fertigkeit seiner Waffe. */
  readonly skill: number;
  readonly upp: Upp;
  /** Verweis auf den Gegenstand, mit dem er kämpft (eine Waffe). */
  readonly wields: string;
  /** Verweis auf die getragene Rüstung; fehlt sie, Nothing. */
  readonly wears?: string;
  /** Übernommen als dieser Charakter; dann kämpft er nicht mehr in der Begegnung. */
  readonly became?: CharacterId;
}

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
  /** Die Art: der Wurf 11–56 auf der Liste. */
  readonly of: number;
  /** Die Welt, auf der sie stattfindet, als Spalte und Zeile (0304). */
  readonly in?: string;
  /** Der Wurf auf die Reactions-Tabelle, 2 bis 12, mit DMs; die Würfel fehlen bei Begegnungen von vorher. */
  readonly reaction: number;
  readonly reactionDice?: readonly [number, number];
  /** Der DM auf die Reaktion, beim Würfeln festgehalten; fehlt bei Begegnungen von vorher: der DM der Welt. */
  readonly reactionDm?: number;
  readonly ended: boolean;
  readonly npcs: readonly Npc[];
  /** Der Wurf auf die Encounter Ranges (mit dem DM des Geländes); fehlt bei Begegnungen von vorher. */
  readonly rangeDice?: readonly [number, number];
  /** Der Würfel für das Startband innerhalb der Reichweite; fehlt bei Close und Short. */
  readonly bandDie?: number;
  /** Die Entfernung in Range Bands, 0 bis 20; 21 heißt mehr als 20: entkommen. Jederzeit änderbar. */
  readonly band: number;
  /** Auf Band 0 in Berührung (Close); sonst ist Band 0 Short. Auf anderen Bändern immer falsch. */
  readonly close: boolean;
  /** Verweis auf das Gelände; fehlt es, ±0. */
  readonly terrain?: string;
  /** Die Überraschung je Partei: 1W6 und DM (S. 5). Fehlt bei Begegnungen von vor der Kampfsimulation. */
  readonly pcSurprise?: SurpriseRoll;
  readonly npcSurprise?: SurpriseRoll;
  /** Die Kampfrunde, ab 1, und wer in ihr schon dran war (Ids von SC und NSC). */
  readonly round: number;
  readonly acted: readonly string[];
}

export interface SurpriseRoll {
  readonly die: number;
  readonly dm: number;
}

export function encounterTypeOfEncounter(encounter: Encounter): EncounterType {
  const type = encounterTypeOf(encounter.of);
  if (!type) throw new DomainError(`Eine Begegnung ${encounter.of} gibt es nicht.`);
  return type;
}

/** Die laufende Begegnung; es gibt höchstens eine. */
export function currentEncounter(campaign: Campaign): Encounter | undefined {
  return campaign.encounters.find((e) => !e.ended);
}

/** Der NSC zu einer Id, in welcher Begegnung auch immer. */
export function npcOf(campaign: Campaign, id: string): Npc {
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

/** Ein Name von der Tafel NSC: ein Namensfeld zufällig, daraus Vor- und Nachname. */
function npcName(random: Random): string {
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

function armorsUpTo(tl: number): readonly Item[] {
  return ref.items.filter((i) => i.kind === 'armor' && (i.tl ?? 0) <= tl);
}

function nextNumber(ids: readonly string[], prefix: string): number {
  const numbers = ids.map((id) => Number(id.slice(prefix.length))).filter(Number.isFinite);
  return Math.max(0, ...numbers) + 1;
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
export function rollEncounter(campaign: Campaign, random: Random, clock: Clock, chosen?: number, count?: number, terrain?: string): EncounterRoll {
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
  const armors = armorsUpTo(tl);
  const first = nextNumber(
    campaign.encounters.flatMap((e) => e.npcs.map((n) => n.id)),
    'n',
  );
  const npcs: Npc[] = Array.from({ length: size }, (_, i) => {
    const leader = type.leader && i === 0;
    const upp: Upp = { str: d6(random, 2), dex: d6(random, 2), end: d6(random, 2), int: d6(random, 2), edu: d6(random, 2), soc: d6(random, 2) };
    const name = npcName(random);
    const weapon = (leader ? best(weapons) : pick(weapons, random)) ?? pick(blades, random)!;
    const armor = leader ? best(armors) : type.armor ? pick(armors, random) : undefined;
    return { id: `n${first + i}`, name, leader, skill: leader ? 2 : 1, upp, wields: weapon.id, ...(armor ? { wears: armor.id } : {}) };
  });
  const reactionDice = [d6(random), d6(random)] as const;
  const dm = populationDm(world.uwp.population) + veteranDm(campaign);
  const reaction = reactionOf(reactionDice, dm);
  const ground = terrain === undefined ? undefined : ref.encounters.terrains.find((t) => t.id === terrain);
  if (terrain !== undefined && !ground) throw new DomainError(`Das Gelände ${terrain} gibt es nicht.`);
  const rangeDice = [d6(random), d6(random)] as const;
  const pcSurprise = { die: d6(random), dm: pcSurpriseDm(campaign) };
  const npcSurprise = { die: d6(random), dm: npcSurpriseDm(type, npcs) };
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
    rangeDice,
    ...start,
    ...(ground ? { terrain: ground.id } : {}),
    pcSurprise,
    npcSurprise,
    round: 1,
    acted: [],
  };
  return { roll, campaign: { ...campaign, encounters: [...campaign.encounters, encounter] }, encounter };
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

/** Die Reichweite der Begegnung; fehlt, wenn die Parteien entkommen sind. */
export function encounterRangeOf(encounter: Encounter): Range | undefined {
  return rangeOfBand(encounter.band, encounter.close);
}

export function isEscaped(encounter: Encounter): boolean {
  return encounter.band >= ESCAPED_BAND;
}

/** Setzt die Entfernung der laufenden Begegnung auf ein Band; Berührung gibt es nur auf Band 0. */
export function setBand(campaign: Campaign, band: number, close = false): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new DomainError('Es läuft keine Begegnung.');
  if (!Number.isInteger(band) || band < 0 || band > ESCAPED_BAND) throw new DomainError(`Ein Band ${band} gibt es nicht.`);
  if (close && band !== 0) throw new DomainError('In Berührung sind die Parteien nur auf Band 0.');
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? { ...e, band, close } : e)) };
}

/**
 * Bewegt die Parteien um einen Schritt näher (−1) oder weiter weg (+1). Die Schritte sind:
 * Berührung, Band 0, Band 1 … 20, entkommen.
 */
export function moveBand(campaign: Campaign, step: -1 | 1): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new DomainError('Es läuft keine Begegnung.');
  const at = (encounter.close ? 0 : encounter.band + 1) + step;
  if (at < 0) throw new DomainError('Näher als in Berührung geht nicht.');
  if (at > ESCAPED_BAND + 1) throw new DomainError('Die Parteien sind schon entkommen.');
  return at === 0 ? setBand(campaign, 0, true) : setBand(campaign, at - 1);
}

const BATTLE_DRESS = 'battle-dress';

/** DM der SC auf die Überraschung (S. 5): Battle Dress +2, Leader +1, Tactics +1, Army oder Marines +1, 8 oder mehr −1. */
export function pcSurpriseDm(campaign: Campaign): number {
  const pcs = livingCharacters(campaign);
  const skill = (id: string) => pcs.some((c) => activeSkills(c).some((s) => s.of === id && s.level >= 1));
  const military = pcs.some((c) => c.career !== undefined && ['army', 'marines'].includes(replay(c.career).service?.id ?? ''));
  return (pcs.some((c) => c.wears === BATTLE_DRESS) ? 2 : 0) + (skill('leader') ? 1 : 0) + (skill('tactics') ? 1 : 0) + (military ? 1 : 0) - (pcs.length >= 8 ? 1 : 0);
}

/** DM der NSC auf die Überraschung: Battle Dress +2, Anführer +1, militärische Art +1, Fahrzeug −1, 8 oder mehr −1. */
export function npcSurpriseDm(type: EncounterType, npcs: readonly Npc[]): number {
  return (npcs.some((n) => n.wears === BATTLE_DRESS) ? 2 : 0) + (type.leader ? 1 : 0) + (type.military ? 1 : 0) - (type.vehicle ? 1 : 0) - (npcs.length >= 8 ? 1 : 0);
}

/** Verweist ein Angriff im Log auf einen NSC dieser Begegnung? */
function isEncounterInLog(campaign: Campaign, encounter: Encounter): boolean {
  const ids = new Set(encounter.npcs.map((n) => n.id));
  return campaign.log.some(
    (e) => (e.kind === 'attack' && ((e.by !== undefined && ids.has(e.by)) || (e.against !== undefined && ids.has(e.against)))) || (e.kind === 'recovery' && e.npc !== undefined && ids.has(e.npc)),
  );
}

/** Beendet die laufende Begegnung; verweist der Log nicht auf sie, ist sie danach weg. */
export function endEncounter(campaign: Campaign): Campaign {
  const encounter = currentEncounter(campaign);
  if (!encounter) throw new DomainError('Es läuft keine Begegnung.');
  if (!isEncounterInLog(campaign, encounter)) return { ...campaign, encounters: campaign.encounters.filter((e) => e.id !== encounter.id) };
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? { ...e, ended: true } : e)) };
}

/**
 * Übernimmt einen NSC als Charakter: als SC oder als dauerhaften NSC, mit vollem UPP, seiner Waffe
 * und Rüstung im Besitz, in der Hand und angezogen, und seiner Fertigkeit.
 */
export function adoptNpc(campaign: Campaign, id: string, asNpc: boolean): Campaign {
  const npc = npcOf(campaign, id);
  if (npc.became !== undefined) throw new DomainError(`${npc.name} ist schon übernommen.`);
  const encounter = encounterOfNpc(campaign, id);
  const weapon = ref.items.find((i) => i.id === npc.wields)!;
  const skill = ref.weapons.find((w) => w.id === weapon.weapon)!.uses;
  const { campaign: added, id: character } = addCharacter(campaign, {
    name: npc.name,
    background: `${encounterTypeOfEncounter(encounter).name}${npc.leader ? ' · Anführer' : ''}`,
    equipment: '',
    credits: 0,
    note: '',
    npc: asNpc,
    upp: npc.upp,
    skills: [{ of: skill, level: npc.skill }],
    possessions: [{ of: npc.wields, count: 1 }, ...(npc.wears ? [{ of: npc.wears, count: 1 }] : [])],
    primary: weapon.weapon!,
    wields: weapon.weapon!,
    ...(npc.wears ? { wears: npc.wears } : {}),
  });
  characterOf(added, character);
  return {
    ...added,
    encounters: added.encounters.map((e) => (e.id !== encounter.id ? e : { ...e, npcs: e.npcs.map((n) => (n.id === id ? { ...n, became: character } : n)) })),
  };
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
