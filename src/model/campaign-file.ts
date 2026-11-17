import { z } from 'zod';
import { anyCharacterOf, EPOCH, keepFocus, npcRoles, validateCharacter, validName, type Stamp, type Campaign, type CampaignId, type Character, type Possession } from './campaign';
import { replay, type Career, type CareerRoll } from './career';
import { DomainError } from './errors';
import { mapDirections, minMapPaths, pathKinds, scatters, type MapDirection, type PathKind } from './card-roll';
import { animalIds, checkDamageRoll, checkVolley, filterDiceOf, ATTACK_TARGET } from './combat';
import { FILTER_HELD_TARGET, FILTER_TARGET } from './hold';
import { checkEventDamage, checkSave } from './events';
import { checkButchering } from './loot';
import { encounterAnimalRow, ESCAPED_BAND, upgradeDistances, upgradeNpcs, type Encounter } from './encounter';
import { animalRowOf, animalTypeOf, checkAnimalTable, eventRowOf, terrainOf } from './animals';
import { animalTraits } from '../data';
import { checkJourney } from './travel';
import { START_DAY } from './time';
import { checkOf, encounterChecks } from './encounter-check';
import { checkInterprets, checkKinds, isRandomEvent, physical, recoveryKinds, strikes, withQuestion, type AttackResult, type Butchering, type CardPick, type CheckRoll, type Journey, type DamageRoll, type LogEntry, type Note, type Recovery, type TripDay } from './log';
import { checkRecovery } from './wounds';
import { armorClasses, encounterTypeOf, entryOf, itemOf, oddsOf, patronOf, ranges, ref, shipDesignOf, slotOfEntry, softwareOf, weaponOf } from './reference';
import { characteristics } from './rules';
import { bookingKinds, shipCosts, validateBookings, type Booking } from './shop';
import type { Ship } from './ship';
import { checkTrip } from './trip';
import { vehicleOfItem } from './vehicle';
import { settleStash } from './stash';
import type { City, SurfaceMap } from './surface-map';
import { checkPlace, type Place } from './place';
import { hexById, hexFromRolls, temperatureIds, uwpKinds, validateHexes, worldOf, type Hex, type LegacyWorldRoll } from './sector';

/**
 * Die Kampagnendatei: eine Kampagne als JSON, zum Sichern und Weitergeben. Sie enthält alles, was an
 * der Kampagne hängt, aber keine Entwürfe und keine Referenzdaten; Verweise bleiben Ids.
 */
export const campaignFileFormat = 'solo-rpg-engine/kampagne';
export const campaignFileVersion = 1;

const die = z.number().int().min(1).max(6);
const dice = z.tuple([die, die]);
const at = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'kein Zeitpunkt');
const question = z.string().trim().min(1).optional();
/** Der Spieltag eines Eintrags; fehlt bei Einträgen von vor der Spielzeit. */
const day = z.number().int().min(0).optional();

/** Ein Ort (2026-11-14j); Dateien von davor nennen nur die Welt als Text (0304). */
const PlaceSchema = z.union([z.string().min(1), z.object({ world: z.string().min(1), cell: z.number().int().optional(), city: z.number().int().optional() })]);

function placeFromFile(place: z.infer<typeof PlaceSchema>): Place {
  return typeof place === 'string' ? { world: place } : (stripped(place) as Place);
}

/** Wo ein Logeintrag geschah (2026-11-14j); fehlt bei Einträgen ohne Ort. */
const place = PlaceSchema.optional();

const LogEntrySchema = z.discriminatedUnion('kind', [
  // Orakelantworten von vor 2026-11-14d; beim Lesen werden sie zu Kartenauswahlen (upgradeOracle).
  z.object({ kind: z.literal('oracle'), at, day, place, question, roll: z.number().int().min(1).max(100), chance: z.number().int().min(0).max(100), odds: z.string() }),
  z.object({ kind: z.literal('dice'), at, day, place, dice }),
  z.object({
    kind: z.literal('card'),
    at,
    day,
    place,
    question,
    bell: z.number().int().min(1).max(10).optional(),
    scatter: z.enum(scatters).optional(),
    map: z.object(Object.fromEntries(mapDirections.map((d) => [d, z.enum(pathKinds)])) as Record<MapDirection, z.ZodEnum<{ [K in PathKind]: K }>>).optional(),
    oracle: z.number().int().min(1).max(100).optional(),
    odds: z.string().optional(),
    chance: z.number().int().min(0).max(100).optional(),
    eventFocus: z.number().int().min(1).max(100).optional(),
    items: z.array(z.object({ picked: z.array(z.string()).min(1).max(2) })),
  }),
  z.object({
    kind: z.literal('task'),
    at,
    day,
    place,
    for: z.string(),
    uses: z.string().optional(),
    counts: z.array(z.enum(characteristics)),
    odds: z.string(),
    dice,
    dm: z.number().int(),
    target: z.number().int(),
  }),
  z.object({
    kind: z.literal('attack'),
    at,
    day,
    place,
    /** Fehlt in Dateien von vor 2026-11-08c, wenn ein NSC angriff (`by`); `victim` war dort ein SC als Ziel. */
    for: z.string().optional(),
    by: z.string().optional(),
    against: z.string().optional(),
    victim: z.string().optional(),
    with: z.string(),
    uses: z.string().optional(),
    armor: z.enum(armorClasses),
    range: z.enum(ranges),
    dice,
    dm: z.number().int(),
    target: z.number().int(),
    volley: z.number().int().optional(),
    strike: z.enum(strikes).optional(),
  }),
  z.object({ kind: z.literal('save'), at, day, place, for: z.string().min(1), of: z.number().int(), dice, target: z.number().int() }),
  z.object({ kind: z.literal('damage'), at, day, place, of: z.number().int().optional(), after: z.number().int().optional(), dice: z.array(die).max(40), fixed: z.number().int().min(1).optional(), to: z.array(z.enum(physical)).max(40).optional(), points: z.array(z.number().int().min(1)).max(40).optional(), alarmDice: z.tuple([die, die]).optional() }),
  z.object({
    kind: z.literal('recovery'),
    at,
    day,
    place,
    how: z.enum(recoveryKinds),
    /** Fehlt in Dateien von vor 2026-11-08c, wenn ein NSC geheilt wurde (`npc`). */
    for: z.string().optional(),
    npc: z.string().optional(),
    by: z.string().optional(),
    dice: z.array(die).length(5).optional(),
  }),
  z.object({ kind: z.literal('rumor'), at, day, place, dice }),
  z.object({ kind: z.literal('butchering'), at, day, place, /** Wer die Beute bekam; in Dateien von vor dem Gruppengepäck, wird nicht übernommen. */ for: z.string().min(1).optional(), of: z.string().min(1), meatDie: die.optional(), meatSkill: z.number().int().min(0), furSkill: z.number().int().min(0) }),
  z.object({ kind: z.literal('event'), at, day, place, in: z.string().min(1), terrain: z.string().min(1), tableDice: dice }),
  z.object({ kind: z.literal('patron'), at, day, place, list: z.union([z.literal(1), z.literal(2)]), dice, dms: z.tuple([z.number().int(), z.number().int()]) }),
  z.object({ kind: z.literal('note'), at, day, place, text: z.string().trim().min(1), interprets: z.number().int().optional(), editedAt: at.optional() }),
  z.object({ kind: z.literal('time'), at, day, place, days: z.number().int().min(1).max(7), week: z.boolean() }),
  z.object({ kind: z.literal('monthEnd'), at, day, place, costsFrom: z.number().int().min(0), costsTo: z.number().int().min(0) }),
  z.object({ kind: z.literal('tripDay'), at, day, place, hours: z.number().positive(), rent: z.number().int().min(0), fare: z.number().int().min(0).optional(), arrived: z.boolean() }),
  z.object({ kind: z.literal('check'), at, day, place, check: z.enum(checkKinds), dice: z.array(die).min(1).max(2), target: z.number().int().min(0).max(20), reactionDice: dice.optional(), reactionDm: z.number().int().optional() }),
  z.object({
    kind: z.literal('journey'),
    at,
    day,
    place,
    from: z.string().min(1),
    to: z.string().min(1),
    days: z.number().int(),
    passengers: z.array(z.object({ for: z.string().min(1), passage: z.string().min(1) })),
    berths: z.array(z.object({ for: z.string().min(1).optional(), revive: dice, dm: z.number().int(), guess: z.number().int() })).max(60),
    npcDie: die.optional(),
    lot: z.number().int().optional(),
    ship: z.string().min(1).optional(),
    jump: dice.optional(),
  }),
]);

const CareerRollSchema = z.object({
  kind: z.enum(['characteristic', 'enlistment', 'draft', 'survival', 'commission', 'promotion', 'skill', 'aging', 'crisis', 'reenlist', 'cash', 'benefit']),
  dice: z.array(die).min(1).max(2),
  dm: z.number().int(),
  target: z.number().int().optional(),
  wants: z.boolean().optional(),
  of: z.enum(characteristics).optional(),
  for: z.string().optional(),
  on: z.string().optional(),
  gained: z.string().optional(),
  chosen: z.string().optional(),
  against: z.string().optional(),
  shipChoice: z.enum(['keep', 'switch']).optional(),
});
const CareerSchema = z.object({ rolls: z.array(CareerRollSchema), homeworld: z.string().optional(), worlds: z.array(z.string()).optional() });

const MapSchema = z
  .object({
    landforms: z.string(),
    towns: z.array(z.tuple([z.number().int(), z.number().int()])).optional(),
    volcanoes: z.array(z.tuple([z.number().int(), z.enum(['major', 'field'])])).optional(),
    rivers: z.array(z.array(z.number().int())).optional(),
    roads: z.array(z.array(z.number().int())).optional(),
    cities: z
      .array(
        z.object({
          cell: z.number().int().optional(),
          name: z.string().optional(),
          population: z.number().int(),
          multiplier: z.number().int(),
          rank: z.enum(['primary', 'secondary']),
          port: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']).optional(),
        }),
      )
      .optional(),
  });

const position = { column: z.number().int(), row: z.number().int(), name: z.string().optional() };
const HexSchema = z.union([
  z.object({
    ...position,
    empty: z.boolean(),
    navalBase: z.boolean().optional(),
    scoutBase: z.boolean().optional(),
    gasGiant: z.boolean().optional(),
    uwp: z.object(Object.fromEntries(uwpKinds.map((k) => [k, z.number().int().optional()])) as Record<(typeof uwpKinds)[number], z.ZodOptional<z.ZodNumber>>),
    temperature: z.enum(temperatureIds).optional(),
    note: z.string().optional(),
    populationMultiplier: z.number().int().optional(),
    map: MapSchema.optional(),
    surface: z
      .object({
        water: z.number().int(),
        plates: z.number().int(),
        majorContinents: z.number().int(),
        minorContinents: z.number().int(),
        majorIslands: z.number().int(),
        archipelagos: z.number().int(),
        majorOceans: z.number().int(),
        minorOceans: z.number().int(),
        smallSeas: z.number().int(),
        scatteredLakes: z.number().int(),
        life: z.boolean(),
      })
      .optional(),
    animals: z
      .array(
        z.object({
          terrain: z.string().min(1),
          rows: z.array(
            z.object({
              roll: z.number().int().min(2).max(12),
              event: z.string().optional(),
              type: z.string().optional(),
              quantity: z.number().int().min(1).max(5).optional(),
              trait: z.enum(animalTraits).optional(),
              traitSizeDm: z.number().int().optional(),
              weight: z.number().int().min(1).optional(),
              hits: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
              armor: z.enum(armorClasses).optional(),
              armorDm: z.number().int().optional(),
              attacks: z.array(z.object({ with: z.string().min(1), dm: z.number().int(), damage: z.number().int().min(1) })).min(1).max(2).optional(),
              attack: z.number().int().min(0).optional(),
              flee: z.number().int().min(0).optional(),
              speed: z.number().int().min(0).optional(),
              market: z.number().int().min(3).max(18).optional(),
              edible: z.boolean().optional(),
            }),
          ),
        }),
      )
      .optional(),
  }),
  /** Aus der Zeit, als ein Hexfeld seine Würfe hielt; wird nachgespielt und als Werte übernommen. */
  z.object({
    ...position,
    rolls: z.array(
      z.object({
        kind: z.enum(['occurrence', 'starport', 'navalBase', 'scoutBase', 'gasGiant', 'size', 'atmosphere', 'hydrographics', 'population', 'government', 'law', 'tech']),
        dice: z.array(die).min(1).max(2),
        dm: z.number().int(),
        target: z.number().int().optional(),
      }),
    ),
  }),
]);

const value = z.number();
const PossessionSchema = z.object({ of: z.string(), count: z.number(), rounds: z.number().optional(), from: z.object({ in: z.string().min(1), terrain: z.string().min(1), roll: z.number().int().min(2).max(12) }).optional() });
/** Im Gruppengepäck: dazu der Ort eines abgestellten Fahrzeugs (2026-11-15). */
const StashPossessionSchema = PossessionSchema.extend({ parked: PlaceSchema.optional() });
/** Die Fahrt der Gruppe (2026-11-15). */
const TripSchema = z.object({
  hours: z.number().min(0),
  legs: z.array(z.object({ by: z.string().min(1), rented: z.boolean(), cells: z.array(z.number().int().min(0)).min(2) })).min(1),
});
/** Ein Schiff der Kampagne (2026-11-16); Deckpläne sind Geräte-Daten und nie Teil der Datei. */
const ShipSchema = z.object({
  id: z.string().min(1),
  design: z.string().min(1),
  name: z.string().min(1),
  fuel: z.number().int().min(0),
  cargo: z.number().int().min(0),
  price: z.number().int().min(0),
  initialLoan: z.number().int().min(0).optional(),
  loanBalance: z.number().int().min(0).optional(),
  nextPaymentDay: z.number().int().min(0).optional(),
  berthedSince: z.number().int().min(0).optional(),
  retired: z.boolean().default(false),
  software: z.array(z.object({ program: z.string().min(1) })).default([]),
});
const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  background: z.string(),
  equipment: z.string(),
  credits: z.number(),
  note: z.string(),
  dead: z.boolean().default(false),
  retired: z.boolean(),
  upp: z.object({ str: value, dex: value, end: value, int: value, edu: value, soc: value }),
  skills: z.array(z.object({ of: z.string(), level: z.number(), retired: z.boolean() })),
  possessions: z.array(PossessionSchema).default([]),
  career: CareerSchema.optional(),
  homeworld: z.string().optional(),
  /** Fehlen in Dateien von vor der Primär- und Sekundärwaffe; dann ist die Waffe in der Hand die Primärwaffe. */
  primary: z.string().optional(),
  secondary: z.string().optional(),
  wields: z.string().optional(),
  wears: z.string().optional(),
  /** Fehlt in Dateien von vor den NSC: ein SC. */
  npc: z.boolean().default(false),
  /** Fehlen in Dateien von vor 2026-11-14; ein NSC ohne Rolle ist Sonstige. */
  role: z.enum(npcRoles).optional(),
  place: PlaceSchema.optional(),
  patron: z.object({ list: z.number().int(), roll: z.number().int() }).optional(),
  animal: z.object({ in: z.string().min(1), terrain: z.string().min(1), roll: z.number().int().min(2).max(12) }).optional(),
});

/** Ein NSC aus Dateien von vor 2026-11-08c; heute ist ein NSC der Begegnung ein Charakter. */
const LegacyNpcSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  leader: z.boolean(),
  skill: z.number().int().min(0),
  upp: z.object({ str: value, dex: value, end: value, int: value, edu: value, soc: value }),
  wields: z.string(),
  wears: z.string().optional(),
  became: z.string().optional(),
});

const EncounterSchema = z
  .object({
    id: z.string().min(1),
    at,
    of: z.number().int().optional(),
    animal: z.number().int().min(2).max(12).optional(),
    tableDice: z.tuple([die, die]).optional(),
    attackDice: z.tuple([die, die]).optional(),
    fleeDice: z.tuple([die, die]).optional(),
    lureDice: z.tuple([die, die]).optional(),
    in: z.string().optional(),
    reaction: z.number().int().min(2).max(12).optional(),
    reactionDice: z.tuple([die, die]).optional(),
    /** Fehlen bei Begegnungen von vor dem Würfel der Anzahl bzw. dem festgehaltenen DM. */
    reactionDm: z.number().int().optional(),
    quantityDie: z.union([z.literal(3), z.literal(4), z.literal(6)]).optional(),
    ended: z.boolean(),
    npcs: z.array(z.union([CharacterSchema, LegacyNpcSchema])),
    leader: z.string().optional(),
    /** Fehlen bei Begegnungen von vor der Kampfsimulation. */
    rangeDice: z.tuple([die, die]).optional(),
    bandDie: z.number().int().min(1).max(10).optional(),
    /** Das Startband; fehlt bei Begegnungen von vor 2026-11-08d, dann gilt `band` (davor das erste Band der Reichweite `range`). */
    startBand: z.number().int().min(0).max(ESCAPED_BAND - 1).optional(),
    startClose: z.boolean().optional(),
    band: z.number().int().min(0).max(ESCAPED_BAND).optional(),
    close: z.boolean().optional(),
    range: z.enum(ranges).optional(),
    distances: z
      .array(
        z.object({
          of: z.string().min(1),
          band: z.number().int().min(0).max(ESCAPED_BAND),
          close: z.boolean(),
          moved: z.number().int().min(0).max(2).optional(),
          runs: z.number().int().min(0).optional(),
          trapDice: z.tuple([die, die]).optional(),
          held: z.boolean().optional(),
          struggles: z.number().int().min(0).optional(),
        }),
      )
      .optional(),
    evading: z.array(z.string()).optional(),
    terrain: z.string().optional(),
    pcSurprise: z.object({ die, dm: z.number().int() }).optional(),
    npcSurprise: z.object({ die, dm: z.number().int() }).optional(),
    round: z.number().int().min(1).default(1),
    acted: z.array(z.string()).default([]),
    pcMoved: z.number().int().min(0).max(2).optional(),
    npcMoved: z.number().int().min(0).max(6).optional(),
    pcRuns: z.number().int().min(0).optional(),
    npcRuns: z.number().int().min(0).optional(),
    alarm: z.number().int().min(1).optional(),
    joined: z.array(z.string()).min(1).optional(),
  })
  .refine((e) => (e.of === undefined) !== (e.animal === undefined) || (e.of === undefined && e.animal === undefined && e.joined !== undefined), 'Eine Begegnung hat eine Art, eine Tierzeile oder dazugenommene NSC.')
  .refine((e) => e.animal === undefined || e.joined === undefined, 'Zu Tieren nimmt man keine NSC dazu.')
  .refine((e) => e.animal !== undefined || e.reaction !== undefined, 'Eine Begegnung mit Personen hat eine Reaktion.')
  .refine((e) => !e.startClose || e.startBand === 0, 'In Berührung beginnt eine Begegnung nur auf Band 0.')
  .refine((e) => (e.distances ?? []).every((d) => !d.close || d.band === 0), 'In Berührung ist ein SC nur auf Band 0.');

const CampaignFileSchema = z.object({
  format: z.literal(campaignFileFormat),
  version: z.literal(campaignFileVersion),
  campaign: z.object({
    name: z.string(),
    /** Schlüssel und Änderungszeit, für den Abgleich; fehlen in Dateien von vorher. Ein Import vergibt sie neu. */
    key: z.string().trim().min(1).optional(),
    changedAt: at.optional(),
    odds: z.string(),
    characters: z.array(CharacterSchema),
    log: z.array(LogEntrySchema),
    generation: z.object({ career: CareerSchema }).optional(),
    /** Fehlt in Dateien von vor dem Subsektor. */
    hexes: z.array(HexSchema).default([]),
    /** Der Charakter oben; fehlt in Dateien von vor dieser Regel, dann wird es der erste Lebende. */
    focus: z.string().optional(),
    /** Fehlen in Dateien von vor dem Shop bzw. den Begegnungen. */
    location: PlaceSchema.optional(),
    encounters: z.array(EncounterSchema).default([]),
    /** Fehlt in Dateien von vor dem Würfel der Anzahl: W6. */
    quantityDie: z.union([z.literal(3), z.literal(4), z.literal(6)]).optional(),
    /** Das Gelände für alle Begegnungsarten; fehlt in Dateien von vorher. */
    terrain: z.string().optional(),
    /** Der heutige Tag im Spiel; fehlt in Dateien von vor der Spielzeit: 001-1105. */
    day: z.number().int().min(0).default(START_DAY),
    /** Das Gruppengepäck; fehlt in Dateien von vorher, dann ordnet settleStash den Besitz der SC ein. */
    stash: z.array(StashPossessionSchema).default([]),
    /** Fehlt in Dateien von vor den Fahrten und ohne Fahrt. */
    trip: TripSchema.optional(),
    bookings: z
      .array(
        z.object({
          at,
          kind: z.enum(bookingKinds),
          amount: z.number(),
          text: z.string().trim().min(1).optional(),
          for: z.string().optional(),
          bought: z.string().optional(),
          sold: z.string().optional(),
          count: z.number().int().min(1).optional(),
          in: z.string().optional(),
          won: z.number().int().optional(),
          rentFor: z.number().int().optional(),
          forShip: z.string().min(1).optional(),
          shipCost: z.enum(shipCosts).optional(),
        }),
      )
      .default([]),
    /** Alle Schiffe, auch die ausgeblendeten; fehlt in Dateien von vor den Schiffen: keins. */
    ships: z.array(ShipSchema).default([]),
  }),
});

/** Die Kampagne als Inhalt einer Kampagnendatei. */
export function toCampaignFile(campaign: Campaign): string {
  const { key, changedAt, name, odds, characters, log, generation, hexes, focus, location, bookings, ships, stash, encounters, quantityDie, terrain, day, trip } = campaign;
  return JSON.stringify({ format: campaignFileFormat, version: campaignFileVersion, campaign: { key, changedAt, name, odds, characters, log, generation, hexes, focus, location, bookings, ships, stash, encounters, quantityDie, terrain, day, trip } }, null, 2);
}

/** Ein Dateiname aus dem Namen der Kampagne und dem Tag, z. B. „Spinward-Run-2026-10-25.json“. */
export function campaignFileName(campaign: Campaign, now: string): string {
  const base = campaign.name.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'Kampagne';
  return `${base}-${now.slice(0, 10)}.json`;
}

/**
 * Liest eine Kampagnendatei und prüft sie gegen die Regeln des Modells, auch jeden Verweis. Ist
 * etwas falsch, gibt es einen DomainError und keine Kampagne. Die Kampagne bekommt die Id `id` und
 * als neue Kampagne Schlüssel und Änderungszeit aus `stamp`, nicht die der Datei.
 */
export function fromCampaignFile(text: string, id: CampaignId, stamp: Stamp = { key: `key-${id}`, changedAt: EPOCH }): Campaign {
  return readCampaignFile(text, id, () => stamp);
}

/**
 * Liest eine Kampagnendatei aus der Wolke: wie `fromCampaignFile`, aber die Kampagne behält Schlüssel
 * und Änderungszeit der Datei. Der Schlüssel muss der sein, unter dem die Datei liegt.
 */
export function fromCloudFile(text: string, id: CampaignId, key: string): Campaign {
  return readCampaignFile(text, id, (file) => {
    if (file.key !== key || file.changedAt === undefined) throw new DomainError('Die Datei gehört nicht zu dieser Kampagne (Schlüssel oder Änderungszeit fehlen).');
    return { key, changedAt: file.changedAt };
  });
}

function readCampaignFile(text: string, id: CampaignId, stampOf: (file: { readonly key?: string | undefined; readonly changedAt?: string | undefined }) => Stamp): Campaign {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new DomainError('Die Datei ist keine Kampagnendatei (kein JSON).');
  }
  const parsed = CampaignFileSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DomainError(`Die Datei ist keine gültige Kampagnendatei${issue ? ` (${issue.path.join('.') || issue.message})` : ''}.`);
  }
  try {
    const file = parsed.data.campaign;
    const characters: Character[] = file.characters.map(characterFromFile);
    const read: Campaign = {
      id,
      ...stampOf(file),
      name: validName(file.name),
      odds: oddsOf(file.odds).id,
      characters,
      log: file.log.map(logEntry),
      hexes: file.hexes.map(hexOf),
      ...(file.generation ? { generation: { career: careerOf(file.generation.career) } } : {}),
      ...(file.focus === undefined ? {} : { focus: file.focus }),
      ...(file.location === undefined ? {} : { location: placeFromFile(file.location) }),
      bookings: file.bookings.map((b) => stripped(b) as Booking),
      ships: file.ships.map((s) => stripped(s) as Ship),
      stash: file.stash.map((p) => stripped({ ...p, ...(p.parked === undefined ? {} : { parked: placeFromFile(p.parked) }) }) as Possession),
      ...(file.trip === undefined ? {} : { trip: { hours: file.trip.hours, legs: file.trip.legs.map((l) => ({ by: l.by, rented: l.rented, cells: [...l.cells] })) } }),
      // NSC aus Dateien von vor 2026-11-08c bleiben, wie sie sind; upgradeNpcs macht Charaktere aus ihnen.
      encounters: file.encounters.map(
        (e) => ({ ...stripped(e), ...(e.distances ? { distances: e.distances.map((d) => stripped(d)) } : {}), npcs: e.npcs.map((n) => ('skill' in n ? stripped(n) : characterFromFile(n))) }) as unknown as Encounter,
      ),
      ...(file.quantityDie === undefined || file.quantityDie === 6 ? {} : { quantityDie: file.quantityDie }),
      ...(file.terrain === undefined ? {} : { terrain: file.terrain }),
      day: file.day,
    };
    // Begegnungen von vor 2026-11-08d haben ein Band für alle; upgradeDistances macht das Startband daraus.
    // Erst prüfen, dann ordnen: Dateien von vor dem Gruppengepäck halten allen Besitz am SC; was er
    // nicht ausgerüstet hat, kommt danach ins Gepäck. So weist die Prüfung auch eine Waffe in der
    // Hand zurück, die nicht im Besitz ist, statt dass das Ordnen sie stillschweigend wegnimmt.
    const upgraded = upgradeDistances(upgradeNpcs(read));
    validate(upgraded);
    const campaign = settleStash(upgraded);
    return keepFocus(campaign, campaign);
  } catch (error) {
    if (error instanceof DomainError) throw new DomainError(`Die Kampagne in der Datei verletzt eine Regel: ${error.message}`);
    throw error;
  }
}

/** Ein Charakter aus der Datei, ohne leere optionale Felder. */
function characterFromFile({ career, homeworld, primary, secondary, wields, wears, animal, role, place, patron, ...c }: z.infer<typeof CharacterSchema>): Character {
  return {
    ...c,
    ...(role === undefined ? {} : { role }),
    ...(place === undefined ? {} : { place: placeFromFile(place) }),
    ...(patron === undefined ? {} : { patron: { list: patron.list, roll: patron.roll } }),
    ...(animal ? { animal: { ...animal } } : {}),
    skills: c.skills.map((s) => ({ ...s })),
    possessions: c.possessions.map((p) => stripped(p) as Possession),
    ...(career ? { career: careerOf(career) } : {}),
    ...(homeworld === undefined ? {} : { homeworld }),
    ...armsFromFile(primary, secondary, wields),
    ...(wears === undefined ? {} : { wears }),
  };
}

/** Ein Lebenslauf ohne leere optionale Felder, wie er im Spielstand steht. */
function careerOf(career: z.infer<typeof CareerSchema>): Career {
  return {
    ...(career.homeworld === undefined ? {} : { homeworld: career.homeworld }),
    ...(career.worlds === undefined ? {} : { worlds: career.worlds }),
    rolls: career.rolls.map((roll) => Object.fromEntries(Object.entries(roll).filter(([, v]) => v !== undefined)) as unknown as CareerRoll),
  };
}

/** Eine Oberflächenkarte ohne leere optionale Felder; Städte ohne Feld bleiben im Orbit. */
function mapOf(map: z.infer<typeof MapSchema>): SurfaceMap {
  return {
    landforms: map.landforms,
    ...(map.towns ? { towns: map.towns.map(([c, n]) => [c, n] as const) } : {}),
    ...(map.volcanoes ? { volcanoes: map.volcanoes.map(([c, k]) => [c, k] as const) } : {}),
    ...(map.rivers ? { rivers: map.rivers.map((r) => [...r]) } : {}),
    ...(map.roads ? { roads: map.roads.map((r) => [...r]) } : {}),
    // Karten von vor den Städtenamen (2026-11-14k): „Stadt 1“, „Stadt 2“ …
    ...(map.cities ? { cities: map.cities.map((c, i) => ({ ...(stripped(c) as City), name: c.name ?? `Stadt ${i + 1}` })) } : {}),
  };
}

/** Ein Hexfeld ohne leere optionale Felder, wie es im Spielstand steht. */
function hexOf(hex: z.infer<typeof HexSchema>): Hex {
  if ('rolls' in hex) {
    const rolls = hex.rolls.map((r) => stripped(r) as LegacyWorldRoll);
    return hexFromRolls(hex.name === undefined ? { column: hex.column, row: hex.row, rolls } : { column: hex.column, row: hex.row, name: hex.name, rolls });
  }
  const { animals, map, ...rest } = hex;
  return { ...stripped(rest), uwp: stripped(hex.uwp), ...(map ? { map: mapOf(map) } : {}), ...(animals ? { animals: animals.map((t) => ({ terrain: t.terrain, rows: t.rows.map((r) => stripped({ ...r, ...(r.attacks ? { attacks: r.attacks.map((a) => ({ ...a })) } : {}) })) })) } : {}) } as Hex;
}

/** Ein Objekt ohne Felder, die `undefined` sind. */
function stripped<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

type FileEntry = z.infer<typeof LogEntrySchema>;
type WithoutDay<T> = T extends unknown ? Omit<T, 'day' | 'place'> : never;

/** Ohne leere optionale Felder, wie sie im Spielstand stehen; den Spieltag nur, wenn es einen gibt. */
function logEntry(input: FileEntry): LogEntry {
  const { day, place, ...entry } = input;
  const read = fileEntryOf(entry as WithoutDay<FileEntry>);
  return { ...read, ...(day === undefined ? {} : { day }), ...(place === undefined ? {} : { place: placeFromFile(place) }) };
}

function fileEntryOf(entry: WithoutDay<FileEntry>): LogEntry {
  switch (entry.kind) {
    case 'oracle': {
      const { question, roll, ...rest } = entry;
      return withQuestion({ ...rest, kind: 'card', oracle: roll, items: [] } satisfies CardPick, question);
    }
    case 'card': {
      const { question, ...rest } = entry;
      return withQuestion(stripped(rest) as Omit<CardPick, 'question'>, question);
    }
    case 'task': {
      const { uses, ...rest } = entry;
      return uses === undefined ? rest : { ...rest, uses };
    }
    case 'attack':
      return stripped(entry) as AttackResult;
    case 'damage':
      return stripped(entry) as DamageRoll;
    case 'recovery':
      return stripped(entry) as Recovery;
    case 'dice':
    case 'patron':
    case 'rumor':
    case 'event':
    case 'save':
    case 'time':
    case 'monthEnd':
      return entry;
    case 'tripDay':
      return stripped(entry) as TripDay;
    case 'check':
      return stripped(entry) as CheckRoll;
    case 'journey':
      return stripped({ ...entry, passengers: entry.passengers.map((p) => ({ ...p })), berths: entry.berths.map((b) => stripped(b)) }) as Journey;
    case 'butchering':
      // Wer die Beute bekam, steht in Dateien von vor dem Gruppengepäck; die Beute liegt heute im Gepäck.
      return stripped(Object.fromEntries(Object.entries(entry).filter(([key]) => key !== 'for'))) as unknown as Butchering;
    case 'note':
      return stripped(entry) as Note;
  }
}

/** Primär-, Sekundärwaffe und Waffe in der Hand aus der Datei; ältere Dateien kennen nur die Waffe in der Hand: Sie wird die Primärwaffe. */
function armsFromFile(primary: string | undefined, secondary: string | undefined, wields: string | undefined): Pick<Character, 'primary' | 'secondary' | 'wields'> {
  const first = primary ?? (secondary === undefined ? wields : undefined);
  return { ...(first === undefined ? {} : { primary: first }), ...(secondary === undefined ? {} : { secondary }), ...(wields === undefined ? {} : { wields }) };
}

/** Ein Charakter, SC oder NSC einer Begegnung: Werte, Waffen und Rüstung aus seinem Besitz, Lebenslauf abgeschlossen. */
function validateRecord(character: Character): void {
  const { place, ...rest } = character;
  validateCharacter({ ...rest, skills: character.skills, ...(place === undefined ? {} : { place: place.world }) });
  // Ein Tier hat keinen Besitz; seine Waffen sind die Tierangriffe seiner Zeile.
  if (character.animal !== undefined) return;
  for (const weapon of [character.primary, character.secondary, character.wields]) {
    if (weapon !== undefined && !character.possessions.some((p) => weaponOfItem(p.of) === weapon)) throw new DomainError(`${character.name} führt eine Waffe, die nicht im Besitz ist.`);
  }
  if (character.secondary !== undefined && character.secondary === character.primary) throw new DomainError(`${character.name} hat dieselbe Waffe als Primär- und Sekundärwaffe.`);
  if (character.wields !== undefined && character.wields !== character.primary && character.wields !== character.secondary) {
    throw new DomainError(`${character.name} hat eine Waffe in der Hand, die weder Primär- noch Sekundärwaffe ist.`);
  }
  if (character.wears !== undefined && !character.possessions.some((p) => p.of === character.wears)) {
    throw new DomainError(`${character.name} trägt eine Rüstung, die nicht im Besitz ist.`);
  }
  // Ein Lebenslauf wird von vorn nachgespielt; am Charakter ist er abgeschlossen.
  if (character.career && replay(character.career).step !== 'name') throw new DomainError(`Der Lebenslauf von ${character.name} ist nicht abgeschlossen.`);
}

function validate(campaign: Campaign): void {
  // Jeder Charakter gehört genau einer Kampagne oder einer Begegnung; die Ids sind über beide eindeutig.
  const ids = new Set<string>();
  for (const character of [...campaign.characters, ...campaign.encounters.flatMap((e) => e.npcs)]) {
    if (ids.has(character.id)) throw new DomainError(`Die Id ${character.id} kommt doppelt vor.`);
    ids.add(character.id);
    validateRecord(character);
  }
  if (campaign.generation) replay(campaign.generation.career);
  if (campaign.focus !== undefined) {
    const focus = campaign.characters.find((c) => c.id === campaign.focus);
    if (!focus) throw new DomainError(`Der Charakter oben (${campaign.focus}) ist keiner der Kampagne.`);
    if (focus.dead || focus.retired) throw new DomainError(`Der Charakter oben (${focus.name}) lebt nicht oder ist ausgeblendet.`);
  }
  validateHexes(campaign.hexes);
  if (campaign.location !== undefined) checkPlace(campaign.hexes, campaign.location);
  validateBookings(campaign);
  // Jedes Schiff hat eine eigene Id, einen Entwurf der Werft und Programme der Software-Liste; aktiv ist höchstens eins.
  const shipIds = new Set<string>();
  for (const ship of campaign.ships) {
    if (shipIds.has(ship.id)) throw new DomainError(`Die Schiffs-Id ${ship.id} kommt doppelt vor.`);
    shipIds.add(ship.id);
    shipDesignOf(ship.design);
    for (const board of ship.software) softwareOf(board.program);
  }
  if (campaign.ships.some((s) => !s.retired) && campaign.ships.filter((s) => !s.retired).length > 1) throw new DomainError('Es gibt mehr als ein aktives Schiff.');
  // Abgestellt werden nur eigene Fahrzeuge, an einem Ort; die Fahrt passt zur Karte der Welt der Gruppe.
  for (const p of campaign.stash) {
    if (p.parked === undefined) continue;
    if (vehicleOfItem(p.of) === undefined) throw new DomainError(`${itemOf(p.of).name} ist kein Fahrzeug und lässt sich nicht abstellen.`);
    checkPlace(campaign.hexes, p.parked);
  }
  if (campaign.trip !== undefined) checkTrip(campaign, campaign.trip);
  validateEncounters(campaign);
  if (campaign.terrain !== undefined) terrainOf(campaign.terrain);
  for (const hex of campaign.hexes) for (const table of hex.animals ?? []) checkAnimalTable(table);
  // Das Gepäck hält Besitz nach denselben Regeln wie ein Charakter.
  validateCharacter({ name: 'Gepäck', background: '', equipment: '', credits: 0, note: '', upp: { str: 0, dex: 0, end: 0, int: 0, edu: 0, soc: 0 }, skills: [], possessions: campaign.stash });
  // Jagdbeute verweist auf eine Zeile der Tiertabelle mit Marktwert.
  for (const character of [...campaign.characters, ...campaign.encounters.flatMap((e) => e.npcs)]) {
    for (const p of character.possessions) if (p.from !== undefined && animalRowOf(campaign.hexes, p.from).market === undefined) throw new DomainError(`Die Jagdbeute von ${character.name} stammt von einer Tierart ohne Marktwert.`);
  }
  for (const p of campaign.stash) if (p.from !== undefined && animalRowOf(campaign.hexes, p.from).market === undefined) throw new DomainError('Jagdbeute im Gepäck stammt von einer Tierart ohne Marktwert.');
  // Heimatwelten und Welten der Terms verweisen auf fertige Welten des Subsektors.
  const careers = [...campaign.characters.flatMap((c) => (c.career ? [c.career] : [])), ...(campaign.generation ? [campaign.generation.career] : [])];
  for (const id of [...campaign.characters.flatMap((c) => (c.homeworld === undefined ? [] : [c.homeworld])), ...careers.flatMap((c) => [...(c.homeworld === undefined ? [] : [c.homeworld]), ...(c.worlds ?? [])])]) {
    worldOf(campaign.hexes, id);
  }
  // Rolle und Ort hat nur ein dauerhafter NSC; der Ort ist eine fertige Welt, der Patron eine Patron-Zeile.
  for (const character of campaign.characters) {
    if (!character.npc && (character.role !== undefined || character.place !== undefined)) throw new DomainError(`${character.name} ist kein NSC und hat doch Rolle oder Ort.`);
    if (character.place !== undefined) checkPlace(campaign.hexes, character.place);
    if (character.patron !== undefined && patronOf(character.patron.list, character.patron.roll).rumor) throw new DomainError(`${character.name} verweist auf ein Gerücht statt auf einen Patron.`);
  }
  for (const [index, entry] of campaign.log.entries()) {
    if (entry.place !== undefined) checkPlace(campaign.hexes, entry.place);
    switch (entry.kind) {
      case 'note':
        if (entry.interprets !== undefined) checkInterprets(campaign.log, entry.interprets, index);
        break;
      case 'dice':
      case 'patron':
      case 'rumor':
      case 'time':
      case 'tripDay':
        break;
      case 'monthEnd':
        if (entry.costsFrom > entry.costsTo || entry.costsTo > campaign.bookings.length) throw new DomainError('Eine Monatsabrechnung verweist auf Buchungen, die es nicht gibt.');
        break;
      case 'check':
        if (entry.dice.length !== encounterChecks[entry.check].dice) throw new DomainError('Ein Test hat zu viele oder zu wenige Würfel.');
        if ((entry.reactionDice !== undefined) !== (entry.check === 'legal' && !checkOf(entry).passed)) throw new DomainError('Nur eine Polizei-Begegnung hat eine Reaktion.');
        break;
      case 'journey':
        checkJourney(campaign, entry);
        break;
      case 'event':
        if (eventRowOf(campaign.hexes, entry).event === undefined) throw new DomainError('Ein Ereignis-Eintrag verweist auf eine Zeile mit Tier.');
        break;
      case 'attack': {
        const weapon = weaponOf(entry.with);
        if (entry.for === undefined) throw new DomainError('Ein Angriff hat einen Angreifer.');
        const character = anyCharacterOf(campaign, entry.for);
        if (entry.against !== undefined) anyCharacterOf(campaign, entry.against);
        if (entry.uses !== undefined && (entry.uses !== weapon.uses || !character.skills.some((s) => s.of === entry.uses))) {
          throw new DomainError(`Ein Angriff von ${character.name} verweist auf eine Fertigkeit, die nicht zur Waffe passt oder die der Charakter nicht hat.`);
        }
        const filter = character.animal !== undefined && animalTypeOf(animalRowOf(campaign.hexes, character.animal).type!).special === 'filter';
        if (entry.target !== ATTACK_TARGET && !(filter && (entry.target === FILTER_TARGET || entry.target === FILTER_HELD_TARGET))) throw new DomainError(`Ein Angriff hat den Zielwert ${ATTACK_TARGET}.`);
        checkVolley(campaign.log, entry, index);
        break;
      }
      case 'damage':
        if ((entry.of === undefined) === (entry.after === undefined)) throw new DomainError('Ein Schadenswurf folgt einem Treffer oder einem Rettungswurf.');
        if (entry.of === undefined) checkEventDamage(campaign, entry, index);
        else checkDamageRoll(campaign.log, entry, index, animalIds(campaign), filterDiceOf(campaign, entry.of));
        break;
      case 'save':
        checkSave(campaign, entry, index);
        break;
      case 'butchering':
        checkButchering(campaign, entry, index);
        break;
      case 'recovery':
        if (entry.for === undefined) throw new DomainError('Eine Heilung gilt einem Charakter.');
        checkRecovery(campaign, entry);
        break;
      case 'card':
        if (entry.items.length === 0 && entry.bell === undefined && entry.scatter === undefined && entry.map === undefined && entry.oracle === undefined) {
          throw new DomainError('Eine Kartenauswahl ohne Feld, Wurffeld und Antwort gibt es nicht.');
        }
        if ([entry.oracle, entry.odds, entry.chance].filter((v) => v === undefined).length % 3 !== 0) throw new DomainError('Eine Antwort des Orakels braucht Wurf, Stufe und Chance.');
        if (entry.odds !== undefined) oddsOf(entry.odds);
        if (entry.eventFocus !== undefined && (entry.oracle === undefined || !isRandomEvent(entry.oracle))) throw new DomainError('Einen Ereignisfokus gibt es nur bei einem Zufallsereignis mit Antwort.');
        if (entry.map && mapDirections.filter((d) => entry.map![d] !== 'none').length < minMapPaths) throw new DomainError('Ein Kartensymbol hat mindestens zwei Wege.');
        for (const item of entry.items) {
          const slot = slotOfEntry(item.picked[0]!);
          for (const picked of item.picked) {
            entryOf(picked);
            if (slotOfEntry(picked) !== slot) throw new DomainError('Ein übernommenes Feld mischt Einträge aus verschiedenen Feldern.');
          }
          if (item.picked.length > slot.columns.length) throw new DomainError(`Das Feld ${slot.label} hat nur eine Spalte.`);
        }
        break;
      case 'task': {
        oddsOf(entry.odds);
        const character = campaign.characters.find((c) => c.id === entry.for);
        if (!character) throw new DomainError(`Eine Probe verweist auf den Charakter ${entry.for}, den es nicht gibt.`);
        if (entry.uses !== undefined && !character.skills.some((s) => s.of === entry.uses)) {
          throw new DomainError(`Eine Probe von ${character.name} verweist auf eine Fertigkeit, die der Charakter nicht hat.`);
        }
        if (new Set(entry.counts).size !== entry.counts.length) throw new DomainError('Eine Probe zählt ein Attribut doppelt.');
        break;
      }
    }
  }
}

function weaponOfItem(item: string): string | undefined {
  return itemOf(item).weapon;
}

/** Die Begegnungen: höchstens eine läuft, jede Art gibt es, der Anführer ist einer ihrer NSC, Verweise gibt es. */
function validateEncounters(campaign: Campaign): void {
  if (campaign.encounters.filter((e) => !e.ended).length > 1) throw new DomainError('Es läuft mehr als eine Begegnung.');
  for (const encounter of campaign.encounters) {
    if (encounter.of !== undefined && !encounterTypeOf(encounter.of)) throw new DomainError(`Eine Begegnung ${encounter.of} gibt es nicht.`);
    if (encounter.animal !== undefined) {
      const row = encounterAnimalRow(campaign, encounter);
      if (row.event !== undefined) throw new DomainError('Eine Tierbegegnung verweist auf ein Ereignis.');
      for (const npc of encounter.npcs) if (npc.animal === undefined) throw new DomainError(`${npc.name} ist kein Tier, steht aber in einer Tierbegegnung.`);
    }
    for (const npc of encounter.npcs) if (npc.animal !== undefined) animalRowOf(campaign.hexes, npc.animal);
    if (encounter.terrain !== undefined && !ref.encounters.terrains.some((t) => t.id === encounter.terrain)) throw new DomainError(`Das Gelände ${encounter.terrain} gibt es nicht.`);
    if (encounter.in !== undefined && !hexById(campaign.hexes, encounter.in)) throw new DomainError(`Eine Begegnung verweist auf das Feld ${encounter.in}, das es nicht gibt.`);
    const joined = encounter.joined ?? [];
    if (new Set(joined).size !== joined.length) throw new DomainError('Ein NSC ist zweimal in derselben Begegnung dazugenommen.');
    for (const id of joined) {
      if (!campaign.characters.some((c) => c.id === id && c.npc)) throw new DomainError(`Eine Begegnung nimmt ${id} dazu, der kein dauerhafter NSC ist.`);
    }
    if (encounter.leader !== undefined && !encounter.npcs.some((n) => n.id === encounter.leader) && !joined.includes(encounter.leader)) throw new DomainError(`Der Anführer ${encounter.leader} ist keiner der NSC seiner Begegnung.`);
    const distances = encounter.distances ?? [];
    for (const d of distances) if (!campaign.characters.some((c) => c.id === d.of)) throw new DomainError(`Eine Entfernung verweist auf ${d.of}, der kein SC ist.`);
    if (new Set(distances.map((d) => d.of)).size !== distances.length) throw new DomainError('Ein SC hat in einer Begegnung zwei Entfernungen.');
    for (const id of encounter.evading ?? []) {
      if (!campaign.characters.some((c) => c.id === id) && !encounter.npcs.some((n) => n.id === id)) throw new DomainError(`Ausweichen verweist auf ${id}, den es nicht gibt.`);
    }
  }
}
