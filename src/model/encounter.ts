import { activeSkills, adoptCharacter, livingCharacters, type Campaign, type Character, type CharacterId, type Possession, type Upp } from './campaign';
import { replay } from './career';
import { DomainError } from './errors';
import type { LogEntry } from './log';
import type { Clock, Random } from './ports';
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
  /** Die NSC der Begegnung: vollständige Charaktere, die an ihr hängen, nicht an der Kampagne. */
  readonly npcs: readonly Character[];
  /** Der Anführer: einer der NSC; fehlt, wenn die Begegnung keinen hat oder er übernommen ist. */
  readonly leader?: CharacterId;
  /** Der Wurf auf die Encounter Ranges (mit dem DM des Geländes); fehlt bei Begegnungen von vorher. */
  readonly rangeDice?: readonly [number, number];
  /** Der Würfel für das Startband innerhalb der Reichweite; fehlt bei Close und Short. */
  readonly bandDie?: number;
  /** Die Entfernung in Range Bands, 0 bis 20; 21 heißt mehr als 20: entkommen. Bewegt nach den Regeln, frei gesetzt nach Ermessen. */
  readonly band: number;
  /** Auf Band 0 in Berührung (Close); sonst ist Band 0 Short. Auf anderen Bändern immer falsch. */
  readonly close: boolean;
  /** Verweis auf das Gelände; fehlt es, ±0. */
  readonly terrain?: string;
  /** Wie viele Bands die SC bzw. die NSC in dieser Runde schon gegangen sind (0–2); fehlt: 0. */
  readonly pcMoved?: number;
  readonly npcMoved?: number;
  /** Wie oft die SC bzw. die NSC in der Begegnung gelaufen sind (2 Bands in einer Runde); fehlt: 0. Kostet je Lauf einen Combat-Schlag. */
  readonly pcRuns?: number;
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

export interface SurpriseRoll {
  readonly die: number;
  readonly dm: number;
}

export function encounterTypeOfEncounter(encounter: Encounter): EncounterType {
  const type = encounterTypeOf(encounter.of);
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
  ];
  return {
    id: setup.id,
    name: setup.name,
    background: `${setup.type.name}${setup.leader ? ' · Anführer' : ''}`,
    equipment: '',
    credits: 0,
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
  const guns = weaponsUpTo(tl, true);
  const armors = armorsUpTo(tl, type.military === true);
  const heavyArmors = armorsUpTo(tl, true);
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
    return npcCharacter({ id: `n${first + i}`, name, type, leader, skill: leader ? 2 : 1, upp, weapon: weapon.id, ...(armor ? { armor: armor.id } : {}), magazines });
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
    ...start,
    ...(ground ? { terrain: ground.id } : {}),
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
  const type = encounterTypeOfEncounter(encounter);
  const npcs = encounter.npcs;
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
  return { ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? { ...e, pcSurprise, npcSurprise } : e)) };
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
  const encounter = encounterOfNpc(campaign, id);
  const rest = Object.fromEntries(Object.entries(encounter).filter(([key]) => key !== 'leader' || encounter.leader !== id)) as unknown as Encounter;
  const without: Encounter = { ...rest, npcs: encounter.npcs.filter((n) => n.id !== id) };
  return adoptCharacter({ ...campaign, encounters: campaign.encounters.map((e) => (e.id === encounter.id ? without : e)) }, { ...npc, npc: asNpc });
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
