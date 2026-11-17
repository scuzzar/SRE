import { z } from 'zod';
import type { Campaign, Stamp } from './campaign';
import { validName } from './campaign';
import { DomainError } from './errors';
import type { Clock, Keys } from './ports';
import { shipDesignOf } from './reference';
import { deckSlotPattern, type DeckPlan } from './ship';

/**
 * Der Abgleich mit OneDrive (siehe docs/domain-model.md, „Abgleich mit OneDrive“). Hier steht nur,
 * was zu tun ist; getan wird es im Controller über `Cloud` und `CampaignRepository`.
 */

/** Eine Datei in der Wolke: der Schlüssel ihrer Kampagne und ihre Fassung. */
export interface CloudFile {
  readonly key: string;
  readonly revision: string;
}

/**
 * Die Abgleichsmarke: mit welcher Änderungszeit und welcher Fassung in der Wolke dieses Gerät zuletzt
 * gleich war. Das merkt sich das Gerät; zum Spielstand gehört es nicht.
 */
export interface SyncMark {
  readonly key: string;
  readonly changedAt: string;
  readonly revision: string;
  /** Die Kampagne wurde seither hier gelöscht. */
  readonly deleted?: boolean;
}

export type SyncStepKind = 'upload' | 'download' | 'removeRemote' | 'removeLocal' | 'forget' | 'conflict';

/** Was der Abgleich mit einer Kampagne tut. */
export interface SyncStep {
  readonly kind: SyncStepKind;
  readonly key: string;
}

/**
 * Was der Abgleich je Kampagne tut. *Hier geändert*: Die Änderungszeit ist eine andere als in der
 * Marke (oder es gibt keine Marke). *Dort geändert*: Die Wolke hat eine andere Fassung als in der
 * Marke. Kampagnen in `skip` (mit offenem Konflikt) bleiben, wie sie sind.
 *
 * `conflict` heißt: erst den Stand dort lesen. Sind beide Stände gleich alt, ist es keiner (so nach
 * einem erneuten Anmelden, wenn die Marken fehlen).
 */
export function planSync(campaigns: readonly Campaign[], marks: readonly SyncMark[], remote: readonly CloudFile[], skip: readonly string[] = []): readonly SyncStep[] {
  const keys = new Set([...campaigns.map((c) => c.key), ...marks.map((m) => m.key), ...remote.map((r) => r.key)]);
  const steps: SyncStep[] = [];
  for (const key of keys) {
    if (skip.includes(key)) continue;
    const kind = stepFor(
      campaigns.find((c) => c.key === key),
      marks.find((m) => m.key === key),
      remote.find((r) => r.key === key),
    );
    if (kind) steps.push({ kind, key });
  }
  return steps;
}

function stepFor(local: Campaign | undefined, mark: SyncMark | undefined, file: CloudFile | undefined): SyncStepKind | undefined {
  if (!mark) {
    if (local && file) return 'conflict';
    if (local) return 'upload';
    return file ? 'download' : undefined;
  }
  const thereChanged = !file || file.revision !== mark.revision;
  if (!local) {
    // Hier gelöscht. Fehlt die Kampagne hier ohne Löschvermerk, kommt sie einfach wieder herunter.
    if (!file) return 'forget';
    if (!mark.deleted) return 'download';
    return thereChanged ? 'conflict' : 'removeRemote';
  }
  const hereChanged = local.changedAt !== mark.changedAt;
  if (!hereChanged && !thereChanged) return undefined;
  if (hereChanged && thereChanged) return 'conflict';
  if (hereChanged) return 'upload';
  return file ? 'download' : 'removeLocal';
}

/** Die Marke nach einem Abgleich: Gerät und Wolke sind bei diesem Stand und dieser Fassung gleich. */
export function markOf(stamp: Stamp, revision: string): SyncMark {
  return { key: stamp.key, changedAt: stamp.changedAt, revision };
}

/**
 * „Beide behalten“: Der Stand von hier wird eine eigene Kampagne mit neuem Schlüssel und dem Namen
 * „<Name> (Kopie)“. Sie behält ihre Id, bleibt also offen, wenn sie es war.
 */
export function copyOf(campaign: Campaign, keys: Keys, clock: Clock): Campaign {
  return { ...campaign, key: keys.next(), changedAt: clock.now(), name: validName(`${campaign.name} (Kopie)`) };
}

// --- Deckpläne (2026-11-17) ----------------------------------------------------------------------

/** Eine Deckplan-Datei in der Wolke: Entwurf und Platz, und ihre Fassung. */
export interface DeckFile {
  readonly design: string;
  readonly name: string;
  readonly revision: string;
}

/**
 * Die Abgleichsmarke eines Deckplan-Platzes: mit welchem Bild (`key`) und welcher Fassung der Datei
 * dieses Gerät zuletzt gleich war. Das merkt sich das Gerät; zum Spielstand gehört es nicht.
 */
export interface DeckMark {
  readonly design: string;
  readonly name: string;
  readonly key: string;
  readonly revision: string;
}

/**
 * Was der Abgleich mit einem Deckplan-Platz tut. `compare`: Hier und dort liegt ein Bild, das sich
 * seit der Marke geändert haben kann; erst die Datei dort lesen. Ist es dasselbe Bild, wird nur die
 * Marke gesetzt, sonst bleiben beide.
 */
export type DeckStepKind = 'upload' | 'download' | 'removeRemote' | 'removeLocal' | 'forget' | 'compare';

export interface DeckStep {
  readonly kind: DeckStepKind;
  readonly design: string;
  readonly name: string;
}

const slotId = (s: { readonly design: string; readonly name: string }): string => `${s.design}\u0000${s.name}`;

/**
 * Was der Abgleich je Deckplan-Platz tut (siehe docs/domain-model.md, „Abgleich mit OneDrive“,
 * *Deckpläne*). *Hier geändert*: auf dem Platz liegt ein anderer Schlüssel als in der Marke, oder
 * keiner mehr. *Dort geändert*: die Wolke hat eine andere Fassung als in der Marke, oder keine Datei.
 * Einen Konflikt, bei dem der Spieler wählt, gibt es nicht: Ein neues Bild gewinnt gegen ein
 * gelöschtes, zwei verschiedene Bilder bleiben beide.
 */
export function planDeckSync(plans: readonly { readonly key: string; readonly design: string; readonly name: string }[], marks: readonly DeckMark[], remote: readonly DeckFile[]): readonly DeckStep[] {
  const slots = new Map<string, { readonly design: string; readonly name: string }>();
  for (const s of [...plans, ...marks, ...remote]) slots.set(slotId(s), { design: s.design, name: s.name });
  const steps: DeckStep[] = [];
  for (const [id, slot] of slots) {
    const kind = deckStepFor(
      plans.find((p) => slotId(p) === id),
      marks.find((m) => slotId(m) === id),
      remote.find((f) => slotId(f) === id),
    );
    if (kind) steps.push({ kind, ...slot });
  }
  return steps;
}

function deckStepFor(local: { readonly key: string } | undefined, mark: DeckMark | undefined, file: DeckFile | undefined): DeckStepKind | undefined {
  if (!mark) {
    if (local && file) return 'compare';
    if (local) return 'upload';
    return file ? 'download' : undefined;
  }
  const hereChanged = local?.key !== mark.key;
  const thereChanged = !file || file.revision !== mark.revision;
  if (!hereChanged && !thereChanged) return undefined;
  if (hereChanged && !thereChanged) return local ? 'upload' : 'removeRemote';
  if (!hereChanged) return file ? 'download' : 'removeLocal';
  // Auf beiden Seiten geändert: Ein neues Bild gewinnt gegen ein gelöschtes.
  if (!local) return file ? 'download' : 'forget';
  return file ? 'compare' : 'upload';
}

/** Die Marke nach dem Abgleich eines Platzes: Gerät und Wolke sind bei diesem Bild und dieser Fassung gleich. */
export function deckMarkOf(plan: { readonly key: string; readonly design: string; readonly name: string }, revision: string): DeckMark {
  return { design: plan.design, name: plan.name, key: plan.key, revision };
}

const deckPlanFileFormat = 'solo-rpg-engine-deckplan';
const deckPlanFileVersion = 1;

const DeckPlanFileSchema = z.object({
  format: z.literal(deckPlanFileFormat),
  version: z.literal(deckPlanFileVersion),
  plan: z.object({
    key: z.string().min(1),
    design: z.string().min(1),
    name: z.string().regex(deckSlotPattern),
    image: z.string().regex(/^data:image\/(png|jpeg);base64,/),
  }),
});

/** Ein Deckplan als Inhalt seiner Datei in der Wolke. */
export function toDeckPlanFile(plan: DeckPlan): string {
  const { key, design, name, image } = plan;
  return JSON.stringify({ format: deckPlanFileFormat, version: deckPlanFileVersion, plan: { key, design, name, image } });
}

/**
 * Ein Deckplan aus seiner Datei in der Wolke, geprüft: Format, ein Entwurf der Werft, ein Platz und
 * ein Bild (PNG oder JPEG). Entwurf und Platz kommen aus dem Dateinamen; der Inhalt muss dazu passen.
 */
export function fromDeckPlanFile(text: string, design: string, name: string): DeckPlan {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new DomainError(`Der Deckplan ${design}/${name} in OneDrive ist kein JSON.`);
  }
  const parsed = DeckPlanFileSchema.safeParse(data);
  if (!parsed.success) throw new DomainError(`Der Deckplan ${design}/${name} in OneDrive ist kaputt.`);
  const plan = parsed.data.plan;
  if (plan.design !== design || plan.name !== name) throw new DomainError(`Der Deckplan ${design}/${name} in OneDrive gehört zu einem anderen Platz.`);
  shipDesignOf(plan.design);
  return plan;
}
