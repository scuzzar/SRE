import { z } from 'zod';
import { keepFocus, validateCharacter, validName, type Campaign, type CampaignId, type Character, type Possession } from './campaign';
import { replay, type Career, type CareerRoll } from './career';
import { DomainError } from './errors';
import { mapDirections, minMapPaths, pathKinds, scatters, type MapDirection, type PathKind } from './card-roll';
import { checkDamageRoll, ATTACK_TARGET } from './combat';
import { npcOf, type Encounter, type Npc } from './encounter';
import { checkInterprets, physical, recoveryKinds, withQuestion, type AttackResult, type CardPick, type DamageRoll, type LogEntry, type Recovery } from './log';
import { checkRecovery } from './wounds';
import { armorClasses, encounterTypeOf, entryOf, itemOf, oddsOf, ranges, slotOfEntry, weaponOf } from './reference';
import { characteristics } from './rules';
import { bookingKinds, validateBookings, type Booking } from './shop';
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

const LogEntrySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('oracle'), at, question, roll: z.number().int().min(1).max(100), chance: z.number().int().min(0).max(100), odds: z.string() }),
  z.object({ kind: z.literal('dice'), at, dice }),
  z.object({
    kind: z.literal('card'),
    at,
    question,
    bell: z.number().int().min(1).max(10).optional(),
    scatter: z.enum(scatters).optional(),
    map: z.object(Object.fromEntries(mapDirections.map((d) => [d, z.enum(pathKinds)])) as Record<MapDirection, z.ZodEnum<{ [K in PathKind]: K }>>).optional(),
    items: z.array(z.object({ picked: z.array(z.string()).min(1).max(2) })),
  }),
  z.object({
    kind: z.literal('task'),
    at,
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
  }),
  z.object({ kind: z.literal('damage'), at, of: z.number().int(), dice: z.array(die).min(1).max(5), to: z.array(z.enum(physical)).optional() }),
  z.object({
    kind: z.literal('recovery'),
    at,
    how: z.enum(recoveryKinds),
    for: z.string().optional(),
    npc: z.string().optional(),
    by: z.string().optional(),
    dice: z.array(die).length(5).optional(),
  }),
  z.object({ kind: z.literal('note'), at, text: z.string().trim().min(1), interprets: z.number().int().optional() }),
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
});
const CareerSchema = z.object({ rolls: z.array(CareerRollSchema), homeworld: z.string().optional(), worlds: z.array(z.string()).optional() });

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
  possessions: z.array(z.object({ of: z.string(), count: z.number(), rounds: z.number().optional() })).default([]),
  career: CareerSchema.optional(),
  homeworld: z.string().optional(),
  wields: z.string().optional(),
  wears: z.string().optional(),
  /** Fehlt in Dateien von vor den NSC: ein SC. */
  npc: z.boolean().default(false),
});

const NpcSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  leader: z.boolean(),
  skill: z.number().int().min(0),
  upp: z.object({ str: value, dex: value, end: value, int: value, edu: value, soc: value }),
  wields: z.string(),
  wears: z.string().optional(),
  became: z.string().optional(),
});

const EncounterSchema = z.object({
  id: z.string().min(1),
  at,
  of: z.number().int(),
  in: z.string().optional(),
  reaction: z.number().int().min(2).max(12),
  ended: z.boolean(),
  npcs: z.array(NpcSchema).min(1),
});

const CampaignFileSchema = z.object({
  format: z.literal(campaignFileFormat),
  version: z.literal(campaignFileVersion),
  campaign: z.object({
    name: z.string(),
    odds: z.string(),
    characters: z.array(CharacterSchema),
    log: z.array(LogEntrySchema),
    generation: z.object({ career: CareerSchema }).optional(),
    /** Fehlt in Dateien von vor dem Subsektor. */
    hexes: z.array(HexSchema).default([]),
    /** Der Charakter oben; fehlt in Dateien von vor dieser Regel, dann wird es der erste Lebende. */
    focus: z.string().optional(),
    /** Fehlen in Dateien von vor dem Shop bzw. den Begegnungen. */
    location: z.string().optional(),
    encounters: z.array(EncounterSchema).default([]),
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
        }),
      )
      .default([]),
  }),
});

/** Die Kampagne als Inhalt einer Kampagnendatei. */
export function toCampaignFile(campaign: Campaign): string {
  const { name, odds, characters, log, generation, hexes, focus, location, bookings, encounters } = campaign;
  return JSON.stringify({ format: campaignFileFormat, version: campaignFileVersion, campaign: { name, odds, characters, log, generation, hexes, focus, location, bookings, encounters } }, null, 2);
}

/** Ein Dateiname aus dem Namen der Kampagne und dem Tag, z. B. „Spinward-Run-2026-10-25.json“. */
export function campaignFileName(campaign: Campaign, now: string): string {
  const base = campaign.name.normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'Kampagne';
  return `${base}-${now.slice(0, 10)}.json`;
}

/**
 * Liest eine Kampagnendatei und prüft sie gegen die Regeln des Modells, auch jeden Verweis. Ist
 * etwas falsch, gibt es einen DomainError und keine Kampagne. Die Kampagne bekommt die Id `id`.
 */
export function fromCampaignFile(text: string, id: CampaignId): Campaign {
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
    const characters: Character[] = file.characters.map(({ career, homeworld, wields, wears, ...c }) => ({
      ...c,
      skills: c.skills.map((s) => ({ ...s })),
      possessions: c.possessions.map((p) => stripped(p) as Possession),
      ...(career ? { career: careerOf(career) } : {}),
      ...(homeworld === undefined ? {} : { homeworld }),
      ...(wields === undefined ? {} : { wields }),
      ...(wears === undefined ? {} : { wears }),
    }));
    const campaign: Campaign = {
      id,
      name: validName(file.name),
      odds: oddsOf(file.odds).id,
      characters,
      log: file.log.map(logEntry),
      hexes: file.hexes.map(hexOf),
      ...(file.generation ? { generation: { career: careerOf(file.generation.career) } } : {}),
      ...(file.focus === undefined ? {} : { focus: file.focus }),
      ...(file.location === undefined ? {} : { location: file.location }),
      bookings: file.bookings.map((b) => stripped(b) as Booking),
      encounters: file.encounters.map((e) => ({ ...stripped(e), npcs: e.npcs.map((n) => stripped(n) as Npc) }) as Encounter),
    };
    validate(campaign);
    return keepFocus(campaign, campaign);
  } catch (error) {
    if (error instanceof DomainError) throw new DomainError(`Die Kampagne in der Datei verletzt eine Regel: ${error.message}`);
    throw error;
  }
}

/** Ein Lebenslauf ohne leere optionale Felder, wie er im Spielstand steht. */
function careerOf(career: z.infer<typeof CareerSchema>): Career {
  return {
    ...(career.homeworld === undefined ? {} : { homeworld: career.homeworld }),
    ...(career.worlds === undefined ? {} : { worlds: career.worlds }),
    rolls: career.rolls.map((roll) => Object.fromEntries(Object.entries(roll).filter(([, v]) => v !== undefined)) as unknown as CareerRoll),
  };
}

/** Ein Hexfeld ohne leere optionale Felder, wie es im Spielstand steht. */
function hexOf(hex: z.infer<typeof HexSchema>): Hex {
  if ('rolls' in hex) {
    const rolls = hex.rolls.map((r) => stripped(r) as LegacyWorldRoll);
    return hexFromRolls(hex.name === undefined ? { column: hex.column, row: hex.row, rolls } : { column: hex.column, row: hex.row, name: hex.name, rolls });
  }
  return { ...stripped(hex), uwp: stripped(hex.uwp) } as Hex;
}

/** Ein Objekt ohne Felder, die `undefined` sind. */
function stripped<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

/** Ohne leere optionale Felder, wie sie im Spielstand stehen. */
function logEntry(entry: z.infer<typeof LogEntrySchema>): LogEntry {
  switch (entry.kind) {
    case 'oracle': {
      const { question, ...rest } = entry;
      return withQuestion(rest, question);
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
      return entry;
    case 'note': {
      const { interprets, ...rest } = entry;
      return interprets === undefined ? rest : { ...rest, interprets };
    }
  }
}

function validate(campaign: Campaign): void {
  const ids = new Set<string>();
  for (const character of campaign.characters) {
    if (ids.has(character.id)) throw new DomainError(`Die Id ${character.id} kommt doppelt vor.`);
    ids.add(character.id);
    validateCharacter({ ...character, skills: character.skills });
    if (character.wields !== undefined && !character.possessions.some((p) => weaponOfItem(p.of) === character.wields)) {
      throw new DomainError(`${character.name} führt eine Waffe, die nicht in seinem Besitz ist.`);
    }
    // Ein Lebenslauf wird von vorn nachgespielt; am Charakter ist er abgeschlossen.
    if (character.career && replay(character.career).step !== 'name') throw new DomainError(`Der Lebenslauf von ${character.name} ist nicht abgeschlossen.`);
  }
  if (campaign.generation) replay(campaign.generation.career);
  if (campaign.focus !== undefined) {
    const focus = campaign.characters.find((c) => c.id === campaign.focus);
    if (!focus) throw new DomainError(`Der Charakter oben (${campaign.focus}) ist keiner der Kampagne.`);
    if (focus.dead || focus.retired) throw new DomainError(`Der Charakter oben (${focus.name}) lebt nicht oder ist ausgeblendet.`);
  }
  validateHexes(campaign.hexes);
  if (campaign.location !== undefined) worldOf(campaign.hexes, campaign.location);
  validateBookings(campaign);
  validateEncounters(campaign);
  // Heimatwelten und Welten der Terms verweisen auf fertige Welten des Subsektors.
  const careers = [...campaign.characters.flatMap((c) => (c.career ? [c.career] : [])), ...(campaign.generation ? [campaign.generation.career] : [])];
  for (const id of [...campaign.characters.flatMap((c) => (c.homeworld === undefined ? [] : [c.homeworld])), ...careers.flatMap((c) => [...(c.homeworld === undefined ? [] : [c.homeworld]), ...(c.worlds ?? [])])]) {
    worldOf(campaign.hexes, id);
  }
  for (const [index, entry] of campaign.log.entries()) {
    switch (entry.kind) {
      case 'note':
        if (entry.interprets !== undefined) checkInterprets(campaign.log, entry.interprets, index);
        break;
      case 'oracle':
        oddsOf(entry.odds);
        break;
      case 'dice':
        break;
      case 'attack': {
        const weapon = weaponOf(entry.with);
        if ((entry.for === undefined) === (entry.by === undefined)) throw new DomainError('Ein Angriff hat genau einen Angreifer, einen SC oder einen NSC.');
        if (entry.against !== undefined && entry.victim !== undefined) throw new DomainError('Ein Angriff hat höchstens ein Ziel.');
        if (entry.by !== undefined) npcOf(campaign, entry.by);
        if (entry.against !== undefined) npcOf(campaign, entry.against);
        if (entry.victim !== undefined && !campaign.characters.some((c) => c.id === entry.victim)) throw new DomainError(`Ein Angriff verweist auf den Charakter ${entry.victim}, den es nicht gibt.`);
        if (entry.for !== undefined) {
          const character = campaign.characters.find((c) => c.id === entry.for);
          if (!character) throw new DomainError(`Ein Angriff verweist auf den Charakter ${entry.for}, den es nicht gibt.`);
          if (entry.uses !== undefined && (entry.uses !== weapon.uses || !character.skills.some((s) => s.of === entry.uses))) {
            throw new DomainError(`Ein Angriff von ${character.name} verweist auf eine Fertigkeit, die nicht zur Waffe passt oder die der Charakter nicht hat.`);
          }
        } else if (entry.uses !== undefined) throw new DomainError('Ein Angriff eines NSC verweist auf keine Fertigkeitsstufe.');
        if (entry.target !== ATTACK_TARGET) throw new DomainError(`Ein Angriff hat den Zielwert ${ATTACK_TARGET}.`);
        break;
      }
      case 'damage':
        checkDamageRoll(campaign.log, entry, index);
        break;
      case 'recovery':
        checkRecovery(campaign, entry, index);
        break;
      case 'card':
        if (entry.items.length === 0 && entry.bell === undefined && entry.scatter === undefined && entry.map === undefined) {
          throw new DomainError('Eine Kartenauswahl ohne Feld und ohne Wurffeld gibt es nicht.');
        }
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

/** Die Begegnungen: höchstens eine läuft, jede Art gibt es, NSC-Ids kommen nur einmal vor, Verweise gibt es. */
function validateEncounters(campaign: Campaign): void {
  if (campaign.encounters.filter((e) => !e.ended).length > 1) throw new DomainError('Es läuft mehr als eine Begegnung.');
  const ids = new Set<string>();
  for (const encounter of campaign.encounters) {
    if (!encounterTypeOf(encounter.of)) throw new DomainError(`Eine Begegnung ${encounter.of} gibt es nicht.`);
    if (encounter.in !== undefined && !hexById(campaign.hexes, encounter.in)) throw new DomainError(`Eine Begegnung verweist auf das Feld ${encounter.in}, das es nicht gibt.`);
    for (const npc of encounter.npcs) {
      if (ids.has(npc.id)) throw new DomainError(`Der NSC ${npc.id} kommt doppelt vor.`);
      ids.add(npc.id);
      if (itemOf(npc.wields).weapon === undefined) throw new DomainError(`${npc.name} kämpft mit etwas, das keine Waffe ist.`);
      if (npc.wears !== undefined && itemOf(npc.wears).armor === undefined) throw new DomainError(`${npc.name} trägt etwas, das keine Rüstung ist.`);
      if (npc.became !== undefined && !campaign.characters.some((c) => c.id === npc.became)) throw new DomainError(`${npc.name} ist als ein Charakter übernommen, den es nicht gibt.`);
      for (const [k, v] of Object.entries(npc.upp)) if (!Number.isInteger(v) || v < 0 || v > 15) throw new DomainError(`Attributwerte liegen zwischen 0 und 15 (${k.toUpperCase()}: ${v}).`);
    }
  }
}
