import { z } from 'zod';
import { validateCharacter, validName, type Campaign, type CampaignId, type Character } from './campaign';
import { DomainError } from './errors';
import { withQuestion, type LogEntry } from './log';
import { entryOf, oddsOf, slotOfEntry } from './reference';
import { characteristics } from './rules';

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
  z.object({ kind: z.literal('card'), at, question, items: z.array(z.object({ picked: z.array(z.string()).min(1).max(2) })).min(1) }),
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
});

const CampaignFileSchema = z.object({
  format: z.literal(campaignFileFormat),
  version: z.literal(campaignFileVersion),
  campaign: z.object({
    name: z.string(),
    odds: z.string(),
    characters: z.array(CharacterSchema),
    log: z.array(LogEntrySchema),
  }),
});

/** Die Kampagne als Inhalt einer Kampagnendatei. */
export function toCampaignFile(campaign: Campaign): string {
  const { name, odds, characters, log } = campaign;
  return JSON.stringify({ format: campaignFileFormat, version: campaignFileVersion, campaign: { name, odds, characters, log } }, null, 2);
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
    const characters: Character[] = file.characters.map((c) => ({ ...c, skills: c.skills.map((s) => ({ ...s })) }));
    const campaign: Campaign = { id, name: validName(file.name), odds: oddsOf(file.odds).id, characters, log: file.log.map(logEntry) };
    validate(campaign);
    return campaign;
  } catch (error) {
    if (error instanceof DomainError) throw new DomainError(`Die Kampagne in der Datei verletzt eine Regel: ${error.message}`);
    throw error;
  }
}

/** Ohne leere optionale Felder, wie sie im Spielstand stehen. */
function logEntry(entry: z.infer<typeof LogEntrySchema>): LogEntry {
  switch (entry.kind) {
    case 'oracle':
    case 'card': {
      const { question, ...rest } = entry;
      return withQuestion(rest, question);
    }
    case 'task': {
      const { uses, ...rest } = entry;
      return uses === undefined ? rest : { ...rest, uses };
    }
    case 'dice':
      return entry;
  }
}

function validate(campaign: Campaign): void {
  const ids = new Set<string>();
  for (const character of campaign.characters) {
    if (ids.has(character.id)) throw new DomainError(`Die Id ${character.id} kommt doppelt vor.`);
    ids.add(character.id);
    validateCharacter({ ...character, skills: character.skills });
  }
  for (const entry of campaign.log) {
    switch (entry.kind) {
      case 'oracle':
        oddsOf(entry.odds);
        break;
      case 'dice':
        break;
      case 'card':
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
